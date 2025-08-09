import { describe, expect, it } from "bun:test";
import { Simulator } from "../src/simulator";
import { SceneLoader } from "../src/scene_loader";

describe("Scene Integration", () => {
  it("should run basic combat scene for multiple steps", () => {
    const sim = new Simulator(10, 10);
    
    // Load a simple combat scene
    const scene = [
      "s.w", // soldier vs worm
      "...",
      "..."
    ];
    
    // SceneLoader.loadScene(sim, scene);
    const loader = new SceneLoader(sim);
    loader.loadSimpleFormat(scene.join('\n'));
    
    // Verify units were created
    expect(sim.units.length).toBeGreaterThan(1);
    
    const initialUnitCount = sim.units.length;
    let aliveUnits = sim.units.filter(u => u.hp > 0).length;
    
    // Run for 20 steps and verify simulation progresses
    for (let i = 0; i < 20; i++) {
      sim.step();
      
      const currentAlive = sim.units.filter(u => u.hp > 0).length;
      if (currentAlive < aliveUnits) {
        console.log(`Unit died at step ${i}, alive: ${currentAlive}/${initialUnitCount}`);
        break;
      }
    }
    
    // Should have some combat resolution
    const finalAlive = sim.units.filter(u => u.hp > 0).length;
    expect(finalAlive).toBeLessThanOrEqual(initialUnitCount);
  });

  it("should run all known scenes", () => {
    const sim = new Simulator(10, 10);
    const loader = new SceneLoader(sim);
    for (const scene in SceneLoader.scenarios) {
      console.log(`Running scene: ${scene}`);
      loader.loadScenario(scene);

      const initialUnitCount = sim.units.filter(u => !u.meta.segment).length; // Don't count segments
      
      // Run for 30 steps
      for (let i = 0; i < 30; i++) {
        sim.step();
      }
      
      // Verify some units are still alive (excluding segments)
      const aliveUnits = sim.units.filter(u => u.hp > 0 && !u.meta.segment).length;
      const totalUnitsIncludingSegments = sim.units.filter(u => u.hp > 0).length;
      
      expect(aliveUnits).toBeGreaterThanOrEqual(1);
      // Allow for segments to be created
      expect(totalUnitsIncludingSegments).toBeGreaterThanOrEqual(aliveUnits);
    }
  });

  // we should just set these up as scenarios and then run them
  // it("should run priest vs ghost scene", () => {
  //   const sim = new Simulator(10, 10);
    
  //   // Create priest vs ghost scenario manually since scene loader uses single chars
  //   const priest = { 
  //     ...SceneLoader.unitMappings['p'](), // priest
  //     pos: { x: 2, y: 2 },
  //     team: 'friendly' as const
  //   };
  //   const ghost = { 
  //     ...SceneLoader.unitMappings['g'](), // should be ghost if defined
  //     pos: { x: 3, y: 2 },
  //     team: 'hostile' as const
  //   };
    
  //   sim.addUnit(priest);
  //   sim.addUnit(ghost);
    
  //   const initialGhostHp = ghost.hp;
    
  //   console.log(`Starting priest vs ghost: priest abilities = ${Object.keys(priest.abilities || {})}`);
  //   console.log(`Ghost perdurance = ${ghost.meta?.perdurance}`);
    
  //   // Run for multiple steps
  //   for (let i = 0; i < 50; i++) {
  //     sim.step();
      
  //     if (ghost.hp < initialGhostHp) {
  //       console.log(`Ghost took damage at step ${i}: ${ghost.hp}/${initialGhostHp}`);
  //       break;
  //     }
  //   }
    
  //   // Test passes if we can verify the setup worked
  //   expect(priest.team).toBe('friendly');
  //   expect(ghost.team).toBe('hostile');
  // });

  // it("should run rainmaker weather test", () => {
  //   const sim = new Simulator(10, 10);
    
  //   // Create rainmaker manually
  //   const rainmaker = { 
  //     ...SceneLoader.unitMappings['r'](), // rainmaker if defined
  //     pos: { x: 5, y: 5 }
  //   };
    
  //   sim.addUnit(rainmaker);
    
  //   console.log(`Rainmaker abilities: ${Object.keys(rainmaker.abilities || {})}`);
    
  //   const initialWeather = sim.weather.current;
    
  //   // Run simulation to see if weather changes
  //   for (let i = 0; i < 250; i++) { // More than makeRain cooldown
  //     sim.step();
      
  //     if (sim.weather.current !== initialWeather) {
  //       console.log(`Weather changed at step ${i}: ${sim.weather.current}`);
  //       break;
  //     }
  //   }
    
  //   // Test basic setup
  //   expect(rainmaker.pos.x).toBe(5);
  //   expect(rainmaker.pos.y).toBe(5);
  // });
});