import { Game } from "./game";
import { Ability, Unit } from "./sim/types";
import { Simulator } from "./simulator";

// Scenario/DSL layer for test-driven and scenario-driven setup
class Freehold extends Game {
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
            unit: { ...Freehold.unit('squirrel'), intendedProtectee: unit.id, posture: 'guard' }
          }
        });
        

        // toss a 'pointless' nut projectile
        if (sim && sim.projectiles) {
          let dx = Math.random() * 2 - 1; // Random x offset
          let dy = Math.random() * 2 - 1; // Random y offset
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
            duration: 1,
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
      effect: (u, t, sim) => {
        if (!t) {
          // console.warn(`${u.id} has no valid target to jump to`);
          return;
        }
        console.debug(`${u.id} jumping to target at (${t.x}, ${t.y})`);
        u.meta.jumping = true;
        u.meta.jumpProgress = 0;
        u.meta.jumpOrigin = { x: u.pos.x, y: u.pos.y };
        u.meta.jumpTarget = t;
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
      target: 'closest.ally(hp < maxHp)',
      trigger: 'closest.ally(hp < maxHp) && distance(closest.ally(hp < maxHp)?.pos) <= 8',
      effect: (u, targetPos, sim) => {
        // Find the best healing position (center of wounded allies)
        const woundedAllies = sim.units.filter(unit => 
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
              amount: 8,
              radius: 3,
              origin: healTarget
            }
          });
        }
      },
    },
  }

  static bestiary: { [key: string]: Partial<Unit> } = {
    worm: {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "worm",
      state: "idle",
      hp: 10,
      maxHp: 10,
      mass: 4,
    },
    farmer: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "farmer",
      state: "idle",
      hp: 25,
      maxHp: 25,
      mass: 1,
      tags: ['hunt'],
    },
    soldier: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "soldier",
      state: "idle",
      hp: 30,
      maxHp: 30,
      mass: 1,
      tags: ['hunt'],
    },
    ranger: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "slinger",
      state: "idle",
      hp: 20,
      maxHp: 20,
      mass: 1,
      abilities: {}
    },
    bombardier: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "bombardier",
      state: "idle",
      hp: 18,
      maxHp: 18,
      mass: 1,
      abilities: {}
    },
    priest: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "priest",
      state: "idle",
      hp: 20,
      maxHp: 20,
      mass: 1,
      abilities: {
        heal: Freehold.abilities.heal
      }
    },
    tamer: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "tamer",
      state: "idle",
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
      state: "idle",
      hp: 5,
      maxHp: 5,
      mass: 1,
      tags: ['follower'],
      abilities: {
        // squirrel ability can be added here if needed
      }
    }
  }

  
  // Override input: spawn a worm at a random grid position on 'w'
  numBuffer: string = "";
  getInputHandler(): (e: { key: string }) => void {
    return (e) => {
      if (e.key.match(/[0-9]/)) {
        this.numBuffer += e.key;
        console.log(`Buffering number: ${this.numBuffer}`);
        return;
      }
      let repetitions = parseInt(this.numBuffer, 10) || 1; // Default to 1 if no number
      this.numBuffer = ""; // Reset buffer after using it

      for (let i = 0; i < repetitions; i++) {
        this.handleKeyPress(e);
      }
    };
  }

  handleKeyPress(e: { key: string }) {
    if (e.key === "Escape") {
      this.sim.reset();
      return;
    } else if (e.key === ".") {
      console.log("STEPPING MANUALLY");
      this.sim.step(true);
      return;
    } else if (e.key === ",") {
      if (this.sim.paused) {
        console.log(`Simulation is already paused (Enter to unpause).`);
      }
      this.sim.pause();
      return
    } else if (e.key === "Enter") {
      if (this.sim.paused) {
        console.log(`Unpausing simulation (press , to pause again).`);
        this.sim.paused = false;
      } else {
        console.log(`Simulation is running (press , to pause).`);
      }
      return;
    }
    
    // if (e.key === "r") {
    //   this.renderer.setViewMode('grid');
  // } else
    if(e.key === "c") {
      this.renderer.setViewMode(
        this.renderer.cinematicView ? 'grid' : 'cinematic'
      );
    }

    let beasts = ["worm", "farmer", "soldier", "ranger", "priest", "bombardier", "tamer"];
    // let beasts = Object.keys(Freehold.bestiary);
    console.log(`Available beasts: ${beasts.join(', ')}`);
    if (beasts.some(b => b.startsWith(e.key))) {
      const { x, y } = this.randomGridPosition();
      let beast = beasts.find(b => b.startsWith(e.key));
      if (beast) {
        this.add(beast, x, y);
      }
    }
  }

  add(beast: string, x: number, y: number) {
    console.log(`Spawning ${beast} at (${x}, ${y})`);
    this.sim.addUnit({ ...Freehold.unit(beast), pos: { x, y } });
  }

  static unit(beast: string): Partial<Unit> {
    let u = {
        id: beast + this.id(beast),
        // pos: { x, y },
        intendedMove: { x: 0, y: 0 },
        state: "idle",
        ...Freehold.bestiary[beast],
        abilities: {
          ...(beast === "worm" ? { jumps: Freehold.abilities.jumps } : {}),
          ...(beast === "ranger" ? { ranged: Freehold.abilities.ranged } : {}),
          ...(beast === "bombardier" ? { bombardier: Freehold.abilities.bombardier } : {}),
          // ...(beast === "priest" ? { heal: Freehold.abilities.heal } : {})
          ...(beast === "tamer" ? { heal: Freehold.abilities.squirrel } : {})
        },
        tags: [
          ...(beast === "worm" ? ["swarm"] : []),
          ...(beast === "farmer" ? ["hunt"] : []),
          ...(beast === "soldier" ? ["hunt"] : []),
          // ...(beast === "ranger" ? ["ranged"] : []),
          // ...(beast === "priest" ? ["heal"] : [])
        ]
      };

    console.log(`Creating unit ${u.id} of type ${beast} at (${u.pos?.x || 0}, ${u.pos?.y || 0})`);
    return u;
  }

  randomGridPosition(): { x: number, y: number } {
    return {
      x: Math.floor(Math.random() * this.sim.fieldWidth),
      y: Math.floor(Math.random() * this.sim.fieldHeight)
    };
  }

  static counts: { [seriesName: string]: number } = {}
  static id(seriesName: string): number | string {
    this.counts = this.counts || {};
    let count = (this.counts[seriesName] || 0);
    this.counts[seriesName] = count + 1;
    return count || "";
  }

  static boot(
    canvasId: string | HTMLCanvasElement = 'battlefield'
  ) {
    let game: Freehold | null = null;
    const canvas = canvasId instanceof HTMLCanvasElement
      ? canvasId
      : document.getElementById(canvasId) as HTMLCanvasElement;
    console.log('Canvas element:', canvas);
    if (canvas) {
      let addInputListener = (cb: (e: { key: string }) => void) => {
        document.addEventListener('keydown', (e) => {
          cb({ key: e.key });
        });
      };

      game = new Freehold(canvas, {
        addInputListener,
        animationFrame: (cb) => requestAnimationFrame(cb)
      });
            
      // Handle window resize
      window.addEventListener('resize', () => {
        if (game && game.handleResize) {
          game.handleResize();
        }
      });
      
      // Initial size calculation
      if (game && game.handleResize) {
        game.handleResize();
      }
    } else {
      console.error(`Canvas element ${canvasId} not found!`);
    }
    console.log('Game initialized:', game);
    function gameLoop() {
      if (game) { game.update(); }
      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
  }
}

export { Freehold };


console.log('Freehold module loaded.');
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Freehold = Freehold; // Expose for browser use
}