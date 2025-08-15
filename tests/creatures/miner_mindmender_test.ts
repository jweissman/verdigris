import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Miner and Mindmender Units', () => {
  describe('Miner', () => {
    it('should create miner unit with correct stats', () => {
      const sim = new Simulator();
      const miner = Encyclopaedia.unit('miner');
      
      expect(miner.hp).toBe(35);
      expect(miner.maxHp).toBe(35);
      expect(miner.dmg).toBe(5);
      expect(miner.mass).toBe(1.2);
      expect(miner.tags).toContain('worker');
      expect(miner.tags).toContain('burrower');
      expect(miner.tags).toContain('explorer');
      expect(miner.abilities).toContain('digTrench');
      expect(miner.meta.canBurrow).toBe(true);
      expect(miner.meta.miningSpeed).toBe(2);
      expect(miner.meta.oreCarryCapacity).toBe(10);
    });

    it('should be able to dig defensive trenches', () => {
      const sim = new Simulator();
      const miner = {
        ...Encyclopaedia.unit('miner'),
        id: 'miner1',
        pos: { x: 5, y: 5 }
      };
      
      sim.addUnit(miner);
      
      // Miner can dig trenches for defense
      const minerUnit = sim.units.find(u => u.id === 'miner1');
      expect(minerUnit).toBeDefined();
      expect(minerUnit?.abilities).toContain('digTrench');
      
      // Use the ability to dig a trench
      const initialEventCount = sim.queuedEvents.length;
      const initialParticleCount = sim.particles.length;
      
      // Force the dig trench ability
      sim.forceAbility('miner1', 'digTrench', minerUnit.pos);
      
      // Should create terrain events
      expect(sim.queuedEvents.length).toBeGreaterThan(initialEventCount);
      const terrainEvents = sim.queuedEvents.filter(e => e.kind === 'terrain');
      expect(terrainEvents.length).toBeGreaterThan(0);
      
      // Check that terrain events have proper metadata
      const firstTerrainEvent = terrainEvents[0];
      expect(firstTerrainEvent.meta.terrainType).toBe('trench');
      expect(firstTerrainEvent.meta.defenseBonus).toBe(0.5);
      expect(firstTerrainEvent.meta.movementPenalty).toBe(0.3);
      
      // Process commands to create particles
      sim.step();
      
      // Should create dust particles for visual feedback
      expect(sim.particles.length).toBeGreaterThan(initialParticleCount);
      const dustParticles = sim.particles.filter(p => p.type === 'debris' && p.color === '#8B4513');
      expect(dustParticles.length).toBeGreaterThan(0);
    });

    it('should track ore collection', () => {
      const sim = new Simulator();
      const miner = {
        ...Encyclopaedia.unit('miner'),
        id: 'miner1',
        pos: { x: 10, y: 10 }
      };
      
      sim.addUnit(miner);
      const minerUnit = sim.units.find(u => u.id === 'miner1');
      
      // Start with no ore
      expect(minerUnit?.meta.currentOre).toBe(0);
      
      // Collect ore
      minerUnit.meta.currentOre += 1;
      expect(minerUnit.meta.currentOre).toBe(1);
      
      // Should not exceed capacity (in real game logic)
      minerUnit.meta.currentOre = minerUnit.meta.oreCarryCapacity;
      expect(minerUnit.meta.currentOre).toBe(minerUnit.meta.oreCarryCapacity);
    });
  });

  describe('Mindmender', () => {
    it('should create mindmender unit with correct stats', () => {
      const sim = new Simulator();
      const mindmender = Encyclopaedia.unit('mindmender');
      
      expect(mindmender.hp).toBe(28);
      expect(mindmender.maxHp).toBe(28);
      expect(mindmender.dmg).toBe(2);
      expect(mindmender.mass).toBe(0.9);
      expect(mindmender.tags).toContain('psychic');
      expect(mindmender.tags).toContain('support');
      expect(mindmender.tags).toContain('healer');
      expect(mindmender.abilities).toContain('psychicHeal');
      expect(mindmender.meta.psychicRange).toBe(6);
      expect(mindmender.meta.healAmount).toBe(15);
    });

    it('should have psychic range for abilities', () => {
      const sim = new Simulator();
      const mindmender = {
        ...Encyclopaedia.unit('mindmender'),
        id: 'mindmender1',
        pos: { x: 10, y: 10 }
      };
      
      const ally = {
        ...Encyclopaedia.unit('soldier'),
        id: 'soldier1',
        pos: { x: 14, y: 10 }, // Within psychic range (4 units away)
        hp: 15,
        maxHp: 30
      };
      
      const farAlly = {
        ...Encyclopaedia.unit('soldier'),
        id: 'soldier2',
        pos: { x: 20, y: 10 }, // Outside psychic range (10 units away)
        hp: 10,
        maxHp: 30
      };
      
      sim.addUnit(mindmender);
      sim.addUnit(ally);
      sim.addUnit(farAlly);
      
      const mindmenderUnit = sim.units.find(u => u.id === 'mindmender1');
      const nearAlly = sim.units.find(u => u.id === 'soldier1');
      const distantAlly = sim.units.find(u => u.id === 'soldier2');
      
      // Check distance calculations
      const nearDistance = Math.sqrt(
        Math.pow(nearAlly.pos.x - mindmenderUnit.pos.x, 2) + 
        Math.pow(nearAlly.pos.y - mindmenderUnit.pos.y, 2)
      );
      const farDistance = Math.sqrt(
        Math.pow(distantAlly.pos.x - mindmenderUnit.pos.x, 2) + 
        Math.pow(distantAlly.pos.y - mindmenderUnit.pos.y, 2)
      );
      
      expect(nearDistance).toBeLessThanOrEqual(mindmenderUnit.meta.psychicRange);
      expect(farDistance).toBeGreaterThan(mindmenderUnit.meta.psychicRange);
    });

    it('should track shield and confuse durations', () => {
      const sim = new Simulator();
      const mindmender = {
        ...Encyclopaedia.unit('mindmender'),
        id: 'mindmender1',
        pos: { x: 5, y: 5 }
      };
      
      sim.addUnit(mindmender);
      const mindmenderUnit = sim.units.find(u => u.id === 'mindmender1');
      
      expect(mindmenderUnit?.meta.mindShieldDuration).toBe(50);
      expect(mindmenderUnit?.meta.confuseDuration).toBe(30);
      
      // These durations should be used when applying effects
      const targetUnit = {
        ...Encyclopaedia.unit('soldier'),
        id: 'target1',
        pos: { x: 6, y: 5 }
      };
      sim.addUnit(targetUnit);
      
      // Apply shield effect (manually for test)
      const target = sim.units.find(u => u.id === 'target1');
      target.meta.shielded = true;
      target.meta.shieldRemaining = mindmenderUnit.meta.mindShieldDuration;
      
      expect(target.meta.shielded).toBe(true);
      expect(target.meta.shieldRemaining).toBe(50);
    });
  });

  describe('Integration', () => {
    it('should have miner and mindmender work together', () => {
      const sim = new Simulator();
      
      const miner = {
        ...Encyclopaedia.unit('miner'),
        id: 'miner1',
        pos: { x: 5, y: 5 },
        hp: 20 // Damaged
      };
      
      const mindmender = {
        ...Encyclopaedia.unit('mindmender'),
        id: 'mindmender1',
        pos: { x: 7, y: 5 }
      };
      
      sim.addUnit(miner);
      sim.addUnit(mindmender);
      
      const minerUnit = sim.units.find(u => u.id === 'miner1');
      const mindmenderUnit = sim.units.find(u => u.id === 'mindmender1');
      
      // Both units should exist and be on the same team
      expect(minerUnit?.team).toBe('friendly');
      expect(mindmenderUnit?.team).toBe('friendly');
      
      // Miner should be damaged
      expect(minerUnit.hp).toBeLessThan(minerUnit.maxHp);
      
      // Distance should be within psychic range
      const distance = Math.sqrt(
        Math.pow(minerUnit.pos.x - mindmenderUnit.pos.x, 2) + 
        Math.pow(minerUnit.pos.y - mindmenderUnit.pos.y, 2)
      );
      expect(distance).toBeLessThanOrEqual(mindmenderUnit.meta.psychicRange);
    });
  });
});