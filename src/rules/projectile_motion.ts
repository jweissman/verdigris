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
  private frameOffset = 0;
  
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
      
      // Check collision with units - use spatial bounds first
      let checksPerformed = 0;
      const maxChecks = 5; // Very aggressive limit
      const checkRadius = radius + 2; // Slightly larger for safety
      
      for (const unitIdx of activeUnits) {
        if (checksPerformed > maxChecks) break;
        
        // Quick bounds check before incrementing counter
        const unitX = unitArrays.posX[unitIdx];
        if (Math.abs(unitX - projX) > checkRadius) continue;
        
        const unitY = unitArrays.posY[unitIdx];
        if (Math.abs(unitY - projY) > checkRadius) continue;
        
        // Only count checks that pass bounds test
        checksPerformed++;
        
        // Team check first (cheapest)
        if (projType !== 2 && unitArrays.team[unitIdx] === projTeam) continue;
        
        // Health check
        if (unitArrays.hp[unitIdx] <= 0) continue;
        
        // We already have unitX and unitY from bounds check
        const dx = unitX - projX;
        const dy = unitY - projY;
        
        // Precise distance check
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
    
    // Process projectiles in batches - rotate through them
    const allProjectiles = [...this.bullets, ...this.grapples];
    const maxPerFrame = Math.min(3, allProjectiles.length); // Process max 3 per frame
    
    // Process a rotating subset each frame
    const startIdx = this.frameOffset % Math.max(1, allProjectiles.length);
    const endIdx = Math.min(startIdx + maxPerFrame, allProjectiles.length);
    
    for (let i = startIdx; i < endIdx; i++) {
      processBulletOrGrapple(allProjectiles[i]);
    }
    
    // Also process wrapped around if we hit the end
    if (endIdx < startIdx + maxPerFrame && allProjectiles.length > 0) {
      const remaining = maxPerFrame - (endIdx - startIdx);
      for (let i = 0; i < Math.min(remaining, startIdx); i++) {
        processBulletOrGrapple(allProjectiles[i]);
      }
    }
    
    this.frameOffset += maxPerFrame;
    
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