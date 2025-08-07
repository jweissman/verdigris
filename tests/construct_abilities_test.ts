import { describe, expect, it } from 'bun:test';
import { Simulator } from '../src/simulator';
import Encyclopaedia from '../src/dmg/encyclopaedia';
import { Abilities } from '../src/rules/abilities';
import { EventHandler } from '../src/rules/event_handler';
import { Perdurance } from '../src/rules/perdurance';
import { StatusEffects } from '../src/rules/status_effects';

describe('Construct Abilities', () => {
  it('should trigger clanker explosion when enemy gets close', () => {
    const sim = new Simulator();
    sim.rulebook = [new Abilities(sim), new EventHandler(sim)];
    
    // Add clanker
    const clanker = { ...Encyclopaedia.unit('clanker'), pos: { x: 5, y: 5 } };
    sim.addUnit(clanker);
    
    // Add enemy at distance > 2 (should not trigger)
    const farEnemy = { ...Encyclopaedia.unit('worm'), pos: { x: 10, y: 5 }, team: 'hostile' as const };
    sim.addUnit(farEnemy);
    
    // Run a few ticks - should not explode
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    expect(sim.units.find(u => u.id === clanker.id)?.hp).toBe(6); // Still alive
    
    // Add enemy close enough to trigger (distance = 1)
    const closeEnemy = { ...Encyclopaedia.unit('soldier'), pos: { x: 6, y: 5 }, team: 'hostile' as const };
    sim.addUnit(closeEnemy);
    
    // Run simulation until explosion
    let exploded = false;
    for (let i = 0; i < 10; i++) {
      sim.step();
      
      // Check if clanker died (exploded)
      const clankerUnit = sim.units.find(u => u.id === clanker.id);
      if (!clankerUnit || clankerUnit.hp <= 0) {
        exploded = true;
        break;
      }
    }
    
    expect(exploded).toBe(true);
  });

  it('should trigger freezebot chill aura periodically', () => {
    const sim = new Simulator();
    sim.rulebook = [new Abilities(sim), new StatusEffects(sim), new EventHandler(sim)];
    
    // Add freezebot
    const freezebot = { ...Encyclopaedia.unit('freezebot'), pos: { x: 5, y: 5 } };
    sim.addUnit(freezebot);
    
    // Add enemy within aura range
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 6, y: 5 }, team: 'hostile' as const };
    sim.addUnit(enemy);
    
    // Run until freezebot triggers chill aura (cooldown = 15)
    let chillTriggered = false;
    for (let i = 0; i < 20; i++) {
      sim.step();
      
      // Check if enemy has chill status effect
      const enemyUnit = sim.units.find(u => u.id === enemy.id);
      if (enemyUnit?.meta.chilled) {
        chillTriggered = true;
        expect(enemyUnit.meta.chillIntensity).toBe(0.5); // 50% slow
        break;
      }
    }
    
    expect(chillTriggered).toBe(true);
  });

  it('should trigger spiker chain whip on nearby enemies', () => {
    const sim = new Simulator();
    sim.rulebook = [new Abilities(sim), new EventHandler(sim)];
    
    // Add spiker
    const spiker = { ...Encyclopaedia.unit('spiker'), pos: { x: 5, y: 5 } };
    sim.addUnit(spiker);
    
    // Add enemy within whip range
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 7, y: 5 }, team: 'hostile' as const };
    sim.addUnit(enemy);
    
    const initialHp = enemy.hp;
    
    // Run until spiker attacks (cooldown = 20)
    let attacked = false;
    for (let i = 0; i < 25; i++) {
      sim.step();
      
      const enemyUnit = sim.units.find(u => u.id === enemy.id);
      if (enemyUnit && enemyUnit.hp < initialHp) {
        attacked = true;
        expect(enemyUnit.hp).toBe(initialHp - 4); // Chain whip does 4 damage
        break;
      }
    }
    
    expect(attacked).toBe(true);
  });

  it('should trigger zapper on highest HP enemy', () => {
    const sim = new Simulator();
    sim.rulebook = [new Abilities(sim), new EventHandler(sim)];
    
    // Add zapper
    const zapper = { ...Encyclopaedia.unit('zapper'), pos: { x: 5, y: 5 } };
    sim.addUnit(zapper);
    
    // Add two enemies with different HP levels
    const weakEnemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const, hp: 5, maxHp: 10 };
    const strongEnemy = { ...Encyclopaedia.unit('soldier'), pos: { x: 7, y: 5 }, team: 'hostile' as const };
    sim.addUnit(weakEnemy);
    sim.addUnit(strongEnemy);
    
    const strongInitialHp = strongEnemy.hp;
    
    // Run until zapper attacks (cooldown = 25)
    let zapped = false;
    for (let i = 0; i < 30; i++) {
      sim.step();
      
      // Check if the stronger enemy took damage (should be targeted over weak one)
      const strongEnemyUnit = sim.units.find(u => u.id === strongEnemy.id);
      if (strongEnemyUnit && strongEnemyUnit.hp < strongInitialHp) {
        zapped = true;
        expect(strongEnemyUnit.hp).toBe(strongInitialHp - 6); // Zap does 6 damage
        break;
      }
    }
    
    expect(zapped).toBe(true);
  });
});

