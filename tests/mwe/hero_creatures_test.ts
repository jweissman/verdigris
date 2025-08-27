import { describe, it, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import Encyclopaedia from "../../src/dmg/encyclopaedia";

describe("Hero MWE Creatures", () => {
  it("should move ambient squirrels", () => {
    const sim = new Simulator();
    
    // Add a squirrel exactly as hero MWE does
    const squirrelData = Encyclopaedia.unit("squirrel");
    sim.addUnit({
      ...squirrelData,
      id: "squirrel_0",
      pos: { x: 12, y: 8 },
      team: "neutral",
      tags: ["wander"], // Use wander tag for ambient behavior
      meta: squirrelData.meta
    });
    
    const squirrel = sim.units.find(u => u.id === "squirrel_0");
    expect(squirrel).toBeDefined();
    
    const initialPos = { ...squirrel!.pos };
    console.log("Initial squirrel position:", initialPos);
    console.log("Initial squirrel meta:", squirrel!.meta);
    
    // Run many ticks
    for (let i = 0; i < 100; i++) {
      sim.tick();
    }
    
    // Get fresh reference
    const movedSquirrel = sim.units.find(u => u.id === "squirrel_0");
    const finalPos = movedSquirrel!.pos;
    
    console.log("Final squirrel position:", finalPos);
    console.log("Final squirrel meta:", movedSquirrel!.meta);
    
    const moved = initialPos.x !== finalPos.x || initialPos.y !== finalPos.y;
    expect(moved).toBe(true);
  });

  it("should make wolves hunt", () => {
    const sim = new Simulator();
    
    // Add hero (controlled so it doesn't auto-attack)
    sim.addUnit({
      id: "hero",
      pos: { x: 10, y: 10 },
      team: "friendly",
      hp: 100,
      maxHp: 100,
      sprite: "hero",
      tags: ["hero"],
      meta: { controlled: true }, // Prevent auto-attacks
    });
    
    // Add wolf exactly as hero MWE does
    const wolfData = Encyclopaedia.unit("wolf");
    sim.addUnit({
      ...wolfData,
      id: "wolf_0",
      pos: { x: 15, y: 12 },
      team: "hostile",
      tags: [...(wolfData.tags || []), "hunt"],
    });
    
    const wolf = sim.units.find(u => u.id === "wolf_0");
    const hero = sim.units.find(u => u.id === "hero");
    expect(wolf).toBeDefined();
    expect(hero).toBeDefined();
    
    const initialWolfPos = { ...wolf!.pos };
    console.log("Initial wolf position:", initialWolfPos);
    console.log("Wolf tags:", wolf!.tags);
    console.log("Hero position:", hero!.pos);
    
    // Run many ticks
    for (let i = 0; i < 100; i++) {
      sim.tick();
    }
    
    const movedWolf = sim.units.find(u => u.id === "wolf_0");
    const finalWolfPos = movedWolf!.pos;
    
    console.log("Final wolf position:", finalWolfPos);
    console.log("Wolf meta after hunting:", movedWolf!.meta);
    
    // Wolf should have moved toward hero
    const moved = initialWolfPos.x !== finalWolfPos.x || initialWolfPos.y !== finalWolfPos.y;
    expect(moved).toBe(true);
  });
});