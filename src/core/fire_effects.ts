import { Unit } from "../types/Unit";
import { QueuedCommand } from "./command_handler";
import { ParticleManager } from "./particle_manager";
import { ScalarField } from "./ScalarField";

/**
 * Handles fire-related effects
 * Extracted from Simulator to reduce complexity
 */
export class FireEffects {
  constructor(
    private particleManager: ParticleManager,
    private temperatureField: ScalarField,
    private humidityField: ScalarField
  ) {}

  setUnitOnFire(unit: Unit): QueuedCommand | null {
    if (unit.meta?.onFire) return null; // Already on fire

    return {
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          ...unit.meta,
          onFire: true,
          fireDuration: 40, // Burn for 5 seconds at 8fps
          fireTickDamage: 2, // Damage per tick while burning
        },
      },
    };
  }

  processFireEffects(units: readonly Unit[], rng: { random(): number }): QueuedCommand[] {
    const commands: QueuedCommand[] = [];

    for (const unit of units) {
      if (unit.meta && unit.meta.onFire && unit.meta.fireDuration > 0) {
        commands.push({
          type: "damage",
          params: {
            targetId: unit.id,
            amount: unit.meta.fireTickDamage || 2,
            aspect: "fire",
            sourceId: "fire",
          },
        });

        commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              ...unit.meta,
              fireDuration: unit.meta.fireDuration - 1,
            },
          },
        });

        if (rng.random() < 0.3) {
          const offsetX = (rng.random() - 0.5) * 2;
          const offsetY = (rng.random() - 0.5) * 2;
          this.particleManager.spawnFireParticle(unit.pos.x + offsetX, unit.pos.y + offsetY);
        }

        this.temperatureField.addGradient(unit.pos.x, unit.pos.y, 2, 1.5);

        if (unit.meta.fireDuration <= 0) {
          unit.meta.onFire = false;
          delete unit.meta.fireDuration;
          delete unit.meta.fireTickDamage;
        }
      }
    }

    return commands;
  }

  extinguishFires(
    units: readonly Unit[],
    weatherType: string,
    getHumidity: (x: number, y: number) => number,
    getTemperature: (x: number, y: number) => number
  ): QueuedCommand[] {
    const commands: QueuedCommand[] = [];

    if (weatherType === "rain" || weatherType === "storm") {
      for (const unit of units) {
        if (unit.meta?.onFire) {
          const humidity = getHumidity(unit.pos.x, unit.pos.y);
          const temperature = getTemperature(unit.pos.x, unit.pos.y);

          if (humidity > 0.6 && temperature < 30) {
            commands.push({
              type: "meta",
              params: {
                unitId: unit.id,
                meta: {
                  ...unit.meta,
                  onFire: false,
                  fireDuration: undefined,
                  fireTickDamage: undefined,
                },
              },
            });
          }
        }
      }
    }

    return commands;
  }
}