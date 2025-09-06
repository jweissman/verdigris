import { Command, CommandParams } from "../rules/command";

/**
 * Rock Drop command - drops a rock from the sky onto a target cell
 * Params:
 *   targetX: number - X position to drop rock
 *   targetY: number - Y position to drop rock
 *   damage?: number - Damage on impact (default 50)
 *   radius?: number - AOE radius (default 2)
 */
export class RockDrop extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const targetX = params.targetX as number;
    const targetY = params.targetY as number;
    const damage = (params.damage as number) || 50;
    const radius = (params.radius as number) || 2;

    if (targetX === undefined || targetY === undefined) {
      console.warn("[RockDrop] No target position specified");
      return;
    }

    // Create a rock entity that falls from the sky
    const rockId = `rock_${this.sim.ticks}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Spawn the rock high above the target
    this.sim.queuedCommands.push({
      type: "spawn",
      params: {
        unit: {
          id: rockId,
          type: "effect",
          pos: { x: targetX, y: targetY },
          hp: 1,
          maxHp: 1,
          team: "neutral",
          kind: "rock",
          sprite: "rock",
          tags: ["effect", "projectile", "falling"],
          state: "idle",
          meta: {
            z: 30, // Start high in the sky
            falling: true,
            fallSpeed: 3,
            targetZ: 0,
            damage: damage,
            radius: radius,
            sourceId: unitId,
            lifetime: 10, // Remove after 10 ticks
          },
        },
      },
    });

    // Visual effect - shadow grows as rock falls
    for (let i = 0; i < 10; i++) {
      const delay = i;
      const shadowRadius = 0.5 + (i * 0.3);
      
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: targetX * 8 + 4, y: targetY * 8 + 4 },
            vel: { x: 0, y: 0 },
            radius: shadowRadius,
            color: "#000000",
            lifetime: 1,
            type: "shadow",
            alpha: 0.3,
            delay: delay,
          },
        },
      });
    }

    // Queue damage command for when rock lands (after 10 ticks)
    this.sim.scheduledCommands = this.sim.scheduledCommands || [];
    this.sim.scheduledCommands.push({
      tick: this.sim.ticks + 10,
      command: {
        type: "aoe",
        unitId: unitId,
        params: {
          x: targetX,
          y: targetY,
          radius: radius,
          damage: damage,
          type: "impact",
          aspect: "kinetic",
        },
      },
    });

    // Impact particles when rock lands
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: targetX * 8 + 4, y: targetY * 8 + 4 },
            vel: { 
              x: Math.cos(angle) * 3,
              y: Math.sin(angle) * 3 
            },
            radius: 1.5,
            color: "#8B7355", // Brown dust
            lifetime: 20,
            type: "dust",
            delay: 10, // Delay until impact
          },
        },
      });
    }

    console.log(`[RockDrop] Dropping rock at (${targetX}, ${targetY})`);
  }
}