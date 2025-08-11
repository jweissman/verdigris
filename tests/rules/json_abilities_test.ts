import { describe, expect, it, beforeEach } from 'bun:test';
import { Abilities } from '../../src/rules/abilities';
import { CommandHandler } from '../../src/rules/command_handler';
import { Simulator } from '../../src/core/simulator';

describe('Abilities', () => {
  let sim: Simulator;
  let abilities: Abilities;
  let commandHandler: CommandHandler;

  beforeEach(() => {
    sim = new Simulator();
    sim.fieldWidth = 10;
    sim.fieldHeight = 10;
    sim.ticks = 0;
    sim.queuedCommands = [];
    sim.queuedEvents = [];

    // Use the REAL abilities from abilities_clean.json (no mocking)
    
    abilities = new Abilities(sim);
    commandHandler = new CommandHandler(sim);
    sim.rulebook = [commandHandler]; // Add command handler to process queued commands
  });

  it('should queue projectile for ranged ability', () => {
    // Create archer and enemy - ranged ability should trigger at distance 5
    const archer = {
      id: 'archer1',
      pos: { x: 2, y: 2 },
      team: 'friendly',
      state: 'idle',
      hp: 100,
      maxHp: 100,
      abilities: ['ranged'], // Using REAL ability from JSON
      lastAbilityTick: {}
    };

    const enemy = {
      id: 'enemy1', 
      pos: { x: 7, y: 2 }, // Distance = 5, within range 10 but > 2
      team: 'enemy',
      state: 'idle',
      hp: 100,
      maxHp: 100
    };

    sim.addUnit(archer);
    sim.addUnit(enemy);

    // Apply JSON abilities rule
    abilities.apply();

    // Should queue a projectile command
    expect(sim.queuedCommands.length).toBe(1);
    expect(sim.queuedCommands[0].type).toBe('projectile');
    expect(sim.queuedCommands[0].unitId).toBe('archer1');
    expect(sim.queuedCommands[0].params.projectileType).toBe('bullet'); // projectile type from JSON
  });

  it('should queue heal command for heal ability', () => {
    // Create units - wounded ally
    const healer = {
      id: 'healer1',
      pos: { x: 2, y: 2 },
      team: 'friendly',
      state: 'idle',
      hp: 100,
      maxHp: 100,
      abilities: ['simpleHeal'],
      lastAbilityTick: {}
    };

    const wounded = {
      id: 'wounded1',
      pos: { x: 3, y: 2 },
      team: 'friendly',
      state: 'idle', 
      hp: 50,
      maxHp: 100
    };

    sim.addUnit(healer);
    sim.addUnit(wounded);

    // Apply JSON abilities rule
    abilities.apply();

    // Should queue a heal command
    expect(sim.queuedCommands.length).toBe(1);
    expect(sim.queuedCommands[0].type).toBe('heal');
    expect(sim.queuedCommands[0].unitId).toBe('healer1');
    // Check params instead of args for new format
    expect(sim.queuedCommands[0].params?.targetId).toBe('wounded1'); // target id (weakest ally)
    expect(sim.queuedCommands[0].params?.amount).toBe(5); // heal amount
  });

  it('should respect cooldowns', () => {
    const archer = {
      id: 'archer1',
      pos: { x: 2, y: 2 },
      team: 'friendly', 
      state: 'idle',
      hp: 100,
      maxHp: 100,
      abilities: ['simpleAttack'],
      lastAbilityTick: { simpleAttack: 0 } // Just used ability
    };

    const enemy = {
      id: 'enemy1',
      pos: { x: 6, y: 2 },
      team: 'enemy',
      state: 'idle',
      hp: 100,
      maxHp: 100
    };

    sim.addUnit(archer);
    sim.addUnit(enemy);
    sim.ticks = 3; // Only 3 ticks passed, but cooldown is 6

    // Apply JSON abilities rule
    abilities.apply();

    // Should NOT queue any commands due to cooldown
    expect(sim.queuedCommands.length).toBe(0);
  });

  it('should process commands through command handler', () => {
    // Create a simple damage command to test the pipeline
    sim.queuedCommands.push({
      type: 'damage',
      params: { targetId: 'enemy1', amount: 10, aspect: 'physical' },
      unitId: 'archer1'
    });

    const enemy = {
      id: 'enemy1',
      pos: { x: 6, y: 2 },
      team: 'enemy',
      state: 'idle',
      hp: 100,
      maxHp: 100
    };

    sim.addUnit(enemy);

    // Process commands
    commandHandler.apply();

    // Should have applied damage to the enemy
    const damagedEnemy = sim.units.find(u => u.id === 'enemy1');
    expect(damagedEnemy?.hp).toBe(90); // 100 - 10 damage
  });
});