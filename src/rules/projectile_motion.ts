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
    
    // Skip everything if no units
    if (unitCount === 0) {
      return this.commands;
    }
    
    // Fast categorization using activeIndices
    if (projectileArrays.activeIndices && projectileArrays.activeIndices.length > 0) {
      // Use pre-allocated arrays to avoid push overhead
      let bulletCount = 0;
      let bombCount = 0; 
      let grappleCount = 0;
      
      for (const pIdx of projectileArrays.activeIndices) {
        const projType = projectileArrays.type[pIdx];
        if (projType === 0) {
          this.bullets[bulletCount++] = pIdx;
        } else if (projType === 1) {
          this.bombs[bombCount++] = pIdx;
        } else if (projType === 2) {
          this.grapples[grappleCount++] = pIdx;
        }
      }
      
      // Trim arrays to actual size
      this.bullets.length = bulletCount;
      this.bombs.length = bombCount;
      this.grapples.length = grappleCount;
    } else {
      // Should never happen in practice
      return this.commands;
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
    
    // Process bullets and grapples
    const allProjectiles = [...this.bullets, ...this.grapples];
    if (allProjectiles.length === 0) {
      return this.commands;
    }
    
    // Compute bounding box of all units for broad-phase culling
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const unitPosX = unitArrays.posX;
    const unitPosY = unitArrays.posY;
    
    for (const idx of activeUnits) {
      const x = unitPosX[idx];
      const y = unitPosY[idx];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    
    // Add max projectile radius as padding
    const maxRadius = 5; // reasonable max for projectiles
    minX -= maxRadius;
    maxX += maxRadius;
    minY -= maxRadius;
    maxY += maxRadius;
    
    // Process all projectiles with optimized collision detection
    // Cache array references for faster access
    const projPosX = projectileArrays.posX;
    const projPosY = projectileArrays.posY;
    const projRadius = projectileArrays.radius;
    const projTeam = projectileArrays.team;
    const projType = projectileArrays.type;
    const projDamage = projectileArrays.damage;
    const projAspect = projectileArrays.aspect;
    const projSourceIds = projectileArrays.sourceIds;
    const projIds = projectileArrays.projectileIds;
    
    // unitPosX and unitPosY already cached above
    const unitTeam = unitArrays.team;
    const unitHp = unitArrays.hp;
    const unitIds = unitArrays.unitIds;
    
    for (const pIdx of allProjectiles) {
      const projX = projPosX[pIdx];
      const projY = projPosY[pIdx];
      
      // Broad-phase: skip projectiles outside unit bounding box
      if (projX < minX || projX > maxX || projY < minY || projY > maxY) {
        continue;
      }
      
      const radius = projRadius[pIdx];
      const radiusSq = radius * radius;
      const pTeam = projTeam[pIdx];
      const pType = projType[pIdx];
      
      // Inline the spatial query for better performance
      let hit = false;
      
      // Direct iteration with early exit
      for (const unitIdx of activeUnits) {
        // Quick bounds check first
        const unitX = unitPosX[unitIdx];
        const dx = unitX - projX;
        if (dx > radius || dx < -radius) continue;
        
        const unitY = unitPosY[unitIdx];
        const dy = unitY - projY;
        if (dy > radius || dy < -radius) continue;
        
        // Team and health checks
        if (pType !== 2 && unitTeam[unitIdx] === pTeam) continue;
        if (unitHp[unitIdx] <= 0) continue;
        
        // Precise distance check
        const distSq = dx * dx + dy * dy;
        if (distSq >= radiusSq) continue;
        
        // Hit detected!
        if (pType === 2) { // grapple
          this.commands.push({
            type: "grapple",
            params: {
              operation: "hit",
              unitId: unitIds[unitIdx],
              grapplerID: projSourceIds[pIdx] || "unknown",
              origin: { x: projX, y: projY },
            },
          });
        } else {
          this.commands.push({
            type: "damage",
            params: {
              targetId: unitIds[unitIdx],
              amount: projDamage[pIdx],
              aspect: projAspect[pIdx],
              origin: { x: projX, y: projY },
            },
          });
        }
        
        this.toRemove.push(pIdx);
        hit = true;
        break; // Only hit one unit per projectile
      }
    }
    
    // Remove hit projectiles
    for (const idx of this.toRemove) {
      this.commands.push({
        type: "removeProjectile",
        params: { id: projIds[idx] },
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