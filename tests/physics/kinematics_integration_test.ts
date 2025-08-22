import { describe, test, expect } from 'bun:test';
import { KinematicSolver, GrapplingRope } from '../../src/physics/kinematics';
import { HeroRig } from '../../src/physics/hero_rig';

describe.skip('Kinematics Integration', () => {
  
  describe('Grappling + Rope Physics', () => {
    test('grappling rope should sag realistically', () => {
      const grapplerPos = { x: 0, y: 0 };
      const targetPos = { x: 10, y: 0 };
      
      const rope = new GrapplingRope(grapplerPos, targetPos, 15);
      
      // Get rope points
      const points = rope.getRopePoints();
      
      // Should have multiple segments
      expect(points.length).toBeGreaterThan(2);
      
      // Middle points should sag (y > 0 assuming gravity pulls down)
      const middleIndex = Math.floor(points.length / 2);
      const middlePoint = points[middleIndex];
      
      // Some sag expected since rope length (15) > distance (10)
      expect(middlePoint.y).toBeGreaterThan(0);
    });
    
    test('taut rope should be nearly straight', () => {
      const grapplerPos = { x: 0, y: 0 };
      const targetPos = { x: 10, y: 0 };
      
      // Create rope with length almost equal to distance (minimal slack)
      const rope = new GrapplingRope(grapplerPos, targetPos, 10.1);
      
      expect(rope.isTaut()).toBe(false); // Not quite taut initially
      
      // Pull the rope taut
      rope.applyPull(5);
      rope.update(grapplerPos, targetPos);
      
      const points = rope.getRopePoints();
      
      // Points should be nearly collinear
      for (let i = 1; i < points.length - 1; i++) {
        const deviation = Math.abs(points[i].y);
        expect(deviation).toBeLessThan(1); // Minimal sag
      }
    });
    
    test('rope should respond to endpoint movement', () => {
      const grapplerPos = { x: 0, y: 0 };
      const targetPos = { x: 10, y: 0 };
      
      const rope = new GrapplingRope(grapplerPos, targetPos);
      
      const initialPoints = [...rope.getRopePoints()];
      
      // Move grappler
      const newGrapplerPos = { x: 2, y: -2 };
      rope.update(newGrapplerPos, targetPos);
      
      const updatedPoints = rope.getRopePoints();
      
      // First point should have moved
      expect(updatedPoints[0].x).toBe(newGrapplerPos.x);
      expect(updatedPoints[0].y).toBe(newGrapplerPos.y);
      
      // Shape should have changed
      expect(updatedPoints[1].x).not.toBe(initialPoints[1].x);
    });
  });
  
  describe('Hero Rig + IK', () => {
    test('hero can reach for targets with IK', () => {
      const hero = new HeroRig({ x: 50, y: 50 });
      
      // Target within reach
      const target = { x: 53, y: 48 };
      const reached = hero.reachFor('right_arm', target);
      
      expect(reached).toBe(true);
      
      // Arm should point toward target
      const rightArm = hero.skeleton.get('right_arm');
      expect(rightArm).toBeDefined();
      
      // Check general direction (angle should point toward target)
      const dx = target.x - rightArm!.start.x;
      const dy = target.y - rightArm!.start.y;
      const targetAngle = Math.atan2(dy, dx);
      
      // Angle should be roughly in the right direction
      expect(Math.abs(rightArm!.angle - targetAngle)).toBeLessThan(Math.PI / 2);
    });
    
    test('hero animations update skeleton', () => {
      const hero = new HeroRig({ x: 50, y: 50 });
      
      // Get initial arm position
      const initialArmAngle = hero.skeleton.get('right_arm')?.angle || 0;
      
      // Play walk animation
      hero.playAnimation('walk');
      hero.update(5); // Update 5 frames
      
      const walkArmAngle = hero.skeleton.get('right_arm')?.angle || 0;
      
      // Arm angle should have changed
      expect(walkArmAngle).not.toBe(initialArmAngle);
    });
    
    test('weapon follows hand during animation', () => {
      const hero = new HeroRig({ x: 50, y: 50 });
      
      // Equip a sword
      hero.equipWeapon({
        type: 'sword',
        length: 3,
        damage: 10,
        socketOffset: { x: 0, y: 0 },
        angleOffset: 0
      });
      
      const initialWeaponTransform = hero.getWeaponTransform();
      expect(initialWeaponTransform).not.toBeNull();
      
      // Play swing animation
      hero.playAnimation('swing');
      hero.update(3);
      
      const swingWeaponTransform = hero.getWeaponTransform();
      
      // Weapon position should have changed
      expect(swingWeaponTransform?.position.x).not.toBe(initialWeaponTransform?.position.x);
      expect(swingWeaponTransform?.angle).not.toBe(initialWeaponTransform?.angle);
    });
  });
  
  describe('Combined System', () => {
    test('hero with grappling hook creates proper rope physics', () => {
      const hero = new HeroRig({ x: 10, y: 10 });
      
      // Hero fires grappling hook
      const hookTarget = { x: 20, y: 5 };
      const grapplingRope = new GrapplingRope(
        hero.skeleton.get('right_hand')!.end,
        hookTarget,
        15
      );
      
      // Rope should exist and have proper sag
      const ropePoints = grapplingRope.getRopePoints();
      expect(ropePoints.length).toBeGreaterThan(0);
      
      // As hero moves, rope should update
      hero.position = { x: 12, y: 10 };
      hero.updateSkeleton();
      
      grapplingRope.update(
        hero.skeleton.get('right_hand')!.end,
        hookTarget
      );
      
      const updatedPoints = grapplingRope.getRopePoints();
      expect(updatedPoints[0]).not.toEqual(ropePoints[0]);
    });
    
    test('catenary solver handles edge cases', () => {
      // Taut line (rope length = distance)
      const tautPoints = KinematicSolver.solveCatenary(
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        10, // Exact distance
        5
      );
      
      // Should be straight
      for (const point of tautPoints) {
        expect(Math.abs(point.y)).toBeLessThan(0.01);
      }
      
      // Very loose line
      const loosePoints = KinematicSolver.solveCatenary(
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        20, // Double the distance
        10
      );
      
      // Should have significant sag
      const maxSag = Math.max(...loosePoints.map(p => p.y));
      expect(maxSag).toBeGreaterThan(1);
      
      // Vertical line
      const verticalPoints = KinematicSolver.solveCatenary(
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        12,
        5
      );
      
      // Should curve to the side
      const maxX = Math.max(...verticalPoints.map(p => Math.abs(p.x)));
      expect(maxX).toBeGreaterThan(0);
    });
  });
  
  describe.skip('Performance', () => {
    test('kinematic solver handles many segments efficiently', () => {
      const start = performance.now();
      
      // Create a complex rope with many segments
      const rope = KinematicSolver.createRope(
        { x: 0, y: 0 },
        20, // Length
        50  // Many segments
      );
      
      // Run multiple update iterations
      for (let i = 0; i < 100; i++) {
        KinematicSolver.updateChain(rope);
      }
      
      const elapsed = performance.now() - start;
      
      // Should complete in reasonable time
      expect(elapsed).toBeLessThan(50); // 50ms for 100 iterations
    });
    
    test('FABRIK converges quickly for reachable targets', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 4, y: 0 },
        { x: 6, y: 0 }
      ];
      
      const lengths = [2, 2, 2];
      const target = { x: 5, y: 3 };
      
      const start = performance.now();
      const reached = KinematicSolver.solveFABRIK(
        points,
        lengths,
        target,
        0.01,
        50
      );
      const elapsed = performance.now() - start;
      
      expect(reached).toBe(true);
      expect(elapsed).toBeLessThan(5); // Should be very fast
    });
  });
});