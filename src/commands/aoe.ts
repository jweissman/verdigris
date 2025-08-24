import { Command, CommandParams } from "../rules/command";

/**
 * AoE (Area of Effect) command - affects units in an area
 * Params:
 *   x: number - Center X position
 *   y: number - Center Y position
 *   radius: number - Effect radius
 *   damage: number - Damage/heal amount
 *   type?: string - Damage type (defaults to 'physical')
 */
export class AoE extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const x = params.x as number;
    const y = params.y as number;
    const radius = params.radius as number;
    const damage = params.damage as number;
    const type = (params.type as string) || "physical";
    const stunDuration = params.stunDuration as number;
    const falloff = params.falloff !== false;
    const friendlyFire = params.friendlyFire === true;
    const excludeSource = params.excludeSource === true;
    

    const center = { x, y };

    if (
      typeof radius !== "number" ||
      isNaN(radius) ||
      typeof damage !== "number" ||
      isNaN(damage)
    ) {
      console.warn(`AoE command: invalid radius ${radius} or damage ${damage}`);
      return;
    }

    const sourceUnit = unitId ? this.sim.units.find(u => u.id === unitId) : null;
    const isHealing = type === "heal";
    const isEmp = type === "emp";
    const isChill = type === "chill";

    // Find affected units
    const affectedUnits = this.sim.units.filter(unit => {
      const dx = unit.pos.x - center.x;
      const dy = unit.pos.y - center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const inRange = distance <= radius;
      
      if (!inRange) return false;
      if (excludeSource && unit.id === unitId) return false;
      
      if (isHealing) {
        return sourceUnit && unit.team === sourceUnit.team && unit.hp < unit.maxHp;
      } else if (!friendlyFire && sourceUnit) {
        return unit.team !== sourceUnit.team;
      }
      return true;
    });

    // Apply effects to each unit
    for (const unit of affectedUnits) {
      const dx = unit.pos.x - center.x;
      const dy = unit.pos.y - center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (isEmp) {
        // Queue stun command
        this.sim.queuedCommands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              stunned: true,
              stunDuration: stunDuration || 20
            }
          }
        });
      } else if (isChill) {
        // Queue chill command
        this.sim.queuedCommands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              chilled: true,
              chillIntensity: 0.5,
              chillDuration: params.duration || 30
            }
          }
        });
      } else if (isHealing) {
        // Queue heal command
        this.sim.queuedCommands.push({
          type: "heal",
          params: {
            targetId: unit.id,
            amount: damage
          }
        });
      } else {
        // Calculate damage with falloff
        const damageMultiplier = falloff
          ? Math.max(0.3, 1 - (distance / radius) * 0.5)
          : 1;
        const finalDamage = Math.floor(damage * damageMultiplier);
        
        if (finalDamage > 0) {
          // Queue damage command
          this.sim.queuedCommands.push({
            type: "damage",
            params: {
              targetId: unit.id,
              amount: finalDamage,
              aspect: type,
              sourceId: unitId,
              origin: center
            }
          });
        }
      }
    }
    
    // Create event for visual feedback only
    const eventMeta: any = {
      aspect: type,
      amount: damage,
      radius: radius,
      origin: center
    };
    
    // Include stunDuration for EMP type
    if (isEmp && stunDuration) {
      eventMeta.stunDuration = stunDuration;
    }
    
    this.sim.queuedEvents.push({
      kind: "aoe",
      source: unitId,
      target: center,
      meta: eventMeta
    });
  }
}
