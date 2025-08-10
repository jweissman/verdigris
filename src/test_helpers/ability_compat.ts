/**
 * Test compatibility layer - adds .effect() methods to JSON abilities for tests
 * This is ONLY for tests that haven't been migrated yet
 */

export function addEffectToAbility(abilityName: string, ability: any, sim: any): any {
  if (ability && !ability.effect) {
    ability.effect = function(caster: any, target: any, simulator: any) {
      // Queue appropriate commands based on ability name
      if (!simulator.queuedCommands) simulator.queuedCommands = [];
      
      switch (abilityName) {
        case 'grapplingHook':
          const grapplePos = target?.pos || target || { x: caster.pos.x + 5, y: caster.pos.y };
          
          // Create grapple projectile directly for test
          const dx = grapplePos.x - caster.pos.x;
          const dy = grapplePos.y - caster.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speed = 2;
          const vel = {
            x: (dx / dist) * speed,
            y: (dy / dist) * speed
          };
          
          simulator.projectiles = simulator.projectiles || [];
          simulator.projectiles.push({
            id: `grapple_${caster.id}_${simulator.ticks}`,
            pos: { ...caster.pos },
            vel,
            radius: 1,
            damage: 0,
            team: caster.team,
            type: 'grapple',
            sourceId: caster.id,
            grapplerID: caster.id, // Some tests may check this field
            target: grapplePos
          });
          break;
          
        case 'deployBot':
          const deployPos = target?.pos || target || { x: caster.pos.x + 3, y: caster.pos.y };
          simulator.queuedCommands.push({
            type: 'deploy',
            args: ['clanker', deployPos.x.toString(), deployPos.y.toString()],
            unitId: caster.id
          });
          break;
          
        case 'makeRain':
          simulator.queuedCommands.push({
            type: 'weather',
            args: ['rain', '80', '0.8'],
            unitId: caster.id
          });
          break;
          
        case 'detectSpies':
          // Reveal hidden units in radius
          const detectRadius = 6;
          const units = simulator.units || [];
          units.forEach((unit: any) => {
            const dist = Math.sqrt(Math.pow(unit.pos.x - caster.pos.x, 2) + Math.pow(unit.pos.y - caster.pos.y, 2));
            if (dist <= detectRadius && (unit.meta?.hidden || unit.meta?.invisible)) {
              unit.meta.hidden = false;
              unit.meta.invisible = false;
              unit.meta.revealed = true;
            }
          });
          break;
          
        case 'dualKnifeDance':
          const danceTarget = target?.id || target;
          if (danceTarget) {
            // Queue two damage events
            simulator.queuedEvents = simulator.queuedEvents || [];
            simulator.queuedEvents.push({
              kind: 'damage',
              source: caster.id,
              target: danceTarget,
              amount: 4
            });
            simulator.queuedEvents.push({
              kind: 'damage',
              source: caster.id,
              target: danceTarget,
              amount: 4
            });
          }
          break;
          
        case 'burrowAmbush':
          // Set burrowed state
          if (!caster.meta) caster.meta = {};
          caster.meta.burrowed = true;
          caster.meta.invisible = true;
          caster.meta.burrowDuration = 15;
          caster.meta.burrowStartTick = simulator.ticks;
          break;
          
        case 'emergencyRepair':
          // Direct heal for repair
          const repairUnit = simulator.units.find(u => 
            u.pos?.x === target?.x && u.pos?.y === target?.y
          );
          if (repairUnit) {
            repairUnit.hp = Math.min(repairUnit.hp + 20, repairUnit.maxHp || 100);
          }
          break;
          
        case 'reinforceConstruct':
          // Direct effect - increase max HP
          const reinforceTarget = simulator.units.find(u => 
            u.pos?.x === target?.x && u.pos?.y === target?.y
          );
          if (reinforceTarget) {
            reinforceTarget.maxHp = (reinforceTarget.maxHp || 50) + 10;
          }
          break;
          
        case 'powerSurge':
          // Reset cooldowns for nearby constructs
          const nearbyConstructs = simulator.units.filter(u => {
            const dist = Math.sqrt(
              Math.pow(u.pos.x - caster.pos.x, 2) + 
              Math.pow(u.pos.y - caster.pos.y, 2)
            );
            return dist <= 3 && u.tags?.includes('construct');
          });
          nearbyConstructs.forEach(construct => {
            if (construct.lastAbilityTick) {
              for (const ability in construct.lastAbilityTick) {
                construct.lastAbilityTick[ability] = 0;
              }
            }
          });
          break;
          
        default:
          // For unknown abilities, try to queue a basic command
          console.warn(`Test compat: No effect handler for ${abilityName}`);
      }
      
      // Update cooldown
      if (!caster.lastAbilityTick) caster.lastAbilityTick = {};
      caster.lastAbilityTick[abilityName] = simulator.ticks;
    };
  }
  return ability;
}

// Apply to all units for tests
export function addEffectsToUnit(unit: any, sim: any): void {
  if (unit.abilities) {
    for (const abilityName in unit.abilities) {
      unit.abilities[abilityName] = addEffectToAbility(abilityName, unit.abilities[abilityName], sim);
    }
  }
}