describe('Perdurance System', () => {
  it('should reduce all damage to 1 for sturdiness perdurance', () => {
    const sim = new Simulator();
    sim.rulebook = [new Perdurance(sim), new EventHandler(sim)];
    
    // Add construct with sturdiness
    const construct = { ...Encyclopaedia.unit('freezebot'), pos: { x: 5, y: 5 } };
    sim.addUnit(construct);
    
    // Manually queue high damage event
    sim.queuedEvents.push({
      kind: 'damage',
      source: 'test',
      target: construct.id,
      meta: {
        aspect: 'impact',
        amount: 10 // High damage
      }
    });
    
    const initialHp = construct.hp;
    
    // Process the event
    sim.step();
    
    const constructUnit = sim.units.find(u => u.id === construct.id);
    expect(constructUnit?.hp).toBe(initialHp - 1); // Damage capped to 1
  });

  it('should handle swarm perdurance differently', () => {
    const sim = new Simulator();
    sim.rulebook = [new Perdurance(sim), new EventHandler(sim)];
    
    // Add swarmbot with population-based health
    const swarmbot = { ...Encyclopaedia.unit('swarmbot'), pos: { x: 5, y: 5 } };
    sim.addUnit(swarmbot);
    
    // Queue damage event
    sim.queuedEvents.push({
      kind: 'damage',
      source: 'test',
      target: swarmbot.id,
      meta: {
        aspect: 'impact',
        amount: 3
      }
    });
    
    const initialHp = swarmbot.hp;
    
    // Process the event
    sim.step();
    
    const swarmbotUnit = sim.units.find(u => u.id === swarmbot.id);
    // Swarm takes full damage (represents population loss)
    expect(swarmbotUnit?.hp).toBe(initialHp - 3);
  });

  it('should allow multiple small hits to defeat sturdiness constructs', () => {
    const sim = new Simulator();
    sim.rulebook = [new Perdurance(sim), new EventHandler(sim)];
    
    // Add construct with 8 HP and sturdiness
    const construct = { ...Encyclopaedia.unit('freezebot'), pos: { x: 5, y: 5 } };
    sim.addUnit(construct);
    
    // Apply 8 separate damage events of varying amounts
    for (let i = 0; i < 8; i++) {
      sim.queuedEvents.push({
        kind: 'damage',
        source: 'test',
        target: construct.id,
        meta: {
          aspect: 'impact',
          amount: Math.random() * 10 + 5 // 5-15 damage, all should be reduced to 1
        }
      });
    }
    
    // Process all events
    for (let i = 0; i < 8; i++) {
      sim.step();
    }
    
    const constructUnit = sim.units.find(u => u.id === construct.id);
    expect(constructUnit?.hp).toBe(0); // Should be defeated by chip damage
  });
});