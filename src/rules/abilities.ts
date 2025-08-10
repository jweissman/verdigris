import DSL from './dsl';
import { Rule } from './rule';
import { Ability, AbilityEffect } from './json_abilities_loader';
import abilities from '../../data/abilities.json';

/**
 * Alternative to the hardcoded Abilities rule
 * Processes abilities defined in JSON format and converts them to commands
 */
export class Abilities extends Rule {
  // private abilities: { [key: string]: Ability } = {};
  static all: { [key: string]: Ability } = abilities; // Load all abilities from JSON

  constructor(sim: any) {
    super(sim);
    // this.abilities = abilities; // JsonAbilitiesLoader.load();
  }

  ability = (name: string): Ability | undefined => Abilities.all[name];

  apply = (): void => {
    // First, check for units that need to emerge from burrow
    this.sim.units.forEach(unit => {
      if (unit.meta?.burrowed && unit.meta?.burrowStartTick !== undefined && unit.meta?.burrowDuration !== undefined) {
        const ticksBurrowed = this.sim.ticks - unit.meta.burrowStartTick;
        if (ticksBurrowed >= unit.meta.burrowDuration) {
          // Emerge from burrow
          unit.meta.burrowed = false;
          unit.meta.invisible = false;
          delete unit.meta.burrowStartTick;
          delete unit.meta.burrowDuration;
          console.log(`${unit.id} emerges from burrow!`);
        }
      }
    });

    this.sim.units = this.sim.units.map(unit => {
      // Process each ability the unit has
      for (const abilityName in unit.abilities) {
        // Skip if ability doesn't exist in JSON definitions
        const ability = this.ability(abilityName);
        if (!ability) {
          continue;
        }

        // const jsonAbility = this.abilities[abilityName];
        
        // Check cooldown
        let lastTick = unit.lastAbilityTick ? unit.lastAbilityTick[abilityName] : undefined;
        let currentTick = this.sim.ticks;
        let ready = lastTick === undefined || (currentTick - lastTick >= ability.cooldown);

        if (!ready) {
          continue;
        }

        // Check trigger condition
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

        // Update cooldown
        if (!unit.lastAbilityTick) {
          unit.lastAbilityTick = {};
        }
        unit.lastAbilityTick[abilityName] = this.sim.ticks;
        
        console.log(`🎯 ${unit.id} uses JSON ability: ${ability.name}`);
      }
      return unit;
    });
  }

  private processEffectAsCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    if (!this.sim.queuedCommands) {
      this.sim.queuedCommands = [];
    }

