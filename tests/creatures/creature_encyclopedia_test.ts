import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Creature Encyclopedia', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
  });

  it('should have all expected creature types', () => {
    const allCreatures = Object.keys(Encyclopaedia.bestiary);
    
    // Check we have a reasonable number of creatures
    expect(allCreatures.length).toBeGreaterThan(30);
    
    // Check key creatures exist
    const requiredCreatures = ['farmer', 'soldier', 'worm', 'priest', 'mechatron', 'big-worm', 'rainmaker'];
    requiredCreatures.forEach(type => {
      expect(allCreatures).toContain(type);
    });
  });

  it('should categorize creatures correctly', () => {
    const categories = {
      mechanical: [] as string[],
      undead: [] as string[],
      huge: [] as string[],
      segmented: [] as string[]
    };
    
    Object.keys(Encyclopaedia.bestiary).forEach(type => {
      const creature = Encyclopaedia.unit(type);
      const tags = creature.tags || [];
      
      if (tags.includes('mechanical')) categories.mechanical.push(type);
      if (tags.includes('undead')) categories.undead.push(type);
      if (tags.includes('huge')) categories.huge.push(type);
      if (creature.meta?.segmented || tags.includes('segmented')) categories.segmented.push(type);
    });
    
    // Verify we have creatures in each category
    expect(categories.mechanical.length).toBeGreaterThan(5);
    expect(categories.undead.length).toBeGreaterThan(2);
    expect(categories.huge.length).toBeGreaterThan(0);
    expect(categories.segmented.length).toBeGreaterThan(2);
  });

  it('should create units with proper abilities', () => {
    const testCases = [
      { type: 'priest', abilities: ['heal', 'radiant'] },
      { type: 'mechatron', abilities: ['missileBarrage', 'laserSweep'] },
      { type: 'rainmaker', abilities: ['makeRain'] }
    ];
    
    testCases.forEach(test => {
      const unit = Encyclopaedia.unit(test.type);
      test.abilities.forEach(ability => {
        expect(unit.abilities).toHaveProperty(ability);
      });
    });
  });

  it('should place creatures in simulation', () => {
    const sim = new Simulator(20, 20);
    const creaturesToPlace = ['farmer', 'worm', 'mechatron', 'skeleton'];
    
    creaturesToPlace.forEach((type, i) => {
      const unit = Encyclopaedia.unit(type);
      sim.addUnit({ ...unit, pos: { x: i * 2, y: 5 } });
    });
    
    expect(sim.units.length).toBeGreaterThanOrEqual(creaturesToPlace.length);
    
    // Verify creatures exist with correct types
    creaturesToPlace.forEach(type => {
      const found = sim.units.find(u => u.type === type);
      expect(found).toBeDefined();
    });
  });
});