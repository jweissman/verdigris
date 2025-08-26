import type { Unit } from "../types/Unit";
import type { Vec2 } from "../types/Vec2";
import type { Projectile } from "../types/Projectile";
import type { Particle } from "../types/Particle";
import type { Simulator } from "./simulator";
import type { ProjectileArrays } from "../sim/projectile_arrays";

/**
 * TickContext - Clean API boundary for rules
 *
 * This encapsulates the simulator API that rules are allowed to use,
 * preventing direct access to private properties like unitArrays.
 * Rules receive this context in their execute() method.
 */
export interface TickContext {
  findUnitsInRadius(center: Vec2, radius: number): Unit[];
  findUnitById(id: string): Unit | undefined;
  getAllUnits(): readonly Unit[];
  getUnitsInTeam(team: string): Unit[];
  getUnitsAt(pos: Vec2): Unit[];
  getUnitsInRect(x: number, y: number, width: number, height: number): Unit[];
  queueCommand(command: { type: string; params: any }): void;
  queueEvent(event: {
    kind: string;
    source?: string;
    target?: any;
    meta?: any;
  }): void;
  getRandom(): number;
  getCurrentTick(): number;
  getFieldWidth(): number;
  getFieldHeight(): number;
  getProjectiles(): readonly Projectile[];
  getProjectileArrays(): ProjectileArrays;
  getParticles(): readonly Particle[];
  getTemperatureAt(x: number, y: number): number;
  getSceneBackground(): string;
  isWinterActive(): boolean;
  isSandstormActive(): boolean;
  getSandstormIntensity(): number;
  getSandstormDuration(): number;
  getQueuedEvents(): readonly any[];

  getUnitIndex(unitId: string): number | undefined;
  getArrays(): {
    posX: number[];
    posY: number[];
    activeIndices: number[];
    team: number[];
    state: number[];
    unitIds: string[];
    hp: number[];
    maxHp: number[];
    mass: number[];
    dmg: number[];
  };
  getUnitColdData(unitId: string): any;
  getUnitColdDataByIndex(index: number): any;
  isAbilityForced(unitId: string, abilityName: string): boolean;

  findUnitIndicesInRadius(center: Vec2, radius: number): number[];
  getActiveUnitIndices(): number[];
  getUnitIndicesWithAbilities(): number[];
  getUnitProxyByIndex?(index: number): Unit | undefined;
}

/**
 * Implementation of TickContext that delegates to the Simulator
 */
export class TickContextImpl implements TickContext {
  private unitCache: readonly Unit[] | null = null;

  constructor(private sim: Simulator) {}

  clearCache(): void {
    this.unitCache = null;
  }

