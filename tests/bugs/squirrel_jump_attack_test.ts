import { describe, it, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";

describe("Squirrel jump attack bug", () => {
  it("should only damage hero when squirrel lands near them, not from across the field", () => {
    const sim = new Simulator(30, 20);
    
    // Place hero at one end
    const hero = {
      id: "hero",
      type: "hero",
      pos: { x: 5, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      abilities: [],
      intendedMove: { x: 0, y: 0 },
      state: "idle" as const,
      sprite: "hero",
      mass: 1,
      meta: {}
    };
    sim.addUnit(hero);
    
    // Place squirrel far away
    const squirrel = {
      id: "squirrel1",
      type: "squirrel",
      pos: { x: 25, y: 10 }, // Far side of field (20 tiles away)
      hp: 5,
      maxHp: 5,
      team: "hostile",
      tags: ["beast"],
      abilities: ["jumps"],
      intendedMove: { x: 0, y: 0 },
      state: "idle" as const,
      sprite: "squirrel",
      mass: 0.5,
      meta: {}
    };
    sim.addUnit(squirrel);
    
    const initialDistance = Math.abs(squirrel.pos.x - hero.pos.x);
    console.log(`Initial distance: ${initialDistance} tiles`);
    
    // Track squirrel position each tick
    let lastSquirrelX = squirrel.pos.x;
    let jumpStartTick = -1;
    let jumpStartX = -1;
    
    // Run simulation for enough time for squirrel to attack
    for (let i = 0; i < 200; i++) {
      sim.tick();
      
      const currentSquirrel = sim.units.find(u => u.id === "squirrel1");
      const currentHero = sim.units.find(u => u.id === "hero");
      
      if (!currentSquirrel || !currentHero) break;
      
      const currentDistance = Math.abs(currentSquirrel.pos.x - currentHero.pos.x) + 
                             Math.abs(currentSquirrel.pos.y - currentHero.pos.y);
      
      // Track when squirrel starts jumping
      if (currentSquirrel.meta?.jumping && jumpStartTick === -1) {
        jumpStartTick = i;
        jumpStartX = currentSquirrel.pos.x;
        console.log(`\nSquirrel started jumping at tick ${i}:`);
        console.log(`  From position: (${currentSquirrel.pos.x}, ${currentSquirrel.pos.y})`);
        console.log(`  Jump target: ${JSON.stringify(currentSquirrel.meta?.jumpTarget)}`);
        console.log(`  Distance to hero: ${currentDistance}`);
      }
      
      // Track significant position changes
      if (Math.abs(currentSquirrel.pos.x - lastSquirrelX) > 5) {
        console.log(`\nLarge position change at tick ${i}:`);
        console.log(`  Squirrel moved from x=${lastSquirrelX} to x=${currentSquirrel.pos.x}`);
        console.log(`  Distance moved: ${Math.abs(currentSquirrel.pos.x - lastSquirrelX)}`);
        console.log(`  Jumping: ${currentSquirrel.meta?.jumping}`);
      }
      lastSquirrelX = currentSquirrel.pos.x;
      
      // Log when hero takes damage
      if (currentHero.hp < 100) {
        console.log(`\nHero damaged at tick ${i}:`);
        console.log(`  Hero HP: ${currentHero.hp}`);
        console.log(`  Squirrel position: (${currentSquirrel.pos.x}, ${currentSquirrel.pos.y})`);
        console.log(`  Hero position: (${currentHero.pos.x}, ${currentHero.pos.y})`);
        console.log(`  Distance: ${currentDistance}`);
        console.log(`  Squirrel jumping: ${currentSquirrel.meta?.jumping}`);
        
        // Check if damage occurred during or right after jump
        if (jumpStartTick > 0 && i - jumpStartTick < 20) {
          const jumpDistance = Math.abs(jumpStartX - currentHero.pos.x);
          console.log(`  Jump distance was: ${jumpDistance} tiles`);
          if (jumpDistance > 10) {
            console.log(`  *** BUG: Squirrel jumped ${jumpDistance} tiles to attack! ***`);
            expect(jumpDistance).toBeLessThanOrEqual(10);
          }
        }
        
        // The bug: squirrel damages hero from far away
        if (currentDistance > 5) {
          console.log(`  *** BUG: Squirrel damaged hero from ${currentDistance} tiles away! ***`);
        }
        
        // Squirrel should be within reasonable attack range (let's say 3 tiles)
        expect(currentDistance).toBeLessThanOrEqual(3);
        break;
      }
    }
    
    // Also check that squirrel actually moved closer before attacking
    const finalSquirrel = sim.units.find(u => u.id === "squirrel1");
    if (finalSquirrel) {
      const finalDistance = Math.abs(finalSquirrel.pos.x - hero.pos.x);
      console.log(`\nFinal squirrel distance: ${finalDistance}`);
      
      // Squirrel should have moved significantly closer
      if (hero.hp < 100) {
        expect(finalDistance).toBeLessThan(initialDistance - 10);
      }
    }
  });
  
  it("should show squirrel's jump target when jumping", () => {
    const sim = new Simulator(20, 20);
    
    const hero = {
      id: "hero",
      type: "hero", 
      pos: { x: 5, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      abilities: [],
      intendedMove: { x: 0, y: 0 },
      state: "idle" as const,
      sprite: "hero",
      mass: 1,
      meta: {}
    };
    sim.addUnit(hero);
    
    const squirrel = {
      id: "squirrel1",
      type: "squirrel",
      pos: { x: 15, y: 10 },
      hp: 5,
      maxHp: 5,
      team: "hostile",
      tags: ["beast"],
      abilities: ["jumps"],
      intendedMove: { x: 0, y: 0 },
      state: "idle" as const,
      sprite: "squirrel",
      mass: 0.5,
      meta: {}
    };
    sim.addUnit(squirrel);
    
    // Track jump events
    let jumpDetected = false;
    let jumpTargetX: number | undefined;
    let jumpTargetY: number | undefined;
    
    for (let i = 0; i < 150; i++) {
      sim.tick();
      
      const currentSquirrel = sim.units.find(u => u.id === "squirrel1");
      if (!currentSquirrel) break;
      
      if (currentSquirrel.meta?.jumping && !jumpDetected) {
        jumpDetected = true;
        jumpTargetX = currentSquirrel.meta?.jumpTarget?.x;
        jumpTargetY = currentSquirrel.meta?.jumpTarget?.y;
        
        console.log(`Jump detected at tick ${i}:`);
        console.log(`  Squirrel at: (${currentSquirrel.pos.x}, ${currentSquirrel.pos.y})`);
        console.log(`  Jump target: (${jumpTargetX}, ${jumpTargetY})`);
        console.log(`  Hero at: (${hero.pos.x}, ${hero.pos.y})`);
        
        if (jumpTargetX !== undefined && jumpTargetY !== undefined) {
          const jumpDistance = Math.abs(jumpTargetX - currentSquirrel.pos.x);
          console.log(`  Jump distance: ${jumpDistance}`);
          
          // Jump target should not be exactly on the hero from far away
          if (jumpDistance > 10) {
            console.log(`BUG: Attempting to jump ${jumpDistance} tiles!`);
          }
          
          // Reasonable jump distance should be less than 6 tiles
          expect(jumpDistance).toBeLessThanOrEqual(6);
        }
        break;
      }
    }
    
    if (jumpDetected) {
      expect(jumpTargetX).toBeDefined();
      expect(jumpTargetY).toBeDefined();
    }
  });
});