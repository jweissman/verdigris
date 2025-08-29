import { Unit } from "../types/Unit";
import { ProxyManager } from "../sim/unit_proxy";

/**
 * Manages unit storage, retrieval, and basic operations.
 * Extracted from Simulator to reduce god class responsibilities.
 */
export class UnitManager {
  public units: Unit[] = [];
  public roster: Record<string, Unit> = {};
  private unitCounter = 0;
  private proxyManager: ProxyManager;

  constructor(proxyManager: ProxyManager) {
    this.proxyManager = proxyManager;
  }

  addUnit(unit: Partial<Unit>): Unit {
    const fullUnit = this.createUnit(unit);
    
    this.units.push(fullUnit);
    if (fullUnit.id) {
      this.roster[fullUnit.id] = fullUnit;
    }
    
    // Register with proxy manager
    this.proxyManager.registerUnit(fullUnit);
    
    return fullUnit;
  }

  private createUnit(unit: Partial<Unit>): Unit {
    const id = unit.id || `unit_${this.unitCounter++}`;
    
    return {
      id,
      pos: unit.pos || { x: 0, y: 0 },
      team: unit.team || "neutral",
      hp: unit.hp || 10,
      maxHp: unit.maxHp || unit.hp || 10,
      dmg: unit.dmg || 1,
      state: unit.state || "idle",
      intendedMove: unit.intendedMove || { x: 0, y: 0 },
      tags: unit.tags || [],
      abilities: unit.abilities || [],
      meta: unit.meta || {},
      mass: unit.mass || 1,
      ...unit
    } as Unit;
  }

  removeUnit(unitId: string): void {
    const index = this.units.findIndex(u => u.id === unitId);
    if (index !== -1) {
      this.units.splice(index, 1);
      delete this.roster[unitId];
      this.proxyManager.unregisterUnit(unitId);
    }
  }

  getUnitById(id: string): Unit | undefined {
    return this.roster[id];
  }

  getAllUnits(): Unit[] {
    return this.units;
  }

  getUnitsByTeam(team: string): Unit[] {
    return this.units.filter(u => u.team === team);
  }

  getAliveUnits(): Unit[] {
    return this.units.filter(u => u.state !== "dead");
  }

  hasUnitsWithTag(tag: string): boolean {
    return this.units.some(u => u.tags?.includes(tag));
  }

  hasUnitsWithAbility(ability: string): boolean {
    return this.units.some(u => u.abilities?.includes(ability));
  }

  clear(): void {
    this.units = [];
    this.roster = {};
    this.unitCounter = 0;
  }

  // Batch operations for performance
  getUnitArrays() {
    const count = this.units.length;
    const xPos = new Float32Array(count);
    const yPos = new Float32Array(count);
    const hp = new Int16Array(count);
    const team = new Uint8Array(count);
    
    for (let i = 0; i < count; i++) {
      const unit = this.units[i];
      xPos[i] = unit.pos.x;
      yPos[i] = unit.pos.y;
      hp[i] = unit.hp;
      team[i] = unit.team === "friendly" ? 0 : unit.team === "hostile" ? 1 : 2;
    }
    
    return { xPos, yPos, hp, team, count };
  }
}