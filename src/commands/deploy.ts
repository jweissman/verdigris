import { Command } from "../rules/command";
import Encyclopaedia from "../dmg/encyclopaedia";

export class Deploy extends Command {
  execute(unitId: string | null, unitType: string, x?: string, y?: string, team?: string) {
    // console.log(`Deploy command: ${unitType} at ${x || 'auto'}, ${y || 'auto'} for team ${team || 'friendly'}`);
    
    // Determine deployment position
    let deployX: number, deployY: number;
    
    if (x && y) {
      // Manual position specified
      deployX = parseInt(x);
      deployY = parseInt(y);
    } else if (unitId) {
      // Deploy near the unit that issued the command (toymaker)
      const deployerUnit = this.sim.units.find(u => u.id === unitId);
      if (deployerUnit) {
        // Find target for tactical positioning
        const enemies = this.sim.units.filter(u => u.team !== deployerUnit.team && u.hp > 0);
        if (enemies.length > 0) {
          const closestEnemy = enemies.reduce((closest, enemy) => {
            const dist1 = Math.sqrt(Math.pow(deployerUnit.pos.x - enemy.pos.x, 2) + Math.pow(deployerUnit.pos.y - enemy.pos.y, 2));
            const dist2 = Math.sqrt(Math.pow(deployerUnit.pos.x - closest.pos.x, 2) + Math.pow(deployerUnit.pos.y - closest.pos.y, 2));
            return dist1 < dist2 ? enemy : closest;
          });
          
          // Deploy between toymaker and target
          deployX = Math.floor((deployerUnit.pos.x + closestEnemy.pos.x) / 2);
          deployY = Math.floor((deployerUnit.pos.y + closestEnemy.pos.y) / 2);
        } else {
          // No enemies, deploy in front of deployer
          deployX = deployerUnit.pos.x + 1;
          deployY = deployerUnit.pos.y;
        }
      } else {
        console.warn(`Deploy command: unit ${unitId} not found`);
        return;
      }
    } else {
      // Random deployment
      deployX = Math.floor(Math.random() * this.sim.fieldWidth);
      deployY = Math.floor(Math.random() * this.sim.fieldHeight);
    }
    
    // Validate unit type exists
    try {
      const unit = Encyclopaedia.unit(unitType);
      // console.log(`Deploying ${unitType} at (${deployX}, ${deployY})`);
      
      // Queue spawn event
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