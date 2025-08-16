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

  it("should run all known scenes", () => {
    const sim = new Simulator(10, 10);
    const loader = new SceneLoader(sim);
    const failedScenes: string[] = [];
    
    for (const scene in SceneLoader.scenarios) {
      sim.reset(); // Reset simulator between scenes
      loader.loadScenario(scene);

      const initialUnitCount = sim.units.filter(u => !u.meta?.segment && !u.meta?.phantom).length; // Don't count segments or phantoms
      

      for (let i = 0; i < 30; i++) {
        sim.step();
      }
      

      const aliveUnits = sim.units.filter(u => u.hp > 0 && !u.meta?.segment && !u.meta?.phantom).length;
      const totalUnitsIncludingSegments = sim.units.filter(u => u.hp > 0).length;
      
      if (aliveUnits < 1) {
        failedScenes.push(scene);
      }
    }
    
    expect(failedScenes).toEqual([]);
  });




    











    


    

    
    



      




    







    





    

    
    

    



      




    




});