import DSL from './dsl';
import { Rule } from './rule';
import { AbilityEffect } from "../types/AbilityEffect";
import { Ability } from "../types/Ability";
import { Unit } from "../types/Unit";
import * as abilitiesJson from '../../data/abilities.json';
import type { TickContext } from '../core/tick_context';

export class Abilities extends Rule {
  // @ts-ignore
  static all: { [key: string]: Ability } = abilitiesJson as any;

  constructor() {
    super();
  }

  ability = (name: string): Ability | undefined => Abilities.all[name];

  execute(context: TickContext): void {
    // Check for units that need to unburrow
    const currentTick = context.getCurrentTick();
    context.getAllUnits().forEach(unit => {
      if (unit.meta?.burrowed && unit.meta.burrowStartTick !== undefined && unit.meta.burrowDuration !== undefined) {
        const ticksBurrowed = currentTick - unit.meta.burrowStartTick;
        if (ticksBurrowed >= unit.meta.burrowDuration) {
          // Queue command to unburrow
          context.queueCommand({
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
    context.getAllUnits().forEach(unit => {
      if (!unit.abilities || !Array.isArray(unit.abilities)) {
        return;
      }
      
      for (const abilityName of unit.abilities) {
        const ability = this.ability(abilityName);
        if (!ability) {
          continue;
        }

        let lastTick = unit.lastAbilityTick ? unit.lastAbilityTick[abilityName] : undefined;
        let ready = lastTick === undefined || (currentTick - lastTick >= ability.cooldown);

        if (!ready) {
          continue;
        }

        // Check max uses if defined
        if (ability.maxUses) {
          const usesKey = `${abilityName}Uses`;
          const currentUses = unit.meta[usesKey] || 0;
          if (currentUses >= ability.maxUses) {
            continue; // Ability exhausted
          }
        }

        let shouldTrigger = true;
        if (ability.trigger) {
          try {
            shouldTrigger = DSL.evaluate(ability.trigger, unit, context);
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
            target = DSL.evaluate(ability.target, unit, context);
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
          this.processEffectAsCommand(context, effect, unit, target);
        }

        // Update cooldown via command
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              lastAbilityTick: {
                ...unit.lastAbilityTick,
                [abilityName]: currentTick
              }
            }
          }
        });
        
      }
    });
  }

  processEffectAsCommand(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    switch (effect.type) {
      case 'damage':
        this.hurt(context, effect, caster, primaryTarget);
        break;
      case 'heal':
        this.heal(context, effect, caster, primaryTarget);
        break;
      case 'aoe':
        this.areaOfEffect(context, effect, caster, primaryTarget);
        break;
      case 'projectile':
        this.project(context, effect, caster, primaryTarget);
        break;
      case 'weather':
        this.changeWeather(context, effect, caster, primaryTarget);
        break;
      case 'lightning':
        this.bolt(context, effect, caster, primaryTarget);
        break;
      case 'jump':
        this.leap(context, effect, caster, primaryTarget);
        break;
      case 'heat':
        this.adjustTemperature(context, effect, caster, primaryTarget);
        break;
      case 'deploy':
        this.deploy(context, effect, caster, primaryTarget);
        break;
      case 'grapple':
        this.grapply(context, effect, caster, primaryTarget);
        break;
      case 'pin':
        this.pin(context, effect, caster, primaryTarget);
        break;
      case 'airdrop':
        this.airdrop(context, effect, caster, primaryTarget);
        break;
      case 'buff':
        // Process buffs immediately so they affect subsequent heals
        this.buff(context, effect, caster, primaryTarget);
        break;
      case 'summon':
        this.summon(context, effect, caster, primaryTarget);
        break;
      case 'moisture':
        this.adjustHumidity(context, effect, caster, primaryTarget);
        break;
      case 'toss':
        this.toss(context, effect, caster, primaryTarget);
        break;
      case 'setOnFire':
        this.ignite(context, effect, caster, primaryTarget);
        break;
      case 'particles':
        this.createParticles(context, effect, caster, primaryTarget);
        break;
      case 'cone':
        this.coneOfEffect(context, effect, caster, primaryTarget);
        break;
      case 'multiple_projectiles':
        this.multiproject(context, effect, caster, primaryTarget);
        break;
      case 'line_aoe':
        this.lineOfEffect(context, effect, caster, primaryTarget);
        break;
      case 'area_buff':
        this.domainBuff(context, effect, caster, primaryTarget);
        break;
      case 'debuff':
        this.debuff(context, effect, caster, primaryTarget);
        break;
      case 'cleanse':
        this.cleanse(context, effect, caster, primaryTarget);
        break;
      case 'area_particles':
        // NOTE: should be a real command???
        break;
      case 'reveal':
        this.reveal(context, effect, caster, primaryTarget);
        break;
      case 'burrow':
        this.burrow(context, effect, caster, primaryTarget);
        break;
      case 'tame':
        this.tame(context, effect, caster, primaryTarget);
        break;
      case 'calm':
        this.calm(context, effect, caster, primaryTarget);
        break;
      case 'entangle':
        this.tangle(context, effect, caster, primaryTarget);
        break;
      case 'terrain':
        this.modifyTerrain(context, effect, caster, primaryTarget);
        break;
      default:
        console.warn(`Abilities: Unknown effect type ${effect.type}`);
        throw new Error(`Unknown effect type: ${effect.type}`);
    }
  }

  private resolveTarget(context: TickContext, targetExpression: any, caster: any, primaryTarget: any): any {
    if (!targetExpression) return primaryTarget;
    if (targetExpression === 'self') return caster;
    if (targetExpression === 'target') return primaryTarget;
    if (targetExpression === 'self.pos') return caster.pos;
    if (targetExpression === 'target.pos') return primaryTarget.pos || primaryTarget;
    
    // If it's already an object (like a position), return it directly
    if (typeof targetExpression === 'object' && targetExpression !== null) {
      return targetExpression;
    }
    
    // Only try DSL evaluation for strings
    if (typeof targetExpression === 'string') {
      try {
        return DSL.evaluate(targetExpression, caster, context);
      } catch (error) {
        console.warn(`Failed to resolve target '${targetExpression}':`, error);
        return null;
      }
    }
    
    return targetExpression;
  }

  private resolveValue(context: TickContext, value: any, caster: any, target: any): any {
    // Handle string DSL expressions
    if (typeof value === 'string') {
      try {
        return DSL.evaluate(value, caster, context, target);
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
        return value.$random[Math.floor(context.getRandom() * value.$random.length)];
      } else if (value.$random.length === 2 && typeof value.$random[0] === 'number') {
        // Random number range
        const [min, max] = value.$random;
        return Math.floor(min + context.getRandom() * (max - min + 1));
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
        const conditionResult = DSL.evaluate(condition, caster, context);
        return conditionResult ? value.$conditional.then : value.$conditional.else;
      } catch (error) {
        console.warn(`Failed to evaluate conditional: ${condition}`, error);
        return value.$conditional.else || 0;
      }
    }
    
    return value;
  }

  private hurt(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target, caster, primaryTarget);
    if (!target || !target.id) return;

    const amount = this.resolveValue(context, effect.amount, caster, target);
    const aspect = effect.aspect || 'physical';

    context.queueCommand({
      type: 'damage',
      params: {
        targetId: target.id,
        amount: amount,
        aspect: aspect
      },
      unitId: caster.id
    });
  }

  private heal(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target, caster, primaryTarget);
    if (!target || !target.id) return;

    const amount = this.resolveValue(context, effect.amount, caster, target);
    const aspect = effect.aspect || 'healing';

    context.queueCommand({
      type: 'heal',
      params: {
        targetId: target.id,
        amount: amount,
        aspect: aspect
      },
      unitId: caster.id
    });
  }

  private areaOfEffect(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target, caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const amount = this.resolveValue(context, effect.amount, caster, target);
    const radius = this.resolveValue(context, effect.radius, caster, target);
    const aspect = effect.aspect || 'physical';

    context.queueCommand({
      type: 'aoe',
      params: {
        x: pos.x,
        y: pos.y,
        radius: radius,
        damage: amount,
        type: aspect,
        stunDuration: this.resolveValue(context, (effect as any).stunDuration, caster, target)
      },
      unitId: caster.id
    });
  }

  private project(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const startPos = this.resolveTarget(context, effect.pos || 'self.pos', caster, primaryTarget);
    if (!startPos) return;

    // Use 'id' field for projectileType if present, otherwise default to 'bullet'
    const projectileType = effect.projectileType || effect.id || 'bullet';
    const damage = this.resolveValue(context, effect.damage, caster, primaryTarget) || 0;
    const radius = this.resolveValue(context, effect.radius, caster, primaryTarget) || 1;

    const params: any = {
      x: startPos.x,
      y: startPos.y,
      projectileType: projectileType,
      damage: damage,
      radius: radius,
      team: caster.team,
      z: this.resolveValue(context, (effect as any).z, caster, primaryTarget)
    };

    // Add target position if specified
    if (effect.target) {
      const target = this.resolveTarget(context, effect.target, caster, primaryTarget);
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

    context.queueCommand({
      type: 'projectile',
      params: params,
      unitId: caster.id
    });
  }

  private changeWeather(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const weatherType = effect.weatherType || 'rain';
    const duration = effect.duration || 60;
    const intensity = effect.intensity || 0.5;

    context.queueCommand({
      type: 'weather',
      params: {
        weatherType: weatherType,
        duration: duration,
        intensity: intensity
      },
      unitId: caster.id
    });
  }

  private bolt(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'target', caster, primaryTarget);
    
    const params: any = {};
    if (target) {
      const pos = target.pos || target;
      params.x = pos.x;
      params.y = pos.y;
    }

    context.queueCommand({
      type: 'lightning',
      params: params,
      unitId: caster.id
    });
  }

  private leap(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'target', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const height = this.resolveValue(context, effect.height, caster, target) || 5;
    const damage = this.resolveValue(context, effect.damage, caster, target) || 5;
    const radius = this.resolveValue(context, effect.radius, caster, target) || 3;

    context.queueCommand({
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

  private adjustTemperature(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'target', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const amount = this.resolveValue(context, effect.amount, caster, target) || 5;
    const radius = this.resolveValue(context, effect.radius, caster, target) || 1;

    // Use temperature command if available
    context.queueCommand({
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

  private deploy(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const constructType = this.resolveValue(context, (effect as any).constructType, caster, primaryTarget) || 'clanker';

    // Queue deploy command without position to let it calculate tactical placement
    // The deploy command will find the midpoint between deployer and nearest enemy
    context.queueCommand({
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

  private grapply(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'target', caster, primaryTarget);
    if (!target) return;

    // Grapple command expects x and y as separate arguments
    const pos = target.pos || target;
    context.queueCommand({
      type: 'grapple',
      params: {
        x: pos.x,
        y: pos.y
      },
      unitId: caster.id
    });
  }

  private pin(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'target', caster, primaryTarget);
    if (!target) return;

    // Pin command expects x,y coordinates, not target ID
    const pos = target.pos || target;
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return;

    context.queueCommand({
      type: 'pin',
      params: {
        x: pos.x,
        y: pos.y
      },
      unitId: caster.id
    });
  }

  private airdrop(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'self.pos', caster, primaryTarget);
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

    context.queueCommand({
      type: 'airdrop',
      params: {
        unitType: unitType,
        x: pos.x,
        y: pos.y
      },
      unitId: caster.id
    });
  }

  private buff(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'target', caster, primaryTarget);
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
            // Queue command to update stats
            context.queueCommand({
              type: 'meta',
              params: {
                unitId: target.id,
                maxHp: oldMaxHp + increase,
                hp: oldHp + increase
              }
            });
          } else if (stat === 'armor') {
            // Queue command to update armor
            context.queueCommand({
              type: 'meta',
              params: {
                unitId: target.id,
                meta: {
                  ...target.meta,
                  armor: (target.meta.armor || 0) + increase
                }
              }
            });
          } else if (stat === 'dmg') {
            // Queue command to update damage
            context.queueCommand({
              type: 'meta',
              params: {
                unitId: target.id,
                dmg: (target.dmg || 0) + increase
              }
            });
          }
        } else {
          // Non-numeric buffs through command system
          context.queueCommand({
            type: 'meta',
            params: {
              unitId: target.id,
              meta: {
                ...target.meta,
                [stat]: value
              }
            }
          });
        }
      }
    }
    
    // Handle stat increases (reinforcement gives HP increase)
    if ((effect as any).hpIncrease) {
      const increase = this.resolveValue(context, (effect as any).hpIncrease, caster, target);
      target.hp = Math.min(target.maxHp, target.hp + increase);
    }
    
    // Handle other buff effects
    if (effect.amount) {
      const amount = this.resolveValue(context, effect.amount, caster, target);
      // For reinforcement/buff, amount could be HP increase
      target.hp = Math.min(target.maxHp, target.hp + amount);
    }
  }

  private summon(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const unitType = this.resolveValue(context, effect.unit, caster, primaryTarget) || 'squirrel';
    const pos = caster.pos;

    // Spawn the unit directly with metadata
    const Encyclopaedia = require('../dmg/encyclopaedia').default;
    const summonedUnit = {
      ...Encyclopaedia.unit(unitType),
      id: `${unitType}_${caster.id}_${context.getCurrentTick()}`,
      pos: { 
        x: pos.x + (context.getRandom() - 0.5) * 2, 
        y: pos.y + (context.getRandom() - 0.5) * 2 
      },
      team: caster.team,
      meta: {
        summoned: true,
        summonedBy: caster.id,
        summonTick: context.getCurrentTick()
      }
    };
    
    // Queue add command to create the summoned unit
    context.queueCommand({
      type: 'spawn',
      params: { unit: summonedUnit }
    });
  }

  private adjustHumidity(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    // Similar to heat but for moisture
    const target = this.resolveTarget(context, effect.target || 'target', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const amount = this.resolveValue(context, effect.amount, caster, target) || 1.0;
    const radius = this.resolveValue(context, effect.radius, caster, target) || 5;

    // Queue moisture event - context should handle this
    context.queueEvent({
      kind: 'moisture',
      source: caster.id,
      target: pos,
      meta: { amount, radius }
    });
  }

  private toss(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;

    const distance = this.resolveValue(context, (effect as any).distance, caster, target) || 5;

    context.queueCommand({
      type: 'toss',
      params: {
        targetId: target.id,
        distance: distance
      },
      unitId: caster.id
    });
  }

  private ignite(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;

    // Queue command to set unit on fire
    context.queueCommand({
      type: 'meta',
      params: {
        unitId: target.id,
        meta: {
          onFire: true,
          onFireDuration: 30
        }
      }
    });
  }
  
  private modifyTerrain(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const pos = this.resolveTarget(context, effect.target || 'self.pos', caster, primaryTarget);
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
          
          // Check if position is valid - don't check bounds, let context handle it
          // Queue a terrain modification event
          context.queueEvent({
              kind: 'terrain',
              source: caster.id,
              target: { x, y }, // Position goes in target, not meta
              meta: {
                terrainType: 'trench',
                duration,
                defenseBonus: 0.5, // 50% damage reduction
                movementPenalty: 0.3 // 30% slower movement
              }
            });
          
          // Visual feedback - dust particles via event
          for (let i = 0; i < 3; i++) {
            context.queueEvent({
              kind: 'particle',
              source: caster.id,
              target: { x: x + context.getRandom(), y: y + context.getRandom() },
              meta: {
                vel: { x: (context.getRandom() - 0.5) * 0.2, y: -context.getRandom() * 0.3 },
                radius: 0.5 + context.getRandom() * 0.5,
                lifetime: 20 + context.getRandom() * 20,
                color: '#8B4513', // Brown dust
                type: 'debris' // Use debris for dust/dirt particles
              }
            });
          }
        }
      }
    }
  }

