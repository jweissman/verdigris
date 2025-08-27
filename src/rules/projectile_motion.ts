import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";
import type { ProjectileArrays } from "../sim/projectile_arrays";

/**
 * ProjectileMotion - handles collision detection and damage events for projectiles
 * Uses SoA arrays for better performance
 */
export class ProjectileMotion extends Rule {
  private commands: QueuedCommand[] = [];
  private frameCounter = 0;
  private activeProjectileIndices: number[] = [];
  private bullets: number[] = [];
  private bombs: number[] = [];
  private grapples: number[] = [];
  private toRemove: number[] = [];

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    
    const projectileArrays = context.getProjectileArrays();
    if (!projectileArrays || projectileArrays.activeCount === 0) {
      return this.commands;
    }
    
    const unitArrays = context.getArrays();
    if (!unitArrays.activeIndices || unitArrays.activeIndices.length === 0) {
      return this.commands;
    }
    
    // Reset reusable arrays
    this.toRemove.length = 0;
    this.bullets.length = 0;
    this.bombs.length = 0;
    this.grapples.length = 0;
    
    // Cache active unit positions for faster access
    const activeUnits = unitArrays.activeIndices;
    const unitCount = activeUnits.length;
    
    // Build list of active projectile indices more efficiently
    this.activeProjectileIndices.length = 0;
    
    // Only check active projectiles by tracking activeCount
    let foundActive = 0;
    for (let pIdx = 0; pIdx < projectileArrays.capacity && foundActive < projectileArrays.activeCount; pIdx++) {
      if (projectileArrays.active[pIdx] === 0) continue;
      foundActive++;
      this.activeProjectileIndices.push(pIdx);
      const projType = projectileArrays.type[pIdx];
      if (projType === 0) this.bullets.push(pIdx);
      else if (projType === 1) this.bombs.push(pIdx);
      else if (projType === 2) this.grapples.push(pIdx);
    }
    
    // Process bombs first (they explode and don't need collision checks)
    for (const pIdx of this.bombs) {
      const shouldExplode = (projectileArrays.duration[pIdx] > 0 && 
                            projectileArrays.progress[pIdx] >= projectileArrays.duration[pIdx]) ||
                           (projectileArrays.lifetime[pIdx] >= 30);
      if (shouldExplode) {
        this.processBombExplosion(projectileArrays, pIdx, unitArrays);
        this.toRemove.push(pIdx);
      }
    }
    
    // Process bullets and grapples with collision detection
    // Skip if no valid targets
    if (unitCount === 0) {
      return this.commands;
    }
    
    // Process projectiles
    const collisionProjectiles = this.bullets.length + this.grapples.length;
    for (let p = 0; p < collisionProjectiles; p++) {
      const pIdx = p < this.bullets.length ? this.bullets[p] : this.grapples[p - this.bullets.length];
      const projX = projectileArrays.posX[pIdx];
      const projY = projectileArrays.posY[pIdx];
      const radius = projectileArrays.radius[pIdx];
      const radiusSq = radius * radius;
      const projTeam = projectileArrays.team[pIdx];
      const projType = projectileArrays.type[pIdx];
      
      // Simple early exit optimization - check bounds
      const minX = projX - radius;
      const maxX = projX + radius;
      const minY = projY - radius;
      const maxY = projY + radius;
      
      // Check collisions with active units
      for (const unitIdx of activeUnits) {
        // Quick bounds check first
        const unitX = unitArrays.posX[unitIdx];
        if (unitX < minX || unitX > maxX) continue;
        const unitY = unitArrays.posY[unitIdx];
        if (unitY < minY || unitY > maxY) continue;
        
        // Team and health checks
        if (projType !== 2 && unitArrays.team[unitIdx] === projTeam) continue;
        if (unitArrays.hp[unitIdx] <= 0) continue;
        
        // Precise distance check
        const dx = unitX - projX;
        const dy = unitY - projY;
        const distSq = dx * dx + dy * dy;
        if (distSq >= radiusSq) continue;
        
        // Hit detected
        if (projType === 2) { // grapple
          this.commands.push({
            type: "grappleState",
            params: {
              unitId: unitArrays.unitIds[unitIdx],
              hit: true,
              grapplerID: projectileArrays.sourceIds[pIdx] || "unknown",
              origin: { x: projX, y: projY },
            },
          });
        } else {
          this.commands.push({
            type: "damage",
            params: {
              targetId: unitArrays.unitIds[unitIdx],
              amount: projectileArrays.damage[pIdx],
              aspect: projectileArrays.aspect[pIdx],
              origin: { x: projX, y: projY },
            },
          });
        }
        
        this.toRemove.push(pIdx);
        break; // Only hit one unit per projectile
      }
    }
    
    // Remove hit projectiles
    for (const idx of this.toRemove) {
      this.commands.push({
        type: "removeProjectile",
        params: { id: projectileArrays.projectileIds[idx] },
      });
    }
    
    return this.commands;
  }
  
  private processBombExplosion(
    projectileArrays: ProjectileArrays,
    pIdx: number,
    unitArrays: any
  ): void {
    const bombX = projectileArrays.posX[pIdx];
    const bombY = projectileArrays.posY[pIdx];
    const explosionRadius = projectileArrays.explosionRadius[pIdx];
    const explosionRadiusSq = explosionRadius * explosionRadius;
    const explosionDamage = projectileArrays.damage[pIdx];
    const bombTeam = projectileArrays.team[pIdx];
    const sourceId = projectileArrays.sourceIds[pIdx];
    
    for (const unitIdx of unitArrays.activeIndices) {
      if (unitArrays.team[unitIdx] === bombTeam) continue;
      if (sourceId && unitArrays.unitIds[unitIdx] === sourceId) continue;
      
      const dx = unitArrays.posX[unitIdx] - bombX;
      const dy = unitArrays.posY[unitIdx] - bombY;
      const distSq = dx * dx + dy * dy;
      
      if (distSq <= explosionRadiusSq) {
        const distance = Math.sqrt(distSq);
        const damageMultiplier = Math.max(0.3, 1 - (distance / explosionRadius) * 0.5);
        const damage = Math.floor(explosionDamage * damageMultiplier);
        
        if (damage > 0) {
          this.commands.push({
            type: "damage",
            params: {
              targetId: unitArrays.unitIds[unitIdx],
              amount: damage,
              aspect: "explosion",
            },
          });
          
          const knockbackForce = 2;
          const knockbackX = dx !== 0 ? (dx / Math.abs(dx)) * knockbackForce : 0;
          const knockbackY = dy !== 0 ? (dy / Math.abs(dy)) * knockbackForce : 0;
          
          this.commands.push({
            type: "move",
            params: {
              unitId: unitArrays.unitIds[unitIdx],
              x: unitArrays.posX[unitIdx] + knockbackX,
              y: unitArrays.posY[unitIdx] + knockbackY,
            },
          });
        }
      }
    }
  }
}