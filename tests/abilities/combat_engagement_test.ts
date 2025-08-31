import { describe, it, expect, beforeEach } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import { Unit } from "../../src/types/unit";

describe("Combat Engagement", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator(40, 40);
  });

  it("should make creatures hostile when hero attacks them", () => {
    // Create hero
    const hero: Partial<Unit> = {
      id: "hero",
      type: "hero",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      dmg: 10, // Give hero damage
      team: "friendly",
      tags: ["hero"],
      abilities: [],
      intendedMove: { x: 0, y: 0 },
      state: "idle",
      sprite: "hero",
      mass: 1,
      meta: { facing: "right" },
    };

    // Create a neutral squirrel nearby with more HP
    const squirrel: Partial<Unit> = {
      id: "squirrel1",
      type: "squirrel",
      pos: { x: 11, y: 10 }, // 1 tile to the right (in visor range)
      hp: 50,
      maxHp: 50, // More HP so it survives the hit
      team: "neutral",
      tags: ["ambient"],
      abilities: [],
      intendedMove: { x: 0, y: 0 },
      state: "idle",
      sprite: "squirrel",
      mass: 0.5,
      meta: {},
    };

    sim.addUnit(hero);
    sim.addUnit(squirrel);

    // Hero strikes
    sim.queuedCommands.push({
      type: "strike",
      unitId: "hero",
      params: {
        direction: "right",
        damage: 5,
      },
    });

    // Process the strike
    sim.step();
    sim.step(); // Extra step for command processing

    const squirrelAfter = sim.units.find(u => u.id === "squirrel1");
    
    // Debug: check if squirrel exists
    console.log("Squirrel after strike:", squirrelAfter);
    console.log("All units:", sim.units.map(u => ({ id: u.id, hp: u.hp, pos: u.pos })));
    
    // Squirrel should exist
    expect(squirrelAfter).toBeDefined();
    
    // Squirrel should take damage
    expect(squirrelAfter!.hp).toBeLessThan(50);
    
    // Squirrel should become hostile after being attacked
    expect(squirrelAfter?.team).toBe("hostile");
  });

  it("should make creatures attack back when damaged", () => {
    const hero: Partial<Unit> = {
      id: "hero",
      type: "hero",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      dmg: 10, // Give hero damage
      team: "friendly",
      tags: ["hero"],
      abilities: [],
      intendedMove: { x: 0, y: 0 },
      state: "idle",
      sprite: "hero",
      mass: 1,
      meta: {},
    };

    // Create a goblin that's already hostile
    const goblin: Partial<Unit> = {
      id: "goblin1",
      type: "goblin",
      pos: { x: 11, y: 10 }, // Adjacent
      hp: 100,
      maxHp: 100, // More HP so it survives
      dmg: 5, // Give goblin damage
      team: "hostile",
      tags: ["hunt"],
      abilities: [],
      intendedMove: { x: 0, y: 0 },
      state: "idle",
      sprite: "goblin",
      mass: 1,
      meta: {},
    };

    sim.addUnit(hero);
    sim.addUnit(goblin);

    const initialHeroHp = hero.hp!;

    // Run several steps for AI to engage
    for (let i = 0; i < 10; i++) {
      sim.step();
    }

    const heroAfter = sim.units.find(u => u.id === "hero");
    const goblinAfter = sim.units.find(u => u.id === "goblin1");
    
    console.log("After combat steps:");
    console.log("Hero HP:", heroAfter?.hp, "expected < ", initialHeroHp);
    console.log("Goblin HP:", goblinAfter?.hp);
    console.log("Hero pos:", heroAfter?.pos);
    console.log("Goblin pos:", goblinAfter?.pos);
    
    // Hero should have taken damage from goblin
    expect(heroAfter?.hp).toBeLessThan(initialHeroHp);
  });
});

