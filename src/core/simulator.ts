import { MeleeCombat } from "../rules/melee_combat";
import { Knockback } from "../rules/knockback";
import { ProjectileMotion } from "../rules/projectile_motion";

import { UnitMovement } from "../rules/unit_movement";
import { AreaOfEffect } from "../rules/area_of_effect";
import { Rule } from "../rules/rule";
import { UnitBehavior } from "../rules/unit_behavior";
import Cleanup from "../rules/cleanup";
import { Jumping } from "../rules/jumping";
import { AirdropPhysics } from "../rules/airdrop_physics";
import { Tossing } from "../rules/tossing";
import { Abilities } from "../rules/abilities";
import { EventHandler } from "../rules/event_handler";
import { CommandHandler, QueuedCommand } from "../rules/command_handler";
import { HugeUnits } from "../rules/huge_units";
import { SegmentedCreatures } from "../rules/segmented_creatures";
import { GrapplingPhysics } from "../rules/grappling_physics";
import { BiomeEffects } from "../rules/biome_effects";
import { Perdurance } from "../rules/perdurance";
import Particles from "../rules/particles";
import { AmbientBehavior } from "../rules/ambient_behavior";
import { AmbientSpawning } from "../rules/ambient_spawning";
import { StatusEffects } from "../rules/status_effects";
import { RNG } from "./rng";
import { TickContext, TickContextImpl } from "./tick_context";
import { LightningStorm } from "../rules/lightning_storm";
import { Projectile } from "../types/Projectile";
import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";
import { Particle } from "../types/Particle";
import { Action } from "../types/Action";
import { SpatialHash } from "../sim/double_buffer";
import { Transform } from "./transform";
import { SpatialQueryBatcher } from "./spatial_queries";
import { PairwiseBatcher } from "./pairwise_batcher";
import { UnitArrays } from "../sim/unit_arrays";
import { UnitProxy, UnitProxyManager } from "../sim/unit_proxy";
import { UnitDataStore } from "../sim/unit_data_store";
import { GridPartition } from "./grid_partition";
import { ScalarField } from "./ScalarField";
import { TargetCache } from "./target_cache";
import { ParticleArrays } from "../sim/particle_arrays";

class Simulator {
  public sceneBackground: string = "winter";
  public fieldWidth: number;
  public fieldHeight: number;
  public enableEnvironmentalEffects: boolean = false; // Disabled by default for performance

  get width() {
    return this.fieldWidth;
  }
  get height() {
    return this.fieldHeight;
  }

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

  private spatialHash: SpatialHash;
  private dirtyUnits: Set<string> = new Set();
  private positionMap: Map<string, Set<Unit>> = new Map();
  public spatialQueries: SpatialQueryBatcher;
  public pairwiseBatcher: PairwiseBatcher;
  public targetCache: TargetCache;
  public static rng: RNG = new RNG(12345);
  private static randomProtected: boolean = false;

  private lastFrameUnits: Unit[] = [];
  private changedUnits: Set<string> = new Set();

  private gridPartition: GridPartition;

  public proxyManager: UnitProxyManager;
  private unitDataStore: UnitDataStore;
  private proxyCache: UnitProxy[] = [];
  private proxyCacheValid = false;

  get units(): readonly Unit[] {
    if (!this.proxyCacheValid) {
      this.proxyCache = this.proxyManager.getAllProxies();
      this.proxyCacheValid = true;
    }
    return this.proxyCache;
  }

  getUnitArrays(): any {
    return this.unitArrays; // Enable optimized SoA path
  }

  getUnitColdData(): Map<string, any> {
    return this.unitColdData; // Still needed for now
  }

  getUnitsForTransform(): Unit[] {
    return this.units as Unit[];
  }

