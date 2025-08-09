import { describe, expect, it } from 'bun:test';
import { Simulator } from '../src/simulator';
import { DesertEffects } from '../src/rules/desert_effects';
import { GrapplingPhysics } from '../src/rules/grappling_physics';
import { SegmentedCreatures } from '../src/rules/segmented_creatures';
import Encyclopaedia from '../src/dmg/encyclopaedia';

describe('Desert Day Features', () => {
  it('desert units - grappler can fire grappling hook', () => {
  const sim = new Simulator();
  
  // Add grappling physics rule
  sim.rulebook = [new GrapplingPhysics(sim)];
  
  // Create grappler unit
  const grappler = {
    ...Encyclopaedia.unit('grappler'),
    pos: { x: 5, y: 5 },
    team: 'friendly' as const
  };
  sim.addUnit(grappler);
  
  // Create enemy to grapple
  const enemy = {
    ...Encyclopaedia.unit('worm'),
    pos: { x: 8, y: 5 },
    team: 'hostile' as const
  };
  sim.addUnit(enemy);
  
  // Fire grappling hook
  const grapplerUnit = sim.units.find(u => u.sprite === 'grappler' && u.tags?.includes('grappler'));
  expect(grapplerUnit).toBeTruthy();
  
  if (grapplerUnit?.abilities.grapplingHook) {
    grapplerUnit.abilities.grapplingHook.effect(grapplerUnit, enemy.pos, sim);
  }
  
  // Check that grapple projectile was created
  const grappleProjectile = sim.projectiles.find(p => p.type === 'grapple');
  expect(grappleProjectile).toBeTruthy();
  
  // Simulate a few ticks for grapple to connect
  for (let i = 0; i < 10; i++) {
    sim.step();
  }
});

  it('desert units - worm hunter can run grapple lines', () => {
  const sim = new Simulator();
  
  // Create worm hunter
  const hunter = {
    ...Encyclopaedia.unit('worm-hunter'),
    pos: { x: 5, y: 5 },
    team: 'friendly' as const
  };
  sim.addUnit(hunter);
  
  const hunterUnit = sim.units.find(u => u.tags?.includes('assassin'));
  expect(hunterUnit).toBeTruthy();
  expect(hunterUnit?.meta.canClimbGrapples).toBeTruthy();
  expect(hunterUnit?.meta.moveSpeed).toEqual(1.5);
});

it('desert units - waterbearer can heal and detect spies', () => {
  const sim = new Simulator();
  
  // Create waterbearer
  const waterbearer = {
    ...Encyclopaedia.unit('waterbearer'),
    pos: { x: 10, y: 10 },
    team: 'friendly' as const
  };
  sim.addUnit(waterbearer);
  
  const waterbearerUnit = sim.units.find(u => u.tags?.includes('detector'));
  expect(waterbearerUnit).toBeTruthy();
  expect(waterbearerUnit?.meta.waterReserves).toEqual(100);
  expect(waterbearerUnit?.meta.detectRange).toEqual(6);
  
  // Create wounded ally
  const ally = {
    ...Encyclopaedia.unit('soldier'),
    pos: { x: 12, y: 10 },
    hp: 10,
    team: 'friendly' as const
  };
  sim.addUnit(ally);
  
  // Create hidden enemy
  const spy = {
    ...Encyclopaedia.unit('worm'),
    pos: { x: 13, y: 10 },
    team: 'hostile' as const,
    meta: { hidden: true, invisible: true }
  };
  sim.addUnit(spy);
  
  // Use detect ability
  if (waterbearerUnit?.abilities.detectSpies) {
    waterbearerUnit.abilities.detectSpies.effect(waterbearerUnit, waterbearerUnit.pos, sim);
  }
  
  // Check spy was revealed
  const spyUnit = sim.units.find(u => u.id === spy.id);
  expect(spyUnit?.meta.hidden).toEqual(false);
  expect(spyUnit?.meta.revealed).toEqual(true);
});

it('desert units - skirmisher has dual knife attack', () => {
  const sim = new Simulator();
  
  // Create skirmisher
  const skirmisher = {
    ...Encyclopaedia.unit('skirmisher'),
    pos: { x: 5, y: 5 },
    team: 'friendly' as const
  };
  sim.addUnit(skirmisher);
  
  const skirmisherUnit = sim.units.find(u => u.tags?.includes('duelist'));
  expect(skirmisherUnit).toBeTruthy();
  expect(skirmisherUnit?.meta.dualWield).toBeTruthy();
  expect(skirmisherUnit?.meta.dodgeChance).toEqual(0.25);
  
  // Create enemy
  const enemy = {
    ...Encyclopaedia.unit('worm'),
    pos: { x: 6, y: 5 },
    team: 'hostile' as const
  };
  sim.addUnit(enemy);
  
  // Use dual knife dance
  if (skirmisherUnit?.abilities.dualKnifeDance) {
    skirmisherUnit.abilities.dualKnifeDance.effect(skirmisherUnit, enemy.pos, sim);
  }
  
  // Should queue 2 damage events
  const damageEvents = sim.queuedEvents.filter(e => e.kind === 'damage' && e.source === skirmisherUnit?.id);
  expect(damageEvents.length).toEqual(2);
});

it('segmented creatures - desert worm has segments', () => {
  const sim = new Simulator();
  
  // Add segmented creatures rule
  sim.rulebook = [new SegmentedCreatures(sim)];
  
  // Create desert worm
  const worm = {
    ...Encyclopaedia.unit('desert-worm'),
    pos: { x: 15, y: 15 }
  };
  sim.addUnit(worm);
  
  // Step to create segments
  sim.step();
  
  // Check segments were created
  const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === worm.id);
  expect(segments.length).toEqual(3);
  
  // Check segment properties
  segments.forEach((segment, index) => {
    expect(segment.meta.segmentIndex).toEqual(index + 1);
    expect(segment.tags?.includes('segment')).toBeTruthy();
  });
});

it('segmented creatures - giant sandworm is huge with many segments', () => {
  const sim = new Simulator();
  
  // Add segmented creatures rule
  sim.rulebook = [new SegmentedCreatures(sim)];
  
  // Create giant sandworm
  const giantWorm = {
    ...Encyclopaedia.unit('giant-sandworm'),
    pos: { x: 15, y: 15 }
  };
  sim.addUnit(giantWorm);
  
  // Step to create segments
  sim.step();
  
  // Check segments were created
  const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === giantWorm.id);
  expect(segments.length).toEqual(6);
  
  // Check that it's marked as huge
  const wormUnit = sim.units.find(u => u.id === giantWorm.id);
  expect(wormUnit?.meta.huge).toBeTruthy();
});

