import { Command, CommandParams } from "../rules/command";

/**
 * Grapple command - fires grappling hook at target
 * Params:
 *   x: number - Target X position (can also use targetX)
 *   y: number - Target Y position (can also use targetY)
 */
export class Grapple extends Command {
  name = "grapple";
  description = "Fire grappling hook at target position or enemy";
  usage = "grapple <x> <y> - Fire grappling hook at position (x, y)";

  execute(unitId: string | null, params: CommandParams): void {
    // Support both 'x'/'y' and 'targetX'/'targetY' param names
    const targetX = (params.x ?? params.targetX) as number;
    const targetY = (params.y ?? params.targetY) as number;
    
    if (targetX === undefined || targetY === undefined) {
      console.error("Grapple command requires x and y coordinates");
      throw new Error("Grapple command requires x and y coordinates");
    }
    const grapplerID = unitId;

    if (typeof targetX !== 'number' || typeof targetY !== 'number' || isNaN(targetX) || isNaN(targetY)) {
      console.error("Invalid coordinates for grapple command");
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
      console.error("No available grappler found for grapple command");
      return;
    }

    if (!grappler.abilities.grapplingHook) {
      console.error(`${grappler.id} does not have grappling hook ability`);
      return;
    }

    // Check if grappler is within range and ability is ready
    const distance = Math.sqrt(
      Math.pow(targetX - grappler.pos.x, 2) + 
      Math.pow(targetY - grappler.pos.y, 2)
    );

    const maxRange = grappler.abilities.grapplingHook.config?.range || 8;
    if (distance > maxRange) {
      console.error(`Target at (${targetX}, ${targetY}) is out of range for ${grappler.id} (distance: ${distance.toFixed(1)}, max: ${maxRange})`);
      return;
    }

    // Check cooldown (skip if this was explicitly queued by the unit)
    if (unitId !== grapplerID) {
      const lastUsed = grappler.lastAbilityTick?.grapplingHook || 0;
      const cooldown = grappler.abilities.grapplingHook.cooldown || 25;
      const ticksSinceLastUse = this.sim.ticks - lastUsed;

      if (ticksSinceLastUse < cooldown) {
        const remainingCooldown = cooldown - ticksSinceLastUse;
        console.error(`Grappling hook is on cooldown for ${remainingCooldown} more ticks`);
        return;
      }
    }

    // Create the grapple projectile directly
    const targetPos = { x: targetX, y: targetY };
    
    // Calculate velocity towards target
    const dx = targetPos.x - grappler.pos.x;
    const dy = targetPos.y - grappler.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 2;
    const vel = {
      x: (dx / dist) * speed,
      y: (dy / dist) * speed
    };

    // Create grapple projectile
    this.sim.projectiles.push({
      id: `grapple_${grappler.id}_${this.sim.ticks}`,
      pos: { ...grappler.pos },
      vel,
      radius: 1,
      damage: 0,
      team: grappler.team,
      type: 'grapple',
      sourceId: grappler.id,
      target: targetPos
    });

    // Update ability cooldown
    if (!grappler.lastAbilityTick) {
      grappler.lastAbilityTick = {};
    }
    grappler.lastAbilityTick.grapplingHook = this.sim.ticks;
  }
}