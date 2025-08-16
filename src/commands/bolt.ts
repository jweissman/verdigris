import { Command, CommandParams } from "../rules/command";

/**
 * Bolt command - creates a single lightning strike
 * Params:
 *   x?: number - X position for strike (optional, random if not provided)
 *   y?: number - Y position for strike (optional, random if not provided)
 */
export class BoltCommand extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const x = params.x as number | undefined;
    const y = params.y as number | undefined;

    const strikePos =
      x !== undefined && y !== undefined
        ? { x, y }
        : {
            x: Math.floor(Math.random() * this.sim.fieldWidth),
            y: Math.floor(Math.random() * this.sim.fieldHeight),
          };

    const pixelX = strikePos.x * 8 + 4;
    const pixelY = strikePos.y * 8 + 4;

    for (let i = 0; i < 8; i++) {
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: pixelX + (Math.random() - 0.5) * 3, y: pixelY - i * 4 },
            vel: { x: 0, y: 0 },
            radius: 1 + Math.random() * 2,
            color: i < 2 ? "#FFFFFF" : i < 4 ? "#CCCCFF" : "#8888FF",
            lifetime: 8 + Math.random() * 4,
            type: "lightning",
          },
        },
      });
    }

    for (let branch = 0; branch < 4; branch++) {
      const branchAngle = Math.random() * Math.PI * 2;
      const branchLength = 2 + Math.random() * 3;

      for (let i = 0; i < branchLength; i++) {
        this.sim.queuedCommands.push({
          type: "particle",
          params: {
            particle: {
              pos: {
                x: pixelX + Math.cos(branchAngle) * i * 8,
                y: pixelY + Math.sin(branchAngle) * i * 8,
              },
              vel: { x: 0, y: 0 },
              radius: 0.5 + Math.random(),
              color: "#AAAAFF",
              lifetime: 6 + Math.random() * 3,
              type: "lightning_branch",
            },
          },
        });
      }
    }

    for (let i = 0; i < 12; i++) {
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: pixelX, y: pixelY },
            vel: {
              x: (Math.random() - 0.5) * 2,
              y: (Math.random() - 0.5) * 2,
            },
            radius: 0.5,
            color: "#CCCCFF",
            lifetime: 15 + Math.random() * 10,
            type: "electric_spark",
          },
        },
      });
    }

    this.sim.queuedEvents.push({
      kind: "aoe",
      source: "lightning",
      target: strikePos,
      meta: {
        aspect: "emp",
        radius: 3,
        stunDuration: 20,
        amount: 0,
        mechanicalImmune: true,
      },
    });

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const radius = 2 + Math.random();

      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: pixelX, y: pixelY },
            vel: {
              x: Math.cos(angle) * 0.5,
              y: Math.sin(angle) * 0.5,
            },
            radius: radius,
            color: "#444488",
            lifetime: 20 + Math.random() * 15,
            type: "thunder_ring",
          },
        },
      });
    }
  }
}
