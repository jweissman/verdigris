import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";
import { HeroRig } from "../rendering/hero_rig";

export class HeroAnimation extends Rule {
  private rigs: Map<string, HeroRig> = new Map();
  private currentAnimations: Map<string, string> = new Map();
  private debugCallCount: number = 0;
  
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const allUnits = context.getAllUnits();
    
    // Debug: count calls
    if (!this.debugCallCount) {
      this.debugCallCount = 0;
    }
    this.debugCallCount++;
    if (this.debugCallCount === 1 || this.debugCallCount === 31) {
      console.log(`HeroAnimation.execute called ${this.debugCallCount} times`);
    }
    
    // Find units that should have rigs
    for (const unit of allUnits) {
      if (unit.meta?.useRig) {
        // Get or create rig for this hero
        if (!this.rigs.has(unit.id)) {
          const rig = new HeroRig();
          const initialAnim = unit.meta?.onRooftop ? 'wind' : 'breathing';
          rig.play(initialAnim);
          this.rigs.set(unit.id, rig);
          this.currentAnimations.set(unit.id, initialAnim);
        }
        
        const rig = this.rigs.get(unit.id)!;
        
        // Update animation based on unit state
        this.updateAnimation(unit, rig);
        
        // Update rig (advance by 1 tick)
        rig.update(1);
        
        // Debug on specific ticks
        if (this.debugCallCount === 1 || this.debugCallCount === 31) {
          const torso = rig.getPartByName('torso');
          console.log(`Tick ${this.debugCallCount} - Torso: y=${torso?.offset.y}, frame=${torso?.frame}, animTime=${rig.getAnimationTime()}`);
        }
        
        // Store rig in unit meta for renderer
        commands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              rig: rig.getParts()
            }
          }
        });
      }
    }
    
    // Clean up rigs for dead heroes
    for (const [unitId, rig] of this.rigs.entries()) {
      const unit = context.findUnitById(unitId);
      if (!unit || unit.hp <= 0) {
        this.rigs.delete(unitId);
        this.currentAnimations.delete(unitId);
      }
    }
    
    return commands;
  }
  
  private updateAnimation(unit: any, rig: HeroRig) {
    // Determine desired animation
    let desiredAnimation: string;
    
    if (unit.state === 'attack') {
      desiredAnimation = 'attack'; // Not implemented yet
    } else if (unit.meta?.jumping) {
      desiredAnimation = 'jump'; // Not implemented yet
    } else if (unit.intendedMove?.x !== 0 || unit.intendedMove?.y !== 0) {
      desiredAnimation = 'walk'; // Not implemented yet
    } else {
      // Idle animations
      if (unit.meta?.onRooftop) {
        desiredAnimation = 'wind';
      } else {
        desiredAnimation = 'breathing';
      }
    }
    
    // Only play if animation changed
    const currentAnim = this.currentAnimations.get(unit.id);
    if (currentAnim !== desiredAnimation) {
      // For now, only play animations that exist
      if (desiredAnimation === 'breathing' || desiredAnimation === 'wind') {
        rig.play(desiredAnimation);
        this.currentAnimations.set(unit.id, desiredAnimation);
      }
    }
  }
}