  setUnitsFromTransform(units: Unit[]): void {
    throw new Error(
      "setUnitsFromTransform is deprecated! Units should be managed through addUnit/removeUnitById only",
    );
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

        this.proxyCacheValid = false;
        return;
      }
    }
  }

  projectiles: Projectile[];
  rulebook: Rule[];
  private commandProcessor: CommandHandler;
  queuedEvents: Action[] = [];
  processedEvents: Action[] = [];
  queuedCommands: QueuedCommand[] = [];

  private lastUnitPositions: Map<string, { x: number; y: number }> = new Map();
  private lastActiveCount: number = 0;
  private hasHugeUnitsRule?: boolean;
  public particleArrays: ParticleArrays = new ParticleArrays(5000); // SoA storage for performance

  get particles(): Particle[] {
    const result: Particle[] = [];
    const arrays = this.particleArrays;

    for (let i = 0; i < arrays.capacity; i++) {
      if (arrays.active[i] === 0) continue; // Skip inactive particles

      const typeId = arrays.type[i];
      result.push({
        id: arrays.particleIds[i] || `particle_${i}`,
        type: this.getParticleTypeName(typeId),
        pos: { x: arrays.posX[i], y: arrays.posY[i] },
        vel: { x: arrays.velX[i], y: arrays.velY[i] },
        radius: arrays.radius[i],
        color: arrays.color[i] || "#FFFFFF",
        lifetime: arrays.lifetime[i],
        z: arrays.z[i],
        landed: arrays.landed[i] === 1,
      });
    }

    return result;
  }

  temperatureField: ScalarField;
  humidityField: ScalarField;
  pressureField: ScalarField;

  weather: {
    current:
      | "clear"
      | "rain"
      | "storm"
      | "snow"
      | "lightning"
      | "sandstorm"
      | "leaves";
    duration: number;
    intensity: number; // 0-1 scale
  };

  winterActive?: boolean;
  lightningActive?: boolean;
  sandstormActive?: boolean;

  private transform: Transform;

  createCommandHandler() {
    return new CommandHandler(this, this.transform);
  }

  getTickContext(): TickContext {
    return new TickContextImpl(this);
  }

  createEventHandler() {
    return new EventHandler();
  }

  public getTransform() {
    return this.transform;
  }

  public recordProcessedEvents(events: Action[]): void {
    this.processedEvents.push(...events);
  }
  public getProxyManager() {
    return this.proxyManager;
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

  constructor(fieldWidth = 128, fieldHeight = 128) {
    this.fieldWidth = fieldWidth;
    this.fieldHeight = fieldHeight;

    this.setupDeterministicRandomness();

    this.spatialHash = new SpatialHash(4); // 4x4 grid cells
    this.dirtyUnits = new Set();
    this.changedUnits = new Set();

    this.spatialQueries = new SpatialQueryBatcher();

    this.pairwiseBatcher = new PairwiseBatcher();

    this.targetCache = new TargetCache();

    this.gridPartition = new GridPartition(fieldWidth, fieldHeight, 4);

    this.unitArrays = new UnitArrays(1000); // Support up to 1000 units

    this.unitColdData = new Map();

    this.unitDataStore = new UnitDataStore(this.unitArrays, this.unitColdData);

    this.proxyManager = new UnitProxyManager(
      this.unitArrays,
      this.unitColdData,
    );

    this.transform = new Transform(this);

    this.temperatureField = new ScalarField(fieldWidth, fieldHeight, 20); // Base temperature ~20°C
    this.humidityField = new ScalarField(fieldWidth, fieldHeight, 0.3); // Base humidity 30%
    this.pressureField = new ScalarField(fieldWidth, fieldHeight, 1.0); // Base pressure 1 atm

    this.weather = {
      current: "clear",
      duration: 0,
      intensity: 0,
    };

    this.reset();
  }

  parseCommand(inputString: string) {
    const parts = inputString.split(" ");
    let type = parts[0];
    const params: Record<string, any> = {};

    switch (type) {
      case "weather":
        params.weatherType = parts[1];
        if (parts[2]) params.duration = parseInt(parts[2]);
        if (parts[3]) params.intensity = parseFloat(parts[3]);
        break;
      case "deploy":
      case "spawn":
        params.unitType = parts[1];
        if (parts[2]) params.x = parseFloat(parts[2]);
        if (parts[3]) params.y = parseFloat(parts[3]);
        break;
      case "airdrop":
      case "drop":
        params.unitType = parts[1];
        params.x = parseFloat(parts[2]);
        params.y = parseFloat(parts[3]);
        break;
      case "lightning":
      case "bolt":
        if (parts[1]) params.x = parseFloat(parts[1]);
        if (parts[2]) params.y = parseFloat(parts[2]);
        break;
      case "temperature":
      case "temp":
        params.amount = parts[1] ? parseFloat(parts[1]) : 20;
        break;
      case "wander":
        params.team = parts[1] || "all";
        params.chance = parts[2] ? parseFloat(parts[2]) : 0.1;
        break;
    }

    const command = { type, params };
    this.queuedCommands.push(command);
    return command;
  }

  paused: boolean = false;

  pause() {
    this.paused = true;
  }

  reset() {
    this.unitArrays.clear();
    this.unitCache.clear();
    this.unitColdData.clear();
    this.proxyCache = [];
    this.proxyCacheValid = false;

    this.proxyManager.clearCache();

    this.projectiles = [];
    this.processedEvents = [];
    this.queuedCommands = [];

    this.commandProcessor = new CommandHandler(this, this.transform);

    this.rulebook = [
      new Abilities(),
      new UnitBehavior(),
      new UnitMovement(),
      new HugeUnits(),
      new SegmentedCreatures(),
      new GrapplingPhysics(),
      new MeleeCombat(),
      new AirdropPhysics(),
      new BiomeEffects(),
      new AmbientSpawning(),
      new AmbientBehavior(),
      new LightningStorm(),
      new AreaOfEffect(),
      new Knockback(),
      new ProjectileMotion(),
      new Particles(this), // TODO: Should use DataQuery interface
      new Jumping(),
      new Tossing(),
      new StatusEffects(),
      new Perdurance(),
      new Cleanup(),
    ];
  }

  addUnit(unit: Partial<Unit>): Unit {
    const hp = unit.hp === undefined ? 100 : unit.hp;
    let u = {
      ...unit,
      id: unit.id || `unit_${Date.now()}`,
      hp: hp,
      team: unit.team || "friendly",
      pos: unit.pos || { x: 1, y: 1 },
      intendedMove: unit.intendedMove || { x: 0, y: 0 },
      maxHp: unit.maxHp || unit.hp || 100,
      sprite: unit.sprite || "default",
      state: unit.state || (hp <= 0 ? "dead" : "idle"),
      mass: unit.mass || 1,
      abilities: unit.abilities || [],
      meta: unit.meta || {},
    } as Unit;

    const index = this.unitArrays.addUnit(u);
    this.dirtyUnits.add(u.id); // Mark as dirty for rendering
    this.proxyCacheValid = false; // Invalidate proxy cache
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

    this.proxyCacheValid = false;

    const proxy = this.proxyManager.getProxy(index);
    this.unitCache.set(u.id, proxy);
    return proxy;
  }

  create(unit: Unit) {
    const newUnit = { ...unit, id: unit.id || `unit_${Date.now()}` };
    const index = this.unitArrays.addUnit(newUnit);

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

    this.proxyCacheValid = false;

    const proxy = this.proxyManager.getProxy(index);
    this.unitCache.set(newUnit.id, proxy);
    return proxy;
  }

  markDirty(unitId: string) {
    this.dirtyUnits.add(unitId);
  }

  getUnitsNear(x: number, y: number, radius: number = 2): Unit[] {
    if (this.gridPartition) {
      return this.gridPartition.getNearby(x, y, radius);
    }

    return this.units.filter((u) => {
      const dx = u.pos.x - x;
      const dy = u.pos.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  hasDirtyUnits(): boolean {
    return this.dirtyUnits.size > 0;
  }

  getDirtyUnits(): Set<string> {
    return new Set(this.dirtyUnits);
  }

  get roster() {
    const sim = this;
    return new Proxy(
      {},
      {
        get(target, prop) {
          if (typeof prop === "string") {
            return sim.units.find((u) => u.id === prop);
          }
          return undefined;
        },
        has(target, prop) {
          if (typeof prop === "string") {
            return sim.units.some((u) => u.id === prop);
          }
          return false;
        },
      },
    );
  }

  tick() {
    this.step(true);
  }

  ticks = 0;
  lastCall: number = 0;
  step(force = false) {
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

    if (!needsSpatialRebuild) {
      const arrays = this.unitArrays;
      for (let i = 0; i < arrays.capacity; i++) {
        if (arrays.active[i] === 0) continue;
        const id = arrays.unitIds[i];
        const lastPos = this.lastUnitPositions.get(id);
        if (
          !lastPos ||
          lastPos.x !== arrays.posX[i] ||
          lastPos.y !== arrays.posY[i]
        ) {
          needsSpatialRebuild = true;
          break;
        }
      }
    }

    if (needsSpatialRebuild) {
      this.spatialHash.clear();
      this.positionMap.clear();
      this.gridPartition.clear();
      this.unitCache.clear();

      const arrays = this.unitArrays;

      const hasHugeUnits = (this.hasHugeUnitsRule ??= this.rulebook.some(
        (r) => r.constructor.name === "HugeUnits",
      ));

      for (let i = 0; i < arrays.capacity; i++) {
        if (arrays.active[i] === 0) continue;

        const id = arrays.unitIds[i];
        const x = arrays.posX[i];
        const y = arrays.posY[i];

        this.spatialHash.insert(id, x, y);

        let proxy = this.unitCache.get(id);
        if (!proxy) {
          proxy = this.proxyManager.getProxy(i);
          this.unitCache.set(id, proxy);
        }
        this.gridPartition.insert(proxy);

        const coldData = this.unitColdData.get(id);
        if (hasHugeUnits && coldData?.meta?.huge) {
          const positions = this.getHugeUnitBodyPositions(proxy);
          for (const pos of positions) {
            const key = `${Math.round(pos.x)},${Math.round(pos.y)}`;
            if (!this.positionMap.has(key)) {
              this.positionMap.set(key, new Set());
            }
            this.positionMap.get(key)!.add(proxy);
          }
        } else {
          const key = `${Math.round(x)},${Math.round(y)}`;
          if (!this.positionMap.has(key)) {
            this.positionMap.set(key, new Set());
          }
          this.positionMap.get(key)!.add(proxy);
        }

        this.lastUnitPositions.set(id, { x, y });
      }

      this.lastActiveCount = arrays.activeCount;
    }

    const context = new TickContextImpl(this);
    for (const rule of this.rulebook) {
      const commands = rule.execute(context);

      if (commands && commands.length > 0) {
        this.queuedCommands.push(...commands);
      }
    }

    this.commandProcessor.execute(context);

    if (false && this.pairwiseBatcher) {
      this.pairwiseBatcher.process(this.units as Unit[], this);

      this.targetCache = this.pairwiseBatcher.targetCache;
    }

    this.updateChangedUnits();

    {
      if (this.projectiles && this.projectiles.length > 0) {
        this.updateProjectilePhysics();
      }

      if (this.particleArrays && this.particleArrays.activeCount > 0) {
        this.updateParticles();
      }

      if (this.enableEnvironmentalEffects) {
        this.updateScalarFields();
        this.updateWeather();

        if (Simulator.rng.random() < 0.02) {
          // 2% chance per tick
          this.spawnLeafParticle();
        }
      }
    }

    this.lastCall = t0;
    return this;
  }

  updateProjectilePhysics() {
    if (!this.projectiles) return;

    const toRemove: number[] = [];

    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];

      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;

      if (p.type === "bomb") {
        p.vel.y += 0.2;
        p.lifetime = (p.lifetime || 0) + 1;
      }

      if (
        p.pos.x < 0 ||
        p.pos.x >= this.fieldWidth ||
        p.pos.y < 0 ||
        p.pos.y >= this.fieldHeight
      ) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.projectiles.splice(toRemove[i], 1);
    }
  }

  updateParticles() {
    const arrays = this.particleArrays;

    arrays.updatePhysics();

    for (let i = 0; i < arrays.capacity; i++) {
      if (arrays.active[i] === 0) continue;

      const type = arrays.type[i];

      if (type === 1) {
        arrays.velX[i] += (Math.random() - 0.5) * 0.02; // Gentle sway
        arrays.velY[i] = Math.min(arrays.velY[i], 0.5); // Terminal velocity
      } else if (type === 2) {
        arrays.velY[i] = 1.0; // Constant fall speed
      } else if (type === 3) {
        arrays.velX[i] = 0; // No horizontal drift
        arrays.velY[i] = 0.15;

        const fieldHeightPx = this.fieldHeight * 8;
        if (arrays.posY[i] >= fieldHeightPx - 1) {
          arrays.landed[i] = 1;
          arrays.posY[i] = fieldHeightPx - 1;
          arrays.velX[i] = 0;
          arrays.velY[i] = 0;
        }
      }

      if (
        arrays.lifetime[i] <= 0 ||
        arrays.posY[i] > this.fieldHeight * 8 ||
        arrays.posX[i] < 0 ||
        arrays.posX[i] > this.fieldWidth * 8
      ) {
        arrays.removeParticle(i);
      }
    }
  }

  private getParticleTypeName(typeId: number): any {
    const types = [
      "",
      "leaf",
      "rain",
      "snow",
      "debris",
      "lightning",
      "sand",
      "energy",
      "magic",
      "grapple_line",
      "test_particle",
      "test",
      "pin",
      "storm_cloud",
      "lightning_branch",
      "electric_spark",
      "power_surge",
      "ground_burst",
      "entangle",
      "tame",
      "calm",
      "heal",
    ];
    return types[typeId] || undefined;
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

  updateLeafParticle(particle: Particle) {
    if (particle.landed) {
      particle.vel.x = 0;
      particle.vel.y = 0;
      particle.lifetime -= 3; // Fade 4x faster when landed (including normal decrement)
      return;
    }

    const gravity = 0.02;
    const airResistance = 0.98;
    const wind = 0.0;

    const sway = Math.sin(this.ticks * 0.05 + particle.pos.x * 0.1) * 0.01;

    particle.vel.y += gravity; // Gravity pulls down
    particle.vel.x += wind + sway; // Wind and swaying
    particle.vel.x *= airResistance;
    particle.vel.y *= airResistance;

    particle.pos.x += particle.vel.x;
    particle.pos.y += particle.vel.y;
    if (particle.z !== undefined) {
      particle.z = Math.max(0, particle.z - Math.abs(particle.vel.y) * 0.5);
    }

    const fieldWidthPixels = this.fieldWidth * 8;
    if (particle.pos.x < 0) particle.pos.x = fieldWidthPixels + particle.pos.x;
    if (particle.pos.x > fieldWidthPixels)
      particle.pos.x = particle.pos.x - fieldWidthPixels;

    if (particle.z !== undefined && particle.z <= 0) {
      particle.landed = true;
      particle.z = 0;

      const gridX = Math.floor(particle.pos.x / 8);
      const gridY = Math.floor(particle.pos.y / 8);
      particle.pos.x = gridX * 8 + 4; // Center of cell
      particle.pos.y = gridY * 8 + 4; // Center of cell

      particle.vel.x = 0; // Stop all movement
      particle.vel.y = 0;
      particle.lifetime = Math.min(particle.lifetime, 20); // Fade quickly after landing
    }
  }

  updateRainParticle(particle: Particle) {
    if (particle.landed) {
      particle.vel.x = 0;
      particle.vel.y = 0;
      return;
    }

    const gravity = 0.1; // Stronger gravity than leaves
    const airResistance = 0.99; // Less air resistance
    const wind = 0.05; // Slight diagonal drift

    particle.vel.y += gravity;
    particle.vel.x += wind;
    particle.vel.x *= airResistance;
    particle.vel.y *= airResistance;

    particle.pos.x += particle.vel.x;
    particle.pos.y += particle.vel.y;
    if (particle.z !== undefined) {
      particle.z = Math.max(0, particle.z - particle.vel.y * 2); // Descend faster than leaves
    }

    if (particle.pos.x < 0) particle.pos.x = this.fieldWidth;
    if (particle.pos.x > this.fieldWidth) particle.pos.x = 0;

    if (particle.z !== undefined && particle.z <= 0) {
      particle.landed = true;
      particle.z = 0;

      const gridX = Math.floor(particle.pos.x / 8);
      const gridY = Math.floor(particle.pos.y / 8);
      particle.pos.x = gridX * 8 + 4; // Center of cell
      particle.pos.y = gridY * 8 + 4; // Center of cell

      particle.vel.x = 0;
      particle.vel.y = 0;
      particle.lifetime = Math.min(particle.lifetime, 30); // Fade quickly when landed

      this.humidityField.addGradient(gridX, gridY, 1, 0.05);
    }
  }

  spawnLeafParticle() {
    this.particleArrays.addParticle({
      pos: {
        x: Simulator.rng.random() * this.fieldWidth,
        y: -2, // Start above the visible area
      },
      vel: {
        x: (Simulator.rng.random() - 0.5) * 0.1, // Small initial horizontal velocity
        y: Simulator.rng.random() * 0.05 + 0.02, // Small downward velocity
      },
      radius: Simulator.rng.random() * 1.5 + 0.5, // Small leaf size
      lifetime: 1000 + Simulator.rng.random() * 500, // Long lifetime for drifting
      z: 10 + Simulator.rng.random() * 20, // Start at various heights
      type: "leaf",
      landed: false,
    });
  }

  updateScalarFields() {
    if (this.ticks % 10 !== 0) return;

    this.temperatureField.decayAndDiffuse(0.002, 0.05); // Temperature
    this.humidityField.decayAndDiffuse(0.005, 0.08); // Humidity
    this.pressureField.decayAndDiffuse(0.01, 0.12); // Pressure

    this.applyFieldInteractions();
  }

  applyFieldInteractions() {
    const startY = (this.ticks % 10) * Math.floor(this.fieldHeight / 10);
    const endY = Math.min(
      startY + Math.floor(this.fieldHeight / 10),
      this.fieldHeight,
    );

    for (let y = startY; y < endY; y++) {
      for (let x = 0; x < this.fieldWidth; x++) {
        const temp = this.temperatureField.get(x, y);
        const humidity = this.humidityField.get(x, y);

        if (temp > 30) {
          const evaporation = (temp - 30) * 0.001;
          this.humidityField.add(x, y, -evaporation);
        }

        if (humidity > 0.8) {
          const condensation = (humidity - 0.8) * 0.01;
          this.humidityField.add(x, y, -condensation);
        }
      }
    }

    // TODO: Use SoA arrays directly or make this a rule
    if (false) {
      for (const unit of this.units) {
        if (unit.meta.phantom) continue;

        if (unit.state !== "dead") {
          const pos = unit.pos;
          const x = pos.x;
          const y = pos.y;
          this.temperatureField.addGradient(x, y, 2, 0.5);
        }

        if (unit.state === "walk" || unit.state === "attack") {
          this.humidityField.addGradient(unit.pos.x, unit.pos.y, 1.5, 0.02);
        }
      }
    }
  }

  get temperature(): number {
    let total = 0;
    let count = 0;
    for (let x = 0; x < this.fieldWidth; x++) {
      for (let y = 0; y < this.fieldHeight; y++) {
        total += this.temperatureField.get(x, y);
        count++;
      }
    }
    return count > 0 ? Math.round(total / count) : 20;
  }

  getTemperature(x: number, y: number): number {
    return this.temperatureField.get(x, y);
  }

  getHumidity(x: number, y: number): number {
    return this.humidityField.get(x, y);
  }

  getPressure(x: number, y: number): number {
    return this.pressureField.get(x, y);
  }

  addHeat(x: number, y: number, intensity: number, radius: number = 2): void {
    this.temperatureField.addGradient(x, y, radius, intensity);
  }

  addMoisture(
    x: number,
    y: number,
    intensity: number,
    radius: number = 3,
  ): void {
    this.humidityField.addGradient(x, y, radius, intensity);
  }

  adjustPressure(
    x: number,
    y: number,
    intensity: number,
    radius: number = 4,
  ): void {
    this.pressureField.addGradient(x, y, radius, intensity);
  }

  updateWeather() {
    if (this.weather.duration > 0) {
      this.weather.duration--;

      this.applyWeatherEffects();

      if (this.weather.duration <= 0) {
        this.weather.current = "clear";
        this.weather.intensity = 0;
      }
    }
  }

  applyWeatherEffects() {
    switch (this.weather.current) {
      case "rain":
        this.applyRainEffects();
        break;
      case "storm":
        this.applyStormEffects();
        break;
      case "leaves":
        this.applyLeavesEffects();
        break;
    }
  }

  applyRainEffects() {
    const intensity = this.weather.intensity;

    for (let i = 0; i < Math.ceil(intensity * 5); i++) {
      const x = Simulator.rng.random() * this.fieldWidth;
      const y = Simulator.rng.random() * this.fieldHeight;
      this.humidityField.addGradient(x, y, 2, intensity * 0.1);
    }

    for (let i = 0; i < Math.ceil(intensity * 3); i++) {
      const x = Simulator.rng.random() * this.fieldWidth;
      const y = Simulator.rng.random() * this.fieldHeight;
      this.temperatureField.addGradient(x, y, 3, -intensity * 2);
    }

    if (Simulator.rng.random() < intensity * 0.5) {
      this.spawnRainParticle();
    }

    this.extinguishFires();
  }

  applyStormEffects() {
    this.applyRainEffects();

    const intensity = this.weather.intensity;

    for (let i = 0; i < Math.ceil(intensity * 3); i++) {
      const x = Simulator.rng.random() * this.fieldWidth;
      const y = Simulator.rng.random() * this.fieldHeight;
      const pressureChange = (Simulator.rng.random() - 0.5) * intensity * 0.2;
      this.pressureField.addGradient(x, y, 4, pressureChange);
    }
  }

  applyLeavesEffects() {
    const intensity = this.weather.intensity;

    if (Simulator.rng.random() < intensity * 0.3) {
      // 30% chance per tick at full intensity

      const leafCount = 1 + Math.floor(Simulator.rng.random() * 3);
      for (let i = 0; i < leafCount; i++) {
        this.particleArrays.addParticle({
          id: `leaf_${Date.now()}_${this.ticks}_${i}`,
          type: "leaf",
          pos: {
            x: Simulator.rng.random() * this.fieldWidth * 8, // Spread across full width
            y: -10 - Simulator.rng.random() * 10, // Start above the field
          },
          vel: {
            x: Simulator.rng.random() * 0.5 - 0.25, // Gentle drift
            y: 0.2 + Simulator.rng.random() * 0.2, // Slow fall
          },
          z: 15 + Simulator.rng.random() * 25, // Varying heights
          lifetime: 400 + Simulator.rng.random() * 200, // Long lifetime to cross field
          radius: 1,
          color: "green",
        });
      }
    }
  }

  setWeather(
    type: "clear" | "rain" | "storm" | "sandstorm" | "leaves",
    duration: number = 80,
    intensity: number = 0.7,
  ): void {
    this.weather.current = type;
    this.weather.duration = duration;
    this.weather.intensity = intensity;

    if (type !== "clear" && duration > 0) {
      this.enableEnvironmentalEffects = true;
    }
  }

  spawnRainParticle() {
    this.particleArrays.addParticle({
      pos: {
        x: Simulator.rng.random() * this.fieldWidth,
        y: -1, // Start above visible area
      },
      vel: {
        x: 0.2 + Simulator.rng.random() * 0.3, // Diagonal movement (right)
        y: 0.8 + Simulator.rng.random() * 0.4, // Fast downward
      },
      radius: 0.5 + Simulator.rng.random() * 0.5, // Small drops
      lifetime: 50 + Simulator.rng.random() * 30, // Short lifetime

      z: 5 + Simulator.rng.random() * 10, // Start at moderate height
      type: "rain",
      landed: false,
    });
  }

  spawnFireParticle(x: number, y: number) {
    this.particleArrays.addParticle({
      pos: { x, y },
      vel: {
        x: (Simulator.rng.random() - 0.5) * 0.4, // Random horizontal spread
        y: -0.2 - Simulator.rng.random() * 0.3, // Upward movement (fire rises)
      },
      radius: 0.8 + Simulator.rng.random() * 0.7, // Variable spark size
      lifetime: 30 + Simulator.rng.random() * 40, // Medium lifetime

      z: Simulator.rng.random() * 3, // Start at ground level to low height
      type: "debris", // Reuse debris type for now
      landed: false,
    });
  }

  setUnitOnFire(unit: Unit) {
    if (unit.meta?.onFire) return; // Already on fire

    this.queuedCommands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          ...unit.meta,
          onFire: true,
          fireDuration: 40, // Burn for 5 seconds at 8fps
          fireTickDamage: 2, // Damage per tick while burning
        },
      },
    });
  }

  processFireEffects() {
    for (const unit of this.units) {
      if (unit.meta && unit.meta.onFire && unit.meta.fireDuration > 0) {
        this.queuedCommands.push({
          type: "damage",
          params: {
            targetId: unit.id,
            amount: unit.meta.fireTickDamage || 2,
            aspect: "fire",
            sourceId: "fire",
          },
        });

        this.queuedCommands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              ...unit.meta,
              fireDuration: unit.meta.fireDuration - 1,
            },
          },
        });

        if (Simulator.rng.random() < 0.3) {
          const offsetX = (Simulator.rng.random() - 0.5) * 2;
          const offsetY = (Simulator.rng.random() - 0.5) * 2;
          this.spawnFireParticle(unit.pos.x + offsetX, unit.pos.y + offsetY);
        }

        this.addHeat(unit.pos.x, unit.pos.y, 3, 1.5);

        if (unit.meta.fireDuration <= 0) {
          unit.meta.onFire = false;
          delete unit.meta.fireDuration;
          delete unit.meta.fireTickDamage;
        }
      }
    }
  }

  extinguishFires() {
    if (this.weather.current === "rain" || this.weather.current === "storm") {
      for (const unit of this.units) {
        if (unit.meta?.onFire) {
          const humidity = this.getHumidity(unit.pos.x, unit.pos.y);
          const temperature = this.getTemperature(unit.pos.x, unit.pos.y);

          if (humidity > 0.6 && temperature < 30) {
            this.queuedCommands.push({
              type: "meta",
              params: {
                unitId: unit.id,
                meta: {
                  ...unit.meta,
                  onFire: false,
                  fireDuration: undefined,
                  fireTickDamage: undefined,
                },
              },
            });
          }
        }
      }
    }
  }

  processWeatherCommand(command: string, ...args: any[]): void {
    switch (command) {
      case "rain":
        const duration = parseInt(args[0]) || 80;
        const intensity = parseFloat(args[1]) || 0.7;
        this.setWeather("rain", duration, intensity);
        break;
      case "storm":
        const stormDuration = parseInt(args[0]) || 120;
        const stormIntensity = parseFloat(args[1]) || 0.9;
        this.setWeather("storm", stormDuration, stormIntensity);
        break;
      case "clear":
        this.setWeather("clear", 0, 0);
        break;
      default:
        console.warn(`Unknown weather command: ${command}`);
    }
  }

  accept(input) {
    this.handleInput(input);
    this.step();
    return this;
  }

  clone() {
    const newSimulator = new Simulator();

    for (let i = 0; i < this.unitArrays.capacity; i++) {
      if (this.unitArrays.active[i] === 0) continue;

      const unit = {
        id: this.unitArrays.unitIds[i],
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
        dmg: this.unitArrays.damage[i],
        sprite:
          this.unitColdData.get(this.unitArrays.unitIds[i])?.sprite ||
          "default",
        abilities:
          this.unitColdData.get(this.unitArrays.unitIds[i])?.abilities || [],
        meta: this.unitColdData.get(this.unitArrays.unitIds[i])?.meta || {},
      } as Unit;
      newSimulator.addUnit(unit);
    }
    return newSimulator;
  }

  validMove(unit, dx, dy) {
    if (!unit) return false;

    if (unit.meta.huge) {
      const bodyPositions = this.getHugeUnitBodyPositions(unit);

      for (const pos of bodyPositions) {
        const newX = pos.x + dx;
        const newY = pos.y + dy;

        if (
          newX < 0 ||
          newX >= this.fieldWidth ||
          newY < 0 ||
          newY >= this.fieldHeight
        ) {
          return false;
        }

        if (this.isApparentlyOccupied(newX, newY, unit)) {
          return false;
        }
      }

      return true;
    }

    const newX = unit.pos.x + dx;
    const newY = unit.pos.y + dy;

    if (
      newX < 0 ||
      newX >= this.fieldWidth ||
      newY < 0 ||
      newY >= this.fieldHeight
    )
      return false;

    return !this.isApparentlyOccupied(newX, newY, unit);
  }

  getHugeUnitBodyPositions(unit) {
    if (!unit.meta.huge) return [unit.pos];

    return [
      unit.pos, // Head
      { x: unit.pos.x, y: unit.pos.y + 1 }, // Body segment 1
      { x: unit.pos.x, y: unit.pos.y + 2 }, // Body segment 2
      { x: unit.pos.x, y: unit.pos.y + 3 }, // Body segment 3
    ];
  }

  getRealUnits() {
    return this.units.filter((unit) => !unit.meta.phantom);
  }

  getApparentUnits() {
    return this.units;
  }

  isApparentlyOccupied(
    x: number,
    y: number,
    excludeUnit: Unit | null = null,
  ): boolean {
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);

    if (this.positionMap.size > 0) {
      const key = `${roundedX},${roundedY}`;
      const unitsAtPos = this.positionMap.get(key);

      if (!unitsAtPos || unitsAtPos.size === 0) {
        return false;
      }

      for (const unit of unitsAtPos) {
        if (unit === excludeUnit) continue;
        if (this.isOwnPhantom(unit, excludeUnit)) continue;
        return true; // Position is occupied
      }

      return false;
    }

    for (const unit of this.units) {
      if (unit === excludeUnit) continue;
      if (unit.state === "dead") continue;

      const positions = this.getHugeUnitBodyPositions(unit);
      for (const pos of positions) {
        if (Math.round(pos.x) === roundedX && Math.round(pos.y) === roundedY) {
          if (!this.isOwnPhantom(unit, excludeUnit)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private isOwnPhantom(unit, owner) {
    if (!unit) return false;

    return (
      (unit.meta && unit.meta.phantom && unit.meta.parentId === owner?.id) ||
      unit === owner
    );
  }

  private unitCache: Map<string, Unit> = new Map();

  creatureById(id) {
    return this.unitCache.get(id);
  }

  objEq(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== "object" || typeof b !== "object") return false;
    if (Object.keys(a).length !== Object.keys(b).length) return false;
    for (const key of Object.keys(a)) {
      if (!b.hasOwnProperty(key) || a[key] !== b[key]) return false;
    }
    return true;
  }

  delta(before: Unit, after: Unit): Partial<Unit> {
    if (before.id !== after.id) {
      throw new Error(`Unit IDs do not match: ${before.id} !== ${after.id}`);
    }

    const changes: Partial<Unit> = {};
    for (const key of Object.keys(before)) {
      if (!this.objEq(before[key], after[key])) {
        changes[key] = after[key];
      }
    }
    return changes;
  }

  prettyPrint(val: any) {
    return (JSON.stringify(val, null, 2) || "")
      .replace(/\n/g, "")
      .replace(/ /g, "");
  }

  attrEmoji: { [key: string]: string } = {
    hp: "❤️",
    mass: "⚖️",
    pos: "📍",
    intendedMove: "➡️",
    intendedTarget: "🎯",
    state: "🛡️",
  };

  private updateChangedUnits(): void {
    return;
  }

  public getChangedUnits(): string[] {
    return Array.from(this.changedUnits);
  }

  public hasUnitChanged(unitId: string): boolean {
    return this.changedUnits.has(unitId);
  }

  _debugUnits(unitsBefore: Unit[], phase: string) {
    let printedPhase = false;
    for (const u of this.units) {
      if (unitsBefore) {
        const before = unitsBefore.find((b) => b.id === u.id);
        if (before) {
          let delta = this.delta(before, u);
          if (Object.keys(delta).length === 0) {
            continue; // No changes, skip detailed logging
          }
          if (!printedPhase) {
            console.debug(`## ${phase}`);
            printedPhase = true;
          }
          let str = `  ${u.id}`;
          Object.keys(delta).forEach((key) => {
            let icon = this.attrEmoji[key] || "|";
            str += ` | ${icon} ${key}: ${this.prettyPrint(before[key])} → ${this.prettyPrint(u[key])}`;
          });
          console.debug(str);
        }
      } else {
        console.debug(`  ${u.id}: (${u.pos.x},${u.pos.y})`, JSON.stringify(u));
      }
    }
  }

  handleInput(input) {
    for (const unit of this.units) {
      const command = input.commands[unit.id];
      if (command) {
        for (const cmd of command) {
          if (cmd.action === "move") {
            if (cmd.target) {
              // Use ProxyManager API for consistency with SoA
              this.proxyManager.setIntendedMove(unit.id, cmd.target);
            }
          }
          if (cmd.action === "fire" && cmd.target) {
            const target = this.units.find((u) => u.id === cmd.target);
            if (target) {
              const dx = target.pos.x - unit.pos.x;
              const dy = target.pos.y - unit.pos.y;
              const mag = Math.sqrt(dx * dx + dy * dy) || 1;
              const speed = 1; // Could be parameterized
              const vel = { x: (dx / mag) * speed, y: (dy / mag) * speed };
              this.projectiles.push({
                id: `proj_${unit.id}_${Date.now()}`,
                pos: { ...unit.pos },
                vel,
                radius: 1.5,
                damage: 5,
                team: unit.team,
                type: "bullet",
              });
            }
          }
        }
      }
    }
    // Invalidate proxy cache after direct SoA updates
    this.proxyCacheValid = false;
    return this;
  }

  unitAt(x: number, y: number): Unit | undefined {
    return this.units.find((u) => u.pos.x === x && u.pos.y === y);
  }

  areaDamage(config: {
    pos: { x: number; y: number };
    radius: number;
    damage: number;
    team: string;
  }) {
    for (const unit of this.units) {
      if (unit.team !== config.team) {
        const dx = unit.pos.x - config.pos.x;
        const dy = unit.pos.y - config.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= config.radius) {
          unit.hp -= config.damage;
        }
      }
    }
  }

  forceAbility(unitId: string, abilityName: string, target?: any): void {
    const unit = this.units.find((u) => u.id === unitId);
    if (
      !unit ||
      !Array.isArray(unit.abilities) ||
      !unit.abilities.includes(abilityName)
    )
      return;

    const abilitiesRule = this.rulebook.find(
      (rule) => rule.constructor.name === "Abilities",
    );
    if (!abilitiesRule) {
      console.warn("Abilities rule not found in rulebook");
      return;
    }

    const jsonAbility = Abilities.all[abilityName];
    if (!jsonAbility) {
      console.warn(`Ability ${abilityName} not found in JSON definitions`);
      return;
    }

    const context = {
      findUnitsInRadius: (center: any, radius: number) =>
        this.getUnitsNear(center.x, center.y, radius),
      findUnitById: (id: string) => this.units.find((u) => u.id === id),
      getAllUnits: () => this.units as readonly any[],
      getUnitsInTeam: (team: string) =>
        this.units.filter((u) => u.team === team),
      getUnitsAt: (pos: any) =>
        this.units.filter(
          (u) =>
            Math.floor(u.pos.x) === Math.floor(pos.x) &&
            Math.floor(u.pos.y) === Math.floor(pos.y),
        ),
      getUnitsInRect: (x: number, y: number, width: number, height: number) =>
        this.units.filter(
          (u) =>
            u.pos.x >= x &&
            u.pos.x < x + width &&
            u.pos.y >= y &&
            u.pos.y < y + height,
        ),
      queueCommand: (cmd: any) => this.queuedCommands.push(cmd),
      queueEvent: (event: any) => this.queuedEvents.push(event),
      getRandom: () => Math.random(), // TODO: Use deterministic RNG
      getCurrentTick: () => this.ticks,
      getFieldWidth: () => this.fieldWidth,
      getFieldHeight: () => this.fieldHeight,
      getProjectiles: () => this.projectiles as readonly any[],
      getParticles: () => this.particles as readonly any[],
      getTemperatureAt: (x: number, y: number) =>
        this.temperatureField?.get?.(x, y) || 20,
      getSceneBackground: () => this.sceneBackground,
    };

    const primaryTarget = target || unit;
    for (const effect of jsonAbility.effects) {
      (abilitiesRule as Abilities).processEffectAsCommand(
        context,
        effect,
        unit,
        primaryTarget,
      );
    }

    this.queuedCommands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          lastAbilityTick: {
            ...unit.lastAbilityTick,
            [abilityName]: this.ticks,
          },
        },
      },
    });
  }
}

export { Simulator };
if (typeof window !== "undefined") {
  // @ts-ignore
  window.Simulator = Simulator; // Expose for browser use
}
