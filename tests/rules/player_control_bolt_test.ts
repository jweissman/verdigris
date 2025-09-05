import { describe, it, expect, beforeEach } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import { PlayerControl } from "../../src/rules/player_control";
import { Unit } from "../../src/types/Unit";

describe("PlayerControl bolt ability", () => {
  let sim: Simulator;
  let playerControl: PlayerControl;
  let hero: Unit;
  let target: Unit;

  beforeEach(() => {
    sim = new Simulator();
    playerControl = new PlayerControl(sim);
    sim.rules.push(playerControl);

    // Create controlled hero with bolt ability
    hero = {
      id: "hero",
      type: "hero",
      pos: { x: 5, y: 5 },
      vel: { x: 0, y: 0 },
      intendedMove: null,
      hp: 100,
      maxHp: 100,
      dmg: 20,
      team: "friendly",
      state: "idle",
      mass: 10,
      abilities: ["bolt"],
      meta: {
        controlled: true,
        facing: "right",
        primaryAction: "bolt",
      },
    };
    sim.units.push(hero);

    // Create target enemy
    target = {
      id: "goblin",
      type: "goblin",
      pos: { x: 8, y: 5 },
      vel: { x: 0, y: 0 },
      intendedMove: null,
      hp: 50,
      maxHp: 50,
      dmg: 5,
      team: "hostile",
      state: "idle",
      mass: 5,
      abilities: [],
    };
    sim.units.push(target);
  });

  it("should create a projectile when firing bolt", () => {
    // Set attack key state
    playerControl.setKeyState("k", true);
    
    // Process one tick
    playerControl.apply();
    
    // Check that a projectile command was queued
    const projectileCommand = sim.queuedCommands.find(
      cmd => cmd.type === "projectile"
    );
    
    expect(projectileCommand).toBeDefined();
    expect(projectileCommand?.params.projectileType).toBe("magic_bolt");
    expect(projectileCommand?.params.damage).toBe(20);
    expect(projectileCommand?.params.team).toBe("friendly");
  });

  it("should not create lightning strike effects", () => {
    // Set attack key state
    playerControl.setKeyState("k", true);
    
    // Process one tick
    playerControl.apply();
    
    // Check that NO bolt (lightning) command was queued
    const boltCommand = sim.queuedCommands.find(
      cmd => cmd.type === "bolt"
    );
    
    expect(boltCommand).toBeUndefined();
    
    // Check that NO lightning command was queued
    const lightningCommand = sim.queuedCommands.find(
      cmd => cmd.type === "lightning"
    );
    
    expect(lightningCommand).toBeUndefined();
  });

  it("should target nearest enemy", () => {
    // Add another enemy closer to hero
    const closerEnemy: Unit = {
      id: "goblin2",
      type: "goblin",
      pos: { x: 6, y: 5 },
      vel: { x: 0, y: 0 },
      intendedMove: null,
      hp: 50,
      maxHp: 50,
      dmg: 5,
      team: "hostile",
      state: "idle",
      mass: 5,
      abilities: [],
    };
    sim.units.push(closerEnemy);
    
    // Set attack key state
    playerControl.setKeyState("k", true);
    
    // Process one tick
    playerControl.apply();
    
    // Check that projectile targets the closer enemy
    const projectileCommand = sim.queuedCommands.find(
      cmd => cmd.type === "projectile"
    );
    
    expect(projectileCommand?.params.targetX).toBe(6);
    expect(projectileCommand?.params.targetY).toBe(5);
  });

  it("should respect cooldown between shots", () => {
    // Fire first bolt
    playerControl.setKeyState("k", true);
    playerControl.apply();
    
    expect(sim.queuedCommands.length).toBe(1);
    
    // Try to fire again immediately (should be on cooldown)
    sim.queuedCommands = [];
    playerControl.apply();
    
    expect(sim.queuedCommands.length).toBe(0);
    
    // Advance time past cooldown (30 ticks)
    for (let i = 0; i < 30; i++) {
      sim.ticks++;
      playerControl.apply();
    }
    
    // Should be able to fire again
    sim.queuedCommands = [];
    playerControl.apply();
    
    expect(sim.queuedCommands.length).toBe(1);
  });
});