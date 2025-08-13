import DSL from './dsl';
import { Rule } from './rule';
import { AbilityEffect } from "../types/AbilityEffect";
import { Ability } from "../types/Ability";
import { Unit } from "../types/Unit";
import * as abilitiesJson from '../../data/abilities.json';
import { Simulator } from '../core/simulator';

export class Abilities extends Rule {
  // @ts-ignore
  static all: { [key: string]: Ability } = abilitiesJson as any;

  constructor(sim: any) {
    super(sim);
  }

  ability = (name: string): Ability | undefined => Abilities.all[name];

  apply = (): void => {
    // Check for units that need to unburrow
    this.sim.units.forEach(unit => {
      if (unit.meta?.burrowed && unit.meta?.burrowStartTick !== undefined && unit.meta?.burrowDuration !== undefined) {
        const ticksBurrowed = this.sim.ticks - unit.meta.burrowStartTick;
        if (ticksBurrowed >= unit.meta.burrowDuration) {
          // Queue command to unburrow
          this.sim.queuedCommands.push({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: {
                burrowed: false,
                invisible: false,
                burrowStartTick: undefined,
                burrowDuration: undefined
              }
            }
          });
        }
      }
    });

    // Process abilities for each unit
    (this.sim.units as Unit[]).forEach(unit => {
      if (!unit.abilities || !Array.isArray(unit.abilities)) {
        return;
      }
      
      for (const abilityName of unit.abilities) {
        const ability = this.ability(abilityName);
        if (!ability) {
          continue;
        }

        let lastTick = unit.lastAbilityTick ? unit.lastAbilityTick[abilityName] : undefined;
        let currentTick = this.sim.ticks;
        let ready = lastTick === undefined || (currentTick - lastTick >= ability.cooldown);

        if (!ready) {
          continue;
        }

        // Check max uses if defined
        if (ability.maxUses) {
          const usesKey = `${abilityName}Uses`;
          const currentUses = unit.meta?.[usesKey] || 0;
          if (currentUses >= ability.maxUses) {
            continue; // Ability exhausted
          }
        }

        let shouldTrigger = true;
        if (ability.trigger) {
          try {
            shouldTrigger = DSL.evaluate(ability.trigger, unit, this.sim);
          } catch (error) {
            console.error(`Error evaluating JSON ability trigger for ${abilityName}:`, error);
            shouldTrigger = false;
          }
        }

        if (!shouldTrigger) {
          continue;
        }

        // Resolve primary target
        let target = unit; // Default to self
        if (ability.target && ability.target !== 'self') {
          try {
            target = DSL.evaluate(ability.target, unit, this.sim);
          } catch (error) {
            console.error(`Error evaluating JSON ability target for ${abilityName}:`, error);
            continue;
          }

          if (target === null || target === undefined) {
            continue;
          }
        }

        // Process each effect by converting to commands
        for (const effect of ability.effects) {
          this.processEffectAsCommand(effect, unit, target);
        }

        // Update cooldown via command
        this.sim.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              lastAbilityTick: {
                ...unit.lastAbilityTick,
                [abilityName]: this.sim.ticks
              }
            }
          }
        });
        
      }
    });
  }

  processEffectAsCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    if (!this.sim.queuedCommands) {
      this.sim.queuedCommands = [];
    }

    switch (effect.type) {
      case 'damage':
        this.hurt(effect, caster, primaryTarget);
        break;
      case 'heal':
        this.heal(effect, caster, primaryTarget);
        break;
      case 'aoe':
        this.areaOfEffect(effect, caster, primaryTarget);
        break;
      case 'projectile':
        this.project(effect, caster, primaryTarget);
        break;
      case 'weather':
        this.changeWeather(effect, caster, primaryTarget);
        break;
      case 'lightning':
        this.bolt(effect, caster, primaryTarget);
        break;
      case 'jump':
        this.leap(effect, caster, primaryTarget);
        break;
      case 'heat':
        this.adjustTemperature(effect, caster, primaryTarget);
        break;
      case 'deploy':
        this.deploy(effect, caster, primaryTarget);
        break;
      case 'grapple':
        this.grapply(effect, caster, primaryTarget);
        break;
      case 'pin':
        this.pin(effect, caster, primaryTarget);
        break;
      case 'airdrop':
        this.airdrop(effect, caster, primaryTarget);
        break;
      case 'buff':
        // Process buffs immediately so they affect subsequent heals
        this.buff(effect, caster, primaryTarget);
        break;
      case 'summon':
        this.summon(effect, caster, primaryTarget);
        break;
      case 'moisture':
        this.adjustHumidity(effect, caster, primaryTarget);
        break;
      case 'toss':
        this.toss(effect, caster, primaryTarget);
        break;
      case 'setOnFire':
        this.ignite(effect, caster, primaryTarget);
        break;
      case 'particles':
        this.createParticles(effect, caster, primaryTarget);
        break;
      case 'cone':
        this.coneOfEffect(effect, caster, primaryTarget);
        break;
      case 'multiple_projectiles':
        this.multiproject(effect, caster, primaryTarget);
        break;
      case 'line_aoe':
        this.lineOfEffect(effect, caster, primaryTarget);
        break;
      case 'area_buff':
        this.domainBuff(effect, caster, primaryTarget);
        break;
      case 'debuff':
        this.debuff(effect, caster, primaryTarget);
        break;
      case 'cleanse':
        this.cleanse(effect, caster, primaryTarget);
        break;
      case 'area_particles':
        // NOTE: should be a real command???
        break;
      case 'reveal':
        this.reveal(effect, caster, primaryTarget);
        break;
      case 'burrow':
        this.burrow(effect, caster, primaryTarget);
        break;
      case 'tame':
        this.tame(effect, caster, primaryTarget);
        break;
      case 'calm':
        this.calm(effect, caster, primaryTarget);
        break;
      case 'entangle':
        this.tangle(effect, caster, primaryTarget);
        break;
      case 'terrain':
        this.modifyTerrain(effect, caster, primaryTarget);
        break;
      default:
        console.warn(`Abilities: Unknown effect type ${effect.type}`);
        throw new Error(`Unknown effect type: ${effect.type}`);
    }
  }

  private resolveTarget(targetExpression: string | number | boolean | undefined, caster: any, primaryTarget: any): any {
    if (!targetExpression) return primaryTarget;
    if (targetExpression === 'self') return caster;
    if (targetExpression === 'target') return primaryTarget;
    if (targetExpression === 'self.pos') return caster.pos;
    if (targetExpression === 'target.pos') return primaryTarget.pos || primaryTarget;
    
    try {
      return DSL.evaluate(targetExpression.toString(), caster, this.sim);
    } catch (error) {
      console.warn(`Failed to resolve target '${targetExpression}':`, error);
      return null;
    }
  }

  private resolveValue(value: any, caster: any, target: any): any {
    // Handle string DSL expressions
    if (typeof value === 'string') {
      try {
        return DSL.evaluate(value, caster, this.sim, target);
      } catch (error) {
        console.warn(`Failed to resolve DSL value '${value}':`, error);
        return value; // fallback to literal
      }
    }
    
    // Handle non-object values
    if (typeof value !== 'object') return value;
    
    if (value.$random) {
      // Check if it's an array (random selection) or number range
      if (Array.isArray(value.$random)) {
        // Random selection from array
        return value.$random[Math.floor(this.rng.random() * value.$random.length)];
      } else if (value.$random.length === 2 && typeof value.$random[0] === 'number') {
        // Random number range
        const [min, max] = value.$random;
        return Math.floor(min + this.rng.random() * (max - min + 1));
      }
    }
    
    if (value.$conditional) {
      const condition = value.$conditional.if;
      try {
        // Need to evaluate with context that includes target
        const conditionStr = condition.replace(/target\./g, '');
        const targetForEval = target || caster;
        const hasTag = (tag: string) => targetForEval.tags?.includes(tag) || false;
        const isUndead = hasTag('undead');
        const isSpectral = hasTag('spectral');
        
        // Simple evaluation for common conditions
        if (condition.includes('undead') && condition.includes('spectral')) {
          const conditionResult = isUndead || isSpectral;
          return conditionResult ? value.$conditional.then : value.$conditional.else;
        }
        
        // Fallback to DSL evaluation
        const conditionResult = DSL.evaluate(condition, caster, this.sim);
        return conditionResult ? value.$conditional.then : value.$conditional.else;
      } catch (error) {
        console.warn(`Failed to evaluate conditional: ${condition}`, error);
        return value.$conditional.else || 0;
      }
    }
    
    return value;
  }

  private hurt(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target, caster, primaryTarget);
    if (!target || !target.id) return;

    const amount = this.resolveValue(effect.amount, caster, target);
    const aspect = effect.aspect || 'physical';

    this.sim.queuedCommands.push({
      type: 'damage',
      params: {
        targetId: target.id,
        amount: amount,
        aspect: aspect
      },
      unitId: caster.id
    });
  }

  private heal(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target, caster, primaryTarget);
    if (!target || !target.id) return;

    const amount = this.resolveValue(effect.amount, caster, target);
    const aspect = effect.aspect || 'healing';

    this.sim.queuedCommands.push({
      type: 'heal',
      params: {
        targetId: target.id,
        amount: amount,
        aspect: aspect
      },
      unitId: caster.id
    });
  }

  private areaOfEffect(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target, caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const amount = this.resolveValue(effect.amount, caster, target);
    const radius = this.resolveValue(effect.radius, caster, target);
    const aspect = effect.aspect || 'physical';

    this.sim.queuedCommands.push({
      type: 'aoe',
      params: {
        x: pos.x,
        y: pos.y,
        radius: radius,
        damage: amount,
        type: aspect,
        stunDuration: this.resolveValue((effect as any).stunDuration, caster, target)
      },
      unitId: caster.id
    });
  }

  private project(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const startPos = this.resolveTarget(effect.pos || 'self.pos', caster, primaryTarget);
    if (!startPos) return;

    // Use 'id' field for projectileType if present, otherwise default to 'bullet'
    const projectileType = effect.projectileType || effect.id || 'bullet';
    const damage = this.resolveValue(effect.damage, caster, primaryTarget) || 0;
    const radius = this.resolveValue(effect.radius, caster, primaryTarget) || 1;

    const params: any = {
      x: startPos.x,
      y: startPos.y,
      projectileType: projectileType,
      damage: damage,
      radius: radius,
      team: caster.team,
      z: this.resolveValue((effect as any).z, caster, primaryTarget)
    };

    // Add target position if specified
    if (effect.target) {
      const target = this.resolveTarget(effect.target, caster, primaryTarget);
      if (target) {
        const targetPos = target.pos || target;
        if (targetPos && typeof targetPos.x === 'number' && typeof targetPos.y === 'number') {
          params.targetX = targetPos.x;
          params.targetY = targetPos.y;
        }
      }
    } else if (primaryTarget && primaryTarget.pos) {
      // Use primary target if no specific target given
      params.targetX = primaryTarget.pos.x;
      params.targetY = primaryTarget.pos.y;
    }

    this.sim.queuedCommands.push({
      type: 'projectile',
      params: params,
      unitId: caster.id
    });
  }

  private changeWeather(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const weatherType = effect.weatherType || 'rain';
    const duration = effect.duration || 60;
    const intensity = effect.intensity || 0.5;

    this.sim.queuedCommands.push({
      type: 'weather',
      params: {
        weatherType: weatherType,
        duration: duration,
        intensity: intensity
      },
      unitId: caster.id
    });
  }

  private bolt(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    
    const params: any = {};
    if (target) {
      const pos = target.pos || target;
      params.x = pos.x;
      params.y = pos.y;
    }

    this.sim.queuedCommands.push({
      type: 'lightning',
      params: params,
      unitId: caster.id
    });
  }

  private leap(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const height = this.resolveValue(effect.height, caster, target) || 5;
    const damage = this.resolveValue(effect.damage, caster, target) || 5;
    const radius = this.resolveValue(effect.radius, caster, target) || 3;

    this.sim.queuedCommands.push({
      type: 'jump',
      params: {
        targetX: pos.x,
        targetY: pos.y,
        height: height,
        damage: damage,
        radius: radius
      },
      unitId: caster.id
    });
  }

  private adjustTemperature(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const amount = this.resolveValue(effect.amount, caster, target) || 5;
    const radius = this.resolveValue(effect.radius, caster, target) || 1;

    // Use temperature command if available
    this.sim.queuedCommands.push({
      type: 'temperature',
      params: {
        x: pos.x,
        y: pos.y,
        amount: amount,
        radius: radius
      },
      unitId: caster.id
    });
  }

  private deploy(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const constructType = this.resolveValue((effect as any).constructType, caster, primaryTarget) || 'clanker';

    // Queue deploy command without position to let it calculate tactical placement
    // The deploy command will find the midpoint between deployer and nearest enemy
    this.sim.queuedCommands.push({
      type: 'deploy',
      params: {
        unitType: constructType
      },
      unitId: caster.id
    });

    // Track uses if applicable
    if (!caster.meta) caster.meta = {};
    if (!caster.meta.deployBotUses) caster.meta.deployBotUses = 0;
    caster.meta.deployBotUses++;
  }

  private grapply(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target) return;

    // Grapple command expects x and y as separate arguments
    const pos = target.pos || target;
    this.sim.queuedCommands.push({
      type: 'grapple',
      params: {
        x: pos.x,
        y: pos.y
      },
      unitId: caster.id
    });
  }

  private pin(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target) return;

    // Pin command expects x,y coordinates, not target ID
    const pos = target.pos || target;
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return;

    this.sim.queuedCommands.push({
      type: 'pin',
      params: {
        x: pos.x,
        y: pos.y
      },
      unitId: caster.id
    });
  }

  private airdrop(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'self.pos', caster, primaryTarget);
    if (!target) return;

    // For mechatronist, calculate tactical midpoint between caster and target
    let pos = target.pos || target;
    
    // If this is a mechatronist calling airdrop, use tactical positioning
    if (caster.sprite === 'mechatronist') {
      // If target is a position (has x,y but no id), it's likely an enemy position
      if (pos.x !== undefined && pos.y !== undefined && !target.id) {
        // Calculate midpoint between caster and target position
        pos = {
          x: (caster.pos.x + pos.x) / 2,
          y: (caster.pos.y + pos.y) / 2
        };
      } else if (target.id && target.team !== caster.team) {
        // Target is an enemy unit
        pos = {
          x: (caster.pos.x + target.pos.x) / 2,
          y: (caster.pos.y + target.pos.y) / 2
        };
      }
    }
    
    const unitType = (effect as any).unit || 'mechatron';

    this.sim.queuedCommands.push({
      type: 'airdrop',
      params: {
        unitType: unitType,
        x: pos.x,
        y: pos.y
      },
      unitId: caster.id
    });
  }

  private buff(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;
    
    // Apply buff directly to target
    if (!target.meta) target.meta = {};
    
    if (effect.buff) {
      // Apply buff stats
      for (const [stat, value] of Object.entries(effect.buff)) {
        if (typeof value === 'string' && value.startsWith('+')) {
          const increase = parseInt(value.substring(1));
          if (stat === 'maxHp') {
            const oldMaxHp = target.maxHp || 0;
            const oldHp = target.hp || 0;
            target.maxHp = oldMaxHp + increase;
            target.hp = oldHp + increase; // Also increase current HP
          } else if (stat === 'armor') {
            target.meta.armor = (target.meta.armor || 0) + increase;
          } else if (stat === 'dmg') {
            target.dmg = (target.dmg || 0) + increase;
          }
        } else {
          // Direct assignment for non-numeric buffs
          target.meta[stat] = value;
        }
      }
    }
    
    // Handle stat increases (reinforcement gives HP increase)
    if ((effect as any).hpIncrease) {
      const increase = this.resolveValue((effect as any).hpIncrease, caster, target);
      target.hp = Math.min(target.maxHp, target.hp + increase);
    }
    
    // Handle other buff effects
    if (effect.amount) {
      const amount = this.resolveValue(effect.amount, caster, target);
      // For reinforcement/buff, amount could be HP increase
      target.hp = Math.min(target.maxHp, target.hp + amount);
    }
  }

  private summon(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const unitType = this.resolveValue(effect.unit, caster, primaryTarget) || 'squirrel';
    const pos = caster.pos;

    // Spawn the unit directly with metadata
    const Encyclopaedia = require('../dmg/encyclopaedia').default;
    const summonedUnit = {
      ...Encyclopaedia.unit(unitType),
      id: `${unitType}_${caster.id}_${this.sim.ticks}`,
      pos: { 
        x: pos.x + (this.rng.random() - 0.5) * 2, 
        y: pos.y + (this.rng.random() - 0.5) * 2 
      },
      team: caster.team,
      meta: {
        summoned: true,
        summonedBy: caster.id,
        summonTick: this.sim.ticks
      }
    };
    
    // Queue add command to create the summoned unit
    this.sim.queuedCommands.push({
      type: 'spawn',
      params: { unit: summonedUnit }
    });
  }

  private adjustHumidity(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    // Similar to heat but for moisture
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const amount = this.resolveValue(effect.amount, caster, target) || 1.0;
    const radius = this.resolveValue(effect.radius, caster, target) || 5;

    // Use temperature command with negative value for cooling
    if (this.sim.addMoisture) {
      this.sim.addMoisture(pos.x, pos.y, amount, radius);
    }
  }

  private toss(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;

    const distance = this.resolveValue((effect as any).distance, caster, target) || 5;

    this.sim.queuedCommands.push({
      type: 'toss',
      params: {
        targetId: target.id,
        distance: distance
      },
      unitId: caster.id
    });
  }

  private ignite(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;

    // Set the unit on fire
    if (!target.meta) target.meta = {};
    target.meta.onFire = true;
    target.meta.onFireDuration = 30;
  }
  
  private modifyTerrain(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const pos = this.resolveTarget(effect.target || 'self.pos', caster, primaryTarget);
    if (!pos) return;
    
    const terrainType = (effect as any).terrainType;
    const radius = (effect as any).radius || 1;
    const duration = effect.duration || 200;
    
    // Create trench terrain - modifies the field to provide defensive bonuses
    if (terrainType === 'trench') {
      // Mark cells as trenches
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const x = Math.floor(pos.x + dx);
          const y = Math.floor(pos.y + dy);
          
          // Check if position is valid
          if (x >= 0 && x < this.sim.fieldWidth && y >= 0 && y < this.sim.fieldHeight) {
            // Queue a terrain modification event
            this.sim.queuedEvents.push({
              kind: 'terrain',
              source: caster.id,
              meta: {
                x,
                y,
                terrainType: 'trench',
                duration,
                defenseBonus: 0.5, // 50% damage reduction
                movementPenalty: 0.3 // 30% slower movement
              }
            });
            
            // Visual feedback - dust particles
            for (let i = 0; i < 3; i++) {
              this.sim.particles.push({
                pos: { x: x + this.rng.random(), y: y + this.rng.random() },
                vel: { x: (this.rng.random() - 0.5) * 0.2, y: -this.rng.random() * 0.3 },
                radius: 0.5 + this.rng.random() * 0.5,
                lifetime: 20 + this.rng.random() * 20,
                color: '#8B4513', // Brown dust
                type: 'debris' // Use debris for dust/dirt particles
              });
            }
          }
        }
      }
    }
  }

  private tangle(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target) return;
    
    const duration = this.resolveValue(effect.duration, caster, target) || 30;
    const radius = this.resolveValue(effect.radius, caster, target) || 3;
    
    // Apply entangle/pin effect to target using meta command
    if (target.id) {
      this.sim.queuedCommands.push({
        type: 'meta',
        params: {
          unitId: target.id,
          meta: {
            pinned: true,
            pinDuration: duration,
            entangled: true
          }
        }
      });
      
      // Create visual particles for entangle effect
      const particles = [];
      for (let i = 0; i < 8; i++) {
        particles.push({
          id: `entangle_${caster.id}_${this.sim.ticks}_${i}`,
          pos: { 
            x: target.pos.x + (this.rng.random() - 0.5) * radius, 
            y: target.pos.y + (this.rng.random() - 0.5) * radius 
          },
          vel: { x: 0, y: 0 },
          ttl: duration,
          color: '#228B22', // Forest green
          type: 'entangle',
          size: 0.5
        });
      }
      this.sim.particles.push(...particles);
    }
  }

  private coneOfEffect(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    // Cone attacks affect multiple targets in a cone shape
    const direction = caster.facing || { x: 1, y: 0 };
    const range = effect.range || 4;
    const width = effect.width || 3;

    // Process nested effects for units in cone
    if (effect.effects) {
      for (const nestedEffect of effect.effects) {
        // Apply to all units in cone area
        const unitsInCone = this.sim.getRealUnits().filter(u => {
          if (u.id === caster.id || u.team === caster.team) return false;
          // Simple cone check - could be more sophisticated
          const dist = Math.sqrt(Math.pow(u.pos.x - caster.pos.x, 2) + Math.pow(u.pos.y - caster.pos.y, 2));
          return dist <= (typeof range === 'number' ? range : Number(range));
        });

        for (const unit of unitsInCone) {
          this.processEffectAsCommand(nestedEffect, caster, unit);
        }
      }
    }
  }

  private multiproject(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const count = this.resolveValue(effect.count, caster, primaryTarget) || 1;
    const stagger = this.resolveValue((effect as any).stagger, caster, primaryTarget) || 0;
    
    for (let i = 0; i < count; i++) {
      // Create projectile effect with parameters from the multi-projectile effect
      const projectileEffect = {
        type: 'projectile' as const,
        projectileType: (effect as any).projectileType || 'bullet',
        pos: (effect as any).pos || 'self.pos',
        target: effect.target,
        damage: (effect as any).damage || effect.amount,
        radius: effect.radius,
        vel: (effect as any).vel,
        z: (effect as any).z,
        duration: (effect as any).duration,
        spread: (effect as any).spread,
        origin: (effect as any).origin
      };
      
      // Add slight delay for staggered launch
      if (stagger > 0 && i > 0) {
        // For now, just create all at once - could be enhanced with timing
      }
      
      this.project(projectileEffect, caster, primaryTarget);
    }
  }

  private lineOfEffect(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    // Line AoE from start to end
    const start = this.resolveTarget((effect as any).start || 'self.pos', caster, primaryTarget);
    const end = this.resolveTarget((effect as any).end || 'target', caster, primaryTarget);
    if (!start || !end) return;

    const amount = this.resolveValue(effect.amount, caster, primaryTarget);
    const aspect = effect.aspect || 'physical';

    // For now, implement as multiple AoE effects along the line
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t;
      
      this.sim.queuedCommands.push({
        type: 'aoe',
        params: {
          x: x,
          y: y,
          radius: 1,
          damage: amount,
          type: aspect
        },
        unitId: caster.id
      });
    }
  }

  private domainBuff(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'self.pos', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const radius = this.resolveValue(effect.radius, caster, target) || 3;

    // Apply buff to all units in area, filtering by condition if specified
    const unitsInArea = this.sim.getRealUnits().filter(u => {
      const dist = Math.sqrt(Math.pow(u.pos.x - pos.x, 2) + Math.pow(u.pos.y - pos.y, 2));
      if (dist > radius) return false;
      
      // Check condition if specified
      if (effect.condition && typeof effect.condition === 'string') {
        try {
          // Simple condition check for construct/mechanical tags
          if (effect.condition.includes('mechanical')) {
            return u.tags?.includes('mechanical');
          }
          if (effect.condition.includes('construct')) {
            return u.tags?.includes('construct');
          }
          // Ensure unit has tags property for DSL evaluation
          const safeUnit = { ...u, tags: u.tags || [] };
          const context = {
            ...safeUnit,
            target: safeUnit,  // Make target reference the same unit with safe tags
            self: safeUnit
          };
          return DSL.evaluate(effect.condition, context, this.sim);
        } catch (error) {
          console.warn(`Failed to evaluate condition '${effect.condition}':`, error);
          return false;
        }
      }
      
      return true;
    });


    for (const unit of unitsInArea) {
      // Apply buff directly for now (tests expect immediate effect)
      if (effect.buff) {
        if (!unit.meta) unit.meta = {};
        Object.assign(unit.meta, effect.buff);
        
        // Handle special resetCooldowns buff
        if (effect.buff.resetCooldowns) {
          if (unit.lastAbilityTick) {
            for (const abilityName in unit.lastAbilityTick) {
              unit.lastAbilityTick[abilityName] = 0;
            }
          }
        }
      }
    }
  }

  private debuff(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;

    // Apply debuff
    if (effect.debuff) {
      if (!target.meta) target.meta = {};
      Object.assign(target.meta, effect.debuff);
    }
  }

  private cleanse(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;

    // Remove specified effects
    if (effect.effectsToRemove && target.meta) {
      for (const effectName of effect.effectsToRemove) {
        delete target.meta[effectName];
      }
    }
  }

  private reveal(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'self.pos', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const radius = effect.radius || 6;

    // Reveal hidden/invisible units in radius
    const unitsInArea = this.sim.getRealUnits().filter(u => {
      const dist = Math.sqrt(Math.pow(u.pos.x - pos.x, 2) + Math.pow(u.pos.y - pos.y, 2));
      return dist <= (typeof radius === 'number' ? radius : Number(radius));
    });

    for (const unit of unitsInArea) {
      if (unit.meta?.hidden || unit.meta?.invisible) {
        // Queue command to reveal the unit
        this.sim.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              hidden: false,
              invisible: false,
              revealed: true
            }
          }
        });
      }
    }
  }

  private burrow(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'self', caster, primaryTarget);
    if (!target) return;

    const duration = effect.duration || 15;

    // Set burrowed state
    if (!target.meta) target.meta = {};
    target.meta.burrowed = true;
    target.meta.invisible = true;
    target.meta.burrowDuration = duration;
    target.meta.burrowStartTick = this.sim.ticks;
  }

  private tame(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;

    // Find the actual unit in the sim
    const actualTarget = this.sim.units.find(u => u.id === target.id);
    if (!actualTarget) return;

    // Check if this is tameMegabeast ability which requires mass >= 10
    if (caster.abilities?.includes('tameMegabeast') && actualTarget.mass < 10) {
      console.warn(`${caster.id} cannot tame ${actualTarget.id} - target mass ${actualTarget.mass} is too low (requires >= 10)`);
      return;
    }

    // Queue command to tame the target
    this.sim.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: actualTarget.id,
        meta: {
          originalTeam: actualTarget.meta?.originalTeam || actualTarget.team,
          tamed: true,
          tamedBy: caster.id
        }
      }
    });
    
    // Queue command to change team
    this.sim.queuedCommands.push({
      type: 'changeTeam',
      unitId: actualTarget.id,
      params: {
        team: caster.team
      }
    });
    
    // Add taming particles
    for (let i = 0; i < 5; i++) {
      this.sim.particles.push({
        id: `tame_${caster.id}_${this.sim.ticks}_${i}`,
        pos: { 
          x: actualTarget.pos.x + (this.rng.random() - 0.5) * 2, 
          y: actualTarget.pos.y + (this.rng.random() - 0.5) * 2 
        },
        vel: { x: 0, y: -0.1 },
        radius: 0.3,
        lifetime: 20,
        color: '#90EE90', // Light green
        type: 'tame'
      });
    }
  }

  private calm(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'self.pos', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const radius = this.resolveValue(effect.radius, caster, primaryTarget) || 5;

    // Calm all beasts/animals in radius - check for animal tag or beast-like sprites
    const beastSprites = ['bear', 'owl', 'wolf', 'fox', 'deer', 'rabbit', 'squirrel', 'bird'];
    const unitsInArea = this.sim.getRealUnits().filter(u => {
      const dist = Math.sqrt(Math.pow(u.pos.x - pos.x, 2) + Math.pow(u.pos.y - pos.y, 2));
      return dist <= radius && (u.tags?.includes('animal') || u.tags?.includes('beast') || beastSprites.includes(u.sprite));
    });

    for (const unit of unitsInArea) {
      // Queue command to calm unit
      this.sim.queuedCommands.push({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            calmed: true,
            aggressive: false
          }
        }
      });
      // Queue halt command
      this.sim.queuedCommands.push({
        type: 'halt',
        params: { unitId: unit.id }
      });
      
      // Add calm particles (only if not already created for this unit)
      const particleId = `calm_${unit.id}`;
      if (!unit.meta?.calmed && !this.sim.particles.some(p => p.id === particleId)) {
        this.sim.particles.push({
          id: particleId,
          pos: { x: unit.pos.x, y: unit.pos.y - 0.5 },
          vel: { x: 0, y: -0.05 },
          ttl: 30,
          color: '#ADD8E6', // Light blue
          type: 'calm',
          size: 0.4,
          radius: 1,
          lifetime: 30
        });
      }
    }
  }

  private createParticles(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget((effect as any).pos || effect.target || 'self.pos', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const color = (effect as any).color || '#FFFFFF';
    const lifetime = this.resolveValue((effect as any).lifetime, caster, target) || 20;
    const count = this.resolveValue((effect as any).count, caster, target) || 5;

    // Create multiple particles for visual effect
    for (let i = 0; i < count; i++) {
      this.sim.particles.push({
        pos: { 
          x: pos.x + (this.rng.random() - 0.5) * 2, 
          y: pos.y + (this.rng.random() - 0.5) * 2 
        },
        vel: { 
          x: (this.rng.random() - 0.5) * 0.2, 
          y: (this.rng.random() - 0.5) * 0.2 
        },
        ttl: lifetime + this.rng.random() * 10,
        color: color,
        type: (effect as any).particleType || 'generic',
        size: 0.3 + this.rng.random() * 0.2,
        radius: 1,
        lifetime
      });
    }
  }
}