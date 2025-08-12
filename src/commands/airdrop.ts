import { Command, CommandParams } from "../rules/command";
import Encyclopaedia from "../dmg/encyclopaedia";
import { Simulator } from "../core/simulator";
import { Transform } from "../core/transform";

/**
 * AirdropCommand - drops a unit from high altitude
 * Params:
 *   unitType: string - Type of unit to drop
 *   x?: number - X position (defaults to center)
 *   y?: number - Y position (defaults to center)
 */
export class Airdrop extends Command {
  private transform: Transform;
  
  constructor(sim: Simulator, transform: Transform) {
    super(sim);
    this.transform = transform;
  }
  execute(unitId: string | null, params: CommandParams): void {
    const unitType = params.unitType as string;
    const x = params.x as number | undefined;
    const y = params.y as number | undefined;
    
    // Determine drop position
    let dropX: number, dropY: number;
    
    if (x !== undefined && y !== undefined) {
      dropX = x;
      dropY = y;
    } else {
      // Default to center of field for dramatic effect
      dropX = Math.floor(this.sim.fieldWidth / 2);
      dropY = Math.floor(this.sim.fieldHeight / 2);
    }
    
    // Validate position is in bounds
    dropX = Math.max(0, Math.min(this.sim.fieldWidth - 1, dropX));
    dropY = Math.max(0, Math.min(this.sim.fieldHeight - 1, dropY));
    
    try {
      const unit = Encyclopaedia.unit(unitType);
      
      // Create unit at high altitude first
      const droppedUnit = { 
        ...unit, 
        team: 'friendly' as const,
        pos: { x: dropX, y: dropY },
        meta: {
          ...unit.meta,
          z: 20, // Start very high up
          dropping: true,
          dropSpeed: 0.8,
          landingImpact: true
        }
      };
      
      // Use transform if available to add unit properly
      if (this.transform) {
        this.transform.addUnit(droppedUnit);
      } else {
        // Fallback to direct add if no transform
        this.sim.addUnit(droppedUnit);
      }
      
      // Add atmospheric entry particle effects
      this.createAtmosphericEntry(dropX, dropY);
      
    } catch (error) {
      console.error(`Airdrop failed: Unknown unit type '${unitType}'`);
    }
  }
  
  private createAtmosphericEntry(x: number, y: number) {
    // Create dramatic smoke trail particles
    for (let i = 0; i < 12; i++) {
      this.sim.particles.push({
        pos: { 
          x: x + (Math.random() - 0.5) * 3, 
          y: Math.random() * 10 // Spread across upper atmosphere
        },
        vel: { x: (Math.random() - 0.5) * 0.3, y: 0.6 },
        radius: 1.5 + Math.random(),
        lifetime: 40 + Math.random() * 20,
        color: '#666666', // Dark smoke
        z: 15 + Math.random() * 5,
        type: 'debris', // Use existing fire particle renderer for smoke
        landed: false
      });
    }
    
    // Add shockwave indicator on ground
    this.sim.queuedEvents.push({
      kind: 'aoe',
      source: 'airdrop',
      target: { x, y },
      meta: {
        aspect: 'warning',
        radius: 6,
        amount: 0, // No damage yet - just visual warning
        duration: 25 // Warning lasts until landing
      }
    });
  }
}