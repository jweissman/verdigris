import { Projectile, Unit } from "./sim/types";
import { MeleeCombat } from "./rules/melee_combat";
import { Knockback } from "./rules/knockback";
import { ProjectileMotion } from "./rules/projectile_motion";
import { UnitMovement } from "./rules/unit_movement";
import { AreaOfEffect } from "./rules/area_of_effect";
import { Rule } from "./rules/rule";
import { UnitBehavior } from "./rules/unit_behavior";

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
      new AreaOfEffect(this),
      new MeleeCombat(this),
      new Knockback(this),
      new ProjectileMotion(this),
    ];
  }

  addUnit(unit: Unit) {
    this.units.push(unit);

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

  get rules() {
    return this.rulebook;
  }

  ticks = 0;
  step() {
    this.ticks++;
    console.log("# Step", this.ticks);
    this._debugUnits();

    for (const rule of this.rules) {
      // console.log(`## ${rule.constructor.name}`);
      rule.execute();
    }

    // Cull dead units from battlefield
    const beforeCount = this.units.length;
    this.units = this.units.filter(unit => unit.state !== 'dead');
    const afterCount = this.units.length;
    
    if (beforeCount !== afterCount) {
      const culled = beforeCount - afterCount;
      console.log(`🧹 Culled ${culled} dead unit${culled > 1 ? 's' : ''} from battlefield`);
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

  _debugUnits() {
    console.log('[sim.debugUnits] unit positions');
    for (const u of this.units) {
      console.log(`  ${u.id}: (${u.pos.x},${u.pos.y})`);
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