  findUnitsInRadius(center: Vec2, radius: number): Unit[] {
    if (this.sim.gridPartition) {
      return this.sim.gridPartition.getNearby(center.x, center.y, radius);
    }

    return this.getAllUnits().filter((u) => {
      const dx = u.pos.x - center.x;
      const dy = u.pos.y - center.y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  findUnitById(id: string): Unit | undefined {
    return this.getAllUnits().find((unit) => unit.id === id);
  }

  getAllUnits(): readonly Unit[] {
    if (!this.unitCache) {
      this.unitCache = this.sim.proxyManager.getAllProxies();
    }
    return this.unitCache;
  }

  getUnitsInTeam(team: string): Unit[] {
    return this.getAllUnits().filter((unit) => unit.team === team);
  }

  getUnitsWithAbilities(): Unit[] {
    return this.getAllUnits().filter(
      (unit) => unit.abilities && unit.abilities.length > 0,
    );
  }

  getUnitsWithState(state: string): Unit[] {
    return this.getAllUnits().filter((unit) => unit.state === state);
  }

  getUnitsAt(pos: Vec2): Unit[] {
    return this.getAllUnits().filter(
      (unit) =>
        Math.floor(unit.pos.x) === Math.floor(pos.x) &&
        Math.floor(unit.pos.y) === Math.floor(pos.y),
    );
  }

  getUnitsInRect(x: number, y: number, width: number, height: number): Unit[] {
    return this.getAllUnits().filter(
      (unit) =>
        unit.pos.x >= x &&
        unit.pos.x < x + width &&
        unit.pos.y >= y &&
        unit.pos.y < y + height,
    );
  }

  queueCommand(command: { type: string; params: any }): void {
    if (!this.sim.queuedCommands) {
      this.sim.queuedCommands = [];
    }
    this.sim.queuedCommands.push(command);
  }

  queueEvent(event: {
    kind: string;
    source?: string;
    target?: any;
    meta?: any;
  }): void {
    if (!this.sim.queuedEvents) {
      this.sim.queuedEvents = [];
    }

    if (!event.meta) {
      event.meta = {};
    }
    if (event.meta.tick === undefined) {
      event.meta.tick = this.sim.ticks;
    }
    this.sim.queuedEvents.push(event);
  }

  getRandom(): number {
    return (this.sim.constructor as any).rng?.random() || Math.random();
  }

  getCurrentTick(): number {
    return this.sim.ticks;
  }

  getFieldWidth(): number {
    return this.sim.fieldWidth;
  }

  getFieldHeight(): number {
    return this.sim.fieldHeight;
  }

  getProjectiles(): readonly Projectile[] {
    // Convert SoA projectiles back to objects for compatibility
    const projectiles: Projectile[] = [];
    const arrays = this.sim.projectileArrays;
    if (!arrays) return [];
    
    for (let i = 0; i < arrays.capacity; i++) {
      if (arrays.active[i] === 0) continue;
      projectiles.push({
        id: arrays.projectileIds[i],
        pos: { x: arrays.posX[i], y: arrays.posY[i] },
        vel: { x: arrays.velX[i], y: arrays.velY[i] },
        radius: arrays.radius[i],
        damage: arrays.damage[i],
        team: arrays.team[i] === 1 ? "friendly" : arrays.team[i] === 2 ? "hostile" : "neutral",
        type: ["bullet", "bomb", "grapple", "laser_beam"][arrays.type[i]] as any,
        sourceId: arrays.sourceIds[i] || undefined,
        target: arrays.targetX[i] ? { x: arrays.targetX[i], y: arrays.targetY[i] } : undefined,
        progress: arrays.progress[i] || undefined,
        duration: arrays.duration[i] || undefined,
        origin: arrays.originX[i] ? { x: arrays.originX[i], y: arrays.originY[i] } : undefined,
        z: arrays.z[i] || undefined,
        lifetime: arrays.lifetime[i] || undefined,
        aoeRadius: arrays.aoeRadius[i] || undefined,
        explosionRadius: arrays.explosionRadius[i] || undefined,
        aspect: arrays.aspect[i] || undefined,
      });
    }
    return projectiles;
  }
  
  getProjectileArrays(): ProjectileArrays {
    return this.sim.projectileArrays;
  }

  getParticles(): readonly Particle[] {
    return this.sim.particles || [];
  }

  getTemperatureAt(x: number, y: number): number {
    if (this.sim.temperatureField) {
      return this.sim.temperatureField.get(x, y);
    }
    return 20; // Default room temperature
  }

  getSceneBackground(): string {
    return this.sim.sceneBackground || "forest";
  }

  isWinterActive(): boolean {
    return (this.sim as any).winterActive || false;
  }

  isSandstormActive(): boolean {
    return (this.sim as any).sandstormActive || false;
  }

  getSandstormIntensity(): number {
    return (this.sim as any).sandstormIntensity || 0;
  }

  getSandstormDuration(): number {
    return (this.sim as any).sandstormDuration || 0;
  }

  getQueuedEvents(): readonly any[] {
    return this.sim.queuedEvents || [];
  }

  getUnitIndex(unitId: string): number | undefined {
    return (this.sim as any).proxyManager?.idToIndex?.get(unitId);
  }

  getArrays(): {
    posX: number[];
    posY: number[];
    activeIndices: number[];
    team: number[];
    state: number[];
    unitIds: string[];
    hp: number[];
    maxHp: number[];
    mass: number[];
    dmg: number[];
  } {
    const arrays = (this.sim as any).unitArrays;
    return {
      posX: arrays.posX,
      posY: arrays.posY,
      activeIndices: arrays.activeIndices,
      team: arrays.team,
      state: arrays.state,
      unitIds: arrays.unitIds,
      hp: arrays.hp,
      maxHp: arrays.maxHp,
      mass: arrays.mass,
      dmg: arrays.dmg,
    };
  }

  getUnitColdData(unitId: string): any {
    return (this.sim as any).unitColdData.get(unitId);
  }

  getUnitColdDataByIndex(index: number): any {
    const arrays = (this.sim as any).unitArrays;
    const unitId = arrays.unitIds[index];
    return (this.sim as any).unitColdData.get(unitId);
  }

  /**
   * High-performance query: returns indices instead of proxies
   * Much faster than findUnitsInRadius for hot paths
   */
  findUnitIndicesInRadius(center: Vec2, radius: number): number[] {
    const arrays = this.getArrays();
    const { posX, posY, activeIndices } = arrays;
    const radiusSq = radius * radius;
    const result: number[] = [];

    for (const idx of activeIndices) {
      const dx = posX[idx] - center.x;
      const dy = posY[idx] - center.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusSq) {
        result.push(idx);
      }
    }

    return result;
  }

  /**
   * High-performance query: returns indices in rectangle
   */
  findUnitIndicesInRect(
    x: number,
    y: number,
    width: number,
    height: number,
  ): number[] {
    const arrays = this.getArrays();
    const { posX, posY, activeIndices } = arrays;
    const result: number[] = [];

    const maxX = x + width;
    const maxY = y + height;

    for (const idx of activeIndices) {
      const px = posX[idx];
      const py = posY[idx];

      if (px >= x && px < maxX && py >= y && py < maxY) {
        result.push(idx);
      }
    }

    return result;
  }

  /**
   * High-performance query: returns indices for team
   */
  findUnitIndicesInTeam(team: "friendly" | "hostile" | "neutral"): number[] {
    const arrays = this.getArrays();
    const { team: teamArray, activeIndices } = arrays;
    const result: number[] = [];

    const teamCode = team === "friendly" ? 1 : team === "hostile" ? 2 : 0;

    for (const idx of activeIndices) {
      if (teamArray[idx] === teamCode) {
        result.push(idx);
      }
    }

    return result;
  }

  isAbilityForced(unitId: string, abilityName: string): boolean {
    const key = `${unitId}:${abilityName}`;
    return (this.sim as any).forcedAbilitiesThisTick?.has(key) || false;
  }

  getActiveUnitIndices(): number[] {
    return [...this.getArrays().activeIndices];
  }

  getUnitIndicesWithAbilities(): number[] {
    const arrays = this.getArrays();
    const indices: number[] = [];

    for (const idx of arrays.activeIndices) {
      const unitId = arrays.unitIds[idx];
      const coldData = this.getUnitColdData(unitId);
      if (coldData?.abilities?.length > 0) {
        indices.push(idx);
      }
    }

    return indices;
  }

  getUnitProxyByIndex(index: number): Unit | undefined {
    return (this.sim as any).proxyManager?.getProxy(index);
  }
}
