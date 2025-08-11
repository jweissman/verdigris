import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Woodland Creatures', () => {
  describe('Peaceful creatures', () => {
    it('should create a deer with flee behavior', () => {
      const sim = new Simulator(32, 24);
      
      const deer = {
        ...Encyclopaedia.unit('deer'),
        id: 'deer1',
        pos: { x: 10, y: 10 }
      };
      
      sim.addUnit(deer);
      
      // Check deer properties
      expect(deer.team).toBe('neutral');
      expect(deer.tags).toContain('peaceful');
      expect(deer.meta.moveSpeed).toBe(1.2); // Fast runner
      expect(deer.meta.fleeDistance).toBe(5);
      expect(deer.meta.peaceful).toBe(true);
      expect(deer.mass).toBe(1.5);
    });
    
    it('should create a rabbit with high speed and jump ability', () => {
      const sim = new Simulator(32, 24);
      
      const rabbit = {
        ...Encyclopaedia.unit('rabbit'),
        id: 'rabbit1',
        pos: { x: 10, y: 10 }
      };
      
      sim.addUnit(rabbit);
      
      // Check rabbit properties
      expect(rabbit.team).toBe('neutral');
      expect(rabbit.tags).toContain('small');
      expect(rabbit.tags).toContain('peaceful');
      expect(rabbit.meta.moveSpeed).toBe(1.5); // Very fast
      expect(rabbit.meta.jumpRange).toBe(3);
      expect(rabbit.mass).toBe(0.3); // Very light
      expect(rabbit.hp).toBe(8); // Fragile
    });
  });
  
  describe('Predator creatures', () => {
    it('should create a fox with hunting behavior', () => {
      const sim = new Simulator(32, 24);
      
      const fox = {
        ...Encyclopaedia.unit('fox'),
        id: 'fox1',
        pos: { x: 10, y: 10 }
      };
      
      sim.addUnit(fox);
      
      // Check fox properties
      expect(fox.team).toBe('neutral');
      expect(fox.tags).toContain('hunter');
      expect(fox.tags).toContain('clever');
      expect(fox.meta.stealthy).toBe(true);
      expect(fox.meta.huntSmallCreatures).toBe(true);
      expect(fox.dmg).toBe(4);
    });
    
    it('should create a wolf with pack behavior', () => {
      const sim = new Simulator(32, 24);
      
      const wolf = {
        ...Encyclopaedia.unit('wolf'),
        id: 'wolf1',
        pos: { x: 10, y: 10 }
      };
      
      sim.addUnit(wolf);
      
      // Check wolf properties
      expect(wolf.team).toBe('hostile'); // Wolves are hostile
      expect(wolf.tags).toContain('predator');
      expect(wolf.tags).toContain('pack');
      expect(wolf.meta.packHunter).toBe(true);
      expect(wolf.meta.howl).toBe(true);
      expect(wolf.dmg).toBe(8); // Strong attacker
      expect(wolf.hp).toBe(30);
    });
  });
  
  describe('Defensive creatures', () => {
    it('should create a badger with burrowing and defensive traits', () => {
      const sim = new Simulator(32, 24);
      
      const badger = {
        ...Encyclopaedia.unit('badger'),
        id: 'badger1',
        pos: { x: 10, y: 10 }
      };
      
      sim.addUnit(badger);
      
      // Check badger properties
      expect(badger.team).toBe('neutral');
      expect(badger.tags).toContain('burrower');
      expect(badger.tags).toContain('defensive');
      expect(badger.meta.canBurrow).toBe(true);
      expect(badger.meta.defensive).toBe(true);
      expect(badger.meta.territorial).toBe(true);
      expect(badger.hp).toBe(25);
      expect(badger.dmg).toBe(6);
    });
  });
  
  describe('Forest ecosystem interactions', () => {
    it('should have predator-prey relationships', () => {
      const sim = new Simulator(32, 24);
      
      const fox = {
        ...Encyclopaedia.unit('fox'),
        id: 'fox1',
        pos: { x: 10, y: 10 }
      };
      
      const rabbit = {
        ...Encyclopaedia.unit('rabbit'),
        id: 'rabbit1',
        pos: { x: 12, y: 10 }
      };
      
      sim.addUnit(fox);
      sim.addUnit(rabbit);
      
      // Fox should hunt small creatures
      expect(fox.meta.huntSmallCreatures).toBe(true);
      expect(rabbit.tags).toContain('small');
      
      // Rabbit should flee
      expect(rabbit.meta.fleeDistance).toBeGreaterThan(0);
    });
    
    it('should have varying team alignments', () => {
      const deer = Encyclopaedia.unit('deer');
      const rabbit = Encyclopaedia.unit('rabbit');
      const fox = Encyclopaedia.unit('fox');
      const wolf = Encyclopaedia.unit('wolf');
      const badger = Encyclopaedia.unit('badger');
      
      // Peaceful creatures are neutral
      expect(deer.team).toBe('neutral');
      expect(rabbit.team).toBe('neutral');
      expect(fox.team).toBe('neutral');
      expect(badger.team).toBe('neutral');
      
      // Wolves are hostile
      expect(wolf.team).toBe('hostile');
    });
    
    it('should have appropriate mass values for size', () => {
      const rabbit = Encyclopaedia.unit('rabbit');
      const fox = Encyclopaedia.unit('fox');
      const deer = Encyclopaedia.unit('deer');
      const wolf = Encyclopaedia.unit('wolf');
      const badger = Encyclopaedia.unit('badger');
      
      // Mass should correlate with creature size
      expect(rabbit.mass).toBeLessThan(fox.mass);
      expect(fox.mass).toBeLessThan(deer.mass);
      expect(deer.mass).toBeLessThan(wolf.mass);
      
      // Badger is medium-heavy
      expect(badger.mass).toBeGreaterThan(deer.mass);
      expect(badger.mass).toBeLessThan(wolf.mass);
    });
  });
  
  describe('Druid summoning integration', () => {
    it('should allow druids to summon various forest creatures', () => {
      const sim = new Simulator(32, 24);
      
      const druid = {
        ...Encyclopaedia.unit('druid'),
        id: 'druid1',
        pos: { x: 10, y: 10 }
      };
      
      sim.addUnit(druid);
      
      // Check druid has summon ability
      expect(druid.abilities).toContain('summonForestCreature');
      
      // Trigger summons multiple times to test variety
      const summonedTypes = new Set();
      const initialUnitCount = sim.units.length;
      
      for (let i = 0; i < 20; i++) {
        sim.forceAbility(druid.id, 'summonForestCreature', druid.pos);
        
        // Check for newly summoned units
        const newUnits = sim.units.slice(initialUnitCount);
        for (const unit of newUnits) {
          if (unit.meta?.summoned && unit.meta?.summonedBy === druid.id) {
            summonedTypes.add(unit.sprite);
          }
        }
      }
      
      // Should have summoned various creature types
      expect(summonedTypes.size).toBeGreaterThan(1);
    });
  });
});