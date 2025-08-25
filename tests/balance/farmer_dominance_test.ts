import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Farmer Balance Investigation', () => {
  test('farmer plant ability creates blocking bushes', () => {
    const sim = new Simulator(20, 20);
    const farmer = sim.addUnit({
      ...Encyclopaedia.unit('farmer'),
      id: 'farmer1',
      pos: { x: 10, y: 10 },
      team: 'friendly'
    });
    sim.forceAbility('farmer1', 'plant', farmer.pos);
    sim.step();
    const bush = sim.units.find(u => u.type === 'bush');
    expect(bush).toBeDefined();
    expect(bush?.hp).toBe(1);
    expect(bush?.mass).toBe(1);
  });
});