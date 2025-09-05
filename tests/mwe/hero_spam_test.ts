import { describe, it, expect, beforeEach } from "bun:test";
import { HeroGame } from "../../src/mwe/hero";
import { PlayerControl } from "../../src/rules/player_control";

describe("Hero MWE ability spam issue", () => {
  let game: HeroGame;
  let playerControl: PlayerControl | undefined;
  
  beforeEach(() => {
    // Create a mock canvas
    const canvas = {
      width: 320,
      height: 200,
      getContext: () => null,
    } as any;
    
    game = new HeroGame(canvas);
    game.bootstrap();
    
    // Get PlayerControl from the simulator's existing rules
    playerControl = game.sim.rules.find(
      (r) => r instanceof PlayerControl
    ) as PlayerControl | undefined;
  });
  
  it("should not fire ANY abilities without input", () => {
    // Run simulation for 50 ticks with NO input
    for (let tick = 0; tick < 50; tick++) {
      game.sim.tick();
    }
    
    // Check events - there should be NO attack events
    const events = game.sim.getProcessedEvents();
    const attackEvents = events.filter(e => 
      e.kind === "aoe" || 
      e.kind === "impact" ||
      e.kind === "damage" && e.source === "hero"
    );
    
    console.log(`Total events: ${events.length}`);
    console.log(`Attack events: ${attackEvents.length}`);
    
    if (attackEvents.length > 0) {
      console.log("Attack events found:", attackEvents.map(e => ({
        kind: e.kind,
        source: e.source,
        target: e.target,
        meta: e.meta
      })));
    }
    
    // Should have NO attack events from hero
    expect(attackEvents.length).toBe(0);
  });
  
  it("should not have bolt units spawned without input", () => {
    // Run simulation for 50 ticks with NO input
    for (let tick = 0; tick < 50; tick++) {
      game.sim.tick();
    }
    
    // Check for bolt effect units
    const boltUnits = game.sim.units.filter(u => 
      u.id.startsWith("bolt_") || 
      u.kind === "lightning_bolt"
    );
    
    console.log(`Bolt units found: ${boltUnits.length}`);
    if (boltUnits.length > 0) {
      console.log("Bolt units:", boltUnits.map(u => u.id));
    }
    
    // Should have NO bolt units
    expect(boltUnits.length).toBe(0);
  });
  
  it("should show what commands are being queued", () => {
    // Store commands from first few ticks
    const commandsByTick: any[] = [];
    
    for (let tick = 0; tick < 5; tick++) {
      // Capture commands before tick
      const commandsBefore = [...game.sim.queuedCommands];
      
      game.sim.tick();
      
      // Log what was queued
      if (commandsBefore.length > 0) {
        commandsByTick.push({
          tick,
          commands: commandsBefore.map(c => ({
            type: c.type,
            unitId: c.unitId,
            params: c.params
          }))
        });
      }
    }
    
    console.log("Commands by tick:", JSON.stringify(commandsByTick, null, 2));
    
    // Check for attack commands
    const attackCommands = commandsByTick.flatMap(t => 
      t.commands.filter((c: any) => 
        c.type === "bolt" || 
        c.type === "strike" ||
        c.type === "freeze" ||
        c.type === "fire"
      )
    );
    
    console.log(`Attack commands found: ${attackCommands.length}`);
    
    // Should have NO attack commands
    expect(attackCommands.length).toBe(0);
  });
  
  it("should verify PlayerControl has no keys held", () => {
    if (!playerControl) {
      console.log("PlayerControl not found!");
      return;
    }
    
    // Run one tick
    game.sim.tick();
    
    // Check that no keys are held
    // @ts-ignore - accessing private for debugging
    const keysHeld = playerControl.keysHeld;
    
    console.log(`Keys held: ${Array.from(keysHeld).join(', ') || 'none'}`);
    
    expect(keysHeld.size).toBe(0);
  });
});