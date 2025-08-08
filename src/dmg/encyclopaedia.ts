import { Ability, Unit, UnitState, Vec2 } from "../sim/types";
import { Simulator } from "../simulator";
// import abilities from "../../data/abilities.json";

export default class Encyclopaedia {
  static abilities: { [key: string]: Ability } = {
    // ...abilities,
    squirrel: {
      name: 'Summon Squirrel',
      cooldown: 10,
      effect: (unit, target, sim: Simulator) => {
        console.log(`${unit.id} summons a squirrel!`);
        // Add a squirrel unit to the simulation
        sim.queuedEvents.push({
          kind: 'spawn',
          source: unit.id,
          target: { x: 0, y: unit.pos.y },
          meta: {
            unit: { ...this.unit('squirrel'), intendedProtectee: unit.id, posture: 'guard' }
          }
        });

        // toss a 'pointless' nut projectile
        if (sim && sim.projectiles) {
          let dx = Math.random() > 0.5 ? 2 : -2;
          let dy = Math.random() > 0.5 ? 2 : -2;
          sim.projectiles.push({
            id: `nut_${unit.id}_${Date.now()}`,
            pos: { x: unit.pos.x, y: unit.pos.y },
            vel: { x: 0, y: 0 }, // Not used for nuts, just a placeholder
            radius: 2,
            damage: 0,
            team: unit.team,
            type: 'bomb',
            target: { x: unit.pos.x + dx, y: unit.pos.y + dy }, // Just a random target
            origin: { x: unit.pos.x, y: unit.pos.y },
            progress: 0,
            duration: 3,
            z: 0,
            aoeRadius: 0
          });
        }
      }
    },
    jumps: {
      name: 'Hurl Self',
      cooldown: 100,
      config: {
        height: 5, speed: 2, impact: { radius: 3, damage: 5 }, duration: 10,
      },
      target: 'closest.enemy()?.pos',
      trigger: 'distance(closest.enemy()?.pos) > 10',
      effect: (u, t: Unit | Vec2 | undefined) => {
        if (!t) {
          // console.warn(`${u.id} has no valid target to jump to`);
          return;
        }
        if (typeof t === 'object' && 'x' in t && 'y' in t) {
          // If target is a position, use it directly
          console.debug(`${u.id} jumping to target at (${t.x}, ${t.y})`);
          u.meta.jumping = true;
          u.meta.jumpProgress = 0;
          u.meta.jumpOrigin = { x: u.pos.x, y: u.pos.y };
          u.meta.jumpTarget = { x: t.x, y: t.y };
        } else {
          // If target is a unit, use its position
          console.debug(`${u.id} jumping to target unit ${t.id} at (${t.pos.x}, ${t.pos.y})`);
          u.meta.jumping = true;
          u.meta.jumpProgress = 0;
          u.meta.jumpOrigin = { x: u.pos.x, y: u.pos.y };
          u.meta.jumpTarget = { x: t.pos.x, y: t.pos.y };
        }
        // console.debug(`${u.id} jumping to target at (${t.x}, ${t.y})`);
        // u.meta.jumping = true;
        // u.meta.jumpProgress = 0;
        // u.meta.jumpOrigin = { x: u.pos.x, y: u.pos.y };
        // u.meta.jumpTarget = t;
      },
    },
    ranged: {
      name: 'Sling Shot',
      cooldown: 6,
      config: {
        range: 10, damage: 4, speed: 2
      },
      target: 'closest.enemy()',
      trigger: 'distance(closest.enemy()?.pos) <= 10 && distance(closest.enemy()?.pos) > 2',
      effect: (u, target, sim) => {
        if (!target) {
          console.warn(`${u.id} has no valid target to shoot`);
          return;
        }
        console.log(`${u.id} firing bullet at ${target.id} at (${target.pos.x}, ${target.pos.y})`);
        
        // Compute direction vector (normalized)
        const dx = target.pos.x - u.pos.x;
        const dy = target.pos.y - u.pos.y;
        const mag = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 2;
        const vel = { x: (dx / mag) * speed, y: (dy / mag) * speed };
        
        // Add bullet projectile to simulator
        if (sim && sim.projectiles) {
          sim.projectiles.push({
            id: `bullet_${u.id}_${Date.now()}`,
            pos: { x: u.pos.x, y: u.pos.y },
            vel,
            radius: 1.5,
            damage: 4,
            team: u.team,
            type: 'bullet'
          });
        }
      },
    },
    bombardier: {
      name: 'Bomb Toss',
      cooldown: 20,
      config: {
        range: 14, damage: 6, aoeRadius: 4, duration: 12
      },
      target: 'closest.enemy()?.pos',
      trigger: 'distance(closest.enemy()?.pos) <= 14 && distance(closest.enemy()?.pos) > 5',
      effect: (u, targetPos, sim) => {
        if (!targetPos) {
          console.warn(`${u.id} has no valid target to bomb`);
          return;
        }
        console.log(`${u.id} tossing bomb to (${targetPos.x}, ${targetPos.y})`);
        
        // Add bomb projectile to simulator with arc motion
        if (sim && sim.projectiles) {
          sim.projectiles.push({
            id: `bomb_${u.id}_${Date.now()}`,
            pos: { x: u.pos.x, y: u.pos.y },
            vel: { x: 0, y: 0 }, // Not used for bombs, using target instead
            radius: 2,
            damage: 6,
            team: u.team,
            type: 'bomb',
            target: { x: targetPos.x, y: targetPos.y },
            origin: { x: u.pos.x, y: u.pos.y },
            progress: 0,
            duration: 6,
            z: 0,
            aoeRadius: 3
          });
        }
      },
    },
    heal: {
      name: 'Sacred Circle',
      cooldown: 40,
      config: {
        range: 8, healAmount: 8, aoeRadius: 3
      },
      target: 'weakest.ally()',
      effect: (u, targetPos, sim) => {
        // Find the best healing position (center of wounded allies)
        const woundedAllies = sim.getRealUnits().filter(unit => 
          unit.team === u.team && 
          unit.hp < unit.maxHp && 
          unit.id !== u.id &&
          Math.sqrt(Math.pow(unit.pos.x - u.pos.x, 2) + Math.pow(unit.pos.y - u.pos.y, 2)) <= 8
        );
        
        if (woundedAllies.length === 0) {
          console.warn(`${u.id} has no wounded allies to heal`);
          return;
        }
        
        // Use the first wounded ally's position as target
        const healTarget = woundedAllies[0].pos;
        console.log(`${u.id} casting healing circle at (${healTarget.x}, ${healTarget.y})`);
        
        // Create healing AoE event
        if (sim && sim.queuedEvents) {
          sim.queuedEvents.push({
            kind: 'aoe',
            source: u.id,
            target: healTarget,
            meta: {
              aspect: 'heal',
              amount: 18,
              radius: 3,
              origin: healTarget
            }
          });
        }
      },
    },

    radiant: {
      name: 'Radiant Strike',
      cooldown: 30, // 3.75 seconds at 8fps
      config: {
        range: 2, damage: 8, bonusDamage: 20
      },
      target: 'closest.enemy()',
      trigger: 'distance(closest.enemy()?.pos) <= 2',
      effect: (u, targetPos, sim) => {
        const enemies = sim.getRealUnits().filter(unit => 
          unit.team !== u.team && 
          Math.abs(unit.pos.x - u.pos.x) <= 2 && 
          Math.abs(unit.pos.y - u.pos.y) <= 2
        );
        
        if (enemies.length > 0) {
          const target = enemies[0];
          let damage = 8; // Base radiant damage
          
          // Extra damage to undead and spectral units
          if (target.tags?.includes('undead') || target.tags?.includes('spectral')) {
            damage = 20; // Radiant energy is very effective
            console.log(`${u.id} deals radiant damage to ${target.id} (extra effective vs undead/spectral)!`);
          } else {
            console.log(`${u.id} deals radiant damage to ${target.id}!`);
          }
          
          // Queue damage event
          sim.queuedEvents.push({
            kind: 'damage',
            source: u.id,
            target: target.id,
            meta: {
              aspect: 'radiant',
              amount: damage,
              origin: u.pos
            }
          });
          
          // Add light effect to temperature field
          if (sim.addHeat) {
            sim.addHeat(target.pos.x, target.pos.y, 5, 1);
          }
        }
      },
    },

    fireBlast: {
      name: 'Fire Blast',
      cooldown: 40, // 5 seconds at 8fps
      config: {
        range: 3, damage: 12, radius: 2
      },
      target: 'closest.enemy()',
      trigger: 'distance(closest.enemy()?.pos) <= 3',
      effect: (u, targetPos, sim) => {
        const enemies = sim.getRealUnits().filter(unit => 
          unit.team !== u.team && 
          Math.abs(unit.pos.x - u.pos.x) <= 3 && 
          Math.abs(unit.pos.y - u.pos.y) <= 3
        );
        
        if (enemies.length > 0) {
          const target = enemies[0];
          console.log(`${u.id} blasts ${target.id} with fire!`);
          
          // Queue fire damage
          sim.queuedEvents.push({
            kind: 'damage',
            source: u.id,
            target: target.id,
            meta: {
              aspect: 'heat',
              amount: 12,
              origin: u.pos
            }
          });
          
          // Add heat to temperature field and set target on fire
          if (sim.addHeat) {
            sim.addHeat(target.pos.x, target.pos.y, 20, 2);
            sim.setUnitOnFire(target);
          }
          
          // Spawn fire particles
          for (let i = 0; i < 5; i++) {
            const offsetX = (Math.random() - 0.5) * 3;
            const offsetY = (Math.random() - 0.5) * 3;
            sim.spawnFireParticle(target.pos.x + offsetX, target.pos.y + offsetY);
          }
        }
      },
    },
    makeRain: {
      name: 'Make Rain',
      // target: 'self',
      cooldown: 2, // 25 seconds at 8fps
      config: {
        duration: 80, // 10 seconds of rain at 8fps
        intensity: 0.8,
        radius: 5
      },
      effect: (unit, target, sim) => {
        console.log(`${unit.id} is making it rain!`);
        
        // Use the command system for weather changes
        if (!sim.queuedCommands) {
          sim.queuedCommands = [];
        }
        
        sim.queuedCommands.push({
          type: 'weather',
          args: ['rain', '80', '0.8'],
          unitId: unit.id
        });
        
        // Add moisture and coolness around the rainmaker
        if (sim.addMoisture && sim.addHeat) {
          sim.addMoisture(unit.pos.x, unit.pos.y, 1.0, 5);
          sim.addHeat(unit.pos.x, unit.pos.y, -10, 5); // Cool the area
        }
      }
    },
    breatheFire: {
      name: 'Breathe Fire',
      cooldown: 60, // 7.5 seconds at 8fps
      config: {
        range: 4,
        coneAngle: Math.PI / 3, // 60 degree cone
        fireIntensity: 15,
        sparkCount: 8
      },
      effect: (unit, target, sim) => {
        if (sim && sim.addHeat) {
          console.log(`${unit.id} is breathing fire!`);
          
          // Add heat in a cone in front of the unit
          const facing = unit.meta.facing || 'right';
          const dirX = facing === 'right' ? 1 : -1;
          
          // Create fire in cone pattern
          for (let i = 1; i <= 4; i++) {
            for (let j = -1; j <= 1; j++) {
              const targetX = unit.pos.x + (dirX * i);
              const targetY = unit.pos.y + j;
              
              if (sim.addHeat) {
                sim.addHeat(targetX, targetY, 20, 2);
              }
              
              // Spawn fire particles
              sim.spawnFireParticle(targetX, targetY);
              
              // Set units on fire in the cone
              const unitsInRange = sim.getRealUnits().filter(u => 
                u.team !== unit.team &&
                Math.abs(u.pos.x - targetX) < 1 &&
                Math.abs(u.pos.y - targetY) < 1
              );
              
              unitsInRange.forEach(u => {
                if (sim.setUnitOnFire) {
                  sim.setUnitOnFire(u);
                }
                
                // Queue fire damage
                sim.queuedEvents.push({
                  kind: 'damage',
                  source: unit.id,
                  target: u.id,
                  meta: {
                    aspect: 'heat',
                    amount: 15,
                    origin: unit.pos
                  }
                });
              });
            }
          }
        }
      }
    },
    radiant: {
      name: 'Radiant Light',
      cooldown: 30, // 3.75 seconds at 8fps
      target: 'closest.enemy()',
      trigger: 'distance(closest.enemy()?.pos) <= 2',
      config: {
        range: 2,
        damage: 8
      },
      effect: (unit, target, sim) => {
        if (target && typeof target === 'object' && 'id' in target) {
          console.log(`${unit.id} uses radiant light on ${target.id}!`);
          
          // Queue radiant damage (effective against spectral/undead)
          sim.queuedEvents.push({
            kind: 'damage',
            source: unit.id,
            target: target.id,
            meta: {
              aspect: 'radiant',
              amount: 8,
              origin: unit.pos
            }
          });
        }
      }
    },

    // Toymaker abilities
    deployBot: {
      name: 'Deploy Bot',
      cooldown: 50,
      maxUses: 5, // Limit to prevent field overload
      config: {
        range: 12, // Increased range to allow deployment without enemies nearby
        constructTypes: ['freezebot', 'clanker', 'spiker', 'swarmbot', 'roller', 'zapper']
      },
      target: 'closest.enemy()?.pos || self.pos', // Deploy at self position if no enemies
      trigger: 'distance(closest.enemy()?.pos) <= 12 || true', // Always allow deployment
      effect: (unit, targetPos, sim) => {
        if (!targetPos) return;
        console.log(`${unit.id} deploys a construct!`);
        
        // Select random construct type
        const constructTypes = ['freezebot', 'clanker', 'spiker', 'swarmbot', 'roller', 'zapper'];
        const constructType = constructTypes[Math.floor(Math.random() * constructTypes.length)];
        
        // Use the command system for deployment
        if (!sim.queuedCommands) {
          sim.queuedCommands = [];
        }
        
        sim.queuedCommands.push({
          type: 'deploy',
          args: [constructType], // Let the deploy command handle tactical positioning
          unitId: unit.id
        });
      }
    },

    // Mechatron abilities
    missileBarrage: {
      name: 'Missile Barrage',
      cooldown: 80, // 10 seconds at 8fps
      config: {
        range: 15,
        volleySize: 6
      },
      target: 'closest.enemy()?.pos',
      trigger: 'distance(closest.enemy()?.pos) <= 15',
      effect: (unit, target, sim) => {
        if (!target) return;
        console.log(`${unit.id} launches missile barrage!`);
        
        // Launch multiple missiles in a spread pattern
        for (let i = 0; i < 6; i++) {
          const spreadX = target.x + (Math.random() - 0.5) * 8;
          const spreadY = target.y + (Math.random() - 0.5) * 8;
          const clampedX = Math.max(0, Math.min(sim.fieldWidth - 1, spreadX));
          const clampedY = Math.max(0, Math.min(sim.fieldHeight - 1, spreadY));
          
          // Create bomb projectile for each missile
          sim.projectiles.push({
            id: `missile_${unit.id}_${i}_${Date.now()}`,
            pos: { x: unit.pos.x, y: unit.pos.y - 2 }, // Launch from above unit
            vel: { x: 0, y: 0 }, // Bombs use target-based movement
            radius: 3,
            damage: 12,
            team: unit.team,
            type: 'bomb',
            target: { x: clampedX, y: clampedY },
            origin: { x: unit.pos.x, y: unit.pos.y - 2 },
            duration: 30 + i * 5, // Stagger arrival times
            progress: 0,
            z: 8 // Start high in the air
          });
        }
      }
    },

    laserSweep: {
      name: 'Laser Sweep',
      cooldown: 60,
      config: {
        range: 20,
        width: 3
      },
      target: 'closest.enemy()?.pos',
      trigger: 'distance(closest.enemy()?.pos) <= 20',
      effect: (unit, target, sim) => {
        if (!target) return;
        console.log(`${unit.id} fires laser sweep!`);
        
        // Create a line of damage from unit to target
        const dx = target.x - unit.pos.x;
        const dy = target.y - unit.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const stepX = dx / distance;
        const stepY = dy / distance;
        
        // Fire laser along the line
        for (let step = 1; step < distance; step++) {
          const hitX = Math.round(unit.pos.x + stepX * step);
          const hitY = Math.round(unit.pos.y + stepY * step);
          
          // Damage in a 3-wide line
          for (let offset = -1; offset <= 1; offset++) {
            sim.queuedEvents.push({
              kind: 'aoe',
              source: unit.id,
              target: { x: hitX, y: hitY + offset },
              meta: {
                aspect: 'laser',
                radius: 1,
                amount: 15,
                piercing: true // Ignores armor
              }
            });
          }
        }
      }
    },

    empPulse: {
      name: 'EMP Pulse',
      cooldown: 100,
      config: {
        radius: 8,
        duration: 40
      },
      target: 'self.pos',
      trigger: 'closest.enemy() && distance(closest.enemy()?.pos) <= 8',
      effect: (unit, target, sim) => {
        console.log(`${unit.id} releases EMP pulse!`);
        
        sim.queuedEvents.push({
          kind: 'aoe',
          source: unit.id,
          target: unit.pos,
          meta: {
            aspect: 'emp',
            radius: 8,
            amount: 0, // No direct damage
            stunDuration: 40, // 5 seconds of stun
            disruptor: true // Disables abilities
          }
        });
      }
    },

    shieldRecharge: {
      name: 'Shield Recharge',
      cooldown: 120,
      target: 'self.pos',
      trigger: 'self.hp < self.maxHp * 0.5', // When below 50% health
      effect: (unit, target, sim) => {
        console.log(`${unit.id} activating shield recharge!`);
        
        const healAmount = Math.floor(unit.maxHp * 0.3); // Heal 30% of max HP
        sim.queuedEvents.push({
          kind: 'heal',
          source: unit.id,
          target: unit.id,
          meta: {
            aspect: 'technological',
            amount: healAmount
          }
        });
        
        // Add temporary damage resistance
        unit.meta.shieldActive = true;
        unit.meta.shieldDuration = 60; // 7.5 seconds of protection
        unit.meta.damageReduction = 0.5; // 50% damage reduction
      }
    },

    // Mechatronist abilities
    callAirdrop: {
      name: 'Call Mechatron Airdrop',
      cooldown: 120, // 15 seconds - powerful ability
      config: {
        range: 20,
        minAllies: 2 // Need some support to justify calling in heavy artillery
      },
      target: 'closest.enemy()?.pos',
      trigger: 'distance(closest.enemy()?.pos) > 8', // Strategic deployment when enemies are distant
      effect: (unit, targetPos, sim) => {
        if (!targetPos) return;
        console.log(`${unit.id} calls in Mechatron airdrop!`);
        
        // Calculate tactical airdrop position - between mechatronist and enemies
        const dropX = Math.floor((unit.pos.x + targetPos.x) / 2);
        const dropY = Math.floor((unit.pos.y + targetPos.y) / 2);
        
        // Queue airdrop command
        if (!sim.queuedCommands) {
          sim.queuedCommands = [];
        }
        
        sim.queuedCommands.push({
          type: 'airdrop',
          args: ['mechatron', dropX.toString(), dropY.toString()],
          unitId: unit.id
        });
        
        // Mark this mechatronist as the caller for potential riding mechanics
        unit.meta.calledAirdrop = true;
        unit.meta.airdropTick = sim.tick;
      }
    },

    tacticalOverride: {
      name: 'Tactical Override',
      cooldown: 60, // 7.5 seconds
      config: {
        range: 6,
        boostAmount: 0.5 // 50% cooldown reduction
      },
      target: 'self.pos',
      trigger: 'closest.ally() != null', // Need at least one ally for synergy
      effect: (unit, target, sim) => {
        console.log(`${unit.id} activates tactical override!`);
        
        // Find all mechanist units in range
        const mechanists = sim.units.filter(u => 
          u.team === unit.team &&
          u.tags?.includes('mechanical') &&
          Math.abs(u.pos.x - unit.pos.x) <= 6 &&
          Math.abs(u.pos.y - unit.pos.y) <= 6
        );
        
        // Boost their abilities by resetting cooldowns
        mechanists.forEach(ally => {
          ally.meta.tacticalBoost = true;
          ally.meta.tacticalBoostDuration = 40; // 5 seconds of boost
          
          // Reset ability cooldowns
          if (ally.lastAbilityTick) {
            Object.keys(ally.lastAbilityTick).forEach(abilityName => {
              ally.lastAbilityTick![abilityName] = 0; // Reset cooldown
            });
          }
          
          console.log(`  - ${ally.id} receives tactical boost`);
        });
        
        // Visual effect
        sim.particles.push({
          pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
          vel: { x: 0, y: -0.5 },
          radius: 4,
          color: '#00FFFF',
          lifetime: 30,
          type: 'energy'
        });
      }
    },

    // Support Mechanist abilities
    reinforceConstruct: {
      name: 'Reinforce Construct',
      cooldown: 45,
      config: { range: 3 },
      target: 'closest.ally()',
      trigger: 'closest.ally()?.tags?.includes("construct")',
      effect: (unit, target, sim) => {
        // Find the unit at the target position or closest ally construct
        let targetUnit = sim.units.find(u => 
          u.pos.x === target?.x && u.pos.y === target?.y &&
          u.team === unit.team && u.tags?.includes('construct')
        );
        
        // Fallback: find closest ally construct within range
        if (!targetUnit) {
          targetUnit = sim.units.find(u => 
            u.team === unit.team && 
            u.tags?.includes('construct') &&
            Math.abs(u.pos.x - unit.pos.x) <= 3 &&
            Math.abs(u.pos.y - unit.pos.y) <= 3
          );
        }
        if (targetUnit) {
          console.log(`${unit.id} reinforces ${targetUnit.id}!`);
          targetUnit.hp += 10;
          targetUnit.maxHp += 10;
          targetUnit.meta.armor = (targetUnit.meta.armor || 0) + 1;
          
          // Visual effect
          sim.particles.push({
            pos: { x: targetUnit.pos.x * 8 + 4, y: targetUnit.pos.y * 8 + 4 },
            vel: { x: 0, y: -0.5 },
            radius: 2,
            color: '#00FF88',
            lifetime: 20,
            type: 'energy'
          });
        }
      }
    },

    powerSurge: {
      name: 'Power Surge',
      cooldown: 40,
      config: { range: 4 },
      target: 'self.pos',
      trigger: 'closest.ally()?.tags?.includes("construct") || closest.ally()?.tags?.includes("mechanical")',
      effect: (unit, target, sim) => {
        console.log(`${unit.id} activates power surge!`);
        
        // Find all constructs/mechanical units in range
        const boostedUnits = sim.units.filter(u => 
          u.team === unit.team &&
          (u.tags?.includes('construct') || u.tags?.includes('mechanical')) &&
          Math.abs(u.pos.x - unit.pos.x) <= 4 &&
          Math.abs(u.pos.y - unit.pos.y) <= 4
        );
        
        // Reset their ability cooldowns
        boostedUnits.forEach(ally => {
          if (ally.lastAbilityTick) {
            Object.keys(ally.lastAbilityTick).forEach(abilityName => {
              ally.lastAbilityTick![abilityName] = 0; // Reset cooldown
            });
          }
          console.log(`  - ${ally.id} abilities recharged!`);
        });
        
        // Create energy field visual
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          sim.particles.push({
            pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
            vel: { x: Math.cos(angle) * 0.3, y: Math.sin(angle) * 0.3 },
            radius: 1.5,
            color: '#FFAA00',
            lifetime: 30,
            type: 'energy'
          });
        }
      }
    },

