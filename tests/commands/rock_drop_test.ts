import { test, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import { RockDrop } from "../../src/commands/rock_drop";

test("rock drop command creates visible falling rock entity", () => {
  const sim = new Simulator(40, 40);
  
  // Create a hero unit
  const heroId = "test-hero";
  const hero = sim.addUnit({
    id: heroId,
    type: "hero",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "player",
    meta: {},
    tags: ["hero"],
    intendedMove: { x: 0, y: 0 }
  });
  
  console.log("Initial units:", sim.units.length);
  
  // Create and execute rock drop command
  const rockDrop = new RockDrop();
  rockDrop.sim = sim;
  rockDrop.execute(heroId, {
    targetX: 15,
    targetY: 10
  });
  
  console.log(`Queued commands: ${sim.queuedCommands.length}`);
  
  // Find the spawn command for the rock
  const spawnCommand = sim.queuedCommands.find(cmd => cmd.type === "spawn");
  expect(spawnCommand).toBeTruthy();
  console.log("Spawn command:", JSON.stringify(spawnCommand, null, 2));
  
  // Verify rock entity properties
  const rockUnit = spawnCommand?.params.unit;
  expect(rockUnit).toBeTruthy();
  expect(rockUnit.type).toBe("effect");
  expect(rockUnit.id).toContain("rock_");
  expect(rockUnit.pos.x).toBe(15);
  expect(rockUnit.pos.y).toBe(10);
  
  // Verify rock starts high in the air
  expect(rockUnit.meta.z).toBe(30);
  expect(rockUnit.meta.falling).toBe(true);
  expect(rockUnit.meta.fallSpeed).toBe(3);
  expect(rockUnit.meta.damage).toBe(50); // default damage
  expect(rockUnit.meta.radius).toBe(2); // default radius
  
  // Verify rock sprite is set correctly (at unit level, not in meta)
  expect(rockUnit.sprite).toBe("rock");
  
  // Find damage commands that should trigger when rock lands
  const damageCommands = sim.queuedCommands.filter(cmd => cmd.type === "delayedDamage");
  console.log(`Delayed damage commands: ${damageCommands.length}`);
  
  // No shadow particles anymore - keeping it simple
  
  console.log("✓ Rock drop creates falling rock entity with correct properties");
});

test("rock drop with custom damage and radius parameters", () => {
  const sim = new Simulator(40, 40);
  
  const heroId = "test-hero";
  sim.addUnit({
    id: heroId,
    type: "hero",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "player",
    meta: {},
    tags: ["hero"],
    intendedMove: { x: 0, y: 0 }
  });
  
  // Create rock drop with custom parameters
  const rockDrop = new RockDrop();
  rockDrop.sim = sim;
  rockDrop.execute(heroId, {
    targetX: 20,
    targetY: 20,
    damage: 100,
    radius: 3
  });
  
  // Find the spawn command
  const spawnCommand = sim.queuedCommands.find(cmd => cmd.type === "spawn");
  expect(spawnCommand).toBeTruthy();
  
  const rockUnit = spawnCommand?.params.unit;
  expect(rockUnit.meta.damage).toBe(100);
  expect(rockUnit.meta.radius).toBe(3);
  
  console.log("✓ Rock drop respects custom damage and radius parameters");
});

test("rock drop targeting - defaults to unit position if no target specified", () => {
  const sim = new Simulator(40, 40);
  
  const heroId = "test-hero";
  const hero = sim.addUnit({
    id: heroId,
    type: "hero",
    pos: { x: 25, y: 30 },
    hp: 100,
    maxHp: 100,
    team: "player",
    meta: {},
    tags: ["hero"],
    intendedMove: { x: 0, y: 0 }
  });
  
  // Execute without specific target
  const rockDrop = new RockDrop();
  rockDrop.sim = sim;
  rockDrop.execute(heroId, {});
  
  // Find the spawn command
  const spawnCommand = sim.queuedCommands.find(cmd => cmd.type === "spawn");
  const rockUnit = spawnCommand?.params.unit;
  
  // Should drop at hero's position
  expect(rockUnit.pos.x).toBe(25);
  expect(rockUnit.pos.y).toBe(30);
  
  console.log("✓ Rock drop defaults to unit position when no target specified");
});