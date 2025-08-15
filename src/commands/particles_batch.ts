import { Command, CommandParams } from '../rules/command';
import { Transform } from '../core/transform';

/**
 * ParticlesBatch command - adds multiple particles at once
 * Params:
 *   particles: array - Array of particle data to add
 */
export class ParticlesBatchCommand extends Command {
  private transform: Transform;
  
  constructor(sim: any, transform: Transform) {
    super(sim);
    this.transform = transform;
  }

  execute(unitId: string | null, params: CommandParams): void {
    const particles = params.particles;
    if (!particles || !Array.isArray(particles)) {
      console.warn('ParticlesBatchCommand: No particles array provided');
      return;
    }

    // Add all particles to SoA arrays
    for (const particle of particles) {
      this.sim.particleArrays.addParticle(particle);
    }
  }
}