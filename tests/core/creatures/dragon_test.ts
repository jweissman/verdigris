import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';
import Encyclopaedia from '../../../src/dmg/encyclopaedia';

describe('Dragon Test', () => {
  it('should create exactly 1 dragon + 8 segments', () => {
    const sim = new Simulator(20, 15);
    const dragon = { ...Encyclopaedia.unit('dragon'), id: 'dragon1', pos: { x: 10, y: 8 } };
    sim.addUnit(dragon);
    sim.step();
    const allUnits = sim.units;
    const dragonUnits = allUnits.filter(u => u.id.includes('dragon'));
    const segments = allUnits.filter(u => u.meta.segment && u.meta.parentId === 'dragon1');
    expect(segments.length).toBe(8);
    expect(dragonUnits.length).toBe(12); // 1 head + 3 phantoms + 8 segments
  });
});