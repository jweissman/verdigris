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
  getTeam(unitId: string): "friendly" | "hostile" | "neutral";
  getState(unitId: string): UnitState;
  getMass(unitId: string): number;
  getDamage(unitId: string): number;

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
  private _cachedIndex: number | undefined;

  constructor(
    public readonly id: string,
    private query: DataQuery,
    index?: number,
  ) {
    this._cachedIndex = index;
  }

  /**
   * Static factory to create a lightweight unit object
   * This is a plain object with values, not a proxy with getters
   */
  static createLightweight(
    unitId: string,
    index: number,
    arrays: UnitArrays,
    metadataStore: Map<string, any>,
  ): Unit {
    const coldData = metadataStore.get(unitId) || {};
    const stateId = arrays.state[index];
    const teamId = arrays.team[index];

    return {
      id: unitId,
      pos: { x: arrays.posX[index], y: arrays.posY[index] },
      intendedMove: {
        x: arrays.intendedMoveX[index],
        y: arrays.intendedMoveY[index],
      },
      hp: arrays.hp[index],
      maxHp: arrays.maxHp[index],
      dmg: arrays.dmg[index],
      team: teamId === 1 ? "friendly" : teamId === 2 ? "hostile" : "neutral",
      state:
        (["idle", "walk", "attack", "dead"] as UnitState[])[stateId] || "idle",
      mass: arrays.mass[index],
      sprite: coldData.sprite || "default",
      abilities: coldData.abilities || [],
      tags: coldData.tags,
      meta: coldData.meta || {},
      type: coldData.type,
      posture: coldData.posture,
      intendedTarget: coldData.intendedTarget,
      lastAbilityTick: coldData.lastAbilityTick,
    };
  }

  get pos(): Vec2 {
    const manager = this.query as UnitProxyManager;
    return {
      x: manager.arrays.posX[this._cachedIndex!],
      y: manager.arrays.posY[this._cachedIndex!],
    };
  }

  get intendedMove(): Vec2 {
    const manager = this.query as UnitProxyManager;
    return {
      x: manager.arrays.intendedMoveX[this._cachedIndex!],
      y: manager.arrays.intendedMoveY[this._cachedIndex!],
    };
  }

  get hp(): number {
    return (this.query as UnitProxyManager).getHpByIndex(this._cachedIndex!);
  }

  get maxHp(): number {
    return (this.query as UnitProxyManager).getMaxHpByIndex(this._cachedIndex!);
  }

  get dmg(): number {
    return (this.query as UnitProxyManager).getDamageByIndex(
      this._cachedIndex!,
    );
  }

  get team(): "friendly" | "hostile" | "neutral" {
    return (this.query as UnitProxyManager).getTeamByIndex(this._cachedIndex!);
  }

  get state(): UnitState {
    return (this.query as UnitProxyManager).getStateByIndex(this._cachedIndex!);
  }

  get mass(): number {
    return (this.query as UnitProxyManager).getMassByIndex(this._cachedIndex!);
  }

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

  get isAlive(): boolean {
    if (this._cachedIndex !== undefined) {
      return (this.query as UnitProxyManager).isAliveByIndex(this._cachedIndex);
    }
    return this.query.isAlive(this.id);
  }
}

/**
 * Manager to handle the proxy lifecycle and implement DataQuery
 */
export class UnitProxyManager implements DataQuery {
  public readonly arrays: UnitArrays;
  private metadataStore: Map<string, any>;
  private idToIndex: Map<string, number> = new Map();

  public useLightweightProxies: boolean = true;

  constructor(arrays: UnitArrays, metadataStore: Map<string, any>) {
    this.arrays = arrays;
    this.metadataStore = metadataStore;
    this.rebuildIndex();
  }

  rebuildIndex(): void {
    this.idToIndex.clear();
    this.indexCache = Object.create(null); // Clear cache
    for (const i of this.arrays.activeIndices) {
      if (this.arrays.unitIds[i]) {
        this.idToIndex.set(this.arrays.unitIds[i], i);
        this.indexCache[this.arrays.unitIds[i]] = i; // Pre-populate cache
      }
    }
  }

  private indexCache: { [key: string]: number } = Object.create(null);

