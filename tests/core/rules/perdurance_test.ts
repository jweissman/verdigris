import { describe, expect, it, beforeEach } from "bun:test";
import { Simulator } from "../../../src/core/simulator";
import Encyclopaedia from "../../../src/dmg/encyclopaedia";
import { setupTest } from "../../test_helper";


describe("Perdurance System", () => {
  beforeEach(() => {
    setupTest();
  });
  it("should allow ghosts to resist physical damage", () => {
    const sim = new Simulator(10, 10);
    

    const ghost = Encyclopaedia.unit('ghost');
    ghost.pos = { x: 5, y: 5 };
    sim.addUnit(ghost);
    
    const soldier = Encyclopaedia.unit('soldier');
    soldier.pos = { x: 6, y: 5 };
    sim.addUnit(soldier);
    
    const initialGhostHp = ghost.hp;
    

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
    

    sim.step();
    

    const freshGhost = sim.units.find(u => u.id === ghost.id);
    

    expect(freshGhost && freshGhost.hp).toBe(initialGhostHp);
  });

  it("should allow radiant damage to affect ghosts", () => {
    const sim = new Simulator(10, 10);
    

    const ghost = Encyclopaedia.unit('ghost');
    ghost.pos = { x: 5, y: 5 };
    sim.addUnit(ghost);
    
    const priest = Encyclopaedia.unit('priest');
    priest.pos = { x: 6, y: 5 }; // Adjacent for radiant ability
    sim.addUnit(priest);
    
    const initialGhostHp = ghost.hp;
    

    for (let i = 0; i < 35; i++) { // More steps for ability cooldown
      sim.step();
      

      const freshGhost = sim.units.find(u => u.id === ghost.id);
      if (freshGhost && freshGhost.hp < initialGhostHp) break; // Stop when damage is dealt
    }
    

    const finalGhost = sim.units.find(u => u.id === ghost.id);
    

    expect(finalGhost && finalGhost.hp < initialGhostHp).toBe(true);
  });

  // NOTE: not really a perdurance test?
  it("should allow demons to use fire attacks", () => {
    const sim = new Simulator(10, 10);
    

    const demon = Encyclopaedia.unit('demon');
    demon.pos = { x: 5, y: 5 };
    sim.addUnit(demon);
    
    const soldier = Encyclopaedia.unit('soldier');
    soldier.pos = { x: 6, y: 5 }; // Adjacent to demon
    sim.addUnit(soldier);
    

    expect(demon.abilities.includes('fireBlast')).toBe(true);
    expect(demon.meta.perdurance).toBe('fiendish');
    
    const initialSoldierHp = soldier.hp;
    

    for (let i = 0; i < 45; i++) { // More steps for ability cooldown
      sim.step();
      

      const freshSoldier = sim.units.find(u => u.id === soldier.id);
      if (freshSoldier && (freshSoldier.hp < initialSoldierHp || freshSoldier.meta?.onFire)) break;
    }
    

    const finalSoldier = sim.units.find(u => u.id === soldier.id);
    

    expect(finalSoldier && (finalSoldier.hp < initialSoldierHp || finalSoldier.meta?.onFire)).toBe(true);
  });

  it("should allow demons to resist some physical damage", () => {
    const sim = new Simulator(10, 10);
    

    const demon = Encyclopaedia.unit('demon');
    demon.pos = { x: 5, y: 5 };
    sim.addUnit(demon);
    
    const soldier = Encyclopaedia.unit('soldier');
    soldier.pos = { x: 6, y: 5 };
    sim.addUnit(soldier);
    
    const initialHp = demon.hp;
    

    sim.queuedCommands.push({
      type: 'damage',
      params: {
        targetId: demon.id,
        amount: 10,
        aspect: 'physical',
        sourceId: soldier.id
      }
    });
    
    sim.step(); // Fixpoint processing handles event -> damage command -> damage application
    

    const freshDemon = sim.units.find(u => u.id === demon.id);
    


    expect(freshDemon?.hp).toBe(initialHp - 5);
    expect(freshDemon?.meta.perdurance).toBe('fiendish');
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


  it("should verify all new units can be created", () => {
    const sim = new Simulator(15, 15);
    

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
    

    expect(sim.units.length).toBeGreaterThanOrEqual(6);
    expect(rainmaker.abilities.includes('makeRain')).toBe(true);
    expect(bigWorm.abilities.includes('breatheFire')).toBe(true);
    expect(bigWorm.meta.segmented).toBe(true);
    expect(skeleton.meta.perdurance).toBe('undead');
    expect(ghost.meta.perdurance).toBe('spectral');
    expect(demon.meta.perdurance).toBe('fiendish');
    expect(demon.abilities.includes('fireBlast')).toBe(true);
    expect(mimicWorm.meta.segmented).toBe(true);
    expect(mimicWorm.abilities.includes('jumps')).toBe(true);
  });

  it('should reduce all damage to 1 for sturdiness perdurance', () => {
    const sim = new Simulator();

    

    const construct = { ...Encyclopaedia.unit('freezebot'), pos: { x: 5, y: 5 } };
    sim.addUnit(construct);
    

    sim.queuedCommands.push({
      type: 'damage',
      params: {
        targetId: construct.id,
        amount: 10, // High damage
        aspect: 'impact',
        sourceId: 'test'
      }
    });
    
    const initialHp = construct.hp;
    

    sim.step(); // Process damage command -> applies damage
    
    const constructUnit = sim.units.find(u => u.id === construct.id);
    console.debug('After damage - HP:', constructUnit?.hp, 'Expected:', initialHp - 1);
    expect(constructUnit?.hp).toBe(initialHp - 1); // Damage capped to 1
  });

  it('should handle swarm perdurance differently', () => {
    const sim = new Simulator();

    

    const swarmbot = { ...Encyclopaedia.unit('swarmbot'), pos: { x: 5, y: 5 } };
    sim.addUnit(swarmbot);
    

    sim.queuedCommands.push({
      type: 'damage',
      params: {
        targetId: swarmbot.id,
        amount: 3,
        aspect: 'impact',
        sourceId: 'test'
      }
    });
    
    const initialHp = swarmbot.hp;
    

    sim.step(); // Process damage command -> applies damage
    
    const swarmbotUnit = sim.units.find(u => u.id === swarmbot.id);

    expect(swarmbotUnit?.hp).toBe(initialHp - 3);
  });

  it('should allow multiple small hits to defeat sturdiness constructs', () => {
    const sim = new Simulator();

    

    const construct = { ...Encyclopaedia.unit('freezebot'), pos: { x: 5, y: 5 } };
    sim.addUnit(construct);
    

    for (let i = 0; i < 8; i++) {
      // Queue damage command directly
      sim.queuedCommands.push({
        type: 'damage',
        params: {
          targetId: construct.id,
          amount: Math.random() * 10 + 5, // 5-15 damage, all should be reduced to 1
          aspect: 'impact',
          sourceId: 'test'
        }
      });
    }
    

    sim.step(); // Process all damage events -> creates damage commands -> applies damage (fixpoint)
    
    const constructUnit = sim.units.find(u => u.id === construct.id);
    console.debug(`Construct HP after 8 damage events: ${constructUnit?.hp}`);
    


    if (constructUnit) {
      expect(constructUnit.hp).toBe(0);
    } else {

      const allUnits = sim.units.filter(u => u.id === construct.id);
      expect(allUnits.length).toBe(0); // Unit should be gone
    }
  });
});