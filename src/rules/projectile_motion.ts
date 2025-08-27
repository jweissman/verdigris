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
    
    // Efficiently categorize active projectiles
    // ProjectileArrays should maintain an activeIndices list like UnitArrays
    if (projectileArrays.activeIndices) {
      for (const pIdx of projectileArrays.activeIndices) {
        const projType = projectileArrays.type[pIdx];
        switch (projType) {
          case 0: this.bullets.push(pIdx); break;
          case 1: this.bombs.push(pIdx); break;
          case 2: this.grapples.push(pIdx); break;
        }
      }
    } else {
      // Fallback if activeIndices not available
      let found = 0;
      const target = projectileArrays.activeCount;
      for (let pIdx = 0; pIdx < projectileArrays.capacity && found < target; pIdx++) {
        if (projectileArrays.active[pIdx] === 0) continue;
        found++;
        const projType = projectileArrays.type[pIdx];
        switch (projType) {
          case 0: this.bullets.push(pIdx); break;
          case 1: this.bombs.push(pIdx); break;
          case 2: this.grapples.push(pIdx); break;
        }
      }
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
    
    // Process bullets and grapples without creating new array
    const processBulletOrGrapple = (pIdx: number) => {
      const projX = projectileArrays.posX[pIdx];
      const projY = projectileArrays.posY[pIdx];
      const radius = projectileArrays.radius[pIdx];
      const radiusSq = radius * radius;
      const projTeam = projectileArrays.team[pIdx];
      const projType = projectileArrays.type[pIdx];
      
      // Check collision with units - limit checks for performance
      let checksPerformed = 0;
      const maxChecks = 50; // Limit checks per projectile
      
      for (const unitIdx of activeUnits) {
        if (checksPerformed++ > maxChecks) break;
        
        // Team check first (cheapest)
        if (projType !== 2 && unitArrays.team[unitIdx] === projTeam) continue;
        
        // Health check
        if (unitArrays.hp[unitIdx] <= 0) continue;
        
        // Bounding box check (cheaper than distance)
        const unitX = unitArrays.posX[unitIdx];
        const dx = Math.abs(unitX - projX);
        if (dx > radius) continue;
        
        const unitY = unitArrays.posY[unitIdx];
        const dy = Math.abs(unitY - projY);
        if (dy > radius) continue;
        
        // Precise distance check only if within bounding box
        const distSq = dx * dx + dy * dy;
        if (distSq >= radiusSq) continue;
        
        // Hit detected
        if (projType === 2) { // grapple
          this.commands.push({
            type: "grapple",
            params: {
              operation: "hit",
              unitId: unitArrays.unitIds[unitIdx],
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
        return; // Exit early when hit detected
      }
    };
    
    // Process bullets
    for (const pIdx of this.bullets) {
      processBulletOrGrapple(pIdx);
    }
    
    // Process grapples
    for (const pIdx of this.grapples) {
      processBulletOrGrapple(pIdx);
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