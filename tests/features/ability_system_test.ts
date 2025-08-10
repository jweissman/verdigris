import { describe, expect, it } from "bun:test";
import { Simulator } from "../../src/simulator";
import Encyclopaedia from "../../src/dmg/encyclopaedia";

describe("Ability System Integration", () => {
  it("should verify priest has radiant ability", () => {
    const priest = Encyclopaedia.unit('priest');
    
    expect(priest.abilities).toBeDefined();
    expect(priest.abilities.radiant).toBeDefined();
    expect(priest.abilities.radiant.name).toBe('Radiant Light');
    expect(priest.abilities.radiant.cooldown).toBe(30);
  });

  it("should verify demon has fireBlast ability", () => {
    const demon = Encyclopaedia.unit('demon');
    
    expect(demon.abilities).toBeDefined();
    expect(demon.abilities.fireBlast).toBeDefined();
    expect(demon.abilities.fireBlast.name).toBe('Fire Blast');
    expect(demon.abilities.fireBlast.cooldown).toBe(40);
  });

  it("should verify rainmaker has makeRain ability", () => {
    const rainmaker = Encyclopaedia.unit('rainmaker');
    
    expect(rainmaker.abilities).toBeDefined();
    expect(rainmaker.abilities.makeRain).toBeDefined();
    expect(rainmaker.abilities.makeRain.name).toBe('Make Rain');
    expect(rainmaker.abilities.makeRain.cooldown).toBe(2); // User changed this
  });

  it("should verify big-worm has breatheFire ability", () => {
    const bigWorm = Encyclopaedia.unit('big-worm');
    
    expect(bigWorm.abilities).toBeDefined();
    expect(bigWorm.abilities.breatheFire).toBeDefined();
    expect(bigWorm.abilities.breatheFire.name).toBe('Breathe Fire');
    expect(bigWorm.abilities.breatheFire.cooldown).toBe(60);
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
    
    // Run simulation for enough steps to allow ability cooldown
    for (let i = 0; i < 35; i++) { // More than radiant cooldown of 30
      sim.step();
      
      // Get fresh ghost reference
      const freshGhost = sim.units.find(u => u.id === ghost.id);
      if (freshGhost && freshGhost.hp < initialGhostHp) {
        break;
      }
    }
    
    // Get final fresh ghost reference
    const finalGhost = sim.units.find(u => u.id === ghost.id);
    
    // Ghost should have taken radiant damage
    expect(finalGhost && finalGhost.hp < initialGhostHp).toBe(true);
  });
});