import { Unit, UnitState, UnitPosture } from "../types/Unit";
import { Vec2 } from "../types/Vec2";
import { UnitArrays } from "./unit_arrays";
import { Simulator } from "../core/simulator";

/**
 * Data query interface - abstracts away ALL storage implementation
 * The UnitProxy should ONLY interact through this interface
 * NOTES:
 * - Should _not expose setters_
 */
interface DataQuery {
  getPosition(unitId: string): Vec2;
  getIntendedMove(unitId: string): Vec2;
  getHp(unitId: string): number;
  getMaxHp(unitId: string): number;
  getTeam(unitId: string): 'friendly' | 'hostile' | 'neutral';
  getState(unitId: string): UnitState;
  getMass(unitId: string): number;
  getDamage(unitId: string): number;

  // Cold data queries
  getSprite(unitId: string): string;
  getAbilities(unitId: string): string[];
  getTags(unitId: string): string[] | undefined;
  getMeta(unitId: string): Record<string, any>;
  getType(unitId: string): string | undefined;
  getPosture(unitId: string): UnitPosture | undefined;
  getIntendedTarget(unitId: string): string | Vec2 | undefined;
  getLastAbilityTick(unitId: string): Record<string, number> | undefined;
  isAlive(unitId: string): boolean;
}

/**
 * TRUE PROXY PATTERN - Only stores unit ID and queries storage
 * No local caching of metadata - everything is queried on demand
 * IMPORTANT: This class should NOT have direct access to arrays!
 * This class should _not_ directly expose setters!
 */
export class UnitProxy implements Unit {
  constructor(
    public readonly id: string,
    private query: DataQuery
  ) {
    // Make internal properties non-enumerable to hide them from serialization
    Object.defineProperty(this, 'query', { enumerable: false });
  }
  
  // HOT DATA - Access through DataQuery interface
  get pos(): Vec2 {
    return this.query.getPosition(this.id);
  }
  
  get intendedMove(): Vec2 {
    return this.query.getIntendedMove(this.id);
  }
  
  get hp(): number {
    return this.query.getHp(this.id);
  }
  
  get maxHp(): number {
    return this.query.getMaxHp(this.id);
  }
  
  get dmg(): number {
    return this.query.getDamage(this.id);
  }
  
  get team(): 'friendly' | 'hostile' | 'neutral' {
    return this.query.getTeam(this.id);
  }
  
  get state(): UnitState {
    return this.query.getState(this.id);
  }
  
  get mass(): number {
    return this.query.getMass(this.id);
  }
  
  // COLD DATA - Access through DataQuery interface
  get sprite(): string {
    return this.query.getSprite(this.id);
  }
  
  get abilities(): string[] {
    return this.query.getAbilities(this.id);
  }
  
  get tags(): string[] | undefined {
    return this.query.getTags(this.id);
  }
  
  get meta(): Record<string, any> {
    return this.query.getMeta(this.id);
  }
  
  get intendedTarget(): string | Vec2 | undefined {
    return this.query.getIntendedTarget(this.id);
  }
  
  get posture(): UnitPosture | undefined {
    return this.query.getPosture(this.id);
  }
  
  get type(): string | undefined {
    return this.query.getType(this.id);
  }
  
  get lastAbilityTick(): Record<string, number> | undefined {
    return this.query.getLastAbilityTick(this.id);
  }
  
  // Helper to check if unit is alive
  get isAlive(): boolean {
    return this.query.isAlive(this.id);
  }
}

/**
 * Manager to handle the proxy lifecycle and implement DataQuery
 */
export class UnitProxyManager implements DataQuery {
  private arrays: UnitArrays;
  private metadataStore: Map<string, any>;
  private proxyCache: Map<string, UnitProxy> = new Map(); // Cache by ID now
  private idToIndex: Map<string, number> = new Map();
  
  constructor(arrays: UnitArrays, metadataStore: Map<string, any>) {
    this.arrays = arrays;
    this.metadataStore = metadataStore;
    this.rebuildIndex();
  }
  
