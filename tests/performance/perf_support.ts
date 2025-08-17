import { Simulator } from '../../src/core/simulator';
import perfConfig from '../perf.json';

export const PerfBudgets = perfConfig.budgets;

export interface TimingResult {
  avg: number;
  median: number;
  min: number;
  max: number;
  samples: number[];
}

export function timeExecution(fn: () => void, iterations: number = 1000): TimingResult {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const median = times[Math.floor(times.length / 2)];
  const min = times[0];
  const max = times[times.length - 1];
  
  return { avg, median, min, max, samples: times };
}

export function createTestSimulator(unitCount: number = 50): Simulator {
  const sim = new Simulator(50, 50);
  
  for (let i = 0; i < unitCount; i++) {
    sim.addUnit({
      id: `unit_${i}`,
      pos: { x: Math.random() * 50, y: Math.random() * 50 },
      intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
      team: i % 2 === 0 ? 'friendly' : 'hostile',
      hp: 20,
      abilities: ['melee', 'ranged']
    });
  }
  
  // Warm up
  for (let i = 0; i < 100; i++) {
    sim.step();
  }
  
  return sim;
}

export function profileRules(sim: Simulator, iterations: number = 100): Map<string, TimingResult> {
  const results = new Map<string, TimingResult>();
  const context = sim.getTickContext();
  
  for (const rule of sim.rulebook) {
    const ruleName = rule.constructor.name;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      rule.execute(context);
      times.push(performance.now() - start);
    }
    
    times.sort((a, b) => a - b);
    results.set(ruleName, {
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      median: times[Math.floor(times.length / 2)],
      min: times[0],
      max: times[times.length - 1],
      samples: times
    });
  }
  
  return results;
}

export function formatPerformanceTable(results: Map<string, TimingResult>): string {
  const lines: string[] = [];
  lines.push('Rule Name                    | Median (ms) | Avg (ms) | % of Budget');
  lines.push('---------------------------- | ----------- | -------- | -----------');
  
  let totalMedian = 0;
  const sorted = Array.from(results.entries()).sort((a, b) => b[1].median - a[1].median);
  
  for (const [name, timing] of sorted) {
    const percent = (timing.median / PerfBudgets.rule_execution_ms) * 100;
    const status = percent > 100 ? '❌' : percent > 80 ? '⚠️ ' : '✅';
    lines.push(
      `${name.padEnd(28)} | ${timing.median.toFixed(4).padStart(11)} | ${timing.avg.toFixed(4).padStart(8)} | ${percent.toFixed(0).padStart(3)}% ${status}`
    );
    totalMedian += timing.median;
  }
  
  lines.push('---------------------------- | ----------- | -------- | -----------');
  const totalPercent = (totalMedian / PerfBudgets.total_step_ms) * 100;
  const totalStatus = totalPercent > 100 ? '❌' : totalPercent > 80 ? '⚠️ ' : '✅';
  lines.push(
    `TOTAL                        | ${totalMedian.toFixed(4).padStart(11)} |          | ${totalPercent.toFixed(0).padStart(3)}% ${totalStatus}`
  );
  
  return lines.join('\n');
}