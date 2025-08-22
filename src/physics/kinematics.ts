import { Vec2 } from "../types/Vec2";

/**
 * Unified kinematic system for ropes, chains, and skeletal animation
 */

export interface KinematicNode {
  position: Vec2;
  velocity: Vec2;
  mass: number;
  pinned: boolean;
  constraints?: NodeConstraint[];
}

export interface NodeConstraint {
  type: 'distance' | 'angle' | 'pin';
  targetNode?: KinematicNode;
  value: number; // Distance, angle, or position
  stiffness: number; // 0-1, how strictly to enforce
}

export interface KinematicChain {
  nodes: KinematicNode[];
  constraints: ChainConstraint[];
  gravity: number;
  damping: number;
  iterations: number; // Verlet integration iterations
}

export interface ChainConstraint {
  nodeA: number; // Index
  nodeB: number;
  restLength: number;
  stiffness: number;
}

export class KinematicSolver {
  /**
   * Solve catenary curve for a rope/chain between two points
   * Returns intermediate points along the curve
   */
  static solveCatenary(
    start: Vec2,
    end: Vec2,
    ropeLength: number,
    segments: number = 10,
    gravity: number = 9.8
  ): Vec2[] {
    const points: Vec2[] = [];
    
    // Horizontal distance
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const horizontalDist = Math.abs(dx);
    
    if (ropeLength <= Math.sqrt(dx * dx + dy * dy)) {
      // Rope is taut - straight line
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        points.push({
          x: start.x + t * dx,
          y: start.y + t * dy
        });
      }
      return points;
    }
    
    // Calculate catenary parameters
    // Simplified: use parabolic approximation for performance
    const slack = ropeLength - Math.sqrt(dx * dx + dy * dy);
    const sag = slack * gravity * 0.5; // Simplified sag calculation
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = start.x + t * dx;
      
      // Parabolic approximation of catenary
      const sagAtPoint = 4 * sag * t * (1 - t);
      const y = start.y + t * dy + sagAtPoint;
      
