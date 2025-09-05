import { describe, it, expect, beforeEach } from "bun:test";
import { HarmoniumGame } from "../../src/mwe/harmonium";

describe("HarmoniumGame", () => {
  let game: HarmoniumGame;
  
  beforeEach(() => {
    // Create a mock canvas
    const canvas = {
      width: 320,
      height: 200,
      getContext: () => null,
    } as any;
    
    game = new HarmoniumGame(canvas);
    game.bootstrap();
  });
  
  it("should create mages and skeletons", () => {
    const mages = game.sim.units.filter(u => u.type === "mage");
    const skeletons = game.sim.units.filter(u => u.type === "skeleton");
    const hero = game.sim.units.find(u => u.id === "hero");
    
    expect(mages.length).toBe(5);
    expect(skeletons.length).toBe(12);
    expect(hero).toBeDefined();
  });
  
  it("should have correct team assignments", () => {
    const mages = game.sim.units.filter(u => u.type === "mage");
    const skeletons = game.sim.units.filter(u => u.type === "skeleton");
    const hero = game.sim.units.find(u => u.id === "hero");
    
    mages.forEach(mage => {
      expect(mage.team).toBe("friendly");
    });
    
    skeletons.forEach(skeleton => {
      expect(skeleton.team).toBe("hostile");
    });
    
    expect(hero?.team).toBe("friendly");
  });
  
  it("should simulate battle where friendlies win", () => {
    // Run simulation for a while  
    for (let tick = 0; tick < 1000; tick++) { // Increased simulation time
      game.sim.tick();
      
      // Check if battle is over
      const hostiles = game.sim.units.filter(u => u.team === "hostile" && u.hp > 0);
      if (hostiles.length === 0) {
        // Battle won by friendlies
        console.log(`Friendlies won at tick ${tick}`);
        break;
      }
    }
    
    // Check final state
    const survivingFriendlies = game.sim.units.filter(u => u.team === "friendly" && u.hp > 0);
    const survivingHostiles = game.sim.units.filter(u => u.team === "hostile" && u.hp > 0);
    
    // Log the survivors for debugging
    console.log(`Surviving friendlies: ${survivingFriendlies.length} (${survivingFriendlies.map(u => u.type).join(', ')})`);
    console.log(`Surviving hostiles: ${survivingHostiles.length} (${survivingHostiles.map(u => u.id).join(', ')})`);
    
    // Friendlies should win (mages + hero should defeat skeletons)
    expect(survivingFriendlies.length).toBeGreaterThan(0);
    expect(survivingHostiles.length).toBe(0);
  });
  
  it("should have the correct background", () => {
    expect(game.sim.sceneBackground).toBe("grad");
  });
  
  it("should create environmental crystals", () => {
    const crystals = game.sim.units.filter(u => u.type === "crystal");
    expect(crystals.length).toBe(4);
    
    crystals.forEach(crystal => {
      expect(crystal.team).toBe("neutral");
      expect(crystal.tags).toContain("obstacle");
      expect(crystal.tags).toContain("indestructible");
    });
  });
});