import { describe, expect, it } from 'bun:test';
import { CreatureBrowser } from '../../src/mwe/creature_browser';

describe('Creature Data Verification', () => {
  it('creatures actually load from encyclopaedia', () => {
    const browser = new CreatureBrowser();
    const allCreatures = browser.getAll();
    
    expect(allCreatures.length).toBeGreaterThan(0);
    
    // Check first few creatures have required data
    const farmer = allCreatures.find(c => c.type === 'farmer');
    const soldier = allCreatures.find(c => c.type === 'soldier');
    const worm = allCreatures.find(c => c.type === 'worm');
    
    expect(farmer).toBeDefined();
    expect(soldier).toBeDefined(); 
    expect(worm).toBeDefined();
  });

  it('creature has complete data structure', () => {
    const browser = new CreatureBrowser();
    const creatures = browser.getAll();
    
    expect(creatures.length).toBeGreaterThan(0);
    
    // Test each creature has all required properties
    let validCount = 0;
    let invalidCreatures: string[] = [];
    
    creatures.forEach(creature => {
      const isValid = (
        typeof creature.type === 'string' &&
        typeof creature.sprite === 'string' &&
        typeof creature.hp === 'number' &&
        typeof creature.team === 'string' &&
        Array.isArray(creature.tags) &&
        Array.isArray(creature.abilities) &&
        typeof creature.isHuge === 'boolean' &&
        typeof creature.isMechanical === 'boolean' &&
        typeof creature.segmentCount === 'number'
      );
      
      if (isValid) {
        validCount++;
      } else {
        invalidCreatures.push(creature.type);
      }
    });
    
    expect(invalidCreatures.length).toBe(0);
    expect(validCount).toBe(creatures.length);
    
    if (invalidCreatures.length > 0) {
    }
  });

  it('filtering returns correct creatures', () => {
    const browser = new CreatureBrowser();
    
    const all = browser.getByFilter('all');
    const huge = browser.getByFilter('huge');
    const mechanical = browser.getByFilter('mechanical');
    const friendly = browser.getByFilter('friendly');
    
    expect(all.length).toBeGreaterThan(0);
    expect(huge.length).toBeGreaterThan(0);
    expect(mechanical.length).toBeGreaterThan(0);
    expect(friendly.length).toBeGreaterThan(0);
    
    // Verify filtering actually works
    huge.forEach(creature => {
      expect(creature.isHuge).toBe(true);
    });
    
    mechanical.forEach(creature => {
      expect(creature.isMechanical).toBe(true);
    });
    
    friendly.forEach(creature => {
      expect(creature.team).toBe('friendly');
    });
    
  });

  it('step 4: verify specific creatures have expected stats', () => {
    const browser = new CreatureBrowser();
    const creatures = browser.getAll();
    
    // Test specific creatures we know should exist
    const farmer = creatures.find(c => c.type === 'farmer');
    const mechatron = creatures.find(c => c.type === 'mechatron');
    const desertMegaworm = creatures.find(c => c.type === 'desert-megaworm');
    
    // Farmer tests
    expect(farmer?.sprite).toBe('farmer');
    expect(farmer?.team).toBe('friendly');
    expect(farmer?.hp).toBeGreaterThan(0);
    expect(farmer?.isHuge).toBe(false);
    
    // Mechatron tests (if exists)
    if (mechatron) {
      expect(mechatron.sprite).toBe('mechatron');
      expect(mechatron.isHuge).toBe(true);
      expect(mechatron.isMechanical).toBe(true);
      expect(mechatron.hp).toBeGreaterThan(50); // Should be high HP
    }
    
  });

  it('step 5: generate HTML output and verify it contains creature data', () => {
    const browser = new CreatureBrowser();
    const creatures = browser.getByFilter('all');
    
    // Generate the same HTML structure the browser would create
    const generateCreatureHTML = (creatures: any[]) => {
      return creatures.map(creature => `
        <div class="creature-card">
          <h3>${creature.type}</h3>
          <div class="creature-info">
            <div><strong>HP:</strong> ${creature.hp}</div>
            <div><strong>Team:</strong> ${creature.team}</div>
            <div><strong>Sprite:</strong> ${creature.sprite}</div>
            <div><strong>Abilities:</strong> ${creature.abilities.length}</div>
            ${creature.segmentCount > 0 ? `<div><strong>Segments:</strong> ${creature.segmentCount}</div>` : ''}
            <div class="creature-tags">
              ${creature.isHuge ? '<span class="tag huge">HUGE</span>' : ''}
              ${creature.isMechanical ? '<span class="tag mechanical">MECHANICAL</span>' : ''}
              ${creature.segmentCount > 0 ? '<span class="tag segmented">SEGMENTED</span>' : ''}
            </div>
          </div>
        </div>
      `).join('');
    };
    
    const html = generateCreatureHTML(creatures);
    
    // Verify HTML contains expected content
    expect(html).toContain('farmer');
    expect(html).toContain('HP:');
    expect(html).toContain('Team:');
    expect(html).toContain('Sprite:');
    expect(html).toContain('HUGE');
    expect(html).toContain('MECHANICAL');
    
    // Count cards generated
    const cardCount = (html.match(/creature-card/g) || []).length;
    expect(cardCount).toBe(creatures.length);
    
  });
});