      points.push({ x, y });
    }
    
    return points;
  }
  
  /**
   * Verlet integration for rope/chain physics
   */
  static updateChain(chain: KinematicChain, dt: number = 1/60): void {
    // Update positions using Verlet integration
    for (const node of chain.nodes) {
      if (node.pinned) continue;
      
      const oldPos = { ...node.position };
      
      // Verlet integration: x_new = x + (x - x_old) + a * dt^2
      node.position.x += node.velocity.x * dt + 0.5 * 0 * dt * dt;
      node.position.y += node.velocity.y * dt + 0.5 * chain.gravity * dt * dt;
      
      // Update velocity from position change
      node.velocity.x = (node.position.x - oldPos.x) / dt * chain.damping;
      node.velocity.y = (node.position.y - oldPos.y) / dt * chain.damping;
    }
    
    // Satisfy constraints
    for (let iter = 0; iter < chain.iterations; iter++) {
      for (const constraint of chain.constraints) {
        this.satisfyConstraint(chain, constraint);
      }
    }
  }
  
  private static satisfyConstraint(chain: KinematicChain, constraint: ChainConstraint): void {
    const nodeA = chain.nodes[constraint.nodeA];
    const nodeB = chain.nodes[constraint.nodeB];
    
    const dx = nodeB.position.x - nodeA.position.x;
    const dy = nodeB.position.y - nodeA.position.y;
    const currentDist = Math.sqrt(dx * dx + dy * dy);
    
    if (currentDist === 0) return;
    
    const error = (constraint.restLength - currentDist) / currentDist;
    const correction = error * constraint.stiffness * 0.5;
    
    const offsetX = dx * correction;
    const offsetY = dy * correction;
    
    // Apply corrections based on mass ratio
    const totalMass = nodeA.mass + nodeB.mass;
    const ratioA = nodeB.mass / totalMass;
    const ratioB = nodeA.mass / totalMass;
    
    if (!nodeA.pinned) {
      nodeA.position.x -= offsetX * ratioA;
      nodeA.position.y -= offsetY * ratioA;
    }
    
    if (!nodeB.pinned) {
      nodeB.position.x += offsetX * ratioB;
      nodeB.position.y += offsetY * ratioB;
    }
  }
  
  /**
   * FABRIK (Forward And Backward Reaching Inverse Kinematics)
   * Efficient IK solver for reaching targets
   */
  static solveFABRIK(
    points: Vec2[],
    segmentLengths: number[],
    target: Vec2,
    tolerance: number = 0.01,
    maxIterations: number = 10
  ): boolean {
    if (points.length < 2) return false;
    
    const origin = { ...points[0] };
    let iteration = 0;
    
    while (iteration < maxIterations) {
      // Forward pass - reach toward target
      points[points.length - 1] = { ...target };
      
      for (let i = points.length - 2; i >= 0; i--) {
        const dx = points[i].x - points[i + 1].x;
        const dy = points[i].y - points[i + 1].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          const factor = segmentLengths[i] / dist;
          points[i].x = points[i + 1].x + dx * factor;
          points[i].y = points[i + 1].y + dy * factor;
        }
      }
      
      // Backward pass - pull back to origin
      points[0] = { ...origin };
      
      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          const factor = segmentLengths[i - 1] / dist;
          points[i].x = points[i - 1].x + dx * factor;
          points[i].y = points[i - 1].y + dy * factor;
        }
      }
      
      // Check if we're close enough to target
      const endDx = points[points.length - 1].x - target.x;
      const endDy = points[points.length - 1].y - target.y;
      const error = Math.sqrt(endDx * endDx + endDy * endDy);
      
      if (error < tolerance) {
        return true;
      }
      
      iteration++;
    }
    
    return false;
  }
  
  /**
   * Create a rope/chain that can be used with existing grappling physics
   */
  static createRope(
    anchorPoint: Vec2,
    length: number,
    segments: number = 10,
    mass: number = 1
  ): KinematicChain {
    const nodes: KinematicNode[] = [];
    const constraints: ChainConstraint[] = [];
    const segmentLength = length / segments;
    const segmentMass = mass / segments;
    
    // Create nodes
    for (let i = 0; i <= segments; i++) {
      nodes.push({
        position: {
          x: anchorPoint.x,
          y: anchorPoint.y + i * segmentLength
        },
        velocity: { x: 0, y: 0 },
        mass: segmentMass,
        pinned: i === 0 // First node is pinned
      });
    }
    
    // Create constraints between adjacent nodes
    for (let i = 0; i < segments; i++) {
      constraints.push({
        nodeA: i,
        nodeB: i + 1,
        restLength: segmentLength,
        stiffness: 0.99
      });
    }
    
    return {
      nodes,
      constraints,
      gravity: 0.5,
      damping: 0.99,
      iterations: 3
    };
  }
  
  /**
   * Apply force to a chain (for grappling hook physics)
   */
  static applyForceToChain(
    chain: KinematicChain,
    nodeIndex: number,
    force: Vec2
  ): void {
    if (nodeIndex >= 0 && nodeIndex < chain.nodes.length) {
      const node = chain.nodes[nodeIndex];
      if (!node.pinned) {
        node.velocity.x += force.x / node.mass;
        node.velocity.y += force.y / node.mass;
      }
    }
  }
  
  /**
   * Get rope tension for rendering (taut vs loose)
   */
  static getRopeTension(chain: KinematicChain): number {
    if (chain.nodes.length < 2) return 0;
    
    // Calculate total length vs rest length
    let currentLength = 0;
    let restLength = 0;
    
    for (const constraint of chain.constraints) {
      const nodeA = chain.nodes[constraint.nodeA];
      const nodeB = chain.nodes[constraint.nodeB];
      
      const dx = nodeB.position.x - nodeA.position.x;
      const dy = nodeB.position.y - nodeA.position.y;
      currentLength += Math.sqrt(dx * dx + dy * dy);
      restLength += constraint.restLength;
    }
    
    // Return tension as ratio (1 = perfectly relaxed, >1 = stretched)
    return currentLength / restLength;
  }
}

/**
 * Integration with existing grappling system
 */
export class GrapplingRope {
  private chain: KinematicChain;
  private grapplerPos: Vec2;
  private targetPos: Vec2;
  
  constructor(
    grapplerPos: Vec2,
    targetPos: Vec2,
    maxLength: number = 10
  ) {
    this.grapplerPos = grapplerPos;
    this.targetPos = targetPos;
    
    const distance = Math.sqrt(
      Math.pow(targetPos.x - grapplerPos.x, 2) +
      Math.pow(targetPos.y - grapplerPos.y, 2)
    );
    
    const ropeLength = Math.min(distance * 1.2, maxLength); // Add some slack
    this.chain = KinematicSolver.createRope(grapplerPos, ropeLength, 8, 0.5);
  }
  
  update(newGrapplerPos: Vec2, newTargetPos: Vec2): void {
    // Update anchor points
    this.chain.nodes[0].position = { ...newGrapplerPos };
    this.chain.nodes[0].pinned = true;
    this.chain.nodes[this.chain.nodes.length - 1].position = { ...newTargetPos };
    this.chain.nodes[this.chain.nodes.length - 1].pinned = true;
    
    // Update physics
    KinematicSolver.updateChain(this.chain);
  }
  
  getRopePoints(): Vec2[] {
    return this.chain.nodes.map(n => n.position);
  }
  
  isTaut(): boolean {
    return KinematicSolver.getRopeTension(this.chain) > 0.98;
  }
  
  applyPull(force: number): void {
    // Apply force toward grappler
    const lastNode = this.chain.nodes.length - 1;
    const dx = this.chain.nodes[0].position.x - this.chain.nodes[lastNode].position.x;
    const dy = this.chain.nodes[0].position.y - this.chain.nodes[lastNode].position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      KinematicSolver.applyForceToChain(
        this.chain,
        lastNode,
        { x: (dx / dist) * force, y: (dy / dist) * force }
      );
    }
  }
}