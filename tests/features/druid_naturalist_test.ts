import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { Abilities } from '../../src/rules/abilities';
import { CommandHandler } from '../../src/core/command_handler';
import { Unit } from '../../src/types/Unit';

describe('Druid and Naturalist Forest Abilities', () => {
  describe('Druid', () => {
    it('should summon random forest creatures', () => {
      const sim = new Simulator(32, 24);
      

      const druid = {
        ...Encyclopaedia.unit('druid'),
        id: 'druid1',
        pos: { x: 10, y: 10 }
      };
      

      const enemy: Unit = {
        ...Encyclopaedia.unit('skeleton'),
        id: 'enemy1',
        pos: { x: 15, y: 10 },
        team: 'hostile'
      };
      
      sim.addUnit(druid);
      sim.addUnit(enemy);
      
      const initialUnitCount = sim.units.length;
      

      expect(druid.abilities.includes('summonForestCreature')).toBe(true);
      if (druid.abilities.includes('summonForestCreature')) {
        sim.forceAbility(druid.id, 'summonForestCreature', druid.pos);
      }
      

      sim.step();
      

      expect(sim.units.length).toBeGreaterThan(initialUnitCount);
      

      const summoned = sim.units.find(u => u.meta?.summoned && u.meta?.summonedBy === 'druid1');
      expect(summoned).toBeDefined();
      

      const forestCreatures = ['squirrel', 'bear', 'owl', 'bird', 'deer', 'rabbit', 'fox', 'wolf', 'mesoworm', 'megasquirrel'];
      expect(forestCreatures).toContain(summoned?.sprite);
      

      expect(summoned?.team).toBe(druid.team);
    });
    
    it('should have entangle ability to pin enemies', () => {
      const sim = new Simulator(32, 24);
      
      const druid = {
        ...Encyclopaedia.unit('druid'),
        id: 'druid1',
        pos: { x: 10, y: 10 }
      };
      
      const enemy: Unit = {
        ...Encyclopaedia.unit('skeleton'),
        id: 'enemy1',
        pos: { x: 12, y: 10 },
        team: 'hostile'
      };
      
      sim.addUnit(druid);
      sim.addUnit(enemy);
      


      


      enemy.pos = { x: druid.pos.x + 1, y: druid.pos.y };
      

      sim.forceAbility(druid.id, 'entangle', enemy);
      

      sim.step();
      sim.step(); // Second step to process queued particle commands
      

      const currentEnemy = sim.units.find(u => u.id === enemy.id);
      

      expect(currentEnemy?.meta?.pinned).toBe(true);
      expect(currentEnemy?.meta?.pinDuration).toBeGreaterThan(0);
      

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
      

      const megabeast: Unit = {
        ...Encyclopaedia.unit('giant-sandworm'),
        id: 'megabeast1',
        pos: { x: naturalist.pos.x + 2, y: naturalist.pos.y }, // Within range (distance 2, ability range is 3)
        team: 'hostile',
        tags: ['megabeast', 'titan'] // Ensure it has megabeast tag
      };
      
      sim.addUnit(naturalist);
      sim.addUnit(megabeast);
      

      

      expect(megabeast.mass).toBeGreaterThanOrEqual(10);
      


      for (let i = 0; i < 10; i++) {
        sim.step();

        const simMegabeast = sim.units.find(u => u.id === 'megabeast1');
        if (simMegabeast?.team === 'friendly') break;
      }
      

      const simMegabeast = sim.units.find(u => u.id === 'megabeast1');
      

      expect(simMegabeast?.team).toBe('friendly');
      expect(simMegabeast?.meta?.tamed).toBe(true);
      expect(simMegabeast?.meta?.tamedBy).toBe('naturalist1');
      expect(simMegabeast?.meta?.originalTeam).toBe('hostile');
      

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
      

      const bear = {
        ...Encyclopaedia.unit('bear'),
        id: 'bear1',
        pos: { x: naturalist.pos.x + 1, y: naturalist.pos.y }, // Very close
        team: 'hostile',
        intendedMove: { x: -1, y: 0 }, // Moving toward naturalist
        tags: ['animal', 'beast', 'forest'] // Ensure proper tags
      };
      
      const owl = {
        ...Encyclopaedia.unit('owl'),
        id: 'owl1',
        pos: { x: naturalist.pos.x, y: naturalist.pos.y + 1 }, // Adjacent
        team: 'hostile',
        intendedMove: { x: 0, y: -1 },
        tags: ['animal', 'beast', 'flying', 'forest']
      };
      
      sim.addUnit(naturalist);
      sim.addUnit(bear);
      sim.addUnit(owl);
      

      

      for (let i = 0; i < 5; i++) {
        sim.step();

        const simBear = sim.units.find(u => u.id === 'bear1');
        const simOwl = sim.units.find(u => u.id === 'owl1');
        if (simBear?.meta?.calmed && simOwl?.meta?.calmed) break;
      }
      

      const simBear = sim.units.find(u => u.id === 'bear1');
      const simOwl = sim.units.find(u => u.id === 'owl1');
      

      expect(simBear?.meta?.calmed).toBe(true);
      expect(simBear?.intendedMove).toEqual({ x: 0, y: 0 });
      expect(simOwl?.meta?.calmed).toBe(true);
      expect(simOwl?.intendedMove).toEqual({ x: 0, y: 0 });
      

      const calmParticles = sim.particles.filter(p => p.type === 'calm');

      expect(calmParticles.length).toBeGreaterThanOrEqual(2); // At least one for each beast
    });
    
    it('should not tame creatures with low mass', () => {
      const sim = new Simulator(32, 24);
      
      const naturalist = {
        ...Encyclopaedia.unit('naturalist'),
        id: 'naturalist1',
        pos: { x: 10, y: 10 }
      };
      

      const squirrel = {
        ...Encyclopaedia.unit('squirrel'),
        id: 'squirrel1',
        pos: { x: 12, y: 10 },
        team: 'hostile'
      };
      
      sim.addUnit(naturalist);
      sim.addUnit(squirrel);
      

      expect(squirrel.mass).toBeLessThan(10);
      
      const originalTeam = squirrel.team;
      

      if (naturalist.abilities.includes('tameMegabeast')) {
        sim.forceAbility(naturalist.id, 'tameMegabeast', squirrel);
      }
      

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
      

      const giantWorm = {
        ...Encyclopaedia.unit('giant-sandworm'),
        id: 'worm1',
        pos: { x: naturalist.pos.x + 2, y: naturalist.pos.y }, // Within taming range
        team: 'hostile' as const
      };

      if (!giantWorm.tags) giantWorm.tags = [];
      if (!giantWorm.tags.includes('megabeast')) {
        giantWorm.tags.push('megabeast');
      }
      

      const skeleton = {
        ...Encyclopaedia.unit('skeleton'),
        id: 'skeleton1',
        pos: { x: druid.pos.x + 3, y: druid.pos.y }, // Near druid but not too close
        team: 'hostile' as const
      };
      

      sim.addUnit(druid);
      sim.addUnit(naturalist);
      sim.addUnit(giantWorm);
      sim.addUnit(skeleton);
      

      const nat = sim.units.find(u => u.id === 'naturalist1');
      const wormUnit = sim.units.find(u => u.id === 'worm1');
      const druidUnit = sim.units.find(u => u.id === 'druid1');
      const skeletonUnit = sim.units.find(u => u.id === 'skeleton1');
      

      if (nat && wormUnit) {
        sim.forceAbility(nat.id, 'tameMegabeast', wormUnit);
      }
      

      if (druidUnit && skeletonUnit) {
        sim.forceAbility(druidUnit.id, 'summonForestCreature', druidUnit.pos);
      }
      


      let tamedAtStep = -1;
      let summonedAtStep = -1;
      for (let i = 0; i < 50; i++) {
        sim.step();

        const worm = sim.units.find(u => u.id === 'worm1');
        const summoned = sim.units.find(u => u.meta?.summoned);
        
        if (worm?.team === 'friendly' && tamedAtStep === -1) {
          tamedAtStep = i;
        }
        if (summoned && summonedAtStep === -1) {
          summonedAtStep = i;
        }
        
        if (worm?.team === 'friendly' && summoned) break;
      }
      

      const finalWorm = sim.units.find(u => u.id === 'worm1');
      if (finalWorm?.team !== 'friendly') {
        console.debug('Taming failed. Worm tags:', finalWorm?.tags);
        console.debug('Worm mass:', finalWorm?.mass);
        console.debug('Worm pos:', finalWorm?.pos);
        const nat = sim.units.find(u => u.id === 'naturalist1');
        console.debug('Naturalist pos:', nat?.pos);
        console.debug('Distance:', Math.sqrt(Math.pow(finalWorm.pos.x - nat.pos.x, 2) + Math.pow(finalWorm.pos.y - nat.pos.y, 2)));
        console.debug('Naturalist abilities:', nat?.abilities);
      }
      

      const simWorm = sim.units.find(u => u.id === 'worm1');
      const simDruid = sim.units.find(u => u.id === 'druid1');
      const simNaturalist = sim.units.find(u => u.id === 'naturalist1');
      

      expect(simWorm?.team).toBe('friendly');
      

      const summoned = sim.units.find(u => u.meta?.summoned);
      expect(summoned).toBeDefined();
      expect(summoned?.team).toBe('friendly');
      

      const friendlyUnits = sim.units.filter(u => u.team === 'friendly');
      

      expect(simDruid?.team).toBe('friendly');
      expect(simNaturalist?.team).toBe('friendly');
      expect(simWorm?.team).toBe('friendly');
      expect(summoned?.team).toBe('friendly');
      

      expect(friendlyUnits.length).toBeGreaterThanOrEqual(4);
    });
  });
});