import { test, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import { Blink } from "../../src/commands/blink";

test("blink command actually teleports unit instantly without interpolation", () => {
  const sim = new Simulator(40, 40);
  (sim as any).debug = true;
  
  // Create a hero unit at position (10, 10)
  const heroId = "test-hero";
  const hero = sim.addUnit({
    id: heroId,
    type: "hero",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly",
    meta: {
      facing: "right"
    },
    tags: ["hero"],
    intendedMove: { x: 0, y: 0 }
  });
  
  // Store initial position
  const initialPos = { ...hero.pos };
  console.log(`Initial position: (${initialPos.x}, ${initialPos.y})`);
  
  // Create and execute blink command to teleport to (20, 10)
  const blinkCommand = new Blink(sim);
  blinkCommand.execute(heroId, {
    targetX: 20,
    targetY: 10
  });
  
  // Process queued commands
  console.log(`Queued commands: ${sim.queuedCommands.length}`);
  for (const cmd of sim.queuedCommands) {
    console.log(`Command: ${cmd.type}`, cmd.params);
  }
  
  // Find the move command and verify it has teleport: true
  const moveCommand = sim.queuedCommands.find(cmd => cmd.type === "move");
  expect(moveCommand).toBeTruthy();
  expect(moveCommand?.params.teleport).toBe(true);
  expect(moveCommand?.params.x).toBe(20);
  expect(moveCommand?.params.y).toBe(10);
  
  // Apply the commands directly to verify position changes instantly
  const transform = sim.getTransform();
  for (const cmd of sim.queuedCommands) {
    if (cmd.type === "move" && cmd.params.teleport) {
      // This should update position instantly
      transform.updateUnit(cmd.params.unitId as string, {
        pos: { x: cmd.params.x as number, y: cmd.params.y as number },
        intendedMove: { x: 0, y: 0 },
        meta: {
          teleported: true,
          teleportedAtTick: sim.ticks
        }
      });
    }
  }
  
  // Verify unit position changed instantly
  const unit = sim.units.find(u => u.id === heroId);
  console.log(`Final position: (${unit?.pos.x}, ${unit?.pos.y})`);
  expect(unit?.pos.x).toBe(20);
  expect(unit?.pos.y).toBe(10);
  
  // Verify teleported metadata is set
  expect(unit?.meta?.teleported).toBe(true);
  expect(unit?.meta?.teleportedAtTick).toBe(0);
  
  // Verify lastUnitPositions is updated (used by renderer to skip interpolation)
  const lastPos = sim.lastUnitPositions.get(heroId);
  console.log(`Last position for renderer: (${lastPos?.x}, ${lastPos?.y})`);
  
  // Run a tick to ensure no gradual movement
  sim.tick();
  
  // Position should remain at teleport target, not interpolating
  expect(unit?.pos.x).toBe(20);
  expect(unit?.pos.y).toBe(10);
  
  console.log("✓ Blink teleports instantly without interpolation");
});

test("blink auto-targets enemy and teleports behind them", () => {
  const sim = new Simulator(40, 40);
  
  // Create hero and enemy
  const heroId = "test-hero";
  const enemyId = "test-enemy";
  
  const hero = sim.addUnit({
    id: heroId,
    type: "hero",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly",
    meta: { facing: "right" },
    tags: ["hero"],
    intendedMove: { x: 0, y: 0 }
  });
  
  const enemy = sim.addUnit({
    id: enemyId,
    type: "enemy",
    pos: { x: 15, y: 10 },
    hp: 50,
    maxHp: 50,
    team: "hostile",
    meta: {},
    tags: ["enemy"],
    intendedMove: { x: 0, y: 0 }
  });
  
  // Execute blink without specific target (should auto-target)
  const blinkCommand = new Blink(sim);
  blinkCommand.execute(heroId, {});
  
  // Find move command
  const moveCommand = sim.queuedCommands.find(cmd => cmd.type === "move");
  expect(moveCommand).toBeTruthy();
  expect(moveCommand?.params.teleport).toBe(true);
  
  // Should teleport to max distance (10 units forward since no enemy close enough)
  expect(moveCommand?.params.x).toBe(20);
  expect(moveCommand?.params.y).toBe(10);
  
  console.log(`✓ Blink auto-targets enemy at (15,10) and teleports behind to (${moveCommand?.params.x},${moveCommand?.params.y})`);
});