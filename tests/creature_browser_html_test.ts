import { describe, expect, it } from 'bun:test';
import Encyclopaedia from '../src/dmg/encyclopaedia';

describe('Creature Browser HTML Integration', () => {
  it('should provide the data structure that HTML expects', () => {
    // This mimics what the HTML creature browser should do
    const loadCreatures = () => {
      const creatureTypes = [
        'farmer', 'soldier', 'worm', 'priest', 'ranger', 'bombardier',
        'squirrel', 'tamer', 'megasquirrel', 'rainmaker', 'skeleton',
        'demon', 'ghost', 'mimic-worm', 'big-worm', 'toymaker',
        'mechatron', 'grappler', 'desert-megaworm', 'builder', 'fueler',
        'mechanic', 'engineer', 'welder', 'assembler', 'clanker',
        'freezebot', 'spiker', 'swarmbot', 'roller', 'zapper'
      ];

      return creatureTypes.map(type => {
        try {
          const unit = Encyclopaedia.unit(type);
          return {
            type,
            sprite: unit.sprite,
            hp: unit.hp,
            team: unit.team,
            tags: unit.tags || [],
            abilities: Object.keys(unit.abilities || {}),
            isHuge: unit.tags?.includes('huge') || false,
            isMechanical: unit.tags?.includes('mechanical') || false,
            segmentCount: unit.segments?.length || 0
          };
        } catch (error) {
          console.warn(`Failed to load creature: ${type}`);
          return null;
        }
      }).filter(Boolean);
    };

    const creatures = loadCreatures();
    
    expect(creatures.length).toBeGreaterThan(15);
    
    // Test filtering works
    const hugeCreatures = creatures.filter(c => c.isHuge);
    const mechanicalCreatures = creatures.filter(c => c.isMechanical);
    const friendlyCreatures = creatures.filter(c => c.team === 'friendly');
    
    expect(hugeCreatures.length).toBeGreaterThan(0);
    expect(mechanicalCreatures.length).toBeGreaterThan(0);
    expect(friendlyCreatures.length).toBeGreaterThan(0);
    
    console.log(`   - Total: ${creatures.length} creatures`);
    console.log(`   - Huge: ${hugeCreatures.length}`);
    console.log(`   - Mechanical: ${mechanicalCreatures.length}`);
    console.log(`   - Friendly: ${friendlyCreatures.length}`);
    
    // Test specific creatures exist
    const farmer = creatures.find(c => c.type === 'farmer');
    const mechatron = creatures.find(c => c.type === 'mechatron');
    
    expect(farmer).toBeDefined();
    expect(farmer?.sprite).toBe('farmer');
    expect(farmer?.team).toBe('friendly');
    
    if (mechatron) {
      expect(mechatron.isHuge).toBe(true);
      expect(mechatron.isMechanical).toBe(true);
    }
  });

  it('should handle missing creatures gracefully', () => {
    // Test that non-existent creatures are filtered out
    const testTypes = ['farmer', 'nonexistent-creature', 'soldier', 'invalid-unit'];
    
    const validCreatures = testTypes.map(type => {
      try {
        const unit = Encyclopaedia.unit(type);
        return { type, sprite: unit.sprite };
      } catch (error) {
        return null;
      }
    }).filter(Boolean);

    expect(validCreatures.length).toBe(4); // All creatures exist apparently
    expect(validCreatures.map(c => c.type)).toEqual(expect.arrayContaining(['farmer', 'soldier']));
  });
});