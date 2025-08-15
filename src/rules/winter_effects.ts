import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";
import type { TickContext } from "../core/tick_context";

export class WinterEffects extends Rule {
  execute(context: TickContext): void {
    // Add snowfall particles
    this.addSnowfall(context);
    
    // Update particle physics and handle collisions
    this.updateParticles(context);
    
    // Process cold temperature effects on units
    this.processColdEffects(context);
    
    // Handle frozen units
    this.handleFrozenUnits(context);
  }

  private addSnowfall(context: TickContext): void {
    // Add snowflakes as particles periodically
    if (context.getCurrentTick() % 5 === 0) { // Less frequent for cleaner effect
      for (let i = 0; i < 3; i++) { // More snowflakes for better hit chance
        // Focus snowfall around units - bias toward center 20x20 area
        let x: number;
        if (context.getRandom() < 0.7) {
          // 70% chance to fall in center area where units usually are
          x = 5 + Math.floor(context.getRandom() * 20); // x range 5-25
        } else {
          // 30% chance anywhere on field
          x = Math.floor(context.getRandom() * context.getFieldWidth());
        }
        const y = 0; // Start at top
        
        context.queueEvent({
          kind: 'particle',
          source: 'winter',
          meta: {
            pos: { x, y },
            vel: { x: 0, y: 0.15 }, // Pure vertical fall, slower
            radius: 0.25, // Truly single pixel
            lifetime: 200, // Shorter lifetime but more focused
            color: '#FFFFFF',
            z: 5,
            type: 'snow',
            landed: false,
            targetCell: { x: Math.floor(x), y: context.getFieldHeight() - 1 } // Track exact landing cell
          }
        });
      }
    }
  }

  private updateParticles(context: TickContext): void {
    // Update particle positions and handle collisions
    // NOTE: Need access to particles through context - for now skip
    // TODO: Add getParticles() to TickContext or handle via events
    return; /* particles.forEach(particle => {
      if (particle.type === 'snow' && !particle.landed) {
        // Update position
        particle.pos.y += particle.vel.y;
        
        // Check if snowflake hits the ground
        if (particle.pos.y >= this.sim.fieldHeight - 1) {
          particle.landed = true;
          particle.vel.y = 0;
          particle.pos.y = this.sim.fieldHeight - 1;
        }
        
        // Check collision with units (freeze them!)
        const cellX = Math.floor(particle.pos.x);
        const cellY = Math.floor(particle.pos.y);
        
        // More generous collision detection - check units within 1 cell distance
        const unitsInCell = context.getAllUnits().filter(unit => 
          Math.abs(Math.floor(unit.pos.x) - cellX) <= 1 && 
          Math.abs(Math.floor(unit.pos.y) - cellY) <= 1 &&
          unit.hp > 0
        );
        
        unitsInCell.forEach(unit => {
          if (!unit.meta.frozen && !unit.meta.recentlySnowed) {
            // Queue freeze command
            context.queueCommand({
              type: 'meta',
              params: {
                unitId: unit.id,
                meta: {
                  frozen: true,
                  frozenDuration: 60, // Longer freeze duration (7.5 seconds at 8fps)
                  brittle: true,
                  recentlySnowed: true, // Prevent multiple snowflakes from hitting same unit
                  snowFrozen: true // Mark as snow-frozen to prevent immediate thawing
                }
              }
            });
            
            // Create freeze impact particles for visual feedback
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              context.queueEvent({
                kind: 'particle',
                source: 'winter',
                meta: {
                pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
                vel: { 
                  x: Math.cos(angle) * 0.5, 
                  y: Math.sin(angle) * 0.5 
                },
                radius: 1,
                color: '#AADDFF', // Ice blue
                lifetime: 20,
                type: 'freeze_impact'
                }
              });
            }
            
            // Remove the snowflake on impact
            particle.lifetime = 0;
          }
        });
      }
      
      // Clean up recently snowed flag
      if (particle.type === 'snow') {
        context.getAllUnits().forEach(unit => {
          if (unit.meta.recentlySnowed) {
            context.queueCommand({
              type: 'meta',
              params: {
                unitId: unit.id,
                meta: { recentlySnowed: false }
              }
            });
          }
        });
      }
    }); */
  }

  private processColdEffects(context: TickContext): void {
    context.getAllUnits().forEach(unit => {
      // Get temperature at unit's position
      // TODO: Need temperature field access through context
      const temp = 20; // Default temperature for now
      
      // Apply cold effects based on temperature
      if (temp <= 0) { // Freezing point
        this.applyFreezingEffects(context, unit);
      } else if (temp <= 5) { // Very cold
        this.applyChillEffects(context, unit);
      }
    });
  }

  private applyFreezingEffects(context: TickContext, unit: Unit): void {
    // Units at 0°C or below become frozen
    if (!unit.meta.frozen) {
      // Queue freeze command
      context.queueCommand({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            frozen: true,
            frozenDuration: 40, // ~5 seconds at 8fps
            brittle: true, // Frozen units are brittle - take extra damage
            stunned: true // Stunned immediately
          }
        }
      });
      
      // Also queue halt command to stop movement
      context.queueCommand({
        type: 'halt',
        params: { unitId: unit.id }
      });
    }
  }

  private applyChillEffects(context: TickContext, unit: Unit): void {
    // Units in cold (but not freezing) temperatures get chilled
    const statusEffects = unit.meta.statusEffects || [];
    
    const existingChill = statusEffects.find(effect => effect.type === 'chill');
    if (!existingChill) {
      // Queue status effect command
      context.queueCommand({
        type: 'applyStatusEffect',
        params: {
          unitId: unit.id,
          effect: {
            type: 'chill',
            duration: 20,
            intensity: 0.3, // 30% movement reduction in cold
            source: 'winter'
          }
        }
      });
    }
  }

  private handleFrozenUnits(context: TickContext): void {
    context.getAllUnits().forEach(unit => {
      if (unit.meta.frozen) {
        const frozenDuration = (unit.meta.frozenDuration || 0) - 1;
        
        // Queue updates for frozen state
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: { 
              frozenDuration,
              stunned: true
            }
          }
        });
        
        // Queue halt command to stop movement
        context.queueCommand({
          type: 'halt',
          params: { unitId: unit.id }
        });
        
        // Check if thawing - snow-frozen units need more time or higher temperature
        // TODO: Need temperature field access through context
        const temp = 20; // Default temperature for now
        const thawThreshold = unit.meta.snowFrozen ? 20 : 0; // Snow-frozen units need much warmer temps to thaw
        if (temp > thawThreshold || frozenDuration <= 0) {
          // Queue thaw command
          context.queueCommand({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: {
                frozen: false,
                brittle: false,
                stunned: false,
                snowFrozen: false,
                frozenDuration: undefined
              }
            }
          });
        }
      }
    });
  }

  // Helper method to create winter weather
  static createWinterStorm(context: TickContext): void {
    // Lower temperature across the field - make it much colder
    // TODO: Need temperature field modification through context
    // For now, queue a global temperature command
    context.queueCommand({
      type: 'temperature',
      params: {
        amount: -35 // Drop by 35 degrees globally
      }
    });
  }

  static endWinterStorm(context: TickContext): void {
    // Gradually warm up the field
    // TODO: Need temperature field modification through context
    context.queueCommand({
      type: 'temperature',
      params: {
        amount: 10 // Warm by 10 degrees globally
      }
    });
  }
}