  rebuildIndex(): void {
    this.idToIndex.clear();
    for (let i = 0; i < this.arrays.capacity; i++) {
      if (this.arrays.active[i] && this.arrays.unitIds[i]) {
        this.idToIndex.set(this.arrays.unitIds[i], i);
      }
    }
  }
  
  private getIndex(unitId: string): number {
    let index = this.idToIndex.get(unitId);
    if (index === undefined) {
      // Try rebuilding index in case new units were added
      this.rebuildIndex();
      index = this.idToIndex.get(unitId);
      if (index === undefined) {
        throw new Error(`Unit ${unitId} not found`);
      }
    }
    return index;
  }
  
  private getCold(unitId: string): any {
    return this.metadataStore.get(unitId) || {};
  }
  
  private setCold(unitId: string, data: any): void {
    this.metadataStore.set(unitId, data);
  }
  
  // Implement DataQuery interface - HOT DATA
  getPosition(unitId: string): Vec2 {
    const idx = this.getIndex(unitId);
    return { x: this.arrays.posX[idx], y: this.arrays.posY[idx] };
  }
  
  setPosition(unitId: string, pos: Vec2): void {
    const idx = this.getIndex(unitId);
    this.arrays.posX[idx] = pos.x;
    this.arrays.posY[idx] = pos.y;
  }
  
  getIntendedMove(unitId: string): Vec2 {
    const idx = this.getIndex(unitId);
    return { x: this.arrays.intendedMoveX[idx], y: this.arrays.intendedMoveY[idx] };
  }
  
  setIntendedMove(unitId: string, move: Vec2): void {
    const idx = this.getIndex(unitId);
    this.arrays.intendedMoveX[idx] = move.x;
    this.arrays.intendedMoveY[idx] = move.y;
  }
  
  getHp(unitId: string): number {
    const idx = this.getIndex(unitId);
    return this.arrays.hp[idx];
  }
  
  setHp(unitId: string, hp: number): void {
    const idx = this.getIndex(unitId);
    this.arrays.hp[idx] = hp;
    if (hp <= 0) {
      this.arrays.state[idx] = 3; // dead
    }
  }
  
  getMaxHp(unitId: string): number {
    const idx = this.getIndex(unitId);
    return this.arrays.maxHp[idx];
  }
  
  setMaxHp(unitId: string, maxHp: number): void {
    const idx = this.getIndex(unitId);
    this.arrays.maxHp[idx] = maxHp;
  }
  
  getTeam(unitId: string): 'friendly' | 'hostile' | 'neutral' {
    const idx = this.getIndex(unitId);
    const teamId = this.arrays.team[idx];
    return teamId === 1 ? 'friendly' : teamId === 2 ? 'hostile' : 'neutral';
  }
  
  setTeam(unitId: string, team: 'friendly' | 'hostile' | 'neutral'): void {
    const idx = this.getIndex(unitId);
    this.arrays.team[idx] = team === 'friendly' ? 1 : team === 'hostile' ? 2 : 0;
  }
  
  getState(unitId: string): UnitState {
    const idx = this.getIndex(unitId);
    const stateId = this.arrays.state[idx];
    const stateMap: UnitState[] = ['idle', 'walk', 'attack', 'dead'];
    return stateMap[stateId] || 'idle';
  }
  
  setState(unitId: string, state: UnitState): void {
    const idx = this.getIndex(unitId);
    const stateMap: Record<UnitState, number> = {
      'idle': 0,
      'walk': 1,
      'attack': 2,
      'dead': 3
    };
    this.arrays.state[idx] = stateMap[state] || 0;
  }
  
  getMass(unitId: string): number {
    const idx = this.getIndex(unitId);
    return this.arrays.mass[idx];
  }
  
  setMass(unitId: string, mass: number): void {
    const idx = this.getIndex(unitId);
    this.arrays.mass[idx] = mass;
  }
  
  getDamage(unitId: string): number {
    const idx = this.getIndex(unitId);
    return this.arrays.dmg[idx];
  }
  
