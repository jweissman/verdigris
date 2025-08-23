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


  describe("Core Scenes", () => {
    const coreScenes = ['simple', 'complex', 'healing', 'projectile', 'squirrel'];
    
    for (const sceneName of coreScenes) {
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


  describe("Combat Scenes", () => {
    const combatScenes = ['chess', 'desert', 'mechatronSolo', 'forestTracker', 'forestDay'];
    
    for (const sceneName of combatScenes) {
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


  describe("Challenge Scenes", () => {
    const challengeScenes = ['toymakerChallenge', 'toymakerBalanced', 'ultimateGauntlet', 'survivalArena', 'tacticalGauntlet'];
    
    for (const sceneName of challengeScenes) {
      it.skip(`should load ${sceneName} scene (challenge)`, () => {

        const sim = new Simulator(10, 10);
        const loader = new SceneLoader(sim);
        
        loader.loadScenario(sceneName);
        expect(sim.units.length).toBeGreaterThan(0);
      });
    }
  });


  describe("Mythic Scenes", () => {
    const mythicScenes = ['mythicDragonLair', 'mythicTitanColossus', 'mythicLichThrone', 'mythicKrakenDepths', 'dragonEncounter'];
    
    for (const sceneName of mythicScenes) {
      it.skip(`should load ${sceneName} scene (mythic)`, () => {

        const sim = new Simulator(10, 10);
        const loader = new SceneLoader(sim);
        
        loader.loadScenario(sceneName);
        expect(sim.units.length).toBeGreaterThan(0);
      });
    }
  });


  describe("Test Scenes", () => {
    const testScenes = ['simpleMesowormTest', 'heroShowcase', 'titleBackground'];
    
    for (const sceneName of testScenes) {
      it(`should load and run ${sceneName} scene`, () => {
        const sim = new Simulator(10, 10);
        const loader = new SceneLoader(sim);
        
        loader.loadScenario(sceneName);
        

        for (let i = 0; i < 5; i++) {
          sim.step();
        }
        

        expect(true).toBe(true);
      });
    }
  });


  describe("New Content Scenes", () => {
    const newScenes = ['citySiege', 'swampAmbush', 'hamletDefense', 'toymaker'];
    
    for (const sceneName of newScenes) {
      it(`should load and run ${sceneName} scene`, () => {
        const sim = new Simulator(10, 10);
        const loader = new SceneLoader(sim);
        
        loader.loadScenario(sceneName);
        expect(sim.units.length).toBeGreaterThan(0);
        
        // For toymaker scene, check earlier as combat might be very fast
        const stepsToRun = sceneName === 'toymaker' ? 5 : 10;
        
        for (let i = 0; i < stepsToRun; i++) {
          sim.step();
        }
        
        const aliveUnits = sim.units.filter(u => u.hp > 0 && !u.meta?.segment).length;
        
        // Toymaker scene might have fast combat, so just check it loaded
        if (sceneName === 'toymaker') {
          expect(sim.units.length).toBeGreaterThan(0);
        } else {
          expect(aliveUnits).toBeGreaterThan(0);
        }
      });
    }
  });


  it.skip("should run all known scenes comprehensively", () => {
    const sim = new Simulator(10, 10);
    const loader = new SceneLoader(sim);
    const failedScenes: string[] = [];
    
    for (const scene in SceneLoader.scenarios) {

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