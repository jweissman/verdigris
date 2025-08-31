import { Rule } from "../rules/rule";
import { EventHandler } from "../rules/event_handler";
import { CommandHandler, QueuedCommand } from "./command_handler";
import { RulesetFactory } from "./ruleset_factory";
import { RNG } from "./rng";
import { TickContext, TickContextImpl } from "./tick_context";
import { Projectile } from "../types/Projectile";
import { ProjectileArrays } from "../sim/projectile_arrays";
import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";
import { Particle } from "../types/Particle";
import { Action } from "../types/Action";
import { Transform } from "./transform";
import { SpatialQueryBatcher } from "./spatial_queries";
import { PairwiseBatcher } from "./pairwise_batcher";
import { UnitArrays } from "../sim/unit_arrays";
import { UnitProxyManager } from "../sim/unit_proxy";
import { GridPartition } from "./grid_partition";
import { ScalarField } from "./ScalarField";
import { TargetCache } from "./target_cache";
import { ParticleArrays } from "../sim/particle_arrays";
import Encyclopaedia from "../dmg/encyclopaedia";
import { WeatherManager } from "./weather_manager";
import { World } from "./world";
import { MovementValidator } from "./movement_validator";
import { AbilityHandler } from "./ability_handler";
import { ParticleManager } from "./particle_manager";
import { FireEffects } from "./fire_effects";
import { FieldManager } from "./field_manager";
import { DebugHelper } from "./debug_helper";
class Simulator {
  paused: boolean = false;
  ticks = 0;
  lastCall: number = 0;

  private world: World;
  private transform: Transform;
  public rulebook: Rule[];
  private commandProcessor: CommandHandler;

  queuedEvents: Action[] = [];
  private processedEvents: Action[] = [];
  queuedCommands: QueuedCommand[] = [];
  // TODO for symmetry why not processedCommands?
  // private processedCommands: QueuedCommand[] = [];

  private _projectilesCache: Projectile[] = [];
  private _projectilesCacheDirty: boolean = true;
  private abilityHandler: AbilityHandler;
  private changedUnits: Set<string> = new Set();
  private dirtyUnits: Set<string> = new Set();
  private fieldManager: FieldManager;
  private fireEffects: FireEffects;
  private movementValidator: MovementValidator;
  private particleManager: ParticleManager;
  private static randomProtected: boolean = false;
  private weatherManager: WeatherManager;
  projectileArrays: ProjectileArrays;
  public fieldHeight: number;
  public fieldWidth: number;
  public gridPartition: GridPartition;
  public pairwiseBatcher: PairwiseBatcher;
  public proxyManager: UnitProxyManager;
  public spatialQueries: SpatialQueryBatcher;
  public static rng: RNG = new RNG(12345);
  public targetCache: TargetCache;
  public unitSpatialHash: Map<string, number[]> | null = null;
  private unitCache: Map<string, Unit> = new Map();
  public lastUnitPositions: Map<string, { x: number; y: number }> = new Map();
  private lastActiveCount: number = 0;
  public interpolationFactor: number = 0;

  private readonly unitArrays: UnitArrays;
  private readonly unitColdData: Map<
    string,
    {
      sprite: string;
      abilities: any[];
      tags?: string[];
      meta: Record<string, any>;
      intendedTarget?: string | Vec2;
      posture?: string;
      type?: string;
      lastAbilityTick?: Record<string, number>;
    }
  > = new Map();

  constructor(fieldWidth = 128, fieldHeight = 128) {
    this.setupDeterministicRandomness();

    this.fieldWidth = fieldWidth;
    this.fieldHeight = fieldHeight;
    this.weatherManager = new WeatherManager();
    this.world = new World();
    this.movementValidator = new MovementValidator(fieldWidth, fieldHeight);
    this.particleManager = new ParticleManager();
    this.fieldManager = new FieldManager(this.fieldWidth, this.fieldHeight);
    this.fireEffects = new FireEffects(
      this.particleManager,
      this.temperatureField,
      this.humidityField,
    );
    this.dirtyUnits = new Set();
    this.changedUnits = new Set();
    this.spatialQueries = new SpatialQueryBatcher();
    this.pairwiseBatcher = new PairwiseBatcher();
    this.targetCache = new TargetCache();
    this.gridPartition = new GridPartition(fieldWidth, fieldHeight, 4);
    this.unitArrays = new UnitArrays(1000); // Support up to 1000 units
    this.unitColdData = new Map();
    this.proxyManager = new UnitProxyManager(
      this.unitArrays,
      this.unitColdData,
    );
    this.transform = new Transform(this);
    this.reset();
  }

