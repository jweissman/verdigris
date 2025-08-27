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
    // Default to dropping a crate if no unit type specified
    const unitType = (params.unitType as string) || "crate";
    const x = params.x as number | undefined;
    const y = params.y as number | undefined;

    let dropX: number, dropY: number;

    // If called by hero without position, drop near hero
    if (x === undefined || y === undefined) {
      if (unitId) {
        const hero = this.sim.units.find(u => u.id === unitId);
        if (hero) {
          // Drop 2-3 tiles away from hero in a random direction
          const angle = Math.random() * Math.PI * 2;
          const distance = 2 + Math.random();
          dropX = hero.pos.x + Math.cos(angle) * distance;
          dropY = hero.pos.y + Math.sin(angle) * distance;
        } else {
          dropX = Math.floor(this.sim.fieldWidth / 2);
          dropY = Math.floor(this.sim.fieldHeight / 2);
        }
      } else {
        dropX = Math.floor(this.sim.fieldWidth / 2);
        dropY = Math.floor(this.sim.fieldHeight / 2);
      }
    } else {
      dropX = x;
      dropY = y;
    }

    dropX = Math.max(0, Math.min(this.sim.fieldWidth - 1, dropX));
    dropY = Math.max(0, Math.min(this.sim.fieldHeight - 1, dropY));

    try {
      const unit = Encyclopaedia.unit(unitType);

      const droppedUnit = {
        ...unit,
        team: "friendly" as const,
        pos: { x: dropX, y: dropY },
        meta: {
          ...unit.meta,
          z: 20, // Start very high up
          dropping: true,
          dropSpeed: 0.8,
          landingImpact: true,
        },
      };

      if (this.transform) {
        this.transform.addUnit(droppedUnit);
      } else {
        this.sim.addUnit(droppedUnit);
      }

      this.createAtmosphericEntry(dropX, dropY);
    } catch (error) {
      console.error(`Airdrop failed: Unknown unit type '${unitType}'`);
    }
  }

  private createAtmosphericEntry(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      this.sim.particleArrays.addParticle({
        pos: {
          x: x + (Simulator.rng.random() - 0.5) * 3,
          y: Simulator.rng.random() * 10, // Spread across upper atmosphere
        },
        vel: { x: (Simulator.rng.random() - 0.5) * 0.3, y: 0.6 },
        radius: 1.5 + Simulator.rng.random(),
        lifetime: 40 + Simulator.rng.random() * 20,
        color: "#666666", // Dark smoke
        z: 15 + Simulator.rng.random() * 5,
        type: "debris", // Use existing fire particle renderer for smoke
        landed: false,
      });
    }

    this.sim.queuedEvents.push({
      kind: "aoe",
      source: "airdrop",
      target: { x, y },
      meta: {
        aspect: "warning",
        radius: 6,
        amount: 0, // No damage yet - just visual warning
        duration: 25, // Warning lasts until landing
      },
    });
  }
}
