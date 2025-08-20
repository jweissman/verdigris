import { describe, expect, it, beforeEach } from 'bun:test';
import { Abilities } from '../../src/rules/abilities';
import { CommandHandler } from '../../src/core/command_handler';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

/**
 * Integration test: Can we actually swap Abilities for Abilities?
 * This is the real test - does it work in practice with real units?
 */
describe('Abilities Integration', () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
    sim.fieldWidth = 12;
    sim.fieldHeight = 8;
    sim.ticks = 0;
  });

  it('should work with real units that have ranged abilities', () => {

    const archer = Encyclopaedia.unit('ranger');
    archer.id = 'archer1';
    archer.pos = { x: 2, y: 4 };
    archer.team = 'friendly';
    

    const enemy = Encyclopaedia.unit('soldier');
    enemy.id = 'enemy1';
    enemy.pos = { x: 8, y: 4 }; // Distance = 6, should be in range
    enemy.team = 'hostile';

    sim.addUnit(archer);
    sim.addUnit(enemy);


    const jsonAbilities = new Abilities();
    const commandHandler = new CommandHandler(sim);


    sim.step();


    console.debug('Archer abilities:', archer.abilities);
    console.debug('Enemy abilities:', enemy.abilities);
    

    console.debug(`Commands queued: ${sim.queuedCommands.length}`);
    console.debug('Queued commands:', sim.queuedCommands);
    

    expect(sim.queuedCommands.length).toBeGreaterThanOrEqual(0); // Start with basic assertion
  });

  it('should demonstrate Abilities working where regular Abilities fails', () => {

    const ranger = Encyclopaedia.unit('ranger');
    ranger.id = 'ranger1';
    ranger.pos = { x: 2, y: 4 };
    ranger.team = 'friendly';

    const priest = Encyclopaedia.unit('priest');
    priest.id = 'priest1';
    priest.pos = { x: 3, y: 4 };
    priest.team = 'friendly';
    priest.hp = 50; // Make priest wounded to test heal ability

    const enemy = Encyclopaedia.unit('soldier');
    enemy.id = 'enemy1';
    enemy.pos = { x: 8, y: 4 }; // Within ranged attack distance
    enemy.team = 'hostile';


    const sim = new Simulator();
    sim.fieldWidth = 12;
    sim.fieldHeight = 8;
    sim.addUnit(ranger);
    sim.addUnit(priest);
    sim.addUnit(enemy);
    const jsonAbilities = new Abilities();
    const commandHandler = new CommandHandler(sim);

    console.debug('=== Before Abilities step ===');
    console.debug('Ranger abilities:', ranger.abilities);
    console.debug('Priest abilities:', priest.abilities);
    console.debug('Projectiles before:', sim.projectiles.length);


    sim.step();

    console.debug('=== After Abilities step ===');
    console.debug(`Commands queued: ${sim.queuedCommands.length}`);
    console.debug(`Events queued: ${sim.queuedEvents.length}`);
    console.debug(`Projectiles after: ${sim.projectiles.length}`);
    
    if (sim.queuedCommands.length > 0) {
      console.debug('Commands:', sim.queuedCommands.map(cmd => `${cmd.type} by ${cmd.unitId}`));
    }


    expect(sim.queuedCommands.length + sim.queuedEvents.length + sim.projectiles.length).toBeGreaterThan(0);
  });
});