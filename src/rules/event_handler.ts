import { Action, Vec2 } from "../sim/types";
import { Rule } from "./rule";

export class EventHandler extends Rule {
  apply = () => {
    if (this.sim.queuedEvents.length === 0) {
      return;
    }

    console.log("EventHandler: Applying ", this.sim.queuedEvents.length, " queued events");
    // Process events and apply effects
    for (const event of this.sim.queuedEvents) {
      console.log(`Processing event: ${event.kind} from ${event.source} to ${event.target}`);
      switch (event.kind) {
        case 'aoe':
          this.handleAreaOfEffect(event);
          break;
        case 'damage':
          this.handleDamage(event);
          break;
        case 'heal':
          this.handleHeal(event);
          break;
        case 'knockback':
          this.handleKnockback(event);
          break;
        default:
          console.warn(`Unknown event kind: ${event.kind}`);
      }
    }
    // Clear events after processing
    this.sim.queuedEvents = [];
  }

  private handleAreaOfEffect(event: Action) {
    // console.log("Handling AoE event:", event);
    if (!event.target || typeof event.target !== 'object' || !('x' in event.target && 'y' in event.target)) {
      console.warn(`Invalid target for AoE event: ${event.target}`);
      return;
    }
    let target = event.target as Vec2;
    target.x = Math.round(target.x);
    target.y = Math.round(target.y);
    // Implement AoE logic here
    // console.log(`Handling AoE event from ${event.source} to ${target.x}, ${target.y} with radius ${event.meta.radius}`);

    let sourceUnit = this.sim.units.find(unit => unit.id === event.source); // || this.sim.unitAt(event.source);

    // console.log(`Source unit: ${sourceUnit ? sourceUnit.id : 'not found'}`);

    // console.log("Possible targets:", this.sim.units.map(u => `${u.id} (${u.pos.x}, ${u.pos.y})`).join(', '));

    const affectedUnits = this.sim.units.filter(unit => {
      const dx = unit.pos.x - target.x;
      const dy = unit.pos.y - target.y;
      return Math.sqrt(dx * dx + dy * dy) <= (event.meta.radius || 5) && unit.team !== sourceUnit?.team;
    });

    // console.log(`Affected units: ${affectedUnits.map(u => u.id).join(', ')} (${affectedUnits.length})`);

    for (const unit of affectedUnits) {
      console.log(`* ${unit.id} is affected by AoE from ${event.source} at (${target.x}, ${target.y})`);
      this.sim.queuedEvents.push({
        kind: 'damage',
        source: event.source,
        target: unit.id,
        meta: {
          amount: event.meta.amount || 10,
          aspect: 'impact',
          origin: { x: target.x, y: target.y }, 
          distance: Math.sqrt(
            Math.pow(unit.pos.x - target.x, 2) +
            Math.pow(unit.pos.y - target.y, 2)
          )
        }
      });
    }
  }

  private handleDamage(event: Action) {
    let targetUnit = this.sim.units.find(unit => unit.id === event.target); // || this.sim.unitAt(event.target);
    if (!targetUnit) {
      console.warn(`Target unit ${event.target} not found for damage event from ${event.source}`);
      return;
    }

    console.log(`* ${event.source} took ${event.meta.amount} ${event.meta.aspect} damage (from target ${targetUnit.id})`);
    targetUnit.hp -= event.meta.amount || 10;
    if (targetUnit.hp <= 0) {
      console.log(`Unit ${targetUnit.id} has died`);
      targetUnit.state = 'dead';
    }
  }

  private handleHeal(event: any) {
    // Implement healing logic here
  }

  private handleKnockback(event: any) {
    // Implement knockback logic here
  }
}