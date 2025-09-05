import { describe, it, expect, beforeEach } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import { PlayerControl } from "../../src/rules/player_control";
import { TickContextImpl } from "../../src/core/tick_context";

describe("PlayerControl cooldowns", () => {
  let sim: Simulator;
  let playerControl: PlayerControl;
  let context: TickContextImpl;

  beforeEach(() => {
    sim = new Simulator();
    playerControl = new PlayerControl();
    context = new TickContextImpl(sim);
    
    // Create a hero
    sim.units.push({
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
      abilities: ["strike", "bolt"],
      meta: {
        controlled: true,
        facing: "right",
        primaryAction: "bolt",
      },
    });
    
    // Create an enemy
    sim.units.push({
      id: "enemy",
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
    });
  });

  it("should not fire bolt without pressing attack key", () => {
    // Don't press any keys
    const commands = playerControl.execute(context);
    
    // Should have no commands
    expect(commands.length).toBe(0);
  });

  it("should fire bolt when Q is pressed", () => {
    // Press Q
    playerControl.setKeyState("q", true);
    
    const commands = playerControl.execute(context);
    
    // Should have bolt command
    const boltCommand = commands.find(c => c.type === "bolt");
    expect(boltCommand).toBeDefined();
    
    // Release Q
    playerControl.setKeyState("q", false);
  });

  it("should respect bolt cooldown", () => {
    // Press and hold Q
    playerControl.setKeyState("q", true);
    
    // First execution should fire
    let commands = playerControl.execute(context);
    expect(commands.find(c => c.type === "bolt")).toBeDefined();
    
    // Advance one tick
    sim.ticks = 1;
    
    // Second execution should NOT fire (still on cooldown)
    commands = playerControl.execute(context);
    expect(commands.find(c => c.type === "bolt")).toBeUndefined();
    
    // Advance past cooldown (30 ticks for bolt)
    sim.ticks = 31;
    
    // Should fire again
    commands = playerControl.execute(context);
    expect(commands.find(c => c.type === "bolt")).toBeDefined();
    
    // Clean up
    playerControl.setKeyState("q", false);
  });

  it("should not fire when no enemies exist", () => {
    // Remove enemy
    sim.units = sim.units.filter(u => u.id !== "enemy");
    
    // Press Q
    playerControl.setKeyState("q", true);
    
    const commands = playerControl.execute(context);
    
    // Should NOT have bolt command (no target)
    const boltCommand = commands.find(c => c.type === "bolt");
    expect(boltCommand).toBeUndefined();
    
    // Release Q
    playerControl.setKeyState("q", false);
  });
});