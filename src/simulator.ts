import { Action, Projectile, Unit, Vec2 } from "./sim/types";
import { MeleeCombat } from "./rules/melee_combat";
import { Knockback } from "./rules/knockback";
import { ProjectileMotion } from "./rules/projectile_motion";
import { UnitMovement } from "./rules/unit_movement";
import { AreaOfEffect } from "./rules/area_of_effect";
import { Rule } from "./rules/rule";
import { UnitBehavior } from "./rules/unit_behavior";
import Cleanup from "./rules/cleanup";
import { Jumping } from "./rules/jumping";
import { Abilities } from "./rules/abilities";
import { EventHandler } from "./rules/event_handler";


class Simulator {
  fieldWidth: number;
  fieldHeight: number;

  units: Unit[];
  projectiles: Projectile[];
  rulebook: Rule[];
  queuedEvents: Action[] = [];

  constructor(fieldWidth = 128, fieldHeight = 128) {
    this.fieldWidth = fieldWidth;
    this.fieldHeight = fieldHeight;
    this.reset();
  }

  paused: boolean = false;
  pause() {
    console.log(`!!! Simulation paused at tick ${this.ticks}`);
    this.paused = true;
  }

  reset() {
    // console.log(`Initializing simulator with field size: ${fieldWidth}x${fieldHeight}`);
    this.units = [];
    this.projectiles = [];
    this.rulebook = [
      new Abilities(this),
      new UnitBehavior(this),
      new UnitMovement(this),
      new MeleeCombat(this),

      // not sure i trust either of these yet
      new AreaOfEffect(this),
      new Knockback(this),
      // or this honestly
      new ProjectileMotion(this),

      new Jumping(this),
      new EventHandler(this),
      new Cleanup(this)
    ];
  }

  addUnit(unit: Partial<Unit>) {
    this.units.push({
      ...unit,
      id: unit.id || `unit_${Date.now()}`,
      hp: unit.hp === undefined ? 100 : unit.hp,
      team: unit.team || 'friendly',
      pos: unit.pos || { x: 0, y: 0 },
      intendedMove: unit.intendedMove || { x: 0, y: 0 },
      maxHp: unit.maxHp || unit.hp || 100,
      sprite: unit.sprite || 'default',
      state: unit.state || 'idle',
      mass: unit.mass || 1,
      abilities: unit.abilities || {},
      meta: {}
    });

    return this;
  }

  create(unit: Unit) {
    const newUnit = { ...unit, id: unit.id || `unit_${Date.now()}` };
    this.units.push(newUnit);
    return newUnit;
  }

  get roster() {
    return Object.fromEntries(this.units.map(unit => [unit.id, unit]));
  }

  tick() { this.step(true); }

  ticks = 0;
  lastCall: number = 0;
  step(force = false) {
    if (this.paused) {
      if (!force) {
        console.log(`Simulation is paused, skipping step.`);
        return this;
      } else {
        console.log(`Forcing simulation step while paused.`);
      }
    }

    let t0 = performance.now();
    this.ticks++;
    let lastUnits = [...this.units];
    for (const rule of this.rulebook) {
      let tr0 = performance.now();
      rule.execute();
      let tr1 = performance.now();
      let elapsed = tr1 - tr0;
      if (elapsed > 10) {
        console.log(`- Rule ${rule.constructor.name} executed in ${tr1 - tr0}ms`);
      }

      // Debugging: print unit changes
      this._debugUnits(lastUnits, rule.constructor.name);
      lastUnits = this.units.map(u => ({ ...u }));
    }
    let t1 = performance.now();
    let elapsed = t1 - t0;
    if (elapsed > 10) {
      console.log(`Simulation step ${this.ticks} took ${elapsed.toFixed(2)}ms`);
    }
    // console.log(`Total ticks: ${this.ticks}`);
    // console.log(`Time since last call: ${t0 - this.lastCall}ms`);
    this.lastCall = t0;
    return this;
  }


  accept(input) {
    this.step();
    this.handleInput(input);
    return this;
  }

  clone() {
    const newSimulator = new Simulator();
    newSimulator.units = this.units.map(unit => ({ ...unit }));
    return newSimulator;
  }

