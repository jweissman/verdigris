import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Epic Mage Battle - The Four Schools vs Undead Horde', () => {
  it('4 mages should survive against a skeleton horde', () => {
    const sim = new Simulator(50, 50);
    
    // Set an epic coastal ruins scene
    sim.queuedCommands.push({
      type: 'bg',
      params: {
        scene: 'city',
        biome: 'coastal',
        skyColor: '#4A5568', // Stormy gray sky
        ambientLight: 0.7,
        tileset: 'ruins'
      }
    });
    sim.step();
    
    // Start with dramatic storm weather
    sim.queuedCommands.push({
      type: 'weather',
      params: { weatherType: 'storm', action: 'start' }
    });
    sim.step();
    
    // Position the Four Schools of Magic in diamond formation
    const philosopher = Encyclopaedia.unit('philosopher');
    philosopher.pos = { x: 25, y: 20 }; // North - Lightning
    philosopher.id = 'philosopher_prime';
    
    const rhetorician = Encyclopaedia.unit('rhetorician');
    rhetorician.pos = { x: 20, y: 25 }; // West - Fire
    rhetorician.id = 'rhetorician_prime';
    
    const logician = Encyclopaedia.unit('logician');
    logician.pos = { x: 30, y: 25 }; // East - Ice
    logician.id = 'logician_prime';
    
    const geometer = Encyclopaedia.unit('geometer');
    geometer.pos = { x: 25, y: 30 }; // South - Earth
    geometer.id = 'geometer_prime';
    
    // Add the mage heroes
    sim.addUnit(philosopher);
    sim.addUnit(rhetorician);
    sim.addUnit(logician);
    sim.addUnit(geometer);
    
    // Create skeleton horde approaching from all sides
    const skeletons = [];
    const skeletonPositions = [
      // North wave
      ...Array(7).fill(0).map((_, i) => ({ x: 20 + i * 2, y: 5 })),
      // South wave  
      ...Array(7).fill(0).map((_, i) => ({ x: 20 + i * 2, y: 45 })),
      // East wave
      ...Array(6).fill(0).map((_, i) => ({ x: 45, y: 20 + i * 2 })),
      // West wave
      ...Array(5).fill(0).map((_, i) => ({ x: 5, y: 20 + i * 2 })),
    ];
    
    skeletonPositions.forEach((pos, i) => {
      const skeleton = {
        id: `skeleton_${i}`,
        pos: pos,
        team: 'hostile' as const,
        hp: 15,
        dmg: 2,
        sprite: 'skeleton',
        abilities: ['melee'],
        tags: ['undead'],
        meta: {
          perdurance: 'undead' // Takes less physical damage
        }
      };
      skeletons.push(skeleton);
      sim.addUnit(skeleton);
    });
    
    expect(skeletons.length).toBe(25);
    
    // Let the battle play out with abilities
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    // Check the outcome
    const survivingMages = sim.units.filter(u => 
      ['philosopher_prime', 'rhetorician_prime', 'logician_prime', 'geometer_prime'].includes(u.id) 
      && u.hp > 0
    );
    
    const survivingSkeletons = sim.units.filter(u =>
      u.id.startsWith('skeleton_') && u.hp > 0
    );
    
    // Mages should survive  
    expect(survivingMages.length).toBeGreaterThan(0);
    
    // Mages should be victorious - most skeletons dead
    expect(survivingSkeletons.length).toBeLessThan(10);
  });
  
  it('should demonstrate spell combos and synergies', () => {
    const sim = new Simulator(30, 30);
    
    // Setup coastal tower defense scene
    sim.queuedCommands.push({
      type: 'bg',
      params: {
        scene: 'city',
        biome: 'coastal',
        skyColor: '#1F2937', // Night battle
        ambientLight: 0.4,
      }
    });
    sim.step();
    
    // Create mage tower formation
    const mages = [
      { type: 'philosopher', pos: { x: 10, y: 10 } },
      { type: 'rhetorician', pos: { x: 20, y: 10 } },
      { type: 'logician', pos: { x: 10, y: 20 } },
      { type: 'geometer', pos: { x: 20, y: 20 } }
    ].map(config => {
      const mage = Encyclopaedia.unit(config.type);
      mage.pos = config.pos;
      sim.addUnit(mage);
      return mage;
    });
    
    // Single powerful enemy
    const boss = {
      id: 'undead_lord',
      pos: { x: 15, y: 25 },
      team: 'hostile' as const,
      hp: 200,
      dmg: 10,
      tags: ['boss', 'undead']
    };
    sim.addUnit(boss);
    
    // Combo 1: Storm + Fire = Firestorm
    sim.queuedCommands.push({
      type: 'weather',
      params: { weatherType: 'storm', action: 'start' }
    });
    sim.queuedCommands.push({
      type: 'fire',
      params: { x: 15, y: 25, radius: 4, temperature: 1000 }
    });
    
    // Combo 2: Ice + Lightning = Shatter
    sim.queuedCommands.push({
      type: 'meta',
      params: { 
        unitId: 'undead_lord', 
        meta: {
          frozen: true,
          frozenDuration: 5,
          stunned: true
        }
      }
    });
    sim.queuedCommands.push({
      type: 'bolt',
      params: { x: 15, y: 25 }
    });
    
    // Combo 3: Earth + Fire = Lava
    sim.queuedCommands.push({
      type: 'airdrop',
      params: { unitType: 'rock', x: 15, y: 25 }
    });
    sim.queuedCommands.push({
      type: 'fire',
      params: { x: 15, y: 25, radius: 2, temperature: 1200 }
    });
    
    // Execute combos
    for (let i = 0; i < 30; i++) {
      sim.step();
    }
    
    // Boss should take significant damage
    const bossAfter = sim.units.find(u => u.id === 'undead_lord');
    if (bossAfter) {
      expect(bossAfter.hp).toBeLessThan(150);
    }
    
    // All mages should be alive
    const aliveMages = sim.units.filter(u => 
      ['philosopher', 'rhetorician', 'logician', 'geometer'].some(type => u.id.includes(type))
      && u.hp > 0
    );
    expect(aliveMages.length).toBe(4);
  });
});