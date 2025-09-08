import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";

/**
 * Simple rule to make objects with falling=true fall down
 */
export class FallingObjects extends Rule {
  execute(context: TickContext): any[] {
    const commands: any[] = [];
    const units = context.getAllUnits();
    
    for (const unit of units) {
      if (unit.meta?.falling && unit.meta?.z > 0) {
        const fallSpeed = unit.meta.fallSpeed || 3;
        const newZ = Math.max(0, unit.meta.z - fallSpeed);
        
        // Update z position
        commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              ...unit.meta,
              z: newZ
            }
          }
        });
        
        // When rock hits ground
        if (newZ === 0) {
          // Stop falling
          commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                ...unit.meta,
                z: 0,
                falling: false
              }
            }
          });
          
          // Deal damage if this is a damaging rock
          if (unit.meta.damage && unit.meta.radius) {
            // Use aoe command like jump does
            commands.push({
              type: "aoe",
              unitId: unit.meta.sourceId,
              params: {
                x: unit.pos.x,
                y: unit.pos.y,
                radius: unit.meta.radius,
                damage: unit.meta.damage,
                type: "physical",
                friendlyFire: false,
                excludeSource: true
              }
            });
            
            // Create impact particles
            for (let i = 0; i < 12; i++) {
              const angle = (i / 12) * Math.PI * 2;
              commands.push({
                type: "particle",
                params: {
                  pos: {
                    x: unit.pos.x * 8 + 4,
                    y: unit.pos.y * 8 + 4
                  },
                  vel: {
                    x: Math.cos(angle) * 3,
                    y: Math.sin(angle) * 3
                  },
                  lifetime: 20,
                  type: "debris",
                  color: "#808080",
                  radius: 1.5,
                  z: 2
                }
              });
            }
            
            // Screen shake for impact
            commands.push({
              type: "screenshake",
              params: {
                intensity: 5,
                duration: 10
              }
            });
          }
          
          // Remove the rock after impact
          if (unit.type === "effect") {
            commands.push({
              type: "remove",
              params: {
                unitId: unit.id
              }
            });
          }
        }
      }
    }
    
    return commands;
  }
}