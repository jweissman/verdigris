import { Rule } from "./rule";
import type { Unit } from "../sim/types";

export class Knockback extends Rule {
  apply = () => this.pairwise((a: Unit, b: Unit) => {
    if (a.state !== 'dead' && b.state !== 'dead' && a.mass && b.mass && a.mass > b.mass) {
      const dx = a.pos.x - b.pos.x;
      const dy = a.pos.y - b.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1.1) {
        const knockback = 1.5;
        const nx = (b.pos.x - a.pos.x) / (dist || 1);
        const ny = (b.pos.y - a.pos.y) / (dist || 1);
        b.pos.x += nx * knockback;
        b.pos.y += ny * knockback;
        b.pos.x = Math.round(b.pos.x);
        b.pos.y = Math.round(b.pos.y);
        // clamp to field bounds if necessary
        b.pos.x = Math.max(0, Math.min(b.pos.x, this.sim.fieldWidth - 1));
        b.pos.y = Math.max(0, Math.min(b.pos.y, this.sim.fieldHeight - 1));
      }
    }
  });
}
