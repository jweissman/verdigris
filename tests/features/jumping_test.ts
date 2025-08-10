import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import type { Unit } from '../../src/sim/types';
import { Jumping } from '../../src/rules/jumping';
import { MeleeCombat } from '../../src/rules/melee_combat';
import { Knockback } from '../../src/rules/knockback';
import { UnitBehavior } from '../../src/rules/unit_behavior';
import { Abilities } from '../../src/rules/abilities';
import { CommandHandler } from '../../src/rules/command_handler';
import { EventHandler } from '../../src/rules/event_handler';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Jumping mechanics', () => {
  it('worm should be able to jump', () => {
    const sim = new Simulator(128, 128);
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new Jumping(sim), new EventHandler(sim)];

    // Use a unit that has jumps ability
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 0, y: 0 } };
    worm.abilities = { jumps: Encyclopaedia.abilities.jumps };
    
    sim.addUnit(worm);
    
    // Add an enemy to trigger jump
    const enemy = sim.addUnit({
      id: 'enemy',
      team: 'friendly',
      hp: 10,
      pos: { x: 15, y: 0 }, // Far enough to trigger jump
      sprite: 'soldier'
    });
    
    // Clear cooldown
    if (!worm.lastAbilityTick) worm.lastAbilityTick = {};
    delete worm.lastAbilityTick.jumps;
    
    sim.step();

    let reloaded = sim.roster[worm.id];

    // Check if jump command was queued
    const jumpCommands = sim.queuedCommands.filter(c => c.type === 'jump');
    expect(jumpCommands.length).toBeGreaterThan(0);
    
    // Process the jump command and start jumping
    for (let i = 0; i < 5; i++) {
      sim.step();
      reloaded = sim.roster[worm.id];
      if (reloaded && (reloaded.meta.jumping || reloaded.meta.z > 0)) {
        break;
      }
    }
    
    // Unit should be jumping or have jumped
    expect(reloaded.meta.jumping || reloaded.meta.z > 0 || reloaded.pos.x !== 0 || reloaded.pos.y !== 0).toBe(true);
  });

  it('worm should deal AoE damage on landing', () => {
    const sim = new Simulator(16, 16);
    sim.rulebook = [
      new CommandHandler(sim),
      new Abilities(sim),
      new Jumping(sim),
      new EventHandler(sim)
    ];

    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 8 } };
    worm.abilities = { jumps: Encyclopaedia.abilities.jumps };
    
    sim.addUnit(worm);

    // Add enemy units in landing zone
    const enemy1 = sim.addUnit({
      id: 'enemy1',
      team: 'friendly', 
      hp: 20,
      pos: { x: 10, y: 8 },
      sprite: 'soldier'
    });
    
    const enemy2 = sim.addUnit({
      id: 'enemy2',
      team: 'friendly',
      hp: 20, 
      pos: { x: 11, y: 8 },
      sprite: 'soldier'
    });

    // Queue jump command directly to test landing damage
    sim.queuedCommands = [{
      type: 'jump',
      args: ['10', '8', '5', '5', '3'], // x, y, height, damage, radius
      unitId: worm.id
    }];

    const initialHp1 = enemy1.hp;
    const initialHp2 = enemy2.hp;

    // Process jump command
    sim.step();
    
    // Run through jump animation
    for (let i = 0; i < 30; i++) {
      sim.step();
      
      const wormUnit = sim.roster[worm.id];
      if (wormUnit && !wormUnit.meta.jumping && wormUnit.meta.z === 0) {
        // Landed
        break;
      }
    }

    // Check that enemies took damage
    const finalEnemy1 = sim.roster.enemy1;
    const finalEnemy2 = sim.roster.enemy2;
    
    // At least one enemy should have taken damage from landing
    expect(finalEnemy1?.hp < initialHp1 || finalEnemy2?.hp < initialHp2).toBe(true);
  });
});