  public step(force = false) {
    if (this.paused) {
      if (!force) {
        return this;
      } else {
        console.debug(`Forcing simulation step while paused.`);
      }
    }

    let t0 = performance.now();
    this.ticks++;
    this.changedUnits = new Set(this.dirtyUnits);
    this.dirtyUnits.clear();
    let needsSpatialRebuild =
      this.ticks === 0 || this.unitArrays.activeCount !== this.lastActiveCount;

    if (needsSpatialRebuild) {
      this.rebuildSpatialPartition();
    }

    const context = new TickContextImpl(this);
    context.clearCache();

    if (this.pairwiseBatcher) {
      this.pairwiseBatcher.intents = [];
    }

    for (const rule of this.rulebook) {
      const commands = rule.execute(context);
      if (commands && commands.length > 0) {
        for (let i = 0; i < commands.length; i++) {
          this.queuedCommands.push(commands[i]);
        }
      }
    }

    this.commandProcessor.execute(context);
    this.updateSystems();
    this.lastCall = t0;
    return this;
  } 

  public reset() {
    this.unitArrays.clear();
    this.unitCache.clear();
    this.unitColdData.clear();
    this.proxyManager.clearCache();
    this.projectileArrays = new ProjectileArrays(500);
    this.processedEvents = [];
    this.queuedCommands = [];
    this.weatherManager = new WeatherManager();
    this.commandProcessor = new CommandHandler(this, this.transform);
    this.rulebook = RulesetFactory.createDefaultRulebook();
    this.abilityHandler = new AbilityHandler(
      this.proxyManager,
      this.rulebook,
      this.ticks,
    );
  }

  get sceneBackground() {
    return this.world.sceneBackground;
  }
  set sceneBackground(value: string) {
    this.world.sceneBackground = value;
  }
  get enableEnvironmentalEffects() {
    return this.world.enableEnvironmentalEffects;
  }
  set enableEnvironmentalEffects(value: boolean) {
    this.world.enableEnvironmentalEffects = value;
  }
  get sceneMetadata() {
    return this.world.sceneMetadata;
  }
  set sceneMetadata(value: Record<string, any>) {
    this.world.sceneMetadata = value;
  }
  get currentBiome() {
    return this.world.currentBiome;
  }
  set currentBiome(value: string | undefined) {
    this.world.currentBiome = value;
  }
  get width() {
    return this.fieldWidth;
  }
  get height() {
    return this.fieldHeight;
  }

  get units(): readonly Unit[] {
    return this.proxyManager.getAllProxies();
  }

  /**
   * Get units with real proxies that stay in sync with arrays
   * NOTE: seemingly only used by mechanist tests???
   */
  get liveUnits(): readonly Unit[] {
    return this.proxyManager.getRealProxies();
  }

