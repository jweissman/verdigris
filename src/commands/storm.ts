import { Command, CommandParams } from "../rules/command";

/**
 * Storm command - start or stop a lightning storm
 * Params:
 *   action: 'start' | 'stop' - Whether to start or stop the storm
 */
export class StormCommand extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const action = params.action as 'start' | 'stop';
    
    if (action === 'start') {
      this.sim.lightningActive = true;
      
      // Add storm cloud particles for ambiance
      for (let i = 0; i < 8; i++) {
        this.sim.particleArrays.addParticle({
          pos: { 
            x: Math.random() * this.sim.fieldWidth * 8,
            y: 100 + Math.random() * (this.sim.fieldHeight * 8 - 200) // Keep away from edges
          },
          vel: { x: (Math.random() - 0.5) * 0.2, y: 0 }, // No vertical movement
          radius: 0.5,
          color: '#333366',
          lifetime: 120 + Math.random() * 60,
          type: 'storm_cloud'
        });
      }
    } else if (action === 'stop') {
      this.sim.lightningActive = false;
    }
  }
}