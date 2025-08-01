import { describe, it, expect } from 'bun:test';
import { Simulator } from '../src/simulator.ts';

describe('Simulation basics', () => {
  it('should move a unit based on intendedMoveocity', () => {
    const initial = new Simulator().addUnit({
      id: 'u1',
      pos: { x: 0, y: 0 },
      intendedMove: { x: 1, y: 0 }
    });

    expect(initial.roster.u1.pos.x).toBe(0);
    const next = initial.step();
    expect(next.roster.u1.pos.x).toBe(1);
  });

  it('should move multiple units independently', () => {
    const sim = new Simulator()
      .addUnit({ id: 'a', pos: { x: 0, y: 0 }, intendedMove: { x: 1, y: 0 }})
      .addUnit({ id: 'b', pos: { x: 5, y: 0 }, intendedMove: { x: -1, y: 0 }});
  
    const next = sim.step();
    expect(next.roster.a.pos.x).toBe(1);
    expect(next.roster.b.pos.x).toBe(4);
  });
  
  it('should not move units with zero intendedMove', () => {
    const sim = new Simulator()
      .addUnit({ id: 'c', pos: { x: 2, y: 2 }, intendedMove: { x: 0, y: 0 }});
    const next = sim.step();
    expect(next.units[0].pos.x).toBe(2);
    expect(next.units[0].pos.y).toBe(2);
  });
  
  it('should cull unit if hp <= 0', () => {
    const sim = new Simulator()
      .addUnit({ id: 'd', pos: { x: 0, y: 0 }, intendedMove: { x: 0, y: 0 }, hp: 0});
    const next = sim.step();
    expect(next.units.length).toBe(0); // Dead unit should be culled
  });
  
  it('should accept input to change intendedMoveocity', () => {
    const sim = new Simulator()
      .addUnit({ id: 'e', pos: { x: 0, y: 0 }, intendedMove: { x: 0, y: 0 }});
    const input = { commands: { e: [{ action: 'move', target: { x: 1, y: 0 } }] } };
    sim.accept(input);
    expect(sim.units[0].intendedMove.x).toBe(1);
  });
});
