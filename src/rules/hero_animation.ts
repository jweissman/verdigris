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
    const currentTick = context.getCurrentTick();
    this.debugCallCount = currentTick; // Store for animation update
    
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
        
        // Update weapon if changed
        if (unit.meta?.weapon && unit.meta.weapon !== rig.getCurrentWeapon()) {
          rig.switchWeapon(unit.meta.weapon as any);
        }
        
        // Update animation based on unit state
        this.updateAnimation(unit, rig, commands);
        
        // Update rig (advance by 1 tick)
        rig.update(1);
        
        // Debug logging removed
        
        // Store rig in unit meta for renderer with facing
        const facing = unit.meta?.facing || 'right';
        commands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              rig: rig.getParts(facing)
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
  
  private updateAnimation(unit: any, rig: HeroRig, commands: QueuedCommand[]) {
    // Determine desired animation
    let desiredAnimation: string;
    const currentTick = this.debugCallCount; // Using as a tick counter
    
    // Check if we're in attack animation window
    const inAttackWindow = unit.meta?.attackStartTick && 
      unit.meta?.attackEndTick &&
      currentTick >= unit.meta.attackStartTick &&
      currentTick < unit.meta.attackEndTick;
    
    // Check if attack just ended
    const attackJustEnded = unit.meta?.attackEndTick && 
      currentTick >= unit.meta.attackEndTick &&
      unit.state === 'attack';
    
    if (attackJustEnded) {
      // Reset attack state via command
      commands.push({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            attackStartTick: undefined,
            attackEndTick: undefined
          }
        }
      });
      commands.push({
        type: 'state',
        params: {
          unitId: unit.id,
          state: 'idle'
        }
      });
    }
    
    if (inAttackWindow || unit.state === 'attack') {
      desiredAnimation = 'attack';
    } else if (unit.meta?.jumping) {
      desiredAnimation = 'jump'; // Not implemented yet
    } else if (unit.intendedMove?.x !== 0 || unit.intendedMove?.y !== 0) {
      desiredAnimation = 'walk';
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
      // Play animations that exist
      if (desiredAnimation === 'breathing' || desiredAnimation === 'wind' || 
          desiredAnimation === 'walk' || desiredAnimation === 'attack') {
        rig.play(desiredAnimation);
        this.currentAnimations.set(unit.id, desiredAnimation);
      }
    }
  }
}