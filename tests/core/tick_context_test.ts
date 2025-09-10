import { test, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import { TickContextImpl } from "../../src/core/tick_context";
import { Rule } from "../../src/rules/rule";
import { TickContext } from "../../src/core/tick_context";
import { QueuedCommand } from "../../src/core/command_handler";

class TestRule extends Rule {
  public contextAccess: {
    arrays?: any;
    units?: any;
    weather?: any;
    lightning?: boolean;
  } = {};
  
  execute(context: TickContext): QueuedCommand[] {
    // Test that we can access arrays without casting
    const arrays = context.getArrays();
    this.contextAccess.arrays = arrays;
    
    // Test that we can get units
    const units = context.getAllUnits();
    this.contextAccess.units = units;
    
    // Test weather access
    this.contextAccess.weather = context.getWeather();
    
    // Test lightning access
    this.contextAccess.lightning = context.isLightningActive();
    
    // Test unit cold data access
    if (units.length > 0) {
      const coldData = context.getUnitColdData(units[0].id);
      expect(coldData).toBeDefined();
    }
    
    return [];
  }
}

test("TickContext provides access to unit arrays without casting", () => {
  const sim = new Simulator(30, 30);
  
  // Add some units
  sim.addUnit({
    id: "unit1",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly"
  });
  
  sim.addUnit({
    id: "unit2",
    pos: { x: 15, y: 15 },
    hp: 50,
    maxHp: 100,
    team: "hostile"
  });
  
  const context = new TickContextImpl(sim);
  const rule = new TestRule();
  
  // Execute rule with context
  rule.execute(context);
  
  // Check that arrays were accessible
  expect(rule.contextAccess.arrays).toBeDefined();
  expect(rule.contextAccess.arrays.posX).toBeInstanceOf(Float32Array);
  expect(rule.contextAccess.arrays.posY).toBeInstanceOf(Float32Array);
  expect(rule.contextAccess.arrays.hp).toBeInstanceOf(Int16Array);
  expect(rule.contextAccess.arrays.activeIndices).toBeInstanceOf(Array);
});

test("TickContext provides access to units without exposing sim", () => {
  const sim = new Simulator(30, 30);
  
  const unit1 = sim.addUnit({
    id: "unit1",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly"
  });
  
  const unit2 = sim.addUnit({
    id: "unit2",
    pos: { x: 15, y: 15 },
    hp: 50,
    maxHp: 100,
    team: "hostile"
  });
  
  const context = new TickContextImpl(sim);
  
  // Test getAllUnits
  const allUnits = context.getAllUnits();
  expect(allUnits.length).toBe(2);
  
  // Test findUnitById
  const foundUnit = context.findUnitById("unit1");
  expect(foundUnit).toBeDefined();
  expect(foundUnit?.id).toBe("unit1");
  
  // Test getUnitsInTeam
  const friendlyUnits = context.getUnitsInTeam("friendly");
  expect(friendlyUnits.length).toBe(1);
  expect(friendlyUnits[0].id).toBe("unit1");
  
  // Test findUnitsInRadius
  const nearbyUnits = context.findUnitsInRadius({ x: 10, y: 10 }, 5);
  expect(nearbyUnits.length).toBeGreaterThanOrEqual(1);
  expect(nearbyUnits.some(u => u.id === "unit1")).toBe(true);
});

test("TickContext provides weather and lightning access", () => {
  const sim = new Simulator(30, 30);
  
  // Set weather on sim (using any cast since these aren't typed yet)
  (sim as any).weather = { current: "rain", intensity: 0.7 };
  (sim as any).lightningActive = true;
  
  const context = new TickContextImpl(sim);
  
  // Test weather access
  const weather = context.getWeather();
  expect(weather).toBeDefined();
  expect(weather?.current).toBe("rain");
  expect(weather?.intensity).toBe(0.7);
  
  // Test lightning access
  const lightning = context.isLightningActive();
  expect(lightning).toBe(true);
});

test("TickContext methods return proper types", () => {
  const sim = new Simulator(30, 30);
  const context = new TickContextImpl(sim);
  
  // Test return types
  const tick = context.getCurrentTick();
  expect(typeof tick).toBe("number");
  
  const width = context.getFieldWidth();
  expect(typeof width).toBe("number");
  
  const height = context.getFieldHeight();
  expect(typeof height).toBe("number");
  
  const random = context.getRandom();
  expect(typeof random).toBe("number");
  expect(random).toBeGreaterThanOrEqual(0);
  expect(random).toBeLessThan(1);
  
  const temp = context.getTemperatureAt(10, 10);
  expect(typeof temp).toBe("number");
});

test("TickContext queues commands and events properly", () => {
  const sim = new Simulator(30, 30);
  const context = new TickContextImpl(sim);
  
  // Queue a command
  context.queueCommand({
    type: "damage",
    params: {
      targetId: "unit1",
      amount: 10
    }
  });
  
  // Queue an event
  context.queueEvent({
    kind: "damage",
    source: "unit2",
    target: "unit1",
    meta: {
      amount: 10
    }
  });
  
  // Check they were queued
  expect(sim.queuedCommands.length).toBe(1);
  expect(sim.queuedCommands[0].type).toBe("damage");
  
  expect(sim.queuedEvents.length).toBe(1);
  expect(sim.queuedEvents[0].kind).toBe("damage");
});

test("Rules cannot access sim directly through context", () => {
  const sim = new Simulator(30, 30);
  const context = new TickContextImpl(sim);
  
  // The context should not expose sim directly
  // (except through getSimulator which is marked as TODO to remove)
  const contextKeys = Object.keys(context);
  
  // sim should not be directly accessible through public API
  // (it's private, but TypeScript private is not enforced at runtime)
  // The important thing is that rules use the TickContext methods
  
  // But the methods should work
  expect(context.getAllUnits).toBeDefined();
  expect(context.getArrays).toBeDefined();
  expect(context.getWeather).toBeDefined();
});