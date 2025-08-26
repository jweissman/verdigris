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
    
    const toRemove: number[] = [];
    
    // Process only a subset of projectiles each frame when there are many
    const maxChecksPerFrame = 20;
    this.frameCounter++;
    
    // Cache active unit positions for faster access
    const activeUnits = unitArrays.activeIndices;
    const unitCount = activeUnits.length;
    
    // Separate arrays by type for better cache locality
    const bullets: number[] = [];
    const bombs: number[] = [];
    const grapples: number[] = [];
    
    for (let pIdx = 0; pIdx < projectileArrays.capacity; pIdx++) {
      if (projectileArrays.active[pIdx] === 0) continue;
      const projType = projectileArrays.type[pIdx];
      if (projType === 0) bullets.push(pIdx);
      else if (projType === 1) bombs.push(pIdx);
      else if (projType === 2) grapples.push(pIdx);
    }
    
    // If we have too many projectiles, only process a subset per frame
    let bulletsToProcess = bullets;
    if (bullets.length > maxChecksPerFrame) {
      const startIdx = (this.frameCounter * maxChecksPerFrame) % bullets.length;
      const endIdx = Math.min(startIdx + maxChecksPerFrame, bullets.length);
      bulletsToProcess = bullets.slice(startIdx, endIdx);
      // Also check wrapped around portion if needed
      if (endIdx < startIdx + maxChecksPerFrame) {
        bulletsToProcess.push(...bullets.slice(0, maxChecksPerFrame - (endIdx - startIdx)));
      }
    }
    
    // Process bombs first (they explode and don't need collision checks)
    for (const pIdx of bombs) {
      const shouldExplode = (projectileArrays.duration[pIdx] > 0 && 
                            projectileArrays.progress[pIdx] >= projectileArrays.duration[pIdx]) ||
                           (projectileArrays.lifetime[pIdx] >= 30);
      if (shouldExplode) {
        this.processBombExplosion(projectileArrays, pIdx, unitArrays);
        toRemove.push(pIdx);
      }
    }
    
    // Process bullets and grapples with collision detection
    for (const pIdx of [...bulletsToProcess, ...grapples]) {
      const projX = projectileArrays.posX[pIdx];
      const projY = projectileArrays.posY[pIdx];
      const radius = projectileArrays.radius[pIdx];
      const radiusSq = radius * radius;
      const projTeam = projectileArrays.team[pIdx];
      const projType = projectileArrays.type[pIdx];
      
      // Check collisions with units - optimized inner loop
      for (let i = 0; i < unitCount; i++) {
        const unitIdx = activeUnits[i];
        
        // Skip dead units
        if (unitArrays.hp[unitIdx] <= 0) continue;
        
        // Skip friendly fire (except grapples)
        if (projType !== 2 && unitArrays.team[unitIdx] === projTeam) continue;
        
        // Inline distance check for performance
        const dx = unitArrays.posX[unitIdx] - projX;
        if (dx > radius || dx < -radius) continue;
        
        const dy = unitArrays.posY[unitIdx] - projY;
        if (dy > radius || dy < -radius) continue;
        
        const distSq = dx * dx + dy * dy;
        if (distSq >= radiusSq) continue;
        
        // Hit detected
        if (projType === 2) { // grapple
          this.commands.push({
            type: "meta",
            params: {
              unitId: unitArrays.unitIds[unitIdx],
              meta: {
                grappleHit: true,
                grapplerID: projectileArrays.sourceIds[pIdx] || "unknown",
                grappleOrigin: { x: projX, y: projY },
              },
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
        
        toRemove.push(pIdx);
        break; // Only hit one unit per projectile
      }
    }
    
    // Remove hit projectiles
    for (const idx of toRemove) {
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