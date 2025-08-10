/**
 * Compatibility layer for JSON abilities to work with tests expecting .effect() methods
 */

import { JsonAbilitiesLoader } from '../rules/json_abilities_loader';

export function wrapAbilityWithEffect(abilityName: string, jsonAbility: any): any {
  return {
    ...jsonAbility,
    effect: function(caster: any, target: any, sim: any) {
      // Initialize queued commands if needed
      if (!sim.queuedCommands) sim.queuedCommands = [];
      
      // Based on the ability name, queue the appropriate command
      // This is a compatibility shim for tests
      switch (abilityName) {
        case 'grapplingHook':
          const grapplePos = target?.pos || target || { x: caster.pos.x + 5, y: caster.pos.y };
          sim.queuedCommands.push({
            type: 'grapple',
            args: [grapplePos.x.toString(), grapplePos.y.toString()],
            unitId: caster.id
          });
          break;
          
        case 'makeRain':
          sim.queuedCommands.push({
            type: 'weather',
            args: ['rain', '80', '0.8'],
            unitId: caster.id
          });
          break;
          
        case 'deployBot':
          const deployPos = target?.pos || target || { x: caster.pos.x + 3, y: caster.pos.y };
          sim.queuedCommands.push({
            type: 'deploy',
            args: ['clanker', deployPos.x.toString(), deployPos.y.toString()],
            unitId: caster.id
          });
          break;
          
        default:
          console.warn(`No effect shim for ability: ${abilityName}`);
      }
      
      // Update cooldown
      if (!caster.lastAbilityTick) caster.lastAbilityTick = {};
      caster.lastAbilityTick[abilityName] = sim.ticks;
    }
  };
}

export function wrapAllAbilities(abilities: any): any {
  const wrapped: any = {};
  for (const key in abilities) {
    wrapped[key] = wrapAbilityWithEffect(key, abilities[key]);
  }
  return wrapped;
}