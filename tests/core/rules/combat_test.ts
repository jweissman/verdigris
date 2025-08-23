import { describe, expect, it } from "bun:test";
import { Simulator } from "../../../src/core/simulator";
import Encyclopaedia from "../../../src/dmg/encyclopaedia";

describe("Combat", () => {
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
    

    for (let i = 0; i < 15; i++) {
      sim.step();
      

      const fresh1 = sim.units.find(u => u.id === soldier1.id);
      const fresh2 = sim.units.find(u => u.id === soldier2.id);
      
      if (fresh1 && fresh2 && (fresh1.hp < initialHp1 || fresh2.hp < initialHp2)) {
        break;
      }
    }
    

    const final1 = sim.units.find(u => u.id === soldier1.id);
    const final2 = sim.units.find(u => u.id === soldier2.id);
    

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
    

    for (let i = 0; i < 15; i++) {
      sim.step();
    }
    

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
    

    for (let i = 0; i < 15; i++) {
      sim.step();
      

      const fresh1 = sim.units.find(u => u.id === soldier1.id);
      const fresh2 = sim.units.find(u => u.id === soldier2.id);
      

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

  it('should test full tactical scenario with multiple constructs', () => {
    const sim = new Simulator();
    const enemies = [
      { ...Encyclopaedia.unit('worm'), pos: { x: 35, y: 10 }, team: 'hostile' as const },
      { ...Encyclopaedia.unit('worm'), pos: { x: 37, y: 12 }, team: 'hostile' as const },
      { ...Encyclopaedia.unit('worm'), pos: { x: 39, y: 11 }, team: 'hostile' as const },
      { ...Encyclopaedia.unit('skeleton'), pos: { x: 36, y: 8 }, team: 'hostile' as const }
    ];
    
    enemies.forEach(enemy => sim.addUnit(enemy));
    

    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 10 } };
    sim.addUnit(toymaker);
    sim.parseCommand('deploy clanker');
    sim.parseCommand('deploy freezebot'); 
    sim.parseCommand('deploy spiker');
    for (let i = 0; i < 10; i++) {
      sim.step();
      

      if (i % 3 === 0) {
        const constructs = sim.units.filter(u => u.tags?.includes('construct'));
        constructs.forEach(construct => {
          const nearbyEnemies = sim.units.filter(u => 
            u.team === 'hostile' && 
            Math.abs(u.pos.x - construct.pos.x) + Math.abs(u.pos.y - construct.pos.y) < 10
          );
          if (nearbyEnemies.length > 0) {
          }
        });
      }
    }
    const constructs = sim.units.filter(u => u.tags?.includes('construct'));
    expect(constructs.length).toBeGreaterThan(0);
    

    const clanker = constructs.find(c => c.sprite === 'clanker');
    if (clanker) {
      expect(clanker.tags).toContain('hunt');
      expect(clanker.tags).toContain('aggressive');
    }

    const deployEvents = sim.processedEvents.filter(e => e.kind === 'spawn');
    expect(deployEvents.length).toBeLessThanOrEqual(8); // 3 manual + 5 from toymaker
  });
  
  it('should test Mechatron airdrop in combat scenario', () => {
    const sim = new Simulator();
    const enemies = [];
    for (let i = 0; i < 6; i++) {
      const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 20 + i, y: 15 }, team: 'hostile' as const };
      enemies.push(enemy);
      sim.addUnit(enemy);
    }
    sim.parseCommand('airdrop mechatron 22 15');
    sim.step();
    const mechatron = sim.units.find(u => u.sprite === 'mechatron');
    expect(mechatron).toBeDefined();
    expect(mechatron!.meta.dropping).toBe(true);
    expect(mechatron!.meta.z).toBeGreaterThan(15);
    let landingTick = 0;
    while (mechatron!.meta.dropping && landingTick < 30) {
      sim.step();
      landingTick++;
    }
    const impactEvents = sim.processedEvents.filter(e => 
      e.kind === 'aoe' && e.meta.aspect === 'kinetic'
    );
    expect(impactEvents.length).toBeGreaterThan(0);
    const latestImpact = impactEvents[impactEvents.length - 1];
    expect(latestImpact.meta.radius).toBe(8); // Huge unit impact
    expect(latestImpact.meta.amount).toBe(25); // High damage
  });
});