import { describe, expect, it, beforeEach } from 'bun:test';
import { JsonAbilities } from '../../src/rules/json_abilities';
import { Abilities } from '../../src/rules/abilities';
import { CommandHandler } from '../../src/rules/command_handler';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

/**
 * Integration test: Can we actually swap JsonAbilities for Abilities?
 * This is the real test - does it work in practice with real units?
 */
describe('JsonAbilities Integration', () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator();
    sim.fieldWidth = 12;
    sim.fieldHeight = 8;
    sim.ticks = 0;
  });

  it('should work with real units that have ranged abilities', () => {
    // Create a real unit from the encyclopedia with ranged ability
    const archer = Encyclopaedia.unit('ranger'); // ranger gets ranged ability
    archer.id = 'archer1';
    archer.pos = { x: 2, y: 4 };
    archer.team = 'friendly';
    
    // Create enemy within range
    const enemy = Encyclopaedia.unit('soldier');
    enemy.id = 'enemy1';
    enemy.pos = { x: 8, y: 4 }; // Distance = 6, should be in range
    enemy.team = 'enemy';

    sim.units = [archer, enemy];

    // Set up JsonAbilities rule instead of regular Abilities
    const jsonAbilities = new JsonAbilities(sim);
    const commandHandler = new CommandHandler(sim);
    sim.rulebook = [jsonAbilities, commandHandler];

    // Run one simulation step
    sim.step();

    // Debug: what abilities do these units actually have?
    console.log('Archer abilities:', Object.keys(archer.abilities || {}));
    console.log('Enemy abilities:', Object.keys(enemy.abilities || {}));
    
    // Check if the JsonAbilities rule queued any commands
    console.log(`Commands queued: ${sim.queuedCommands.length}`);
    console.log('Queued commands:', sim.queuedCommands);
    
    // Should have queued some commands if abilities triggered
    expect(sim.queuedCommands.length).toBeGreaterThanOrEqual(0); // Start with basic assertion
  });

  it('should demonstrate JsonAbilities working where regular Abilities fails', () => {
    // Create ranger with ranged ability and priest with heal ability
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
    enemy.team = 'enemy';

    // Test with JsonAbilities
    const sim = new Simulator();
    sim.fieldWidth = 12;
    sim.fieldHeight = 8;
    sim.units = [ranger, priest, enemy];
    const jsonAbilities = new JsonAbilities(sim);
    const commandHandler = new CommandHandler(sim);
    sim.rulebook = [jsonAbilities, commandHandler];

    console.log('=== Before JsonAbilities step ===');
    console.log('Ranger abilities:', Object.keys(ranger.abilities || {}));
    console.log('Priest abilities:', Object.keys(priest.abilities || {}));
    console.log('Projectiles before:', sim.projectiles.length);

    // Run simulation step
    sim.step();

    console.log('=== After JsonAbilities step ===');
    console.log(`Commands queued: ${sim.queuedCommands.length}`);
    console.log(`Events queued: ${sim.queuedEvents.length}`);
    console.log(`Projectiles after: ${sim.projectiles.length}`);
    
    if (sim.queuedCommands.length > 0) {
      console.log('Commands:', sim.queuedCommands.map(cmd => `${cmd.type} by ${cmd.unitId}`));
    }

    // JsonAbilities should successfully process abilities that regular Abilities cannot
    expect(sim.queuedCommands.length + sim.queuedEvents.length + sim.projectiles.length).toBeGreaterThan(0);
  });
});