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
    sim.rulebook = [new Abilities(sim), new Jumping(sim), new EventHandler(), new CommandHandler(sim)];

    // Use a unit that has jumps ability
    const worm = { 
      ...Encyclopaedia.unit('worm'), 
      id: 'worm1',
      pos: { x: 0, y: 0 },
      abilities: ['jumps'],
      team: 'hostile' // Ensure worm is hostile
    };
    
    sim.addUnit(worm);
    
    // Add an enemy to trigger jump - worm is hostile, so enemy should be friendly
    const enemy = sim.addUnit({
      id: 'enemy',
      team: 'friendly',
      hp: 10,
      maxHp: 10,
      pos: { x: 15, y: 0 }, // Far enough to trigger jump
      sprite: 'soldier',
      state: 'idle'
    });
    
    // Clear cooldown - but we shouldn't directly mutate!
    // The worm starts without lastAbilityTick so it should be ready
    
    sim.step();
    
    // Process the jump command and start jumping
    for (let i = 0; i < 5; i++) {
      sim.step();
      const reloaded = sim.roster['worm1'];
      if (reloaded && (reloaded.meta.jumping || reloaded.meta.z > 0)) {
        break;
      }
    }
    
    // Unit should be jumping or have jumped
    const finalWorm = sim.roster['worm1'];
    expect(finalWorm.meta.jumping || finalWorm.meta.z > 0 || finalWorm.pos.x !== 0 || finalWorm.pos.y !== 0).toBe(true);
  });

  it('worm should deal AoE damage on landing', () => {
    const sim = new Simulator(16, 16);
    sim.rulebook = [
      new CommandHandler(sim),
      new Abilities(sim),
      new Jumping(sim),
      new EventHandler()
    ];

    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 8 } };
    worm.abilities = ['jumps'];
    
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
      params: { targetX: 10, targetY: 8, height: 5, damage: 5, radius: 3 },
      unitId: worm.id
    }];

    const initialHp1 = enemy1.hp;
    const initialHp2 = enemy2.hp;

    // Process jump command
    sim.step();
    
    // Check if jump started
    const jumpingWorm = sim.roster[worm.id];
    expect(jumpingWorm.meta.jumping).toBe(true);
    
    // Run through jump animation
    let landed = false;
    for (let i = 0; i < 30; i++) {
      sim.step();
      
      const wormUnit = sim.roster[worm.id];
      if (wormUnit && !wormUnit.meta.jumping && (!wormUnit.meta.z || Math.abs(wormUnit.meta.z) < 0.01)) {
        // Landed
        landed = true;
        break;
      }
    }
    
    expect(landed).toBe(true);

    // Check that enemies took damage
    const finalEnemy1 = sim.roster.enemy1;
    const finalEnemy2 = sim.roster.enemy2;
    
    // At least one enemy should have taken damage from landing
    const damageTaken = (initialHp1 - (finalEnemy1?.hp || 0)) + (initialHp2 - (finalEnemy2?.hp || 0));
    expect(damageTaken).toBeGreaterThan(0);
  });
});