    emergencyRepair: {
      name: 'Emergency Repair',
      cooldown: 35,
      config: { range: 2 },
      target: 'closest.ally()',
      trigger: 'closest.ally()?.hp < closest.ally()?.maxHp * 0.7', // Target damaged allies
      effect: (unit, target, sim) => {
        // Find the unit at the target position (ally, damaged, within range)
        let targetUnit = sim.units.find(u => 
          u.pos.x === target?.x && u.pos.y === target?.y &&
          u.team === unit.team && u.hp < u.maxHp
        );
        
        // Fallback: find closest damaged ally within range
        if (!targetUnit) {
          targetUnit = sim.units.find(u => 
            u.team === unit.team &&
            u.hp < u.maxHp &&
            Math.abs(u.pos.x - unit.pos.x) <= 2 &&
            Math.abs(u.pos.y - unit.pos.y) <= 2
          );
        }
        
        if (targetUnit) {
          console.log(`${unit.id} performs emergency repair on ${targetUnit.id}!`);
          const healAmount = 15;
          targetUnit.hp = Math.min(targetUnit.maxHp, targetUnit.hp + healAmount);
          
          // Remove debuffs
          if (targetUnit.meta.stunned) delete targetUnit.meta.stunned;
          if (targetUnit.meta.stunDuration) delete targetUnit.meta.stunDuration;
          if (targetUnit.meta.frozen) delete targetUnit.meta.frozen;
          
          // Repair sparks visual
          for (let i = 0; i < 6; i++) {
            sim.particles.push({
              pos: { x: targetUnit.pos.x * 8 + 4, y: targetUnit.pos.y * 8 + 4 },
              vel: { x: (Math.random() - 0.5) * 1, y: (Math.random() - 0.5) * 1 },
              radius: 0.5,
              color: '#FFFF00',
              lifetime: 15,
              type: 'electric_spark'
            });
          }
        }
      }
    },

