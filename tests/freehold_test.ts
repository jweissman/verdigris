import { describe, it, expect } from 'bun:test';
import { Freehold } from '../src/freehold';
import { UnitOperations } from '../src/UnitOperations';
import { UnitMovement } from '../src/rules/unit_movement';

describe('Freehold Scenario Layer', () => {
  it('addWorm adds a worm at the specified grid position', () => {
    // Use a dummy canvas for headless test
    const canvas = { getContext: () => ({ clearRect() {}, save() {}, restore() {}, fillRect() {}, beginPath() {}, arc() {}, fillStyle: '', fill() {}, globalAlpha: 1 }) } as any;
    const fh = new Freehold(canvas);
    fh.addWorm(3, 5, ["swarm"]);
    const worm = fh.sim.units.find(u => u.sprite === 'worm');
    expect(worm).toBeTruthy();
    expect(worm?.pos.x).toBe(3);
    expect(worm?.pos.y).toBe(5);
    expect(worm?.tags).toContain('swarm');
  });

  it('getInputHandler adds a worm at a random grid position on w key', () => {

    const canvas = {
      width: 800, height: 600,
      getContext: () => ({
        clearRect() { }, save() { }, restore() { }, fillRect() { }, beginPath() { }, arc() { }, fillStyle: '', fill() { }, globalAlpha: 1
      })
    } as any;
    const fh = new Freehold(canvas);
    const handler = fh.getInputHandler();
    // Simulate pressing 'w'
    handler({ key: 'w' });
    const worm = fh.sim.units.find(u => u.sprite === 'worm');
    expect(worm).toBeTruthy();
    expect(worm?.pos.x).toBeGreaterThanOrEqual(0);
    // expect(worm?.pos.x).toBeLessThan(16);
    expect(worm?.pos.y).toBeGreaterThanOrEqual(0);
    // expect(worm?.pos.y).toBeLessThan(12);
  });

  // Movement rule: worms cannot move out of bounds
  it('worm cannot move out of bounds', () => {
    const canvas = { getContext: () => ({}) } as any;
    const fh = new Freehold(canvas);
    fh.addWorm(0, 0);
    const worm = fh.sim.units.find(u => u.pos.x === 0 && u.pos.y === 0);
    expect(worm).toBeTruthy();
    if (!worm) throw new Error('worm not found');
    // Try to move left (out of bounds)
    const moveResult = fh.sim.validMove(worm, -1, 0); // should fail
    expect(moveResult).toBe(false);
    // expect(worm.pos.x).toBe(0);
    // expect(worm.pos.y).toBe(0);
  });

  // Movement rule: worms cannot move into occupied cell unless pushing
  it('worm cannot move into occupied cell unless pushing', () => {
    const canvas = { getContext: () => ({}) } as any;
    const fh = new Freehold(canvas);
    fh.addWorm(1, 1);
    fh.addWorm(2, 1);
    fh.addWorm(3, 1); // Block the push destination
    const w1 = fh.sim.units.find(u => u.pos.x === 1 && u.pos.y === 1);
    const w2 = fh.sim.units.find(u => u.pos.x === 2 && u.pos.y === 1);
    const w3 = fh.sim.units.find(u => u.pos.x === 3 && u.pos.y === 1);
    expect(w1).toBeTruthy();
    expect(w2).toBeTruthy();
    expect(w3).toBeTruthy();
    if (!w1 || !w2 || !w3) throw new Error('worms not found');
    // w1 tries to move right into w2's cell (should fail because w3 blocks the push)
    const moveResult = fh.sim.validMove(w1, 1, 0);
    expect(moveResult).toBe(false);
    // expect(w1.pos.x).toBe(1);
    // expect(w2.pos.x).toBe(2);
    // expect(w3.pos.x).toBe(3);
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
  //   console.log("sim roster", fh.sim.roster);
  //   w1 = fh.sim.roster.worm;
  //   // w1 = UnitOperations.move(w1, 1, fh.sim);

  //   // UnitMovement.resolveCollisions(fh.sim);

  //   expect(w1.pos.x).toBe(1);
  //   expect(w2.pos.x).toBe(2);
  // });

  it('addWorm does not allow duplicate cell occupation', () => {
    const canvas = { getContext: () => ({}) } as any;
    const fh = new Freehold(canvas);
    fh.addWorm(2, 2);
    fh.addWorm(2, 2);
    // Only one worm at (2,2)
    const wormsAt22 = fh.sim.units.filter(u => u.pos.x === 2 && u.pos.y === 2);
    expect(wormsAt22.length).toBe(1);
  });

  it('worms never leave the field after many simulation steps', () => {
    const canvas = { width: 8, height: 8, getContext: () => ({}) } as any;
    const fh = new Freehold(canvas);
    // Fill the field with worms at every position
    for (let x = 0; x < fh.sim.fieldWidth; x++) {
      for (let y = 0; y < fh.sim.fieldHeight; y++) {
        if (x % 2 === 0 && y % 2 === 0) {
          fh.addWorm(x, y);
        }
      }
    }
    // Simulate many steps
    for (let step = 0; step < 100; step++) {
      fh.sim.step();
      for (const worm of fh.sim.units) {
        expect(worm.pos.x).toBeGreaterThanOrEqual(0);
        expect(worm.pos.x).toBeLessThan(fh.sim.fieldWidth);
        expect(worm.pos.y).toBeGreaterThanOrEqual(0);
        expect(worm.pos.y).toBeLessThan(fh.sim.fieldHeight);
      }
    }
  });
});
