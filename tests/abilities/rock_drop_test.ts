import { test, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import { RockDrop } from "../../src/commands/rock_drop";

test("rock drop should fall quickly and create AOE visualization", () => {
  const sim = new Simulator(30, 30);
  
  // Add a hero who can drop rocks
  const hero = sim.addUnit({
    id: "hero",
    type: "hero",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly"
  });
  
  // Add some enemies in the target area
  const enemy1 = sim.addUnit({
    id: "enemy1",
    type: "goblin",
    pos: { x: 15, y: 10 },
    hp: 50,
    maxHp: 50,
    team: "hostile"
  });
  
  const enemy2 = sim.addUnit({
    id: "enemy2",
    type: "goblin",
    pos: { x: 16, y: 10 },
    hp: 50,
    maxHp: 50,
    team: "hostile"
  });
  
  const enemy3 = sim.addUnit({
    id: "enemy3",
    type: "goblin",
    pos: { x: 18, y: 10 },
    hp: 50,
    maxHp: 50,
    team: "hostile"
  });
  
  console.log("=== Initial State ===");
  console.log("Hero at:", hero.pos);
  console.log("Enemies at:", enemy1.pos, enemy2.pos, enemy3.pos);
  
  // Execute rock drop
  const rockDrop = new RockDrop(sim);
  rockDrop.execute("hero", {
    targetX: 15,
    targetY: 10,
    damage: 40,
    radius: 2
  });
  
  // Process the spawn command
  sim.tick();
  
  console.log("\n=== After first tick ===");
  console.log("Total units:", sim.units.length);
  console.log("Units:", sim.units.map(u => `${u.id}(${u.type})`));
  
  // Find the rock - it's an effect type with rock in the id
  const rock = sim.units.find(u => u.type === "effect" && u.id.startsWith("rock_"));
  
  if (!rock) {
    console.log("Rock not found!");
    // Debug: print all units with their properties
    sim.units.forEach(u => {
      console.log(`Unit ${u.id}: type=${u.type}, kind=${u.kind}, tags=${u.tags?.join(',')}`);
    });
  }
  
  expect(rock).toBeDefined();
  
  console.log("\n=== Rock Spawned ===");
  console.log("Rock at:", rock?.pos, "z:", rock?.meta?.z);
  console.log("Fall speed:", rock?.meta?.fallSpeed);
  
  // Check initial height
  expect(rock?.meta?.z).toBeGreaterThan(0);
  
  // Track falling - need to re-fetch rock each tick since it's being updated
  let tickCount = 0;
  let currentZ = rock?.meta?.z || 0;
  
  while (currentZ > 0 && tickCount < 20) {
    sim.tick();
    tickCount++;
    
    // Re-fetch the rock to get updated values
    const currentRock = sim.units.find(u => u.id.startsWith("rock_"));
    currentZ = currentRock?.meta?.z || 0;
    
    console.log(`Tick ${tickCount}: z = ${currentZ}, falling = ${currentRock?.meta?.falling}`);
    
    if (!currentRock) {
      console.log("Rock removed from units");
      break;
    }
  }
  
  console.log(`\n=== Impact at tick ${tickCount} ===`);
  
  // Rock should fall quickly (less than 5 ticks ideally)
  expect(tickCount).toBeLessThanOrEqual(5);
  
  // Check damage was dealt
  console.log("Enemy1 HP:", enemy1.hp);
  console.log("Enemy2 HP:", enemy2.hp);
  console.log("Enemy3 HP:", enemy3.hp);
  
  // Enemy1 and enemy2 should be damaged (within radius 2)
  expect(enemy1.hp).toBeLessThan(50);
  expect(enemy2.hp).toBeLessThan(50);
  
  // Enemy3 should NOT be damaged (outside radius)
  expect(enemy3.hp).toBe(50);
  
  // Check for AOE events/particles
  const events = sim.getProcessedEvents();
  const damageEvents = events.filter(e => e.kind === "damage");
  console.log("\nDamage events:", damageEvents.length);
  
  // Should have damage events for enemies in radius
  expect(damageEvents.length).toBeGreaterThanOrEqual(2);
});

test("rock drop should create visual strike effect on impact", () => {
  const sim = new Simulator(30, 30);
  
  const hero = sim.addUnit({
    id: "hero",
    type: "hero",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly"
  });
  
  const initialEvents = sim.getProcessedEvents().length;
  
  // Drop a rock
  const rockDrop = new RockDrop(sim);
  rockDrop.execute("hero", {
    targetX: 15,
    targetY: 10,
    damage: 50,
    radius: 3
  });
  
  // Let it fall completely
  for (let i = 0; i < 10; i++) {
    sim.tick();
  }
  
  // Check for strike/AOE visualization events
  const events = sim.getProcessedEvents();
  const strikeEvents = events.filter(e => e.kind === "strike" || e.kind === "aoe");
  
  console.log("Strike/AOE events:", strikeEvents);
  
  // Should have created strike visualization
  expect(strikeEvents.length).toBeGreaterThan(0);
});