  get projectiles(): Projectile[] {
    if (this._projectilesCacheDirty) {
      this._projectilesCache = [];
      const arrays = this.projectileArrays;
      if (arrays) {
        for (let i = 0; i < arrays.capacity; i++) {
          if (arrays.active[i] === 0) continue;
          const proj: any = {
            id: arrays.projectileIds[i],
            pos: { x: arrays.posX[i], y: arrays.posY[i] },
            vel: { x: arrays.velX[i], y: arrays.velY[i] },
            radius: arrays.radius[i],
            damage: arrays.damage[i],
            team:
              arrays.team[i] === 1
                ? "friendly"
                : arrays.team[i] === 2
                  ? "hostile"
                  : "neutral",
            type: ["bullet", "bomb", "grapple", "laser_beam"][
              arrays.type[i]
            ] as any,
            sourceId: arrays.sourceIds[i] || undefined,
          };

          // Add optional fields based on projectile type
          if (arrays.type[i] === 1 || arrays.type[i] === 2) {
            // bomb or grapple have targets
            proj.target = { x: arrays.targetX[i], y: arrays.targetY[i] };
          }
          if (arrays.type[i] === 1) {
            // bomb has origin
            proj.origin = { x: arrays.originX[i], y: arrays.originY[i] };
          }
          if (arrays.progress[i] > 0) proj.progress = arrays.progress[i];
          if (arrays.duration[i] > 0) proj.duration = arrays.duration[i];
          if (arrays.type[i] === 1) {
            // bombs have these fields
            proj.z = arrays.z[i];
            proj.aoeRadius = arrays.aoeRadius[i] || 3; // Default for bombs
          }
          if (arrays.lifetime[i] > 0) proj.lifetime = arrays.lifetime[i];
          if (arrays.explosionRadius[i] !== 3)
            proj.explosionRadius = arrays.explosionRadius[i];
          if (arrays.aspect[i] && arrays.aspect[i] !== "physical")
            proj.aspect = arrays.aspect[i];

          this._projectilesCache.push(proj);
        }
      }
      this._projectilesCacheDirty = false;
    }
    return this._projectilesCache;
  }

  set projectiles(projectiles: Projectile[]) {
    // Clear and repopulate SoA arrays
    this.projectileArrays.clear();
    for (const p of projectiles) {
      this.projectileArrays.addProjectile(p);
    }
    this._projectilesCacheDirty = true;
  }

  invalidateProjectilesCache(): void {
    this._projectilesCacheDirty = true;
  }

  get rules(): Readonly<Rule[]> {
    return this.rulebook;
  }

  get particleArrays() {
    return this.particleManager.particleArrays;
  }

  set particleArrays(value: ParticleArrays) {
    this.particleManager.particleArrays = value;
  }

  get particles(): Particle[] {
    return this.particleManager.particles;
  }

  get temperatureField(): ScalarField {
    return this.fieldManager?.getTemperatureField();
  }

  get humidityField(): ScalarField {
    return this.fieldManager?.getHumidityField();
  }

  get pressureField(): ScalarField {
    return this.fieldManager?.getPressureField();
  }

  // Compatibility for weather
  get weather() {
    return this.weatherManager.weather;
  }
  set weather(value: any) {
    this.weatherManager.weather = value;
  }
  get lightningActive() {
    return this.weatherManager.lightningActive;
  }
  set lightningActive(value: boolean | undefined) {
    this.weatherManager.lightningActive = value;
  }

  // These are derived from weather now
  get winterActive() {
    return this.weatherManager.weather.current === "snow";
  }
  set winterActive(value: boolean) {
    if (value) this.weatherManager.setWeather("snow", 100, 0.5);
    else if (this.weatherManager.weather.current === "snow")
      this.weatherManager.setWeather("clear", 0, 0);
  }
  get sandstormActive() {
    return this.weatherManager.weather.current === "sandstorm";
  }
  set sandstormActive(value: boolean) {
    if (value) this.weatherManager.setWeather("sandstorm", 100, 0.5);
    else if (this.weatherManager.weather.current === "sandstorm")
      this.weatherManager.setWeather("clear", 0, 0);
  }

  get temperature(): number {
    return this.fieldManager.getAverageTemperature();
  }

