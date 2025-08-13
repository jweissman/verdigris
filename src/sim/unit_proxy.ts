import { Unit } from "../types/Unit";
import { UnitArrays } from "./unit_arrays";

/**
 * Metadata query interface - abstracts away the storage implementation
 */
interface MetadataQuery {
  getCold(unitId: string): any;
  setCold(unitId: string, data: any): void;
}

/**
 * TRUE PROXY PATTERN - Only stores unit ID and queries storage
 * No local caching of metadata - everything is queried on demand
 */
export class UnitProxy implements Unit {
  private readonly _id: string;
  
  constructor(
    private arrays: UnitArrays,
    private index: number,
    private metadata: MetadataQuery
  ) {
    // Store the ID once
    const storedId = this.arrays.unitIds[index];
    if (!storedId) {
      throw new Error(`Creating proxy for empty slot ${index} with active=${this.arrays.active[index]}`);
    }
    this._id = storedId;
  }
  
  // Update index if unit moved in arrays
  updateIndex(newIndex: number) {
    this.index = newIndex;
  }
  
  get id(): string {
    return this._id;
  }
  
  set id(value: string) {
    this.arrays.unitIds[this.index] = value;
  }
  
  // HOT DATA - Direct array access
  get pos() {
    const arrays = this.arrays;
    const idx = this.index;
    return {
      get x() { return arrays.posX[idx]; },
      set x(v: number) { arrays.posX[idx] = v; },
      get y() { return arrays.posY[idx]; },
      set y(v: number) { arrays.posY[idx] = v; }
    };
  }
  
  set pos(value: { x: number; y: number }) {
    this.arrays.posX[this.index] = value.x;
    this.arrays.posY[this.index] = value.y;
  }
  
  get intendedMove() {
    const arrays = this.arrays;
    const idx = this.index;
    return {
      get x() { return arrays.intendedMoveX[idx]; },
      set x(v: number) { arrays.intendedMoveX[idx] = v; },
      get y() { return arrays.intendedMoveY[idx]; },
      set y(v: number) { arrays.intendedMoveY[idx] = v; }
    };
  }
  
  set intendedMove(value: { x: number; y: number }) {
    this.arrays.intendedMoveX[this.index] = value.x;
    this.arrays.intendedMoveY[this.index] = value.y;
  }
  
  get hp(): number {
    return this.arrays.hp[this.index];
  }
  
  set hp(value: number) {
    this.arrays.hp[this.index] = value;
    if (value <= 0) {
      this.arrays.state[this.index] = 3; // dead
    }
  }
  
  get maxHp(): number {
    return this.arrays.maxHp[this.index];
  }
  
  set maxHp(value: number) {
    this.arrays.maxHp[this.index] = value;
  }
  
  get dmg(): number {
    return this.arrays.dmg[this.index];
  }
  
  set dmg(value: number) {
    this.arrays.dmg[this.index] = value;
  }
  
  get team(): 'friendly' | 'hostile' | 'neutral' {
    const teamId = this.arrays.team[this.index];
    return teamId === 1 ? 'friendly' : teamId === 2 ? 'hostile' : 'neutral';
  }
  
  set team(value: 'friendly' | 'hostile' | 'neutral') {
    this.arrays.team[this.index] = value === 'friendly' ? 1 : value === 'hostile' ? 2 : 0;
  }
  
  get state(): string {
    const stateId = this.arrays.state[this.index];
    return ['idle', 'moving', 'attack', 'dead'][stateId] || 'idle';
  }
  
  set state(value: string) {
    const stateMap: Record<string, number> = {
      'idle': 0,
      'moving': 1,
      'attack': 2,
      'dead': 3
    };
    this.arrays.state[this.index] = stateMap[value] || 0;
  }
  
  get mass(): number {
    return this.arrays.mass[this.index];
  }
  
  set mass(value: number) {
    this.arrays.mass[this.index] = value;
  }
  
  // COLD DATA - Query from metadata store (no local caching!)
  get sprite(): string {
    const cold = this.metadata.getCold(this._id);
    return cold?.sprite || 'default';
  }
  
  set sprite(value: string) {
    const cold = this.metadata.getCold(this._id) || {};
    cold.sprite = value;
    this.metadata.setCold(this._id, cold);
  }
  
  get abilities(): any[] {
    const cold = this.metadata.getCold(this._id);
    return cold?.abilities || [];
  }
  
