import { UnitArrays } from "../sim/unit_arrays";

/**
 * Helper class for querying simulation state
 * Used to determine which rules should be active
 */
export class SimulationQueries {
  constructor(
    private unitArrays: UnitArrays,
    private unitColdData: Map<string, any>,
    private projectiles?: any[],
    private particleArrays?: any,
    private weather?: any,
    private lightningActive?: boolean,
    private enableEnvironmentalEffects?: boolean,
  ) {}

  hasGrapplingHooks(): boolean {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;

    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.grapplingHook) return true;
    }
    return false;
  }

  hasAirdrops(): boolean {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;

    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.tags?.includes("airdrop")) return true;
    }
    return false;
  }

  hasStatusEffects(): boolean {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;

    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.statusEffects && data.meta.statusEffects.length > 0)
        return true;
      // Also check for old-style stun system
      if (data?.meta?.stunned || data?.meta?.stunDuration !== undefined)
        return true;
      // Check for chill
      if (data?.meta?.chilled || data?.meta?.chillIntensity !== undefined)
        return true;
      // Check for chill triggers
      if (data?.meta?.chillTrigger) return true;
    }
    return false;
  }

  hasJumpingUnits(): boolean {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;

    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.jumping) return true;
    }
    return false;
  }

  hasTossedUnits(): boolean {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;

    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.tossed) return true;
    }
    return false;
  }

  hasHugeUnits(): boolean {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;

    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.huge) return true;
    }
    return false;
  }

  hasSegmentedCreatures(): boolean {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;

    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.isSegment || data?.meta?.isSegmentHead) return true;
    }
    return false;
  }

  hasMovingUnits(): boolean {
    const arrays = this.unitArrays;

    for (const i of arrays.activeIndices) {
      if (arrays.intendedMoveX[i] !== 0 || arrays.intendedMoveY[i] !== 0)
        return true;
    }
    return false;
  }

  hasHostileUnits(): boolean {
    const arrays = this.unitArrays;
    for (const i of arrays.activeIndices) {
      if (arrays.team[i] === 1) return true;
    }
    return false;
  }

  hasOpposingTeams(): boolean {
    const arrays = this.unitArrays;
    let hasFriendly = false;
    let hasHostile = false;

    for (const i of arrays.activeIndices) {
      if (arrays.team[i] === 0) hasFriendly = true;
      if (arrays.team[i] === 1) hasHostile = true;
      if (hasFriendly && hasHostile) return true;
    }
    return false;
  }

  hasUnitsWithAbilities(): boolean {
    const coldData = this.unitColdData;
    const arrays = this.unitArrays;

    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.abilities && data.abilities.length > 0) return true;
    }
    return false;
  }

  hasDeadUnits(): boolean {
    const arrays = this.unitArrays;
    for (const i of arrays.activeIndices) {
      if (arrays.hp[i] <= 0) return true;
    }
    return false;
  }

  hasUnitsWithTimers(): boolean {
    const coldData = this.unitColdData;
    const arrays = this.unitArrays;

    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.timers || data?.meta?.lifespan || data?.meta?.ttl)
        return true;
    }
    return false;
  }

  hasAreaEffects(): boolean {
    return false; // TODO: Implement when we track area effects
  }

  hasKnockbackUnits(units: any[]): boolean {
    for (const unit of units) {
      if (unit.meta?.knockback) return true;
    }
    return false;
  }

  hasProjectiles(): boolean {
    return this.projectiles && this.projectiles.length > 0;
  }

  hasParticles(): boolean {
    return this.particleArrays && this.particleArrays.activeCount > 0;
  }

  hasLightning(): boolean {
    return !!this.lightningActive;
  }

  hasEnvironmentalEffects(): boolean {
    return (
      !!this.enableEnvironmentalEffects || this.weather?.current !== "clear"
    );
  }
}
