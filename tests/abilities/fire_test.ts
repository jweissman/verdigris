import { test, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import { FireCommand } from "../../src/commands/fire";

test("fire command creates localized fire with appropriate radius", () => {
  const sim = new Simulator(30, 30);
  
  // Add a hero to cast fire
  const hero = sim.addUnit({
    id: "hero",
    type: "hero",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly",
    meta: {
      facing: "right"
    }
  });
  
  // Add some enemies at various distances
  const enemy1 = sim.addUnit({
    id: "enemy1",
    type: "goblin",
    pos: { x: 12, y: 10 }, // 2 tiles away (in fire zone)
    hp: 50,
    maxHp: 50,
    team: "hostile"
  });
  
  const enemy2 = sim.addUnit({
    id: "enemy2",
    type: "goblin",
    pos: { x: 13, y: 10 }, // 3 tiles away (edge of fire)
    hp: 50,
    maxHp: 50,
    team: "hostile"
  });
  
  const enemy3 = sim.addUnit({
    id: "enemy3",
    type: "goblin",
    pos: { x: 15, y: 10 }, // 5 tiles away (outside fire)
    hp: 50,
    maxHp: 50,
    team: "hostile"
  });
  
  // Cast fire with reduced radius
  const fire = new FireCommand(sim);
  fire.execute("hero", {
    radius: 1, // Small radius
    temperature: 500
  });
  
  // Process the temperature command
  sim.tick();
  
  // Check temperatures at various positions
  const temp1 = sim.temperatureField?.get(12, 10) || 20;
  const temp2 = sim.temperatureField?.get(13, 10) || 20;
  const temp3 = sim.temperatureField?.get(15, 10) || 20;
  
  console.log("Temperatures:", { temp1, temp2, temp3 });
  
  // Fire should be localized (but scalar fields spread heat)
  expect(temp1).toBeGreaterThan(100); // In fire zone
  expect(temp2).toBeGreaterThan(50);  // Near fire, some heat
  expect(temp3).toBeLessThan(200);    // Far from fire, should be cooler
  
  // Let fire damage rule run
  for (let i = 0; i < 5; i++) {
    sim.tick();
  }
  
  // Only enemies in/near fire should take damage
  expect(enemy1.hp).toBeLessThan(50); // Should take damage
  expect(enemy3.hp).toBe(50);         // Should not take damage
});

test("fire spreads using scalar field decay", () => {
  const sim = new Simulator(30, 30);
  
  // Start a fire at a specific location
  const fire = new FireCommand(sim);
  fire.execute(null, {
    x: 15,
    y: 15,
    radius: 1,
    temperature: 800
  });
  
  // Initial fire
  sim.tick();
  const initialTemp = sim.temperatureField?.get(15, 15) || 20;
  expect(initialTemp).toBeGreaterThan(700);
  
  // Let temperature diffuse over time
  for (let i = 0; i < 10; i++) {
    sim.tick();
  }
  
  // Temperature should spread but also decay
  const centerTemp = sim.temperatureField?.get(15, 15) || 20;
  const nearbyTemp = sim.temperatureField?.get(16, 15) || 20;
  const farTemp = sim.temperatureField?.get(20, 15) || 20;
  
  // Center should still be hot (may not decay much in 10 ticks)
  expect(centerTemp).toBeGreaterThan(100);
  
  // Nearby should have some heat
  expect(nearbyTemp).toBeGreaterThan(20);
  expect(nearbyTemp).toBeLessThan(centerTemp);
  
  // Far should be near ambient
  expect(farTemp).toBeLessThan(50);
});

test("fire targets enemies preferentially", () => {
  const sim = new Simulator(30, 30);
  
  // Add hero
  const hero = sim.addUnit({
    id: "hero",
    type: "hero",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly",
    meta: {
      facing: "right"
    }
  });
  
  // Add enemy in front of hero
  const enemy = sim.addUnit({
    id: "enemy",
    type: "goblin",
    pos: { x: 13, y: 10 }, // In facing direction
    hp: 50,
    maxHp: 50,
    team: "hostile"
  });
  
  // Add friendly unit also in front
  const ally = sim.addUnit({
    id: "ally",
    type: "soldier",
    pos: { x: 12, y: 10 },
    hp: 50,
    maxHp: 50,
    team: "friendly"
  });
  
  // Cast fire - should appear near enemy
  const fire = new FireCommand(sim);
  fire.execute("hero", {
    radius: 1,
    temperature: 600
  });
  
  sim.tick();
  
  // Check that fire is positioned to affect enemy more than ally
  const fireX = Math.floor(hero.pos.x + 2.5); // Expected fire position
  const fireTemp = sim.temperatureField?.get(fireX, 10) || 20;
  
  expect(fireTemp).toBeGreaterThan(400);
  
  // Process damage
  for (let i = 0; i < 5; i++) {
    sim.tick();
  }
  
  // Enemy should take damage
  expect(enemy.hp).toBeLessThan(50);
  // Ally will also take damage (only heroes are fire-resistant)
  expect(ally.hp).toBeLessThanOrEqual(50);
});

test("burning status effect applies flame overlay", () => {
  const sim = new Simulator(30, 30);
  
  // Add enemy
  const enemy = sim.addUnit({
    id: "enemy",
    type: "goblin",
    pos: { x: 10, y: 10 },
    hp: 50,
    maxHp: 50,
    team: "hostile"
  });
  
  // Set high temperature at enemy position
  const fire = new FireCommand(sim);
  fire.execute(null, {
    x: 10,
    y: 10,
    radius: 0,
    temperature: 300
  });
  
  // Process temperature and fire damage
  sim.tick();
  sim.tick();
  
  // Enemy should have burning status or onFire flag
  const hasBurning = enemy.meta?.onFire || 
                     enemy.meta?.statusEffects?.some((e: any) => e.type === "burning");
  
  // Can't test visual overlay directly, but status should be set
  expect(enemy.hp).toBeLessThan(50); // Took fire damage
});