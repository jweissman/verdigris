import { describe, it, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";

describe("Squirrel jump damage location bug", () => {
  it("should only damage units where squirrel actually lands, not at the original target", () => {
    const sim = new Simulator(30, 20);
    
    // Place hero at left side
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
    
    // Place squirrel far away on right side
    const squirrel = {
      id: "squirrel1",
      type: "squirrel",
      pos: { x: 25, y: 10 },
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

    // Place a decoy unit where squirrel will actually land (6 tiles from squirrel)
    const decoy = {
      id: "decoy",
      type: "goblin",
      pos: { x: 19, y: 10 }, // 6 tiles from squirrel, in direction of hero
      hp: 50,
      maxHp: 50,
      team: "friendly",
      tags: [],
      abilities: [],
      intendedMove: { x: 0, y: 0 },
      state: "idle" as const,
      sprite: "goblin",
      mass: 1,
      meta: {}
    };
    sim.addUnit(decoy);
    
    console.log("Initial setup:");
    console.log(`  Hero at (${hero.pos.x}, ${hero.pos.y}) with ${hero.hp} HP`);
    console.log(`  Squirrel at (${squirrel.pos.x}, ${squirrel.pos.y})`);
    console.log(`  Decoy at (${decoy.pos.x}, ${decoy.pos.y}) with ${decoy.hp} HP`);
    console.log(`  Distance squirrel->hero: ${Math.abs(squirrel.pos.x - hero.pos.x)}`);
    console.log(`  Distance squirrel->decoy: ${Math.abs(squirrel.pos.x - decoy.pos.x)}`);
    
    // Run simulation - squirrel should trigger jump ability
    let jumpDetected = false;
    let damageOccurred = false;
    
    for (let i = 0; i < 50; i++) {
      sim.tick();
      
      const currentSquirrel = sim.units.find(u => u.id === "squirrel1");
      const currentHero = sim.units.find(u => u.id === "hero");
      const currentDecoy = sim.units.find(u => u.id === "decoy");
      
      if (!currentSquirrel || !currentHero || !currentDecoy) break;
      
      // Detect when squirrel starts jumping
      if (currentSquirrel.meta?.jumping && !jumpDetected) {
        jumpDetected = true;
        console.log(`\nSquirrel jumping at tick ${i}:`);
        console.log(`  From: (${currentSquirrel.pos.x}, ${currentSquirrel.pos.y})`);
        console.log(`  Jump target: ${JSON.stringify(currentSquirrel.meta?.jumpTarget)}`);
      }
      
      // Check for damage
      if (currentHero.hp < 100 || currentDecoy.hp < 50) {
        damageOccurred = true;
        console.log(`\nDamage detected at tick ${i}:`);
        console.log(`  Squirrel at: (${currentSquirrel.pos.x}, ${currentSquirrel.pos.y})`);
        console.log(`  Hero HP: ${currentHero.hp} (distance: ${Math.abs(currentSquirrel.pos.x - currentHero.pos.x)})`);
        console.log(`  Decoy HP: ${currentDecoy.hp} (distance: ${Math.abs(currentSquirrel.pos.x - currentDecoy.pos.x)})`);
        
        // The bug would be: hero takes damage even though squirrel is 20 tiles away
        // The fix should be: only decoy takes damage (within jump range)
        
        if (currentHero.hp < 100) {
          const distance = Math.abs(currentSquirrel.pos.x - currentHero.pos.x);
          console.log(`  *** Hero damaged from ${distance} tiles away! ***`);
          
          // Hero should NOT take damage from 20 tiles away
          expect(distance).toBeLessThanOrEqual(6);
        }
        
        if (currentDecoy.hp < 50) {
          const distance = Math.abs(currentSquirrel.pos.x - currentDecoy.pos.x);
          console.log(`  Decoy damaged from ${distance} tiles away`);
          
          // Decoy CAN take damage if within reasonable range
          expect(distance).toBeLessThanOrEqual(6);
        }
        
        break;
      }
    }
    
    // Final assertions
    const finalHero = sim.units.find(u => u.id === "hero");
    const finalDecoy = sim.units.find(u => u.id === "decoy");
    const finalSquirrel = sim.units.find(u => u.id === "squirrel1");
    
    console.log("\nFinal state:");
    console.log(`  Hero HP: ${finalHero?.hp} (should be 100 - too far away)`);
    console.log(`  Decoy HP: ${finalDecoy?.hp} (might be damaged - in jump range)`);
    console.log(`  Squirrel at: (${finalSquirrel?.pos.x}, ${finalSquirrel?.pos.y})`);
    
    // Hero should NOT be damaged (too far away)
    expect(finalHero?.hp).toBe(100);
    
    // Decoy might be damaged if squirrel landed near it
    // But damage should only occur where squirrel actually lands
  });

  it("should apply jump damage at actual landing position, not intended target", () => {
    const sim = new Simulator(20, 20);
    
    // Simple setup: squirrel jumps toward hero but can't reach
    const hero = {
      id: "hero",
      type: "hero",
      pos: { x: 2, y: 10 },
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
    
    // Force a jump by setting up the jump meta directly
    squirrel.meta = {
      jumping: true,
      jumpProgress: 0,
      jumpOrigin: { x: 15, y: 10 },
      jumpTarget: { x: 9, y: 10 }, // Can only jump 6 tiles max
      jumpHeight: 5,
      jumpDamage: 5,
      jumpRadius: 3
    };
    
    // Let jump complete
    for (let i = 0; i < 20; i++) {
      sim.tick();
      
      const currentSquirrel = sim.units.find(u => u.id === "squirrel1");
      const currentHero = sim.units.find(u => u.id === "hero");
      
      if (!currentSquirrel?.meta?.jumping) {
        // Jump completed
        console.log(`Jump completed at tick ${i}`);
        console.log(`  Squirrel landed at: (${currentSquirrel.pos.x}, ${currentSquirrel.pos.y})`);
        console.log(`  Hero at: (${currentHero?.pos.x}, ${currentHero?.pos.y})`);
        console.log(`  Distance: ${Math.abs(currentSquirrel.pos.x - (currentHero?.pos.x || 0))}`);
        console.log(`  Hero HP: ${currentHero?.hp}`);
        break;
      }
    }
    
    const finalHero = sim.units.find(u => u.id === "hero");
    const finalSquirrel = sim.units.find(u => u.id === "squirrel1");
    
    const distance = Math.abs((finalSquirrel?.pos.x || 0) - (finalHero?.pos.x || 0));
    
    // Hero should only be damaged if squirrel landed within damage radius (3 tiles)
    if (finalHero && finalHero.hp < 100) {
      console.log(`Hero was damaged - squirrel must be within ${3} tiles`);
      expect(distance).toBeLessThanOrEqual(3);
    } else {
      console.log(`Hero not damaged - squirrel is ${distance} tiles away (> 3)`);
      expect(distance).toBeGreaterThan(3);
    }
  });
});