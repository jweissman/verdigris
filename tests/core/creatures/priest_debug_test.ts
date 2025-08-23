import { describe, expect, it } from "bun:test";
import { Simulator } from '../../../src/core/simulator';
import Encyclopaedia from "../../../src/dmg/encyclopaedia";

describe("Priest Debug", () => {
  it("should debug priest radiant ability triggering", () => {
    const sim = new Simulator(10, 10);
    
    const priest = Encyclopaedia.unit('priest');
    priest.pos = { x: 5, y: 5 };
    sim.addUnit(priest);
    
    const ghost = Encyclopaedia.unit('ghost');
    ghost.pos = { x: 6, y: 5 }; // Adjacent
    sim.addUnit(ghost);
    
    

    const dx = ghost.pos.x - priest.pos.x;
    const dy = ghost.pos.y - priest.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    

    for (let i = 0; i < 40; i++) {
      
      sim.step();
      
      const radiantEvents = sim.queuedEvents.filter(e => 
        e.kind === 'damage' && e.meta.aspect === 'radiant'
      );
      if (radiantEvents.length > 0) {
        break;
      }
      
      if (ghost.hp < 30) {
        break;
      }
    }
    

    expect(priest.abilities.includes('radiant')).toBe(true);
  });
});