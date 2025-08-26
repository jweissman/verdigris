import { describe, test, expect, beforeEach } from "bun:test";
import { Simulator } from "../../src/core/simulator";

describe("Bolt Command", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator(20, 20);
  });

  test("bolt effect units should decay after their lifetime", () => {
    // Execute bolt command
    sim.queuedCommands.push({
      type: "bolt",
      params: {
        x: 10,
        y: 10
      }
    });
    
    sim.step(); // Process bolt command (queues spawn command)
    sim.step(); // Process spawn command  
    
    // Find the bolt effect unit (check by id pattern since kind might not persist)
    const boltUnit = sim.units.find(u => u.id?.startsWith("bolt_"));
    expect(boltUnit).toBeDefined();
    expect(boltUnit?.meta?.lifetime).toBe(7); // 8 - 1 after first cleanup rule
    
    // Step through lifetime (decrements by 1 each step)
    sim.step();
    const boltAfter1 = sim.units.find(u => u.id?.startsWith("bolt_"));
    expect(boltAfter1?.meta?.lifetime).toBe(6);
    
    // Step until it should be gone (7 more steps)
    for (let i = 0; i < 7; i++) {
      sim.step();
    }
    const boltGone = sim.units.find(u => u.id?.startsWith("bolt_"));
    expect(boltGone).toBeUndefined(); // Should be removed when lifetime hits 0
  });

  test("bolt should not damage the caster", () => {
    const hero = sim.addUnit({
      id: "hero",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      dmg: 10,
      team: "friendly",
      tags: ["hero"],
      meta: {}
    });
    
    // Hero casts bolt at their own position
    sim.queuedCommands.push({
      type: "bolt",
      unitId: "hero",
      params: {
        x: 10,
        y: 10
      }
    });
    
    sim.step(); // Process bolt command
    sim.step(); // Process damage/stun effects
    
    // Hero should not be damaged
    const heroAfter = sim.units.find(u => u.id === "hero");
    expect(heroAfter?.hp).toBe(100);
  });

  test("bolt should not stun the caster", () => {
    const hero = sim.addUnit({
      id: "hero",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      dmg: 10,
      team: "friendly",
      tags: ["hero"],
      meta: {}
    });
    
    // Hero casts bolt at their own position
    sim.queuedCommands.push({
      type: "bolt",
      unitId: "hero",
      params: {
        x: 10,
        y: 10
      }
    });
    
    sim.step(); // Process bolt command
    sim.step(); // Process EMP effects
    
    // Hero should not be stunned
    const heroAfter = sim.units.find(u => u.id === "hero");
    expect(heroAfter?.meta?.stunned).toBeUndefined();
    expect(heroAfter?.meta?.stunDuration).toBeUndefined();
  });

  test("bolt should damage and stun enemies at strike location", () => {
    sim.addUnit({
      id: "hero",
      pos: { x: 5, y: 5 },
      hp: 100,
      maxHp: 100,
      dmg: 10,
      team: "friendly",
      tags: ["hero"],
      meta: {}
    });
    
    const enemy = sim.addUnit({
      id: "enemy",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      dmg: 5,
      team: "hostile",
      meta: {}
    });
    
    // Hero casts bolt at enemy position
    sim.queuedCommands.push({
      type: "bolt",
      unitId: "hero",
      params: {
        x: 10,
        y: 10
      }
    });
    
    sim.step(); // Process bolt command
    sim.step(); // Process damage/stun effects
    
    // Enemy should be damaged and stunned
    const enemyAfter = sim.units.find(u => u.id === "enemy");
    expect(enemyAfter?.hp).toBeLessThan(100);
    expect(enemyAfter?.meta?.stunned).toBe(true);
    expect(enemyAfter?.meta?.stunDuration).toBeGreaterThan(0);
  });

  test("bolt stun should wear off after duration", () => {
    sim.addUnit({
      id: "hero",
      pos: { x: 5, y: 5 },
      hp: 100,
      maxHp: 100,
      dmg: 10,
      team: "friendly",
      tags: ["hero"],
      meta: {}
    });
    
    sim.addUnit({
      id: "enemy",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      dmg: 5,
      team: "hostile",
      meta: {}
    });
    
    // Hero casts bolt at enemy position
    sim.queuedCommands.push({
      type: "bolt",
      unitId: "hero",
      params: {
        x: 10,
        y: 10
      }
    });
    
    sim.step(); // Process bolt command
    sim.step(); // Process AOE command
    sim.step(); // Process meta commands from AOE
    
    const enemyStunned = sim.units.find(u => u.id === "enemy");
    expect(enemyStunned?.meta?.stunned).toBe(true);
    const stunDuration = enemyStunned?.meta?.stunDuration || 0;
    
    // Step through stun duration
    for (let i = 0; i < stunDuration + 2; i++) {
      sim.step();
    }
    
    // Enemy should no longer be stunned
    const enemyAfter = sim.units.find(u => u.id === "enemy");
    expect(enemyAfter?.meta?.stunned).toBeUndefined();
    expect(enemyAfter?.meta?.stunDuration).toBeUndefined();
  });
});