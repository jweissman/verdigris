import { Command, CommandParams } from "../rules/command";

/**
 * Grapple command - fires grappling hook at target
 * Params:
 *   x: number - Target X position (can also use targetX)
 *   y: number - Target Y position (can also use targetY)
 */
export class Grapple extends Command {
  name = "grapple";
  description = "Fire grappling hook at target position or enemy";
  usage = "grapple <x> <y> - Fire grappling hook at position (x, y)";

  execute(unitId: string | null, params: CommandParams): void {
    const targetX = (params.x ?? params.targetX) as number;
    const targetY = (params.y ?? params.targetY) as number;

    if (targetX === undefined || targetY === undefined) {
      console.error("Grapple command requires x and y coordinates");
      throw new Error("Grapple command requires x and y coordinates");
    }
    const grapplerID = unitId;

    if (
      typeof targetX !== "number" ||
      typeof targetY !== "number" ||
      isNaN(targetX) ||
      isNaN(targetY)
    ) {
      console.error("Invalid coordinates for grapple command");
      return;
    }

    let grappler = this.sim.units.find((u) => u.id === grapplerID);

    if (!grappler) {
      grappler = this.sim.units.find(
        (u) =>
          u.team === "friendly" && u.tags?.includes("grappler") && u.hp > 0,
      );
    }

    if (!grappler) {
      console.error("No available grappler found for grapple command");
      return;
    }

    if (!grappler.abilities || !grappler.abilities.includes("grapplingHook")) {
      console.error(`${grappler.id} does not have grappling hook ability`);
      return;
    }

    const distance = Math.sqrt(
      Math.pow(targetX - grappler.pos.x, 2) +
        Math.pow(targetY - grappler.pos.y, 2),
    );

    const maxRange = 8; // Default range for grappling hook
    if (distance > maxRange) {
      return;
    }

    if (unitId !== grapplerID) {
      const lastUsed = grappler.lastAbilityTick?.grapplingHook || 0;
      const cooldown = 30; // Default cooldown for grappling hook from abilities.json
      const ticksSinceLastUse = this.sim.ticks - lastUsed;

      if (ticksSinceLastUse < cooldown) {
        const remainingCooldown = cooldown - ticksSinceLastUse;
        console.error(
          `Grappling hook is on cooldown for ${remainingCooldown} more ticks`,
        );
        return;
      }
    }

    const targetPos = { x: targetX, y: targetY };

    const dx = targetPos.x - grappler.pos.x;
    const dy = targetPos.y - grappler.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 2;
    const vel = {
      x: (dx / dist) * speed,
      y: (dy / dist) * speed,
    };

    this.sim.projectiles.push({
      id: `grapple_${grappler.id}_${this.sim.ticks}`,
      pos: { ...grappler.pos },
      vel,
      radius: 1.5, // Larger radius to ensure collision detection with fast movement
      damage: 0,
      team: grappler.team,
      type: "grapple",
      sourceId: grappler.id,
      target: targetPos,
    });

    this.sim.queuedCommands.push({
      type: "meta",
      params: {
        unitId: grappler.id,
        meta: {
          lastAbilityTick: {
            ...grappler.lastAbilityTick,
            grapplingHook: this.sim.ticks,
          },
        },
      },
    });
  }
}
