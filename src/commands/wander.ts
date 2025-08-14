import { Command } from "./command";
import { Simulator } from "../core/simulator";

/**
 * Wander command - makes units move randomly
 * Parameters:
 *   team: string - Which team should wander (friendly, hostile, all)
 *   chance: number - Probability of wandering each tick (0-1)
 */
export const wander: Command = {
  execute(sim: Simulator, params: any): void {
    const team = params.team || 'all';
    const chance = parseFloat(params.chance) || 0.1;
    
    // Filter units by team
    const units = sim.units.filter(u => {
      if (team === 'all') return true;
      return u.team === team;
    });
    
    // Make each unit potentially wander
    for (const unit of units) {
      if (unit.state === 'dead') continue;
      
      // Only wander if not engaged in combat
      const hasNearbyEnemy = sim.units.some(other => 
        other.team !== unit.team && 
        other.state !== 'dead' &&
        Math.abs(other.pos.x - unit.pos.x) <= 3 &&
        Math.abs(other.pos.y - unit.pos.y) <= 3
      );
      
      if (!hasNearbyEnemy && Simulator.rng.random() < chance) {
        // Random small movement
        const dx = Math.floor(Simulator.rng.random() * 3 - 1); // -1, 0, or 1
        const dy = Math.floor(Simulator.rng.random() * 3 - 1);
        
        // Check bounds
        const newX = unit.pos.x + dx;
        const newY = unit.pos.y + dy;
        
        if (newX >= 0 && newX < sim.fieldWidth && 
            newY >= 0 && newY < sim.fieldHeight) {
          unit.intendedMove = { x: dx, y: dy };
        }
      }
    }
  }
};