import { HeroRig } from "./hero_rig";
import { Unit } from "../types/Unit";

/**
 * Manages hero animations as a rendering projection
 * Maintains its own state separate from the simulation
 */
export class HeroAnimationManager {
  private rigs: Map<string, HeroRig> = new Map();
  private currentAnimations: Map<string, string> = new Map();
  private rigData: Map<string, any[]> = new Map(); // Stores the visual rig data

  /**
   * Update animations based on current simulation state
   */
  update(units: readonly Unit[], currentTick: number) {
    for (const unit of units) {
      if (unit.meta?.useRig) {
        if (!this.rigs.has(unit.id)) {
          const rig = new HeroRig();
          const initialAnim = unit.meta?.onRooftop ? "wind" : "breathing";
          rig.play(initialAnim);
          this.rigs.set(unit.id, rig);
          this.currentAnimations.set(unit.id, initialAnim);
        }

        const rig = this.rigs.get(unit.id)!;

        if (unit.meta?.weapon && unit.meta.weapon !== rig.getCurrentWeapon()) {
          rig.switchWeapon(unit.meta.weapon as any);
        }

        this.updateAnimation(unit, rig, currentTick);

        // Slow down walk animation to match movement speed
        const isWalking = unit.intendedMove?.x !== 0 || unit.intendedMove?.y !== 0;
        const updateRate = isWalking ? 0.5 : 1;
        rig.update(updateRate);

        const facing = unit.meta?.facing || "right";
        
        // Store the animated rig parts for rendering
        const rigParts = rig.getParts(facing);
        this.rigData.set(unit.id, rigParts);
      }
    }

    // Clean up rigs for dead/removed units
    for (const [unitId] of this.rigs.entries()) {
      const unit = units.find(u => u.id === unitId);
      if (!unit || unit.hp <= 0) {
        this.rigs.delete(unitId);
        this.currentAnimations.delete(unitId);
        this.rigData.delete(unitId);
      }
    }
  }

  /**
   * Get the visual rig data for a unit
   */
  getRigData(unitId: string): any[] | undefined {
    return this.rigData.get(unitId);
  }

  /**
   * Get all rig data for rendering
   */
  getAllRigData(): Map<string, any[]> {
    return this.rigData;
  }

  private updateAnimation(unit: Unit, rig: HeroRig, currentTick: number) {
    let desiredAnimation: string;

    const inAttackWindow =
      unit.meta?.attackStartTick &&
      unit.meta?.attackEndTick &&
      currentTick >= unit.meta.attackStartTick &&
      currentTick < unit.meta.attackEndTick;

    const attackJustEnded =
      unit.meta?.attackEndTick && currentTick === unit.meta.attackEndTick;

    if (attackJustEnded) {
      // Clear attack timing metadata
      delete unit.meta.attackStartTick;
      delete unit.meta.attackEndTick;
    }

    const isJumping = unit.meta?.isJumping || unit.meta?.z > 0;
    const isWalking = unit.intendedMove?.x !== 0 || unit.intendedMove?.y !== 0;
    const inCombat = unit.state === "combat" || inAttackWindow;
    const isOnRooftop = unit.meta?.onRooftop;

    if (isJumping) {
      desiredAnimation = "jump";
    } else if (inAttackWindow) {
      desiredAnimation = "attack";
    } else if (isWalking) {
      desiredAnimation = "walk";
    } else if (inCombat) {
      desiredAnimation = "combat_idle";
    } else if (isOnRooftop) {
      desiredAnimation = "wind";
    } else {
      desiredAnimation = "breathing";
    }

    const currentAnimation = this.currentAnimations.get(unit.id);

    if (currentAnimation !== desiredAnimation) {
      rig.play(desiredAnimation);
      this.currentAnimations.set(unit.id, desiredAnimation);
    }
  }
}