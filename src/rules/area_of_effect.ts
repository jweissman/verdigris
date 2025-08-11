import { Rule } from "./rule";

export class AreaOfEffect extends Rule {

  apply = () => {
    // Queue damage and knockback events for projectile AoE
    for (const proj of this.sim.projectiles) {
      for (const unit of this.sim.getRealUnits()) {
        if (unit.team !== proj.team && unit.state !== 'dead') {
          const dx = unit.pos.x - proj.pos.x;
          const dy = unit.pos.y - proj.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= (proj.radius || 5)) {
            // Queue damage event
            this.sim.queuedEvents.push({
              kind: 'damage',
              source: proj.id,
              target: unit.id,
              meta: {
                amount: proj.damage || 5,
                aspect: 'explosion'
              }
            });
            
            // Queue knockback event
            const knockback = 6.5;
            const nx = (dx / dist || 1) * knockback;
            const ny = (dy / dist || 1) * knockback;
            this.sim.queuedEvents.push({
              kind: 'knockback',
              source: proj.id,
              target: unit.id,
              meta: {
                force: { x: nx, y: ny }
              }
            });
          }
        }
      }
    }
  }
}
