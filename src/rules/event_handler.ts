import { Action, Vec2 } from "../sim/types";
import { Rule } from "./rule";

export class EventHandler extends Rule {
  glossary = (event: Action) => {
    let targetUnit = this.sim.units.find(unit => unit.id === event.target); // || this.sim.unitAt(event.target);
    let tx = ({
      aoe: e => {
        const type = e.meta.aspect === 'heal' ? 'Healing circle' : 'Impact';
        return `${type} from ${e.source} at (${e.target.x}, ${e.target.y}) with radius ${e.meta.radius}`;
      },
      damage: e => `${e.source} hit ${e.target} for ${e.meta.amount} ${e.meta.aspect} damage (now at ${targetUnit?.hp} hp)`,
      heal: e => `${e.source} healed ${e.target} for ${e.meta.amount} (now at ${targetUnit?.hp} hp)`,
    })
    if (!tx.hasOwnProperty(event.kind)) {
      // console.warn(`No translation for event kind: ${event.kind}`);
      return `Event: ${event.kind} from ${event.source} to ${event.target}`;
    }

    let translated = tx[event.kind];
    return translated(event);
  }

  apply = () => {
    if (this.sim.queuedEvents.length === 0) {
      return;
    }

    // console.log("Handle ", this.sim.queuedEvents.length, " queued events");
    // Process events and apply effects
    for (const event of this.sim.queuedEvents) {
      // console.log(`Processing event: ${event.kind} from ${event.source} to ${event.target}`);
      // Mark event with current tick
      event.tick = this.sim.ticks;
      
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
        case 'spawn':
          this.handleSpawn(event);
          break;
        default:
          console.warn(`Unknown event kind: ${event.kind}`);
      }
      
      // Store processed event
      this.sim.processedEvents.push(event);

      // Display translation
      console.debug(`- ${this.glossary(event)}`);
    }
    
    // Keep only recent processed events (last 60 ticks for example)
    const maxHistoryTicks = 60;
    this.sim.processedEvents = this.sim.processedEvents.filter(e => 
      e.tick && (this.sim.ticks - e.tick) < maxHistoryTicks
    );
    
