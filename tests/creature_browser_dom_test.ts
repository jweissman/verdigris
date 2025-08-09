import { describe, expect, it } from 'bun:test';

describe('CreatureBrowser DOM Integration', () => {
  it.skip('should populate HTML elements with actual creature data', () => {
    // Mock DOM elements like the HTML has
    const mockElements = {
      status: { textContent: '' },
      count: { textContent: '' },
      grid: { innerHTML: '' },
      filter: { 
        value: 'all',
        addEventListener: () => {} 
      }
    };

    const mockDocument = {
      getElementById: (id: string) => {
        switch(id) {
          case 'status': return mockElements.status;
          case 'creature-count': return mockElements.count;
          case 'creature-grid': return mockElements.grid;
          case 'creature-filter': return mockElements.filter;
          default: return null;
        }
      }
    };

    // Set up browser-like environment
    const mockWindow = {} as any;
    global.window = mockWindow;
    global.document = mockDocument as any;

    // Import and initialize the module
    const { CreatureBrowser } = require('../src/creature_browser.ts');
    
    // Verify module populated window
    expect(mockWindow.CreatureBrowser).toBeDefined();
    const browser = mockWindow.CreatureBrowser;
    
    // Simulate the HTML script's initializeUI function
    const initializeUI = () => {
      const status = mockDocument.getElementById('status');
      const count = mockDocument.getElementById('creature-count');
      const grid = mockDocument.getElementById('creature-grid');
      
      if (!mockWindow.CreatureBrowser) {
        status.textContent = 'ERROR: CreatureBrowser module not loaded';
        return false;
      }
      
      status.textContent = `Loaded ${mockWindow.CreatureBrowser.getCount()} creatures`;
      
      const creatures = mockWindow.CreatureBrowser.getByFilter('all');
      count.textContent = creatures.length.toString();
      
      // Generate HTML like the real script does
      grid.innerHTML = creatures.map(creature => `
        <div class="creature-card">
          <h3>${creature.type}</h3>
          <div class="creature-info">
            <div><strong>HP:</strong> ${creature.hp}</div>
            <div><strong>Team:</strong> ${creature.team}</div>
            <div><strong>Sprite:</strong> ${creature.sprite}</div>
          </div>
        </div>
      `).join('');
      
      return true;
    };

    // Test the initialization
    const success = initializeUI();
    expect(success).toBe(true);
    
    // Verify DOM was populated correctly
    expect(mockElements.status.textContent).toBe('Loaded 31 creatures');
    expect(mockElements.count.textContent).toBe('31');
    expect(mockElements.grid.innerHTML).toContain('creature-card');
    expect(mockElements.grid.innerHTML).toContain('farmer');
    expect(mockElements.grid.innerHTML).toContain('HP:');
    
    console.log(`   - Status: ${mockElements.status.textContent}`);
    console.log(`   - Count: ${mockElements.count.textContent}`);
    console.log(`   - HTML contains: ${mockElements.grid.innerHTML.includes('farmer') ? 'creature data' : 'no creatures'}`);

    // Test filtering
    const hugeCreatures = browser.getByFilter('huge');
    mockElements.count.textContent = hugeCreatures.length.toString();
    mockElements.grid.innerHTML = hugeCreatures.map(c => `<div>${c.type}</div>`).join('');
    
    expect(mockElements.count.textContent).toBe('1'); // Only 1 huge creature
    expect(mockElements.grid.innerHTML).toContain('mechatron');
    
    console.log(`   - Huge filter: ${mockElements.count.textContent} creatures (${hugeCreatures[0]?.type})`);

    // Clean up
    delete (global as any).window;
    delete (global as any).document;
  });
});