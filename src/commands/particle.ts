import { Command, CommandParams } from '../rules/command';
import { Transform } from '../core/transform';

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
    const particle = params.particle;
    if (!particle) {
      console.warn('ParticleCommand: No particle data provided');
      return;
    }

    // Add particle to SoA arrays
    this.sim.particleArrays.addParticle(particle);
  }
}