import { describe, it, expect } from 'bun:test';
import { SceneLoader } from '../../../src/core/scene_loader';
import { Simulator } from '../../../src/core/simulator';
import perfConfig from '../../perf.json';

describe.skip('Scenario', () => {
  const scenarios = ['simple', 'complex', 'healing', 'projectile'];
  const SIMULATION_STEPS = 1500;
  const EXECUTION_TIME_PER_STEP = perfConfig.budgets.total_step_ms;
  const MAX_EXECUTION_TIME = SIMULATION_STEPS * EXECUTION_TIME_PER_STEP;

  scenarios.forEach(scenario => {
    describe(scenario, () => {
      it(`${scenario} run ${SIMULATION_STEPS} ticks by ${MAX_EXECUTION_TIME}ms`, () => {
        const sim = new Simulator(32, 32);
        const loader = new SceneLoader(sim);
        const startTime = performance.now();
        loader.loadScenario(scenario);
        for (let step = 0; step < SIMULATION_STEPS; step++) {
          sim.step();
          const currentUnits = sim.getRealUnits().length;
          expect(currentUnits).toBeLessThan(100); // Sanity check - no unit explosion
        }
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        expect(executionTime).toBeLessThan(MAX_EXECUTION_TIME);
        const outOfBoundsX = sim.units.filter(u => u.pos.x < 0 || u.pos.x >= sim.fieldWidth);
        const outOfBoundsY = sim.units.filter(u => u.pos.y < 0 || u.pos.y >= sim.fieldHeight);
      
        if (outOfBoundsX.length > 0) {
          console.debug(`Units out of bounds X (field width=${sim.fieldWidth}):`,
            outOfBoundsX.map(u => ({ id: u.id, x: u.pos.x, y: u.pos.y })));
        }
        if (outOfBoundsY.length > 0) {
          console.debug(`Units out of bounds Y (field height=${sim.fieldHeight}):`,
            outOfBoundsY.map(u => ({ id: u.id, x: u.pos.x, y: u.pos.y })));
        }
      
        expect(sim.units.every(u => u.pos.x >= 0 && u.pos.x < sim.fieldWidth)).toBe(true);
        expect(sim.units.every(u => u.pos.y >= 0 && u.pos.y < sim.fieldHeight)).toBe(true);
      });
    });
  });


});