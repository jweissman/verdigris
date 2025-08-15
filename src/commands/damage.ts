import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

/**
 * Damage command - deals damage to a target unit
 * Params:
 *   targetId: string - ID of the unit to damage
 *   amount: number - Amount of damage to deal
 *   aspect?: string - Type of damage (physical, radiant, fire, etc.)
 *   origin?: {x: number, y: number} - Origin point of damage for directional effects
 */
export class Damage extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const targetId = params.targetId as string;
    const amount = params.amount as number;
    const aspect = (params.aspect as string) || 'physical';
    const origin = params.origin as {x: number, y: number} | undefined;
    
    const target = this.sim.units.find(u => u.id === targetId);
    if (!target) {
      console.warn(`Damage command: target ${targetId} not found`);
      return;
    }

    if (typeof amount !== 'number' || isNaN(amount)) {
      console.warn(`Damage command: invalid amount ${amount}`);
      return;
    }

    // Apply damage using Transform - use updateUnit for efficiency
    const transform = this.sim.getTransform();
    
    // Check perdurance for damage resistance
    let finalDamage = amount;
    const perdurance = target.meta?.perdurance;
    if (perdurance) {
      // Spectral units (ghosts) are immune to physical damage
      if (perdurance === 'spectral' && aspect === 'physical') {
        return; // No damage
      }
      // Undead units (skeletons) are immune to physical damage
      if (perdurance === 'undead' && aspect === 'physical') {
        return; // No damage
      }
      // Fiendish units (demons) resist physical and fire
      if (perdurance === 'fiendish' && (aspect === 'physical' || aspect === 'fire')) {
        finalDamage = Math.floor(finalDamage * 0.5); // 50% resistance
      }
      // Sturdiness caps all damage to 1
      if (perdurance === 'sturdiness') {
        finalDamage = 1;
      }
    }
    
    const newHp = Math.max(0, target.hp - finalDamage); // Clamp HP to minimum 0
    
    // Update target unit
    transform.updateUnit(targetId, {
      hp: newHp,
      state: newHp <= 0 ? 'dead' : target.state,
      meta: {
        ...target.meta,
        impactFrame: this.sim.ticks
      }
    });
    
    // Mark attacker for impact frame too if specified
    if (params.sourceId) {
      const sourceId = params.sourceId as string;
      const source = this.sim.units.find(u => u.id === sourceId);
      if (source) {
        transform.updateUnit(sourceId, {
          meta: {
            ...source.meta,
            impactFrame: this.sim.ticks
          }
        });
      }
    }
  }
}