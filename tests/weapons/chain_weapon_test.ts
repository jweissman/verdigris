import { describe, it, expect, beforeEach } from "bun:test";
import { Simulator } from "../../src/core/simulator";

describe("Chain Weapon", () => {
  let sim: Simulator;
  
  beforeEach(() => {
    sim = new Simulator(40, 40);
  });
  
  it("should equip chain weapon on hero", () => {
    const hero = sim.addUnit({
      id: "hero",
      type: "hero",
      pos: { x: 20, y: 20 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      intendedMove: { x: 0, y: 0 },
    });
    
    // Equip chain weapon
    sim.queuedCommands.push({
      type: "chain_weapon",
      unitId: "hero",
      params: {
        action: "equip"
      }
    });
    
    sim.step();
    
    const heroAfter = sim.units.find(u => u.id === "hero");
    expect(heroAfter?.meta?.chainWeapon).toBe(true);
  });
  
  it("should damage enemies when swung", () => {
    const hero = sim.addUnit({
      id: "hero",
      type: "hero",
      pos: { x: 20, y: 20 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      intendedMove: { x: 0, y: 0 },
      dmg: 10,  // Add damage stat
    });
    
    const enemy = sim.addUnit({
      id: "enemy",
      type: "goblin",
      pos: { x: 23, y: 23 }, // Position directly where the ball ends up
      hp: 50,
      maxHp: 50,
      team: "hostile",
      intendedMove: { x: 0, y: 0 },
      dmg: 5,  // Add damage stat
    });
    
    // Equip and swing chain weapon
    sim.queuedCommands.push({
      type: "chain_weapon",
      unitId: "hero",
      params: {
        action: "equip"
      }
    });
    
    sim.step();
    
    // Swing with force
    sim.queuedCommands.push({
      type: "chain_weapon",
      unitId: "hero",
      params: {
        action: "swing",
        direction: "right",
        power: 15
      }
    });
    
    sim.step();
    
    // Update physics to move the ball
    sim.queuedCommands.push({
      type: "chain_weapon",
      params: {
        action: "update"
      }
    });
    
    sim.step();
    
    // Check for collisions after physics update
    sim.queuedCommands.push({
      type: "chain_weapon",
      unitId: "hero",
      params: {
        action: "swing",
        direction: "right",
        power: 0  // Just check collisions
      }
    });
    
    sim.step();
    
    // Process any damage commands
    for (let i = 0; i < 3; i++) {
      sim.step();
    }
    
    // Debug: print all units
    console.log("Units after combat:", sim.units.map(u => ({ id: u.id, hp: u.hp, pos: u.pos })));
    
    const enemyAfter = sim.units.find(u => u.id === "enemy");
    expect(enemyAfter).toBeDefined();
    // Enemy should take damage
    expect(enemyAfter!.hp).toBeLessThan(50);
  });
  
  it("should update chain physics each tick", () => {
    const hero = sim.addUnit({
      id: "hero",
      type: "hero",
      pos: { x: 20, y: 20 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      intendedMove: { x: 0, y: 0 },
    });
    
    // Equip chain weapon
    sim.queuedCommands.push({
      type: "chain_weapon",
      unitId: "hero",
      params: {
        action: "equip"
      }
    });
    
    sim.step();
    
    // Update physics
    sim.queuedCommands.push({
      type: "chain_weapon",
      params: {
        action: "update"
      }
    });
    
    sim.step();
    
    const heroAfter = sim.units.find(u => u.id === "hero");
    // Chain should have link positions after physics update
    expect(heroAfter?.meta?.chainLinks).toBeDefined();
    expect(heroAfter?.meta?.chainBallPos).toBeDefined();
  });
});