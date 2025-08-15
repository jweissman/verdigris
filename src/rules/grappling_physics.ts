import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";
import { Projectile } from "../types/Projectile";
import type { TickContext } from '../core/tick_context';

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
  
  constructor() {
    super();
  }

  execute(context: TickContext): void {
    // Handle grapple projectile collisions
    this.handleGrappleCollisions(context);
    
    // Update taut lines and physics
    this.updateGrappleLines(context);
    
    // Apply pinning effects
    this.applyPinningEffects(context);
    
    // Clean up expired grapples
    this.cleanupExpiredGrapples(context);
  }

  private handleGrappleCollisions(context: TickContext) {
    // Note: TickContext doesn't expose projectiles directly, so we'll need to get them via events
    // For now, we'll skip projectile handling and focus on existing grapple states
    
    // Check for grapple collision events that might have been queued
    const allUnits = context.getAllUnits();
    
    for (const unit of allUnits) {
      if (unit.meta.grappleHit) {
        this.processGrappleHit(context, unit);
      }
    }
  }
  
  private processGrappleHit(context: TickContext, hitUnit: Unit) {

    if (hitUnit.meta.grappleHit) {
      // Create grapple line from metadata
      const grapplerID = hitUnit.meta.grapplerID || 'unknown';
      const grappler = context.findUnitById(grapplerID);
      
      // Use grapple origin if grappler not found
      const grapplerPos = grappler?.pos || hitUnit.meta.grappleOrigin || hitUnit.pos;
        
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
          duration: hitUnit.meta.pinDuration || 60
        });

        // Apply grapple effects to target
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: hitUnit.id,
            meta: {
              grappled: true,
              grappledBy: grapplerID,
              grappledDuration: hitUnit.meta.pinDuration || 60,
              tetherPoint: grapplerPos,
              grappleHit: undefined // Clear the hit flag
            }
          }
        });
        
        // Also update grappler's metadata
        if (grappler) {
          context.queueCommand({
            type: 'meta',
            params: {
              unitId: grappler.id,
              meta: {
                grapplingTarget: hitUnit.id
              }
            }
          });
        }
        
        // Check if target is segmented and damage segments
        if (hitUnit.meta.segmented) {
          // Find the first segment
          const firstSegment = context.getAllUnits().find(u => 
            u.meta.segment && u.meta.parentId === hitUnit.id && u.meta.segmentIndex === 1
          );
          
          if (firstSegment && firstSegment.hp > 0) {
            const damage = 5; // Base grapple damage to segments
            
            // Queue damage command
            context.queueCommand({
              type: 'damage',
              params: {
                targetId: firstSegment.id,
                amount: damage
              }
            });
            
            // Queue pin metadata
            context.queueCommand({
              type: 'meta',
              params: {
                unitId: firstSegment.id,
                meta: {
                  pinned: true,
                  pinDuration: 30
                }
              }
            });
          }
        }
        
        // Check if target is massive and should be pinned
        const targetMass = hitUnit.mass || 1;
        if (targetMass > 30) {
          // Massive creatures can't be pulled, only pinned
          context.queueCommand({
            type: 'meta',
            params: {
              unitId: hitUnit.id,
              meta: {
                pinned: true,
                movementPenalty: 1.0 // 100% movement reduction
              }
            }
          });
        } else {
          // Regular creatures are slowed
          context.queueCommand({
            type: 'meta',
            params: {
              unitId: hitUnit.id,
              meta: {
                movementPenalty: 0.5 // 50% slower
              }
            }
          });
        }
      }
    }
  }

  private updateGrappleLines(context: TickContext) {
    for (const [lineID, grappleLine] of this.grappleLines.entries()) {
      const grappler = context.findUnitById(grappleLine.grapplerID);
      const target = context.findUnitById(grappleLine.targetID);

      // If either unit is dead, remove grapple
      if (!grappler || !target || grappler.hp <= 0 || target.hp <= 0) {
        this.removeGrappleLine(context, lineID);
        continue;
      }

      // Update line positions
      grappleLine.startPos = { ...grappler.pos };
      grappleLine.endPos = { ...target.pos };
      
      const currentDistance = this.calculateDistance(grappler.pos, target.pos);
      const maxDistance = grappleLine.length + 2; // Allow some slack
      const releaseDistance = 0.5; // Release when dragged very close (within 0.5 cells)
      
      // Check if target has been dragged close enough to release
      if (currentDistance < releaseDistance) {
        // Release the grapple
        this.grappleLines.delete(lineID);
        
        // Clear grapple effects from target
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: target.id,
            meta: {
              grappled: false,
              grappledBy: undefined,
              grappledDuration: 0,
              tetherPoint: undefined,
              movementPenalty: 0,
              pinned: false
            }
          }
        });
        
        continue; // Skip to next grapple line
      }
      
      // Check if line is taut
      grappleLine.taut = currentDistance >= grappleLine.length;
      
      // Apply movement penalties based on mass
      const targetMass = target.mass || 1;
      if (targetMass > 30) {
        // Massive creatures are ALWAYS pinned when grappled
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: target.id,
            meta: {
              pinned: true,
              movementPenalty: 1.0
            }
          }
        });
      } else {
        // Regular creatures are slowed
        if (!target.meta.movementPenalty) {
          context.queueCommand({
            type: 'meta',
            params: {
              unitId: target.id,
              meta: {
                movementPenalty: 0.5
              }
            }
          });
        }
      }
      
      // Apply taut effects if line is stretched
      if (grappleLine.taut && currentDistance > releaseDistance) {
        this.applyTautEffects(context, grappler, target, grappleLine);
      }

      // Decrement duration
      grappleLine.duration--;
      if (target.meta.grappledDuration) {
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: target.id,
            meta: {
              grappledDuration: (target.meta.grappledDuration || 1) - 1
            }
          }
        });
      }
    }

    // Create visual particles for grapple lines
    this.renderGrappleLines(context);
  }

  private applyTautEffects(context: TickContext, grappler: Unit, target: Unit, _grappleLine: GrappleLine) {
    // Queue a pull command to handle the physics
    context.queueCommand({
      type: 'pull',
      params: {
        grapplerId: grappler.id,
        targetId: target.id,
        force: 0.3
      }
    });
    
    // Mark massive units as pinned
    const targetMass = target.mass || 1;
    if (targetMass > 30 && !target.meta.pinned) {
      context.queueCommand({
        type: 'meta',
        params: {
          unitId: target.id,
          meta: {
            pinned: true,
            movementPenalty: 1.0
          }
        }
      });
    }
  }

  private applyPinningEffects(context: TickContext) {
    for (const unit of context.getAllUnits()) {
      // Skip if no meta
      if (!unit.meta) continue;
      
      // Handle grappled units
      if (unit.meta.grappled && unit.meta.grappledDuration > 0) {
        // Apply movement penalty
        if (unit.meta.movementPenalty) {
          unit.intendedMove.x *= (1 - unit.meta.movementPenalty);
          unit.intendedMove.y *= (1 - unit.meta.movementPenalty);
        }
      } else if (unit.meta.grappled && unit.meta.grappledDuration <= 0) {
        // Grapple expired - but don't remove pinned status for massive units
        const wasPinned = unit.meta.pinned;
        this.removeGrappleFromUnit(unit);
        if (wasPinned && (unit.mass || 1) > 30) {
          // Restore pinned for massive units as it's a separate status
          context.queueCommand({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: { pinned: true }
            }
          });
        }
      }

      // Handle fully pinned units
      if (unit.meta.pinned && unit.meta.pinDuration > 0) {
        // Queue stun and halt commands
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: { 
              stunned: true,
              pinDuration: unit.meta.pinDuration - 1
            }
          }
        });
        context.queueCommand({
          type: 'halt',
          params: { unitId: unit.id }
        });
      } else if (unit.meta.pinned && !unit.meta.pinDuration) {
        // Massive units that are grappled stay pinned (no duration needed)
        if ((unit.mass || 1) > 30 && unit.meta.grappled) {
          context.queueCommand({
            type: 'halt',
            params: { unitId: unit.id }
          });
        } else {
          // Pin expired for non-massive units
          this.removePinFromUnit(unit);
        }
      }
    }
  }

  private cleanupExpiredGrapples(context: TickContext) {
    const expiredLines: string[] = [];
    
    for (const [lineID, grappleLine] of this.grappleLines.entries()) {
      if (grappleLine.duration <= 0) {
        expiredLines.push(lineID);
        
        // Remove grapple effects from target
        const target = context.findUnitById(grappleLine.targetID);
        if (target) {
          this.removeGrappleFromUnit(target);
        }
      }
    }
    
    expiredLines.forEach(lineID => this.grappleLines.delete(lineID));
  }

  private renderGrappleLines(context: TickContext) {
    // Create visual particles to show grapple lines
    for (const grappleLine of this.grappleLines.values()) {
      const numSegments = Math.floor(grappleLine.length) + 2;
      
      for (let i = 1; i < numSegments; i++) {
        const t = i / numSegments;
        const x = grappleLine.startPos.x + (grappleLine.endPos.x - grappleLine.startPos.x) * t;
        const y = grappleLine.startPos.y + (grappleLine.endPos.y - grappleLine.startPos.y) * t;
        
        // Add slight sag for visual realism
        const sag = Math.sin(t * Math.PI) * (grappleLine.taut ? 0.1 : 0.3);
        
        context.queueCommand({
          type: 'particle',
          params: {
            particle: {
              pos: { x: x * 8, y: (y + sag) * 8 },
              vel: { x: 0, y: 0 },
              radius: grappleLine.taut ? 0.8 : 0.5,
              color: grappleLine.pinned ? '#DD4400' : '#AA6600', // Red when pinned, brown when grappled
              lifetime: 100, // Longer lifetime for rope climbing to work
              type: 'grapple_line'
            }
          }
        });
      }
    }
  }

  private removeGrappleLine(context: TickContext, lineID: string) {
    const grappleLine = this.grappleLines.get(lineID);
    if (grappleLine) {
      const target = context.findUnitById(grappleLine.targetID);
      if (target) {
        this.removeGrappleFromUnit(target);
      }
      this.grappleLines.delete(lineID);
    }
  }

  private removeGrappleFromUnit(unit: Unit) {
    // Clear grapple metadata directly
    if (unit.meta) {
      delete unit.meta.grappled;
      delete unit.meta.grappledBy;
      delete unit.meta.grappledDuration;
      delete unit.meta.movementPenalty;
    }
  }

  private removePinFromUnit(unit: Unit) {
    // Clear pin metadata directly
    if (unit.meta) {
      delete unit.meta.pinned;
      delete unit.meta.pinDuration;
      delete unit.meta.stunned;
    }
  }

  private calculateDistance(pos1: Vec2, pos2: Vec2): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private clampToField(context: TickContext, unit: Unit) {
    const newX = Math.max(0, Math.min(context.getFieldWidth() - 1, unit.pos.x));
    const newY = Math.max(0, Math.min(context.getFieldHeight() - 1, unit.pos.y));
    
    // Directly clamp positions for physics
    unit.pos.x = newX;
    unit.pos.y = newY;
  }
}