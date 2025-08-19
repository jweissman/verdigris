import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Toymaker Challenge', () => {
  it('should analyze if toymaker can defeat 10 worms', () => {

    
    const sim = new Simulator(40, 20);
    const sceneLoader = new SceneLoader(sim);
    

    sceneLoader.loadScenario('toymakerChallenge');
    

    

    const toymakers = sim.units.filter(u => u.type === 'toymaker');
    const worms = sim.units.filter(u => u.type === 'worm');
    const initialWormCount = worms.length;
    




    

    let step = 0;
    const maxSteps = 500;
    let lastWormCount = initialWormCount;
    let lastToymakerCount = toymakers.length;
    
    while (step < maxSteps) {
      sim.step();
      step++;
      
      const currentWorms = sim.units.filter(u => u.type === 'worm' && u.hp > 0);
      const currentToymakers = sim.units.filter(u => u.type === 'toymaker' && u.hp > 0);
      const clankers = sim.units.filter(u => u.type === 'clanker');
      

      if (step % 50 === 0 || 
          currentWorms.length !== lastWormCount || 
          currentToymakers.length !== lastToymakerCount) {



        const bots = sim.units.filter(u => ['clanker', 'freezebot', 'spiker', 'swarmbot', 'roller', 'zapper'].includes(u.type));


        
        if (currentToymakers.length > 0) {


        }
        
        lastWormCount = currentWorms.length;
        lastToymakerCount = currentToymakers.length;
      }
      

      if (currentWorms.length === 0) {

        break;
      }
      
      if (currentToymakers.length === 0) {

        break;
      }
    }
    

    const finalWorms = sim.units.filter(u => u.type === 'worm' && u.hp > 0);
    const finalToymakers = sim.units.filter(u => u.type === 'toymaker' && u.hp > 0);
    const finalClankers = sim.units.filter(u => u.type === 'clanker' && u.hp > 0);
    





    
    if (step >= maxSteps) {

    }
    

    const victory = finalWorms.length === 0 && finalToymakers.length > 0;

    

    expect(sim.units.length).toBeGreaterThan(0);
  });
  
  it('should test toymaker clanker deployment mechanics', () => {

    
    const sim = new Simulator(20, 10);
    

    const toymaker = {
      id: 'toymaker1',
      type: 'toymaker', 
      sprite: 'toymaker',
      pos: { x: 5, y: 5 },
      hp: 25,
      maxHp: 25,
      team: 'friendly' as const,
      abilities: ['deployBot'],
      meta: { facing: 'right' as const }
    };
    
    sim.addUnit(toymaker);

    

    sim.parseCommand('deploy clanker');
    

    

    sim.step();
    
    const clankers = sim.units.filter(u => u.type === 'clanker');

    
    if (clankers.length > 0) {
      const clanker = clankers[0];



    }
    
    expect(clankers.length).toBeGreaterThan(0);
  });
  
  it('should test clanker vs worm combat effectiveness', () => {

    
    const sim = new Simulator(10, 10);
    

    const clanker = {
      id: 'clanker1',
      type: 'clanker',
      sprite: 'clanker', 
      pos: { x: 2, y: 5 },
      hp: 6,
      maxHp: 6,
      team: 'friendly' as const,
      abilities: ['explode'],
      tags: ['construct', 'explosive', 'hunt', 'aggressive'],
      meta: { perdurance: 'sturdiness' }
    };
    
    const worm = {
      id: 'worm1',
      type: 'worm',
      sprite: 'worm',
      pos: { x: 6, y: 5 },
      hp: 10,
      maxHp: 10,
      team: 'hostile' as const,
      abilities: ['jumps'],
      mass: 4
    };
    
    sim.addUnit(clanker);
    sim.addUnit(worm);
    


    

    let step = 0;
    while (step < 50) {
      sim.step();
      step++;
      
      const aliveClankers = sim.units.filter(u => u.type === 'clanker' && u.hp > 0);
      const aliveWorms = sim.units.filter(u => u.type === 'worm' && u.hp > 0);
      
      if (step <= 10 || aliveClankers.length === 0 || aliveWorms.length === 0) {

        
        if (aliveClankers.length > 0) {
          const c = aliveClankers[0];

        }
        
        if (aliveWorms.length > 0) {
          const w = aliveWorms[0];

        }
      }
      
      if (aliveClankers.length === 0 && aliveWorms.length === 0) {

        break;
      } else if (aliveClankers.length === 0) {

        break;
      } else if (aliveWorms.length === 0) {

        break;
      }
    }
    
    expect(step).toBeLessThan(50); // Should resolve quickly
  });
});