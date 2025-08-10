import { describe, expect, it } from 'bun:test';
import { CreatureBrowser } from '../../src/mwe/creature_browser';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Mechanical Crew Sprites', () => {
  it('should have sprites defined for all mechanical crew', () => {
    const mechanicalCrew = ['builder', 'fueler', 'mechanic', 'engineer', 'welder', 'assembler'];
    
    mechanicalCrew.forEach(type => {
      const unit = Encyclopaedia.unit(type);
      expect(unit.sprite).toBe(type);
      expect(unit.tags).toContain('mechanical');
    });
  });

  it('should appear in creature browser', () => {
    const browser = new CreatureBrowser();
    const mechanicalUnits = browser.getByFilter('mechanical');
    
    // Should have all mechanical crew plus mechatron, mechatronist
    expect(mechanicalUnits.length).toBeGreaterThanOrEqual(8);
    
    const mechanicalCrew = ['builder', 'fueler', 'mechanic', 'engineer', 'welder', 'assembler'];
    mechanicalCrew.forEach(type => {
      const found = mechanicalUnits.find(u => u.type === type);
      expect(found).toBeDefined();
      expect(found?.sprite).toBe(type);
    });
  });
});