it('sandstorm effect - damages non-desert units', () => {
  const sim = new Simulator();
  
  // Add desert effects rule
  const desertRule = new DesertEffects(sim);
  sim.rulebook = [desertRule];
  
  // Create desert-adapted unit
  const grappler = {
    ...Encyclopaedia.unit('grappler'),
    pos: { x: 5, y: 5 },
    team: 'friendly' as const
  };
  sim.addUnit(grappler);
  
  // Create non-desert unit
  const soldier = {
    ...Encyclopaedia.unit('soldier'),
    pos: { x: 10, y: 10 },
    team: 'friendly' as const
  };
  sim.addUnit(soldier);
  
  // Start sandstorm
  desertRule.triggerSandstorm(100, 0.8);
  
  // Simulate for a bit
  for (let i = 0; i < 10; i++) {
    sim.step();
  }
  
  // Check effects
  const grapplerUnit = sim.units.find(u => u.id === grappler.id);
  const soldierUnit = sim.units.find(u => u.id === soldier.id);
  
  expect(grapplerUnit?.meta.sandBlinded).toBeFalsy();
  expect(soldierUnit?.meta.sandBlinded).toBeTruthy();
  expect(soldierUnit?.meta.sandSlowed).toBeTruthy();
});

it('segmented creatures - grappling affects segments', () => {
  const sim = new Simulator();
  
  // Add rules
  sim.rulebook = [new SegmentedCreatures(sim), new GrapplingPhysics(sim)];
  
  // Create segmented worm
  const worm = {
    ...Encyclopaedia.unit('desert-worm'),
    pos: { x: 10, y: 10 }
  };
  sim.addUnit(worm);
  
  // Step to create segments
  sim.step();
  
  // Grapple a segment
  const segment = sim.units.find(u => u.meta.segment && u.meta.segmentIndex === 2);
  if (segment) {
    segment.meta.grappled = true;
    segment.meta.grappledBy = 'test_grappler';
  }
  
  // Step to apply effects
  sim.step();
  
  // Check that parent is slowed
  const wormUnit = sim.units.find(u => u.id === worm.id);
  expect(wormUnit?.meta.segmentSlowdown).toBeTruthy();
});

it('desert worm can burrow and ambush', () => {
  const sim = new Simulator();
  
  // Add desert effects for burrow handling
  sim.rulebook = [new DesertEffects(sim)];
  
  // Create desert worm
  const worm = {
    ...Encyclopaedia.unit('desert-worm'),
    pos: { x: 5, y: 5 }
  };
  sim.addUnit(worm);
  
  // Create target enemy
  const enemy = {
    ...Encyclopaedia.unit('soldier'),
    pos: { x: 10, y: 10 },
    team: 'friendly' as const
  };
  sim.addUnit(enemy);
  
  const wormUnit = sim.units.find(u => u.id === worm.id);
  
  // Use burrow ability
  if (wormUnit?.abilities.burrowAmbush) {
    wormUnit.abilities.burrowAmbush.effect(wormUnit, enemy.pos, sim);
  }
  
  // Check worm is burrowed
  expect(wormUnit?.meta.burrowed).toBeTruthy();
  expect(wormUnit?.meta.invisible).toBeTruthy();
  
  // Simulate until emergence
  for (let i = 0; i < 20; i++) {
    sim.step();
  }
  
  // Check worm has emerged
  expect(wormUnit?.meta.burrowed).toBeFalsy();
  expect(wormUnit?.meta.invisible).toBeFalsy();
});

});