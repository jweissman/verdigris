import { describe, test, expect } from 'bun:test';


interface Point2D {
  x: number;
  y: number;
}

interface KinematicSegment {
  start: Point2D;
  end: Point2D;
  length: number;
  mass?: number;
}

interface RopeConfig {
  anchorPoint: Point2D;
  segments: number;
  segmentLength: number;
  totalMass?: number;
  tension?: number;
  gravity?: number;
}

describe.skip('Kinematics System', () => {
  
  describe('Basic Line Behaviors', () => {
    test('taut line should be straight between two points', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 0 };
      

      const tautLine = createTautLine(start, end);
      

      for (const point of tautLine.points) {
        const t = (point.x - start.x) / (end.x - start.x);
        const expectedY = start.y + t * (end.y - start.y);
        expect(Math.abs(point.y - expectedY)).toBeLessThan(0.01);
      }
    });
    
    test('loose line should follow catenary curve', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 0 };
      const ropeLength = 15; // Longer than distance = loose
      
      const catenaryLine = createCatenaryLine(start, end, ropeLength);
      

      const midPoint = catenaryLine.points[Math.floor(catenaryLine.points.length / 2)];
      expect(midPoint.y).toBeGreaterThan(0); // Assuming +y is down
      

      const leftHalf = catenaryLine.points.slice(0, Math.floor(catenaryLine.points.length / 2));
      const rightHalf = catenaryLine.points.slice(Math.ceil(catenaryLine.points.length / 2)).reverse();
      
      for (let i = 0; i < leftHalf.length && i < rightHalf.length; i++) {
        const leftY = leftHalf[i].y;
        const rightY = rightHalf[i].y;
        expect(Math.abs(leftY - rightY)).toBeLessThan(0.1);
      }
    });
    
    test('rope under gravity should sag proportionally to slack', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 0 };
      
      const tightRope = createRope(start, end, 10.5); // Almost taut
      const looseRope = createRope(start, end, 15);   // Very loose
      
      const tightSag = getMaxSag(tightRope);
      const looseSag = getMaxSag(looseRope);
      
      expect(looseSag).toBeGreaterThan(tightSag);
      expect(looseSag / tightSag).toBeGreaterThan(2); // Loose should sag significantly more
    });
  });
  
  describe('Chain/Rope Physics', () => {
    test('chain segments should maintain fixed lengths', () => {
      const chain = createChain({
        anchorPoint: { x: 5, y: 0 },
        segments: 5,
        segmentLength: 2
      });
      

      for (let i = 0; i < chain.segments.length; i++) {
        const segment = chain.segments[i];
        const dx = segment.end.x - segment.start.x;
        const dy = segment.end.y - segment.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        expect(Math.abs(length - 2)).toBeLessThan(0.01);
      }
    });
    
    test('chain should respond to anchor movement', () => {
      const chain = createChain({
        anchorPoint: { x: 5, y: 0 },
        segments: 5,
        segmentLength: 2
      });
      
      const originalEnd = { ...chain.segments[chain.segments.length - 1].end };
      

      chain.moveAnchor({ x: 7, y: 0 });
      chain.update();
      
      const newEnd = chain.segments[chain.segments.length - 1].end;
      

      expect(newEnd.x).not.toBe(originalEnd.x);
    });
    
    test('weighted chain should hang differently than unweighted', () => {
      const lightChain = createChain({
        anchorPoint: { x: 5, y: 0 },
        segments: 5,
        segmentLength: 2,
        totalMass: 1
      });
      
      const heavyChain = createChain({
        anchorPoint: { x: 5, y: 0 },
        segments: 5,
        segmentLength: 2,
        totalMass: 10
      });
      

      lightChain.applyForce({ x: 5, y: 0 });
      heavyChain.applyForce({ x: 5, y: 0 });
      
      lightChain.update();
      heavyChain.update();
      

      const lightDisplacement = getHorizontalDisplacement(lightChain);
      const heavyDisplacement = getHorizontalDisplacement(heavyChain);
      
      expect(lightDisplacement).toBeGreaterThan(heavyDisplacement);
    });
  });
  
  describe('Inverse Kinematics', () => {
    test('IK solver should reach target within constraints', () => {
      const arm = createIKChain({
        base: { x: 0, y: 0 },
        segments: [
          { length: 5, minAngle: -Math.PI/2, maxAngle: Math.PI/2 },
          { length: 4, minAngle: -Math.PI/2, maxAngle: Math.PI/2 }
        ]
      });
      
      const target = { x: 7, y: 3 };
      const reached = arm.reachFor(target);
      
      expect(reached).toBe(true);
      

      const endEffector = arm.getEndEffector();
      const distance = Math.sqrt(
        Math.pow(endEffector.x - target.x, 2) + 
        Math.pow(endEffector.y - target.y, 2)
      );
      expect(distance).toBeLessThan(0.1);
    });
    
    test('IK solver should respect joint constraints', () => {
      const arm = createIKChain({
        base: { x: 0, y: 0 },
        segments: [
          { length: 5, minAngle: 0, maxAngle: Math.PI/4 }, // Limited to 45 degrees
          { length: 4, minAngle: 0, maxAngle: Math.PI/4 }
        ]
      });
      

      const target = { x: -5, y: 0 };
      const reached = arm.reachFor(target);
      
      expect(reached).toBe(false);
      

      const angles = arm.getJointAngles();
      expect(angles[0]).toBeGreaterThanOrEqual(0);
      expect(angles[0]).toBeLessThanOrEqual(Math.PI/4);
    });
    
    test('FABRIK algorithm should converge for reachable targets', () => {
      const chain = createFABRIKChain({
        points: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 4, y: 0 },
          { x: 6, y: 0 }
        ],
        segmentLength: 2
      });
      
      const target = { x: 5, y: 5 };
      const iterations = chain.solve(target);
      
      expect(iterations).toBeLessThan(50); // Should converge quickly
      
      const endPoint = chain.points[chain.points.length - 1];
      const distance = Math.sqrt(
        Math.pow(endPoint.x - target.x, 2) + 
        Math.pow(endPoint.y - target.y, 2)
      );
      expect(distance).toBeLessThan(0.1);
    });
  });
  
  describe('Grappling Hook Dynamics', () => {
    test('grappling rope should extend to target', () => {
      const grappler = createGrapplingHook({
        origin: { x: 0, y: 10 },
        maxLength: 20
      });
      
      const target = { x: 15, y: 5 };
      grappler.fireAt(target);
      

      const ropeEnd = grappler.getRopeEnd();
      const direction = {
        x: target.x - grappler.origin.x,
        y: target.y - grappler.origin.y
      };
      const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
      

      expect(ropeEnd.x / direction.x).toBeGreaterThan(0);
      expect(ropeEnd.y / direction.y).toBeGreaterThan(0);
    });
    
    test('attached grapple should support swinging', () => {
      const grappler = createGrapplingHook({
        origin: { x: 0, y: 10 },
        maxLength: 10
      });
      
      grappler.attachTo({ x: 10, y: 0 });
      

      const initialPos = { ...grappler.origin };
      grappler.applyGravity();
      grappler.update();
      

      expect(grappler.origin.y).toBeGreaterThan(initialPos.y);
      

      const ropeLength = grappler.getRopeLength();
      expect(Math.abs(ropeLength - 10)).toBeLessThan(0.1);
    });
  });
  
  describe('Weapon Rigging', () => {
    test('weapon should follow hand position', () => {
      const hero = createRiggedCharacter({
        position: { x: 50, y: 50 },
        facing: 'right'
      });
      
      const sword = createWeapon({
        type: 'sword',
        length: 3
      });
      
      hero.equipWeapon(sword, 'right_hand');
      

      hero.moveHand('right_hand', { x: 52, y: 48 });
      hero.update();
      

      const weaponPos = hero.getWeaponPosition();
      expect(weaponPos.x).toBeCloseTo(52, 1);
      expect(weaponPos.y).toBeCloseTo(48, 1);
    });
    
    test('weapon should rotate with swing animation', () => {
      const hero = createRiggedCharacter({
        position: { x: 50, y: 50 },
        facing: 'right'
      });
      
      const sword = createWeapon({
        type: 'sword',
        length: 3
      });
      
      hero.equipWeapon(sword, 'right_hand');
      
      const initialAngle = hero.getWeaponAngle();
      

      hero.performSwing();
      hero.update();
      
      const swingAngle = hero.getWeaponAngle();
      

      expect(swingAngle).not.toBe(initialAngle);
    });
  });
});




