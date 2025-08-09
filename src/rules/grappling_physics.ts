import { Rule } from "./rule";
import { Unit, Vec2, Projectile } from "../sim/types";

interface GrappleLine {
  grapplerID: string;
  targetID: string;
  startPos: Vec2;
  endPos: Vec2;
  length: number;
  taut: boolean;
  pinned: boolean;
  duration: number;
}

export class GrapplingPhysics extends Rule {
  private grappleLines: Map<string, GrappleLine> = new Map();

  apply = () => {
    // Handle grapple projectile collisions
    this.handleGrappleCollisions();
    
    // Update taut lines and physics
    this.updateGrappleLines();
    
    // Apply pinning effects
    this.applyPinningEffects();
    
    // Clean up expired grapples
    this.cleanupExpiredGrapples();
  }

  private handleGrappleCollisions() {
    const grappleProjectiles = this.sim.projectiles.filter(p => 
      (p as any).type === 'grapple'
    );

    for (const grapple of grappleProjectiles) {
      // Check for collision with enemy units
      const hitUnit = this.sim.units.find(unit =>
        unit.team !== grapple.team &&
        Math.abs(unit.pos.x - grapple.pos.x) <= 1.0 &&
        Math.abs(unit.pos.y - grapple.pos.y) <= 1.0
      );

      if (hitUnit) {
        // Create grapple line
        const grapplerID = (grapple as any).grapplerID || 'unknown';
        const grappler = this.sim.units.find(u => u.id === grapplerID);
        
        // Use grapple origin if grappler not found
        const grapplerPos = grappler?.pos || (grapple as any).origin || grapple.pos;
        
        if (grapplerPos) {
          const lineID = `${grapplerID}_${hitUnit.id}`;
          const distance = this.calculateDistance(grapplerPos, hitUnit.pos);
          
          this.grappleLines.set(lineID, {
            grapplerID,
            targetID: hitUnit.id,
            startPos: { ...grapplerPos },
            endPos: { ...hitUnit.pos },
            length: distance,
            taut: true,
            pinned: false,
            duration: (grapple as any).pinDuration || 60
          });

          // Apply grapple effects to target
          if (!hitUnit.meta) hitUnit.meta = {};
          hitUnit.meta.grappled = true;
          hitUnit.meta.grappledBy = grapplerID;
          hitUnit.meta.grappledDuration = (grapple as any).pinDuration || 60;
          hitUnit.meta.tetherPoint = grapplerPos;
          
          // Reduce movement speed while grappled
          hitUnit.meta.movementPenalty = 0.5; // 50% slower
        }

        // Remove the projectile
        this.sim.projectiles = this.sim.projectiles.filter(p => p.id !== grapple.id);
      }
    }
  }

  private updateGrappleLines() {
    for (const [lineID, grappleLine] of this.grappleLines.entries()) {
      const grappler = this.sim.units.find(u => u.id === grappleLine.grapplerID);
      const target = this.sim.units.find(u => u.id === grappleLine.targetID);

      // If either unit is dead, remove grapple
      if (!grappler || !target || grappler.hp <= 0 || target.hp <= 0) {
        this.removeGrappleLine(lineID);
        continue;
      }

      // Update line positions
      grappleLine.startPos = { ...grappler.pos };
      grappleLine.endPos = { ...target.pos };
      
      const currentDistance = this.calculateDistance(grappler.pos, target.pos);
      const maxDistance = grappleLine.length + 2; // Allow some slack
      
      // Check if line is taut
      grappleLine.taut = currentDistance >= grappleLine.length;
      
      // If distance exceeds maximum, pull units toward each other
      if (currentDistance > maxDistance) {
        this.applyTautEffects(grappler, target, grappleLine);
      }

      // Decrement duration
      grappleLine.duration--;
      if (target.meta.grappledDuration) {
        target.meta.grappledDuration--;
      }
    }

    // Create visual particles for grapple lines
    this.renderGrappleLines();
  }

