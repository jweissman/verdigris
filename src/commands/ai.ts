import { Command } from "../rules/command";

/**
 * Higher-order 'ai' command - bulk AI processing and intent setting
 * Replaces individual target/pose commands with vectorized AI updates
 */
export class AICommand extends Command {
  
  execute(unitId: string | null, params: Record<string, any>): void {
    // This command operates on all units at once
    this.processAllAI();
  }
  
  private processAllAI(): void {
    if (!this.sim.unitArrays || !this.sim.performanceMode) {
      // Fallback to traditional processing
      return;
    }
    
    // Sync to SoA for vectorized processing
    this.sim.syncUnitsToArrays();
    const arrays = this.sim.unitArrays;
    
    // Vectorized targeting and AI processing
    for (let i = 0; i < arrays.activeCount; i++) {
      if (arrays.active[i] === 0) continue;
      if (arrays.state[i] === 3) continue; // Skip dead units
      
      const unit = arrays.units[i];
      if (!unit || !unit.tags) continue;
      
      // Process AI behaviors using SoA for speed
      if (unit.tags.includes('hunt')) {
        this.processHuntBehavior(i, arrays, unit);
      } else if (unit.tags.includes('swarm')) {
        this.processSwarmBehavior(i, arrays, unit);
      } else if (unit.tags.includes('wander')) {
        this.processWanderBehavior(i, arrays, unit);
      } else if (unit.tags.includes('follower')) {
        this.processFollowerBehavior(i, arrays, unit);
      }
    }
    
    // Sync intent changes back
    this.sim.syncPositionsFromArrays();
  }
  
  private processHuntBehavior(unitIndex: number, arrays: any, unit: any): void {
    let closestEnemyIndex = -1;
    let closestDistance = Infinity;
    
    const myX = arrays.posX[unitIndex];
    const myY = arrays.posY[unitIndex];
    const myTeam = arrays.team[unitIndex];
    
    // Vectorized enemy finding
    for (let j = 0; j < arrays.activeCount; j++) {
      if (arrays.active[j] === 0 || j === unitIndex) continue;
      if (arrays.team[j] === myTeam) continue; // Same team
      if (arrays.state[j] === 3) continue; // Dead
      
      const dx = arrays.posX[j] - myX;
      const dy = arrays.posY[j] - myY;
      const distance = dx * dx + dy * dy; // Skip sqrt for comparison
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestEnemyIndex = j;
      }
    }
    
    // Set movement intent towards closest enemy
    if (closestEnemyIndex !== -1) {
      const targetX = arrays.posX[closestEnemyIndex];
      const targetY = arrays.posY[closestEnemyIndex];
      
      const dx = targetX - myX;
      const dy = targetY - myY;
      
      // Set intended movement (normalized to grid movement)
      if (Math.abs(dx) > Math.abs(dy)) {
        arrays.intendedMoveX[unitIndex] = dx > 0 ? 1 : -1;
        arrays.intendedMoveY[unitIndex] = 0;
      } else if (Math.abs(dy) > 0) {
        arrays.intendedMoveX[unitIndex] = 0;
        arrays.intendedMoveY[unitIndex] = dy > 0 ? 1 : -1;
      }
    }
  }
  
  private processSwarmBehavior(unitIndex: number, arrays: any, unit: any): void {
    // Random chance to not move
    if (Math.random() < 0.15) {
      arrays.intendedMoveX[unitIndex] = 0;
      arrays.intendedMoveY[unitIndex] = 0;
      return;
    }
    
    const myX = arrays.posX[unitIndex];
    const myY = arrays.posY[unitIndex];
    const myTeam = arrays.team[unitIndex];
    
    let avgX = myX;
    let avgY = myY;
    let count = 1;
    
    // Find center of mass of nearby allies (vectorized)
    for (let j = 0; j < arrays.activeCount; j++) {
      if (arrays.active[j] === 0 || j === unitIndex) continue;
      if (arrays.team[j] !== myTeam) continue; // Different team
      if (arrays.state[j] === 3) continue; // Dead
      
      const dx = arrays.posX[j] - myX;
      const dy = arrays.posY[j] - myY;
      const distance = dx * dx + dy * dy;
      
      if (distance < 25) { // Within 5 units
        avgX += arrays.posX[j];
        avgY += arrays.posY[j];
        count++;
      }
    }
    
    if (count > 1) {
      avgX /= count;
      avgY /= count;
      
      // Move towards center of mass
      const dx = avgX - myX;
      const dy = avgY - myY;
      
      if (Math.abs(dx) >= 1) {
        arrays.intendedMoveX[unitIndex] = dx > 0 ? 1 : -1;
      } else {
        arrays.intendedMoveX[unitIndex] = 0;
      }
      
      if (Math.abs(dy) >= 1) {
        arrays.intendedMoveY[unitIndex] = dy > 0 ? 1 : -1;
      } else {
        arrays.intendedMoveY[unitIndex] = 0;
      }
    } else {
      // Wander if no allies nearby
      this.processWanderBehavior(unitIndex, arrays, unit);
    }
  }
  
  private processWanderBehavior(unitIndex: number, arrays: any, unit: any): void {
    if (Math.random() < 0.85) { // 85% chance to not move
      arrays.intendedMoveX[unitIndex] = 0;
      arrays.intendedMoveY[unitIndex] = 0;
    } else {
      // Random movement
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      const [dx, dy] = directions[Math.floor(Math.random() * directions.length)];
      arrays.intendedMoveX[unitIndex] = dx;
      arrays.intendedMoveY[unitIndex] = dy;
    }
  }
  
  private processFollowerBehavior(unitIndex: number, arrays: any, unit: any): void {
    let closestAllyIndex = -1;
    let closestDistance = Infinity;
    
    const myX = arrays.posX[unitIndex];
    const myY = arrays.posY[unitIndex];
    const myTeam = arrays.team[unitIndex];
    
    // Find closest ally
    for (let j = 0; j < arrays.activeCount; j++) {
      if (arrays.active[j] === 0 || j === unitIndex) continue;
      if (arrays.team[j] !== myTeam) continue; // Different team
      if (arrays.state[j] === 3) continue; // Dead
      
      const dx = arrays.posX[j] - myX;
      const dy = arrays.posY[j] - myY;
      const distance = dx * dx + dy * dy;
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestAllyIndex = j;
      }
    }
    
    // Move towards closest ally
    if (closestAllyIndex !== -1) {
      const targetX = arrays.posX[closestAllyIndex];
      const targetY = arrays.posY[closestAllyIndex];
      
      const dx = targetX - myX;
      const dy = targetY - myY;
      const mag = Math.sqrt(dx * dx + dy * dy) || 1;
      
      arrays.intendedMoveX[unitIndex] = Math.sign(dx / mag);
      arrays.intendedMoveY[unitIndex] = Math.sign(dy / mag);
    } else {
      // No allies, wander
      this.processWanderBehavior(unitIndex, arrays, unit);
    }
  }
}