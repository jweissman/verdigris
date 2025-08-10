import { Command, CommandParams } from "../rules/command";
import { Unit } from "../sim/types";

/**
 * Toss command - tosses a unit in a direction
 * Params:
 *   targetId?: string - ID of the unit to toss (for abilities)
 *   direction?: {x: number, y: number} - Direction to toss (for direct command)
 *   force?: number - Force of the toss (default 5)
 *   distance?: number - Distance to toss (default 3)
 */
export class Toss extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    // Support both targetId (from abilities) and unitId (direct toss)
    const targetId = (params.targetId as string) || unitId;
    if (!targetId) {
      console.warn(`No target specified for toss command`);
      return;
    }
    
    const unit = this.sim.units.find(u => u.id === targetId);
    if (!unit) {
      // console.warn(`Unit ${targetId} not found for toss command`);
      return;
    }
    
    // Get direction - either explicit or calculate from positions
    let direction = params.direction as {x: number, y: number} | undefined;
    const force = (params.force as number) ?? 5;
    const distance = (params.distance as number) ?? 3;
    
    // If no direction provided, calculate from caster to target
    if (!direction && unitId && targetId !== unitId) {
      const caster = this.sim.units.find(u => u.id === unitId);
      if (caster) {
        const dx = unit.pos.x - caster.pos.x;
        const dy = unit.pos.y - caster.pos.y;
        const mag = Math.sqrt(dx * dx + dy * dy) || 1;
        direction = { x: dx / mag, y: dy / mag };
      }
    }
    
    // Default to eastward if still no direction
    if (!direction) {
      direction = { x: 1, y: 0 };
    }

    if (unit.state === 'dead') {
      return; // Can't toss dead units
    }

    // Normalize direction vector
    const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y) || 1;
    const normalizedDir = {
      x: direction.x / magnitude,
      y: direction.y / magnitude
    };

    // Calculate target position based on force and distance
    const tossDistance = Math.min(distance, force); // Force affects how far they go
    const targetX = Math.round(unit.pos.x + normalizedDir.x * tossDistance);
    const targetY = Math.round(unit.pos.y + normalizedDir.y * tossDistance);

    // Clamp to field boundaries
    const clampedTargetX = Math.max(0, Math.min(this.sim.fieldWidth - 1, targetX));
    const clampedTargetY = Math.max(0, Math.min(this.sim.fieldHeight - 1, targetY));

    // Set toss state (similar to jump state)
    unit.meta.tossing = true;
    unit.meta.tossProgress = 0;
    unit.meta.tossOrigin = { x: unit.pos.x, y: unit.pos.y };
    unit.meta.tossTarget = { x: clampedTargetX, y: clampedTargetY };
    unit.meta.tossForce = force;
    unit.meta.z = 0; // Start at ground level
  }
}