  private applyTautEffects(grappler: Unit, target: Unit, grappleLine: GrappleLine) {
    const dx = target.pos.x - grappler.pos.x;
    const dy = target.pos.y - grappler.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    // Stronger units can pull weaker ones
    const grapplerMass = grappler.mass || 1;
    const targetMass = target.mass || 1;
    const totalMass = grapplerMass + targetMass;
    
    // Calculate pull force based on mass ratio
    const grapplerPull = targetMass / totalMass * 0.3;
    const targetPull = grapplerMass / totalMass * 0.3;
    
    // Apply constraint forces (pull toward each other)
    if (target.meta.pinned) {
      // If target is pinned, only grappler moves
      grappler.pos.x += unitX * grapplerPull * 2;
      grappler.pos.y += unitY * grapplerPull * 2;
    } else {
      // Both units are pulled toward each other
      grappler.pos.x += unitX * grapplerPull;
      grappler.pos.y += unitY * grapplerPull;
      
      target.pos.x -= unitX * targetPull;
      target.pos.y -= unitY * targetPull;
    }
    
    // Clamp positions to field boundaries
    this.clampToField(grappler);
    this.clampToField(target);
  }

  private applyPinningEffects() {
    for (const unit of this.sim.units) {
      // Handle grappled units
      if (unit.meta.grappled && unit.meta.grappledDuration > 0) {
        // Apply movement penalty
        if (unit.meta.movementPenalty) {
          unit.intendedMove.x *= (1 - unit.meta.movementPenalty);
          unit.intendedMove.y *= (1 - unit.meta.movementPenalty);
        }
      } else if (unit.meta.grappled) {
        // Grapple expired
        this.removeGrappleFromUnit(unit);
      }

      // Handle fully pinned units
      if (unit.meta.pinned && unit.meta.pinDuration > 0) {
        unit.meta.stunned = true;
        unit.intendedMove = { x: 0, y: 0 };
        unit.meta.pinDuration--;
      } else if (unit.meta.pinned) {
        // Pin expired
        this.removePinFromUnit(unit);
      }
    }
  }

  private cleanupExpiredGrapples() {
    const expiredLines: string[] = [];
    
    for (const [lineID, grappleLine] of this.grappleLines.entries()) {
      if (grappleLine.duration <= 0) {
        expiredLines.push(lineID);
        
        // Remove grapple effects from target
        const target = this.sim.units.find(u => u.id === grappleLine.targetID);
        if (target) {
          this.removeGrappleFromUnit(target);
        }
      }
    }
    
    expiredLines.forEach(lineID => this.grappleLines.delete(lineID));
  }

  private renderGrappleLines() {
    // Create visual particles to show grapple lines
    for (const grappleLine of this.grappleLines.values()) {
      const numSegments = Math.floor(grappleLine.length) + 2;
      
      for (let i = 1; i < numSegments; i++) {
        const t = i / numSegments;
        const x = grappleLine.startPos.x + (grappleLine.endPos.x - grappleLine.startPos.x) * t;
        const y = grappleLine.startPos.y + (grappleLine.endPos.y - grappleLine.startPos.y) * t;
        
        // Add slight sag for visual realism
        const sag = Math.sin(t * Math.PI) * (grappleLine.taut ? 0.1 : 0.3);
        
        this.sim.particles.push({
          pos: { x: x * 8, y: (y + sag) * 8 },
          vel: { x: 0, y: 0 },
          radius: grappleLine.taut ? 0.8 : 0.5,
          color: grappleLine.pinned ? '#DD4400' : '#AA6600', // Red when pinned, brown when grappled
          lifetime: 2, // Short lifetime, constantly renewed
          type: 'grapple_line'
        });
      }
    }
  }

  private removeGrappleLine(lineID: string) {
    const grappleLine = this.grappleLines.get(lineID);
    if (grappleLine) {
      const target = this.sim.units.find(u => u.id === grappleLine.targetID);
      if (target) {
        this.removeGrappleFromUnit(target);
      }
      this.grappleLines.delete(lineID);
    }
  }

  private removeGrappleFromUnit(unit: Unit) {
    delete unit.meta.grappled;
    delete unit.meta.grappledBy;
    delete unit.meta.grappledDuration;
    delete unit.meta.movementPenalty;
  }

  private removePinFromUnit(unit: Unit) {
    delete unit.meta.pinned;
    delete unit.meta.pinDuration;
    delete unit.meta.stunned;
  }

  private calculateDistance(pos1: Vec2, pos2: Vec2): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private clampToField(unit: Unit) {
    unit.pos.x = Math.max(0, Math.min(this.sim.fieldWidth - 1, unit.pos.x));
    unit.pos.y = Math.max(0, Math.min(this.sim.fieldHeight - 1, unit.pos.y));
  }
}