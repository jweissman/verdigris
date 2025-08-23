import { Command } from "../rules/command";

/**
 * Hero command - applies commands to all units tagged 'hero'
 * Examples: 
 *   hero jump
 *   hero left
 *   hero right
 *   hero attack
 */
export class HeroCommand extends Command {
  execute(unitId: string | null, params: Record<string, any>): void {
    const action = params.action as string;
    console.log(`HeroCommand: action=${action}`);
    
    // Find all hero-tagged units
    const heroes = this.sim.units.filter(u => u.tags?.includes('hero'));
    
    for (const hero of heroes) {
      switch (action) {
        case 'jump':
          this.sim.queuedCommands.push({
            type: 'jump',
            unitId: hero.id,
            params: {
              distance: params.distance || 3,
              height: params.height || 5  // Back to original height
            }
          });
          break;
          
        case 'move':
          // Handle hex offset by adjusting movement based on current row
          const dx = params.dx || 0;
          const dy = params.dy || 0;
          
          // For hex grid, adjust horizontal movement on odd rows
          let adjustedDx = dx;
          let adjustedDy = dy;
          
          // If moving horizontally on odd row, also move vertically to stay aligned
          if (dx !== 0 && Math.floor(hero.pos.y) % 2 === 1) {
            // Move diagonally to compensate for hex offset
            adjustedDy = dy || (dx > 0 ? -1 : 1);
          }
          
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: adjustedDx, dy: adjustedDy }
          });
          break;
          
        case 'left':
          // Normal horizontal movement
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: -1, dy: 0 }
          });
          break;
          
        case 'right':
          // Normal horizontal movement
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: 1, dy: 0 }
          });
          break;
          
        case 'up':
          // Move 2 cells vertically to compensate for hex offset
          console.log(`[HeroCommand] Moving hero up by 2: unit=${hero.id}, pos=${JSON.stringify(hero.pos)}`);
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: 0, dy: -2 }
          });
          break;
          
        case 'down':
          // Move 2 cells vertically to compensate for hex offset
          console.log(`[HeroCommand] Moving hero down by 2: unit=${hero.id}, pos=${JSON.stringify(hero.pos)}`);
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: 0, dy: 2 }
          });
          break;
          
        case 'knight-left':
          // Knight move: 2 vertical, 1 horizontal for hex grid
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: -1, dy: -2 }
          });
          break;
          
        case 'knight-right':
          this.sim.queuedCommands.push({
            type: 'move',
            unitId: hero.id,
            params: { dx: 1, dy: -2 }
          });
          break;
          
        case 'attack':
        case 'strike':
          this.sim.queuedCommands.push({
            type: 'strike',
            unitId: hero.id,
            params: {
              direction: hero.meta?.facing || 'right',
              range: params.range || 1.5,
              damage: params.damage || hero.dmg
            }
          });
          break;
          
        default:
          console.warn(`Unknown hero action: ${action}`);
      }
    }
  }
}