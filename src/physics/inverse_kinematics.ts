import { Vec2 } from "../types/Vec2";

export interface IKSegment {
  start: Vec2;
  end: Vec2;
  length: number;
  angle: number;
}

export interface IKChain {
  segments: IKSegment[];
  origin: Vec2;
  target: Vec2;
}

/**
 * FABRIK (Forward And Backward Reaching Inverse Kinematics) solver
 * Used for chains, ropes, and articulated limbs
 */
export class InverseKinematics {
  /**
   * Solve IK chain using FABRIK algorithm
   * @param chain Array of segment lengths
   * @param origin Fixed start point
   * @param target Desired end point
   * @param iterations Number of iterations (more = more accurate)
   */
  static solve(
    segmentLengths: number[],
    origin: Vec2,
    target: Vec2,
    iterations: number = 3
  ): IKChain {
    const segments: IKSegment[] = [];
    const positions: Vec2[] = [];
    
    // Initialize positions along straight line from origin to target
    const totalLength = segmentLengths.reduce((sum, len) => sum + len, 0);
    const distance = this.distance(origin, target);
    
    // If target is unreachable, stretch toward it
    const reachable = distance <= totalLength;
    
    // Initialize positions
    positions.push({ ...origin });
    let currentPos = { ...origin };
    
    for (let i = 0; i < segmentLengths.length; i++) {
      const t = (i + 1) / segmentLengths.length;
      const nextPos = this.lerp(origin, target, t);
      positions.push(nextPos);
      currentPos = nextPos;
    }
    
    // FABRIK iterations
    for (let iter = 0; iter < iterations; iter++) {
      // Backward pass: start from target and work toward origin
      positions[positions.length - 1] = { ...target };
      
      for (let i = positions.length - 2; i >= 0; i--) {
        const direction = this.normalize(
          this.subtract(positions[i], positions[i + 1])
        );
        positions[i] = this.add(
          positions[i + 1],
          this.multiply(direction, segmentLengths[i])
        );
      }
      
      // Forward pass: start from origin and work toward target
      positions[0] = { ...origin };
      
      for (let i = 1; i < positions.length; i++) {
        const direction = this.normalize(
          this.subtract(positions[i], positions[i - 1])
        );
        positions[i] = this.add(
          positions[i - 1],
          this.multiply(direction, segmentLengths[i - 1])
        );
      }
    }
    
    // Build segments from positions
    for (let i = 0; i < segmentLengths.length; i++) {
      const start = positions[i];
      const end = positions[i + 1];
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      
      segments.push({
        start,
        end,
        length: segmentLengths[i],
        angle
      });
    }
    
    return { segments, origin, target };
  }
  
  /**
   * Create a chain with physics constraints (gravity, stiffness)
   */
  static solveWithPhysics(
    segmentLengths: number[],
    origin: Vec2,
    target: Vec2,
    gravity: number = 0.1,
    stiffness: number = 0.5
  ): IKChain {
    const chain = this.solve(segmentLengths, origin, target);
    
    // Apply gravity to each segment
    for (let i = 1; i < chain.segments.length; i++) {
      const segment = chain.segments[i];
      
      // Apply gravity sag based on distance from endpoints
      const t = i / chain.segments.length;
      const sagAmount = Math.sin(t * Math.PI) * gravity * (1 - stiffness);
      
      segment.start.y += sagAmount;
      segment.end.y += sagAmount;
    }
    
    // Re-constrain lengths after physics
    for (let i = 0; i < chain.segments.length; i++) {
      const segment = chain.segments[i];
      const currentLength = this.distance(segment.start, segment.end);
      
      if (currentLength > 0) {
        const scale = segment.length / currentLength;
        const direction = this.normalize(
          this.subtract(segment.end, segment.start)
        );
        segment.end = this.add(
          segment.start,
          this.multiply(direction, segment.length)
        );
      }
      
      // Update angle
      segment.angle = Math.atan2(
        segment.end.y - segment.start.y,
        segment.end.x - segment.start.x
      );
      
      // Connect next segment
      if (i < chain.segments.length - 1) {
        chain.segments[i + 1].start = segment.end;
      }
    }
    
    return chain;
  }
  
  // Vector math utilities
  private static distance(a: Vec2, b: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  private static normalize(v: Vec2): Vec2 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  }
  
  private static subtract(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
  }
  
  private static add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y };
  }
  
  private static multiply(v: Vec2, scalar: number): Vec2 {
    return { x: v.x * scalar, y: v.y * scalar };
  }
  
  private static lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t
    };
  }
}