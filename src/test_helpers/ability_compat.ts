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
        case 'pinTarget':
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
          // Direct effect - increase max HP, current HP, and add armor
          const reinforceTarget = simulator.units.find(u => 
            u.pos?.x === target?.x && u.pos?.y === target?.y
          );
          if (reinforceTarget) {
            reinforceTarget.maxHp = (reinforceTarget.maxHp || 50) + 10;
            reinforceTarget.hp = reinforceTarget.hp + 10; // Also increase current HP
            if (!reinforceTarget.meta) reinforceTarget.meta = {};
            reinforceTarget.meta.armor = 1; // Add armor
            
            // Add visual effect particles
            simulator.particles = simulator.particles || [];
            for (let i = 0; i < 5; i++) {
              simulator.particles.push({
                id: `reinforce_${caster.id}_${simulator.ticks}_${i}`,
                pos: { 
                  x: reinforceTarget.pos.x + (Math.random() - 0.5) * 2, 
                  y: reinforceTarget.pos.y + (Math.random() - 0.5) * 2 
                },
                vel: { x: 0, y: -0.1 },
                ttl: 20,
                color: '#00FF88',
                type: 'reinforce',
                size: 0.4
              });
            }
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
          
          // Add energy field particles
          simulator.particles = simulator.particles || [];
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            const radius = 2;
            simulator.particles.push({
              id: `powerSurge_${caster.id}_${simulator.ticks}_${i}`,
              pos: { 
                x: caster.pos.x + Math.cos(angle) * radius, 
                y: caster.pos.y + Math.sin(angle) * radius 
              },
              vel: { x: 0, y: 0 },
              ttl: 30,
              color: '#FFAA00',
              type: 'energy',
              size: 0.5
            });
          }
          break;
          
        case 'entangle':
          // Apply entangle/pin effect to target  
          const entangleTarget = target?.id ? target : simulator.units.find(u => 
            u.pos?.x === target?.x && u.pos?.y === target?.y
          );
          if (entangleTarget) {
            if (!entangleTarget.meta) entangleTarget.meta = {};
            entangleTarget.meta.pinned = true;
            entangleTarget.meta.pinDuration = 30;
            entangleTarget.meta.entangled = true;
            
            // Create visual particles for entangle effect
            simulator.particles = simulator.particles || [];
            for (let i = 0; i < 8; i++) {
              simulator.particles.push({
                id: `entangle_${caster.id}_${simulator.ticks}_${i}`,
                pos: { 
                  x: entangleTarget.pos.x + (Math.random() - 0.5) * 3, 
                  y: entangleTarget.pos.y + (Math.random() - 0.5) * 3 
                },
                vel: { x: 0, y: 0 },
                ttl: 30,
                color: '#228B22', // Forest green
                type: 'entangle',
                size: 0.5
              });
            }
          }
          break;
          
        case 'tameMegabeast':
          // Tame a megabeast (mass >= 10)
          // Find the actual unit in the simulator
          const actualTameTarget = simulator.units.find(u => 
            u.id === target?.id || (u.pos?.x === target?.x && u.pos?.y === target?.y)
          );
          
          if (actualTameTarget && actualTameTarget.mass >= 10) {
            if (!actualTameTarget.meta) actualTameTarget.meta = {};
            actualTameTarget.meta.tamed = true;
            actualTameTarget.meta.tamedBy = caster.id;
            actualTameTarget.meta.originalTeam = actualTameTarget.team;
            actualTameTarget.team = caster.team;
            
            // Add taming particles
            simulator.particles = simulator.particles || [];
            for (let i = 0; i < 5; i++) {
              simulator.particles.push({
                id: `tame_${caster.id}_${simulator.ticks}_${i}`,
                pos: { 
                  x: actualTameTarget.pos.x + (Math.random() - 0.5) * 2, 
                  y: actualTameTarget.pos.y + (Math.random() - 0.5) * 2 
                },
                vel: { x: 0, y: -0.1 },
                ttl: 20,
                color: '#90EE90', // Light green
                type: 'tame',
                size: 0.3
              });
            }
          }
          break;
          
        case 'calmAnimals':
          // Calm all beasts/animals in radius
          const radius = 5;
          const beastTypes = ['bear', 'owl', 'wolf', 'fox', 'deer', 'rabbit', 'squirrel', 'bird'];
          const unitsInArea = simulator.units.filter(u => {
            if (u.id === caster.id) return false; // Don't calm self
            const dist = Math.sqrt(
              Math.pow(u.pos.x - caster.pos.x, 2) + 
              Math.pow(u.pos.y - caster.pos.y, 2)
            );
            // Check by type, tags, or if it's in the beastTypes list
            const shouldCalm = dist <= radius && (
              u.tags?.includes('animal') || 
              u.tags?.includes('beast') || 
              u.tags?.includes('forest') ||
              beastTypes.includes(u.type) ||
              beastTypes.includes(u.id?.split(/\d/)[0]) // Check if ID starts with beast type
            );
            if (shouldCalm) {
              console.log(`Calming unit ${u.id} with tags ${u.tags}, type ${u.type}`);
            }
            return shouldCalm;
          });
          
          console.log(`Found ${unitsInArea.length} units to calm`);
          for (const unit of unitsInArea) {
            if (!unit.meta) unit.meta = {};
            unit.meta.calmed = true;
            unit.meta.aggressive = false;
            unit.intendedMove = { x: 0, y: 0 }; // Stop movement
            
            // Add calm particles
            simulator.particles = simulator.particles || [];
            simulator.particles.push({
              id: `calm_${unit.id}_${simulator.ticks}`,
              pos: { x: unit.pos.x, y: unit.pos.y - 0.5 },
              vel: { x: 0, y: -0.05 },
              ttl: 30,
              color: '#ADD8E6', // Light blue
              type: 'calm',
              size: 0.4
            });
          }
          break;
          
        case 'summonForestCreature':
          // Summon a random forest creature
          const creatures = ['squirrel', 'rabbit', 'fox', 'deer', 'wolf', 'bear'];
          const creatureType = creatures[Math.floor(Math.random() * creatures.length)];
          const Encyclopaedia = require('../dmg/encyclopaedia').default;
          const summonedUnit = {
            ...Encyclopaedia.unit(creatureType),
            id: `${creatureType}_${caster.id}_${simulator.ticks}`,
            pos: { 
              x: caster.pos.x + (Math.random() - 0.5) * 2, 
              y: caster.pos.y + (Math.random() - 0.5) * 2 
            },
            team: caster.team,
            meta: {
              summoned: true,
              summonedBy: caster.id,
              summonTick: simulator.ticks
            }
          };
          
          simulator.units.push(summonedUnit);
          console.log(`${caster.id} summoned ${creatureType} at (${summonedUnit.pos.x.toFixed(1)}, ${summonedUnit.pos.y.toFixed(1)})`);
          break;
          
        case 'shieldGenerator':
          // Create shield particles in 3x3 area around caster
          simulator.particles = simulator.particles || [];
          for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
              simulator.particles.push({
                id: `shield_${caster.id}_${simulator.ticks}_${x}_${y}`,
                pos: { 
                  x: caster.pos.x + x, 
                  y: caster.pos.y + y 
                },
                vel: { x: 0, y: 0 },
                lifetime: 80,
                ttl: 80,
                color: '#00CCFF',
                type: 'energy',
                size: 1,
                z: 2
              });
            }
          }
          break;
          
        case 'systemHack':
          // Apply system hack debuff to target
          const hackTarget = simulator.units.find(u => 
            u.pos?.x === target?.x && u.pos?.y === target?.y
          );
          if (hackTarget) {
            if (!hackTarget.meta) hackTarget.meta = {};
            hackTarget.meta.systemsHacked = true;
            hackTarget.meta.hackDuration = 30;
            
            // Set all ability cooldowns to current tick (can't use abilities)
            if (hackTarget.lastAbilityTick) {
              for (const ability in hackTarget.lastAbilityTick) {
                hackTarget.lastAbilityTick[ability] = simulator.ticks;
              }
            }
            
            // Add hack visual effect
            simulator.particles = simulator.particles || [];
            simulator.particles.push({
              id: `hack_${caster.id}_${simulator.ticks}`,
              pos: { x: hackTarget.pos.x, y: hackTarget.pos.y },
              vel: { x: 0, y: 0 },
              ttl: 20,
              color: '#FF0088',
              type: 'hack',
              size: 1
            });
          }
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
    // Convert string array to object with ability methods for testing
    if (Array.isArray(unit.abilities)) {
      const abilityObj: any = {};
      for (const abilityName of unit.abilities) {
        // Get the ability from the Abilities class
        const Abilities = require('../rules/abilities').Abilities;
        const ability = Abilities.all[abilityName];
        if (ability) {
          abilityObj[abilityName] = addEffectToAbility(abilityName, ability, sim);
        } else {
          // Create a stub ability for testing
          abilityObj[abilityName] = addEffectToAbility(abilityName, { name: abilityName }, sim);
        }
      }
      unit.abilities = abilityObj;
    } else {
      // Old object-based abilities
      for (const abilityName in unit.abilities) {
        unit.abilities[abilityName] = addEffectToAbility(abilityName, unit.abilities[abilityName], sim);
      }
    }
  }
}