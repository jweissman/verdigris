import { Command, CommandParams } from "../rules/command";
import { Simulator } from "../core/simulator";

/**
 * Pin command - reinforces grapple to fully pin target
 * Params:
 *   x: number - Target X position (can also use targetX)
 *   y: number - Target Y position (can also use targetY)
 */
export class Pin extends Command {
  name = "pin";
  description = "Reinforce grapple to fully pin target";
  usage = "pin <x> <y> - Reinforce grapple at position to create full pin";

  execute(unitId: string | null, params: CommandParams): void {
    const targetX = (params.x ?? params.targetX) as number;
    const targetY = (params.y ?? params.targetY) as number;

    if (targetX === undefined || targetY === undefined) {
      return;
    }
    const grapplerID = unitId;

    if (
      typeof targetX !== "number" ||
      typeof targetY !== "number" ||
      isNaN(targetX) ||
      isNaN(targetY)
    ) {
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
      return;
    }

    if (!grappler.abilities || !grappler.abilities.includes("pinTarget")) {
      return;
    }

    const target = this.sim.units.find(
      (u) =>
        u.pos.x === targetX && u.pos.y === targetY && u.team !== grappler.team,
    );

    if (!target) {
      return;
    }

    if (!target.meta.grappled) {
      return;
    }

    if (target.meta.grappledBy !== grappler.id) {
      return;
    }

    const lastUsed = grappler.lastAbilityTick?.pinTarget || 0;
    const cooldown = 30; // Default cooldown for pinTarget from abilities.json
    const ticksSinceLastUse = this.sim.ticks - lastUsed;

    if (ticksSinceLastUse < cooldown) {
      return;
    }

    const distance = Math.sqrt(
      Math.pow(targetX - grappler.pos.x, 2) +
        Math.pow(targetY - grappler.pos.y, 2),
    );

    const maxRange = 8; // Default pin range
    if (distance > maxRange) {
      return;
    }

    this.sim.queuedCommands.push({
      type: "meta",
      params: {
        unitId: target.id,
        meta: {
          pinned: true,
          pinDuration: 50, // Duration in ticks
        },
      },
    });

    for (let i = 0; i < 8; i++) {
      this.sim.particleArrays.addParticle({
        pos: { x: targetX * 8 + 4, y: targetY * 8 + 4 },
        vel: {
          x: (Simulator.rng.random() - 0.5) * 2,
          y: (Simulator.rng.random() - 0.5) * 2,
        },
        radius: 0.5 + Simulator.rng.random() * 0.5,
        lifetime: 20 + Simulator.rng.random() * 10,
        color: "#FF6600",
        type: "pin",
      });
    }

    this.sim.queuedCommands.push({
      type: "meta",
      params: {
        unitId: grappler.id,
        meta: {
          lastAbilityTick: {
            ...grappler.lastAbilityTick,
            pinTarget: this.sim.ticks,
          },
        },
      },
    });
  }
}
