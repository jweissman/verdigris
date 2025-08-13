import { Rule } from "./rule";
import { Unit, Vec2 } from "../types/";

interface GrappleLine {
  grapplerID: string;
  targetID: string;
  startPos: Vec2;
  endPos: Vec2;
}

/**
 * Rope Climbing Mechanics
 * Allows units with canClimbGrapples to move along existing grapple lines
 */
export class RopeClimbing extends Rule {
  apply = () => {
    // Find all units that can climb grapples
    // Use units array for filtering, but we'll use roster for updates
    const climbers = this.sim.units.filter(u => 
      u.meta.canClimbGrapples && !u.meta.climbingLine
    );
    
    // Find all active grapple lines (stored as particles with type 'grapple_line')
    const grappleLineParticles = this.sim.particles.filter(p => 
      p.type === 'grapple_line'
    );
    
    if (grappleLineParticles.length === 0) return;
    
    // Group particles by their line (they're created in sequence)
    const lines = this.reconstructGrappleLines(grappleLineParticles);
    
    for (const climber of climbers) {
      // Check if climber is near a grapple line
      const nearbyLine = this.findNearbyGrappleLine(climber, lines);
      
      if (nearbyLine) {
        this.attachToGrappleLine(climber, nearbyLine);
      }
    }
    
    // Update climbers already on lines
    this.updateClimbers();
  }
  
  private reconstructGrappleLines(particles: any[]): GrappleLine[] {
    // Grapple line particles are created with consistent spacing
    // Group them into lines based on proximity
    const lines: GrappleLine[] = [];
    
    // Find units that are grappling
    const grapplers = this.sim.units.filter(u => 
      u.abilities?.grapplingHook || u.abilities?.pinTarget
    );
    
    const grappledUnits = this.sim.units.filter(u => 
      u.meta.grappled && u.meta.grappledBy
    );
    
    // Create lines from grappler-target pairs
    for (const target of grappledUnits) {
      const grappler = this.sim.units.find(u => 
        u.id === target.meta.grappledBy
      );
      
      if (grappler) {
        lines.push({
          grapplerID: grappler.id,
          targetID: target.id,
          startPos: { ...grappler.pos },
          endPos: { ...target.pos }
        });
      }
    }
    
    return lines;
  }
  
  private findNearbyGrappleLine(unit: Unit, lines: GrappleLine[]): GrappleLine | null {
    const threshold = 1.5; // Within 1.5 cells of a line
    
    for (const line of lines) {
      const distance = this.distanceToLine(unit.pos, line.startPos, line.endPos);
      
      if (distance < threshold) {
        // Don't climb your own grapple line
        if (line.grapplerID === unit.id) continue;
        
        // Check if this is an enemy's line (climb enemy lines to reach them)
        const grappler = this.sim.units.find(u => u.id === line.grapplerID);
        const target = this.sim.units.find(u => u.id === line.targetID);
        
        if (grappler && target) {
          // Can climb if the line connects enemies or if we're hunting the grappler
          const isEnemyLine = grappler.team !== unit.team || target.team !== unit.team;
          if (isEnemyLine) {
            return line;
          }
        }
      }
    }
    
    return null;
  }
  
