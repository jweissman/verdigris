import { Rule } from "./rule";

export class AreaOfEffect extends Rule {

  apply = () => {
    const effects: Record<string, { hp: number; x: number; y: number }> = {};
    for (const proj of this.sim.projectiles) {
      for (const unit of this.sim.getRealUnits()) {
        if (unit.team !== proj.team && unit.state !== 'dead') {
          const dx = unit.pos.x - proj.pos.x;
          const dy = unit.pos.y - proj.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= (proj.radius || 5)) {
            if (!effects[unit.id]) effects[unit.id] = { hp: 0, x: 0, y: 0 };
            effects[unit.id].hp -= proj.damage || 5;
            const knockback = 6.5;
            const nx = dx / dist || 1;
            const ny = dy / dist || 1;
            effects[unit.id].x += nx * knockback;
            effects[unit.id].y += ny * knockback;
          }
        }
      }
    }

    this.sim.units = this.sim.units.map(unit => {
      if (effects[unit.id]) {
        return {
          ...unit,
          hp: unit.hp + effects[unit.id].hp,
          pos: {
            x: unit.pos.x + effects[unit.id].x,
            y: unit.pos.y + effects[unit.id].y
          }
        };
      }
      return unit;
    });
  }
}
