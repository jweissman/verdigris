import { Command } from "../rules/command";

/**
 * Higher-order 'forces' command - bulk kinematics and physics processing
 * Replaces individual move commands with vectorized physics updates
 */
export class ForcesCommand extends Command {
  
  execute(unitId: string | null, params: Record<string, any>): void {
    // This command operates on all units at once
    this.applyAllForces();
  }
  
  private applyAllForces(): void {
    if (!this.sim.unitArrays || !this.sim.performanceMode) {
      // Fallback to traditional processing
      return;
    }
    
    // Sync to SoA for vectorized processing
    this.sim.syncUnitsToArrays();
    const arrays = this.sim.unitArrays;
    
    // Vectorized movement application - process ALL units at once
    for (let i = 0; i < arrays.activeCount; i++) {
      if (arrays.active[i] === 0) continue;
      if (arrays.state[i] === 3) continue; // Skip dead units
      
      // Apply intended movement (kinematics)
      const newX = arrays.posX[i] + arrays.intendedMoveX[i];
      const newY = arrays.posY[i] + arrays.intendedMoveY[i];
      
      // Clamp to field bounds
      arrays.posX[i] = Math.max(0, Math.min(this.sim.fieldWidth - 1, newX));
      arrays.posY[i] = Math.max(0, Math.min(this.sim.fieldHeight - 1, newY));
      
      // Clear intended movement after applying
      arrays.intendedMoveX[i] = 0;
      arrays.intendedMoveY[i] = 0;
    }
    
    // Vectorized collision resolution - all at once
    this.resolveAllCollisions(arrays);
    
    // Sync back to Unit objects
    this.sim.syncPositionsFromArrays();
  }
  
  private resolveAllCollisions(arrays: any): void {
    // Ultra-fast collision detection using SoA
    const collisions = arrays.detectCollisions(1.0);
    
    // Process all collisions in batch
    for (const [i, j] of collisions) {
      if (arrays.state[i] === 3 || arrays.state[j] === 3) continue;
      
      // Determine priority (mass + hp)
      const priorityI = arrays.mass[i] * 10 + arrays.hp[i];
      const priorityJ = arrays.mass[j] * 10 + arrays.hp[j];
      
      const displacedIndex = priorityI > priorityJ ? j : i;
      
      // Find displacement
      const x = arrays.posX[displacedIndex];
      const y = arrays.posY[displacedIndex];
      
      // Try immediate displacement without validation overhead
      const displacements = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      
      for (const [dx, dy] of displacements) {
        const newX = x + dx;
        const newY = y + dy;
        
        // Quick bounds check
        if (newX >= 0 && newX < this.sim.fieldWidth && 
            newY >= 0 && newY < this.sim.fieldHeight) {
          arrays.posX[displacedIndex] = newX;
          arrays.posY[displacedIndex] = newY;
          break;
        }
      }
    }
  }
}