    // Clear events after processing
    this.sim.queuedEvents = [];
  }

  private handleSpawn(event: Action) {
    if (!event.target || typeof event.target !== 'object' || !('x' in event.target && 'y' in event.target)) {
      console.warn(`Invalid target for spawn event: ${event.target}`);
      return;
    }

    this.sim.addUnit({
      ...event.meta.unit, // Use unit properties from event
      pos: { x: event.target.x, y: event.target.y },
    });
        //   ...Freehold.unit('squirrel'),
        //   // id: `squirrel_${Date.now()}`,
        //   pos: { x: unit.pos.x - 4, y: unit.pos.y },
        //   // intendedMove: { x: 1, y: 0 },
        //   team: unit.team,
        //   // posture: 'guard',
        //   // intendedProtectee: unit.id,
        //   // sprite: 'squirrel',
        //   // state: 'idle',
        //   // hp: 5,
        //   // maxHp: 5,
        //   // mass: 1,
        //   // tags: ['wander'],
        //   // abilities: {},
        //   // meta: {}
        // });
  }

  private handleAreaOfEffect(event: Action) {
    if (!event.target || typeof event.target !== 'object' || !('x' in event.target && 'y' in event.target)) {
      console.warn(`Invalid target for AoE event: ${event.target}`);
      return;
    }
    let target = event.target as Vec2;
    target.x = Math.round(target.x);
    target.y = Math.round(target.y);

    let sourceUnit = this.sim.units.find(unit => unit.id === event.source); // || this.sim.unitAt(event.source);

    // Determine if this is healing or damage based on aspect
    const isHealing = event.meta.aspect === 'heal';
    
    const affectedUnits = this.sim.getRealUnits().filter(unit => {
      const dx = unit.pos.x - target.x;
      const dy = unit.pos.y - target.y;
      const inRange = Math.sqrt(dx * dx + dy * dy) <= (event.meta.radius || 5);
      
      if (isHealing) {
        // Healing affects same team members only
        return inRange && unit.team === sourceUnit?.team && unit.hp < unit.maxHp;
      } else {
        // Damage affects enemy team members only
        return inRange && unit.team !== sourceUnit?.team;
      }
    });

    for (const unit of affectedUnits) {
      const effectType = isHealing ? 'healing' : 'damage';
      // console.log(`* ${unit.id} is affected by ${effectType} AoE from ${event.source} at (${target.x}, ${target.y})`);
      
      const distance = Math.sqrt(
        Math.pow(unit.pos.x - target.x, 2) +
        Math.pow(unit.pos.y - target.y, 2)
      );
      
      // Queue appropriate event (heal or damage)
      this.sim.queuedEvents.push({
        kind: isHealing ? 'heal' : 'damage',
        source: event.source,
        target: unit.id,
        meta: {
          amount: event.meta.amount || (isHealing ? 5 : 10),
          aspect: event.meta.aspect || (isHealing ? 'heal' : 'impact'),
          origin: { x: target.x, y: target.y }, 
          distance: distance
        }
      });

      // Check if source is much more massive and should toss the target (only for damage, not healing)
      if (!isHealing && sourceUnit && unit.mass < sourceUnit.mass) {
        const massRatio = sourceUnit.mass / unit.mass;
        if (massRatio >= 2) { // Source is at least 2x more massive
        // if (sourceUnit.mass > unit.mass) {
          // Calculate toss direction (away from source)
          const dx = unit.pos.x - target.x;
          const dy = unit.pos.y - target.y;
          const magnitude = Math.sqrt(dx * dx + dy * dy) || 1;
          const direction = { x: dx / magnitude, y: dy / magnitude };
          
          const tossForce = Math.min(8, Math.floor(massRatio * 2)); // Cap force at 8
          const tossDistance = Math.min(5, Math.floor(massRatio)); // Cap distance at 5
          
          // console.log(`🤾 Queueing toss command: ${unit.id} (mass ${unit.mass}) tossed by ${sourceUnit.id} (mass ${sourceUnit.mass}), ratio ${massRatio.toFixed(1)}`);
          
          this.sim.queuedCommands.push({
            type: 'toss',
            unitId: unit.id,
            args: [direction, tossForce, tossDistance]
          });
        }
      }
    }
  }

  private handleDamage(event: Action) {
    let targetUnit = this.sim.units.find(unit => unit.id === event.target); // || this.sim.unitAt(event.target);
    if (!targetUnit) {
      console.warn(`Target unit ${event.target} not found for damage event from ${event.source}`);
      return;
    }

    // console.log(`* ${event.source} hit ${targetUnit.id} for ${event.meta.amount} ${event.meta.aspect} damage (now at ${targetUnit.hp} hp)`);
    targetUnit.hp -= event.meta.amount || 10;
    if (targetUnit.hp <= 0) {
      // console.log(`Unit ${targetUnit.id} has died`);
      targetUnit.state = 'dead';
    }

    // console.log("Reloading unit state after damage event");
    // let targetAgain = this.sim.units.find(unit => unit.id === event.target);
    // if (targetAgain) {
    //   console.log(`  ${targetAgain.id}: (${targetAgain.pos.x},${targetAgain.pos.y})`, JSON.stringify(targetAgain));
    // }
  }

  private handleHeal(event: Action) {
    let targetUnit = this.sim.units.find(unit => unit.id === event.target);
    if (!targetUnit) {
      console.warn(`Target unit ${event.target} not found for heal event from ${event.source}`);
      return;
    }

    const healAmount = event.meta.amount || 5;
    const oldHp = targetUnit.hp;
    targetUnit.hp = Math.min(targetUnit.maxHp, targetUnit.hp + healAmount);
    
    console.log(`✨ ${event.source} healed ${targetUnit.id} for ${healAmount} (${oldHp} → ${targetUnit.hp} hp)`);
  }

  private handleKnockback(event: any) {
    // Implement knockback logic here
  }
}