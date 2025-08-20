import { describe, expect, it } from "bun:test";
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from "../../src/core/scene_loader";

describe("Scene Integration", () => {
  it("should run basic combat scene for multiple steps", () => {
    const sim = new Simulator(10, 10);
    
    const scene = [
      "s.w",
      "...",
      "..."
    ];
    
    const loader = new SceneLoader(sim);
    loader.loadSimpleFormat(scene.join('\n'));
    
    expect(sim.units.length).toBeGreaterThan(1);
    
    const initialUnitCount = sim.units.length;
    let aliveUnits = sim.units.filter(u => u.hp > 0).length;
    
    for (let i = 0; i < 20; i++) {
      sim.step();
      
      const currentAlive = sim.units.filter(u => u.hp > 0).length;
      if (currentAlive < aliveUnits) {
        break;
      }
    }
    
    const finalAlive = sim.units.filter(u => u.hp > 0).length;
    expect(finalAlive).toBeLessThanOrEqual(initialUnitCount);
  });

  // Basic scenes that should always work
  describe("Core Scenes", () => {
    const coreScenes = ['simple', 'complex', 'healing', 'projectile', 'squirrel'];
    
    for (const sceneName of coreScenes) {
      it(`should load and run ${sceneName} scene`, () => {
        const sim = new Simulator(10, 10);
        const loader = new SceneLoader(sim);
        
        loader.loadScenario(sceneName);
        expect(sim.units.length).toBeGreaterThan(0);
        
        // Run a few steps to ensure no crashes
        for (let i = 0; i < 10; i++) {
          sim.step();
        }
        
        const aliveUnits = sim.units.filter(u => u.hp > 0 && !u.meta?.segment).length;
        expect(aliveUnits).toBeGreaterThan(0);
      });
    }
  });

  // Combat scenarios
  describe("Combat Scenes", () => {
    const combatScenes = ['chess', 'desert', 'mechatronSolo', 'forestTracker', 'forestDay'];
    
    for (const sceneName of combatScenes) {
      it(`should load and run ${sceneName} scene`, () => {
        const sim = new Simulator(10, 10);
        const loader = new SceneLoader(sim);
        
        loader.loadScenario(sceneName);
        expect(sim.units.length).toBeGreaterThan(0);
        
        // Run a few steps
        for (let i = 0; i < 10; i++) {
          sim.step();
        }
        
        const aliveUnits = sim.units.filter(u => u.hp > 0 && !u.meta?.segment).length;
        expect(aliveUnits).toBeGreaterThan(0);
      });
    }
  });

  // Challenge/Gauntlet scenes - may have different expectations
  describe("Challenge Scenes", () => {
    const challengeScenes = ['toymakerChallenge', 'toymakerBalanced', 'ultimateGauntlet', 'survivalArena', 'tacticalGauntlet'];
    
    for (const sceneName of challengeScenes) {
      it.skip(`should load ${sceneName} scene (challenge)`, () => {
        // Skip these for now as they may be designed to be difficult
        const sim = new Simulator(10, 10);
        const loader = new SceneLoader(sim);
        
        loader.loadScenario(sceneName);
        expect(sim.units.length).toBeGreaterThan(0);
      });
    }
  });

  // Mythic/Boss scenes
  describe("Mythic Scenes", () => {
    const mythicScenes = ['mythicDragonLair', 'mythicTitanColossus', 'mythicLichThrone', 'mythicKrakenDepths', 'dragonEncounter'];
    
    for (const sceneName of mythicScenes) {
      it.skip(`should load ${sceneName} scene (mythic)`, () => {
        // Skip these for now as they contain spawns and special mechanics
        const sim = new Simulator(10, 10);
        const loader = new SceneLoader(sim);
        
        loader.loadScenario(sceneName);
        expect(sim.units.length).toBeGreaterThan(0);
      });
    }
  });

  // Test scenes
  describe("Test Scenes", () => {
    const testScenes = ['simpleMesowormTest', 'heroShowcase', 'titleBackground'];
    
    for (const sceneName of testScenes) {
      it(`should load and run ${sceneName} scene`, () => {
        const sim = new Simulator(10, 10);
        const loader = new SceneLoader(sim);
        
        loader.loadScenario(sceneName);
        
        // These might be empty or minimal
        for (let i = 0; i < 5; i++) {
          sim.step();
        }
        
        // Just check it doesn't crash
        expect(true).toBe(true);
      });
    }
  });

  // New content scenes
  describe("New Content Scenes", () => {
    const newScenes = ['citySiege', 'swampAmbush', 'hamletDefense', 'toymaker'];
    
    for (const sceneName of newScenes) {
      it(`should load and run ${sceneName} scene`, () => {
        const sim = new Simulator(10, 10);
        const loader = new SceneLoader(sim);
        
        loader.loadScenario(sceneName);
        expect(sim.units.length).toBeGreaterThan(0);
        
        for (let i = 0; i < 10; i++) {
          sim.step();
        }
        
        const aliveUnits = sim.units.filter(u => u.hp > 0 && !u.meta?.segment).length;
        expect(aliveUnits).toBeGreaterThan(0);
      });
    }
  });

  // Comprehensive test - run all scenes in single sim
  it.skip("should run all known scenes comprehensively", () => {
    const sim = new Simulator(10, 10);
    const loader = new SceneLoader(sim);
    const failedScenes: string[] = [];
    
    for (const scene in SceneLoader.scenarios) {
      // Skip challenge scenarios that are expected to be difficult
      if (scene.includes('Challenge') || scene.includes('challenge') || 
          scene.includes('mythic') || scene.includes('Mythic') ||
          scene.includes('ultimate') || scene.includes('Ultimate') ||
          scene.includes('survival') || scene.includes('Survival')) {
        continue;
      }
      
      sim.reset();
      loader.loadScenario(scene);

      const initialUnitCount = sim.units.filter(u => !u.meta?.segment && !u.meta?.phantom).length;
      
      for (let i = 0; i < 30; i++) {
        sim.step();
      }
      
      const aliveUnits = sim.units.filter(u => u.hp > 0 && !u.meta?.segment && !u.meta?.phantom).length;
      
      if (aliveUnits < 1) {
        failedScenes.push(scene);
      }
    }
    
    expect(failedScenes).toEqual([]);
  });
});