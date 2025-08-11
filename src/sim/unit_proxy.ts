import { Unit } from "../types/Unit";
import { UnitArrays } from "./unit_arrays";

/**
 * Proxy that makes SoA arrays appear as regular Unit objects
 * Provides transparent access while maintaining performance benefits
 */
export class UnitProxy implements Unit {
  private arrays: UnitArrays;
  private _index: number;
  private _id: string;
  
  constructor(arrays: UnitArrays, index: number) {
    this.arrays = arrays;
    this._index = index;
    this._id = arrays.indexToId[index];
  }
  
  // Update index if unit moved in arrays
  updateIndex(newIndex: number) {
    this._index = newIndex;
  }
  
  get id(): string {
    return this._id;
  }
  
  set id(value: string) {
    this._id = value;
    this.arrays.indexToId[this._index] = value;
  }
  
  get pos() {
    const arrays = this.arrays;
    const idx = this._index;
    return {
      get x() { return arrays.x[idx]; },
      set x(v: number) { 
        arrays.x[idx] = v;
        arrays.dirtyMask[idx] = 1;
      },
      get y() { return arrays.y[idx]; },
      set y(v: number) { 
        arrays.y[idx] = v;
        arrays.dirtyMask[idx] = 1;
      }
    };
  }
  
  set pos(value: { x: number; y: number }) {
    this.arrays.x[this._index] = value.x;
    this.arrays.y[this._index] = value.y;
    this.arrays.dirtyMask[this._index] = 1;
  }
  
  get intendedMove() {
    const arrays = this.arrays;
    const idx = this._index;
    return {
      get x() { return arrays.vx[idx]; },
      set x(v: number) { arrays.vx[idx] = v; },
      get y() { return arrays.vy[idx]; },
      set y(v: number) { arrays.vy[idx] = v; }
    };
  }
  
  set intendedMove(value: { x: number; y: number }) {
    this.arrays.vx[this._index] = value.x;
    this.arrays.vy[this._index] = value.y;
  }
  
  get hp(): number {
    return this.arrays.hp[this._index];
  }
  
  set hp(value: number) {
    this.arrays.hp[this._index] = value;
    this.arrays.dirtyMask[this._index] = 1;
    if (value <= 0) {
      this.arrays.state[this._index] = 3; // dead
    }
  }
  
  get maxHp(): number {
    return this.arrays.maxHp[this._index];
  }
  
  set maxHp(value: number) {
    this.arrays.maxHp[this._index] = value;
  }
  
  get dmg(): number {
    return this.arrays.dmg[this._index];
  }
  
  set dmg(value: number) {
    this.arrays.dmg[this._index] = value;
  }
  
  get team(): 'friendly' | 'hostile' | 'neutral' {
    const teamId = this.arrays.team[this._index];
    return teamId === 1 ? 'friendly' : teamId === 2 ? 'hostile' : 'neutral';
  }
  
  set team(value: 'friendly' | 'hostile' | 'neutral') {
    this.arrays.team[this._index] = value === 'friendly' ? 1 : value === 'hostile' ? 2 : 0;
  }
  
  get state(): string {
    const stateId = this.arrays.state[this._index];
    return ['idle', 'moving', 'attack', 'dead'][stateId] || 'idle';
  }
  
  set state(value: string) {
    const stateMap: Record<string, number> = {
      'idle': 0,
      'moving': 1,
      'attack': 2,
      'dead': 3
    };
    this.arrays.state[this._index] = stateMap[value] || 0;
    this.arrays.dirtyMask[this._index] = 1;
  }
  
  get mass(): number {
    return this.arrays.mass[this._index];
  }
  
  set mass(value: number) {
    this.arrays.mass[this._index] = value;
  }
  
  // These would need separate storage or a metadata system
  sprite: string = 'default';
  abilities: any[] = [];
  tags?: string[] = [];
  meta: Record<string, any> = {};
  intendedTarget?: string;
  posture?: string;
  
  // Helper to check if unit is alive
  get isAlive(): boolean {
    return this.arrays.state[this._index] !== 3 && this.arrays.hp[this._index] > 0;
  }
  
  // Helper to get actual array index (for performance-critical paths)
  get arrayIndex(): number {
    return this._index;
  }
}

/**
 * Manager to handle the proxy lifecycle
 */
export class UnitProxyManager {
  private arrays: UnitArrays;
  private proxyCache: Map<number, UnitProxy> = new Map();
  
  constructor(arrays: UnitArrays) {
    this.arrays = arrays;
  }
  
  getProxy(index: number): UnitProxy {
    if (!this.proxyCache.has(index)) {
      this.proxyCache.set(index, new UnitProxy(this.arrays, index));
    }
    return this.proxyCache.get(index)!;
  }
  
  getProxyById(id: string): UnitProxy | undefined {
    const index = this.arrays.idToIndex.get(id);
    if (index === undefined) return undefined;
    return this.getProxy(index);
  }
  
  getAllProxies(): UnitProxy[] {
    const proxies: UnitProxy[] = [];
    for (let i = 0; i < this.arrays.count; i++) {
      if (this.arrays.state[i] !== 3) { // Not dead
        proxies.push(this.getProxy(i));
      }
    }
    return proxies;
  }
  
  clearCache(): void {
    this.proxyCache.clear();
  }
}