  setDamage(unitId: string, dmg: number): void {
    const idx = this.getIndex(unitId);
    this.arrays.dmg[idx] = dmg;
  }
  
  // Implement DataQuery interface - COLD DATA
  getSprite(unitId: string): string {
    const cold = this.getCold(unitId);
    return cold.sprite || 'default';
  }
  
  setSprite(unitId: string, sprite: string): void {
    const cold = this.getCold(unitId);
    cold.sprite = sprite;
    this.setCold(unitId, cold);
  }
  
  getAbilities(unitId: string): string[] {
    const cold = this.getCold(unitId);
    return cold.abilities || [];
  }
  
  setAbilities(unitId: string, abilities: string[]): void {
    const cold = this.getCold(unitId);
    cold.abilities = abilities;
    this.setCold(unitId, cold);
  }
  
  getTags(unitId: string): string[] | undefined {
    const cold = this.getCold(unitId);
    return cold.tags;
  }
  
  setTags(unitId: string, tags: string[] | undefined): void {
    const cold = this.getCold(unitId);
    cold.tags = tags;
    this.setCold(unitId, cold);
  }
  
  getMeta(unitId: string): Record<string, any> {
    const cold = this.getCold(unitId);
    if (!cold.meta) {
      cold.meta = {};
      this.setCold(unitId, cold);
    }
    return cold.meta;
  }
  
  setMeta(unitId: string, meta: Record<string, any>): void {
    const cold = this.getCold(unitId);
    cold.meta = meta;
    this.setCold(unitId, cold);
  }
  
  getType(unitId: string): string | undefined {
    const cold = this.getCold(unitId);
    return cold.type;
  }
  
  setType(unitId: string, type: string | undefined): void {
    const cold = this.getCold(unitId);
    cold.type = type;
    this.setCold(unitId, cold);
  }
  
  getPosture(unitId: string): UnitPosture | undefined {
    const cold = this.getCold(unitId);
    return cold.posture as UnitPosture | undefined;
  }
  
  setPosture(unitId: string, posture: UnitPosture | undefined): void {
    const cold = this.getCold(unitId);
    cold.posture = posture;
    this.setCold(unitId, cold);
  }
  
  getIntendedTarget(unitId: string): string | Vec2 | undefined {
    const cold = this.getCold(unitId);
    return cold.intendedTarget;
  }
  
  setIntendedTarget(unitId: string, target: string | Vec2 | undefined): void {
    const cold = this.getCold(unitId);
    cold.intendedTarget = target;
    this.setCold(unitId, cold);
  }
  
  getLastAbilityTick(unitId: string): Record<string, number> | undefined {
    const cold = this.getCold(unitId);
    // Check both meta.lastAbilityTick and top-level for compatibility
    return cold.meta?.lastAbilityTick || cold.lastAbilityTick;
  }
  
  setLastAbilityTick(unitId: string, tick: Record<string, number> | undefined): void {
    const cold = this.getCold(unitId);
    if (!cold.meta) cold.meta = {};
    cold.meta.lastAbilityTick = tick;
    this.setCold(unitId, cold);
  }
  
  isAlive(unitId: string): boolean {
    const idx = this.getIndex(unitId);
    return this.arrays.state[idx] !== 3 && this.arrays.hp[idx] > 0;
  }
  
