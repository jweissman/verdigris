import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Druid and Naturalist Forest Abilities', () => {
  describe('Druid', () => {
    it.skip('should summon random forest creatures', () => {
      const sim = new Simulator(32, 24);
      
      // Create a druid
      const druid = {
        ...Encyclopaedia.unit('druid'),
        id: 'druid1',
        pos: { x: 10, y: 10 }
      };
      
      // Create an enemy to trigger the ability
      const enemy = {
        ...Encyclopaedia.unit('skeleton'),
        id: 'enemy1',
        pos: { x: 15, y: 10 },
        team: 'hostile'
      };
      
      sim.addUnit(druid);
      sim.addUnit(enemy);
      
      const initialUnitCount = sim.units.length;
      
      // Trigger the summon ability
      if (druid.abilities.summonForestCreature) {
        druid.abilities.summonForestCreature.effect(druid, druid.pos, sim);
      }
      
      // Process the queued spawn event
      sim.step();
      
      // Should have spawned a new unit
      expect(sim.units.length).toBeGreaterThan(initialUnitCount);
      
      // Find the summoned creature
      const summoned = sim.units.find(u => u.meta?.summoned && u.meta?.summonedBy === 'druid1');
      expect(summoned).toBeDefined();
      
      // Should be a forest creature
      const forestCreatures = ['squirrel', 'bear', 'owl', 'bird', 'deer', 'rabbit', 'fox', 'mesoworm'];
      expect(forestCreatures).toContain(summoned?.sprite);
      
      // Should be on the druid's team
      expect(summoned?.team).toBe(druid.team);
    });
    
    it('should have entangle ability to pin enemies', () => {
      const sim = new Simulator(32, 24);
      
      const druid = {
        ...Encyclopaedia.unit('druid'),
        id: 'druid1',
        pos: { x: 10, y: 10 }
      };
      
      const enemy = {
        ...Encyclopaedia.unit('skeleton'),
        id: 'enemy1',
        pos: { x: 12, y: 10 },
        team: 'hostile'
      };
      
      sim.addUnit(druid);
      sim.addUnit(enemy);
      
      // Use entangle
      if (druid.abilities.entangle) {
        druid.abilities.entangle.effect(druid, enemy.pos, sim);
      }
      
      // Enemy should be pinned
      expect(enemy.meta?.pinned).toBe(true);
      expect(enemy.meta?.pinDuration).toBeGreaterThan(0);
      
      // Should have created visual particles
      const natureParticles = sim.particles.filter(p => p.color === '#228B22' || p.type === 'entangle');
      expect(natureParticles.length).toBeGreaterThan(0);
    });
  });
  
  describe('Naturalist', () => {
    it('should tame megabeasts', () => {
      const sim = new Simulator(32, 24);
      
      const naturalist = {
        ...Encyclopaedia.unit('naturalist'),
        id: 'naturalist1',
        pos: { x: 10, y: 10 }
      };
      
      // Create a megabeast (giant sandworm)
      const megabeast = {
        ...Encyclopaedia.unit('giant-sandworm'),
        id: 'megabeast1',
        pos: { x: 15, y: 10 },
        team: 'hostile'
      };
      
      sim.addUnit(naturalist);
      sim.addUnit(megabeast);
      
      // Verify megabeast is large enough
      expect(megabeast.mass).toBeGreaterThanOrEqual(10);
      
      // Tame the megabeast
      if (naturalist.abilities.tameMegabeast) {
        naturalist.abilities.tameMegabeast.effect(naturalist, megabeast, sim);
      }
      
      // Megabeast should be tamed
      expect(megabeast.team).toBe(naturalist.team);
      expect(megabeast.meta?.tamed).toBe(true);
      expect(megabeast.meta?.tamedBy).toBe('naturalist1');
      expect(megabeast.meta?.originalTeam).toBe('hostile');
      
      // Should have taming particles
      const tameParticles = sim.particles.filter(p => p.type === 'tame');
      expect(tameParticles.length).toBeGreaterThan(0);
    });
    
    it('should calm animals in range', () => {
      const sim = new Simulator(32, 24);
      
      const naturalist = {
        ...Encyclopaedia.unit('naturalist'),
        id: 'naturalist1',
        pos: { x: 10, y: 10 }
      };
      
      // Create some beasts
      const bear = {
        ...Encyclopaedia.unit('bear'),
        id: 'bear1',
        pos: { x: 12, y: 10 },
        team: 'hostile',
        intendedMove: { x: -1, y: 0 } // Moving toward naturalist
      };
      
      const owl = {
        ...Encyclopaedia.unit('owl'),
        id: 'owl1',
        pos: { x: 9, y: 11 },
        team: 'hostile',
        intendedMove: { x: 0, y: -1 }
      };
      
      sim.addUnit(naturalist);
      sim.addUnit(bear);
      sim.addUnit(owl);
      
      // Use calm animals
      if (naturalist.abilities.calmAnimals) {
        naturalist.abilities.calmAnimals.effect(naturalist, naturalist.pos, sim);
      }
      
      // Find the actual units in sim to check
      const simBear = sim.units.find(u => u.id === 'bear1');
      const simOwl = sim.units.find(u => u.id === 'owl1');
      
      // Beasts should be calmed
      expect(simBear?.meta?.calmed).toBe(true);
      expect(simBear?.intendedMove).toEqual({ x: 0, y: 0 });
      expect(simOwl?.meta?.calmed).toBe(true);
      expect(simOwl?.intendedMove).toEqual({ x: 0, y: 0 });
      
      // Should have calm particles
      const calmParticles = sim.particles.filter(p => p.type === 'calm');
      expect(calmParticles.length).toBe(2); // One for each beast
    });
    
    it('should not tame creatures with low mass', () => {
      const sim = new Simulator(32, 24);
      
      const naturalist = {
        ...Encyclopaedia.unit('naturalist'),
        id: 'naturalist1',
        pos: { x: 10, y: 10 }
      };
      
      // Create a small creature
      const squirrel = {
        ...Encyclopaedia.unit('squirrel'),
        id: 'squirrel1',
        pos: { x: 12, y: 10 },
        team: 'hostile'
      };
      
      sim.addUnit(naturalist);
      sim.addUnit(squirrel);
      
      // Verify squirrel is too small
      expect(squirrel.mass).toBeLessThan(10);
      
      const originalTeam = squirrel.team;
      
      // Try to tame the squirrel
      if (naturalist.abilities.tameMegabeast) {
        naturalist.abilities.tameMegabeast.effect(naturalist, squirrel, sim);
      }
      
      // Squirrel should NOT be tamed (too small)
      expect(squirrel.team).toBe(originalTeam);
      expect(squirrel.meta?.tamed).toBeUndefined();
    });
  });
  
  describe('Forest Scene Integration', () => {
    it('should have druids and naturalists working together', () => {
      const sim = new Simulator(32, 24);
      
      const druid = {
        ...Encyclopaedia.unit('druid'),
        id: 'druid1',
        pos: { x: 5, y: 10 }
      };
      
      const naturalist = {
        ...Encyclopaedia.unit('naturalist'),
        id: 'naturalist1',
        pos: { x: 7, y: 10 }
      };
      
      // Add a hostile megabeast
      const giantWorm = {
        ...Encyclopaedia.unit('giant-sandworm'),
        id: 'worm1',
        pos: { x: 15, y: 10 },
        team: 'hostile'
      };
      
      sim.addUnit(druid);
      sim.addUnit(naturalist);
      sim.addUnit(giantWorm);
      
      // Naturalist tames the megabeast
      if (naturalist.abilities.tameMegabeast) {
        naturalist.abilities.tameMegabeast.effect(naturalist, giantWorm, sim);
      }
      
      // Druid summons helpers
      if (druid.abilities.summonForestCreature) {
        druid.abilities.summonForestCreature.effect(druid, druid.pos, sim);
      }
      
      sim.step();
      
      // Should have tamed worm on friendly team
      expect(giantWorm.team).toBe('friendly');
      
      // Should have summoned creature
      const summoned = sim.units.find(u => u.meta?.summoned);
      expect(summoned).toBeDefined();
      
      // All units should be on same team now
      const friendlyUnits = sim.units.filter(u => u.team === 'friendly');
      expect(friendlyUnits.length).toBeGreaterThanOrEqual(4); // druid, naturalist, worm, summoned
    });
  });
});