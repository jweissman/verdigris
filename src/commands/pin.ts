import { Command, CommandParams } from "../rules/command";
import { Simulator } from "../core/simulator";

/**
 * Pin command - reinforces grapple to fully pin target
 * Params:
 *   x: number - Target X position (can also use targetX)
 *   y: number - Target Y position (can also use targetY)
 */
export class Pin extends Command {
  name = "pin";
  description = "Reinforce grapple to fully pin target";
  usage = "pin <x> <y> - Reinforce grapple at position to create full pin";

  execute(unitId: string | null, params: CommandParams): void {
    // Support both 'x'/'y' and 'targetX'/'targetY' param names
    const targetX = (params.x ?? params.targetX) as number;
    const targetY = (params.y ?? params.targetY) as number;
    
    if (targetX === undefined || targetY === undefined) {
      // Pin command requires coordinates - silently fail
      return;
    }
    const grapplerID = unitId;

    if (typeof targetX !== 'number' || typeof targetY !== 'number' || isNaN(targetX) || isNaN(targetY)) {
      // Invalid coordinates - silently fail
      return;
    }

    // Find the grappler unit
    let grappler = this.sim.units.find(u => u.id === grapplerID);
    
    // If no specific grappler, find nearest friendly grappler
    if (!grappler) {
      grappler = this.sim.units.find(u => 
        u.team === 'friendly' && 
        u.tags?.includes('grappler') &&
        u.hp > 0
      );
    }

    if (!grappler) {
      // No grappler available - silently fail
      return;
    }

    if (!grappler.abilities || !grappler.abilities.includes('pinTarget')) {
      // Grappler doesn't have pin ability - silently fail
      return;
    }

    // Find the target to pin
    const target = this.sim.units.find(u => 
      u.pos.x === targetX && 
      u.pos.y === targetY && 
      u.team !== grappler.team
    );

    if (!target) {
      // No enemy at position - silently fail
      return;
    }

    // Check if target is grappled
    if (!target.meta.grappled) {
      // Target not grappled - silently fail
      return;
    }

    // Check if target is grappled by this grappler
    if (target.meta.grappledBy !== grappler.id) {
      // Target grappled by someone else - silently fail
      return;
    }

    // Check cooldown
    const lastUsed = grappler.lastAbilityTick?.pinTarget || 0;
    const cooldown = 30; // Default cooldown for pinTarget from abilities.json
    const ticksSinceLastUse = this.sim.ticks - lastUsed;

    if (ticksSinceLastUse < cooldown) {
      // Ability on cooldown - silently fail
      return;
    }

    // Check range
    const distance = Math.sqrt(
      Math.pow(targetX - grappler.pos.x, 2) + 
      Math.pow(targetY - grappler.pos.y, 2)
    );

    const maxRange = 8; // Default pin range
    if (distance > maxRange) {
      // Target out of range - silently fail
      return;
    }

    // Queue pin command
    this.sim.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: target.id,
        meta: {
          pinned: true,
          pinDuration: 50 // Duration in ticks
        }
      }
    });
    
    // Create pin visual effect
    for (let i = 0; i < 8; i++) {
      this.sim.particleArrays.addParticle({
        pos: { x: targetX * 8 + 4, y: targetY * 8 + 4 },
        vel: { x: (Simulator.rng.random() - 0.5) * 2, y: (Simulator.rng.random() - 0.5) * 2 },
        radius: 0.5 + Simulator.rng.random() * 0.5,
        lifetime: 20 + Simulator.rng.random() * 10,
        color: '#FF6600',
        type: 'pin'
      });
    }

    // Queue cooldown update
    this.sim.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: grappler.id,
        meta: {
          lastAbilityTick: {
            ...grappler.lastAbilityTick,
            pinTarget: this.sim.ticks
          }
        }
      }
    });
  }
}