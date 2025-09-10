import { Command } from "../rules/command";
import { ParticleParams } from "../types/CommandParams";
import { Transform } from "../core/transform";
import { Vec2 } from "../types/Vec2";

/**
 * Particle command - adds a particle effect
 * Params:
 *   particle: object - Particle data to add
 */
export class ParticleCommand extends Command<ParticleParams> {
  private transform: Transform;

  constructor(sim: any, transform: Transform) {
    super(sim);
    this.transform = transform;
  }

  execute(unitId: string | null, params: ParticleParams): void {
    // Support both nested particle object and direct params
    const particleData = params.particle || {
      pos: params.pos || { x: 0, y: 0 },
      vel: params.vel || { x: 0, y: 0 },
      lifetime: params.lifetime || 100,
      type: params.type || "generic",
      color: params.color || "#FFFFFF",
      radius: params.radius || 0.5,
      z: params.z || 0,
    };

    if (!particleData) {
      console.warn("ParticleCommand: No particle data provided");
      return;
    }

    const lifetime = particleData.lifetime || 100;

    this.sim.particleArrays.addParticle({
      id: (particleData as any).id,
      pos: particleData.pos || { x: 0, y: 0 },
      vel: particleData.vel || { x: 0, y: 0 },
      lifetime: lifetime,
      type: particleData.type || "generic",
      color: particleData.color || "#FFFFFF",
      radius: particleData.radius || 0.5,
      z: particleData.z || 0,
      landed: (particleData as any).landed || false,
      targetCell: (particleData as any).targetCell,
    });
  }
}
