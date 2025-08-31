import { Command, CommandParams } from "../rules/command";

/**
 * FireTrail command - leaves a trail of fire behind a unit as it moves
 * Params:
 *   duration?: number - How long the trail effect lasts (default 30 ticks)
 *   temperature?: number - Temperature of the fire trail (default 300)
 *   damage?: number - Damage per tick to units in the trail (default 2)
 */
export class FireTrailCommand extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    if (!unitId) return;

    const unit = this.sim.units.find((u) => u.id === unitId);
    if (!unit) return;

    const duration = (params.duration as number) || 30;
    const temperature = (params.temperature as number) || 300;
    const damage = (params.damage as number) || 2;

    // Enable fire trail on the unit
    unit.meta = unit.meta || {};
    unit.meta.fireTrailActive = true;
    unit.meta.fireTrailDuration = duration;
    unit.meta.fireTrailTemperature = temperature;
    unit.meta.fireTrailDamage = damage;
    unit.meta.lastTrailPos = { x: unit.pos.x, y: unit.pos.y };

    // Visual feedback
    this.sim.particleArrays.addParticle({
      id: `trail_start_${this.sim.ticks}`,
      type: "fire",
      pos: {
        x: unit.pos.x * 8 + 4,
        y: unit.pos.y * 8 + 4,
      },
      vel: { x: 0, y: -1 },
      radius: 3,
      color: "#FF6600",
      lifetime: 20,
    });
  }
}
