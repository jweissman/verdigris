import { Rule } from "./rule";

export class AirdropPhysics extends Rule {
  apply = (): void => {
    // Handle units that are currently dropping from the sky
    this.sim.units.forEach(unit => {
      if (unit.meta.dropping && unit.meta.z > 0) {
        // Unit is falling - update altitude
        unit.meta.z -= unit.meta.dropSpeed || 0.5;
        
        // Add falling sound/visual effects
        if (this.sim.ticks % 3 === 0) {
          // Create whistling wind particles
          this.sim.particles.push({
            pos: { 
              x: unit.pos.x + (Math.random() - 0.5) * 2, 
              y: unit.pos.y + (Math.random() - 0.5) * 2 
            },
            vel: { x: (Math.random() - 0.5) * 0.4, y: 0.8 },
            radius: 0.5,
            lifetime: 15,
            color: '#AAAAAA',
            z: unit.meta.z + 1,
            type: 'debris',
            landed: false
          });
        }
        
        // Check if unit has landed
        if (unit.meta.z <= 0) {
          this.handleLanding(unit);
        }
      }
    });
  }
  
  private handleLanding(unit: any): void {
    // console.log(`💥 ${unit.id} lands with tremendous impact!`);
    
    // Set unit on ground
    unit.meta.z = 0;
    unit.meta.dropping = false;
    
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
      
      // console.log(`🌋 Landing creates ${impactRadius}-cell impact zone dealing ${impactDamage} damage`);
    }
    
    // Create dust cloud particle effects
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const distance = 2 + Math.random() * 3;
      
      this.sim.particles.push({
        pos: { 
          x: unit.pos.x + Math.cos(angle) * distance,
          y: unit.pos.y + Math.sin(angle) * distance
        },
        vel: { 
          x: Math.cos(angle) * 0.8, 
          y: Math.sin(angle) * 0.8 
        },
        radius: 1 + Math.random(),
        lifetime: 30 + Math.random() * 20,
        color: '#8B4513', // Brown dust
        z: 0,
        type: 'debris',
        landed: false
      });
    }
    
    // Screen shake effect (if implemented)
    if (unit.meta.huge) {
      // TODO: Add screen shake for massive units
      // console.log('📳 Ground shakes from massive impact!');
    }
    
    // Remove landing flags
    delete unit.meta.landingImpact;
    delete unit.meta.dropSpeed;
    
    // Add temporary invulnerability after landing (dramatic effect)
    unit.meta.landingInvulnerability = 10; // 1.25 seconds
  }
}