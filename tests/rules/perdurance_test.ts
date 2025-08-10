import { describe, expect, it } from "bun:test";
import { Simulator } from "../../src/simulator";
import Encyclopaedia from "../../src/dmg/encyclopaedia";
import { Perdurance } from "../../src/rules/perdurance";
import { EventHandler } from "../../src/rules/event_handler";

describe("Perdurance System", () => {
  it("should allow ghosts to resist physical damage", () => {
    const sim = new Simulator(10, 10);
    
    // Create ghost and soldier
    const ghost = Encyclopaedia.unit('ghost');
    ghost.pos = { x: 5, y: 5 };
    sim.addUnit(ghost);
    
    const soldier = Encyclopaedia.unit('soldier');
    soldier.pos = { x: 6, y: 5 };
    sim.addUnit(soldier);
    
    const initialGhostHp = ghost.hp;
    
    // Queue physical damage against ghost
    sim.queuedEvents.push({
      kind: 'damage',
      source: soldier.id,
      target: ghost.id,
      meta: {
        aspect: 'physical', // Should be blocked by spectral perdurance
        amount: 10,
        origin: soldier.pos
      }
    });
    
    // Process damage
    sim.step();
    
    // Get fresh ghost reference since sim.units gets replaced
    const freshGhost = sim.units.find(u => u.id === ghost.id);
    
    // Ghost should resist physical damage
    expect(freshGhost && freshGhost.hp).toBe(initialGhostHp);
  });

  it("should allow radiant damage to affect ghosts", () => {
    const sim = new Simulator(10, 10);
    
    // Create ghost and priest adjacent to each other
    const ghost = Encyclopaedia.unit('ghost');
    ghost.pos = { x: 5, y: 5 };
    sim.addUnit(ghost);
    
    const priest = Encyclopaedia.unit('priest');
    priest.pos = { x: 6, y: 5 }; // Adjacent for radiant ability
    sim.addUnit(priest);
    
    const initialGhostHp = ghost.hp;
    
    // Let the simulation run so priest can use radiant ability
    for (let i = 0; i < 35; i++) { // More steps for ability cooldown
      sim.step();
      
      // Get fresh ghost reference
      const freshGhost = sim.units.find(u => u.id === ghost.id);
      if (freshGhost && freshGhost.hp < initialGhostHp) break; // Stop when damage is dealt
    }
    
    // Get final fresh ghost reference
    const finalGhost = sim.units.find(u => u.id === ghost.id);
    
    // Ghost should eventually take radiant damage from priest
    expect(finalGhost && finalGhost.hp < initialGhostHp).toBe(true);
  });

  // NOTE: not really a perdurance test?
  it("should allow demons to use fire attacks", () => {
    const sim = new Simulator(10, 10);
    
    // Create demon and target
    const demon = Encyclopaedia.unit('demon');
    demon.pos = { x: 5, y: 5 };
    sim.addUnit(demon);
    
    const soldier = Encyclopaedia.unit('soldier');
    soldier.pos = { x: 6, y: 5 }; // Adjacent to demon
    sim.addUnit(soldier);
    
    // Verify demon has fire blast ability and correct perdurance
    expect(demon.abilities.fireBlast).toBeDefined();
    expect(demon.meta.perdurance).toBe('fiendish');
    
    const initialSoldierHp = soldier.hp;
    
    // Let simulation run so demon can use fire blast ability
    for (let i = 0; i < 45; i++) { // More steps for ability cooldown
      sim.step();
      
      // Get fresh soldier reference
      const freshSoldier = sim.units.find(u => u.id === soldier.id);
      if (freshSoldier && (freshSoldier.hp < initialSoldierHp || freshSoldier.meta?.onFire)) break;
    }
    
    // Get final fresh soldier reference
    const finalSoldier = sim.units.find(u => u.id === soldier.id);
    
    // Soldier should eventually take fire damage or be set on fire
    expect(finalSoldier && (finalSoldier.hp < initialSoldierHp || finalSoldier.meta?.onFire)).toBe(true);
  });

  it("should allow demons to resist some physical damage", () => {
    const sim = new Simulator(10, 10);
    
    // Create demon
    const demon = Encyclopaedia.unit('demon');
    demon.pos = { x: 5, y: 5 };
    sim.addUnit(demon);
    
    const soldier = Encyclopaedia.unit('soldier');
    soldier.pos = { x: 6, y: 5 };
    sim.addUnit(soldier);
    
    let damageBlocked = 0;
    let damageAllowed = 0;
    
    // Try multiple physical attacks to test 50% resistance
    for (let i = 0; i < 20; i++) {
      const initialHp = demon.hp;
      
      // Queue physical damage
      sim.queuedEvents.push({
        kind: 'damage',
        source: soldier.id,
        target: demon.id,
        meta: {
          aspect: 'physical',
          amount: 5,
          origin: soldier.pos
        }
      });
      
      sim.step();
      
      // Get fresh demon reference
      const freshDemon = sim.units.find(u => u.id === demon.id);
      
      if (freshDemon && freshDemon.hp === initialHp) {
        damageBlocked++;
      } else {
        damageAllowed++;
      }
      
      // Reset HP for next test using fresh reference
      if (freshDemon) {
        freshDemon.hp = initialHp;
      }
    }
    
    // Should have blocked some attacks (fiendish resistance is probabilistic)
    expect(damageBlocked).toBeGreaterThan(0); // At least some resistance
    expect(damageAllowed).toBeGreaterThan(0);  // But not complete immunity
    expect(damageBlocked + damageAllowed).toBe(20); // All attacks accounted for
  });

  it("should allow skeletons to have undead perdurance", () => {
    const sim = new Simulator(10, 10);
    
    const skeleton = Encyclopaedia.unit('skeleton');
    skeleton.pos = { x: 5, y: 5 };
    sim.addUnit(skeleton);
    
    expect(skeleton.meta.perdurance).toBe('undead');
    expect(skeleton.tags).toContain('undead');
    expect(skeleton.tags).toContain('black');
    expect(skeleton.team).toBe('hostile');
  });

  // doesn't seem to belong here?
  it("should verify all new units can be created", () => {
    const sim = new Simulator(15, 15);
    
    // Create all new units
    const rainmakerUnit = Encyclopaedia.unit('rainmaker');
    sim.addUnit({ ...rainmakerUnit, pos: { x: 1, y: 1 } });
    const rainmaker = sim.units.find(u => u.type === 'rainmaker');
    
    const bigWormUnit = Encyclopaedia.unit('big-worm');
    sim.addUnit({ ...bigWormUnit, pos: { x: 3, y: 1 } });
    const bigWorm = sim.units.find(u => u.type === 'big-worm');
    const skeleton = Encyclopaedia.unit('skeleton');
    skeleton.pos = { x: 5, y: 1 };
    sim.addUnit(skeleton);
    
    const ghost = Encyclopaedia.unit('ghost');
    ghost.pos = { x: 7, y: 1 };
    sim.addUnit(ghost);
    
    const demon = Encyclopaedia.unit('demon');
    demon.pos = { x: 9, y: 1 };
    sim.addUnit(demon);
    
    const mimicWorm = Encyclopaedia.unit('mimic-worm');
    mimicWorm.pos = { x: 11, y: 1 };
    sim.addUnit(mimicWorm);
    
    // Verify all units were created successfully
    expect(sim.units.length).toBeGreaterThanOrEqual(6);
    expect(rainmaker.abilities.makeRain).toBeDefined();
    expect(bigWorm.abilities.breatheFire).toBeDefined();
    expect(bigWorm.meta.segmented).toBe(true);
    expect(skeleton.meta.perdurance).toBe('undead');
    expect(ghost.meta.perdurance).toBe('spectral');
    expect(demon.meta.perdurance).toBe('fiendish');
    expect(demon.abilities.fireBlast).toBeDefined();
    expect(mimicWorm.meta.segmented).toBe(true);
    expect(mimicWorm.abilities.jumps).toBeDefined();
  });

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