    shieldGenerator: {
      name: 'Shield Generator',
      cooldown: 60,
      config: { range: 3 },
      target: 'self.pos',
      trigger: 'distance(closest.enemy()?.pos) <= 6',
      effect: (unit, target, sim) => {
        console.log(`${unit.id} activates shield generator!`);
        
        // Create 3x3 energy shield around the engineer
        const shieldCells = [];
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const shieldX = unit.pos.x + dx;
            const shieldY = unit.pos.y + dy;
            if (shieldX >= 0 && shieldX < sim.fieldWidth && shieldY >= 0 && shieldY < sim.fieldHeight) {
              shieldCells.push({ x: shieldX, y: shieldY });
            }
          }
        }
        
        // Add shield barrier particles that block projectiles
        shieldCells.forEach(cell => {
          sim.particles.push({
            pos: { x: cell.x * 8 + 4, y: cell.y * 8 + 4 },
            vel: { x: 0, y: 0 },
            radius: 3,
            color: '#00CCFF',
            lifetime: 80, // ~10 seconds
            type: 'energy',
            z: 2 // Elevated to block projectiles
          });
        });
      }
    },

    systemHack: {
      name: 'System Hack',
      cooldown: 50,
      config: { range: 6 },
      target: 'closest.enemy()?.pos',
      trigger: 'distance(closest.enemy()?.pos) <= 6',
      effect: (unit, targetPos, sim) => {
        // Find enemy unit at target position
        let targetUnit = sim.units.find(u => 
          u.pos.x === targetPos?.x && u.pos.y === targetPos?.y &&
          u.team !== unit.team
        );
        
        // Fallback: find closest enemy within range
        if (!targetUnit) {
          targetUnit = sim.units.find(u => 
            u.team !== unit.team &&
            Math.abs(u.pos.x - unit.pos.x) <= 6 &&
            Math.abs(u.pos.y - unit.pos.y) <= 6
          );
        }
        
        if (targetUnit) {
          console.log(`${unit.id} hacks ${targetUnit.id}'s systems!`);
          
          // Disable abilities for 30 ticks
          targetUnit.meta.systemsHacked = true;
          targetUnit.meta.hackDuration = 30;
          
          // Add massive cooldowns to all abilities
          if (!targetUnit.lastAbilityTick) targetUnit.lastAbilityTick = {};
          Object.keys(targetUnit.abilities || {}).forEach(abilityName => {
            targetUnit.lastAbilityTick![abilityName] = sim.tick;
          });
          
          // Hack visual effect
          sim.particles.push({
            pos: { x: targetUnit.pos.x * 8 + 4, y: targetUnit.pos.y * 8 + 4 },
            vel: { x: 0, y: -1 },
            radius: 2,
            color: '#FF0088',
            lifetime: 30,
            type: 'energy'
          });
        }
      }
    },

    // Construct abilities
    freezeAura: {
      name: 'Chill Aura',
      cooldown: 15,
      config: { radius: 2 },
      effect: (unit, target, sim) => {
        console.log(`${unit.id} emits chilling aura`);
        sim.queuedEvents.push({
          kind: 'aoe',
          source: unit.id,
          target: unit.pos,
          meta: {
            aspect: 'chill',
            radius: 2,
            amount: 0, // No damage, just applies slow effect
            origin: unit.pos
          }
        });
      }
    },

    explode: {
      name: 'Self Destruct',
      cooldown: 1, // Only triggers once when near enemies
      trigger: 'distance(closest.enemy()?.pos) <= 3', // Slightly larger trigger radius for better tactical positioning
      effect: (unit, target, sim) => {
        console.log(`${unit.id} explodes!`);
        sim.queuedEvents.push({
          kind: 'aoe',
          source: unit.id,
          target: unit.pos,
          meta: {
            aspect: 'impact',
            radius: 3,
            amount: 8,
            force: 5,
            origin: unit.pos
          }
        });
        
        // Self-destruct - kill the unit
        sim.queuedEvents.push({
          kind: 'damage',
          source: unit.id,
          target: unit.id,
          meta: {
            aspect: 'impact',
            amount: 999
          }
        });
      }
    },

    whipChain: {
      name: 'Chain Whip',
      cooldown: 20,
      range: 3,
      target: 'closest.enemy()',
      trigger: 'distance(closest.enemy()?.pos) <= 3',
      effect: (unit, target, sim) => {
        if (!target) return;
        console.log(`${unit.id} whips ${target.id} with chain!`);
        
        sim.queuedEvents.push({
          kind: 'damage',
          source: unit.id,
          target: target.id,
          meta: {
            aspect: 'impact',
            amount: 4,
            force: 3, // Pulls target closer
            origin: unit.pos
          }
        });
      }
    },

    chargeAttack: {
      name: 'Roller Charge',
      cooldown: 30,
      config: { chargeDistance: 5 },
      trigger: 'distance(closest.enemy()?.pos) <= 6',
      effect: (unit, target, sim) => {
        console.log(`${unit.id} begins charging!`);
        unit.meta.charging = true;
        unit.meta.chargeProgress = 0;
        unit.meta.chargeTarget = target?.pos || { x: unit.pos.x + 5, y: unit.pos.y };
      }
    },

    zapHighest: {
      name: 'Power Zap',
      cooldown: 25,
      config: { range: 6 },
      effect: (unit, target, sim) => {
        // Find highest HP enemy in range
        const enemies = sim.getRealUnits().filter(u => 
          u.team !== unit.team && 
          Math.abs(u.pos.x - unit.pos.x) <= 6 &&
          Math.abs(u.pos.y - unit.pos.y) <= 6
        );
        
        if (enemies.length === 0) return;
        
        const highestHpEnemy = enemies.reduce((prev, curr) => 
          curr.hp > prev.hp ? curr : prev
        );
        
        console.log(`${unit.id} zaps ${highestHpEnemy.id} with electricity!`);
        
        sim.queuedEvents.push({
          kind: 'damage',
          source: unit.id,
          target: highestHpEnemy.id,
          meta: {
            aspect: 'shock',
            amount: 6,
            origin: unit.pos
          }
        });
      }
    },

    // Grappling Hook - projectile that pins targets and creates taut lines
    grapplingHook: {
      name: 'Grappling Hook',
      cooldown: 25, // 3 seconds at 8fps
      config: { 
        range: 8,
        hookSpeed: 1.5,
        pinDuration: 60 // 7.5 seconds pinned
      },
      target: 'closest.enemy()?.pos',
      trigger: 'distance(closest.enemy()?.pos) <= 8',
      effect: (unit, target, sim) => {
        if (!target) return;
        
        console.log(`${unit.id} fires grappling hook at (${target.x}, ${target.y})!`);
        
        // Check if grappler already has max grapples
        const existingGrapples = sim.projectiles.filter(p => 
          p.type === 'grapple' && 
          p.team === unit.team && 
          (p as any).grapplerID === unit.id
        ).length;
        
        if (existingGrapples >= (unit.meta.maxGrapples || 2)) {
          console.log(`${unit.id} already at max grapples (${existingGrapples})`);
          return;
        }
        
        const dx = target.x - unit.pos.x;
        const dy = target.y - unit.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Create grappling hook projectile
        sim.projectiles.push({
          id: `grapple_${unit.id}_${Date.now()}`,
          pos: { x: unit.pos.x, y: unit.pos.y },
          vel: { 
            x: (dx / distance) * 1.5, 
            y: (dy / distance) * 1.5 
          },
          radius: 0.5,
          damage: 0, // Grapples don't do damage, they pin
          team: unit.team,
          type: 'grapple' as any,
          target: { x: target.x, y: target.y },
          origin: { x: unit.pos.x, y: unit.pos.y },
          grapplerID: unit.id,
          pinDuration: 60
        } as any);
      }
    },

    // Pin Target - reinforces existing grapple to fully immobilize enemy
    pinTarget: {
      name: 'Pin Target',
      cooldown: 35, // 4.5 seconds
      config: { range: 8 },
      target: 'closest.enemy()?.pos',
      trigger: 'true', // Can always attempt to pin - will check grapple status in effect
      effect: (unit, target, sim) => {
        if (!target) return;
        
        // Find the enemy at target position
        const enemy = sim.units.find(u => 
          u.pos.x === target.x && u.pos.y === target.y && u.team !== unit.team
        );
        
        if (!enemy || !enemy.meta.grappled) {
          console.log(`${unit.id} cannot pin - target not grappled`);
          return;
        }
        
        console.log(`${unit.id} reinforces grapple on ${enemy.id} - fully pinned!`);
        
        // Upgrade grapple to full pin
        enemy.meta.pinned = true;
        enemy.meta.pinDuration = 80; // 10 seconds fully pinned
        enemy.meta.stunned = true;
        enemy.intendedMove = { x: 0, y: 0 };
        
        // Create pin visual effect
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          sim.particles.push({
            pos: { x: enemy.pos.x * 8 + 4, y: enemy.pos.y * 8 + 4 },
            vel: { x: Math.cos(angle) * 0.3, y: Math.sin(angle) * 0.3 },
            radius: 1,
            color: '#AA4400', // Rope/chain color
            lifetime: 40,
            type: 'pin'
          });
        }
      }
    },
  }