  public addHeat(
    x: number,
    y: number,
    intensity: number,
    radius: number = 2,
  ): void {
    this.fieldManager.addHeat(x, y, intensity, radius);
  }
  public applyFieldInteractions() {
    this.fieldManager.applyFieldInteractions(this.ticks);
  }
  public createCommandHandler() {
    return new CommandHandler(this, this.transform);
  }
  public createEventHandler() {
    return new EventHandler();
  }
  public getCurrentWeather(): string {
    return this.weatherManager.getCurrentWeather();
  }
  public getHumidity(x: number, y: number): number {
    return this.fieldManager.getHumidity(x, y);
  }
  public getPairwiseBatcher() {
    return this.pairwiseBatcher;
  }
  public getPressure(x: number, y: number): number {
    return this.fieldManager.getPressure(x, y);
  }
  public getProxyManager() {
    return this.proxyManager;
  }
  public getRandomNumber(): number {
    return Simulator.rng?.random() || Math.random();
  }
  public getSandstormDuration(): number {
    return 0;
  }
  public getSandstormIntensity(): number {
    return 0;
  }
  public getTemperature(x: number, y: number): number {
    return this.fieldManager.getTemperature(x, y);
  }
  public getTickContext(): TickContext {
    return new TickContextImpl(this);
  }
  public getTransform() {
    return this.transform;
  }
  public getUnitArrays() {
    return this.unitArrays;
  }
  public getUnitColdData(unitId: string) {
    return this.unitColdData.get(unitId);
  }
  public isAbilityForced(unitId: string, abilityName: string): boolean {
    return this.abilityHandler.isAbilityForced(unitId, abilityName);
  }
  public isSandstormActive(): boolean {
    return this.sandstormActive || false;
  }
  public isWinterActive(): boolean {
    return this.winterActive || false;
  }
  public recordProcessedEvents(events: Action[]): void {
    this.processedEvents.push(...events);
  }
  public setBackground(value: string): void {
    this.sceneBackground = value;
  }
  public setBattleHeight(value: any): void {
    this.sceneMetadata.battleHeight = value;
  }
  public setStripWidth(value: any): void {
    this.sceneMetadata.stripWidth = value;
  }
  public spawnLeafParticle() {
    this.particleManager.spawnLeafParticle(this.fieldWidth, this.fieldHeight);
  }
  public updateParticles() {
    this.particleManager.updateParticles(this.fieldWidth, this.fieldHeight);
  }
  public updateScalarFields() {
    this.fieldManager.updateScalarFields();
  }
  public updateUnitTemperatureEffects() {
    this.fieldManager.updateUnitTemperatureEffects(this.units);
  }
  public hasDirtyUnits(): boolean {
    return this.dirtyUnits.size > 0;
  }
  public getDirtyUnits(): Set<string> {
    return new Set(this.dirtyUnits);
  }
  public tick() {
    this.step(true);
  }
  public creatureById(id) {
    return this.unitCache.get(id);
  }
  public getChangedUnits(): string[] {
    return Array.from(this.changedUnits);
  }
  public hasUnitChanged(unitId: string): boolean {
    return this.changedUnits.has(unitId);
  }
  public validMove(unit, dx, dy) {
    return this.movementValidator.validMove(unit, dx, dy, this.units);
  }
  public getHugeUnitBodyPositions(unit) {
    return this.movementValidator.getHugeUnitBodyPositions(unit);
  }
  public getRealUnits() {
    return this.units.filter((unit) => !unit.meta.phantom);
  }
  public getApparentUnits() {
    return this.units;
  }
  public pause() {
    this.paused = true;
  }

  removeUnitById(unitId: string): void {
    for (let i = 0; i < this.unitArrays.capacity; i++) {
      if (this.unitArrays.active[i] === 0) continue;
      if (this.unitArrays.unitIds[i] === unitId) {
        this.unitArrays.active[i] = 0;
        this.unitArrays.activeCount--;

        const idx = this.unitArrays.activeIndices.indexOf(i);
        if (idx !== -1) {
          this.unitArrays.activeIndices.splice(idx, 1);
        }

        this.proxyManager.notifyUnitRemoved(unitId);
        this.unitCache.delete(unitId);
        this.unitColdData.delete(unitId);
        return;
      }
    }
  }
  private setupDeterministicRandomness(): void {
    if (Simulator.randomProtected) return;

    const originalRandom = Math.random;
    Math.random = () => {
      return Simulator.rng.random();
    };

    (Math as any)._originalRandom = originalRandom;
    Simulator.randomProtected = true;
  }

