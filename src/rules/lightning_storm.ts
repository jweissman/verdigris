import { Rule } from './rule';
import { Simulator } from '../core/simulator';
import { Vec2 } from '../types/Vec2';
// Position type removed - use Vec2 instead

export class LightningStorm extends Rule {
  private stormIntensity: number = 1;
  private lastStrikeTime: number = 0;
  private strikeCooldown: number = 8; // ~1 second between strikes at 8fps (faster for testing)

  constructor(simulator: Simulator) {
    super(simulator);
  }

  apply(): void {
    if (!this.simulator.lightningActive) return;

    // Generate lightning strikes periodically
    if (this.simulator.ticks - this.lastStrikeTime >= this.strikeCooldown) {
      this.generateLightningStrike();
      this.lastStrikeTime = this.simulator.ticks;
      
      // Vary the cooldown for dramatic effect (6-12 ticks)
      this.strikeCooldown = 6 + this.rng.random() * 6;
    }

    // Update existing lightning particles
    this.updateLightningEffects();
  }

  public generateLightningStrike(targetPos?: Vec2): void {
    // Use specified position or pick random strike location
    const strikePos = targetPos || {
      x: Math.floor(this.rng.random() * this.simulator.fieldWidth),
      y: Math.floor(this.rng.random() * this.simulator.fieldHeight)
    };

    this.createLightningVisuals(strikePos);
    this.createEmpBurst(strikePos);
    this.boostMechanicalUnits(strikePos);
    this.createAtmosphericEffects(strikePos);
  }

  private createLightningVisuals(pos: Vec2): void {
    const pixelX = pos.x * 8 + 4;
    const pixelY = pos.y * 8 + 4;

    // Main lightning bolt - vertical streak
    for (let i = 0; i < 8; i++) {
      this.simulator.particles.push({
        pos: { x: pixelX + (this.rng.random() - 0.5) * 3, y: pixelY - i * 4 },
        vel: { x: 0, y: 0 },
        radius: 1 + this.rng.random() * 2,
        color: i < 2 ? '#FFFFFF' : (i < 4 ? '#CCCCFF' : '#8888FF'),
        lifetime: 8 + this.rng.random() * 4, // Brief but intense
        type: 'lightning'
      });
    }

    // Lightning branches - jagged extensions
    for (let branch = 0; branch < 4; branch++) {
      const branchAngle = this.rng.random() * Math.PI * 2;
      const branchLength = 2 + this.rng.random() * 3;
      
      for (let i = 0; i < branchLength; i++) {
        this.simulator.particles.push({
          pos: { 
            x: pixelX + Math.cos(branchAngle) * i * 8,
            y: pixelY + Math.sin(branchAngle) * i * 8
          },
          vel: { x: 0, y: 0 },
          radius: 0.5 + this.rng.random(),
          color: '#AAAAFF',
          lifetime: 6 + this.rng.random() * 3,
          type: 'lightning_branch'
        });
      }
    }

    // Electric discharge particles
    for (let i = 0; i < 12; i++) {
      this.simulator.particles.push({
        pos: { x: pixelX, y: pixelY },
        vel: { 
          x: (this.rng.random() - 0.5) * 2,
          y: (this.rng.random() - 0.5) * 2
        },
        radius: 0.5,
        color: '#CCCCFF',
        lifetime: 15 + this.rng.random() * 10,
        type: 'electric_spark'
      });
    }
  }

  private createEmpBurst(pos: Vec2): void {
    this.simulator.queuedEvents.push({
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

  private boostMechanicalUnits(pos: Vec2): void {
    // Find all mechanical units within range for power boost
    // Use pending units during frame to see updates
    const units = (this.simulator as any).inFrame ? this.simulator.getPendingUnits() : this.simulator.units;
    const mechanicalUnits = units.filter(unit =>
      unit.tags?.includes('mechanical') &&
      Math.abs(unit.pos.x - pos.x) <= 4 &&
      Math.abs(unit.pos.y - pos.y) <= 4 &&
      unit.hp > 0
    );

    mechanicalUnits.forEach(unit => {
      // Queue lightning supercharge effect
      this.sim.queuedCommands.push({
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
          let t: number = (this.simulator.ticks || 0);
          const ticksSinceUse = t - (unit.lastAbilityTick![abilityName] || 0);
          const boostAmount = Math.floor(ticksSinceUse * 0.5);
          unit.lastAbilityTick![abilityName] = Math.max(0, 
            (unit.lastAbilityTick![abilityName] || 0) - boostAmount
          );
        });
      }

      // Extra boost for mechanist units
      if (unit.tags?.includes('leader') || unit.tags?.includes('engineer')) {
        this.sim.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: { lightningBoostDuration: 90 } // Extended boost for leaders
          }
        });
        
        // Visual effect on boosted mechanists
        this.simulator.particles.push({
          pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
          vel: { x: 0, y: -1 },
          radius: 3,
          color: '#FFFF00',
          lifetime: 30,
          type: 'power_surge'
        });
      }
    });
  }

  private createAtmosphericEffects(pos: Vec2): void {
    const pixelX = pos.x * 8 + 4;
    const pixelY = pos.y * 8 + 4;

    // Thunder rumble - expanding energy ring
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const radius = 2 + this.rng.random();
      
      this.simulator.particles.push({
        pos: { x: pixelX, y: pixelY },
        vel: { 
          x: Math.cos(angle) * 0.5,
          y: Math.sin(angle) * 0.5
        },
        radius: radius,
        color: '#444488',
        lifetime: 20 + this.rng.random() * 15,
        type: 'thunder_ring'
      });
    }

    // Ozone particles - lingering static effect
    for (let i = 0; i < 6; i++) {
      this.simulator.particles.push({
        pos: { 
          x: pixelX + (this.rng.random() - 0.5) * 16,
          y: pixelY + (this.rng.random() - 0.5) * 16
        },
        vel: { x: 0, y: -0.1 },
        radius: 1,
        color: '#6666AA',
        lifetime: 40 + this.rng.random() * 20,
        type: 'ozone'
      });
    }
  }

  private updateLightningEffects(): void {
    // Decay lightning boost effects over time
    this.simulator.units.forEach(unit => {
      if (unit.meta.lightningBoostDuration) {
        unit.meta.lightningBoostDuration--;
        if (unit.meta.lightningBoostDuration <= 0) {
          delete unit.meta.lightningBoost;
          delete unit.meta.lightningBoostDuration;
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