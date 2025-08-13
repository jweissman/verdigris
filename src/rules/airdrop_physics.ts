import { Rule } from "./rule";

export class AirdropPhysics extends Rule {
  apply = (): void => {
    // Handle units that are currently dropping from the sky
    this.sim.units.forEach(unit => {
      if (unit.meta?.dropping && unit.meta?.z > 0) {
        // Unit is falling - update altitude
        const newZ = unit.meta.z - (unit.meta.dropSpeed || 0.5);
        
        // Add falling sound/visual effects
        if (this.sim.ticks % 3 === 0) {
          // Create whistling wind particles
          this.sim.particles.push({
            pos: { 
              x: unit.pos.x + (this.rng.random() - 0.5) * 2, 
              y: unit.pos.y + (this.rng.random() - 0.5) * 2 
            },
            vel: { x: (this.rng.random() - 0.5) * 0.4, y: 0.8 },
            radius: 0.5,
            lifetime: 15,
            color: '#AAAAAA',
            z: unit.meta.z + 1,
            type: 'debris',
            landed: false
          });
        }
        
        // Check if unit has landed
        if (newZ <= 0) {
          // Landing - set z to 0 and handle impact
          this.handleLanding(unit);
        } else {
          // Still falling - update altitude
          this.sim.queuedCommands.push({
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
  
  private handleLanding(unit: any): void {
    // Queue landing update - clear all drop-related metadata
    this.sim.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: unit.id,
        meta: {
          z: 0,
          dropping: false,
          landingImpact: undefined,
          dropSpeed: undefined,
          landingInvulnerability: 10 // 1.25 seconds of invulnerability after landing
        }
      }
    });
    
    // Create landing impact damage to nearby enemies
    if (unit.meta.landingImpact) {
      const impactRadius = unit.meta.huge ? 8 : 4; // Larger impact for huge units
      const impactDamage = unit.meta.huge ? 25 : 15;
      
      this.sim.queuedEvents.push({
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
      const distance = 2 + this.rng.random() * 3;
      
      this.sim.particles.push({
        pos: { 
          x: unit.pos.x + Math.cos(angle) * distance,
          y: unit.pos.y + Math.sin(angle) * distance
        },
        vel: { 
          x: Math.cos(angle) * 0.8, 
          y: Math.sin(angle) * 0.8 
        },
        radius: 1 + this.rng.random(),
        lifetime: 30 + this.rng.random() * 20,
        color: '#8B4513', // Brown dust
        z: 0,
        type: 'debris',
        landed: false
      });
    }
    
    // Landing flags are removed by the meta command above
  }
}