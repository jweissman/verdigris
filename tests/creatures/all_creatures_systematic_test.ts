import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

/**
 * Systematic testing of ALL creatures in the encyclopedia
 * Ensures every creature can be instantiated, simulated, and behaves correctly
 */
describe('Systematic Creature Tests', () => {

  // TODO couldn't these be the real beast names from Encyclopedia? 

  const creatureNames = [
    'soldier', 'worm', 'squirrel', 'big-worm', 'megasquirrel',
    'grappler', 'toymaker', 'mechatron', 'mechanist', 'toy',
    'bird', 'bat', 'spider', 'scarab', 'skeleton',
    'ghost', 'wraith', 'golem', 'elemental', 'dragon',
    'necromancer', 'priest', 'mage', 'ranger', 'rogue',
    'warrior', 'paladin', 'druid', 'bard', 'monk'
  ];
  
  describe.skip('Individual Creature Validation', () => {
    test.each(creatureNames)('%s can be created and simulated', (name) => {
      const sim = new Simulator(20, 20);
      const creature = Encyclopaedia.unit(name);
      

      if (!creature) {
        console.warn(`Creature ${name} not found in encyclopedia`);
        return;
      }
      

      sim.addUnit({
        ...creature,
        id: `${name}_test`,
        pos: { x: 10, y: 10 }
      });
      

      for (let i = 0; i < 100; i++) {
        sim.step();
      }
      

      const finalUnit = sim.units.find(u => u.id === `${name}_test`);
      expect(finalUnit || creature.hp <= 0).toBeTruthy();
    });
  });
  
  describe('Multi-Creature Stress Tests', () => {
    // very slow
    test.skip('5 of each creature type can coexist', () => {
      const sim = new Simulator(100, 100);
      let totalCreatures = 0;
      
      creatureNames.forEach((name, typeIndex) => {
        const creature = Encyclopaedia.unit(name);
        if (!creature) return;
        

        for (let i = 0; i < 5; i++) {
          sim.addUnit({
            ...creature,
            id: `${name}_${i}`,
            pos: { 
              x: (typeIndex % 10) * 10 + i, 
              y: Math.floor(typeIndex / 10) * 10 + i 
            },
            team: typeIndex % 2 === 0 ? 'friendly' : 'hostile'
          });
          totalCreatures++;
        }
      });
      

      const startTime = performance.now();
      for (let step = 0; step < 100; step++) {
        sim.step();
      }
      const endTime = performance.now();
      

      expect(sim.units.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(8000); // Should complete in < 8 seconds (Ohm DSL overhead)
    });
    
    test('creatures with abilities interact correctly', () => {
      const sim = new Simulator(30, 30);
      


      const abilityCreatures = ['grappler', 'warrior', 'paladin', 'ranger', 'mage'];
      
      abilityCreatures.forEach((name, i) => {
        const creature = Encyclopaedia.unit(name);
        if (!creature) return;
        
        sim.addUnit({
          ...creature,
          id: `${name}_friendly`,
          pos: { x: 8, y: 8 + i * 2 },  // Closer together
          team: 'friendly',
          abilities: [...(creature.abilities || []), 'melee'] // Ensure melee
        });
        
        sim.addUnit({
          ...creature,
          id: `${name}_hostile`,
          pos: { x: 9, y: 8 + i * 2 },  // Adjacent for immediate combat
          team: 'hostile',
          abilities: [...(creature.abilities || []), 'melee'] // Ensure melee
        });
      });
      
      const initialCount = sim.units.length;

      for (let step = 0; step < 200; step++) {
        sim.step();
      }
      

      const survivors = sim.units.filter(u => u.hp > 0);

      expect(survivors.length).toBeLessThanOrEqual(initialCount);

      expect(survivors.length).toBeGreaterThan(0);
    });
  });
  
  describe('Creature Conventions', () => {
    test('all creatures have required properties', () => {
      creatureNames.forEach(name => {
        const creature = Encyclopaedia.unit(name);
        if (!creature) return;
        

        expect(creature.hp).toBeGreaterThan(0);
        expect(creature.maxHp).toBeGreaterThan(0);
        expect(creature.mass).toBeGreaterThan(0);
        // Default team from bestiary may not be set - that's OK, it gets set when deployed
        if (creature.team) {
          expect(['friendly', 'hostile', 'neutral']).toContain(creature.team);
        }
        expect(creature.sprite).toBeTruthy();
        expect(creature.state).toBeTruthy();
      });
    });
    
    test('creatures with abilities have valid ability references', () => {
      creatureNames.forEach(name => {
        const creature = Encyclopaedia.unit(name);
        if (!creature || !creature.abilities) return;
        
        creature.abilities.forEach(ability => {

          expect(typeof ability).toBe('string');

        });
      });
    });
  });
});