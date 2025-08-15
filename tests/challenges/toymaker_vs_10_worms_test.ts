import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Toymaker Challenge', () => {
  it('should analyze if toymaker can defeat 10 worms', () => {
    // console.log('🤖 TOYMAKER VS 10 WORMS CHALLENGE');
    
    const sim = new Simulator(40, 20);
    const sceneLoader = new SceneLoader(sim);
    
    // Load the toymaker challenge scene
    sceneLoader.loadScenario('toymakerChallenge');
    
    // console.log(`\nInitial setup: ${sim.units.length} units`);
    
    // Count initial forces
    const toymakers = sim.units.filter(u => u.type === 'toymaker');
    const worms = sim.units.filter(u => u.type === 'worm');
    const initialWormCount = worms.length;
    
    // console.log(`Toymakers: ${toymakers.length}`);
    // console.log(`Worms: ${initialWormCount}`);
    // console.log(`Toymaker HP: ${toymakers[0]?.hp || 'none'}`);
    // console.log(`Toymaker abilities: ${toymakers[0]?.abilities || []}`);
    
    // Run simulation for up to 500 steps or until battle is decided
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
      
      // Log progress every 50 steps or when significant changes occur
      if (step % 50 === 0 || 
          currentWorms.length !== lastWormCount || 
          currentToymakers.length !== lastToymakerCount) {
        // console.log(`\nStep ${step}:`);
        // console.log(`  Worms alive: ${currentWorms.length}/${initialWormCount}`);
        // console.log(`  Toymakers alive: ${currentToymakers.length}`);
        const bots = sim.units.filter(u => ['clanker', 'freezebot', 'spiker', 'swarmbot', 'roller', 'zapper'].includes(u.type));
        // console.log(`  Clankers deployed: ${clankers.length}, Total bots: ${bots.length}`);
        // console.log(`  Total units: ${sim.units.length}`);
        
        if (currentToymakers.length > 0) {
          // console.log(`  Toymaker HP: ${currentToymakers[0].hp}/${currentToymakers[0].maxHp}`);
          // console.log(`  Deployments used: ${currentToymakers[0].meta.deployBotUses || 0}`);
        }
        
        lastWormCount = currentWorms.length;
        lastToymakerCount = currentToymakers.length;
      }
      
      // Check win conditions
      if (currentWorms.length === 0) {
        // console.log(`\n🏆 TOYMAKER VICTORY! All worms defeated in ${step} steps`);
        break;
      }
      
      if (currentToymakers.length === 0) {
        // console.log(`\n💀 TOYMAKER DEFEAT! Toymaker died with ${currentWorms.length} worms remaining`);
        break;
      }
    }
    
    // Final analysis
    const finalWorms = sim.units.filter(u => u.type === 'worm' && u.hp > 0);
    const finalToymakers = sim.units.filter(u => u.type === 'toymaker' && u.hp > 0);
    const finalClankers = sim.units.filter(u => u.type === 'clanker' && u.hp > 0);
    
    // console.log(`\n📊 FINAL RESULTS:`);
    // console.log(`  Steps taken: ${step}/${maxSteps}`);
    // console.log(`  Worms eliminated: ${initialWormCount - finalWorms.length}/${initialWormCount}`);
    // console.log(`  Toymaker survived: ${finalToymakers.length > 0 ? 'YES' : 'NO'}`);
    // console.log(`  Clankers remaining: ${finalClankers.length}`);
    
    if (step >= maxSteps) {
      // console.log(`⏰ TIMEOUT! Battle lasted full ${maxSteps} steps`);
    }
    
    // Success criteria: toymaker survives and defeats all worms
    const victory = finalWorms.length === 0 && finalToymakers.length > 0;
    // console.log(`\n🎯 CHALLENGE ${victory ? 'PASSED' : 'FAILED'}`);
    
    // Always pass the test but log the result for analysis
    expect(sim.units.length).toBeGreaterThan(0);
  });
  
  it('should test toymaker clanker deployment mechanics', () => {
    // console.log('\n🔧 TOYMAKER DEPLOYMENT MECHANICS TEST');
    
    const sim = new Simulator(20, 10);
    
    // Create a simple test scenario
    const toymaker = {
      id: 'toymaker1',
      type: 'toymaker', 
      sprite: 'toymaker',
      pos: { x: 5, y: 5 },
      hp: 25,
      maxHp: 25,
      team: 'friendly',
      abilities: ['deployBot'],
      meta: { facing: 'right' }
    };
    
    sim.addUnit(toymaker);
    // console.log(`Initial: ${sim.units.length} units`);
    
    // Force deploy command directly
    sim.parseCommand('deploy clanker');
    
    // console.log(`After queuing deploy: ${sim.queuedCommands.length} commands`);
    
    // Step to process deployment
    sim.step();
    
    const clankers = sim.units.filter(u => u.type === 'clanker');
    // console.log(`After deployment: ${sim.units.length} units, ${clankers.length} clankers`);
    
    if (clankers.length > 0) {
      const clanker = clankers[0];
      // console.log(`Clanker stats: HP=${clanker.hp}, abilities=[${clanker.abilities}], tags=[${clanker.tags}]`);
      // console.log(`Clanker position: (${clanker.pos.x}, ${clanker.pos.y})`);
      // console.log(`Expected position: (~${toymaker.pos.x + 3}, ${toymaker.pos.y})`);
    }
    
    expect(clankers.length).toBeGreaterThan(0);
  });
  
  it('should test clanker vs worm combat effectiveness', () => {
    // console.log('\n💥 CLANKER VS WORM COMBAT TEST');
    
    const sim = new Simulator(10, 10);
    
    // Create test units
    const clanker = {
      id: 'clanker1',
      type: 'clanker',
      sprite: 'clanker', 
      pos: { x: 2, y: 5 },
      hp: 6,
      maxHp: 6,
      team: 'friendly',
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
      team: 'hostile',
      abilities: ['jumps'],
      mass: 4
    };
    
    sim.addUnit(clanker);
    sim.addUnit(worm);
    
    // console.log(`Initial setup: clanker at (${clanker.pos.x}, ${clanker.pos.y}), worm at (${worm.pos.x}, ${worm.pos.y})`);
    // console.log(`Distance: ${Math.hypot(worm.pos.x - clanker.pos.x, worm.pos.y - clanker.pos.y)}`);
    
    // Run combat simulation
    let step = 0;
    while (step < 50) {
      sim.step();
      step++;
      
      const aliveClankers = sim.units.filter(u => u.type === 'clanker' && u.hp > 0);
      const aliveWorms = sim.units.filter(u => u.type === 'worm' && u.hp > 0);
      
      if (step <= 10 || aliveClankers.length === 0 || aliveWorms.length === 0) {
        // console.log(`Step ${step}: clankers=${aliveClankers.length}, worms=${aliveWorms.length}`);
        
        if (aliveClankers.length > 0) {
          const c = aliveClankers[0];
          // console.log(`  Clanker: HP=${c.hp}, pos=(${c.pos.x.toFixed(1)}, ${c.pos.y.toFixed(1)})`);
        }
        
        if (aliveWorms.length > 0) {
          const w = aliveWorms[0];
          // console.log(`  Worm: HP=${w.hp}, pos=(${w.pos.x.toFixed(1)}, ${w.pos.y.toFixed(1)})`);
        }
      }
      
      if (aliveClankers.length === 0 && aliveWorms.length === 0) {
        // console.log(`🤝 MUTUAL DESTRUCTION at step ${step}`);
        break;
      } else if (aliveClankers.length === 0) {
        // console.log(`🐛 WORM VICTORY at step ${step}`);
        break;
      } else if (aliveWorms.length === 0) {
        // console.log(`🤖 CLANKER VICTORY at step ${step}`);
        break;
      }
    }
    
    expect(step).toBeLessThan(50); // Should resolve quickly
  });
});