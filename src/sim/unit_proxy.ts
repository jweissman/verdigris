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
    this._id = arrays.units[index]?.id || `unit_${index}`;
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
    if (this.arrays.units[this._index]) {
      this.arrays.units[this._index].id = value;
    }
  }
  
  get pos() {
    const arrays = this.arrays;
    const idx = this._index;
    return {
      get x() { return arrays.posX[idx]; },
      set x(v: number) { 
        arrays.posX[idx] = v;
      },
      get y() { return arrays.posY[idx]; },
      set y(v: number) { 
        arrays.posY[idx] = v;
      }
    };
  }
  
  set pos(value: { x: number; y: number }) {
    this.arrays.posX[this._index] = value.x;
    this.arrays.posY[this._index] = value.y;
  }
  
  get intendedMove() {
    const arrays = this.arrays;
    const idx = this._index;
    return {
      get x() { return arrays.intendedMoveX[idx]; },
      set x(v: number) { arrays.intendedMoveX[idx] = v; },
      get y() { return arrays.intendedMoveY[idx]; },
      set y(v: number) { arrays.intendedMoveY[idx] = v; }
    };
  }
  
  set intendedMove(value: { x: number; y: number }) {
    this.arrays.intendedMoveX[this._index] = value.x;
    this.arrays.intendedMoveY[this._index] = value.y;
  }
  
  get hp(): number {
    return this.arrays.hp[this._index];
  }
  
  set hp(value: number) {
    this.arrays.hp[this._index] = value;
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
    // O(N) search for now - could be optimized with id->index map
    for (let i = 0; i < this.arrays.capacity; i++) {
      if (this.arrays.active[i] && this.arrays.units[i]?.id === id) {
        return this.getProxy(i);
      }
    }
    return undefined;
  }
  
  getAllProxies(): UnitProxy[] {
    const proxies: UnitProxy[] = [];
    for (let i = 0; i < this.arrays.capacity; i++) {
      if (this.arrays.active[i] && this.arrays.state[i] !== 3) { // Active and not dead
        proxies.push(this.getProxy(i));
      }
    }
    return proxies;
  }
  
  clearCache(): void {
    this.proxyCache.clear();
  }
}