import { Command } from "../rules/command";

export class Grapple extends Command {
  name = "grapple";
  description = "Fire grappling hook at target position or enemy";
  usage = "grapple <x> <y> - Fire grappling hook at position (x, y)";

  execute(unitId: string | null, ...args: string[]): void {
    if (args.length < 2) {
      console.error("Grapple command requires at least x and y coordinates");
      console.log("Usage:", this.usage);
      return;
    }

    const targetX = parseInt(args[0]);
    const targetY = parseInt(args[1]);
    const grapplerID = unitId;

    if (isNaN(targetX) || isNaN(targetY)) {
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

    // Check cooldown
    const lastUsed = grappler.lastAbilityTick?.grapplingHook || 0;
    const cooldown = grappler.abilities.grapplingHook.cooldown || 25;
    const ticksSinceLastUse = this.sim.ticks - lastUsed;

    if (ticksSinceLastUse < cooldown) {
      const remainingCooldown = cooldown - ticksSinceLastUse;
      console.error(`Grappling hook is on cooldown for ${remainingCooldown} more ticks`);
      return;
    }

    console.log(`🪝 ${grappler.id} fires grappling hook at (${targetX}, ${targetY})`);

    // Execute the grappling hook ability
    const targetPos = { x: targetX, y: targetY };
    grappler.abilities.grapplingHook.effect(grappler, targetPos, this.sim);

    // Update ability cooldown
    if (!grappler.lastAbilityTick) {
      grappler.lastAbilityTick = {};
    }
    grappler.lastAbilityTick.grapplingHook = this.sim.ticks;
  }
}