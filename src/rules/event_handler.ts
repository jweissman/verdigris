import { Action } from "../types/Action";
import { Vec2 } from "../types/Vec2";
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

    for (const event of this.sim.queuedEvents) {
      if (!event.meta) event.meta = {};
      event.meta.tick = this.sim.ticks;
      
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
      
      this.sim.processedEvents.push(event);
    }
    
    // Keep only recent processed events (last 60 ticks for example)
    const maxHistoryTicks = 60;
    this.sim.processedEvents = this.sim.processedEvents.filter(e => 
      e.meta?.tick && (this.sim.ticks - e.meta.tick) < maxHistoryTicks
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
      ...event.meta.unit,
      pos: { x: event.target.x, y: event.target.y },
    });
  }

  private handleAreaOfEffect(event: Action) {
    if (!event.target || typeof event.target !== 'object' || !('x' in event.target && 'y' in event.target)) {
      console.warn(`Invalid target for AoE event: ${event.target}`);
      return;
    }
    let target = event.target as Vec2;
    target.x = Math.round(target.x);
    target.y = Math.round(target.y);

    let sourceUnit = this.sim.units.find(unit => unit.id === event.source);

    const isHealing = event.meta.aspect === 'heal';
    const isEmp = event.meta.aspect === 'emp';
    
    const affectedUnits = this.sim.getRealUnits().filter(unit => {
      const dx = unit.pos.x - target.x;
      const dy = unit.pos.y - target.y;
      const inRange = Math.sqrt(dx * dx + dy * dy) <= (event.meta.radius || 5);
      
      if (isHealing) {
        return inRange && unit.team === sourceUnit?.team && unit.hp < unit.maxHp;
      } else if (isEmp) {
        const mechanicalImmune = event.meta.mechanicalImmune && unit.tags?.includes('mechanical');
        return inRange && !mechanicalImmune;
      } else {
        return inRange && unit.team !== sourceUnit?.team;
      }
    });

    for (const unit of affectedUnits) {
      const distance = Math.sqrt(
        Math.pow(unit.pos.x - target.x, 2) +
        Math.pow(unit.pos.y - target.y, 2)
      );
      
      if (isEmp) {
        unit.meta.stunned = true;
        unit.meta.stunDuration = event.meta.stunDuration || 20;
        
        this.sim.particles.push({
          pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
          vel: { x: 0, y: -0.3 },
          radius: 2,
          color: '#FFFF88',
          lifetime: 25,
          type: 'electric_spark'
        });
      } else {
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
      }

      if (!isHealing && sourceUnit && unit.mass < sourceUnit.mass) {
        const massRatio = sourceUnit.mass / unit.mass;
        if (massRatio >= 2) { // Source is at least 2x more massive
          const dx = unit.pos.x - target.x;
          const dy = unit.pos.y - target.y;
          const magnitude = Math.sqrt(dx * dx + dy * dy) || 1;
          const direction = { x: dx / magnitude, y: dy / magnitude };
          
          const tossForce = Math.min(8, Math.floor(massRatio * 2)); // Cap force at 8
          const tossDistance = Math.min(5, Math.floor(massRatio)); // Cap distance at 5
          
          this.sim.queuedCommands.push({
            type: 'toss',
            unitId: unit.id,
            params: { direction, tossForce, tossDistance }
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

    targetUnit.hp -= event.meta.amount || 10;
    
    // Mark impact frame for precise attack animation timing (frame 3)
    targetUnit.meta.impactFrame = this.sim.ticks;
    
    // Also mark the attacker for impact frame if they exist
    let attackerUnit = this.sim.units.find(unit => unit.id === event.source);
    if (attackerUnit) {
      attackerUnit.meta.impactFrame = this.sim.ticks;
    }
    
    if (targetUnit.hp <= 0) {
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