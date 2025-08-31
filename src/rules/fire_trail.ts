import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

/**
 * FireTrail rule - creates fire at positions where units with active fire trails move
 */
export class FireTrail extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];

    for (const unit of context.getAllUnits()) {
      if (unit.meta?.fireTrailActive && unit.meta?.fireTrailDuration > 0) {
        // Check if unit has moved
        const lastPos = unit.meta.lastTrailPos;
        if (lastPos && (lastPos.x !== unit.pos.x || lastPos.y !== unit.pos.y)) {
          // Leave fire at the previous position
          commands.push({
            type: "temperature",
            params: {
              x: lastPos.x,
              y: lastPos.y,
              amount: unit.meta.fireTrailTemperature || 300,
            },
          });

          // Add fire particles
          commands.push({
            type: "particle",
            params: {
              pos: {
                x: lastPos.x * 8 + 4,
                y: lastPos.y * 8 + 4,
              },
              vel: { x: 0, y: -0.5 },
              lifetime: 30,
              type: "fire",
              color: "#FF4500",
              radius: 2,
            },
          });

          // Deal damage to units at that position
          const unitsAtPos = context
            .getAllUnits()
            .filter(
              (u) =>
                u.id !== unit.id &&
                u.pos.x === lastPos.x &&
                u.pos.y === lastPos.y &&
                u.hp > 0,
            );

          for (const target of unitsAtPos) {
            commands.push({
              type: "damage",
              params: {
                targetId: target.id,
                amount: unit.meta.fireTrailDamage || 2,
                source: unit.id,
                aspect: "fire",
              },
            });
          }

          // Update last position
          unit.meta.lastTrailPos = { x: unit.pos.x, y: unit.pos.y };
        }

        // Decrement duration
        unit.meta.fireTrailDuration--;

        // Deactivate when duration expires
        if (unit.meta.fireTrailDuration <= 0) {
          unit.meta.fireTrailActive = false;
          delete unit.meta.fireTrailDuration;
          delete unit.meta.fireTrailTemperature;
          delete unit.meta.fireTrailDamage;
          delete unit.meta.lastTrailPos;
        }
      }
    }

    return commands;
  }
}
