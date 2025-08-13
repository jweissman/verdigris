import { Action } from "../types/Action";
import { Vec2 } from "../types/Vec2";
import { Rule } from "./rule";
import { Transform } from "../core/transform";

export class EventHandler extends Rule {
  constructor(sim: any) {
    super(sim);
  }
  
  glossary = (event: Action) => {
    let targetUnit = this.sim.units.find(unit => unit.id === event.target); // || this.sim.unitAt(event.target);
    let tx = ({
      aoe: e => {
        const type = e.meta.aspect === 'heal' ? 'Healing circle' : 'Impact';
        return `${type} from ${e.source} at (${e.target.x}, ${e.target.y}) with radius ${e.meta.radius}`;
      },
      damage: e => `${e.source} hit ${e.target} for ${e.meta.amount} ${e.meta.aspect} damage (now at ${targetUnit?.hp} hp)`,
      heal: e => `${e.source} healed ${e.target} for ${e.meta.amount} (now at ${targetUnit?.hp} hp)`,
      terrain: e => `${e.source} modified terrain at (${e.target?.x}, ${e.target?.y}): ${e.meta?.terrainType}`,
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
        case 'terrain':
          this.handleTerrain(event);
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

    if (!event.meta?.unit) {
      console.warn('Spawn event missing unit data');
      return;
    }

    const newUnit = {
      ...event.meta.unit,
      pos: { x: event.target.x, y: event.target.y },
      id: event.meta.unit?.id || `spawned_${Date.now()}`
    };
    
    // Queue add command instead of directly adding
    this.sim.queuedCommands.push({
      type: 'spawn',
      params: { unit: newUnit }
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
    const isChill = event.meta.aspect === 'chill';
    
    const affectedUnits = this.sim.getRealUnits().filter(unit => {
      const dx = unit.pos.x - target.x;
      const dy = unit.pos.y - target.y;
      const inRange = Math.sqrt(dx * dx + dy * dy) <= (event.meta.radius || 5);
      
      if (isHealing) {
        return inRange && unit.team === sourceUnit?.team && unit.hp < unit.maxHp;
      } else if (isEmp) {
        const mechanicalImmune = event.meta.mechanicalImmune && unit.tags?.includes('mechanical');
        return inRange && !mechanicalImmune;
      } else if (isChill) {
        return inRange && unit.team !== sourceUnit?.team; // Chill affects enemies
      } else {
        // For damage AoE: check friendlyFire flag
        const friendlyFire = event.meta.friendlyFire !== false; // Default to true for backwards compatibility
        if (!friendlyFire) {
          // No friendly fire - only affect enemies
          return inRange && sourceUnit && unit.team !== sourceUnit.team;
        } else {
          // With friendly fire - affect anyone in range except the source
          return inRange && unit.id !== event.source;
        }
      }
    });

    for (const unit of affectedUnits) {
      const distance = Math.sqrt(
        Math.pow(unit.pos.x - target.x, 2) +
        Math.pow(unit.pos.y - target.y, 2)
      );
      
      if (isEmp) {
        // Queue stun command instead of direct mutation
        this.sim.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              stunned: true,
              stunDuration: event.meta.stunDuration || 20
            }
          }
        });
        
        this.sim.particles.push({
          pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
          vel: { x: 0, y: -0.3 },
          radius: 2,
          color: '#FFFF88',
          lifetime: 25,
          type: 'electric_spark'
        });
      } else if (isChill) {
        // Queue chill command instead of direct mutation
        this.sim.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              chilled: true,
              chillIntensity: 0.5, // 50% slow
              chillDuration: event.meta.duration || 30
            }
          }
        });
        
        // Visual effect
        this.sim.particles.push({
          pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
          vel: { x: 0, y: -0.2 },
          radius: 3,
          color: '#88CCFF',
          lifetime: 20
        } as any);
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
    // Instead of directly mutating, queue a damage command
    this.sim.queuedCommands.push({
      type: 'damage',
      params: {
        targetId: event.target,
        amount: event.meta.amount || 10,
        sourceId: event.source,
        aspect: event.meta.aspect
      }
    });
  }

  private handleHeal(event: Action) {
    // Queue heal command instead of direct mutation
    this.sim.queuedCommands.push({
      type: 'heal',
      params: {
        targetId: event.target,
        amount: event.meta.amount || 5,
        sourceId: event.source,
        aspect: event.meta.aspect || 'healing'
      }
    });
  }

  private handleKnockback(event: any) {
    // Queue knockback command
    this.sim.queuedCommands.push({
      type: 'knockback',
      params: {
        targetId: event.target,
        force: event.meta?.force || { x: 0, y: 0 }
      }
    });
  }
  
  private handleTerrain(event: Action) {
    // Handle terrain modification events
    const terrainType = event.meta?.terrainType;
    const position = event.target as Vec2;
    
    if (!position || typeof position !== 'object' || !('x' in position && 'y' in position)) {
      console.trace(`Invalid position for terrain event: ${event.target}`);
      // throw new Error(`Invalid position for terrain event: ${event.target}`);
      return;
    }
    
    // Apply terrain effects
    if (terrainType === 'trench') {
      // Add defensive bonus to units in this position
      const defenseBonus = event.meta?.defenseBonus || 0.5;
      const movementPenalty = event.meta?.movementPenalty || 0.3;
      
      // Find units at this position and apply effects
      const unitsAtPosition = this.sim.units.filter(u => 
        Math.abs(u.pos.x - position.x) < 1 && 
        Math.abs(u.pos.y - position.y) < 1
      );
      
      for (const unit of unitsAtPosition) {
        // Queue terrain effects
        this.sim.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              terrainDefenseBonus: defenseBonus,
              terrainMovementPenalty: movementPenalty
            }
          }
        });
      }
      
      // TODO: Store terrain modifications in a persistent map/grid
      // For now, just log that the terrain was modified
      console.log(`Trench dug at (${position.x}, ${position.y}) with defense bonus ${defenseBonus}`);
    }
  }
}