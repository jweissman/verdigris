import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

/**
 * Pull command - applies physics-based pulling force between two units
 * Used by grappling to pull units together based on mass
 * Params:
 *   grapplerI

d: string - ID of the grappling unit
 *   targetId: string - ID of the target unit
 *   force: number - Pull force to apply
 */
export class PullCommand extends Command {
  private transform: Transform;
  
  constructor(sim: any, transform?: Transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  
  execute(unitId: string | null, params: CommandParams): void {
    const grapplerId = params.grapplerId as string;
    const targetId = params.targetId as string;
    const force = params.force as number || 0.3;
    
    if (!grapplerId || !targetId) return;
    
    const grappler = this.sim.units.find(u => u.id === grapplerId);
    const target = this.sim.units.find(u => u.id === targetId);
    
    if (!grappler || !target) return;
    
    // Calculate direction
    const dx = target.pos.x - grappler.pos.x;
    const dy = target.pos.y - grappler.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    // Calculate pull based on mass
    const grapplerMass = grappler.mass || 1;
    const targetMass = target.mass || 1;
    const totalMass = grapplerMass + targetMass;
    
    // Massive units (>30 mass) can't be pulled
    const targetIsImmovable = targetMass > 30;
    
    if (target.meta.pinned || targetIsImmovable) {
      // Only grappler moves
      const grapplerPull = force * 2; // Double force when target is immovable
      this.transform.updateUnit(grapplerId, {
        pos: {
          x: Math.max(0, Math.min(this.sim.fieldWidth - 1, grappler.pos.x + unitX * grapplerPull)),
          y: Math.max(0, Math.min(this.sim.fieldHeight - 1, grappler.pos.y + unitY * grapplerPull))
        }
      });
    } else {
      // Both units move based on mass ratio
      const grapplerPull = (targetMass / totalMass) * force;
      const targetPull = (grapplerMass / totalMass) * force;
      
      // Update grappler position
      this.transform.updateUnit(grapplerId, {
        pos: {
          x: Math.max(0, Math.min(this.sim.fieldWidth - 1, grappler.pos.x + unitX * grapplerPull)),
          y: Math.max(0, Math.min(this.sim.fieldHeight - 1, grappler.pos.y + unitY * grapplerPull))
        }
      });
      
      // Update target position
      this.transform.updateUnit(targetId, {
        pos: {
          x: Math.max(0, Math.min(this.sim.fieldWidth - 1, target.pos.x - unitX * targetPull)),
          y: Math.max(0, Math.min(this.sim.fieldHeight - 1, target.pos.y - unitY * targetPull))
        }
      });
    }
  }
}