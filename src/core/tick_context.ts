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
  // Unit queries
  findUnitsInRadius(center: Vec2, radius: number): Unit[];
  findUnitById(id: string): Unit | undefined;
  getAllUnits(): readonly Unit[];
  getUnitsInTeam(team: string): Unit[];
  
  // Spatial queries
  getUnitsAt(pos: Vec2): Unit[];
  getUnitsInRect(x: number, y: number, width: number, height: number): Unit[];
  
  // Command and event queuing
  queueCommand(command: { type: string; params: any }): void;
  queueEvent(event: { kind: string; source?: string; target?: any; meta?: any }): void;
  
  // Random number generation
  getRandom(): number;
  
  // Time information
  getCurrentTick(): number;
  
  // Field information
  getFieldWidth(): number;
  getFieldHeight(): number;
  
  // Projectiles (read-only view)
  getProjectiles(): readonly Projectile[];
  
  // Particles (read-only view)
  getParticles(): readonly Particle[];
  
  // Environment queries
  getTemperatureAt(x: number, y: number): number;
  getSceneBackground(): string;
  
  // Weather state (read-only)
  isWinterActive(): boolean;
  isSandstormActive(): boolean;
  getSandstormIntensity(): number;
  getSandstormDuration(): number;
  
  // Event querying  
  getQueuedEvents(): readonly any[];
  
  // Performance information
  // NOTE: deprecated, do not create weird secondary 'performance' modes!
  // isPerformanceMode(): boolean;
}

/**
 * Implementation of TickContext that delegates to the Simulator
 */
export class TickContextImpl implements TickContext {
  constructor(private sim: Simulator) {}
  
  findUnitsInRadius(center: Vec2, radius: number): Unit[] {
    // Always use the optimized spatial query from simulator
    return this.sim.getUnitsNear(center.x, center.y, radius);
  }
  
  findUnitById(id: string): Unit | undefined {
    return this.sim.units.find(unit => unit.id === id);
  }
  
  getAllUnits(): readonly Unit[] {
    return this.sim.units;
  }
  
  getUnitsInTeam(team: string): Unit[] {
    return this.sim.units.filter(unit => unit.team === team);
  }
  
  getUnitsAt(pos: Vec2): Unit[] {
    return this.sim.units.filter(unit => 
      Math.floor(unit.pos.x) === Math.floor(pos.x) && 
      Math.floor(unit.pos.y) === Math.floor(pos.y)
    );
  }
  
  getUnitsInRect(x: number, y: number, width: number, height: number): Unit[] {
    return this.sim.units.filter(unit => 
      unit.pos.x >= x && unit.pos.x < x + width &&
      unit.pos.y >= y && unit.pos.y < y + height
    );
  }
  
  queueCommand(command: { type: string; params: any }): void {
    if (!this.sim.queuedCommands) {
      this.sim.queuedCommands = [];
    }
    this.sim.queuedCommands.push(command);
  }
  
  queueEvent(event: { kind: string; source?: string; target?: any; meta?: any }): void {
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
    return this.sim.sceneBackground || 'forest';
  }
  
  // Weather state methods
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
  
  isPerformanceMode(): boolean {
    return (this.sim as any).performanceMode || false;
  }
}