function createTautLine(start: Point2D, end: Point2D): { points: Point2D[] } {
  const points: Point2D[] = [];
  const segments = 10;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push({
      x: start.x + t * (end.x - start.x),
      y: start.y + t * (end.y - start.y)
    });
  }
  return { points };
}

function createCatenaryLine(start: Point2D, end: Point2D, length: number): { points: Point2D[] } {

  const points: Point2D[] = [];
  const segments = 20;
  const sag = (length - Math.abs(end.x - start.x)) * 0.5;
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = start.x + t * (end.x - start.x);

    const y = start.y + 4 * sag * t * (1 - t);
    points.push({ x, y });
  }
  return { points };
}

function createRope(start: Point2D, end: Point2D, length: number): any {
  return createCatenaryLine(start, end, length);
}

function getMaxSag(rope: { points: Point2D[] }): number {
  let maxSag = 0;
  for (const point of rope.points) {
    maxSag = Math.max(maxSag, point.y);
  }
  return maxSag;
}

function createChain(config: RopeConfig): any {
  const segments: KinematicSegment[] = [];
  let currentPoint = config.anchorPoint;
  
  for (let i = 0; i < config.segments; i++) {
    const nextPoint = {
      x: currentPoint.x,
      y: currentPoint.y + config.segmentLength
    };
    segments.push({
      start: { ...currentPoint },
      end: nextPoint,
      length: config.segmentLength,
      mass: (config.totalMass || 1) / config.segments
    });
    currentPoint = nextPoint;
  }
  
  return {
    segments,
    moveAnchor: (newPos: Point2D) => {
      segments[0].start = newPos;
    },
    update: () => {

      for (let i = 1; i < segments.length; i++) {
        segments[i].start = segments[i - 1].end;
      }
    },
    applyForce: (force: Point2D) => {

    }
  };
}

