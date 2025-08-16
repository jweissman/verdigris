import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "./command_handler";

export class AreaOfEffect extends Rule {
  private commands: QueuedCommand[] = [];

  constructor() {
    super();
  }

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    const unitsWithAoE = context
      .getAllUnits()
      .filter(
        (unit) =>
          unit.meta?.exploding || unit.meta?.aoeEffect || unit.meta?.detonating,
      );

    for (const explosiveUnit of unitsWithAoE) {
      if (explosiveUnit.meta?.exploding) {
        this.handleExplosion(context, explosiveUnit);
      }
      if (explosiveUnit.meta?.aoeEffect) {
        this.handleAoEEffect(context, explosiveUnit);
      }
    }
    return this.commands;
  }

  private handleExplosion(context: TickContext, explosiveUnit: any): void {
    const radius = explosiveUnit.meta.explosionRadius || 5;
    const damage = explosiveUnit.meta.explosionDamage || 5;

    for (const unit of context.getAllUnits()) {
      if (unit.team !== explosiveUnit.team && unit.state !== "dead") {
        const dx = unit.pos.x - explosiveUnit.pos.x;
        const dy = unit.pos.y - explosiveUnit.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          context.queueEvent({
            kind: "damage",
            source: explosiveUnit.id,
            target: unit.id,
            meta: {
              amount: damage,
              aspect: "explosion",
            },
          });

          const knockback = 6.5;
          const nx = (dx / dist || 1) * knockback;
          const ny = (dy / dist || 1) * knockback;
          context.queueEvent({
            kind: "knockback",
            source: explosiveUnit.id,
            target: unit.id,
            meta: {
              force: { x: nx, y: ny },
            },
          });
        }
      }
    }

    this.commands.push({
      type: "meta",
      params: {
        unitId: explosiveUnit.id,
        meta: {
          exploding: false,
          explosionRadius: undefined,
          explosionDamage: undefined,
        },
      },
    });
  }

  private handleAoEEffect(context: TickContext, unit: any): void {
    const aoe = unit.meta.aoeEffect;
    const targetPos = aoe.target || unit.pos;
    const radius = aoe.radius || 3;
    const damage = aoe.damage || 10;
    const force = aoe.force || 5;

    for (const target of context.getAllUnits()) {
      if (target.team !== unit.team && target.state !== "dead") {
        const dx = target.pos.x - targetPos.x;
        const dy = target.pos.y - targetPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const damageMultiplier = 1 - dist / (radius * 2);
          const actualDamage = Math.floor(damage * damageMultiplier);

          context.queueEvent({
            kind: "damage",
            source: unit.id,
            target: target.id,
            meta: {
              amount: actualDamage,
              aspect: aoe.aspect || "physical",
            },
          });

          if (force > 0 && dist > 0) {
            const knockbackForce = force * (1 - dist / radius);
            const nx = (dx / dist) * knockbackForce;
            const ny = (dy / dist) * knockbackForce;
            context.queueEvent({
              kind: "knockback",
              source: unit.id,
              target: target.id,
              meta: {
                force: { x: nx, y: ny },
              },
            });
          }
        }
      }
    }

    this.commands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          aoeEffect: undefined,
        },
      },
    });
  }
}
