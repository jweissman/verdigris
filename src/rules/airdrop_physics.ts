import { Rule } from "./rule";
import type { TickContext } from '../core/tick_context';

export class AirdropPhysics extends Rule {
  constructor() {
    super();
  }
  execute(context: TickContext): void {
    // Handle units that are currently dropping from the sky
    context.getAllUnits().forEach(unit => {
      if (unit.meta.dropping && unit.meta.z > 0) {
        // Unit is falling - update altitude
        const newZ = unit.meta.z - (unit.meta.dropSpeed || 0.5);
        
        // Add falling sound/visual effects
        if (context.getCurrentTick() % 3 === 0) {
          // Create whistling wind particles
          context.queueCommand({
            type: 'particle',
            params: {
              particle: {
                pos: { 
                  x: unit.pos.x + (context.getRandom() - 0.5) * 2, 
                  y: unit.pos.y + (context.getRandom() - 0.5) * 2 
                },
                vel: { x: (context.getRandom() - 0.5) * 0.4, y: 0.8 },
                radius: 0.5,
                lifetime: 15,
                color: '#AAAAAA',
                z: unit.meta.z + 1,
                type: 'debris',
                landed: false
              }
            }
          });
        }
        
        // Check if unit has landed
        if (newZ <= 0) {
          // Landing - set z to 0 and handle impact
          this.handleLanding(context, unit);
        } else {
          // Still falling - update altitude
          context.queueCommand({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: {
                z: newZ
              }
            }
          });
        }
      }
    });
  }
  
  private handleLanding(context: TickContext, unit: any): void {
    // Check if impact damage should be applied before clearing metadata
    const shouldApplyImpact = unit.meta.landingImpact;
    
    // Queue landing update - clear all drop-related metadata
    context.queueCommand({
      type: 'meta',
      params: {
        unitId: unit.id,
        meta: {
          z: 0,
          dropping: false,
          landingImpact: false,
          dropSpeed: 0,
          landingInvulnerability: 10 // 1.25 seconds of invulnerability after landing
        }
      }
    });
    
    // Create landing impact damage to nearby enemies
    if (shouldApplyImpact) {
      const impactRadius = unit.meta.huge ? 8 : 4; // Larger impact for huge units
      const impactDamage = unit.meta.huge ? 25 : 15;
      
      context.queueEvent({
        kind: 'aoe',
        source: unit.id,
        target: unit.pos,
        meta: {
          aspect: 'kinetic',
          radius: impactRadius,
          amount: impactDamage,
          force: 8, // Strong knockback
          origin: unit.pos
        }
      });
    }
    
    // Create dust cloud particle effects
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const distance = 2 + context.getRandom() * 3;
      
      context.queueCommand({
        type: 'particle',
        params: {
          particle: {
            pos: { 
              x: unit.pos.x + Math.cos(angle) * distance,
              y: unit.pos.y + Math.sin(angle) * distance
            },
            vel: { 
              x: Math.cos(angle) * 0.8, 
              y: Math.sin(angle) * 0.8 
            },
            radius: 1 + context.getRandom(),
            lifetime: 30 + context.getRandom() * 20,
            color: '#8B4513', // Brown dust
            z: 0,
            type: 'debris',
            landed: false
          }
        }
      });
    }
    
    // Landing flags are removed by the meta command above
  }
}