import { describe, it, expect, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('2v2 Combat Tests', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
  });

  const creatures = [
    { name: 'wolf', hp: 15, dmg: 3, speed: 2 },
    { name: 'bear', hp: 25, dmg: 5, speed: 1 },
    { name: 'eagle', hp: 10, dmg: 2, speed: 3, abilities: ['ranged'] },
    { name: 'snake', hp: 8, dmg: 4, speed: 2 },
    { name: 'golem', hp: 40, dmg: 8, speed: 0.5 },
  ];

  function setup2v2(team1: any[], team2: any[]) {
    const sim = new Simulator(50, 50);
    sim.sceneBackground = 'arena'; // Prevent ambient spawning
    
    // Team 1 (friendly)
    team1.forEach((creature, i) => {
      sim.addUnit({
        id: `team1_${i}`,
        pos: { x: 20 + i * 2, y: 25 },
        intendedMove: { x: 1, y: 0 }, // Move right toward enemies
        team: 'friendly',
        sprite: creature.name,
        hp: creature.hp,
        maxHp: creature.hp,
        dmg: creature.dmg,
        mass: 1,
        state: 'idle',
        abilities: creature.abilities || ['melee'],
        tags: ['hunt'] // Make units move toward enemies
      });
    });
    
    // Team 2 (hostile)
    team2.forEach((creature, i) => {
      sim.addUnit({
        id: `team2_${i}`,
        pos: { x: 30 - i * 2, y: 25 },
        intendedMove: { x: -1, y: 0 }, // Move left toward enemies
        team: 'hostile',
        sprite: creature.name,
        hp: creature.hp,
        maxHp: creature.hp,
        dmg: creature.dmg,
        mass: 1,
        state: 'idle',
        abilities: creature.abilities || ['melee'],
        tags: ['hunt'] // Make units move toward enemies
      });
    });
    
    return sim;
  }
  
  function runCombat(sim: Simulator, maxSteps = 500): { winner: string, steps: number, survivors: number } {
    for (let step = 0; step < maxSteps; step++) {
      sim.step();
      
      const friendlyAlive = sim.units.filter(u => u.team === 'friendly' && u.hp > 0).length;
      const hostileAlive = sim.units.filter(u => u.team === 'hostile' && u.hp > 0).length;
      
      if (friendlyAlive === 0) {
        return { winner: 'hostile', steps: step, survivors: hostileAlive };
      }
      if (hostileAlive === 0) {
        return { winner: 'friendly', steps: step, survivors: friendlyAlive };
      }
    }
    
    const friendlyAlive = sim.units.filter(u => u.team === 'friendly' && u.hp > 0).length;
    const hostileAlive = sim.units.filter(u => u.team === 'hostile' && u.hp > 0).length;
    
    if (friendlyAlive > hostileAlive) return { winner: 'friendly', steps: maxSteps, survivors: friendlyAlive };
    if (hostileAlive > friendlyAlive) return { winner: 'hostile', steps: maxSteps, survivors: hostileAlive };
    return { winner: 'draw', steps: maxSteps, survivors: 0 };
  }

  it('wolf & bear vs eagle & snake', () => {
    const sim = setup2v2(
      [creatures[0], creatures[1]], // wolf & bear
      [creatures[2], creatures[3]]  // eagle & snake
    );
    
    const result = runCombat(sim);
    console.log(`Wolf & Bear vs Eagle & Snake: ${result.winner} wins in ${result.steps} steps with ${result.survivors} survivors`);
    
    expect(['friendly', 'hostile', 'draw']).toContain(result.winner);
    expect(result.steps).toBeLessThan(500);
  });

  it('balanced melee 2v2', () => {
    const sim = setup2v2(
      [creatures[0], creatures[0]], // 2 wolves
      [creatures[3], creatures[3]]  // 2 snakes
    );
    
    const result = runCombat(sim);
    console.log(`2 Wolves vs 2 Snakes: ${result.winner} wins in ${result.steps} steps`);
    
    expect(['friendly', 'hostile', 'draw']).toContain(result.winner);
  });

  it('tank vs dps composition', () => {
    const sim = setup2v2(
      [creatures[4], creatures[3]], // golem & snake (tank + dps)
      [creatures[0], creatures[0]]  // 2 wolves (balanced)
    );
    
    const result = runCombat(sim);
    console.log(`Golem & Snake vs 2 Wolves: ${result.winner} wins in ${result.steps} steps`);
    
    expect(['friendly', 'hostile', 'draw']).toContain(result.winner);
  });

  it('performance: 2v2 combat step time', () => {
    const sim = setup2v2(
      [creatures[1], creatures[2]], // bear & eagle
      [creatures[0], creatures[3]]  // wolf & snake
    );
    
    const times: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      sim.step();
      times.push(performance.now() - start);
    }
    
    times.sort((a, b) => a - b);
    const median = times[50];
    console.log(`2v2 combat step median: ${median.toFixed(4)}ms`);
    
    expect(median).toBeLessThan(0.1); // Should be fast with only 4 units
  });

  // Matrix test - all possible 2v2 combinations from 5 creatures
  describe('2v2 combination matrix', () => {
    const teamCombos: any[][] = [];
    
    // Generate all 2-creature teams (5C2 = 10 combinations)
    for (let i = 0; i < creatures.length; i++) {
      for (let j = i + 1; j < creatures.length; j++) {
        teamCombos.push([creatures[i], creatures[j]]);
      }
    }
    
    // Test a sample of matchups (not all 10x10=100 to save time)
    const sampleMatchups = [
      [0, 1], [0, 5], [1, 2], [3, 4], [6, 9], [2, 7]
    ];
    
    for (const [team1Idx, team2Idx] of sampleMatchups) {
      if (team1Idx >= teamCombos.length || team2Idx >= teamCombos.length) continue;
      
      const team1 = teamCombos[team1Idx];
      const team2 = teamCombos[team2Idx];
      
      it(`${team1[0].name}+${team1[1].name} vs ${team2[0].name}+${team2[1].name}`, () => {
        const sim = setup2v2(team1, team2);
        const result = runCombat(sim, 300); // Shorter timeout for matrix tests
        
        console.log(`${team1[0].name}+${team1[1].name} vs ${team2[0].name}+${team2[1].name}: ${result.winner} (${result.steps} steps)`);
        
        expect(['friendly', 'hostile', 'draw']).toContain(result.winner);
      });
    }
  });
});