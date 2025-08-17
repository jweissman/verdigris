import type { Unit } from "../types/Unit";
import type { Vec2 } from "../types/Vec2";
import type { Projectile } from "../types/Projectile";
import type { Particle } from "../types/Particle";
import type { Simulator } from "./simulator";

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
  getParticles(): readonly Particle[];
  getTemperatureAt(x: number, y: number): number;
  getSceneBackground(): string;
  isWinterActive(): boolean;
  isSandstormActive(): boolean;
  getSandstormIntensity(): number;
  getSandstormDuration(): number;
  getQueuedEvents(): readonly any[];
}

/**
 * Implementation of TickContext that delegates to the Simulator
 */
export class TickContextImpl implements TickContext {
  private unitCache: readonly Unit[] | null = null;

  constructor(private sim: Simulator) {}
  

  findUnitsInRadius(center: Vec2, radius: number): Unit[] {
    // Moved from Simulator - TickContext should handle queries
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
      // Cache proxies for this tick
      this.unitCache = this.sim.proxyManager.getAllProxies();
    }
    return this.unitCache;
  }

  getUnitsInTeam(team: string): Unit[] {
    return this.getAllUnits().filter((unit) => unit.team === team);
  }
  
  // PERFORMANCE: New query methods to avoid getAllUnits() where possible
  getUnitsWithAbilities(): Unit[] {
    return this.getAllUnits().filter((unit) => 
      unit.abilities && unit.abilities.length > 0
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
    return this.sim.projectiles || [];
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
}
