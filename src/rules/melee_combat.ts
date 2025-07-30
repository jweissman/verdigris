import { Rule } from "./rule";
import type { Unit } from "../sim/types";

export class MeleeCombat extends Rule {
  apply = () => this.pairwise((a: Unit, b: Unit) => {
    if (a.team !== b.team && a.state !== 'dead' && b.state !== 'dead') {
      const dx = a.pos.x - b.pos.x;
      const dy = a.pos.y - b.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1.1) {
        a.hp -= 1;
        b.hp -= 1;
      }
    }
  });
}