describe("Fire Mechanics", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator(40, 40);
  });

  it("should spread fire to units walking over hot tiles", () => {
    const unit: Partial<Unit> = {
      id: "test_unit",
      type: "soldier",
      pos: { x: 10, y: 10 },
      hp: 20,
      maxHp: 20,
      team: "neutral",
      tags: [],
      abilities: [],
      intendedMove: { x: 0, y: 0 },
      state: "idle",
      sprite: "soldier",
      mass: 1,
      meta: {},
    };

    sim.addUnit(unit);

    // Set the tile on fire (high temperature)
    sim.queuedCommands.push({
      type: "temperature",
      params: {
        x: 11,
        y: 10,
        amount: 500, // Hot enough to ignite
      },
    });

    sim.step();

    // Move unit onto the hot tile
    sim.queuedCommands.push({
      type: "move",
      params: {
        unitId: "test_unit",
        x: 11,
        y: 10,
      },
    });

    sim.step();
    sim.step(); // Process movement

    const unitAfter = sim.units.find(u => u.id === "test_unit");
    
    // Unit should be on fire or taking damage
    expect(unitAfter?.hp).toBeLessThan(20);
  });

  it("should decay fire temperature over time", () => {
    // Set a tile on fire with low temperature to avoid killing unit
    sim.queuedCommands.push({
      type: "temperature",
      params: {
        x: 10,
        y: 10,
        amount: 150, // Very low temperature
      },
    });

    sim.step();

    // Create a unit with high HP to survive
    const unit: Partial<Unit> = {
      id: "test_unit",
      type: "soldier",
      pos: { x: 10, y: 10 },
      hp: 500, // Very high HP to survive
      maxHp: 500,
      team: "neutral",
      tags: [],
      abilities: [],
      intendedMove: { x: 0, y: 0 },
      state: "idle",
      sprite: "soldier",
      mass: 1,
      meta: {},
    };

    sim.addUnit(unit);

    // Fire should damage unit initially
    sim.step();
    const hp1 = sim.units.find(u => u.id === "test_unit")?.hp || 500;
    
    // Run many steps - fire should decay
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    // After decay, unit should stop taking damage
    const hp2 = sim.units.find(u => u.id === "test_unit")?.hp || 0;
    
    // Unit should have taken some damage but not be dead (fire decayed)
    expect(hp1).toBeLessThan(500);
    expect(hp2).toBeGreaterThan(0);
  });
});

describe("Attack Pattern", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator(40, 40);
  });

  it("hero visor attack should hit wide area", () => {
    const hero: Partial<Unit> = {
      id: "hero",
      type: "hero",
      pos: { x: 20, y: 20 },
      hp: 100,
      maxHp: 100,
      dmg: 10, // Give hero damage
      team: "friendly",
      tags: ["hero"],
      abilities: [],
      intendedMove: { x: 0, y: 0 },
      state: "idle",
      sprite: "hero",
      mass: 1,
      meta: { facing: "right" },
    };
    sim.addUnit(hero);

    // Create enemies in visor pattern (wide but short range)
    const enemies = [
      { x: 21, y: 17 }, // Far above
      { x: 21, y: 18 }, // Above
      { x: 21, y: 19 }, // Slightly above
      { x: 21, y: 20 }, // Direct front
      { x: 21, y: 21 }, // Slightly below
      { x: 21, y: 22 }, // Below
      { x: 21, y: 23 }, // Far below
      { x: 22, y: 20 }, // 2 tiles forward
      { x: 23, y: 20 }, // 3 tiles forward
    ];

    sim.addUnit(hero);
    
    enemies.forEach((pos, i) => {
      const unit = {
        id: `enemy${i}`,
        type: "goblin",
        pos,
        hp: 10,
        maxHp: 10,
        dmg: 1, // Add damage field
        team: "hostile",
        tags: [],
        abilities: [],
        intendedMove: { x: 0, y: 0 },
        state: "idle",
        sprite: "goblin",
        mass: 1,
        meta: {},
      };
      sim.addUnit(unit);
      console.log(`Added enemy ${i} at (${pos.x}, ${pos.y})`);
    });

    // Hero attacks with visor pattern using hero command
    const attackCommand = {
      type: "hero",
      params: {
        action: "attack",
        direction: "right",
      },
    };
    console.log(`Attack command params:`, JSON.stringify(attackCommand.params));
    sim.queuedCommands.push(attackCommand);

    console.log(`Units before steps: ${sim.units.length}`);
    console.log(`Units: ${sim.units.map(u => `${u.id}(hp:${u.hp})`).join(', ')}`);
    
    sim.step();
    
    console.log(`Units after 1 step: ${sim.units.length}`);
    console.log(`Units: ${sim.units.map(u => `${u.id}(hp:${u.hp})`).join(', ')}`);
    
    sim.step();

    console.log(`Units after steps: ${sim.units.length}`);
    console.log(`Units: ${sim.units.map(u => u.id).join(', ')}`);

    // Check which enemies were hit (dead enemies are removed from units)
    const hitCount = enemies.filter((_, i) => {
      const enemy = sim.units.find(u => u.id === `enemy${i}`);
      // Enemy was hit if it's dead (not in units) or has reduced HP
      const wasHit = !enemy || (enemy && enemy.hp < 10);
      if (i < 3) { // Debug first few enemies
        console.log(`Enemy ${i} at ${JSON.stringify(enemies[i])}: exists=${!!enemy}, hp=${enemy?.hp}, hit=${wasHit}`);
      }
      return wasHit;
    }).length;

    console.log(`Total enemies hit: ${hitCount} out of ${enemies.length}`);

    // Visor should hit at least 5 enemies (wide pattern)
    expect(hitCount).toBeGreaterThanOrEqual(5);
  });
});