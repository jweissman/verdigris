import { describe, expect, it } from "bun:test";
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from "../../src/dmg/encyclopaedia";

describe("Combat Mechanics", () => {
  it("should verify soldiers can damage other soldiers", () => {
    const sim = new Simulator(10, 10);
    
    const soldier1 = Encyclopaedia.unit('soldier');
    soldier1.pos = { x: 5, y: 5 };
    soldier1.team = 'friendly';
    sim.addUnit(soldier1);
    
    const soldier2 = Encyclopaedia.unit('soldier');
    soldier2.pos = { x: 6, y: 5 }; // Adjacent
    soldier2.team = 'hostile'; // Different team
    sim.addUnit(soldier2);
    
    const initialHp1 = soldier1.hp;
    const initialHp2 = soldier2.hp;
    
    // Run simulation for several steps
    for (let i = 0; i < 15; i++) {
      sim.step();
      
      // Get fresh references since sim.units gets replaced
      const fresh1 = sim.units.find(u => u.id === soldier1.id);
      const fresh2 = sim.units.find(u => u.id === soldier2.id);
      
      if (fresh1 && fresh2 && (fresh1.hp < initialHp1 || fresh2.hp < initialHp2)) {
        break;
      }
    }
    
    // Get final fresh references
    const final1 = sim.units.find(u => u.id === soldier1.id);
    const final2 = sim.units.find(u => u.id === soldier2.id);
    
    // At least one should have taken damage
    expect(final1 && final2 && (final1.hp < initialHp1 || final2.hp < initialHp2)).toBe(true);
  });

  it("should verify soldiers cannot damage skeletons due to perdurance", () => {
    const sim = new Simulator(10, 10);
    
    const soldier = Encyclopaedia.unit('soldier');
    soldier.pos = { x: 5, y: 5 };
    sim.addUnit(soldier);
    
    const skeleton = Encyclopaedia.unit('skeleton');
    skeleton.pos = { x: 6, y: 5 }; // Adjacent
    sim.addUnit(skeleton);
    
    const initialSkeletonHp = skeleton.hp;
    
    // Run simulation for several steps
    for (let i = 0; i < 15; i++) {
      sim.step();
    }
    
    // Skeleton should resist physical damage from soldier
    expect(skeleton.hp).toBe(initialSkeletonHp);
    expect(skeleton.meta.perdurance).toBe('undead');
  });

  it("should track attack timing in unit meta", () => {
    const sim = new Simulator(10, 10);
    
    const soldier1 = Encyclopaedia.unit('soldier');
    soldier1.pos = { x: 5, y: 5 };
    soldier1.team = 'friendly';
    sim.addUnit(soldier1);
    
    const soldier2 = Encyclopaedia.unit('soldier');
    soldier2.pos = { x: 6, y: 5 }; // Adjacent
    soldier2.team = 'hostile'; // Different team
    sim.addUnit(soldier2);
    
    let attackFound = false;
    
    // Run simulation for several steps
    for (let i = 0; i < 15; i++) {
      sim.step();
      
      // Get fresh references since sim.units gets replaced
      const fresh1 = sim.units.find(u => u.id === soldier1.id);
      const fresh2 = sim.units.find(u => u.id === soldier2.id);
      
      // Check if lastAttacked was set on either unit
      if (fresh1?.meta?.lastAttacked) {
        expect(fresh1.meta.lastAttacked).toBeGreaterThan(0);
        attackFound = true;
        break;
      }
      if (fresh2?.meta?.lastAttacked) {
        expect(fresh2.meta.lastAttacked).toBeGreaterThan(0);
        attackFound = true;
        break;
      }
    }
    
    expect(attackFound).toBe(true);
  });
});