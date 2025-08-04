import { Command } from "../rules/command";
import { Unit } from "../sim/types";

export class Toss extends Command {
  execute(unitId: string, direction: {x: number, y: number}, force: number = 5, distance: number = 3): void {
    const unit = this.sim.units.find(u => u.id === unitId);
    if (!unit) {
      // console.warn(`Unit ${unitId} not found for toss command`);
      return;
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

    console.log(`🤾 Tossing ${unitId} from (${unit.pos.x},${unit.pos.y}) to (${clampedTargetX},${clampedTargetY}) with force ${force}`);

    // console.log("Handled toss", unit.meta);
  }
}