  parseCommand(inputString: string) {
    const command = CommandHandler.parseCommand(inputString, this);
    this.queuedCommands.push(command);
    return command;
  }


  addUnit(unit: Partial<Unit>): Unit {
    let baseUnit = unit;
    if ((unit as any).type) {
      const unitData = Encyclopaedia.unit((unit as any).type);
      if (unitData) {
        // Merge tags if both exist
        const mergedTags = [...(unitData.tags || []), ...(unit.tags || [])];
        baseUnit = { ...unitData, ...unit, tags: mergedTags };
      }
    }

    const hp = baseUnit.hp === undefined ? 100 : baseUnit.hp;
    let u = {
      ...baseUnit,
      id: baseUnit.id || `unit_${Date.now()}`,
      hp: hp,
      team: baseUnit.team || "friendly",
      pos: baseUnit.pos || { x: 1, y: 1 },
      intendedMove: baseUnit.intendedMove || { x: 0, y: 0 },
      maxHp: baseUnit.maxHp || baseUnit.hp || 100,
      sprite: baseUnit.sprite || "default",
      state: baseUnit.state || (hp <= 0 ? "dead" : "idle"),
      mass: baseUnit.mass || 1,
      abilities: baseUnit.abilities || [],
      meta: baseUnit.meta || {},
    } as Unit;

    const index = this.unitArrays.addUnit(u);

    if (index === -1) {
      return null;
    }

    this.dirtyUnits.add(u.id); // Mark as dirty for rendering
    this.proxyManager.rebuildIndex(); // Ensure proxy index is updated

    this.unitColdData.set(u.id, {
      sprite: u.sprite || "default",
      abilities: u.abilities || [],
      tags: u.tags,
      meta: u.meta || {},
      intendedTarget: u.intendedTarget,
      posture: u.posture,
      type: u.type,
      lastAbilityTick: u.lastAbilityTick,
    });

    this.proxyManager.notifyUnitAdded(u.id, index);

    const proxy = this.proxyManager.getProxy(index);
    this.unitCache.set(u.id, proxy);
    return proxy;
  }

  create(unit: Unit) {
    const newUnit = { ...unit, id: unit.id || `unit_${Date.now()}` };
    const index = this.unitArrays.addUnit(newUnit);

    if (index === -1) {
      return null;
    }

    this.unitColdData.set(newUnit.id, {
      sprite: newUnit.sprite || "default",
      abilities: newUnit.abilities || [],
      tags: newUnit.tags,
      meta: newUnit.meta || {},
      intendedTarget: newUnit.intendedTarget,
      posture: newUnit.posture,
      type: newUnit.type,
      lastAbilityTick: newUnit.lastAbilityTick,
    });

    this.proxyManager.notifyUnitAdded(newUnit.id, index);

    this.dirtyUnits.add(newUnit.id); // Mark as dirty for rendering

    const proxy = this.proxyManager.getProxy(index);
    this.unitCache.set(newUnit.id, proxy);
    return proxy;
  }

  markDirty(unitId: string) {
    this.dirtyUnits.add(unitId);

    this.changedUnits.add(unitId);
  }

  get roster() {
    const proxies = this.proxyManager.getRealProxies();
    const result: any = {};
    for (const proxy of proxies) {
      result[proxy.id] = proxy;
    }
    return result;
  }

  storeUnitPositions(): void {
    // Store current positions for interpolation
    this.lastUnitPositions.clear();
    for (const unit of this.units) {
      this.lastUnitPositions.set(unit.id, {
        x: unit.pos.x,
        y: unit.pos.y,
        z: unit.meta?.z || 0, // Store Z for jump interpolation
      } as any);
    }
  }

