import { Command, CommandParams } from "../rules/command";

/**
 * Ground Pound command - Hero slams down from a jump creating AoE damage
 * Params:
 *   damage?: number - Damage to deal (default 25)
 *   radius?: number - Effect radius (default 3)
 *   knockback?: number - Knockback force (default 5)
 *   screenShake?: boolean - Whether to shake the screen (default true)
 */
export class GroundPound extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    if (!unitId) return;
    
    const hero = this.sim.units.find(u => u.id === unitId);
    if (!hero) return;
    
    const damage = (params.damage as number) || 25;
    const radius = (params.radius as number) || 3;
    const knockback = (params.knockback as number) || 5;
    const screenShake = params.screenShake !== false;
    
    // Hero must be jumping to ground pound
    if (!hero.meta?.jumping) {
      console.log('[GroundPound] Hero must be jumping to ground pound');
      return;
    }
    
    // Calculate impact position (where hero will land)
    const impactX = hero.meta?.targetX || hero.pos.x;
    const impactY = hero.meta?.targetY || hero.pos.y;
    
    // Find all units in radius
    const targets = this.sim.units.filter(u => {
      if (u.id === unitId || u.hp <= 0) return false;
      const dx = Math.abs(u.pos.x - impactX);
      const dy = Math.abs(u.pos.y - impactY);
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= radius;
    });
    
    // Deal damage and knockback to all targets
    for (const target of targets) {
      // Damage based on distance
      const dx = target.pos.x - impactX;
      const dy = target.pos.y - impactY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const falloff = 1 - (dist / radius) * 0.5;
      const actualDamage = Math.floor(damage * falloff);
      
      this.sim.queuedCommands.push({
        type: "damage",
        params: {
          targetId: target.id,
          amount: actualDamage,
          source: unitId,
          aspect: "impact"
        }
      });
      
      // Knockback away from impact
      if (knockback > 0 && dist > 0) {
        const knockX = (dx / dist) * knockback;
        const knockY = (dy / dist) * knockback;
        
        this.sim.queuedCommands.push({
          type: "knockback",
          params: {
            targetId: target.id,
            force: knockback,
            direction: { x: knockX, y: knockY }
          }
        });
      }
      
      // Stun briefly
      this.sim.queuedCommands.push({
        type: "applyStatusEffect",
        params: {
          targetId: target.id,
          effect: "stunned",
          duration: 10
        }
      });
    }
    
    // Visual effects
    
    // Create impact shockwave
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          pos: {
            x: impactX * 8 + 4,
            y: impactY * 8 + 4,
          },
          vel: {
            x: Math.cos(angle) * 4,
            y: Math.sin(angle) * 4,
          },
          lifetime: 20,
          type: "shockwave",
          color: "#8B4513", // Saddle brown for earth
          radius: 2,
          z: 0,
        }
      });
    }
    
    // Create dust clouds
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          pos: {
            x: impactX * 8 + 4 + (Math.random() - 0.5) * radius * 8,
            y: impactY * 8 + 4 + (Math.random() - 0.5) * radius * 8,
          },
          vel: {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed - 2, // Dust rises
          },
          lifetime: 30 + Math.random() * 20,
          type: "dust",
          color: "#D2691E", // Chocolate dust
          radius: 1 + Math.random(),
          z: 5,
        }
      });
    }
    
    // Create cracks in the ground (temporary terrain effect)
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius && Math.random() < 0.3) {
          const x = Math.floor(impactX + dx);
          const y = Math.floor(impactY + dy);
          
          if (x >= 0 && x < this.sim.fieldWidth && y >= 0 && y < this.sim.fieldHeight) {
            // Add crack effect to cell
            this.sim.queuedCommands.push({
              type: "effects",
              params: {
                x: x,
                y: y,
                effect: "cracked",
                duration: 60
              }
            });
          }
        }
      }
    }
    
    // Screen shake effect
    if (screenShake) {
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          type: "screenShake",
          intensity: 0.8,
          duration: 15
        }
      });
    }
    
    // End hero's jump immediately and move to impact position
    this.sim.queuedCommands.push({
      type: "move",
      params: {
        unitId: unitId,
        x: impactX,
        y: impactY
      }
    });
    
    // Clear jump state
    this.sim.queuedCommands.push({
      type: "meta",
      params: {
        unitId: unitId,
        meta: {
          ...hero.meta,
          jumping: false,
          jumpHeight: 0,
          jumpProgress: 1.0,
          targetX: undefined,
          targetY: undefined
        }
      }
    });
    
    // Play impact sound effect (if audio system available)
    this.sim.queuedCommands.push({
      type: "particle",
      params: {
        type: "sound",
        sound: "groundPound",
        volume: 1.0
      }
    });
    
    console.log(`[GroundPound] Hero ${unitId} ground pounds at (${impactX}, ${impactY}) hitting ${targets.length} targets`);
  }
}