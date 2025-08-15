import { Rule } from './rule';
import { Simulator } from '../core/simulator';
import { Vec2 } from '../types/Vec2';
import type { TickContext } from '../core/tick_context';
// Position type removed - use Vec2 instead

export class LightningStorm extends Rule {
  private stormIntensity: number = 1;
  private lastStrikeTime: number = 0;
  private strikeCooldown: number = 8; // ~1 second between strikes at 8fps (faster for testing)

  constructor() {
    super();
  }

  execute(context: TickContext): void {
    // Note: TickContext doesn't expose lightningActive, so we'll check for lightning meta on field
    // For now, assume lightning is active if any unit has lightning-related metadata
    const hasLightningActivity = context.getAllUnits().some(u => u.meta?.lightningBoost || u.meta?.lightningStorm);
    if (!hasLightningActivity && context.getCurrentTick() % 60 !== 0) return;

    // Generate lightning strikes periodically
    if (context.getCurrentTick() - this.lastStrikeTime >= this.strikeCooldown) {
      this.generateLightningStrike(context);
      this.lastStrikeTime = context.getCurrentTick();
      
      // Vary the cooldown for dramatic effect (6-12 ticks)
      this.strikeCooldown = 6 + context.getRandom() * 6;
    }

    // Update existing lightning particles
    this.updateLightningEffects(context);
  }

  public generateLightningStrike(context: TickContext, targetPos?: Vec2): void {
    // Use specified position or pick random strike location
    const strikePos = targetPos || {
      x: Math.floor(context.getRandom() * context.getFieldWidth()),
      y: Math.floor(context.getRandom() * context.getFieldHeight())
    };

    this.createLightningVisuals(context, strikePos);
    this.createEmpBurst(context, strikePos);
    this.boostMechanicalUnits(context, strikePos);
    this.createAtmosphericEffects(context, strikePos);
  }

  private createLightningVisuals(context: TickContext, pos: Vec2): void {
    const pixelX = pos.x * 8 + 4;
    const pixelY = pos.y * 8 + 4;

    // Main lightning bolt - vertical streak
    for (let i = 0; i < 8; i++) {
      context.queueEvent({
        kind: 'particle',
        meta: {
          pos: { x: pixelX + (context.getRandom() - 0.5) * 3, y: pixelY - i * 4 },
          vel: { x: 0, y: 0 },
          radius: 1 + context.getRandom() * 2,
          color: i < 2 ? '#FFFFFF' : (i < 4 ? '#CCCCFF' : '#8888FF'),
          lifetime: 8 + context.getRandom() * 4, // Brief but intense
          type: 'lightning'
        }
      });
    }

    // Lightning branches - jagged extensions
    for (let branch = 0; branch < 4; branch++) {
      const branchAngle = context.getRandom() * Math.PI * 2;
      const branchLength = 2 + context.getRandom() * 3;
      
      for (let i = 0; i < branchLength; i++) {
        context.queueEvent({
          kind: 'particle',
          meta: {
            pos: { 
              x: pixelX + Math.cos(branchAngle) * i * 8,
              y: pixelY + Math.sin(branchAngle) * i * 8
            },
            vel: { x: 0, y: 0 },
            radius: 0.5 + context.getRandom(),
            color: '#AAAAFF',
            lifetime: 6 + context.getRandom() * 3,
            type: 'lightning_branch'
          }
        });
      }
    }

    // Electric discharge particles
    for (let i = 0; i < 12; i++) {
      context.queueEvent({
        kind: 'particle',
        meta: {
          pos: { x: pixelX, y: pixelY },
          vel: { 
            x: (context.getRandom() - 0.5) * 2,
            y: (context.getRandom() - 0.5) * 2
          },
          radius: 0.5,
          color: '#CCCCFF',
          lifetime: 15 + context.getRandom() * 10,
          type: 'electric_spark'
        }
      });
    }
  }

  private createEmpBurst(context: TickContext, pos: Vec2): void {
    context.queueEvent({
      kind: 'aoe',
      source: 'lightning',
      target: pos,
      meta: {
        aspect: 'emp',
        radius: 3,
        stunDuration: 20, // 2.5 seconds of stun
        amount: 0, // No damage, just stun effect
        mechanicalImmune: true // Mechanical units are immune
      }
    });
  }

