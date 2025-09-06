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
    let targetX = params.targetX as number;
    let targetY = params.targetY as number;
    const damage = (params.damage as number) || 50;
    const radius = (params.radius as number) || 2;

    // If no target specified, use the unit's position
    if ((targetX === undefined || targetY === undefined) && unitId) {
      const unit = this.sim.units.find(u => u.id === unitId);
      if (!unit) {
        console.warn("[RockDrop] No target position and unit not found");
        return;
      }
      targetX = unit.pos.x;
      targetY = unit.pos.y;
    }

    if (targetX === undefined || targetY === undefined) {
      console.warn("[RockDrop] No target position specified");
      return;
    }

    // Create a rock entity that falls from the sky
    const rockId = `rock_${this.sim.ticks}_${Math.random().toString(36).substring(2, 7)}`;
    
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

    // The rock entity itself will handle damage when it lands
    // via the falling mechanics in the rules system

    // No impact particles - keep it simple

    console.log(`[RockDrop] Dropping rock at (${targetX}, ${targetY})`);
  }
}