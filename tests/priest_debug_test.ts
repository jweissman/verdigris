import { describe, expect, it } from "bun:test";
import { Simulator } from "../src/simulator";
import Encyclopaedia from "../src/dmg/encyclopaedia";

describe("Priest Debug", () => {
  it("should debug priest radiant ability triggering", () => {
    const sim = new Simulator(10, 10);
    
    const priest = Encyclopaedia.unit('priest');
    priest.pos = { x: 5, y: 5 };
    sim.addUnit(priest);
    
    const ghost = Encyclopaedia.unit('ghost');
    ghost.pos = { x: 6, y: 5 }; // Adjacent
    sim.addUnit(ghost);
    
    console.log('=== DEBUG INFO ===');
    console.log('Priest abilities:', Object.keys(priest.abilities));
    console.log('Priest radiant ability:', priest.abilities.radiant);
    console.log('Ghost tags:', ghost.tags);
    console.log('Ghost perdurance:', ghost.meta.perdurance);
    console.log('Initial positions: priest', priest.pos, 'ghost', ghost.pos);
    
    // Test distance calculation
    const dx = ghost.pos.x - priest.pos.x;
    const dy = ghost.pos.y - priest.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    console.log('Distance between priest and ghost:', distance);
    
    // Run simulation steps with detailed logging
    for (let i = 0; i < 40; i++) {
      console.log(`\n--- Step ${i} ---`);
      console.log('Pre-step: priest abilities tick:', priest.lastAbilityTick);
      console.log('Current sim tick:', sim.ticks);
      
      sim.step();
      
      console.log('Post-step: queued events:', sim.queuedEvents.length);
      const radiantEvents = sim.queuedEvents.filter(e => 
        e.kind === 'damage' && e.meta.aspect === 'radiant'
      );
      if (radiantEvents.length > 0) {
        console.log('FOUND RADIANT EVENT!', radiantEvents[0]);
        break;
      }
      
      if (ghost.hp < 30) {
        console.log('Ghost took damage! HP:', ghost.hp);
        break;
      }
    }
    
    // Test passes if we can debug
    expect(priest.abilities.radiant).toBeDefined();
  });
});