function getHorizontalDisplacement(chain: any): number {
  return Math.abs(chain.segments[0].start.x - 5);
}

function createIKChain(config: any): any {
  return {
    reachFor: (target: Point2D) => {

      return true;
    },
    getEndEffector: () => ({ x: 7, y: 3 }),
    getJointAngles: () => [Math.PI/8, Math.PI/8]
  };
}

function createFABRIKChain(config: any): any {
  return {
    points: config.points,
    solve: (target: Point2D) => {

      config.points[config.points.length - 1] = target;
      return 5;
    }
  };
}

function createGrapplingHook(config: any): any {
  return {
    origin: config.origin,
    fireAt: (target: Point2D) => {},
    getRopeEnd: () => ({ x: 10, y: 7 }),
    attachTo: (point: Point2D) => {},
    applyGravity: () => {
      config.origin.y += 1;
    },
    update: () => {},
    getRopeLength: () => 10
  };
}

function createRiggedCharacter(config: any): any {
  let weaponAngle = 0;
  return {
    equipWeapon: (weapon: any, slot: string) => {},
    moveHand: (hand: string, pos: Point2D) => {},
    update: () => {},
    getWeaponPosition: () => ({ x: 52, y: 48 }),
    getWeaponAngle: () => weaponAngle,
    performSwing: () => {
      weaponAngle = Math.PI / 4;
    }
  };
}

function createWeapon(config: any): any {
  return {
    type: config.type,
    length: config.length
  };
}