  private getIndex(unitId: string): number {
    let index = this.indexCache[unitId];
    if (index !== undefined) return index;

    index = this.idToIndex.get(unitId);
    if (index !== undefined) {
      this.indexCache[unitId] = index; // Cache in object
      return index;
    }

    this.rebuildIndex();
    index = this.idToIndex.get(unitId);
    if (index === undefined) {
      throw new Error(`Unit ${unitId} not found`);
    }
    this.indexCache[unitId] = index;
    return index;
  }

  getPositionByIndex(index: number): Vec2 {
    return { x: this.arrays.posX[index], y: this.arrays.posY[index] };
  }

  getIntendedMoveByIndex(index: number): Vec2 {
    return {
      x: this.arrays.intendedMoveX[index],
      y: this.arrays.intendedMoveY[index],
    };
  }

  getHpByIndex(index: number): number {
    return this.arrays.hp[index];
  }

  getMaxHpByIndex(index: number): number {
    return this.arrays.maxHp[index];
  }

  getTeamByIndex(index: number): "friendly" | "hostile" | "neutral" {
    const teamId = this.arrays.team[index];
    return teamId === 1 ? "friendly" : teamId === 2 ? "hostile" : "neutral";
  }

  getStateByIndex(index: number): UnitState {
    const stateId = this.arrays.state[index];
    const stateMap: UnitState[] = ["idle", "walk", "attack", "dead"];
    return stateMap[stateId] || "idle";
  }

  getMassByIndex(index: number): number {
    return this.arrays.mass[index];
  }

  getDamageByIndex(index: number): number {
    return this.arrays.dmg[index];
  }

  isAliveByIndex(index: number): boolean {
    return this.arrays.state[index] !== 3 && this.arrays.hp[index] > 0;
  }

  private getCold(unitId: string): any {
    return this.metadataStore.get(unitId) || {};
  }

  private setCold(unitId: string, data: any): void {
    this.metadataStore.set(unitId, data);
  }

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
    return {
      x: this.arrays.intendedMoveX[idx],
      y: this.arrays.intendedMoveY[idx],
    };
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
      this.arrays.state[idx] = 3;
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

  getTeam(unitId: string): "friendly" | "hostile" | "neutral" {
    const idx = this.getIndex(unitId);
    const teamId = this.arrays.team[idx];
    return teamId === 1 ? "friendly" : teamId === 2 ? "hostile" : "neutral";
  }

  setTeam(unitId: string, team: "friendly" | "hostile" | "neutral"): void {
    const idx = this.getIndex(unitId);
    this.arrays.team[idx] =
      team === "friendly" ? 1 : team === "hostile" ? 2 : 0;
  }

  getState(unitId: string): UnitState {
    const idx = this.getIndex(unitId);
    const stateId = this.arrays.state[idx];
    const stateMap: UnitState[] = ["idle", "walk", "attack", "dead"];
    return stateMap[stateId] || "idle";
  }

