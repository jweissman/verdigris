import { Command, CommandParams } from "../rules/command";

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
      console.error("Pin command requires x and y coordinates");
      return;
    }
    const grapplerID = unitId;

    if (typeof targetX !== 'number' || typeof targetY !== 'number' || isNaN(targetX) || isNaN(targetY)) {
      console.error("Invalid coordinates for pin command");
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
      console.error("No available grappler found for pin command");
      return;
    }

    if (!grappler.abilities || !grappler.abilities.includes('pinTarget')) {
      console.error(`${grappler.id} does not have pin target ability`);
      return;
    }

    // Find the target to pin
    const target = this.sim.units.find(u => 
      u.pos.x === targetX && 
      u.pos.y === targetY && 
      u.team !== grappler.team
    );

    if (!target) {
      console.error(`No enemy found at position (${targetX}, ${targetY})`);
      return;
    }

    // Check if target is grappled
    if (!target.meta.grappled) {
      console.error(`Target ${target.id} at (${targetX}, ${targetY}) is not grappled - cannot pin`);
      return;
    }

    // Check if target is grappled by this grappler
    if (target.meta.grappledBy !== grappler.id) {
      console.error(`Target ${target.id} is grappled by ${target.meta.grappledBy}, not ${grappler.id}`);
      return;
    }

    // Check cooldown
    const lastUsed = grappler.lastAbilityTick?.pinTarget || 0;
    const cooldown = 30; // Default cooldown for pinTarget from abilities.json
    const ticksSinceLastUse = this.sim.ticks - lastUsed;

    if (ticksSinceLastUse < cooldown) {
      const remainingCooldown = cooldown - ticksSinceLastUse;
      console.error(`Pin target is on cooldown for ${remainingCooldown} more ticks`);
      return;
    }

    // Check range
    const distance = Math.sqrt(
      Math.pow(targetX - grappler.pos.x, 2) + 
      Math.pow(targetY - grappler.pos.y, 2)
    );

    const maxRange = 8; // Default pin range
    if (distance > maxRange) {
      console.error(`Target at (${targetX}, ${targetY}) is out of range for pin (distance: ${distance.toFixed(1)}, max: ${maxRange})`);
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
      this.sim.particles.push({
        pos: { x: targetX * 8 + 4, y: targetY * 8 + 4 },
        vel: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
        radius: 0.5 + Math.random() * 0.5,
        lifetime: 20 + Math.random() * 10,
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