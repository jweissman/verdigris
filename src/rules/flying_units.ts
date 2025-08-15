import { Rule } from "./rule";
import { Unit } from "../types/";
import type { TickContext } from "../core/tick_context";

/**
 * Flying Units Rule
 * Handles flying behavior for birds and other flying creatures
 * - Birds with 'flying' tag can enter flying state
 * - Flying units use frames 5-6 for animation
 * - Flying units can move over obstacles
 * - Birds at field edges stay in flying state
 */
export class FlyingUnits extends Rule {
  private flyingUnits: Set<string> = new Set();
  private animationFrame: number = 0;
  
  execute(context: TickContext): void {
    this.animationFrame = (this.animationFrame + 1) % 60; // Cycle for animation
    
    for (const unit of context.getAllUnits()) {
      if (unit.tags?.includes('flying')) {
        this.updateFlyingUnit(context, unit);
      }
    }
  }
  
  private updateFlyingUnit(context: TickContext, unit: Unit) {
    // Check if unit should be flying
    const shouldFly = this.shouldUnitFly(context, unit);
    
    if (shouldFly && !this.flyingUnits.has(unit.id)) {
      // Start flying
      this.flyingUnits.add(unit.id);
      context.queueCommand({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            flying: true,
            flyingFrame: 5, // Start with frame 5
            z: 3 // Height above ground
          }
        }
      });
    } else if (!shouldFly && this.flyingUnits.has(unit.id)) {
      // Stop flying
      this.flyingUnits.delete(unit.id);
      context.queueCommand({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            flying: false,
            flyingFrame: undefined,
            z: 0
          }
        }
      });
    }
    
    // Animate flying units
    if (this.flyingUnits.has(unit.id)) {
      // Alternate between frames 5 and 6 for wing flapping
      const frame = Math.floor(this.animationFrame / 15) % 2 === 0 ? 5 : 6;
      
      context.queueCommand({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            flyingFrame: frame
          }
        }
      });
      
      // Add small hovering motion
      const hoverOffset = Math.sin(this.animationFrame * 0.1) * 0.2;
      context.queueCommand({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            hoverY: hoverOffset
          }
        }
      });
    }
  }
  
  private shouldUnitFly(context: TickContext, unit: Unit): boolean {
    // Birds at edges should stay flying
    const margin = 2;
    const atEdge = unit.pos.x < margin || 
                   unit.pos.x > context.getFieldWidth() - margin ||
                   unit.pos.y < margin || 
                   unit.pos.y > context.getFieldHeight() - margin;
    
    if (atEdge) return true;
    
    // Birds that are moving fast should fly
    const isMoving = unit.intendedMove && 
      (Math.abs(unit.intendedMove.x) > 0.5 || Math.abs(unit.intendedMove.y) > 0.5);
    
    if (isMoving) return true;
    
    // Birds that are in combat should fly
    if (unit.state === 'attacking' || unit.state === 'fleeing') return true;
    
    // Birds that are stunned or frozen can't fly
    if (unit.meta.stunned || unit.meta.frozen) return false;
    
    // Random chance to start/stop flying for variety
    const randomFlyChance = context.getRandom() < 0.01; // 1% chance per tick
    
    return unit.meta.flying || randomFlyChance;
  }
}