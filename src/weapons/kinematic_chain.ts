import { Vec2 } from "../types/Vec2";

export interface ChainLink {
  pos: Vec2;
  oldPos: Vec2;
  pinned: boolean;
}

export class KinematicChain {
  private links: ChainLink[] = [];
  private linkLength: number = 6; // Link length in pixels
  private gravity: Vec2 = { x: 0, y: 0.5 }; // Gravity for ball only
  private damping: number = 0.99; // Very high damping - almost no movement unless thrown
  private iterations: number = 10; // Constraint iterations
  private ballMass: number = 10; // Very heavy ball
  private linkMass: number = 0.1; // Very light chain links
  private restLength: number = 24; // Maximum extension of chain (4 links * 6 pixels)
  
  constructor(
    startPos: Vec2,
    linkCount: number = 4, // Shorter chain
    ballRadius: number = 4
  ) {
    // Create chain links hanging down initially, compressed
    for (let i = 0; i < linkCount; i++) {
      this.links.push({
        pos: { 
          x: startPos.x, 
          y: startPos.y + i * 2 // Start compressed
        },
        oldPos: { 
          x: startPos.x, 
          y: startPos.y + i * 2 
        },
        pinned: i === 0 // First link is pinned to hero's hand
      });
    }
  }
  
  // Attach the chain to a position (hero's hand)
  setAnchorPosition(pos: Vec2): void {
    if (this.links.length > 0) {
      this.links[0].pos = { ...pos };
      this.links[0].oldPos = { ...pos };
    }
  }
  
  // Apply force to the ball (for swinging)
  applyForce(force: Vec2): void {
    const lastLink = this.links[this.links.length - 1];
    if (lastLink && !lastLink.pinned) {
      // Apply force by modifying velocity (pos - oldPos)
      // Only apply if force is significant (actual attack)
      if (Math.abs(force.x) > 1 || Math.abs(force.y) > 1) {
        lastLink.pos.x += force.x;
        lastLink.pos.y += force.y;
      }
    }
  }
  
  update(deltaTime: number = 1): void {
    // Only update if there's actual movement
    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];
      if (!link.pinned) {
        const velX = (link.pos.x - link.oldPos.x) * this.damping;
        const velY = (link.pos.y - link.oldPos.y) * this.damping;
        
        // Only apply gravity to the ball (last link) and only if it's moving
        const isMoving = Math.abs(velX) > 0.1 || Math.abs(velY) > 0.1;
        const isBall = i === this.links.length - 1;
        
        link.oldPos.x = link.pos.x;
        link.oldPos.y = link.pos.y;
        
        if (isMoving) {
          link.pos.x += velX;
          link.pos.y += velY;
          
          // Only add gravity to ball when it's actually in motion
          if (isBall && Math.abs(velY) > 0.5) {
            link.pos.y += this.gravity.y * deltaTime * deltaTime;
          }
        } else {
          // Force to rest position if not moving
          if (isBall) {
            // Ball should hang straight down when at rest
            const anchorX = this.links[0].pos.x;
            const anchorY = this.links[0].pos.y;
            link.pos.x = anchorX;
            link.pos.y = anchorY + this.restLength;
            link.oldPos.x = link.pos.x;
            link.oldPos.y = link.pos.y;
          }
        }
      }
    }
    
    // Apply constraints multiple times for stability
    for (let i = 0; i < this.iterations; i++) {
      this.applyConstraints();
    }
  }
  
  private applyConstraints(): void {
    // Distance constraints between links
    for (let i = 0; i < this.links.length - 1; i++) {
      const linkA = this.links[i];
      const linkB = this.links[i + 1];
      
      const dx = linkB.pos.x - linkA.pos.x;
      const dy = linkB.pos.y - linkA.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        const diff = (this.linkLength - dist) / dist;
        const offsetX = dx * diff * 0.5;
        const offsetY = dy * diff * 0.5;
        
        if (!linkA.pinned) {
          linkA.pos.x -= offsetX;
          linkA.pos.y -= offsetY;
        }
        if (!linkB.pinned) {
          linkB.pos.x += offsetX;
          linkB.pos.y += offsetY;
        }
      }
    }
  }
  
  // Get the position of the ball (last link)
  getBallPosition(): Vec2 | null {
    if (this.links.length > 0) {
      return { ...this.links[this.links.length - 1].pos };
    }
    return null;
  }
  
  // Get all link positions for rendering the chain
  getLinkPositions(): Vec2[] {
    return this.links.map(link => ({ ...link.pos }));
  }
  
  // Check if ball collides with a position
  checkBallCollision(pos: Vec2, radius: number = 8): boolean {
    const ballPos = this.getBallPosition();
    if (!ballPos) return false;
    
    const dx = ballPos.x - pos.x;
    const dy = ballPos.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    return dist < radius + 4; // Ball radius is 4
  }
  
  // Get ball velocity for damage calculation
  getBallVelocity(): Vec2 {
    if (this.links.length > 0) {
      const ball = this.links[this.links.length - 1];
      return {
        x: ball.pos.x - ball.oldPos.x,
        y: ball.pos.y - ball.oldPos.y
      };
    }
    return { x: 0, y: 0 };
  }
}