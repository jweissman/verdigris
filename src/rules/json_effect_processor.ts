/**
 * Processes individual effects from JSON ability definitions
 * Handles the conversion from declarative JSON to simulation events
 */
import { Unit, Vec2 } from '../sim/types';
import { Simulator } from '../simulator';
import DSL from './dsl';
import { JsonAbilityEffect } from './json_abilities_loader';

export class JsonEffectProcessor {
  constructor(private sim: Simulator) {}

  processEffect(effect: JsonAbilityEffect, caster: Unit, primaryTarget: any): void {
    switch (effect.type) {
      case 'damage':
        this.processDamage(effect, caster, primaryTarget);
        break;
      case 'heal':
        this.processHeal(effect, caster, primaryTarget);
        break;
      case 'aoe':
        this.processAoE(effect, caster, primaryTarget);
        break;
      case 'projectile':
        this.processProjectile(effect, caster, primaryTarget);
        break;
      case 'summon':
        this.processSummon(effect, caster, primaryTarget);
        break;
      case 'jump':
        this.processJump(effect, caster, primaryTarget);
        break;
      case 'heat':
        this.processHeat(effect, caster, primaryTarget);
        break;
      case 'moisture':
        this.processMoisture(effect, caster, primaryTarget);
        break;
      case 'weather':
        this.processWeather(effect, caster, primaryTarget);
        break;
      case 'setOnFire':
        this.processSetOnFire(effect, caster, primaryTarget);
        break;
      case 'particles':
        this.processParticles(effect, caster, primaryTarget);
        break;
      case 'cone':
        this.processCone(effect, caster, primaryTarget);
        break;
      default:
        console.warn(`Unknown effect type: ${effect.type}`);
    }
  }

  private resolveTarget(targetExpression: string | undefined, caster: Unit, primaryTarget: any): any {
    if (!targetExpression) return primaryTarget;
    if (targetExpression === 'self') return caster;
    if (targetExpression === 'target') return primaryTarget;
    
    // Handle special target expressions
    if (targetExpression === 'target.pos' && primaryTarget) {
      return primaryTarget.pos || primaryTarget;
    }
    if (targetExpression === 'self.pos') {
      return caster.pos;
    }
    if (targetExpression === 'wounded_allies_center') {
      return this.findWoundedAlliesCenter(caster);
    }
    
    // Use DSL for complex expressions
    try {
      return DSL.evaluate(targetExpression, caster, this.sim);
    } catch (error) {
      console.warn(`Failed to resolve target '${targetExpression}':`, error);
      return null;
    }
  }

  private resolveValue(value: any, caster: Unit, target: any): any {
    if (typeof value !== 'object') return value;
    
    if (value.$random) {
      const [min, max] = value.$random;
      return min + Math.random() * (max - min);
    }
    
    if (value.$conditional) {
      const condition = value.$conditional;
      try {
        const conditionMet = DSL.evaluate(condition.if, caster, this.sim);
        return conditionMet ? condition.then : condition.else;
      } catch (error) {
        console.warn(`Failed to evaluate conditional:`, error);
        return condition.else;
      }
    }
    
    if (value.$calculate) {
      // This would need more sophisticated implementation
      console.warn(`$calculate not yet implemented: ${value.$calculate}`);
      return 0;
    }
    
    return value;
  }

  private processDamage(effect: JsonAbilityEffect, caster: Unit, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target, caster, primaryTarget);
    if (!target || typeof target !== 'object' || !('id' in target)) return;

    const amount = this.resolveValue(effect.amount, caster, target);
    const origin = this.resolveTarget(effect.origin || 'self.pos', caster, primaryTarget);

