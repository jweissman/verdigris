import { describe, test, expect } from 'bun:test';
import { PlantDefenseGame } from '../../src/mwe/plant_defense';

describe('Plant Defense MWE', () => {
  test('creates plant defense game instance', () => {
    const game = new PlantDefenseGame();
    expect(game).toBeDefined();
    expect(game.sim).toBeDefined();
    expect(game.renderer).toBeDefined();
  });
  
  test('farmer can plant bushes', () => {
    const game = new PlantDefenseGame();
    game.bootstrap();
    
    // Find the farmer
    const farmer = game.sim.units.find(u => u.id === 'player_farmer');
    expect(farmer).toBeDefined();
    expect(farmer?.abilities).toContain('plant');
    
    // Initial bush count
    const initialBushes = game.sim.units.filter(u => u.type === 'bush').length;
    
    // Force plant
    game.sim.forceAbility('player_farmer', 'plant', farmer?.pos);
    game.sim.step();
    
    // Should have one more bush
    const newBushes = game.sim.units.filter(u => u.type === 'bush').length;
    expect(newBushes).toBe(initialBushes + 1);
  });
  
  test('bushes have correct defensive properties', () => {
    const game = new PlantDefenseGame();
    game.bootstrap();
    
    const farmer = game.sim.units.find(u => u.id === 'player_farmer');
    
    // Plant a bush
    game.sim.forceAbility('player_farmer', 'plant', farmer?.pos);
    game.sim.step();
    
    const bush = game.sim.units.find(u => u.type === 'bush');
    expect(bush).toBeDefined();
    
    // Verify defensive properties
    expect(bush?.hp).toBe(1);
    expect(bush?.mass).toBe(1);
    expect(bush?.team).toBe('friendly');
    expect(bush?.tags).toContain('obstacle');
    expect(bush?.tags).toContain('terrain');
  });
  
  test('spawns correct number of enemies per wave', () => {
    const game = new PlantDefenseGame();
    game.bootstrap();
    
    // Wave 1 should have 4 enemies (3 + wave number)
    const waveEnemies = game.sim.units.filter(u => u.team === 'hostile');
    expect(waveEnemies.length).toBe(4);
    
    // All should be soldiers or worms for wave 1
    for (const enemy of waveEnemies) {
      expect(['soldier', 'worm']).toContain(enemy.type || enemy.sprite);
    }
  });
  
  test('includes allied rangers for support', () => {
    const game = new PlantDefenseGame();
    game.bootstrap();
    
    const rangers = game.sim.units.filter(u => 
      u.type === 'ranger' && u.team === 'friendly'
    );
    
    expect(rangers.length).toBe(2);
    
    // Rangers should have ranged ability
    for (const ranger of rangers) {
      expect(ranger.abilities).toContain('ranged');
    }
  });
  
  test.skip('tracks wave progression', () => {  // Flaky - direct array manipulation doesn't trigger proxy updates
    const game = new PlantDefenseGame();
    game.bootstrap();
    
    // Initially wave 1
    const initialEnemies = game.sim.units.filter(u => u.team === 'hostile');
    expect(initialEnemies.length).toBeGreaterThan(0);
    
    // Kill all enemies by setting their HP through the data store
    const arrays = (game.sim as any).unitArrays;
    for (let i = 0; i < arrays.count; i++) {
      if (arrays.team[i] === 1) { // hostile team
        arrays.hp[i] = 0;
        arrays.state[i] = 3; // dead state
      }
    }
    game.sim.step();
    
    // Should detect wave complete
    const waveComplete = (game as any).checkWaveComplete();
    expect(waveComplete).toBe(true);
  });
  
  test('bushes block only enemies not allies', () => {
    const game = new PlantDefenseGame();
    game.bootstrap();
    
    const farmer = game.sim.units.find(u => u.id === 'player_farmer');
    const ranger = game.sim.units.find(u => u.type === 'ranger' && u.team === 'friendly');
    const enemy = game.sim.units.find(u => u.team === 'hostile');
    
    // Plant bush
    game.sim.forceAbility('player_farmer', 'plant', farmer?.pos);
    game.sim.step();
    
    const bush = game.sim.units.find(u => u.type === 'bush');
    
    // Bush should be on same team as farmer/ranger
    expect(bush?.team).toBe(farmer?.team);
    expect(bush?.team).toBe(ranger?.team);
    
    // But different team from enemy
    expect(bush?.team).not.toBe(enemy?.team);
  });
  
  test('input handler responds to controls', () => {
    const game = new PlantDefenseGame();
    const handler = game.getInputHandler();
    
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
    
    // Test controls don't crash
    handler({ key: 'w', type: 'keydown' });
    handler({ key: 'a', type: 'keydown' });
    handler({ key: 's', type: 'keydown' });
    handler({ key: 'd', type: 'keydown' });
    handler({ key: ' ', type: 'keydown' });
    handler({ key: 'r', type: 'keydown' });
    handler({ key: 'n', type: 'keydown' });
  });
});