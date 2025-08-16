import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import { Command } from "./command";
import type { QueuedCommand } from "./command_handler";

export class AirdropPhysics extends Rule {
  constructor() {
    super();
  }
  execute(context: TickContext): QueuedCommand[] {
    context.getAllUnits().forEach((unit) => {
      if (unit.meta.dropping && unit.meta.z > 0) {
        const newZ = unit.meta.z - (unit.meta.dropSpeed || 0.5);

        if (context.getCurrentTick() % 3 === 0) {
          commands.push({
            type: "particle",
            params: {
              particle: {
                pos: {
                  x: unit.pos.x + (context.getRandom() - 0.5) * 2,
                  y: unit.pos.y + (context.getRandom() - 0.5) * 2,
                },
                vel: { x: (context.getRandom() - 0.5) * 0.4, y: 0.8 },
                radius: 0.5,
                lifetime: 15,
                color: "#AAAAAA",
                z: unit.meta.z + 1,
                type: "debris",
                landed: false,
              },
            },
          });
        }

        if (newZ <= 0) {
          this.handleLanding(context, unit);
        } else {
          commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                z: newZ,
              },
            },
          });
        }
      }
    });
    const commands: QueuedCommand[] = [];
    // TODO: Implement actual logic
    return commands;
  }

  private handleLanding(context: TickContext, unit: any): void {
    const shouldApplyImpact = unit.meta.landingImpact;

    commands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          z: 0,
          dropping: false,
          landingImpact: false,
          dropSpeed: 0,
          landingInvulnerability: 10, // 1.25 seconds of invulnerability after landing
        },
      },
    });

    if (shouldApplyImpact) {
      const impactRadius = unit.meta.huge ? 8 : 4; // Larger impact for huge units
      const impactDamage = unit.meta.huge ? 25 : 15;

      context.queueEvent({
        kind: "aoe",
        source: unit.id,
        target: unit.pos,
        meta: {
          aspect: "kinetic",
          radius: impactRadius,
          amount: impactDamage,
          force: 8, // Strong knockback
          origin: unit.pos,
        },
      });
    }

    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const distance = 2 + context.getRandom() * 3;

      commands.push({
        type: "particle",
        params: {
          particle: {
            pos: {
              x: unit.pos.x + Math.cos(angle) * distance,
              y: unit.pos.y + Math.sin(angle) * distance,
            },
            vel: {
              x: Math.cos(angle) * 0.8,
              y: Math.sin(angle) * 0.8,
            },
            radius: 1 + context.getRandom(),
            lifetime: 30 + context.getRandom() * 20,
            color: "#8B4513", // Brown dust
            z: 0,
            type: "debris",
            landed: false,
          },
        },
      });
    }
  }
}
