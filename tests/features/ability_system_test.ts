import { describe, expect, it } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import Encyclopaedia from "../../src/dmg/encyclopaedia";

describe("Ability System Integration", () => {
  it("should verify priest has radiant ability", () => {
    const priest = Encyclopaedia.unit('priest');
    
    expect(priest.abilities).toBeDefined();
    expect(priest.abilities.includes('radiant')).toBe(true);
    expect(Encyclopaedia.abilities.radiant.name).toBe('Radiant Strike');
    expect(Encyclopaedia.abilities.radiant.cooldown).toBe(30);
  });

  it("should verify demon has fireBlast ability", () => {
    const demon = Encyclopaedia.unit('demon');
    
    expect(demon.abilities).toBeDefined();
    expect(demon.abilities.includes('fireBlast')).toBe(true);
    expect(Encyclopaedia.abilities.fireBlast.name).toBe('Fire Blast');
    expect(Encyclopaedia.abilities.fireBlast.cooldown).toBe(40);
  });

  it("should verify rainmaker has makeRain ability", () => {
    const rainmaker = Encyclopaedia.unit('rainmaker');
    
    expect(rainmaker.abilities).toBeDefined();
    expect(rainmaker.abilities.includes('makeRain')).toBe(true);
    expect(Encyclopaedia.abilities.makeRain.name).toBe('Make Rain');
    expect(Encyclopaedia.abilities.makeRain.cooldown).toBe(200); // From JSON definition
  });

  it("should verify big-worm has breatheFire ability", () => {
    const bigWorm = Encyclopaedia.unit('big-worm');
    
    expect(bigWorm.abilities).toBeDefined();
    expect(bigWorm.abilities.includes('breatheFire')).toBe(true);
    expect(Encyclopaedia.abilities.breatheFire.name).toBe('Breathe Fire');
    expect(Encyclopaedia.abilities.breatheFire.cooldown).toBe(60);
  });

  it("should trigger priest radiant ability against ghost", () => {
    const sim = new Simulator(10, 10);
    
    const priest = Encyclopaedia.unit('priest');
    priest.pos = { x: 5, y: 5 };
    sim.addUnit(priest);
    
    const ghost = Encyclopaedia.unit('ghost');
    ghost.pos = { x: 6, y: 5 }; // Adjacent for radiant trigger
    sim.addUnit(ghost);
    
    const initialGhostHp = ghost.hp;
    

    for (let i = 0; i < 35; i++) { // More than radiant cooldown of 30
      sim.step();
      

      const freshGhost = sim.units.find(u => u.id === ghost.id);
      if (freshGhost && freshGhost.hp < initialGhostHp) {
        break;
      }
    }
    

    const finalGhost = sim.units.find(u => u.id === ghost.id);
    

    expect(finalGhost && finalGhost.hp < initialGhostHp).toBe(true);
  });
});