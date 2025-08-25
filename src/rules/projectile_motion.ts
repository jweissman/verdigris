import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";

/**
 * ProjectileMotion - handles collision detection and damage events for projectiles
 * The actual movement is handled by ForcesCommand for performance
 */
export class ProjectileMotion extends Rule {
  private commands: QueuedCommand[] = [];

  execute(context: TickContext): QueuedCommand[] {
    const projectiles = context.getProjectiles();
    if (projectiles.length === 0) return [];
    
    this.commands = [];
    const arrays = context.getArrays();
    
    // Process each projectile
    for (const projectile of projectiles) {
      if (this.processProjectile(projectile, arrays)) {
        // Projectile hit something and was removed
        continue;
      }
    }
    
    return this.commands;
  }
  
  private processProjectile(projectile: any, arrays: any): boolean {
    const radius = projectile.radius || 1;
    const radiusSq = radius * radius;
    
    if (projectile.type === "grapple") {
      return this.processGrapple(projectile, arrays, radius, radiusSq);
    } else if (projectile.type === "bomb" && this.shouldExplode(projectile)) {
      this.processBombExplosion(projectile, arrays);
      return true;
    } else {
      return this.processStandardProjectile(projectile, arrays, radius, radiusSq);
    }
  }
  
  private shouldExplode(projectile: any): boolean {
    return (projectile.target &&
      projectile.progress !== undefined &&
      projectile.duration !== undefined &&
      projectile.progress >= projectile.duration) ||
      (projectile.lifetime && projectile.lifetime >= 30);
  }
  
  private processGrapple(projectile: any, arrays: any, radius: number, radiusSq: number): boolean {
    for (const idx of arrays.activeIndices) {
      if (arrays.hp[idx] <= 0) continue;
      
      const absDx = Math.abs(arrays.posX[idx] - projectile.pos.x);
      if (absDx > radius) continue;
      
      const absDy = Math.abs(arrays.posY[idx] - projectile.pos.y);
      if (absDy > radius) continue;
      
      const dx = arrays.posX[idx] - projectile.pos.x;
      const dy = arrays.posY[idx] - projectile.pos.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < radiusSq) {
        this.commands.push({
          type: "meta",
          params: {
            unitId: arrays.unitIds[idx],
            meta: {
              grappleHit: true,
              grapplerID: projectile.sourceId || "unknown",
              grappleOrigin: { ...projectile.pos },
            },
          },
        });
        
        this.commands.push({
          type: "removeProjectile",
          params: { id: projectile.id },
        });
        return true;
      }
    }
    return false;
  }
  
  private processStandardProjectile(projectile: any, arrays: any, radius: number, radiusSq: number): boolean {
    const projectileTeam = projectile.team === "friendly" ? 1 : projectile.team === "hostile" ? 2 : 0;
    
    for (const idx of arrays.activeIndices) {
      if (arrays.team[idx] === projectileTeam || arrays.hp[idx] <= 0) continue;
      
      const absDx = Math.abs(arrays.posX[idx] - projectile.pos.x);
      if (absDx > radius) continue;
      
      const absDy = Math.abs(arrays.posY[idx] - projectile.pos.y);
      if (absDy > radius) continue;
      
      const dx = arrays.posX[idx] - projectile.pos.x;
      const dy = arrays.posY[idx] - projectile.pos.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < radiusSq) {
        this.commands.push({
          type: "damage",
          params: {
            targetId: arrays.unitIds[idx],
            amount: projectile.damage || 10,
            aspect: projectile.aspect || "physical",
            origin: projectile.pos,
          },
        });
        
        this.commands.push({
          type: "removeProjectile",
          params: { id: projectile.id },
        });
        return true;
      }
    }
    return false;
  }
  
  private processBombExplosion(projectile: any, arrays: any): void {
    const explosionRadius = projectile.explosionRadius || 3;
    const explosionRadiusSq = explosionRadius * explosionRadius;
    const explosionDamage = projectile.damage || 20;
    const projectileTeam = projectile.team === "friendly" ? 1 : projectile.team === "hostile" ? 2 : 0;
    
    for (const idx of arrays.activeIndices) {
      if (arrays.team[idx] === projectileTeam) continue;
      if (projectile.sourceId && arrays.unitIds[idx] === projectile.sourceId) continue;
      
      const dx = arrays.posX[idx] - projectile.pos.x;
      const dy = arrays.posY[idx] - projectile.pos.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq <= explosionRadiusSq) {
        const distance = Math.sqrt(distSq);
        const damageMultiplier = Math.max(0.3, 1 - (distance / explosionRadius) * 0.5);
        const damage = Math.floor(explosionDamage * damageMultiplier);
        
        if (damage > 0) {
          this.commands.push({
            type: "damage",
            params: {
              targetId: arrays.unitIds[idx],
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
              unitId: arrays.unitIds[idx],
              x: arrays.posX[idx] + knockbackX,
              y: arrays.posY[idx] + knockbackY,
            },
          });
        }
      }
    }
    
    this.commands.push({
      type: "removeProjectile",
      params: { id: projectile.id },
    });
  }

}
