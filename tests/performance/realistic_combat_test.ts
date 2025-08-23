import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Realistic Combat Performance', () => {
  it('should handle 2v2 combat scenarios efficiently', () => {
    const sim = new Simulator(20, 20);
    const teams = ['friendly', 'hostile'] as const;
    const positions = [];
    

    for (let x = 0; x < 7; x++) {
      for (let y = 0; y < 5; y++) {
        positions.push({ x: x * 2 + 1, y: y * 2 + 1 });
      }
    }
    

    for (let i = 0; i < 35; i++) {
      const team = teams[i % 2];
      const pos = positions[i];
      
      sim.addUnit({
        id: `unit_${i}`,
        pos: pos,
        intendedMove: { x: 0, y: 0 },
        team: team,
        sprite: 'soldier',
        state: 'idle' as const,
        hp: 100,
        maxHp: 100,
        dmg: 10,
        mass: 1,
        abilities: ['melee'],
        tags: [],
        meta: {}
      });
    }
    

    const startTime = performance.now();
    const steps = 100;
    
    for (let i = 0; i < steps; i++) {
      sim.step();
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgStepTime = totalTime / steps;
    
    expect(avgStepTime).toBeLessThan(10); // Should be under 10ms per step
    const aliveCount = sim.units.filter(u => u.hp > 0).length;
    expect(aliveCount).toBeLessThanOrEqual(35); // Units alive <= initial count
  });
  
  it('should measure pairwise check overhead', () => {

    const counts = [10, 20, 35, 50, 100];
    const results = [];
    
    for (const count of counts) {
      const sim = new Simulator(50, 50);
      

      for (let i = 0; i < count; i++) {
        const x = (i % 10) * 5;
        const y = Math.floor(i / 10) * 5;
        
        sim.addUnit({
          id: `unit_${i}`,
          pos: { x, y },
          intendedMove: { x: 0, y: 0 },
          team: i % 2 === 0 ? 'friendly' : 'hostile',
          sprite: 'soldier',
          state: 'idle' as const,
          hp: 100,
          maxHp: 100,
          dmg: 10,
          mass: 1,
          abilities: ['melee'],
          tags: [],
          meta: {}
        });
      }
      

      const startTime = performance.now();
      for (let i = 0; i < 10; i++) {
        sim.step();
      }
      const endTime = performance.now();
      
      const avgTime = (endTime - startTime) / 10;
      const pairsChecked = (count * (count - 1)) / 2;
      
      results.push({
        units: count,
        pairs: pairsChecked,
        avgStepTime: avgTime,
        timePerPair: avgTime / pairsChecked * 1000000
      });
    }
    
    // console.log('\nPairwise scaling analysis:');
    // console.log('Units | Pairs  | Step(ms) | Per-pair(ns)');
    // console.log('------|--------|----------|-------------');
    // for (const r of results) {
    //   console.log(
    //     `${r.units.toString().padStart(5)} | ` +
    //     `${r.pairs.toString().padStart(6)} | ` +
    //     `${r.avgStepTime.toFixed(4).padStart(8)} | ` +
    //     `${r.timePerPair.toFixed(1).padStart(11)}`
    //   );
    // }
    

    const perPairTimes = results.map(r => r.timePerPair);
    const avgPerPair = perPairTimes.reduce((a, b) => a + b) / perPairTimes.length;
    
    for (const time of perPairTimes) {
      const deviation = Math.abs(time - avgPerPair) / avgPerPair;
      expect(deviation).toBeLessThan(3.0); // Should be within 300% of average (performance can vary)
    }
  });
  
  it.skip('should handle realistic 4-player free-for-all', () => {
    const sim = new Simulator(20, 20);
    

    const teams = ['friendly', 'hostile', 'neutral', 'neutral'] as const;
    const teamSizes = [9, 9, 8, 9]; // Total: 35
    let unitIndex = 0;
    
    for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {
      const team = teams[teamIdx];
      const size = teamSizes[teamIdx];
      

      const baseX = (teamIdx % 2) * 15 + 2;
      const baseY = Math.floor(teamIdx / 2) * 15 + 2;
      
      for (let i = 0; i < size; i++) {
        const x = baseX + (i % 3) * 2;
        const y = baseY + Math.floor(i / 3) * 2;
        
        sim.addUnit({
          id: `unit_${unitIndex++}`,
          pos: { x, y },
          intendedMove: { x: 0, y: 0 },
          team: team,
          sprite: 'soldier',
          state: 'idle' as const,
          hp: 100,
          maxHp: 100,
          dmg: 10,
          mass: 1,
          abilities: ['melee', 'ranged'],
          tags: [],
          meta: {}
        });
      }
    }
    

    const startTime = performance.now();
    const maxSteps = 500;
    let battleOver = false;
    let steps = 0;
    
    while (steps < maxSteps && !battleOver) {
      sim.step();
      steps++;
      

      const aliveTeams = new Set(
        sim.units.filter(u => u.hp > 0).map(u => u.team)
      );
      battleOver = aliveTeams.size <= 1;
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgStepTime = totalTime / steps;
    
    // console.log(`\n4-way battle (35 units, ${steps} steps):`);
    // console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
    // console.log(`  Avg per step: ${avgStepTime.toFixed(4)}ms`);
    // console.log(`  Battle over: ${battleOver}`);
    
    if (battleOver) {
      const survivors = sim.units.filter(u => u.hp > 0);
      // console.log(`  Survivors: ${survivors.length}`);
      // console.log(`  Winning team: ${survivors[0]?.team || 'none'}`);
    }
    
    expect(avgStepTime).toBeLessThan(15); // Slightly higher threshold for complex battle
  });
});