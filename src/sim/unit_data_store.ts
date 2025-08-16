import { UnitArrays } from "./unit_arrays";
import { Vec2 } from "../types/Vec2";
import { UnitState, UnitPosture } from "../types/Unit";

/**
 * The ONLY class that knows about the SoA implementation
 * Provides a clean query interface for UnitProxy
 */
export class UnitDataStore {
  private idToIndex: Map<string, number> = new Map();

  constructor(
    private readonly arrays: UnitArrays,
    private readonly coldData: Map<string, any>,
  ) {
    this.rebuildIndex();
  }

  private rebuildIndex(): void {
    this.idToIndex.clear();
    for (let i = 0; i < this.arrays.capacity; i++) {
      if (this.arrays.active[i] && this.arrays.unitIds[i]) {
        this.idToIndex.set(this.arrays.unitIds[i], i);
      }
    }
  }

  private getIndex(unitId: string): number {
    const index = this.idToIndex.get(unitId);
    if (index === undefined) {
      throw new Error(`Unit ${unitId} not found in arrays`);
    }
    return index;
  }

  private getCold(unitId: string): any {
    return this.coldData.get(unitId) || {};
  }

  private setCold(unitId: string, data: any): void {
    this.coldData.set(unitId, data);
  }

  getPosition(unitId: string): Vec2 {
    const idx = this.getIndex(unitId);
    return {
      x: this.arrays.posX[idx],
      y: this.arrays.posY[idx],
    };
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

  getAllActiveIds(): string[] {
    const ids: string[] = [];
    for (let i = 0; i < this.arrays.capacity; i++) {
      if (this.arrays.active[i] && this.arrays.unitIds[i]) {
        ids.push(this.arrays.unitIds[i]);
      }
    }
    return ids;
  }

  isAlive(unitId: string): boolean {
    const idx = this.getIndex(unitId);
    return this.arrays.state[idx] !== 3 && this.arrays.hp[idx] > 0;
  }

  notifyIndexChange(unitId: string, newIndex: number): void {
    this.idToIndex.set(unitId, newIndex);
  }

  removeUnit(unitId: string): void {
    this.idToIndex.delete(unitId);
    this.coldData.delete(unitId);
  }
}