  private boostMechanicalUnits(context: TickContext, pos: Vec2): void {
    // Find all mechanical units within range for power boost
    const mechanicalUnits = context.getAllUnits().filter(unit =>
      unit.tags?.includes('mechanical') &&
      Math.abs(unit.pos.x - pos.x) <= 4 &&
      Math.abs(unit.pos.y - pos.y) <= 4 &&
      unit.hp > 0
    );

    mechanicalUnits.forEach(unit => {
      // Queue lightning supercharge effect
      context.queueCommand({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            lightningBoost: true,
            lightningBoostDuration: 60 // 7.5 seconds of boost
          }
        }
      });
      
      // Reduce all ability cooldowns by 50%
      if (unit.lastAbilityTick) {
        Object.keys(unit.lastAbilityTick).forEach(abilityName => {
          let t: number = context.getCurrentTick();
          const ticksSinceUse = t - (unit.lastAbilityTick![abilityName] || 0);
          const boostAmount = Math.floor(ticksSinceUse * 0.5);
          unit.lastAbilityTick![abilityName] = Math.max(0, 
            (unit.lastAbilityTick![abilityName] || 0) - boostAmount
          );
        });
      }

      // Extra boost for mechanist units
      if (unit.tags?.includes('leader') || unit.tags?.includes('engineer')) {
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: { lightningBoostDuration: 90 } // Extended boost for leaders
          }
        });
        
        // Visual effect on boosted mechanists
        context.queueEvent({
          kind: 'particle',
          meta: {
            pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
            vel: { x: 0, y: -1 },
            radius: 3,
            color: '#FFFF00',
            lifetime: 30,
            type: 'power_surge'
          }
        });
      }
    });
  }

  private createAtmosphericEffects(context: TickContext, pos: Vec2): void {
    const pixelX = pos.x * 8 + 4;
    const pixelY = pos.y * 8 + 4;

    // Thunder rumble - expanding energy ring
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const radius = 2 + context.getRandom();
      
      context.queueEvent({
        kind: 'particle',
        meta: {
          pos: { x: pixelX, y: pixelY },
          vel: { 
            x: Math.cos(angle) * 0.5,
            y: Math.sin(angle) * 0.5
          },
          radius: radius,
          color: '#444488',
          lifetime: 20 + context.getRandom() * 15,
          type: 'thunder_ring'
        }
      });
    }

    // Ozone particles - lingering static effect
    for (let i = 0; i < 6; i++) {
      context.queueEvent({
        kind: 'particle',
        meta: {
          pos: { 
            x: pixelX + (context.getRandom() - 0.5) * 16,
            y: pixelY + (context.getRandom() - 0.5) * 16
          },
          vel: { x: 0, y: -0.1 },
          radius: 1,
          color: '#6666AA',
          lifetime: 40 + context.getRandom() * 20,
          type: 'ozone'
        }
      });
    }
  }

  private updateLightningEffects(context: TickContext): void {
    // Decay lightning boost effects over time
    context.getAllUnits().forEach(unit => {
      if (unit.meta.lightningBoostDuration) {
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              lightningBoostDuration: unit.meta.lightningBoostDuration - 1
            }
          }
        });
        
        if (unit.meta.lightningBoostDuration <= 1) {
          context.queueCommand({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: {
                lightningBoost: undefined,
                lightningBoostDuration: undefined
              }
            }
          });
        }
      }
    });
  }

  // Static method to start a lightning storm
  static createLightningStorm(sim: Simulator): void {
    sim.lightningActive = true;
    
    // Add storm ambiance particles
    for (let i = 0; i < 8; i++) {
      sim.particles.push({
        pos: { 
          x: Simulator.rng.random() * sim.fieldWidth * 8,
          y: Simulator.rng.random() * sim.fieldHeight * 8
        },
        vel: { x: (Simulator.rng.random() - 0.5) * 0.2, y: -0.1 },
        radius: 0.5,
        color: '#333366',
        lifetime: 120 + Simulator.rng.random() * 60,
        type: 'storm_cloud'
      });
    }
  }

  static endLightningStorm(sim: Simulator): void {
    sim.lightningActive = false;
  }
}