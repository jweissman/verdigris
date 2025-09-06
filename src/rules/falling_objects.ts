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
            const targets = units.filter(u => {
              if (u.id === unit.id || u.hp <= 0) return false;
              const dx = Math.abs(u.pos.x - unit.pos.x);
              const dy = Math.abs(u.pos.y - unit.pos.y);
              return dx <= unit.meta.radius && dy <= unit.meta.radius;
            });
            
            for (const target of targets) {
              commands.push({
                type: "damage",
                params: {
                  targetId: target.id,
                  amount: unit.meta.damage,
                  source: unit.meta.sourceId,
                  aspect: "physical"
                }
              });
            }
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