  setState(unitId: string, state: UnitState): void {
    const idx = this.getIndex(unitId);
    const stateMap: Record<UnitState, number> = {
      idle: 0,
      walk: 1,
      attack: 2,
      dead: 3,
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

  getSprite(unitId: string): string {
    const cold = this.getCold(unitId);
    return cold.sprite || "default";
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

    return cold.meta?.lastAbilityTick || cold.lastAbilityTick;
  }

  setLastAbilityTick(
    unitId: string,
    tick: Record<string, number> | undefined,
  ): void {
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

    return new UnitProxy(unitId, this, index);
  }

  getProxyById(id: string): UnitProxy | undefined {
    const index = this.idToIndex.get(id);
    if (index !== undefined) {
      return this.getProxy(index);
    }
    return undefined;
  }

  getAllProxies(): UnitProxy[] {
    if (this.arrays.activeIndices.length === 0 && this.arrays.activeCount > 0) {
      this.arrays.rebuildActiveIndices();
    }

    const proxies: UnitProxy[] = [];
    for (const i of this.arrays.activeIndices) {
      const unitId = this.arrays.unitIds[i];

      const lightweight = UnitProxy.createLightweight(
        unitId,
        i,
        this.arrays,
        this.metadataStore,
      );
      proxies.push(lightweight as any);
    }

    return proxies;
  }

  /**
   * Get real proxies that stay in sync with arrays
   * Used for tests and external API where references are held across ticks
   */
  getRealProxies(): UnitProxy[] {
    if (this.arrays.activeIndices.length === 0 && this.arrays.activeCount > 0) {
      this.arrays.rebuildActiveIndices();
    }

    const proxies: UnitProxy[] = [];
    for (const i of this.arrays.activeIndices) {
      const unitId = this.arrays.unitIds[i];
      proxies.push(new UnitProxy(unitId, this, i));
    }

    return proxies;
  }

  clearCache(): void {
    this.indexCache = Object.create(null); // Clear index cache
    this.rebuildIndex();
  }

  notifyUnitAdded(unitId: string, index: number): void {
    this.idToIndex.set(unitId, index);
    this.indexCache[unitId] = index;
  }

  notifyUnitRemoved(unitId: string): void {
    this.idToIndex.delete(unitId);
    delete this.indexCache[unitId];
  }

  /**
   * Batch move multiple units at once - vectorized for performance
   * This replaces the need for commands to access arrays directly
   */
  batchMove(
    moves: Map<string, { dx?: number; dy?: number; x?: number; y?: number }>,
  ): void {
    for (const [unitId, move] of moves) {
      const idx = this.idToIndex.get(unitId);
      if (idx === undefined) continue;

      if (move.x !== undefined && move.y !== undefined) {
        this.arrays.posX[idx] = move.x;
        this.arrays.posY[idx] = move.y;
      } else {
        this.arrays.posX[idx] += move.dx || 0;
        this.arrays.posY[idx] += move.dy || 0;
      }

      this.arrays.intendedMoveX[idx] = 0;
      this.arrays.intendedMoveY[idx] = 0;
    }
  }

  /**
   * Find closest enemies and allies for all units - vectorized
   * Returns maps of unitId -> targetId for efficient AI processing
   */
  batchFindTargets(searchRadius: number = 15): {
    enemies: Map<string, string | null>;
    allies: Map<string, string | null>;
  } {
    const capacity = this.arrays.capacity;
    const enemies = new Map<string, string | null>();
    const allies = new Map<string, string | null>();
    const radiusSq = searchRadius * searchRadius;

    const activeCount = this.arrays.activeCount;

    if (activeCount <= 75) {
      return this.batchFindTargetsSimple(radiusSq, enemies, allies);
    } else {
      return this.batchFindTargetsGrid(searchRadius, radiusSq, enemies, allies);
    }
  }

  private batchFindTargetsSimple(
    radiusSq: number,
    enemies: Map<string, string | null>,
    allies: Map<string, string | null>,
  ): {
    enemies: Map<string, string | null>;
    allies: Map<string, string | null>;
  } {
    const capacity = this.arrays.capacity;

    for (const i of this.arrays.activeIndices) {
      if (this.arrays.state[i] === 3) continue;

      const unitId = this.arrays.unitIds[i];
      const x1 = this.arrays.posX[i];
      const y1 = this.arrays.posY[i];
      const team1 = this.arrays.team[i];

      let closestEnemy: string | null = null;
      let closestAlly: string | null = null;
      let minEnemyDistSq = Infinity;
      let minAllyDistSq = Infinity;

      for (const j of this.arrays.activeIndices) {
        if (i === j || this.arrays.state[j] === 3) continue;

        const absDx = Math.abs(this.arrays.posX[j] - x1);
        const absDy = Math.abs(this.arrays.posY[j] - y1);
        if (absDx + absDy > 15) continue; // Skip if too far (manhattan distance > search radius)

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

  private batchFindTargetsGrid(
    searchRadius: number,
    radiusSq: number,
    enemies: Map<string, string | null>,
    allies: Map<string, string | null>,
  ): {
    enemies: Map<string, string | null>;
    allies: Map<string, string | null>;
  } {
    const capacity = this.arrays.capacity;

    const gridSize = Math.ceil(searchRadius / 2);
    const gridWidth = Math.ceil(100 / gridSize);
    const gridHeight = Math.ceil(100 / gridSize);
    const grid: number[][] = Array(gridWidth * gridHeight)
      .fill(null)
      .map(() => []);

    for (const i of this.arrays.activeIndices) {
      if (this.arrays.state[i] === 3) continue;

      const x = this.arrays.posX[i];
      const y = this.arrays.posY[i];
      const gx = Math.floor(x / gridSize);
      const gy = Math.floor(y / gridSize);
      const gridIdx = gy * gridWidth + gx;

      if (gridIdx >= 0 && gridIdx < grid.length) {
        grid[gridIdx].push(i);
      }
    }

    for (const i of this.arrays.activeIndices) {
      if (this.arrays.state[i] === 3) continue;

      const unitId = this.arrays.unitIds[i];
      const x1 = this.arrays.posX[i];
      const y1 = this.arrays.posY[i];
      const team1 = this.arrays.team[i];

      let closestEnemy: string | null = null;
      let closestAlly: string | null = null;
      let minEnemyDistSq = Infinity;
      let minAllyDistSq = Infinity;

      const gx = Math.floor(x1 / gridSize);
      const gy = Math.floor(y1 / gridSize);
      const cellRadius = Math.ceil(searchRadius / gridSize);

      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
          const checkGx = gx + dx;
          const checkGy = gy + dy;

          if (
            checkGx < 0 ||
            checkGx >= gridWidth ||
            checkGy < 0 ||
            checkGy >= gridHeight
          )
            continue;

          const gridIdx = checkGy * gridWidth + checkGx;
          const cellUnits = grid[gridIdx];

          for (const j of cellUnits) {
            if (i === j) continue;

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
  batchProcessAI(
    postures: Map<string, string>,
  ): Map<string, { dx: number; dy: number }> {
    const targets = this.batchFindTargets();
    const moves = new Map<string, { dx: number; dy: number }>();

    for (const i of this.arrays.activeIndices) {
      if (this.arrays.state[i] === 3) continue; // Skip dead units

      const unitId = this.arrays.unitIds[i];
      const posture = postures.get(unitId) || "wait";

      let dx = 0,
        dy = 0;

      if (posture === "wait") {
        moves.set(unitId, { dx: 0, dy: 0 });
        continue;
      }

      const targetId = targets.enemies.get(unitId);
      const allyId = targets.allies.get(unitId);

      if (
        (posture === "pursue" || posture === "hunt" || posture === "bully") &&
        targetId
      ) {
        const targetIdx = this.idToIndex.get(targetId);
        if (targetIdx !== undefined) {
          const x1 = this.arrays.posX[i];
          const y1 = this.arrays.posY[i];
          const x2 = this.arrays.posX[targetIdx];
          const y2 = this.arrays.posY[targetIdx];

          dx = x2 > x1 ? 1 : x2 < x1 ? -1 : 0;
          dy = y2 > y1 ? 1 : y2 < y1 ? -1 : 0;
        }
      } else if (posture === "guard" && allyId) {
        const allyIdx = this.idToIndex.get(allyId);
        if (allyIdx !== undefined) {
          const x1 = this.arrays.posX[i];
          const y1 = this.arrays.posY[i];
          const x2 = this.arrays.posX[allyIdx];
          const y2 = this.arrays.posY[allyIdx];

          const distSq = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
          if (distSq > 4) {
            dx = x2 > x1 ? 1 : x2 < x1 ? -1 : 0;
            dy = y2 > y1 ? 1 : y2 < y1 ? -1 : 0;
          }
        }
      } else if (posture === "swarm") {
        let avgX = this.arrays.posX[i];
        let avgY = this.arrays.posY[i];
        let count = 1;
        const team = this.arrays.team[i];

        for (let j = 0; j < this.arrays.capacity; j++) {
          if (i === j || !this.arrays.active[j] || this.arrays.state[j] === 3)
            continue;
          if (this.arrays.team[j] !== team) continue;

          const distX = this.arrays.posX[j] - this.arrays.posX[i];
          const distY = this.arrays.posY[j] - this.arrays.posY[i];
          const distSq = distX * distX + distY * distY;

          if (distSq < 25) {
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
          if (Simulator.rng.random() < 0.15) {
            const dirs = [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ];
            const [wanderDx, wanderDy] =
              dirs[Math.floor(Simulator.rng.random() * dirs.length)];
            dx = wanderDx;
            dy = wanderDy;
          }
        }
      } else if (posture === "wander") {
        if (Simulator.rng.random() < 0.15) {
          const dirs = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ];
          const [wanderDx, wanderDy] =
            dirs[Math.floor(Simulator.rng.random() * dirs.length)];
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

    for (const i of this.arrays.activeIndices) {
      if (this.arrays.state[i] === 3) continue;

      if (
        this.arrays.intendedMoveX[i] !== 0 ||
        this.arrays.intendedMoveY[i] !== 0
      ) {
        this.arrays.posX[i] += this.arrays.intendedMoveX[i];
        this.arrays.posY[i] += this.arrays.intendedMoveY[i];

        this.arrays.intendedMoveX[i] = 0;
        this.arrays.intendedMoveY[i] = 0;
      }
    }
  }
}
