import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Freehold Scenario Layer', () => {
  it('addWorm adds a worm at the specified grid position', () => {
    const sim = new Simulator();
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 3, y: 5 } };
    sim.addUnit(worm);
    const addedWorm = sim.units.find(u => u.sprite === 'worm');
    expect(addedWorm).toBeTruthy();
    expect(addedWorm?.pos.x).toBe(3);
    expect(addedWorm?.pos.y).toBe(5);
    expect(addedWorm?.tags).toContain('swarm');
  });

  it('can add a worm at a random grid position', () => {
    const sim = new Simulator();
    const randomX = Math.floor(Simulator.rng.random() * sim.fieldWidth);
    const randomY = Math.floor(Simulator.rng.random() * sim.fieldHeight);
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: randomX, y: randomY } };
    sim.addUnit(worm);
    const addedWorm = sim.units.find(u => u.sprite === 'worm');
    expect(addedWorm).toBeTruthy();
    expect(addedWorm?.pos.x).toBeGreaterThanOrEqual(0);
    expect(addedWorm?.pos.x).toBeLessThan(sim.fieldWidth);
    expect(addedWorm?.pos.y).toBeGreaterThanOrEqual(0);
    expect(addedWorm?.pos.y).toBeLessThan(sim.fieldHeight);
  });


  it('worm cannot move out of bounds', () => {
    const sim = new Simulator();
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 0, y: 0 } };
    sim.addUnit(worm);
    const addedWorm = sim.units.find(u => u.pos.x === 0 && u.pos.y === 0);
    expect(addedWorm).toBeTruthy();
    if (!addedWorm) throw new Error('worm not found');

    const moveResult = sim.validMove(addedWorm, -1, 0);
    expect(moveResult).toBe(false);
  });


  it('worm cannot move into occupied cell unless pushing', () => {
    const sim = new Simulator();
    const w1 = { ...Encyclopaedia.unit('worm'), pos: { x: 1, y: 1 } };
    const w2 = { ...Encyclopaedia.unit('worm'), pos: { x: 2, y: 1 } };
    const w3 = { ...Encyclopaedia.unit('worm'), pos: { x: 3, y: 1 } }; // Block the push destination
    sim.addUnit(w1);
    sim.addUnit(w2);
    sim.addUnit(w3);
    const addedW1 = sim.units.find(u => u.pos.x === 1 && u.pos.y === 1);
    const addedW2 = sim.units.find(u => u.pos.x === 2 && u.pos.y === 1);
    const addedW3 = sim.units.find(u => u.pos.x === 3 && u.pos.y === 1);
    expect(addedW1).toBeTruthy();
    expect(addedW2).toBeTruthy();
    expect(addedW3).toBeTruthy();
    if (!addedW1 || !addedW2 || !addedW3) throw new Error('worms not found');

    const moveResult = sim.validMove(addedW1, 1, 0);
    expect(moveResult).toBe(false);
  });
































  it('multiple worms can be added at same position but separate after step', () => {
    const sim = new Simulator();
    const worm1 = { ...Encyclopaedia.unit('worm'), pos: { x: 2, y: 2 } };
    const worm2 = { ...Encyclopaedia.unit('worm'), pos: { x: 2, y: 2 } };
    sim.addUnit(worm1);
    sim.addUnit(worm2); // Try to add another worm at the same position
    expect(sim.units.filter(u => u.pos.x === 2 && u.pos.y === 2).length).toBe(2);
    sim.step(); // Process the simulation step (push worms around)

    const wormsAt22 = sim.units.filter(u => u.pos.x === 2 && u.pos.y === 2);
    expect(wormsAt22.length).toBeLessThanOrEqual(1);
  });

  it.skip('worms never leave the field after many simulation steps', () => {
    const sim = new Simulator(8, 8);

    for (let x = 0; x < sim.fieldWidth; x++) {
      for (let y = 0; y < sim.fieldHeight; y++) {
        if (x % 2 === 0 && y % 2 === 0) {
          const worm = { ...Encyclopaedia.unit('worm'), pos: { x, y } };
          sim.addUnit(worm);
        }
      }
    }

    for (let step = 0; step < 100; step++) {
      sim.step();
      for (const worm of sim.units) {
        expect(worm.pos.x).toBeGreaterThanOrEqual(0);
        expect(worm.pos.x).toBeLessThan(sim.fieldWidth);
        expect(worm.pos.y).toBeGreaterThanOrEqual(0);
        expect(worm.pos.y).toBeLessThan(sim.fieldHeight);
      }
    }
  });
});
