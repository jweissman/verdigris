import { describe, expect, it } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import Encyclopaedia from "../../src/dmg/encyclopaedia";

describe("DSL Debug", () => {
  it("should debug DSL evaluation for priest radiant ability", () => {
    const sim = new Simulator(10, 10);
    
    const priest = Encyclopaedia.unit('priest');
    priest.pos = { x: 5, y: 5 };
    sim.addUnit(priest);
    
    const ghost = Encyclopaedia.unit('ghost');
    ghost.pos = { x: 6, y: 5 }; // Adjacent
    sim.addUnit(ghost);
    

    expect(priest.abilities.includes('radiant')).toBe(true);

    // TODO: actually test DSL evaluation?
  });
});