    this.sim.queuedEvents.push({
      kind: 'damage',
      source: caster.id,
      target: target.id,
      meta: {
        aspect: effect.aspect || 'physical',
        amount: amount,
        origin: origin
      }
    });
  }

  private processHeal(effect: JsonAbilityEffect, caster: Unit, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target, caster, primaryTarget);
    if (!target || typeof target !== 'object' || !('id' in target)) return;

    const amount = this.resolveValue(effect.amount, caster, target);

    this.sim.queuedEvents.push({
      kind: 'heal',
      source: caster.id,
      target: target.id,
      meta: {
        aspect: effect.aspect || 'healing',
        amount: amount
      }
    });
  }

  private processAoE(effect: JsonAbilityEffect, caster: Unit, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target, caster, primaryTarget);
    if (!target) return;

    const amount = this.resolveValue(effect.amount, caster, target);
    const radius = this.resolveValue(effect.radius, caster, target);
    const origin = this.resolveTarget(effect.origin || 'target', caster, target);

    this.sim.queuedEvents.push({
      kind: 'aoe',
      source: caster.id,
      target: target,
      meta: {
        aspect: effect.aspect || 'physical',
        amount: amount,
        radius: radius,
        origin: origin,
        ...effect.meta
      }
    });
  }

  private processProjectile(effect: JsonAbilityEffect, caster: Unit, primaryTarget: any): void {
    const pos = this.resolveTarget(effect.pos || 'self.pos', caster, primaryTarget);
    if (!pos) return;

    const projectile: any = {
      id: effect.id || `projectile_${caster.id}_${Date.now()}`,
      pos: pos,
      vel: effect.vel || { x: 0, y: 0 },
      radius: effect.radius || 1,
      damage: effect.damage || 0,
      team: caster.team,
      type: effect.projectileType || 'bullet',
      progress: effect.progress || 0,
      duration: effect.duration || 10,
      z: effect.z || 0
    };

    if (effect.target) {
      projectile.target = this.resolveTarget(effect.target, caster, primaryTarget);
      projectile.origin = this.resolveTarget(effect.origin || 'self.pos', caster, primaryTarget);
    }

    if (effect.aoeRadius) {
      projectile.aoeRadius = effect.aoeRadius;
    }

    this.sim.projectiles.push(projectile);
  }

  private processSummon(effect: JsonAbilityEffect, caster: Unit, primaryTarget: any): void {
    // This would need access to unit creation logic
    console.log(`${caster.id} wants to summon ${effect.meta?.unit || 'unknown'}`);
    // Implementation would depend on how units are created in the simulation
  }

  private processJump(effect: JsonAbilityEffect, caster: Unit, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target, caster, primaryTarget);
    if (!target) return;

    // Set jump metadata on the caster
    caster.meta = caster.meta || {};
    Object.assign(caster.meta, {
      jumping: true,
      jumpProgress: 0,
      jumpOrigin: { ...caster.pos },
      jumpTarget: target
    });
  }

  private processHeat(effect: JsonAbilityEffect, caster: Unit, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target, caster, primaryTarget);
    if (!target || !this.sim.addHeat) return;

    const amount = this.resolveValue(effect.amount, caster, target);
    const radius = this.resolveValue(effect.radius, caster, target);

    this.sim.addHeat(target.x, target.y, amount, radius);
  }

  private processMoisture(effect: JsonAbilityEffect, caster: Unit, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target, caster, primaryTarget);
    if (!target || !this.sim.addMoisture) return;

    const amount = this.resolveValue(effect.amount, caster, target);
    const radius = this.resolveValue(effect.radius, caster, target);

    this.sim.addMoisture(target.x, target.y, amount, radius);
  }

  private processWeather(effect: JsonAbilityEffect, caster: Unit, primaryTarget: any): void {
    if (!this.sim.queuedCommands) {
      this.sim.queuedCommands = [];
    }

    this.sim.queuedCommands.push({
      type: 'weather',
      args: [
        effect.weatherType || 'rain',
        (effect.duration || 60).toString(),
        (effect.intensity || 0.5).toString()
      ],
      unitId: caster.id
    });
  }

  private processSetOnFire(effect: JsonAbilityEffect, caster: Unit, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target, caster, primaryTarget);
    if (!target || typeof target !== 'object' || !('id' in target)) return;

    if (this.sim.setUnitOnFire) {
      this.sim.setUnitOnFire(target);
    } else {
      // Fallback: set metadata
      target.meta = target.meta || {};
      target.meta.onFire = true;
      target.meta.fireTicks = 40; // 5 seconds
    }
  }

  private processParticles(effect: JsonAbilityEffect, caster: Unit, primaryTarget: any): void {
    const target = this.resolveTarget(effect.target, caster, primaryTarget);
    if (!target || !this.sim.particles) return;

    const count = effect.count || 1;
    const spread = effect.spread || 1;

    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * spread;
      const offsetY = (Math.random() - 0.5) * spread;
      
      this.sim.particles.push({
        pos: { x: (target.x + offsetX) * 8, y: (target.y + offsetY) * 8 },
        vel: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
        radius: 1,
        color: this.getParticleColor(effect.particleType || 'generic'),
        lifetime: 30,
        type: effect.particleType || 'generic'
      });
    }
  }

  private processCone(effect: JsonAbilityEffect, caster: Unit, primaryTarget: any): void {
    // This would implement cone-shaped area effects
    console.log(`${caster.id} uses cone effect - not yet fully implemented`);
    
    // For now, just process the nested effects in a line
    if (effect.effects) {
      for (const nestedEffect of effect.effects) {
        this.processEffect(nestedEffect, caster, primaryTarget);
      }
    }
  }

  private findWoundedAlliesCenter(caster: Unit): Vec2 | null {
    const woundedAllies = this.sim.getRealUnits().filter(u => 
      u.team === caster.team && 
      u.hp < u.maxHp && 
      u.id !== caster.id &&
      this.distance(u.pos, caster.pos) <= 8
    );

    if (woundedAllies.length === 0) return null;

    const centerX = woundedAllies.reduce((sum, u) => sum + u.pos.x, 0) / woundedAllies.length;
    const centerY = woundedAllies.reduce((sum, u) => sum + u.pos.y, 0) / woundedAllies.length;

    return { x: Math.round(centerX), y: Math.round(centerY) };
  }

  private distance(a: Vec2, b: Vec2): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }

  private getParticleColor(type: string): string {
    switch (type) {
      case 'fire': return '#FF4400';
      case 'lightning': return '#FFFF00';
      case 'ice': return '#00CCFF';
      case 'healing': return '#00FF00';
      default: return '#FFFFFF';
    }
  }
}