  getProxy(index: number): UnitProxy {
    const unitId = this.arrays.unitIds[index];
    if (!unitId) {
      throw new Error(`No unit at index ${index}`);
    }
    if (!this.proxyCache.has(unitId)) {
      this.proxyCache.set(unitId, new UnitProxy(unitId, this));
    }
    return this.proxyCache.get(unitId)!;
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
      if (this.arrays.active[i] && this.arrays.unitIds[i]) { // Only units with IDs
        const proxy = this.getProxy(i);
        proxies.push(proxy);
      }
    }
    return proxies;
  }
  
  clearCache(): void {
    this.proxyCache.clear();
    this.rebuildIndex();
  }
  
  // Notify when a unit is added/removed
  notifyUnitAdded(unitId: string, index: number): void {
    this.idToIndex.set(unitId, index);
  }
  
  notifyUnitRemoved(unitId: string): void {
    this.idToIndex.delete(unitId);
    this.proxyCache.delete(unitId);
  }

  // ============= BATCH OPERATIONS FOR VECTORIZED PERFORMANCE =============
  // These encapsulate array access so commands/rules don't need direct access

  /**
   * Batch move multiple units at once - vectorized for performance
   * This replaces the need for commands to access arrays directly
   */
  batchMove(moves: Map<string, { dx?: number, dy?: number, x?: number, y?: number }>): void {
    for (const [unitId, move] of moves) {
      const idx = this.idToIndex.get(unitId);
      if (idx === undefined) continue;
      
      if (move.x !== undefined && move.y !== undefined) {
        // Absolute positioning
        this.arrays.posX[idx] = move.x;
        this.arrays.posY[idx] = move.y;
      } else {
        // Relative movement
        this.arrays.posX[idx] += move.dx || 0;
        this.arrays.posY[idx] += move.dy || 0;
      }
      
      // Clear intended move
      this.arrays.intendedMoveX[idx] = 0;
      this.arrays.intendedMoveY[idx] = 0;
    }
  }

  /**
   * Find closest enemies and allies for all units - vectorized
   * Returns maps of unitId -> targetId for efficient AI processing
   */
  batchFindTargets(searchRadius: number = 15): { 
    enemies: Map<string, string | null>, 
    allies: Map<string, string | null> 
  } {
    const capacity = this.arrays.capacity;
    const enemies = new Map<string, string | null>();
    const allies = new Map<string, string | null>();
    const radiusSq = searchRadius * searchRadius;
    
    // O(N²) but vectorized with typed arrays for cache efficiency
    for (let i = 0; i < capacity; i++) {
      if (!this.arrays.active[i] || this.arrays.state[i] === 3) continue; // Skip dead
      
      const unitId = this.arrays.unitIds[i];
      const x1 = this.arrays.posX[i];
      const y1 = this.arrays.posY[i];
      const team1 = this.arrays.team[i];
      
      let closestEnemy: string | null = null;
      let closestAlly: string | null = null;
      let minEnemyDistSq = Infinity;
      let minAllyDistSq = Infinity;
      
      for (let j = 0; j < capacity; j++) {
        if (i === j || !this.arrays.active[j] || this.arrays.state[j] === 3) continue;
        
        const dx = this.arrays.posX[j] - x1;
        const dy = this.arrays.posY[j] - y1;
        const distSq = dx * dx + dy * dy;
        
        if (distSq > radiusSq) continue;
        
        const team2 = this.arrays.team[j];
        const targetId = this.arrays.unitIds[j];
        
        if (team1 !== team2 && distSq < minEnemyDistSq) {
          minEnemyDistSq = distSq;
          closestEnemy = targetId;
        } else if (team1 === team2 && distSq < minAllyDistSq) {
          minAllyDistSq = distSq;
          closestAlly = targetId;
        }
      }
      
      enemies.set(unitId, closestEnemy);
      allies.set(unitId, closestAlly);
    }
    
    return { enemies, allies };
  }

  /**
   * Process AI decisions for all units - vectorized
   * This encapsulates the performance-critical AI loop
   */
  batchProcessAI(postures: Map<string, string>): Map<string, { dx: number, dy: number }> {
    const targets = this.batchFindTargets();
    const moves = new Map<string, { dx: number, dy: number }>();
    
    
    for (let i = 0; i < this.arrays.capacity; i++) {
      if (!this.arrays.active[i] || this.arrays.state[i] === 3) continue;
      
      const unitId = this.arrays.unitIds[i];
      const posture = postures.get(unitId) || 'wait';
      
      let dx = 0, dy = 0;
      
      if (posture === 'wait') {
        // No movement
        moves.set(unitId, { dx: 0, dy: 0 });
        continue;
      }
      
      const targetId = targets.enemies.get(unitId);
      const allyId = targets.allies.get(unitId);
      
      // Handle different postures
      if ((posture === 'pursue' || posture === 'hunt' || posture === 'bully') && targetId) {
        // Move toward enemy
        const targetIdx = this.idToIndex.get(targetId);
        if (targetIdx !== undefined) {
          const x1 = this.arrays.posX[i];
          const y1 = this.arrays.posY[i];
          const x2 = this.arrays.posX[targetIdx];
          const y2 = this.arrays.posY[targetIdx];
          
          dx = x2 > x1 ? 1 : x2 < x1 ? -1 : 0;
          dy = y2 > y1 ? 1 : y2 < y1 ? -1 : 0;
          
        }
      } else if (posture === 'guard' && allyId) {
        // Move toward ally to protect
        const allyIdx = this.idToIndex.get(allyId);
        if (allyIdx !== undefined) {
          const x1 = this.arrays.posX[i];
          const y1 = this.arrays.posY[i];
          const x2 = this.arrays.posX[allyIdx];
          const y2 = this.arrays.posY[allyIdx];
          
          const distSq = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
          if (distSq > 4) { // Stay close but not too close
            dx = x2 > x1 ? 1 : x2 < x1 ? -1 : 0;
            dy = y2 > y1 ? 1 : y2 < y1 ? -1 : 0;
          }
        }
      } else if (posture === 'swarm') {
        // Move toward center of mass of nearby allies
        let avgX = this.arrays.posX[i];
        let avgY = this.arrays.posY[i];
        let count = 1;
        const team = this.arrays.team[i];
        
        for (let j = 0; j < this.arrays.capacity; j++) {
          if (i === j || !this.arrays.active[j] || this.arrays.state[j] === 3) continue;
          if (this.arrays.team[j] !== team) continue;
          
          const distX = this.arrays.posX[j] - this.arrays.posX[i];
          const distY = this.arrays.posY[j] - this.arrays.posY[i];
          const distSq = distX * distX + distY * distY;
          
          if (distSq < 25) { // Within 5 units
            avgX += this.arrays.posX[j];
            avgY += this.arrays.posY[j];
            count++;
          }
        }
        
        if (count > 1) {
          avgX /= count;
          avgY /= count;
          const diffX = avgX - this.arrays.posX[i];
          const diffY = avgY - this.arrays.posY[i];
          
          if (Math.abs(diffX) >= 1) {
            dx = diffX > 0 ? 1 : -1;
          }
          if (Math.abs(diffY) >= 1) {
            dy = diffY > 0 ? 1 : -1;
          }
        } else {
          // No allies nearby, wander
          if (Simulator.rng.random() < 0.15) {
            const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
            const [wanderDx, wanderDy] = dirs[Math.floor(Simulator.rng.random() * dirs.length)];
            dx = wanderDx;
            dy = wanderDy;
          }
        }
      } else if (posture === 'wander') {
        // Random movement
        if (Simulator.rng.random() < 0.15) {
          const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
          const [wanderDx, wanderDy] = dirs[Math.floor(Simulator.rng.random() * dirs.length)];
          dx = wanderDx;
          dy = wanderDy;
        }
      }
      
      
      moves.set(unitId, { dx, dy });
    }
    
    return moves;
  }

  /**
   * Apply forces (gravity, friction, etc) to all units - vectorized
   * This replaces Forces command's direct array access
   */
  batchApplyForces(): void {
    const capacity = this.arrays.capacity;
    
    for (let i = 0; i < capacity; i++) {
      if (!this.arrays.active[i] || this.arrays.state[i] === 3) continue;
      
      // Apply intended move to position
      if (this.arrays.intendedMoveX[i] !== 0 || this.arrays.intendedMoveY[i] !== 0) {
        this.arrays.posX[i] += this.arrays.intendedMoveX[i];
        this.arrays.posY[i] += this.arrays.intendedMoveY[i];
        
        // Clear intended move after applying
        this.arrays.intendedMoveX[i] = 0;
        this.arrays.intendedMoveY[i] = 0;
      }
    }
  }
}