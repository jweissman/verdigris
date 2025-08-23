import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';
import Encyclopaedia from '../../../src/dmg/encyclopaedia';
import { Abilities } from '../../../src/rules/abilities';
import { SceneLoader } from '../../../src/core/scene_loader';
import { BiomeEffects } from '../../../src/rules/biome_effects';

describe('Toymaker System', () => {
  it('should spawn a toymaker with correct properties', () => {
    const sim = new Simulator();
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    sim.addUnit(toymaker);
    expect(sim.units.length).toBe(1);
    expect(sim.units[0].sprite).toBe('toymaker');
    expect(sim.units[0].tags).toContain('mechanical');
    expect(sim.units[0].tags).toContain('craftor');
    expect(sim.units[0].abilities).toContain('deployBot');
    expect(Abilities.all.deployBot).toBeDefined();
    expect(Abilities.all.deployBot.cooldown).toBe(80);
  });

  it('should deploy constructs when enemy is in range', () => {
    const sim = new Simulator();
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    sim.addUnit(toymaker);
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    sim.addUnit(enemy);
    expect(sim.units.length).toBe(2);
    let deployedConstruct = false;
    for (let tick = 0; tick < 60; tick++) {
      sim.step();
      if (sim.units.length > 2) {
        deployedConstruct = true;
        const construct = sim.units.find(u => u.tags?.includes('construct'));
        expect(construct).toBeDefined();
        expect(construct!.tags).toContain('construct');
        break;
      }
    }
    expect(deployedConstruct).toBe(true);
  });

  it('should create constructs with specific abilities assigned', () => {
    const sim = new Simulator();

    const freezebot = Encyclopaedia.unit('freezebot');
    expect(freezebot.tags).toContain('construct');
    expect(freezebot.meta.perdurance).toBe('sturdiness');
    expect(freezebot.abilities).toContain('freezeAura');
    
    const clanker = Encyclopaedia.unit('clanker');
    expect(clanker.tags).toContain('construct');
    expect(clanker.abilities).toContain('explode');
    
    const spiker = Encyclopaedia.unit('spiker');
    expect(spiker.tags).toContain('construct');
    expect(spiker.abilities).toContain('whipChain');
    
    const swarmbot = Encyclopaedia.unit('swarmbot');
    expect(swarmbot.tags).toContain('construct');
    expect(swarmbot.meta.perdurance).toBe('swarm');

    
    const roller = Encyclopaedia.unit('roller');
    expect(roller.tags).toContain('construct');
    expect(roller.abilities).toContain('chargeAttack');
    
    const zapper = Encyclopaedia.unit('zapper');
    expect(zapper.tags).toContain('construct');
    expect(zapper.abilities).toContain('zapHighest');
  });

  it('should place deployed constructs between toymaker and target', () => {
    const sim = new Simulator();
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 2, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    sim.addUnit(toymaker);
    sim.addUnit(enemy);
    let constructDeployed = false;
    for (let i = 0; i < 60; i++) {
      sim.step();
      if (sim.units.length > 2) {
        constructDeployed = true;
        const construct = sim.units.find(u => u.tags?.includes('construct'));
        const expectedX = Math.floor((2 + 8) / 2);
        expect(construct!.pos.x).toBe(expectedX);
        expect(construct!.pos.y).toBe(5);
        break;
      }
    }
    
    expect(constructDeployed).toBe(true);
  });

  it('should load toymaker scene with proper sprites and winter effects', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    loader.loadScenario('toymaker');
    expect(sim.units.length).toBe(16); // 1 toymaker + 15 worms
    const toymaker = sim.units.find(u => u.tags?.includes('craftor'));
    const enemies = sim.units.filter(u => u.team === 'hostile');
    expect(toymaker).toBeDefined();
    expect(toymaker?.sprite).toBe('toymaker'); // Toymaker sprite
    expect(enemies.length).toBe(15);
    BiomeEffects.createWinterStorm(sim);
    let constructsDeployed = [];
    let snowflakesGenerated = 0;
    for (let i = 0; i < 20; i++) {
      const beforeUnits = sim.units.length;
      const beforeSnow = sim.particles.filter(p => p.type === 'snow').length;
      sim.step();
      const afterUnits = sim.units.length;
      if (afterUnits > beforeUnits) {
        const newConstruct = sim.units.find(u => u.tags?.includes('construct'));
        if (newConstruct) {
          constructsDeployed.push({
            tick: i,
            type: newConstruct.sprite,
            position: `(${newConstruct.pos.x}, ${newConstruct.pos.y})`
          });
        }
      }
      const afterSnow = sim.particles.filter(p => p.type === 'snow').length;
      if (afterSnow > beforeSnow) {
        snowflakesGenerated += (afterSnow - beforeSnow);
      }
    }
    expect(snowflakesGenerated).toBeGreaterThan(0);
    const snowflakes = sim.particles.filter(p => p.type === 'snow');
    expect(snowflakes.length).toBeGreaterThan(0);
    expect(snowflakes[0].radius).toBeLessThanOrEqual(0.5); // Single pixel
    expect(snowflakes[0].color).toBe('#FFFFFF');
    expect(snowflakes[0].vel.y).toBeGreaterThan(0); // Falling down
    expect(Math.abs(snowflakes[0].vel.x)).toBeLessThan(0.1); // Gentle drift
  });

  it('should verify snowflake physics and rendering properties', () => {
    const sim = new Simulator();
    sim.winterActive = true; // Enable winter effects without overriding rulebook
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    const snowflakes = sim.particles.filter(p => p.type === 'snow');
    expect(snowflakes.length).toBeGreaterThan(0);
    snowflakes.forEach((flake, index) => {
      expect(flake.radius).toBeLessThanOrEqual(0.5); // Single pixel max
      expect(flake.color).toBe('#FFFFFF');
      expect(flake.lifetime).toBeGreaterThan(50); // Reasonable lifetime
      expect(flake.vel.y).toBeGreaterThan(0); // Always falling
      expect(flake.vel.y).toBeLessThan(1); // Not too fast
      expect(Math.abs(flake.vel.x)).toBeLessThan(0.1); // Minimal horizontal drift
    });
  });

  it('summoning constructs', () => {
    const sim = new Simulator();
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    sim.addUnit(toymaker);
    sim.addUnit(enemy);
    for (let tick = 0; tick < 60; tick++) {
      const beforeUnits = sim.units.length;
      const toymakerUnit = sim.units.find(u => u.id === toymaker.id);
      
      if (toymakerUnit) {
        const lastAbilityTick = toymakerUnit.lastAbilityTick?.deployBot || 0;
        const ticksSinceLastUse = tick - lastAbilityTick;
        const cooldownReady = ticksSinceLastUse >= 50;
        
        if (tick % 10 === 0 || cooldownReady) {
        }
      }
      
      sim.step();
      
      if (sim.units.length > beforeUnits) {
        expect(sim.units.length).toBe(3);
        return;
      }
    }
    
    expect(false).toBe(true); // Force failure if no deployment
  });
});