  private distanceToLine(point: Vec2, lineStart: Vec2, lineEnd: Vec2): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  private attachToGrappleLine(unit: Unit, line: GrappleLine) {
    // Determine which end to climb toward (usually toward enemy)
    const target = this.sim.units.find(u => u.id === line.targetID);
    const climbDirection = (target && target.team !== unit.team) ? 1 : -1;
    
    // Queue metadata update to mark unit as climbing
    this.sim.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: unit.id,
        meta: {
          climbingLine: true,
          lineStart: { ...line.startPos },
          lineEnd: { ...line.endPos },
          climbProgress: 0, // 0 = at start, 1 = at end
          climbDirection
        }
      }
    });
    
    // Visual effect
    this.sim.particles.push({
      pos: { x: unit.pos.x * 8, y: unit.pos.y * 8 },
      vel: { x: 0, y: -2 },
      radius: 2,
      color: '#FFAA00',
      lifetime: 10,
      type: 'climb_attach'
    });
  }
  
  private updateClimbers() {
    const climbingUnits = this.sim.units.filter(u => u.meta.climbingLine);
    
    for (const unit of climbingUnits) {
      // Safety check for required properties
      if (!unit.meta.lineStart || !unit.meta.lineEnd) {
        this.detachFromLine(unit);
        continue;
      }
      
      // Check if line still exists
      const lineStillExists = this.checkLineExists(unit);
      
      if (!lineStillExists) {
        // Line broken, detach
        this.detachFromLine(unit);
        continue;
      }
      
      // Move along the line
      const climbSpeed = unit.meta.moveSpeed || 1.0;
      const speedMultiplier = 0.15 * climbSpeed; // Base climb speed
      
      unit.meta.climbProgress += speedMultiplier * unit.meta.climbDirection;
      
      // Update position based on progress BEFORE checking limits
      const t = Math.max(0, Math.min(1, unit.meta.climbProgress));
      const newX = unit.meta.lineStart.x + (unit.meta.lineEnd.x - unit.meta.lineStart.x) * t;
      const newY = unit.meta.lineStart.y + (unit.meta.lineEnd.y - unit.meta.lineStart.y) * t;
      
      // Queue move command to update position
      this.sim.queuedCommands.push({
        type: 'move',
        params: {
          unitId: unit.id,
          dx: newX - unit.pos.x,
          dy: newY - unit.pos.y
        }
      });
      
      // Check if reached ends
      if (unit.meta.climbProgress >= 1) {
        this.sim.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: { climbProgress: 1 }
          }
        });
        // Reached end, perform attack or action
        this.performClimbAttack(unit, unit.meta.lineEnd);
        this.detachFromLine(unit);
        continue;
      } else if (unit.meta.climbProgress <= 0) {
        this.sim.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: { climbProgress: 0 }
          }
        });
        // Reached start
        this.detachFromLine(unit);
        continue;
      }
      
      // Add climbing particles
      if (this.sim.ticks % 3 === 0) {
        this.sim.particles.push({
          pos: { x: unit.pos.x * 8, y: unit.pos.y * 8 },
          vel: { x: this.rng.random() * 2 - 1, y: this.rng.random() * 2 - 1 },
          radius: 1,
          color: '#888888',
          lifetime: 8,
          type: 'rope_dust'
        });
      }
    }
  }
  
  private checkLineExists(unit: Unit): boolean {
    // Check if the grapple line still exists by looking for grappled units
    // Don't require exact position match since units move when grappled
    const grappledUnits = this.sim.units.filter(u => 
      u.meta.grappled && 
      Math.abs(u.pos.x - unit.meta.lineEnd.x) < 3 && 
      Math.abs(u.pos.y - unit.meta.lineEnd.y) < 3
    );
    
    // Also check if grapple line particles still exist
    const lineParticles = this.sim.particles.filter(p => p.type === 'grapple_line');
    
    return grappledUnits.length > 0 || lineParticles.length > 0;
  }
  
  private detachFromLine(unit: Unit) {
    delete unit.meta.climbingLine;
    delete unit.meta.lineStart;
    delete unit.meta.lineEnd;
    delete unit.meta.climbProgress;
    delete unit.meta.climbDirection;
    
    // Landing effect
    this.sim.particles.push({
      pos: { x: unit.pos.x * 8, y: unit.pos.y * 8 },
      vel: { x: 0, y: 2 },
      radius: 3,
      color: '#CCCCCC',
      lifetime: 10,
      type: 'climb_detach'
    });
  }
  
  private performClimbAttack(unit: Unit, targetPos: Vec2) {
    // Find enemy at target position
    const enemy = this.sim.units.find(u => 
      u.team !== unit.team &&
      Math.abs(u.pos.x - targetPos.x) < 1 &&
      Math.abs(u.pos.y - targetPos.y) < 1
    );
    
    if (enemy) {
      // Queue damage event
      this.sim.queuedEvents.push({
        kind: 'damage',
        source: unit.id,
        target: enemy.id,
        meta: {
          amount: 15,
          aspect: 'assassin_strike'
        }
      });
      
      // Queue knockback
      const dx = enemy.pos.x - unit.pos.x;
      const dy = enemy.pos.y - unit.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        this.sim.queuedCommands.push({
          type: 'knockback',
          params: {
            unitId: enemy.id,
            direction: { x: dx / dist, y: dy / dist },
            force: 2
          }
        });
      }
      
      // Visual effect
      this.sim.particles.push({
        pos: { x: enemy.pos.x * 8, y: enemy.pos.y * 8 },
        vel: { x: 0, y: -3 },
        radius: 4,
        color: '#FF4444',
        lifetime: 15,
        type: 'climb_strike'
      });
      
      // Add slash effect
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        this.sim.particles.push({
          pos: { x: enemy.pos.x * 8, y: enemy.pos.y * 8 },
          vel: { x: Math.cos(angle) * 4, y: Math.sin(angle) * 4 },
          radius: 2,
          color: '#FFAAAA',
          lifetime: 10,
          type: 'slash'
        });
      }
    }
  }
}