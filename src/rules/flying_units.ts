import { Rule } from "./rule";
import { Unit } from "../types/";

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
  
  update() {
    this.animationFrame = (this.animationFrame + 1) % 60; // Cycle for animation
    
    for (const unit of this.sim.units) {
      if (unit.tags?.includes('flying')) {
        this.updateFlyingUnit(unit);
      }
    }
  }
  
  private updateFlyingUnit(unit: Unit) {
    // Check if unit should be flying
    const shouldFly = this.shouldUnitFly(unit);
    
    if (shouldFly && !this.flyingUnits.has(unit.id)) {
      // Start flying
      this.flyingUnits.add(unit.id);
      unit.meta.flying = true;
      unit.meta.flyingFrame = 5; // Start with frame 5
      unit.meta.z = 3; // Height above ground
    } else if (!shouldFly && this.flyingUnits.has(unit.id)) {
      // Stop flying
      this.flyingUnits.delete(unit.id);
      unit.meta.flying = false;
      unit.meta.z = 0;
    }
    
    // Update flying animation
    if (unit.meta.flying) {
      // Alternate between frames 5 and 6
      unit.meta.flyingFrame = 5 + Math.floor(this.animationFrame / 30) % 2;
      
      // Small vertical bobbing for realism
      unit.meta.z = 3 + Math.sin(this.animationFrame * 0.1) * 0.5;
      
      // Flying units can move more freely
      if (unit.sprite === 'bird') {
        this.updateBirdMovement(unit);
      }
    }
  }
  
  private shouldUnitFly(unit: Unit): boolean {
    // Birds at field edges should fly
    const atEdge = (
      unit.pos.x <= 1 || 
      unit.pos.x >= this.sim.fieldWidth - 2 ||
      unit.pos.y <= 1 ||
      unit.pos.y >= this.sim.fieldHeight - 2
    );
    
    // Birds fly when idle at edges or when fleeing
    if (unit.sprite === 'bird') {
      return atEdge || unit.posture === 'flee' || unit.meta.startled;
    }
    
    // Owls fly at night or when hunting
    if (unit.sprite === 'owl') {
      return unit.posture === 'pursue' || unit.meta.hunting;
    }
    
    return false;
  }
  
  private updateBirdMovement(unit: Unit) {
    // Ambient birds at edges move in patterns
    if (!unit.intendedTarget) {
      const time = this.animationFrame * 0.05;
      
      // Circular flight pattern at edges
      if (unit.pos.x <= 1 || unit.pos.x >= this.sim.fieldWidth - 2) {
        unit.intendedMove = {
          x: 0,
          y: Math.sin(time) * 0.3
        };
      } else if (unit.pos.y <= 1 || unit.pos.y >= this.sim.fieldHeight - 2) {
        unit.intendedMove = {
          x: Math.cos(time) * 0.3,
          y: 0
        };
      }
    }
  }
  
  // Helper to check if a unit is currently flying
  isFlying(unit: Unit): boolean {
    return this.flyingUnits.has(unit.id) || unit.meta.flying === true;
  }
  
  // Get the current animation frame for a flying unit
  getFlyingFrame(unit: Unit): number {
    return unit.meta.flyingFrame || 0;
  }
}