import { Freehold } from "../freehold";
import { Ability, Unit, UnitState, Vec2 } from "../sim/types";
import { Simulator } from "../simulator";

export default class Encyclopaedia {
  static abilities: { [key: string]: Ability } = {
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
        if (sim && sim.setWeather) {
          console.log(`${unit.id} is making it rain!`);
          sim.setWeather('rain', 80, 0.8);
          
          // Add moisture and coolness around the rainmaker
          if (sim.addMoisture && sim.addHeat) {
            sim.addMoisture(unit.pos.x, unit.pos.y, 1.0, 5);
            sim.addHeat(unit.pos.x, unit.pos.y, -10, 5); // Cool the area
          }
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
      mass: 0.8, // Lighter than living units
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
          ...(beast === "rainmaker" ? { makeRain: this.abilities.makeRain } : {})
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

    // console.log(`Creating unit ${u.id} of type ${beast} at (${u.pos?.x || 0}, ${u.pos?.y || 0})`);
    return u;
  }
}