import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

/**
 * FreezeAnimation rule - handles visual effects for frozen/stunned units
 * Creates ice crystals, blue tint effects, and immobilization visuals
 */
export class FreezeAnimation extends Rule {
  private readonly ICE_PARTICLE_INTERVAL = 5; // Spawn ice particles every N ticks
  private readonly FREEZE_SHAKE_AMPLITUDE = 0.5; // Small shake for frozen units
  
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const currentTick = context.getCurrentTick();
    
    // Process all units for freeze effects
    const allUnits = context.getAllUnits();
    
    for (const unit of allUnits) {
      // Check if unit is frozen
      const isFrozen = unit.meta?.frozen || 
                       (unit.state as string) === 'stunned' ||
                       unit.meta?.statusEffects?.some(e => e.type === 'frozen');
      
      if (isFrozen) {
        // Apply visual freeze effects
        
        // 1. Add ice crystal particles around the unit
        if (currentTick % this.ICE_PARTICLE_INTERVAL === 0) {
          for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3 + currentTick * 0.1;
            const radius = 6 + Math.sin(currentTick * 0.1) * 2;
            
            commands.push({
              type: "particle",
              params: {
                pos: {
                  x: unit.pos.x * 8 + 4 + Math.cos(angle) * radius,
                  y: unit.pos.y * 8 + 4 + Math.sin(angle) * radius,
                },
                vel: { x: 0, y: -0.2 },
                lifetime: 20,
                type: "ice",
                color: "#87CEEB", // Sky blue ice crystals
                radius: 2,
                z: 10,
              },
            });
          }
        }
        
        // 2. Add frozen shake effect
        if (!unit.meta) unit.meta = {};
        
        // Calculate shake offset
        const shakeX = Math.sin(currentTick * 0.5) * this.FREEZE_SHAKE_AMPLITUDE;
        const shakeY = Math.cos(currentTick * 0.5) * this.FREEZE_SHAKE_AMPLITUDE * 0.5;
        
        // Store visual offset in meta (renderer will use this)
        unit.meta.visualOffsetX = shakeX;
        unit.meta.visualOffsetY = shakeY;
        
        // 3. Add ice shards breaking off occasionally
        if (currentTick % 30 === 0) {
          for (let i = 0; i < 5; i++) {
            commands.push({
              type: "particle",
              params: {
                pos: {
                  x: unit.pos.x * 8 + 4 + (Math.random() - 0.5) * 8,
                  y: unit.pos.y * 8 + 4 + (Math.random() - 0.5) * 8,
                },
                vel: {
                  x: (Math.random() - 0.5) * 2,
                  y: -Math.random() * 2 - 1,
                },
                lifetime: 15,
                type: "shard",
                color: "#B0E0E6", // Powder blue shards
                radius: 1,
                z: 5,
              },
            });
          }
        }
        
        // 4. Blue tint overlay (store in meta for renderer)
        unit.meta.frozenTint = {
          color: "#4682B4", // Steel blue
          alpha: 0.3 + Math.sin(currentTick * 0.05) * 0.1, // Pulsing effect
        };
        
        // 5. Frozen duration countdown visual
        const frozenEffect = unit.meta?.statusEffects?.find(e => e.type === 'frozen');
        if (frozenEffect && frozenEffect.duration) {
          // Show remaining freeze time as ice rings
          const remainingRatio = frozenEffect.duration / (frozenEffect.initialDuration || 60);
          
          if (currentTick % 10 === 0) {
            commands.push({
              type: "particle",
              params: {
                pos: {
                  x: unit.pos.x * 8 + 4,
                  y: unit.pos.y * 8 - 4, // Above unit
                },
                vel: { x: 0, y: 0 },
                lifetime: 10,
                type: "ring",
                color: "#00BFFF", // Deep sky blue
                radius: 8 * remainingRatio,
                z: 15,
              },
            });
          }
        }
      } else {
        // Clear freeze visual effects when not frozen
        if (unit.meta) {
          delete unit.meta.visualOffsetX;
          delete unit.meta.visualOffsetY;
          delete unit.meta.frozenTint;
        }
      }
      
      // Check for units that are thawing (just unfrozen)
      if (unit.meta?.wasJustUnfrozen) {
        // Thaw burst effect
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI * 2 * i) / 10;
          commands.push({
            type: "particle",
            params: {
              pos: {
                x: unit.pos.x * 8 + 4,
                y: unit.pos.y * 8 + 4,
              },
              vel: {
                x: Math.cos(angle) * 3,
                y: Math.sin(angle) * 3,
              },
              lifetime: 20,
              type: "steam",
              color: "#F0F8FF", // Alice blue steam
              radius: 3,
              z: 8,
            },
          });
        }
        
        // Clear the flag
        delete unit.meta.wasJustUnfrozen;
      }
    }
    
    // Check temperature field for creating ambient freeze effects
    const sim = (context as any).sim;
    if (!sim) return commands;
    
    const fieldWidth = sim.fieldWidth;
    const fieldHeight = sim.fieldHeight;
    
    for (let x = 0; x < fieldWidth; x++) {
      for (let y = 0; y < fieldHeight; y++) {
        const temp = sim.fieldManager.temperatureField.get(x, y);
        
        // Create frost particles in very cold areas
        if (temp < -20 && currentTick % 20 === 0 && Math.random() < 0.3) {
          commands.push({
            type: "particle",
            params: {
              pos: {
                x: x * 8 + 4 + (Math.random() - 0.5) * 4,
                y: y * 8 + 4 + (Math.random() - 0.5) * 4,
              },
              vel: {
                x: (Math.random() - 0.5) * 0.5,
                y: -Math.random() * 0.5,
              },
              lifetime: 40,
              type: "frost",
              color: "#E0FFFF", // Light cyan frost
              radius: 0.5,
              z: 2,
            },
          });
        }
      }
    }
    
    return commands;
  }
}