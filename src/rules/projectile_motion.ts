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
    this.frameCounter++;
    
    // Only process projectiles every other frame to reduce CPU load
    if (this.frameCounter % 2 !== 0) {
      return this.commands;
    }
    
    const projectileArrays = context.getProjectileArrays();
    if (!projectileArrays || projectileArrays.activeCount === 0) {
      return this.commands;
    }
    
    // Exit early if no projectiles
    if (!projectileArrays.activeIndices || projectileArrays.activeIndices.length === 0) {
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
    
    
    // Cache array refs
    const unitPosX = unitArrays.posX;
    const unitPosY = unitArrays.posY;
    
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
    
    // Process projectiles in batches for better cache locality
    for (let p = 0; p < allProjectiles.length; p++) {
      const pIdx = allProjectiles[p];
      const projX = projPosX[pIdx];
      const projY = projPosY[pIdx];
      
      // Early exit for projectiles out of bounds
      if (projX < -5 || projY < -5 || projX > 105 || projY > 105) {
        this.toRemove.push(pIdx);
        continue;
      }
      
      const radius = projRadius[pIdx];
      const pTeam = projTeam[pIdx];
      const pType = projType[pIdx];
      
      // Use actual radius for collision
      const effectiveRadius = radius;
      const effectiveRadiusSq = radius * radius;
      
      let hit = false;
      
      // Check units, but exit early if we find a hit
      for (let u = 0; u < unitCount; u++) {
        const unitIdx = activeUnits[u];
        
        // Skip dead units first (cheapest check)
        if (unitHp[unitIdx] <= 0) continue;
        
        // Team check
        if (pType !== 2 && unitTeam[unitIdx] === pTeam) continue;
        
        // Coarse distance check first (Manhattan distance)
        const dx = unitPosX[unitIdx] - projX;
        const dy = unitPosY[unitIdx] - projY;
        
        // Use tighter bounds for initial check
        if (Math.abs(dx) > effectiveRadius || Math.abs(dy) > effectiveRadius) continue;
        
        // Precise distance check only if coarse passed
        if ((dx * dx + dy * dy) >= effectiveRadiusSq) continue;
        
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