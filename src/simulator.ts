import { Projectile, Unit } from "./sim/types";
import { MeleeCombat } from "./rules/melee_combat";
import { Knockback } from "./rules/knockback";
import { ProjectileMotion } from "./rules/projectile_motion";
import { UnitMovement } from "./rules/unit_movement";
import { AreaOfEffect } from "./rules/area_of_effect";
import { Rule } from "./rules/rule";
import { UnitBehavior } from "./rules/unit_behavior";
import Cleanup from "./rules/cleanup";

class Simulator {
  fieldWidth: number;
  fieldHeight: number;

  units: Unit[];
  projectiles: Projectile[];
  rulebook: Rule[];

  constructor(fieldWidth = 128, fieldHeight = 128) {
    console.log(`Initializing simulator with field size: ${fieldWidth}x${fieldHeight}`);
    this.fieldWidth = fieldWidth;
    this.fieldHeight = fieldHeight;
    this.units = [];
    this.projectiles = [];
    this.rulebook = [
      new UnitBehavior(this),
      new UnitMovement(this),
      new MeleeCombat(this),
      new ProjectileMotion(this),
      new AreaOfEffect(this),
      new Knockback(this),
      new Cleanup(this)
    ];
  }

  addUnit(unit: Unit) {
    this.units.push({ ...unit, maxHp: unit.hp || 100 });

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

  // get rules() {
  //   return this.rulebook;
  // }

  ticks = 0;
  step() {
    this.ticks++;
    // console.log("# Step", this.ticks);
    let lastUnits = [...this.units];

    for (const rule of this.rulebook) {
      // console.log(`## ${rule.constructor.name}`);
      rule.execute();
      this._debugUnits(lastUnits, rule.constructor.name);
      // lastUnits = [...this.units]; // Update lastUnits after each rule execution
      lastUnits = this.units.map(u => ({ ...u }));
    }


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
    // Try to push the blocker in the same direction ONLY if the next cell is empty
    const pushX = blocker.pos.x + dx;
    const pushY = blocker.pos.y + dy;
    if (pushX < 0 || pushX >= this.fieldWidth || pushY < 0 || pushY >= this.fieldHeight) return false;
    const nextCellOccupied = this.units.some(u => u !== blocker && u.pos.x === pushX && u.pos.y === pushY);
    if (nextCellOccupied) return false;
    return true;
  }

  tryMove(unit, dx, dy) {
    if (!this.validMove(unit, dx, dy)) return false;
    const newX = unit.pos.x + dx;
    const newY = unit.pos.y + dy;
    const blocker = this.units.find(u => u !== unit && u.pos.x === newX && u.pos.y === newY);
    if (!blocker) {
      unit.pos.x = newX;
      unit.pos.y = newY;
      return true;
    }
    // Push the blocker
    blocker.pos.x += dx;
    blocker.pos.y += dy;
    unit.pos.x = newX;
    unit.pos.y = newY;
    return true;
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
      )) { //before[key] !== after[key]) {
        // console.log(`Delta: ${before.id} ${key} changed from ${before[key]} to ${after[key]}`);
        changes[key] = after[key];
      }
    }
    return changes;  //{ ...changes };
  }

  prettyPrint(val: any) {
    return JSON.stringify(val, null, 2).replace(/\n/g, '').replace(/ /g, '');
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
    // console.log('[sim.debugUnits] unit positions');
    let printedPhase = false;
    for (const u of this.units) {
      if (unitsBefore) {
        const before = unitsBefore.find(b => b.id === u.id);
        if (before) {
          let delta = this.delta(before, u);
          if (Object.keys(delta).length === 0) {
            // console.log(`  ${u.id}: (${u.pos.x},${u.pos.y})`, 'state:', u.state);
            continue; // No changes, skip detailed logging
          }
          if (!printedPhase) {
            console.log(`## ${phase}`);
            printedPhase = true;
          }
          let str = (`  ${u.id}`);
          Object.keys(delta).forEach(key => {
            let icon = this.attrEmoji[key] || '|';
            str += (` | ${icon} ${key}: ${this.prettyPrint(before[key])} → ${this.prettyPrint(u[key])}`);
          })
          console.log(str);

        }
      } else {
        console.log(`  ${u.id}: (${u.pos.x},${u.pos.y})`, JSON.stringify(u));

      }
        // `| posture: ${u.posture || '--'}`,
        // `| state: ${u.state}`,
        // `| intendedMove: (${u.intendedMove?.x ?? '--'},${u.intendedMove?.y ?? '--'})`,
        // u.intendedTarget ? `→ ${u.intendedTarget}` : '');
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
}

export { Simulator };