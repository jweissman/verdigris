import { describe, expect, it, beforeEach } from 'bun:test';
import { CommandHandler } from '../../../src/core/command_handler';
import { Simulator } from '../../../src/core/simulator';
import { Abilities } from '../../../src/rules/abilities';

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


    
    abilities = new Abilities();
    commandHandler = new CommandHandler(sim);
  });

  it('should queue projectile for ranged ability', () => {


    const archer = {
      id: 'archer1',
      pos: { x: 2, y: 2 },
      team: 'friendly' as const,
      state: 'idle' as const,
      hp: 100,
      maxHp: 100,
      abilities: ['ranged'],
      lastAbilityTick: {}
    };

    const enemy = {
      id: 'enemy1', 
      pos: { x: 7, y: 2 }, // Distance = 5, within range 10 but > 2
      team: 'hostile' as const,
      state: 'idle' as const,
      hp: 100,
      maxHp: 100
    };

    sim.addUnit(archer);
    sim.addUnit(enemy as any);


    sim.step();




    

    const hasProjectile = sim.projectiles.length > 0 || 
                         sim.queuedCommands.some(c => c.type === 'projectile');
    expect(hasProjectile).toBe(true);
  });

  it('should queue heal command for heal ability', () => {

    const healer = {
      id: 'healer1',
      pos: { x: 2, y: 2 },
      team: 'friendly' as const,
      state: 'idle' as const,
      hp: 100,
      maxHp: 100,
      abilities: ['simpleHeal'],
      lastAbilityTick: {}
    };

    const wounded = {
      id: 'wounded1',
      pos: { x: 3, y: 2 },
      team: 'friendly' as const,
      state: 'idle' as const, 
      hp: 50,
      maxHp: 100
    };

    sim.addUnit(healer);
    sim.addUnit(wounded);


    const context = sim.getTickContext();
    const commands = abilities.execute(context);

    expect(commands.length).toBe(2);
    expect(commands[0].type).toBe('heal');
    expect(commands[0].unitId).toBe('healer1');

    expect(commands[0].params?.targetId).toBe('wounded1');
    expect(commands[0].params?.amount).toBe(5);
  });

  it('should respect cooldowns', () => {
    const archer = {
      id: 'archer1',
      pos: { x: 2, y: 2 },
      team: 'friendly' as const, 
      state: 'idle' as const,
      hp: 100,
      maxHp: 100,
      abilities: ['simpleAttack'],
      lastAbilityTick: { simpleAttack: 0 } // Just used ability
    };

    const enemy = {
      id: 'enemy1',
      pos: { x: 6, y: 2 },
      team: 'hostile' as const,
      state: 'idle' as const,
      hp: 100,
      maxHp: 100
    };

    sim.addUnit(archer);
    sim.addUnit(enemy as any);
    sim.ticks = 3; // Only 3 ticks passed, but cooldown is 6


    const context = sim.getTickContext();
    abilities.execute(context);


    expect(sim.queuedCommands.length).toBe(0);
  });

  it('should process commands through command handler', () => {

    sim.queuedCommands.push({
      type: 'damage',
      params: { targetId: 'enemy1', amount: 10, aspect: 'physical' },
      unitId: 'archer1'
    });

    const enemy = {
      id: 'enemy1',
      pos: { x: 6, y: 2 },
      team: 'hostile' as const,
      state: 'idle' as const,
      hp: 100,
      maxHp: 100
    };

    sim.addUnit(enemy as any);


    const ctx = sim.getTickContext();
    commandHandler.execute(ctx);


    const damagedEnemy = sim.units.find(u => u.id === 'enemy1');
    expect(damagedEnemy?.hp).toBe(90); // 100 - 10 damage
  });
});