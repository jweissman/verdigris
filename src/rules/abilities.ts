import DSL from './dsl';
import { Rule } from './rule';

export class Abilities extends Rule {
  apply = (): void => {
    this.sim.units = this.sim.units.map(unit => {
      for (const abilityName in unit.abilities) {
        const ability = unit.abilities[abilityName];
        let lastTick = unit.lastAbilityTick ? unit.lastAbilityTick[abilityName] : undefined;
        let currentTick = this.sim.ticks;
        let ready = !lastTick || (currentTick - lastTick >= ability.cooldown);
        if (!ready) {
          break; // Skip to next ability if cooldown is not met
        }

        let shouldTrigger = true; // Default to true, will be evaluated by DSL if needed
        let triggerCondition = ability.trigger;
        if (typeof triggerCondition === 'string') {
          // Evaluate the trigger condition using DSL
          try {
            shouldTrigger = DSL.evaluate(triggerCondition, unit, this.sim);
          } catch (error) {
            console.error('Error evaluating ability trigger:', error);
            shouldTrigger = false; // Skip this ability if evaluation fails
          }
        }

        if (!shouldTrigger) {
          break; // Skip to next ability if cooldown is not met
        }

        let target = unit; // Default to self-targeting
        if (ability.target && ability.target !== 'self') {
          // we need to eval the target expression using a dsl
          // console.log(`Evaluating ability target for ${abilityName}:`, ability.target);
          try {
            target = DSL.evaluate(ability.target, unit, this.sim);
          } catch (error) {
            console.error('Error evaluating ability target:', error);
            return unit; // Skip this ability if evaluation fails
          }

          if (target === null || target === undefined) {
            return unit; // Skip this ability if target is invalid
          }

          console.log(`${unit.id} - ability ${abilityName} targets:`, target);
        }


        // if (shouldTrigger) {
        // console.log(`[Abilities] Triggering ${abilityName} for ${unit.id} at tick ${this.sim.ticks}`);
        // console.log(`Triggering ability ${abilityName} for unit ${unit.id}`);
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
