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

    const sourceUnit = unitId
      ? this.sim.units.find((u) => u.id === unitId)
      : null;
    const isHealing = type === "heal";
    const isEmp = type === "emp";
    const isChill = type === "chill";

    const affectedUnits = this.sim.units.filter((unit) => {
      const dx = unit.pos.x - center.x;
      const dy = unit.pos.y - center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const inRange = distance <= radius;

      if (!inRange) return false;
      if (excludeSource && unit.id === unitId) return false;

      if (isHealing) {
        return (
          sourceUnit && unit.team === sourceUnit.team && unit.hp < unit.maxHp
        );
      } else if (!friendlyFire && sourceUnit && !isEmp) {
        // EMP should affect all units in range (except source if excludeSource)
        return unit.team !== sourceUnit.team;
      }
      return true;
    });

    for (const unit of affectedUnits) {
      const dx = unit.pos.x - center.x;
      const dy = unit.pos.y - center.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Handle force/toss based on mass difference
      if (params.force && sourceUnit) {
        const massDiff = (sourceUnit.mass || 1) - (unit.mass || 1);
        if (massDiff >= 3 && distance > 0) {
          const direction = { x: dx / distance, y: dy / distance };
          this.sim.queuedCommands.push({
            type: "toss",
            unitId: unit.id,
            params: {
              direction: direction,
              force: params.force as number,
              distance: Math.min(3, (params.force as number) / 2),
            },
          });
        }
      }

      if (isEmp) {
        this.sim.queuedCommands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              stunned: true,
              stunDuration: stunDuration || 20,
            },
          },
        });
      } else if (isChill) {
        this.sim.queuedCommands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              chilled: true,
              chillIntensity: 0.5,
              chillDuration: params.duration || 30,
            },
          },
        });
      } else if (isHealing) {
        this.sim.queuedCommands.push({
          type: "heal",
          params: {
            targetId: unit.id,
            amount: damage,
          },
        });
      } else {
        const damageMultiplier = falloff
          ? Math.max(0.3, 1 - (distance / radius) * 0.5)
          : 1;
        const finalDamage = Math.floor(damage * damageMultiplier);

        if (finalDamage > 0) {
          this.sim.queuedCommands.push({
            type: "damage",
            params: {
              targetId: unit.id,
              amount: finalDamage,
              aspect: type,
              sourceId: unitId,
              origin: center,
            },
          });
        }
      }
    }

    // Generate zones for visualization (like strike command)
    const zones = [];
    for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
      for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          zones.push({
            x: Math.round(center.x + dx),
            y: Math.round(center.y + dy)
          });
        }
      }
    }

    const eventMeta: any = {
      aspect: type,
      amount: damage,
      radius: radius,
      origin: center,
      zones: zones, // Add zones for rendering
      duration: 30, // Visual duration
      tick: this.sim.ticks,
    };

    if (isEmp && stunDuration) {
      eventMeta.stunDuration = stunDuration;
    }

    this.sim.queuedEvents.push({
      kind: "aoe",
      source: unitId,
      target: center,
      meta: eventMeta,
    });
  }
}
