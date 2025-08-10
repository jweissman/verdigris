import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { UnitOperations } from '../../src/UnitOperations';
import { UnitMovement } from '../../src/rules/unit_movement';

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
    const randomX = Math.floor(Math.random() * sim.fieldWidth);
    const randomY = Math.floor(Math.random() * sim.fieldHeight);
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: randomX, y: randomY } };
    sim.addUnit(worm);
    const addedWorm = sim.units.find(u => u.sprite === 'worm');
    expect(addedWorm).toBeTruthy();
    expect(addedWorm?.pos.x).toBeGreaterThanOrEqual(0);
    expect(addedWorm?.pos.x).toBeLessThan(sim.fieldWidth);
    expect(addedWorm?.pos.y).toBeGreaterThanOrEqual(0);
    expect(addedWorm?.pos.y).toBeLessThan(sim.fieldHeight);
  });

  // Movement rule: worms cannot move out of bounds
  it('worm cannot move out of bounds', () => {
    const sim = new Simulator();
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 0, y: 0 } };
    sim.addUnit(worm);
    const addedWorm = sim.units.find(u => u.pos.x === 0 && u.pos.y === 0);
    expect(addedWorm).toBeTruthy();
    if (!addedWorm) throw new Error('worm not found');
    // Try to move left (out of bounds)
    const moveResult = sim.validMove(addedWorm, -1, 0); // should fail
    expect(moveResult).toBe(false);
  });

  // Movement rule: worms cannot move into occupied cell unless pushing
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
    // w1 tries to move right into w2's cell (should fail because w3 blocks the push)
    const moveResult = sim.validMove(addedW1, 1, 0);
    expect(moveResult).toBe(false);
  });

  // Movement rule: worms push each other if possible
  // it('worm pushes another worm if possible', () => {
  //   const canvas = { width: 3, height: 1, getContext: () => ({}) } as any;
  //   const fh = new Freehold(canvas);
  //   fh.addWorm(1, 1);
  //   fh.addWorm(2, 1);
  //   // Make sure (3,1) is empty
  //   let w1 = fh.sim.units.find(u => u.pos.x === 1 && u.pos.y === 1);
  //   const w2 = fh.sim.units.find(u => u.pos.x === 2 && u.pos.y === 1);
  //   expect(w1).toBeTruthy();
  //   expect(w2).toBeTruthy();
  //   if (!w1 || !w2) throw new Error('worms not found');
  //   // w1 tries to move right into w2's cell (should push w2 to (3,1))
  //   const moveResult = fh.sim.validMove(w1, 1, 0);
  //   expect(moveResult).toBe(false);

  //   // but if we move _anyway_ we should be able to push
  //   w1.intendedMove = { x: 1, y: 0 };
  //   let movement = new UnitMovement(fh.sim);
  //   movement.apply();

  //   // Check positions after movement
  //   w1 = fh.sim.roster.worm;
  //   // w1 = UnitOperations.move(w1, 1, fh.sim);

  //   // UnitMovement.resolveCollisions(fh.sim);

  //   expect(w1.pos.x).toBe(1);
  //   expect(w2.pos.x).toBe(2);
  // });

  it('multiple worms can be added at same position but separate after step', () => {
    const sim = new Simulator();
    const worm1 = { ...Encyclopaedia.unit('worm'), pos: { x: 2, y: 2 } };
    const worm2 = { ...Encyclopaedia.unit('worm'), pos: { x: 2, y: 2 } };
    sim.addUnit(worm1);
    sim.addUnit(worm2); // Try to add another worm at the same position
    expect(sim.units.filter(u => u.pos.x === 2 && u.pos.y === 2).length).toBe(2);
    sim.step(); // Process the simulation step (push worms around)
    // Only one worm at (2,2)
    const wormsAt22 = sim.units.filter(u => u.pos.x === 2 && u.pos.y === 2);
    expect(wormsAt22.length).toBeLessThanOrEqual(1);
  });

  it('worms never leave the field after many simulation steps', () => {
    const sim = new Simulator(8, 8);
    // Fill the field with worms at every position
    for (let x = 0; x < sim.fieldWidth; x++) {
      for (let y = 0; y < sim.fieldHeight; y++) {
        if (x % 2 === 0 && y % 2 === 0) {
          const worm = { ...Encyclopaedia.unit('worm'), pos: { x, y } };
          sim.addUnit(worm);
        }
      }
    }
    // Simulate many steps
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
