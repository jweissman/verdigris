import { Command } from "../rules/command";

export class Pin extends Command {
  name = "pin";
  description = "Reinforce grapple to fully pin target";
  usage = "pin <x> <y> - Reinforce grapple at position to create full pin";

  execute(unitId: string | null, ...args: string[]): void {
    if (args.length < 2) {
      console.error("Pin command requires at least x and y coordinates");
      console.log("Usage:", this.usage);
      return;
    }

    const targetX = parseInt(args[0]);
    const targetY = parseInt(args[1]);
    const grapplerID = unitId;

    if (isNaN(targetX) || isNaN(targetY)) {
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

    if (!grappler.abilities.pinTarget) {
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
    const cooldown = grappler.abilities.pinTarget.cooldown || 35;
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

    const maxRange = grappler.abilities.pinTarget.config?.range || 8;
    if (distance > maxRange) {
      console.error(`Target at (${targetX}, ${targetY}) is out of range for pin (distance: ${distance.toFixed(1)}, max: ${maxRange})`);
      return;
    }

    console.log(`📌 ${grappler.id} reinforces grapple on ${target.id} at (${targetX}, ${targetY}) - PINNED!`);

    // Execute the pin target ability
    const targetPos = { x: targetX, y: targetY };
    grappler.abilities.pinTarget.effect(grappler, targetPos, this.sim);

    // Update ability cooldown
    if (!grappler.lastAbilityTick) {
      grappler.lastAbilityTick = {};
    }
    grappler.lastAbilityTick.pinTarget = this.sim.ticks;
  }
}