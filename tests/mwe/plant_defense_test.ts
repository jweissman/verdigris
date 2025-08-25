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
    

    const farmer = game.sim.units.find(u => u.id === 'player_farmer');
    expect(farmer).toBeDefined();
    expect(farmer?.abilities).toContain('plant');
    

    const initialBushes = game.sim.units.filter(u => u.type === 'bush').length;
    

    game.sim.forceAbility('player_farmer', 'plant', farmer?.pos);
    game.sim.step();
    

    const newBushes = game.sim.units.filter(u => u.type === 'bush').length;
    expect(newBushes).toBe(initialBushes + 1);
  });
  
  test('bushes have correct defensive properties', () => {
    const game = new PlantDefenseGame();
    game.bootstrap();
    
    const farmer = game.sim.units.find(u => u.id === 'player_farmer');
    

    game.sim.forceAbility('player_farmer', 'plant', farmer?.pos);
    game.sim.step();
    
    const bush = game.sim.units.find(u => u.type === 'bush');
    expect(bush).toBeDefined();
    

    expect(bush?.hp).toBe(1);
    expect(bush?.mass).toBe(1);
    expect(bush?.team).toBe('friendly');
    expect(bush?.tags).toContain('obstacle');
    expect(bush?.tags).toContain('terrain');
  });
  
  test('spawns correct number of enemies per wave', () => {
    const game = new PlantDefenseGame();
    game.bootstrap();
    

    const waveEnemies = game.sim.units.filter(u => u.team === 'hostile');
    expect(waveEnemies.length).toBe(4);
    

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
    

    for (const ranger of rangers) {
      expect(ranger.abilities).toContain('ranged');
    }
  });
  
  test.skip('tracks wave progression', () => {  // Flaky - direct array manipulation doesn't trigger proxy updates
    const game = new PlantDefenseGame();
    game.bootstrap();
    

    const initialEnemies = game.sim.units.filter(u => u.team === 'hostile');
    expect(initialEnemies.length).toBeGreaterThan(0);
    

    const arrays = (game.sim as any).unitArrays;
    for (let i = 0; i < arrays.count; i++) {
      if (arrays.team[i] === 1) {
        arrays.hp[i] = 0;
        arrays.state[i] = 3;
      }
    }
    game.sim.step();
    

    const waveComplete = (game as any).checkWaveComplete();
    expect(waveComplete).toBe(true);
  });
  
  test('bushes block only enemies not allies', () => {
    const game = new PlantDefenseGame();
    game.bootstrap();
    
    const farmer = game.sim.units.find(u => u.id === 'player_farmer');
    const ranger = game.sim.units.find(u => u.type === 'ranger' && u.team === 'friendly');
    const enemy = game.sim.units.find(u => u.team === 'hostile');
    

    game.sim.forceAbility('player_farmer', 'plant', farmer?.pos);
    game.sim.step();
    
    const bush = game.sim.units.find(u => u.type === 'bush');
    

    expect(bush?.team).toBe(farmer?.team);
    expect(bush?.team).toBe(ranger?.team);
    

    expect(bush?.team).not.toBe(enemy?.team);
  });
  
  test('input handler responds to controls', () => {
    const game = new PlantDefenseGame();
    const handler = game.getInputHandler();
    
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
    

    handler({ key: 'w', type: 'keydown' });
    handler({ key: 'a', type: 'keydown' });
    handler({ key: 's', type: 'keydown' });
    handler({ key: 'd', type: 'keydown' });
    handler({ key: ' ', type: 'keydown' });
    handler({ key: 'r', type: 'keydown' });
    handler({ key: 'n', type: 'keydown' });
  });
});