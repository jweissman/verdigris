import { Command, CommandParams } from "../rules/command";
import Encyclopaedia from "../dmg/encyclopaedia";

/**
 * Deploy command - deploys a unit at specified position
 * Params:
 *   unitType: string - Type of unit to deploy
 *   x?: number - X position (optional, auto-calculates if not provided)
 *   y?: number - Y position (optional, auto-calculates if not provided)
 *   team?: string - Team affiliation (optional)
 */
export class Deploy extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const unitType = params.unitType as string;
    const x = params.x as number | undefined;
    const y = params.y as number | undefined;
    const team = params.team as string | undefined;
    
    // Determine deployment position
    let deployX: number, deployY: number;
    
    if (x !== undefined && y !== undefined) {
      // Manual position specified
      deployX = x;
      deployY = y;
    } else if (unitId) {
      // Deploy near the unit that issued the command
      const deployerUnit = this.sim.units.find(u => u.id === unitId);
      if (deployerUnit) {
        const enemies = this.sim.units.filter(u => u.team !== deployerUnit.team && u.hp > 0);
        if (enemies.length > 0) {
          const closestEnemy = enemies.reduce((closest, enemy) => {
            const dist1 = Math.sqrt(Math.pow(deployerUnit.pos.x - enemy.pos.x, 2) + Math.pow(deployerUnit.pos.y - enemy.pos.y, 2));
            const dist2 = Math.sqrt(Math.pow(deployerUnit.pos.x - closest.pos.x, 2) + Math.pow(deployerUnit.pos.y - closest.pos.y, 2));
            return dist1 < dist2 ? enemy : closest;
          });
          
          deployX = Math.floor((deployerUnit.pos.x + closestEnemy.pos.x) / 2);
          deployY = Math.floor((deployerUnit.pos.y + closestEnemy.pos.y) / 2);
        } else {
          deployX = deployerUnit.pos.x + 1;
          deployY = deployerUnit.pos.y;
        }
      } else {
        console.warn(`Deploy command: unit ${unitId} not found`);
        return;
      }
    } else {
      deployX = Math.floor(Math.random() * this.sim.fieldWidth);
      deployY = Math.floor(Math.random() * this.sim.fieldHeight);
    }
    
    try {
      const unit = Encyclopaedia.unit(unitType);
      
      // Queue spawn event - Commands can queue events
      this.sim.queuedEvents.push({
        kind: 'spawn',
        source: unitId || 'system',
        target: { x: deployX, y: deployY },
        meta: {
          unit: { ...unit, team: (team || 'friendly') as 'friendly' },
        }
      });
    } catch (error) {
      console.error(`Deploy command failed: Unknown unit type '${unitType}'`);
    }
  }
}