static bestiary: { [key: string]: Partial<Unit> } = {
    worm: {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "worm",
      state: "idle" as UnitState,
      hp: 10,
      maxHp: 10,
      mass: 4,
    },
    farmer: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "farmer",
      state: "idle" as UnitState,
      hp: 25,
      maxHp: 25,
      mass: 1,
      tags: ['hunt'],
    },
    soldier: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "soldier",
      state: "idle" as UnitState,
      hp: 30,
      maxHp: 30,
      mass: 1,
      tags: ['hunt'],
      abilities: {}
    },
    ranger: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "slinger",
      state: "idle" as UnitState,
      hp: 20,
      maxHp: 20,
      mass: 1,
      abilities: {}
    },
    bombardier: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "bombardier",
      state: "idle" as UnitState,
      hp: 18,
      maxHp: 18,
      mass: 1,
      abilities: {}
    },
    priest: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "priest",
      state: "idle" as UnitState,
      hp: 20,
      maxHp: 20,
      mass: 1,
      abilities: {
        heal: this.abilities.heal
      }
    },
    tamer: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "tamer",
      state: "idle" as UnitState,
      hp: 20,
      maxHp: 20,
      mass: 1,
      abilities: {
        // summon: Freehold.abilities.squirrel
      }
    },
    squirrel: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "squirrel",
      state: "idle" as UnitState,
      hp: 5,
      maxHp: 5,
      mass: 1,
      tags: ['follower'],
      abilities: {
        jumps: this.abilities.jumps // Mini-squirrels can jump too
      }
    },
    megasquirrel: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "megasquirrel",
      state: "idle" as UnitState,
      hp: 40,
      maxHp: 40,
      mass: 8, // Much heavier than regular units
      tags: ['mythic'],
      abilities: {
        jumps: this.abilities.jumps,
        // Could add special megasquirrel abilities here
      },
      meta: {
        huge: true, // Mark as multi-cell unit
        facing: 'right' as 'left' | 'right' // Megasquirrels face right by default
      }
    },

    // Black faction units
    rainmaker: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "rainmaker",
      state: "idle" as UnitState,
      hp: 80,
      maxHp: 80,
      mass: 1,
      tags: ['weather', 'mythic'],
      abilities: {
        makeRain: this.abilities.makeRain
      },
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    skeleton: {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "skeleton",
      state: "idle" as UnitState,
      hp: 25,
      maxHp: 25,
      mass: 1, // Lighter than living units
      tags: ['undead', 'black', 'hunt'],
      abilities: {},
      meta: {
        perdurance: 'undead', // Different healing rules
        facing: 'right' as 'left' | 'right'
      }
    },

    'skeleton-mage': {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "skeleton-mage",
      state: "idle" as UnitState,
      hp: 20,
      maxHp: 20,
      mass: 0.7, // Lighter than regular skeletons
      tags: ['undead', 'black', 'caster'],
      abilities: {
        // Could add lightning or magic missile abilities here
      },
      meta: {
        perdurance: 'undead', // Same as regular skeleton
        facing: 'right' as 'left' | 'right'
      }
    },

    ghost: {
      intendedMove: { x: 0, y: 0 },
      team: "hostile", 
      sprite: "ghost",
      state: "idle" as UnitState,
      hp: 30,
      maxHp: 30,
      mass: 0.1, // Nearly weightless
      tags: ['undead', 'spectral', 'black'],
      abilities: {},
      meta: {
        perdurance: 'spectral', // Only damaged by magic/environmental
        facing: 'right' as 'left' | 'right'
      }
    },

    demon: {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "demon", 
      state: "idle" as UnitState,
      hp: 60,
      maxHp: 60,
      mass: 2, // Heavy and strong
      tags: ['fiend', 'black', 'hunt'],
      abilities: {
        fireBlast: this.abilities.fireBlast
      },
      meta: {
        perdurance: 'fiendish', // Resistant to physical damage
        facing: 'right' as 'left' | 'right'
      }
    },

    'mimic-worm': {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "mimic-worm",
      state: "idle" as UnitState, 
      hp: 35,
      maxHp: 35,
      mass: 1.5,
      tags: ['shapeshifter', 'black'],
      abilities: {
        jumps: this.abilities.jumps, // Can jump like worms
      },
      meta: {
        segmented: true, // Could be segmented like big worm
        segmentCount: 3, // Smaller than big worm
        facing: 'right' as 'left' | 'right'
      }
    },
    'big-worm': {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "big-worm",
      state: "idle" as UnitState,
      hp: 120,
      maxHp: 120,
      mass: 2,
      tags: ['beast', 'black', 'hunt'],
      abilities: {},
      meta: {
        huge: true, // Mark as multi-cell unit
        segmented: true,
        segmentCount: 5, // Larger than mimic-worm
        facing: 'right' as 'left' | 'right'
      }
    },

    // Desert Megaworm - massive segmented desert predator
    'desert-megaworm': {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "big-worm", // Use big-worm sprite for now, can be updated later
      state: "idle" as UnitState,
      hp: 300,
      maxHp: 300,
      mass: 4,
      tags: ['beast', 'desert', 'hunt', 'segmented', 'massive'],
      abilities: {
        sandBlast: this.abilities.fireBlast // Repurpose fire blast as sand blast
      },
      meta: {
        huge: true,
        segmented: true,
        segmentCount: 12, // Much longer than other worms
        facing: 'right' as 'left' | 'right',
        desertAdapted: true,
        heatResistant: true
      }
    },

    // Desert Grappler - specialized hunter with grappling hooks
    grappler: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "ranger", // Use ranger sprite for now, can be updated later
      state: "idle" as UnitState,
      hp: 35,
      maxHp: 35,
      mass: 1,
      tags: ['desert', 'hunter', 'specialist', 'grappler'],
      abilities: {
        grapplingHook: this.abilities.grapplingHook,
        pinTarget: this.abilities.pinTarget
      },
      meta: {
        facing: 'right' as 'left' | 'right',
        desertAdapted: true,
        grapplingRange: 8,
        maxGrapples: 2 // Can maintain 2 grapples simultaneously
      }
    },

    // Mechanist leader - calls in Mechatron support
    mechatronist: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "mechatronist",
      state: "idle" as UnitState,
      hp: 30,
      maxHp: 30,
      mass: 1,
      tags: ['mechanical', 'leader', 'engineer'],
      abilities: {},
      meta: {
        facing: 'right' as 'left' | 'right',
        calledAirdrop: false,
        canRideMechatron: true // Enable riding mechanics
      }
    },

    // Support mechanist units
    builder: { // Rigger role - construct assembly
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "builder",
      state: "idle" as UnitState,
      hp: 20,
      maxHp: 20,
      mass: 1,
      tags: ['mechanical', 'support', 'builder'],
      abilities: {},
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    fueler: { // Energy management specialist
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "fueler",
      state: "idle" as UnitState,
      hp: 18,
      maxHp: 18,
      mass: 1,
      tags: ['mechanical', 'support', 'energy'],
      abilities: {},
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    mechanic: { // Repair specialist
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "mechanic",
      state: "idle" as UnitState,
      hp: 22,
      maxHp: 22,
      mass: 1,
      tags: ['mechanical', 'support', 'repair'],
      abilities: {},
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    engineer: { // Systems specialist
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "engineer",
      state: "idle" as UnitState,
      hp: 25,
      maxHp: 25,
      mass: 1,
      tags: ['mechanical', 'support', 'systems'],
      abilities: {},
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    welder: { // Alternative repair/build unit
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "welder",
      state: "idle" as UnitState,
      hp: 24,
      maxHp: 24,
      mass: 1,
      tags: ['mechanical', 'support', 'welder'],
      abilities: {},
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    assembler: { // Advanced constructor
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "assembler",
      state: "idle" as UnitState,
      hp: 26,
      maxHp: 26,
      mass: 1,
      tags: ['mechanical', 'support', 'assembler'],
      abilities: {},
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    // Massive war machine - airdropped from above
    mechatron: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "mechatron",
      state: "idle" as UnitState,
      hp: 200,
      maxHp: 200,
      mass: 5, // Extremely heavy
      tags: ['mechanical', 'huge', 'artillery', 'hunt'],
      abilities: {
        missileBarrage: this.abilities.missileBarrage,
        laserSweep: this.abilities.laserSweep,
        empPulse: this.abilities.empPulse,
        shieldRecharge: this.abilities.shieldRecharge
      },
      meta: {
        huge: true,
        width: 32, // 32 pixels wide
        height: 64, // 64 pixels tall 
        cellsWide: 4, // 4 cells wide (32/8)
        cellsHigh: 8, // 8 cells high (64/8)
        armor: 5, // Heavy armor reduces incoming damage
        facing: 'right' as 'left' | 'right',
        shieldActive: false,
        damageReduction: 0.2 // Base 20% damage reduction from armor
      }
    },

    // Toymaker and constructs
    toymaker: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "toymaker",
      state: "idle" as UnitState,
      hp: 25,
      maxHp: 25,
      mass: 1,
      tags: ['mechanical', 'craftor'],
      abilities: {},
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    freezebot: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "freezebot",
      state: "idle" as UnitState,
      hp: 8,
      maxHp: 8,
      mass: 0.5,
      tags: ['construct', 'ice', 'hunt'],
      meta: {
        perdurance: 'sturdiness', // Takes max 1 damage per hit
        facing: 'right' as 'left' | 'right'
      }
    },

    clanker: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "clanker",
      state: "idle" as UnitState,
      hp: 6,
      maxHp: 6,
      mass: 0.8,
      tags: ['construct', 'explosive', 'hunt', 'aggressive'],
      meta: {
        perdurance: 'sturdiness',
        facing: 'right' as 'left' | 'right'
      }
    },

    spiker: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly", 
      sprite: "spikebot",
      state: "idle" as UnitState,
      hp: 10,
      maxHp: 10,
      mass: 0.6,
      tags: ['construct', 'melee', 'hunt'],
      meta: {
        perdurance: 'sturdiness',
        facing: 'right' as 'left' | 'right'
      }
    },

    swarmbot: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "swarmbot",
      state: "idle" as UnitState,
      hp: 12, // Population-based: each HP represents several small bots
      maxHp: 12,
      mass: 0.3,
      tags: ['construct', 'swarm', 'hunt'],
      meta: {
        perdurance: 'swarm', // Population-based health
        facing: 'right' as 'left' | 'right'
      }
    },

    roller: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "jumpbot", // Using jumpbot sprite for roller
      state: "idle" as UnitState,
      hp: 15,
      maxHp: 15,
      mass: 1.2,
      tags: ['construct', 'charger', 'hunt'],
      meta: {
        perdurance: 'sturdiness',
        facing: 'right' as 'left' | 'right'
      }
    },

    zapper: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "zapper", // Using proper zapper sprite
      state: "idle" as UnitState,
      hp: 8,
      maxHp: 8,
      mass: 0.4,
      tags: ['construct', 'electrical', 'hunt'],
      meta: {
        perdurance: 'sturdiness',
        facing: 'right' as 'left' | 'right'
      }
    }
  }

  static counts: { [seriesName: string]: number } = {}
  static id(seriesName: string): number | string {
    this.counts = this.counts || {};
    let count = (this.counts[seriesName] || 0);
    this.counts[seriesName] = count + 1;
    return count || "";
  }
  static unit(beast: string): Partial<Unit> {
    let u = {
        id: beast + this.id(beast),
        // pos: { x, y },
        intendedMove: { x: 0, y: 0 },
        state: "idle" as UnitState,
        ...this.bestiary[beast],
        abilities: {
          ...(beast === "worm" ? { jumps: this.abilities.jumps } : {}),
          ...(beast === "ranger" ? { ranged: this.abilities.ranged } : {}),
          ...(beast === "bombardier" ? { bombardier: this.abilities.bombardier } : {}),
          ...(beast === "priest" ? { heal: this.abilities.heal, radiant: this.abilities.radiant } : {}),
          ...(beast === "tamer" ? { heal: this.abilities.squirrel } : {}),
          ...(beast === "megasquirrel" ? { jumps: this.abilities.jumps } : {}),
          ...(beast === "mimic-worm" ? { jumps: this.abilities.jumps } : {}),
          ...(beast === "demon" ? { fireBlast: this.abilities.fireBlast } : {}),
          ...(beast === "big-worm" ? { breatheFire: this.abilities.breatheFire } : {}),
          ...(beast === "desert-megaworm" ? { sandBlast: this.abilities.fireBlast } : {}),
          ...(beast === "grappler" ? { 
            grapplingHook: this.abilities.grapplingHook,
            pinTarget: this.abilities.pinTarget 
          } : {}),
          ...(beast === "rainmaker" ? { makeRain: this.abilities.makeRain } : {}),
          ...(beast === "toymaker" ? { deployBot: this.abilities.deployBot } : {}),
          ...(beast === "freezebot" ? { freezeAura: this.abilities.freezeAura } : {}),
          ...(beast === "clanker" ? { explode: this.abilities.explode } : {}),
          ...(beast === "spiker" ? { whipChain: this.abilities.whipChain } : {}),
          ...(beast === "roller" ? { chargeAttack: this.abilities.chargeAttack } : {}),
          ...(beast === "zapper" ? { zapHighest: this.abilities.zapHighest } : {}),
          ...(beast === "mechatronist" ? { 
            callAirdrop: this.abilities.callAirdrop,
            tacticalOverride: this.abilities.tacticalOverride
          } : {}),
          ...(beast === "builder" ? { 
            reinforceConstruct: this.abilities.reinforceConstruct
          } : {}),
          ...(beast === "fueler" ? { 
            powerSurge: this.abilities.powerSurge
          } : {}),
          ...(beast === "mechanic" ? { 
            emergencyRepair: this.abilities.emergencyRepair
          } : {}),
          ...(beast === "engineer" ? { 
            shieldGenerator: this.abilities.shieldGenerator,
            systemHack: this.abilities.systemHack
          } : {}),
          ...(beast === "welder" ? { 
            emergencyRepair: this.abilities.emergencyRepair,
            reinforceConstruct: this.abilities.reinforceConstruct
          } : {}),
          ...(beast === "assembler" ? { 
            reinforceConstruct: this.abilities.reinforceConstruct,
            powerSurge: this.abilities.powerSurge
          } : {}),
          ...(beast === "mechatron" ? { 
            missileBarrage: this.abilities.missileBarrage,
            laserSweep: this.abilities.laserSweep,
            empPulse: this.abilities.empPulse,
            shieldRecharge: this.abilities.shieldRecharge
          } : {})
        },
        tags: [
          ...(this.bestiary[beast]?.tags || []), // Include tags from bestiary
          ...(beast === "worm" ? ["swarm"] : []),
          ...(beast === "megasquirrel" ? ["hunt"] : []),
          ...(beast === "squirrel" ? ["hunt"] : []),
          ...(beast === "farmer" ? ["hunt"] : []),
          ...(beast === "soldier" ? ["hunt"] : []),
          // ...(beast === "ranger" ? ["ranged"] : []),
          // ...(beast === "priest" ? ["heal"] : [])
        ]
      };

    // Ensure meta property always exists
    if (!u.meta) {
      u.meta = {};
    }

    // console.log(`Creating unit ${u.id} of type ${beast} at (${u.pos?.x || 0}, ${u.pos?.y || 0})`);
    return u;
  }
}