  set abilities(value: any[]) {
    const cold = this.metadata.getCold(this._id) || {};
    cold.abilities = value;
    this.metadata.setCold(this._id, cold);
  }
  
  get tags(): string[] | undefined {
    const cold = this.metadata.getCold(this._id);
    return cold?.tags;
  }
  
  set tags(value: string[] | undefined) {
    const cold = this.metadata.getCold(this._id) || {};
    cold.tags = value;
    this.metadata.setCold(this._id, cold);
  }
  
  get meta(): Record<string, any> {
    let cold = this.metadata.getCold(this._id);
    if (!cold) {
      cold = { meta: {} };
      this.metadata.setCold(this._id, cold);
    }
    if (!cold.meta) {
      cold.meta = {};
      this.metadata.setCold(this._id, cold);
    }
    return cold.meta;
  }
  
  set meta(value: Record<string, any>) {
    const cold = this.metadata.getCold(this._id) || {};
    cold.meta = value;
    this.metadata.setCold(this._id, cold);
  }
  
  get intendedTarget(): string | undefined {
    const cold = this.metadata.getCold(this._id);
    return cold?.intendedTarget;
  }
  
  set intendedTarget(value: string | undefined) {
    const cold = this.metadata.getCold(this._id) || {};
    cold.intendedTarget = value;
    this.metadata.setCold(this._id, cold);
  }
  
  get posture(): string | undefined {
    const cold = this.metadata.getCold(this._id);
    return cold?.posture;
  }
  
  set posture(value: string | undefined) {
    const cold = this.metadata.getCold(this._id) || {};
    cold.posture = value;
    this.metadata.setCold(this._id, cold);
  }
  
  get type(): string | undefined {
    const cold = this.metadata.getCold(this._id);
    return cold?.type;
  }
  
  set type(value: string | undefined) {
    const cold = this.metadata.getCold(this._id) || {};
    cold.type = value;
    this.metadata.setCold(this._id, cold);
  }
  
  get lastAbilityTick(): Record<string, number> | undefined {
    const cold = this.metadata.getCold(this._id);
    return cold?.lastAbilityTick;
  }
  
  set lastAbilityTick(value: Record<string, number> | undefined) {
    const cold = this.metadata.getCold(this._id) || {};
    cold.lastAbilityTick = value;
    this.metadata.setCold(this._id, cold);
  }
  
  // Helper to check if unit is alive
  get isAlive(): boolean {
    return this.arrays.state[this.index] !== 3 && this.arrays.hp[this.index] > 0;
  }
  
  // Helper to get actual array index (for performance-critical paths)
  get arrayIndex(): number {
    return this.index;
  }
}

/**
 * Manager to handle the proxy lifecycle
 */
export class UnitProxyManager implements MetadataQuery {
  private arrays: UnitArrays;
  private metadataStore: Map<string, any>;
  private proxyCache: Map<number, UnitProxy> = new Map();
  
  constructor(arrays: UnitArrays, metadataStore: Map<string, any>) {
    this.arrays = arrays;
    this.metadataStore = metadataStore;
  }
  
  // Implement MetadataQuery interface
  getCold(unitId: string): any {
    return this.metadataStore.get(unitId);
  }
  
  setCold(unitId: string, data: any): void {
    this.metadataStore.set(unitId, data);
  }
  
  getProxy(index: number): UnitProxy {
    if (!this.proxyCache.has(index)) {
      this.proxyCache.set(index, new UnitProxy(this.arrays, index, this));
    }
    return this.proxyCache.get(index)!;
  }
  
  getProxyById(id: string): UnitProxy | undefined {
    // O(N) search for now - could be optimized with id->index map
    for (let i = 0; i < this.arrays.capacity; i++) {
      if (this.arrays.active[i] && this.arrays.unitIds[i] === id) {
        return this.getProxy(i);
      }
    }
    return undefined;
  }
  
  getAllProxies(): UnitProxy[] {
    const proxies: UnitProxy[] = [];
    for (let i = 0; i < this.arrays.capacity; i++) {
      if (this.arrays.active[i]) { // Include all active units, even dead ones
        const proxy = this.getProxy(i);
        // Ensure we only return real proxies
        if (!(proxy instanceof UnitProxy)) {
          throw new Error(`Non-proxy object found at index ${i}: ${proxy.constructor.name}`);
        }
        proxies.push(proxy);
      }
    }
    return proxies;
  }
  
  clearCache(): void {
    this.proxyCache.clear();
  }
}