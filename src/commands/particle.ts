import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

/**
 * Particle command - adds a particle effect
 * Params:
 *   particle: object - Particle data to add
 */
export class ParticleCommand extends Command {
  private transform: Transform;

  constructor(sim: any, transform: Transform) {
    super(sim);
    this.transform = transform;
  }

  execute(unitId: string | null, params: CommandParams): void {
    const particle = params.particle || params;
    if (!particle) {
      console.warn("ParticleCommand: No particle data provided");
      return;
    }

    const lifetime = particle.lifetime || particle.ttl || 100;

    this.sim.particleArrays.addParticle({
      id: particle.id,
      pos: particle.pos || { x: 0, y: 0 },
      vel: particle.vel || { x: 0, y: 0 },
      lifetime: lifetime,
      type: particle.type,
      color: particle.color,
      radius: particle.radius || particle.size || 0.5,
      z: particle.z || 0,
      landed: particle.landed || false,
      targetCell: particle.targetCell,
    });
  }
}
