import { Unit } from '../sim/types';
import { Simulator } from '../simulator';
import { Rule } from './rule';

class DSL {
  static evaluate(expression: string, subject: Unit, sim: Simulator): any {
    let random = {
      position: () => ({
        x: Math.round(Math.random() * sim.fieldWidth),
        y: Math.round(Math.random() * sim.fieldHeight)
      })
    };
    let ret = eval(expression);
    console.log(`Evaluating DSL expression "${expression}" for unit ${subject.id}:`, ret);
    return ret;
  }
}

export class Abilities extends Rule {
  apply = (): void => {
    this.sim.units = this.sim.units.map(unit => {
      for (const abilityName in unit.abilities) {
        const ability = unit.abilities[abilityName];
        let lastTick = unit.lastAbilityTick ? unit.lastAbilityTick[abilityName] : undefined;
        let currentTick = this.sim.ticks;
        let shouldTrigger = !lastTick || (currentTick - lastTick >= ability.cooldown);
        if (!shouldTrigger) {
          break; // Skip to next ability if cooldown is not met
        }

        let target = unit; // Default to self-targeting
        if (ability.target && ability.target !== 'self') {
          // we need to eval the target expression using a dsl
          console.log(`Evaluating ability target for ${abilityName}:`, ability.target);
          try {
            target = DSL.evaluate(ability.target, unit, this.sim);
          } catch (error) {
            console.error('Error evaluating ability target:', error);
          }

          console.log(`Ability ${abilityName} targeting:`, target);
        }

        // if (shouldTrigger) {
        console.log(`Triggering ability ${abilityName} for unit ${unit.id}`);
          ability.effect(unit, target);
          if (!unit.lastAbilityTick) {
            unit.lastAbilityTick = {};
          }
          unit.lastAbilityTick[abilityName] = this.sim.ticks;
        // }
      }
      return unit;
    });
  }
}