  protected rebuildSpatialPartition() {
    this.gridPartition.clear();
    this.unitCache.clear();
    const arrays = this.unitArrays;
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      let proxy = this.unitCache.get(id);
      if (!proxy) {
        proxy = this.proxyManager.getProxy(i);
        this.unitCache.set(id, proxy);
      }
      this.gridPartition.insert(proxy);
    }
    this.lastActiveCount = arrays.activeCount;
  }


  updateSystems() {
    if (this.projectiles && this.projectiles.length > 0) {
      this.updateProjectilePhysics();
    }

    if (this.particleArrays && this.particleArrays.activeCount > 0) {
      this.updateParticles();
    }

    if (this.enableEnvironmentalEffects) {
      this.updateUnitTemperatureEffects();

      if (this.ticks % 10 === 0) {
        this.updateScalarFields();
        this.updateWeather();
      }
    }
  }

  updateProjectilePhysics() {
    if (this.projectileArrays && this.projectileArrays.activeCount > 0) {
      this.invalidateProjectilesCache(); // Physics changes positions
      const outOfBounds = this.projectileArrays.updatePhysics(
        this.fieldWidth,
        this.fieldHeight,
      );

      // Remove out-of-bounds projectiles
      if (outOfBounds.length > 0) {
        for (const idx of outOfBounds) {
          this.projectileArrays.removeProjectile(idx);
        }
      }
    }
  }

  applyVectorizedMovement() {
    const count = this.unitArrays.capacity;
    const posX = this.unitArrays.posX;
    const posY = this.unitArrays.posY;
    const moveX = this.unitArrays.intendedMoveX;
    const moveY = this.unitArrays.intendedMoveY;
    const active = this.unitArrays.active;
    const state = this.unitArrays.state;

    for (let i = 0; i < count; i++) {
      const shouldMove = active[i] * (1 - ((state[i] >> 1) & 1));

      posX[i] += moveX[i] * shouldMove;
      posY[i] += moveY[i] * shouldMove;

      moveX[i] *= 1 - shouldMove;
      moveY[i] *= 1 - shouldMove;
    }
  }

  addMoisture(
    x: number,
    y: number,
    intensity: number,
    radius: number = 3,
  ): void {
    this.fieldManager.addMoisture(x, y, intensity, radius);
  }

  adjustPressure(
    x: number,
    y: number,
    intensity: number,
    radius: number = 4,
  ): void {
    this.fieldManager.adjustPressure(x, y, intensity, radius);
  }

  updateWeather() {
    this.weatherManager.updateWeather();
    this.applyWeatherEffects();
  }

  applyWeatherEffects() {
    const weatherType = this.weatherManager.weather.current;
    const intensity = this.weatherManager.weather.intensity;

    if (weatherType === "rain") {
      this.applyRainEffects();
    } else if (weatherType === "storm") {
      this.applyStormEffects();
    } else if (weatherType === "leaves") {
      this.applyLeavesEffects();
    }
  }

  applyRainEffects() {
    const int = this.weather.intensity;
    const rng = Simulator.rng;
    this.fieldManager.applyRainEffects(int, rng);
    if (rng.random() < int * 0.5) this.spawnRainParticle();
    this.extinguishFires();
  }

  applyStormEffects() {
    this.applyRainEffects();
    const int = this.weather.intensity;
    this.fieldManager.applyStormPressureEffects(int, Simulator.rng);
  }

  applyLeavesEffects() {
    if (Simulator.rng.random() < this.weather.intensity * 0.3) {
      const leafCount = 1 + Math.floor(Simulator.rng.random() * 3);
      for (let i = 0; i < leafCount; i++) {
        this.spawnLeafParticle();
      }
    }
  }

  setWeather(type: string, duration = 80, intensity = 0.7): void {
    this.weatherManager.setWeather(type as any, duration, intensity);
    if (type !== "clear" && duration > 0)
      this.enableEnvironmentalEffects = true;
  }

  spawnRainParticle() {
    this.particleManager.spawnRainParticle(this.fieldWidth, this.fieldHeight);
  }

  spawnFireParticle(x: number, y: number) {
    this.particleManager.spawnFireParticle(x, y);
  }

  setUnitOnFire(unit: Unit) {
    const command = this.fireEffects.setUnitOnFire(unit);
    if (command) {
      this.queuedCommands.push(command);
    }
  }

  processFireEffects() {
    const commands = this.fireEffects.processFireEffects(
      this.units,
      Simulator.rng,
    );
    this.queuedCommands.push(...commands);
  }

  extinguishFires() {
    const commands = this.fireEffects.extinguishFires(
      this.units,
      this.weather.current,
      (x, y) => this.getHumidity(x, y),
      (x, y) => this.getTemperature(x, y),
    );
    this.queuedCommands.push(...commands);
  }

  accept(input) {
    this.handleInput(input);
    this.step();
    return this;
  }

  clone() {
    const newSim = new Simulator();
    for (let i = 0; i < this.unitArrays.capacity; i++) {
      if (this.unitArrays.active[i] === 0) continue;
      const id = this.unitArrays.unitIds[i];
      const data = this.unitColdData.get(id);
      newSim.addUnit({
        id,
        pos: { x: this.unitArrays.posX[i], y: this.unitArrays.posY[i] },
        intendedMove: {
          x: this.unitArrays.intendedMoveX[i],
          y: this.unitArrays.intendedMoveY[i],
        },
        hp: this.unitArrays.hp[i],
        maxHp: this.unitArrays.maxHp[i],
        team: ["friendly", "hostile", "neutral"][this.unitArrays.team[i]],
        state: ["idle", "walk", "attack", "dead"][this.unitArrays.state[i]],
        mass: this.unitArrays.mass[i],
        dmg: this.unitArrays.dmg[i],
        sprite: data?.sprite || "default",
        abilities: data?.abilities || [],
        meta: data?.meta || {},
      } as Unit);
    }
    return newSim;
  }

  isApparentlyOccupied(
    x: number,
    y: number,
    excludeUnit: Unit | null = null,
  ): boolean {
    return this.movementValidator.isApparentlyOccupied(
      x,
      y,
      excludeUnit,
      this.units,
    );
  }

  handleInput(input) {
    for (const unit of this.units) {
      const commands = input.commands[unit.id];
      if (!commands) continue;

      for (const cmd of commands) {
        if (cmd.action === "move" && cmd.target) {
          this.proxyManager.setIntendedMove(unit.id, cmd.target);
        } else if (cmd.action === "fire" && cmd.target) {
          const target = this.units.find((u) => u.id === cmd.target);
          if (target) {
            const dx = target.pos.x - unit.pos.x;
            const dy = target.pos.y - unit.pos.y;
            const mag = Math.sqrt(dx * dx + dy * dy) || 1;
            const vel = { x: dx / mag, y: dy / mag };
            const offset = 0.5;

            this.invalidateProjectilesCache();
            this.projectileArrays.addProjectile({
              id: `proj_${unit.id}_${Date.now()}`,
              pos: {
                x: unit.pos.x + vel.x * offset,
                y: unit.pos.y + vel.y * offset,
              },
              vel,
              radius: 1.5,
              damage: 5,
              team: unit.team,
              type: "bullet" as const,
            });
          }
        }
      }
    }
    return this;
  }

  processWeatherCommand(command: string, ...args: any[]): void {
    this.weatherManager.processWeatherCommand(command, ...args);
  }

  _debugUnits(unitsBefore: Unit[], phase: string) {
    const debugHelper = new DebugHelper();
    debugHelper.debugUnits(this.units as any, unitsBefore, phase);
  }

  forceAbility(unitId: string, abilityName: string, target?: any): void {
    this.abilityHandler.updateTicks(this.ticks);
    const commands = this.abilityHandler.forceAbility(
      unitId,
      abilityName,
      this.units,
      this.getTickContext(),
      target,
    );
    this.queuedCommands.push(...commands);
  }

  // todo -- systems should not just write events onto us!!
  // enqueue(event: Action) {
  //   this.queuedEvents.push(event);
  // }
}

export { Simulator };
if (typeof window !== "undefined") {
  // @ts-ignore
  window.Simulator = Simulator; // Expose for browser use
}
