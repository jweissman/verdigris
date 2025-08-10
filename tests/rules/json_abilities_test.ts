import { describe, expect, it, beforeEach } from 'bun:test';
import { JsonAbilities } from '../../src/rules/json_abilities';
import { JsonAbilitiesLoader } from '../../src/rules/json_abilities_loader';
import { CommandHandler } from '../../src/rules/command_handler';
import { Simulator } from '../../src/simulator';

describe('JsonAbilities', () => {
  let sim: Simulator;
  let jsonAbilities: JsonAbilities;
  let commandHandler: CommandHandler;

  beforeEach(() => {
    sim = new Simulator();
    sim.fieldWidth = 10;
    sim.fieldHeight = 10;
    sim.ticks = 0;
    sim.queuedCommands = [];
    sim.queuedEvents = [];

    // Use the REAL abilities from abilities_clean.json (no mocking)
    
    jsonAbilities = new JsonAbilities(sim);
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
      abilities: { ranged: {} }, // Using REAL ability from JSON
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

    (sim as any).units = [archer, enemy];
    (sim as any).getRealUnits = () => (sim as any).units.filter(u => u.state !== 'dead');

    // Apply JSON abilities rule
    jsonAbilities.apply();

    // Should queue a projectile command
    expect(sim.queuedCommands.length).toBe(1);
    expect(sim.queuedCommands[0].type).toBe('projectile');
    expect(sim.queuedCommands[0].unitId).toBe('archer1');
    expect(sim.queuedCommands[0].args[0]).toBe('bullet'); // projectile type from JSON
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
      abilities: { simpleHeal: {} },
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

    (sim as any).units = [healer, wounded];
    (sim as any).getRealUnits = () => (sim as any).units.filter(u => u.state !== 'dead');

    // Apply JSON abilities rule
    jsonAbilities.apply();

    // Should queue a heal command
    expect(sim.queuedCommands.length).toBe(1);
    expect(sim.queuedCommands[0].type).toBe('heal');
    expect(sim.queuedCommands[0].unitId).toBe('healer1');
    expect(sim.queuedCommands[0].args[0]).toBe('wounded1'); // target id (weakest ally)
    expect(sim.queuedCommands[0].args[1]).toBe('5'); // heal amount
  });

  it('should respect cooldowns', () => {
    const archer = {
      id: 'archer1',
      pos: { x: 2, y: 2 },
      team: 'friendly', 
      state: 'idle',
      hp: 100,
      maxHp: 100,
      abilities: { simpleAttack: {} },
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

    (sim as any).units = [archer, enemy];
    (sim as any).getRealUnits = () => (sim as any).units.filter(u => u.state !== 'dead');
    sim.ticks = 3; // Only 3 ticks passed, but cooldown is 6

    // Apply JSON abilities rule
    jsonAbilities.apply();

    // Should NOT queue any commands due to cooldown
    expect(sim.queuedCommands.length).toBe(0);
  });

  it('should process commands through command handler', () => {
    // Create a simple damage command to test the pipeline
    sim.queuedCommands.push({
      type: 'damage',
      args: ['enemy1', '10', 'physical'],
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

    (sim as any).units = [enemy];

    // Process commands
    commandHandler.apply();

    // Should have queued a damage event
    expect(sim.queuedEvents.length).toBe(1);
    expect(sim.queuedEvents[0].kind).toBe('damage');
    expect(sim.queuedEvents[0].target).toBe('enemy1');
    expect(sim.queuedEvents[0].meta.amount).toBe(10);
  });
});