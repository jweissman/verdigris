import { Command } from '../rules/command';

export class JumpCommand extends Command {
  execute(unitId: string, targetX: string, targetY: string, height: string = '5', damage: string = '5', radius: string = '3') {
    const unit = this.sim.units.find(u => u.id === unitId);
    if (!unit) return;

    const tx = parseInt(targetX);
    const ty = parseInt(targetY);
    const jumpHeight = parseInt(height);
    const jumpDamage = parseInt(damage);
    const impactRadius = parseInt(radius);

    // Move unit to target position (simple implementation)
    unit.pos = { x: tx, y: ty };
    
    // Queue AOE damage at landing spot
    this.sim.queuedEvents.push({
      kind: 'aoe',
      source: unitId,
      target: { x: tx, y: ty },
      meta: {
        aspect: 'impact',
        amount: jumpDamage,
        radius: impactRadius,
        origin: { x: tx, y: ty }
      }
    });

    console.log(`🦘 ${unitId} jumps to (${tx}, ${ty}) with impact damage ${jumpDamage}`);
  }
}