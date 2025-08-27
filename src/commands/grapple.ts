import { Command, CommandParams } from "../rules/command";

/**
 * Grapple command - fires grappling hook or updates grapple state
 * Params for firing:
 *   x: number - Target X position (can also use targetX)
 *   y: number - Target Y position (can also use targetY)
 * Params for hit state:
 *   operation: 'hit' - Mark unit as grappled
 *   unitId: string - Unit that was hit
 *   grapplerID: string - Unit that fired the grapple
 *   origin: {x, y} - Origin point of grapple
 * Params for release:
 *   operation: 'release' - Release grapple
 *   unitId: string - Unit to release
 */
export class Grapple extends Command {
  name = "grapple";
  description = "Fire grappling hook at target position or enemy";
  usage = "grapple <x> <y> - Fire grappling hook at position (x, y)";

  execute(unitId: string | null, params: CommandParams): void {
    // Handle grapple state operations
    const operation = params.operation as string | undefined;
    if (operation === 'hit' || operation === 'release') {
      return this.updateGrappleState(params);
    }
    
    // Default: fire grappling hook
    const targetX = (params.x ?? params.targetX) as number;
    const targetY = (params.y ?? params.targetY) as number;

    if (targetX === undefined || targetY === undefined) {
      console.error("Grapple command requires x and y coordinates");
      throw new Error("Grapple command requires x and y coordinates");
    }
    const grapplerID = unitId;

    if (
      typeof targetX !== "number" ||
      typeof targetY !== "number" ||
      isNaN(targetX) ||
      isNaN(targetY)
    ) {
      console.error("Invalid coordinates for grapple command");
      return;
    }

    let grappler = this.sim.units.find((u) => u.id === grapplerID);

    if (!grappler) {
      grappler = this.sim.units.find(
        (u) =>
          u.team === "friendly" && u.tags?.includes("grappler") && u.hp > 0,
      );
    }

    if (!grappler) {
      console.error("No available grappler found for grapple command");
      return;
    }

    if (!grappler.abilities || !grappler.abilities.includes("grapplingHook")) {
      console.error(`${grappler.id} does not have grappling hook ability`);
      return;
    }

    const distance = Math.sqrt(
      Math.pow(targetX - grappler.pos.x, 2) +
        Math.pow(targetY - grappler.pos.y, 2),
    );

    const maxRange = 8; // Default range for grappling hook
    if (distance > maxRange) {
      return;
    }

    if (unitId !== grapplerID) {
      const lastUsed = grappler.lastAbilityTick?.grapplingHook || 0;
      const cooldown = 30; // Default cooldown for grappling hook from abilities.json
      const ticksSinceLastUse = this.sim.ticks - lastUsed;

      if (ticksSinceLastUse < cooldown) {
        const remainingCooldown = cooldown - ticksSinceLastUse;
        console.error(
          `Grappling hook is on cooldown for ${remainingCooldown} more ticks`,
        );
        return;
      }
    }

    const targetPos = { x: targetX, y: targetY };

    const dx = targetPos.x - grappler.pos.x;
    const dy = targetPos.y - grappler.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 2;
    const vel = {
      x: (dx / dist) * speed,
      y: (dy / dist) * speed,
    };

    const projectile = {
      id: `grapple_${grappler.id}_${this.sim.ticks}`,
      pos: { ...grappler.pos },
      vel,
      radius: 1.5, // Larger radius to ensure collision detection with fast movement
      damage: 0,
      team: grappler.team,
      type: "grapple" as const,
      sourceId: grappler.id,
      target: targetPos,
    };
    
    this.sim.invalidateProjectilesCache();
    this.sim.projectileArrays.addProjectile(projectile);

    this.sim.queuedCommands.push({
      type: "meta",
      params: {
        unitId: grappler.id,
        meta: {
          lastAbilityTick: {
            ...grappler.lastAbilityTick,
            grapplingHook: this.sim.ticks,
          },
        },
      },
    });
  }
  
  private updateGrappleState(params: CommandParams): void {
    const targetId = params.unitId as string;
    if (!targetId) {
      return;
    }
    
    const transform = this.sim.getTransform();
    const operation = params.operation as string;
    
    if (operation === 'hit') {
      const meta: any = {
        grappleHit: true,
        grapplerID: params.grapplerID as string,
        grappleOrigin: params.origin as {x: number, y: number}
      };
      transform.updateUnit(targetId, { meta });
    } else if (operation === 'release') {
      const meta: any = {
        grappleHit: false,
        grapplerID: null,
        grappleOrigin: null
      };
      transform.updateUnit(targetId, { meta });
    }
  }
}