    switch (effect.type) {
      case 'damage':
        this.queueDamageCommand(effect, caster, primaryTarget);
        break;
      case 'heal':
        this.queueHealCommand(effect, caster, primaryTarget);
        break;
      case 'aoe':
        this.queueAoECommand(effect, caster, primaryTarget);
        break;
      case 'projectile':
        this.queueProjectileCommand(effect, caster, primaryTarget);
        break;
      case 'weather':
        this.queueWeatherCommand(effect, caster, primaryTarget);
        break;
      case 'lightning':
        this.queueLightningCommand(effect, caster, primaryTarget);
        break;
      case 'jump':
        this.queueJumpCommand(effect, caster, primaryTarget);
        break;
      case 'heat':
        this.queueHeatCommand(effect, caster, primaryTarget);
        break;
      case 'deploy':
        this.queueDeployCommand(effect, caster, primaryTarget);
        break;
      case 'grapple':
        this.queueGrappleCommand(effect, caster, primaryTarget);
        break;
      case 'pin':
        this.queuePinCommand(effect, caster, primaryTarget);
        break;
      case 'airdrop':
        this.queueAirdropCommand(effect, caster, primaryTarget);
        break;
      case 'buff':
        this.queueBuffCommand(effect, caster, primaryTarget);
        break;
      case 'summon':
        this.queueSummonCommand(effect, caster, primaryTarget);
        break;
      case 'moisture':
        this.queueMoistureCommand(effect, caster, primaryTarget);
        break;
      case 'toss':
        this.queueTossCommand(effect, caster, primaryTarget);
        break;
      case 'setOnFire':
        this.queueSetOnFireCommand(effect, caster, primaryTarget);
        break;
      case 'particles':
        // Particles are visual only, no command needed
        break;
      case 'cone':
        this.queueConeCommand(effect, caster, primaryTarget);
        break;
      case 'multiple_projectiles':
        this.queueMultipleProjectilesCommand(effect, caster, primaryTarget);
        break;
      case 'line_aoe':
        this.queueLineAoECommand(effect, caster, primaryTarget);
        break;
      case 'area_buff':
        this.queueAreaBuffCommand(effect, caster, primaryTarget);
        break;
      case 'debuff':
        this.queueDebuffCommand(effect, caster, primaryTarget);
        break;
      case 'cleanse':
        this.queueCleanseCommand(effect, caster, primaryTarget);
        break;
      case 'area_particles':
        // Visual only
        break;
      case 'reveal':
        this.queueRevealCommand(effect, caster, primaryTarget);
        break;
      case 'burrow':
        this.queueBurrowCommand(effect, caster, primaryTarget);
        break;
      case 'tame':
        this.queueTameCommand(effect, caster, primaryTarget);
        break;
      case 'calm':
        this.queueCalmCommand(effect, caster, primaryTarget);
        break;
      case 'entangle':
        this.queueEntangleCommand(effect, caster, primaryTarget);
        break;
      default:
        console.warn(`JSON Abilities: Unknown effect type ${effect.type}`);
    }
  }

  private resolveTarget(targetExpression: string | undefined, caster: any, primaryTarget: any): any {
    if (!targetExpression) return primaryTarget;
    if (targetExpression === 'self') return caster;
    if (targetExpression === 'target') return primaryTarget;
    if (targetExpression === 'self.pos') return caster.pos;
    if (targetExpression === 'target.pos') return primaryTarget.pos || primaryTarget;
    
    try {
      return DSL.evaluate(targetExpression, caster, this.sim);
    } catch (error) {
      console.warn(`Failed to resolve target '${targetExpression}':`, error);
      return null;
    }
  }

  private resolveValue(value: any, caster: any, target: any): any {
    if (typeof value !== 'object') return value;
    
    if (value.$random) {
      // Check if it's an array (random selection) or number range
      if (Array.isArray(value.$random)) {
        // Random selection from array
        return value.$random[Math.floor(Math.random() * value.$random.length)];
      } else if (value.$random.length === 2 && typeof value.$random[0] === 'number') {
        // Random number range
        const [min, max] = value.$random;
        return Math.floor(min + Math.random() * (max - min + 1));
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

  private queueDamageCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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

  private queueHealCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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

  private queueAoECommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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
        type: aspect
      },
      unitId: caster.id
    });
  }

  private queueProjectileCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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
      team: caster.team
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

  private queueWeatherCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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

  private queueLightningCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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

  private queueJumpCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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

  private queueHeatCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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

  private queueDeployCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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
    
    console.log(`${caster.id} used deployBot ${caster.meta.deployBotUses}/5 times`);
  }

  private queueGrappleCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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

  private queuePinCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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

  private queueAirdropCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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

  private queueBuffCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    // Buff effects might need special handling for area buffs
    // For now, just log it
    console.log(`${caster.id} uses buff ability - not fully implemented yet`);
  }

  private queueSummonCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const unitType = this.resolveValue(effect.unit, caster, primaryTarget) || 'squirrel';
    const pos = caster.pos;

    // Spawn the unit directly with metadata
    const Encyclopaedia = require('../dmg/encyclopaedia').default;
    const summonedUnit = {
      ...Encyclopaedia.unit(unitType),
      id: `${unitType}_${caster.id}_${this.sim.ticks}`,
      pos: { 
        x: pos.x + (Math.random() - 0.5) * 2, 
        y: pos.y + (Math.random() - 0.5) * 2 
      },
      team: caster.team,
      meta: {
        summoned: true,
        summonedBy: caster.id,
        summonTick: this.sim.ticks
      }
    };
    
    this.sim.addUnit(summonedUnit);
    console.log(`${caster.id} summoned ${unitType} at (${summonedUnit.pos.x.toFixed(1)}, ${summonedUnit.pos.y.toFixed(1)})`);
  }

  private queueMoistureCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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

  private queueTossCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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

  private queueSetOnFireCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;

    // Set the unit on fire
    if (!target.meta) target.meta = {};
    target.meta.onFire = true;
    target.meta.onFireDuration = 30;
  }
  
  private queueEntangleCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target) return;
    
    const duration = this.resolveValue(effect.duration, caster, target) || 30;
    const radius = this.resolveValue(effect.radius, caster, target) || 3;
    
    // Apply entangle/pin effect to target
    if (target.id) {
      if (!target.meta) target.meta = {};
      target.meta.pinned = true;
      target.meta.pinDuration = duration;
      target.meta.entangled = true;
      
      // Create visual particles for entangle effect
      const particles = [];
      for (let i = 0; i < 8; i++) {
        particles.push({
          id: `entangle_${caster.id}_${this.sim.ticks}_${i}`,
          pos: { 
            x: target.pos.x + (Math.random() - 0.5) * radius, 
            y: target.pos.y + (Math.random() - 0.5) * radius 
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

  private queueConeCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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
          return dist <= range;
        });

        for (const unit of unitsInCone) {
          this.processEffectAsCommand(nestedEffect, caster, unit);
        }
      }
    }
  }

  private queueMultipleProjectilesCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const count = effect.count || 1;
    for (let i = 0; i < count; i++) {
      // Create projectile with slight variation
      const projectileEffect = { ...effect, type: 'projectile' };
      this.queueProjectileCommand(projectileEffect, caster, primaryTarget);
    }
  }

  private queueLineAoECommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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

  private queueAreaBuffCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'self.pos', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const radius = effect.radius || 3;

    // Apply buff to all units in area
    const unitsInArea = this.sim.getRealUnits().filter(u => {
      const dist = Math.sqrt(Math.pow(u.pos.x - pos.x, 2) + Math.pow(u.pos.y - pos.y, 2));
      return dist <= radius;
    });

    for (const unit of unitsInArea) {
      // Apply buff
      if (effect.buff) {
        if (!unit.meta) unit.meta = {};
        Object.assign(unit.meta, effect.buff);
      }
    }
  }

  private queueDebuffCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;

    // Apply debuff
    if (effect.debuff) {
      if (!target.meta) target.meta = {};
      Object.assign(target.meta, effect.debuff);
    }
  }

  private queueCleanseCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;

    // Remove specified effects
    if (effect.effects && target.meta) {
      for (const effectName of effect.effects) {
        delete target.meta[effectName];
      }
    }
  }

  private queueRevealCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'self.pos', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const radius = effect.radius || 6;

    // Reveal hidden/invisible units in radius
    const unitsInArea = this.sim.getRealUnits().filter(u => {
      const dist = Math.sqrt(Math.pow(u.pos.x - pos.x, 2) + Math.pow(u.pos.y - pos.y, 2));
      return dist <= radius;
    });

    for (const unit of unitsInArea) {
      if (unit.meta?.hidden || unit.meta?.invisible) {
        unit.meta.hidden = false;
        unit.meta.invisible = false;
        unit.meta.revealed = true;
      }
    }
  }

  private queueBurrowCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
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

  private queueTameCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'target', caster, primaryTarget);
    if (!target || !target.id) return;

    // Find the actual unit in the sim
    const actualTarget = this.sim.units.find(u => u.id === target.id);
    if (!actualTarget) return;

    // Check if this is tameMegabeast ability which requires mass >= 10
    if (caster.abilities?.tameMegabeast && actualTarget.mass < 10) {
      console.log(`${caster.id} cannot tame ${actualTarget.id} - target mass ${actualTarget.mass} is too low (requires >= 10)`);
      return;
    }

    // Track original team and taming info
    if (!actualTarget.meta) actualTarget.meta = {};
    if (!actualTarget.meta.originalTeam) {
      actualTarget.meta.originalTeam = actualTarget.team;
    }
    actualTarget.meta.tamed = true;
    actualTarget.meta.tamedBy = caster.id;
    
    // Change target's team to caster's team  
    actualTarget.team = caster.team;
    console.log(`${caster.id} tamed ${actualTarget.id}!`);
    
    // Add taming particles
    for (let i = 0; i < 5; i++) {
      this.sim.particles.push({
        id: `tame_${caster.id}_${this.sim.ticks}_${i}`,
        pos: { 
          x: actualTarget.pos.x + (Math.random() - 0.5) * 2, 
          y: actualTarget.pos.y + (Math.random() - 0.5) * 2 
        },
        vel: { x: 0, y: -0.1 },
        ttl: 20,
        color: '#90EE90', // Light green
        type: 'tame',
        size: 0.3
      });
    }
  }

  private queueCalmCommand(effect: AbilityEffect, caster: any, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target || 'self.pos', caster, primaryTarget);
    if (!target) return;

    const pos = target.pos || target;
    const radius = effect.radius || 5;

    // Calm all beasts/animals in radius - check for animal tag or beast-like sprites
    const beastSprites = ['bear', 'owl', 'wolf', 'fox', 'deer', 'rabbit', 'squirrel', 'bird'];
    const unitsInArea = this.sim.getRealUnits().filter(u => {
      const dist = Math.sqrt(Math.pow(u.pos.x - pos.x, 2) + Math.pow(u.pos.y - pos.y, 2));
      return dist <= radius && (u.tags?.includes('animal') || u.tags?.includes('beast') || beastSprites.includes(u.sprite));
    });

    for (const unit of unitsInArea) {
      if (!unit.meta) unit.meta = {};
      unit.meta.calmed = true;
      unit.meta.aggressive = false;
      unit.intendedMove = { x: 0, y: 0 }; // Stop movement
      console.log(`${unit.id} has been calmed`);
      
      // Add calm particles
      this.sim.particles.push({
        id: `calm_${unit.id}_${this.sim.ticks}`,
        pos: { x: unit.pos.x, y: unit.pos.y - 0.5 },
        vel: { x: 0, y: -0.05 },
        ttl: 30,
        color: '#ADD8E6', // Light blue
        type: 'calm',
        size: 0.4
      });
    }
  }
}