  private tangle(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'target', caster, primaryTarget);
    if (!target) return;
    
    const duration = this.resolveValue(context, effect.duration, caster, target) || 30;
    const radius = this.resolveValue(context, effect.radius, caster, target) || 3;
    
    // Apply entangle/pin effect to target using meta command
    if (target.id) {
      context.queueCommand({
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
          id: `entangle_${caster.id}_${context.getCurrentTick()}_${i}`,
          pos: { 
            x: target.pos.x + (context.getRandom() - 0.5) * radius, 
            y: target.pos.y + (context.getRandom() - 0.5) * radius 
          },
          vel: { x: 0, y: 0 },
          ttl: duration,
          color: '#228B22', // Forest green
          type: 'entangle',
          size: 0.5
        });
      }
      // Queue particle events instead of direct push
      for (const particle of particles) {
        context.queueEvent({
          kind: 'particle',
          source: caster.id,
          target: particle.pos,
          meta: particle
        });
      }
    }
  }

  private coneOfEffect(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    // Cone attacks affect multiple targets in a cone shape
    const direction = caster.facing || { x: 1, y: 0 };
    const range = effect.range || 4;
    const width = effect.width || 3;

    // Process nested effects for units in cone
    if (effect.effects) {
      for (const nestedEffect of effect.effects) {
        // Apply to all units in cone area
        const unitsInCone = context.getAllUnits().filter(u => {
          if (u.id === caster.id || u.team === caster.team) return false;
          // Simple cone check - could be more sophisticated
          const dist = Math.sqrt(Math.pow(u.pos.x - caster.pos.x, 2) + Math.pow(u.pos.y - caster.pos.y, 2));
          return dist <= (typeof range === 'number' ? range : Number(range));
        });

        for (const unit of unitsInCone) {
          this.processEffectAsCommand(context, nestedEffect, caster, unit);
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

  private lineOfEffect(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    // Line AoE from start to end
    const start = this.resolveTarget(context, (effect as any).start || 'self.pos', caster, primaryTarget);
    const end = this.resolveTarget(context, (effect as any).end || 'target', caster, primaryTarget);
    if (!start || !end) return;

    const amount = this.resolveValue(context, effect.amount, caster, primaryTarget);
    const aspect = effect.aspect || 'physical';

    // For now, implement as multiple AoE effects along the line
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t;
      
      context.queueCommand({
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

  private domainBuff(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'self.pos', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const radius = this.resolveValue(effect.radius, caster, target) || 3;

    // Apply buff to all units in area, filtering by condition if specified
    const unitsInArea = context.getAllUnits().filter(u => {
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

  private debuff(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;

    // Apply debuff
    if (effect.debuff) {
      if (!target.meta) target.meta = {};
      Object.assign(target.meta, effect.debuff);
    }
  }

  private cleanse(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;

    // Remove specified effects
    if (effect.effectsToRemove && target.meta) {
      for (const effectName of effect.effectsToRemove) {
        delete target.meta[effectName];
      }
    }
  }

  private reveal(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'self.pos', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const radius = effect.radius || 6;

    // Reveal hidden/invisible units in radius
    const unitsInArea = context.getAllUnits().filter(u => {
      const dist = Math.sqrt(Math.pow(u.pos.x - pos.x, 2) + Math.pow(u.pos.y - pos.y, 2));
      return dist <= (typeof radius === 'number' ? radius : Number(radius));
    });

    for (const unit of unitsInArea) {
      if (unit.meta.hidden || unit.meta.invisible) {
        // Queue command to reveal the unit
        context.queueCommand({
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

  private burrow(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'self', caster, primaryTarget);
    if (!target) return;

    const duration = effect.duration || 15;

    // Set burrowed state
    if (!target.meta) target.meta = {};
    target.meta.burrowed = true;
    target.meta.invisible = true;
    target.meta.burrowDuration = duration;
    target.meta.burrowStartTick = context.getCurrentTick();
  }

  private tame(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;

    // Find the actual unit in the sim
    const actualTarget = context.findUnitById(target.id);
    if (!actualTarget) return;

    // Check if this is tameMegabeast ability which requires mass >= 10
    if (caster.abilities?.includes('tameMegabeast') && actualTarget.mass < 10) {
      console.warn(`${caster.id} cannot tame ${actualTarget.id} - target mass ${actualTarget.mass} is too low (requires >= 10)`);
      return;
    }

    // Queue command to tame the target
    context.queueCommand({
      type: 'meta',
      params: {
        unitId: actualTarget.id,
        meta: {
          originalTeam: actualTarget.meta.originalTeam || actualTarget.team,
          tamed: true,
          tamedBy: caster.id
        }
      }
    });
    
    // Queue command to change team
    context.queueCommand({
      type: 'changeTeam',
      unitId: actualTarget.id,
      params: {
        team: caster.team
      }
    });
    
    // Add taming particles
    for (let i = 0; i < 5; i++) {
      context.queueEvent({
        kind: 'particle',
        source: caster.id,
        target: { 
          x: actualTarget.pos.x + (context.getRandom() - 0.5) * 2, 
          y: actualTarget.pos.y + (context.getRandom() - 0.5) * 2 
        },
        meta: {
          vel: { x: 0, y: -0.1 },
          radius: 0.3,
          lifetime: 20,
          color: '#90EE90', // Light green
          type: 'tame'
        }
      });
    }
  }

  private calm(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, effect.target || 'self.pos', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const radius = this.resolveValue(context, effect.radius, caster, primaryTarget) || 5;

    // Calm all beasts/animals in radius - check for animal tag or beast-like sprites
    const beastSprites = ['bear', 'owl', 'wolf', 'fox', 'deer', 'rabbit', 'squirrel', 'bird'];
    const unitsInArea = context.getAllUnits().filter(u => {
      const dist = Math.sqrt(Math.pow(u.pos.x - pos.x, 2) + Math.pow(u.pos.y - pos.y, 2));
      return dist <= radius && (u.tags?.includes('animal') || u.tags?.includes('beast') || beastSprites.includes(u.sprite));
    });

    for (const unit of unitsInArea) {
      // Queue command to calm unit
      context.queueCommand({
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
      context.queueCommand({
        type: 'halt',
        params: { unitId: unit.id }
      });
      
      // Add calm particles (only if not already created for this unit)
      const particleId = `calm_${unit.id}`;
      if (!unit.meta.calmed && !this.sim.particles.some(p => p.id === particleId)) {
        context.queueEvent({
          kind: 'particle',
          source: caster.id,
          target: { x: unit.pos.x, y: unit.pos.y - 0.5 },
          meta: {
            vel: { x: 0, y: -0.05 },
            ttl: 30,
            color: '#ADD8E6', // Light blue
            type: 'calm',
            size: 0.4,
            radius: 1,
            lifetime: 30
          }
        });
      }
    }
  }

  private createParticles(context: TickContext, effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(context, (effect as any).pos || effect.target || 'self.pos', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const color = (effect as any).color || '#FFFFFF';
    const lifetime = this.resolveValue(context, (effect as any).lifetime, caster, target) || 20;
    const count = this.resolveValue(context, (effect as any).count, caster, target) || 5;

    // Create multiple particles for visual effect
    for (let i = 0; i < count; i++) {
      context.queueEvent({
        kind: 'particle',
        source: caster.id,
        target: { 
          x: pos.x + (context.getRandom() - 0.5) * 2, 
          y: pos.y + (context.getRandom() - 0.5) * 2 
        },
        meta: {
          vel: { 
            x: (context.getRandom() - 0.5) * 0.2, 
            y: (context.getRandom() - 0.5) * 0.2 
          },
          ttl: lifetime + context.getRandom() * 10,
          color: color,
          type: (effect as any).particleType || 'generic',
          size: 0.3 + context.getRandom() * 0.2,
          radius: 1,
          lifetime
        }
      });
    }
  }
}