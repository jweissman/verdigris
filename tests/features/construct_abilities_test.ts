import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { Abilities } from '../../src/rules/abilities';
import { CommandHandler } from '../../src/rules/command_handler';
import { EventHandler } from '../../src/rules/event_handler';
import { Perdurance } from '../../src/rules/perdurance';
import { StatusEffects } from '../../src/rules/status_effects';

describe('Construct Abilities', () => {
  it('should trigger clanker explosion when enemy gets close', () => {
    const sim = new Simulator();
    // Don't override rulebook - let it use the default which includes all necessary rules
    
    // Add clanker without hunt tag so it doesn't move
    const clankerData = Encyclopaedia.unit('clanker');
    const clanker = { ...clankerData, pos: { x: 5, y: 5 }, tags: ['construct', 'explosive'], abilities: clankerData.abilities };
    sim.addUnit(clanker);
    
    // Add enemy at distance > 2 (should not trigger)
    const farEnemy = { ...Encyclopaedia.unit('worm'), pos: { x: 10, y: 5 }, team: 'hostile' as const, abilities: [] };
    sim.addUnit(farEnemy);
    
    // Run a few ticks - should not explode
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    expect(sim.units.find(u => u.id === clanker.id)?.hp).toBe(6); // Still alive
    
    // Add enemy directly adjacent to trigger explosion
    // Remove tags and abilities to prevent movement
    const closeEnemy = { ...Encyclopaedia.unit('worm'), pos: { x: 5, y: 5 }, team: 'hostile' as const, tags: [], abilities: [] };
    sim.addUnit(closeEnemy);
    
    // Run simulation - explosion should happen immediately
    const initialEnemyHp = sim.units.find(u => u.id === closeEnemy.id)?.hp;
    sim.step();
    
    // Check results of explosion
    const clankerUnit = sim.units.find(u => u.id === clanker.id);
    const closeEnemyUnit = sim.units.find(u => u.id === closeEnemy.id);
    
    // Clanker should explode (damage itself and enemy)
    expect(clankerUnit?.hp || 0).toBeLessThan(6); // Clanker took damage or died
    expect(closeEnemyUnit?.hp || 0).toBeLessThan(initialEnemyHp || 10); // Enemy took damage or died
  });

  it('should trigger freezebot chill aura periodically', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new StatusEffects(sim), new EventHandler()];
    
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
      const freezebotUnit = sim.units.find(u => u.id === freezebot.id);
      
      if (i === 0 || i === 15) {
        console.debug(`Step ${i}: freezebot abilities:`, freezebotUnit?.abilities, 'lastAbilityTick:', freezebotUnit?.lastAbilityTick);
      }
      
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
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new EventHandler()];
    
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
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new EventHandler()];
    
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