  validMove(unit, dx, dy) {
    if (!unit) return false;
    const newX = unit.pos.x + dx;
    const newY = unit.pos.y + dy;
    if (newX < 0 || newX >= this.fieldWidth || newY < 0 || newY >= this.fieldHeight) return false;
    const blocker = this.units.find(u => u !== unit && u.pos.x === newX && u.pos.y === newY);
    if (!blocker) return true;
    return false;
  }

  creatureById(id) {
    return this.units.find(unit => unit.id === id);
  }

  objEq(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    if (Object.keys(a).length !== Object.keys(b).length) return false;
    for (const key of Object.keys(a)) {
      if (!b.hasOwnProperty(key) || a[key] !== b[key]) return false;
    }
    return true;
  }

  delta(before: Unit, after: Unit): Partial<Unit> {
    if (before.id !== after.id) {
      throw new Error(`Unit IDs do not match: ${before.id} !== ${after.id}`);
    }
    // return a list of attributes that have changed
    const changes: Partial<Unit> = {};
    for (const key of Object.keys(before)) {
      if (!this.objEq(
        before[key], after[key]
      )) {
        changes[key] = after[key];
      }
    }
    return changes;
  }

  prettyPrint(val: any) {
    return (JSON.stringify(val, null, 2)||"").replace(/\n/g, '').replace(/ /g, '');
  }

  attrEmoji: { [key: string]: string } = {
    hp: '❤️',
    mass: '⚖️',
    pos: '📍',
    intendedMove: '➡️',
    intendedTarget: '🎯',
    state: '🛡️',
  }

  _debugUnits(unitsBefore: Unit[], phase: string) {
    let printedPhase = false;
    for (const u of this.units) {
      if (unitsBefore) {
        const before = unitsBefore.find(b => b.id === u.id);
        if (before) {
          let delta = this.delta(before, u);
          if (Object.keys(delta).length === 0) {
            continue; // No changes, skip detailed logging
          }
          if (!printedPhase) {
            // console.debug(`## ${phase}`);
            printedPhase = true;
          }
          let str = (`  ${u.id}`);
          Object.keys(delta).forEach(key => {
            let icon = this.attrEmoji[key] || '|';
            str += (` | ${icon} ${key}: ${this.prettyPrint(before[key])} → ${this.prettyPrint(u[key])}`);
          })
          // console.debug(str);

        }
      } else {
        console.debug(`  ${u.id}: (${u.pos.x},${u.pos.y})`, JSON.stringify(u));

      }
    }
  }

  handleInput(input) {
    for (const unit of this.units) {
      const command = input.commands[unit.id];
      if (command) {
        for (const cmd of command) {
          if (cmd.action === 'move') {
            unit.intendedMove = { x: 1, y: 0 };
          }
          if (cmd.action === 'fire' && cmd.target) {
            // Find target unit
            const target = this.units.find(u => u.id === cmd.target);
            if (target) {
              // Compute direction vector (normalized)
              const dx = target.pos.x - unit.pos.x;
              const dy = target.pos.y - unit.pos.y;
              const mag = Math.sqrt(dx * dx + dy * dy) || 1;
              const speed = 1; // Could be parameterized
              const vel = { x: (dx / mag) * speed, y: (dy / mag) * speed };
              this.projectiles.push({
                id: `proj_${unit.id}_${Date.now()}`,
                pos: { ...unit.pos },
                vel,
                radius: 1.5,
                damage: 5,
                team: unit.team
              });
            }
          }
        }
      }
    }
    return this;
  }

  unitAt(x: number, y: number): Unit | undefined {
    return this.units.find(u => u.pos.x === x && u.pos.y === y);
  }

  areaDamage(config: { pos: { x: number; y: number; }; radius: number; damage: number; team: string; }) {
    for (const unit of this.units) {
      if (unit.team !== config.team) {
        const dx = unit.pos.x - config.pos.x;
        const dy = unit.pos.y - config.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= config.radius) {
          unit.hp -= config.damage;
        }
      }
    }
  }
}

export { Simulator };