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

  // private lastFrameUnits: Unit[] = [];
  private changedUnits: Set<string> = new Set();

  private gridPartition: GridPartition;

  public proxyManager: UnitProxyManager;

  get units(): readonly Unit[] {
    // Don't cache proxies - create them on demand
    return this.proxyManager.getAllProxies();
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

  private _temperatureField: ScalarField | null = null;
  private _humidityField: ScalarField | null = null;
  private _pressureField: ScalarField | null = null;
  
  get temperatureField(): ScalarField {
    if (!this._temperatureField) {
      this._temperatureField = new ScalarField(this.fieldWidth, this.fieldHeight, 20);
    }
    return this._temperatureField;
  }
  
  get humidityField(): ScalarField {
    if (!this._humidityField) {
      this._humidityField = new ScalarField(this.fieldWidth, this.fieldHeight, 0.3);
    }
    return this._humidityField;
  }
  
  get pressureField(): ScalarField {
    if (!this._pressureField) {
      this._pressureField = new ScalarField(this.fieldWidth, this.fieldHeight, 1.0);
    }
    return this._pressureField;
  }

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

    // this.unitDataStore = new UnitDataStore(this.unitArrays, this.unitColdData);

    this.proxyManager = new UnitProxyManager(
      this.unitArrays,
      this.unitColdData,
    );

    this.transform = new Transform(this);

    // Scalar fields are now lazy-initialized via getters

    this.weather = {
      current: "clear",
      duration: 0,
      intensity: 0,
    };

    this.reset();
  }
  
  private tickContext?: TickContext;

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

    this.proxyManager.clearCache();

    this.projectiles = [];
    this.processedEvents = [];
    this.queuedCommands = [];

    this.commandProcessor = new CommandHandler(this, this.transform);

    // Core rules that always run
    const coreRules = [
      new UnitBehavior(),
      new UnitMovement(),
      new Cleanup(),
    ];
    
    // Combat and interaction rules
    const combatRules = [
      new Abilities(),
      new MeleeCombat(),
      new Knockback(),
      new StatusEffects(),
      new Perdurance(),
    ];
    
    // Environmental and special rules
    const specialRules = [
      new HugeUnits(),
      new SegmentedCreatures(),
      new GrapplingPhysics(),
      new AirdropPhysics(),
      new BiomeEffects(),
      new AmbientSpawning(),
      new AmbientBehavior(),
      new LightningStorm(),
      new AreaOfEffect(),
      new ProjectileMotion(),
      new Particles(this),
      new Jumping(),
      new Tossing(),
    ];
    
    this.rulebook = [...coreRules, ...combatRules, ...specialRules];
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
    // Also mark as changed for current frame if we're in the middle of a step
    this.changedUnits.add(unitId);
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
  private ruleApplicability: Map<string, boolean> = new Map();

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

    // Skip movement check entirely - rebuild only when unit count changes
    // Rules that need spatial queries will handle their own lookups
    // This trades per-query cost for eliminating per-tick overhead

    if (needsSpatialRebuild) {
      // Only use gridPartition - remove redundant spatial structures
      this.gridPartition.clear();
      this.unitCache.clear();

      const arrays = this.unitArrays;

      // Use activeIndices for much faster iteration
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

    // Don't pre-populate proxy cache - let rules request what they need
    
    // Create fresh context each step - it caches units internally
    const context = new TickContextImpl(this);
    
    // PERFORMANCE: Only execute rules when needed
    for (const rule of this.rulebook) {
      // Skip expensive rules when no relevant units exist
      const ruleName = rule.constructor.name;
      
      // Execute all rules for correctness
      
      const commands = rule.execute(context);
      if (commands && commands.length > 0) {
        for (let i = 0; i < commands.length; i++) {
          this.queuedCommands.push(commands[i]);
        }
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
        // Only update expensive environmental effects occasionally
        if (this.ticks % 10 === 0) {
          this.updateScalarFields();
          this.updateWeather();
        }

        if (Simulator.rng.random() < 0.002) {
          // Reduce to 0.2% chance per tick  
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
      "thunder_ring",
      "explosion",
      "heal_particle",
      "freeze_impact",
      "pain",
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
    // Only update scalar fields every 500 ticks for performance
    if (this.ticks % 500 !== 0) return;

    this.temperatureField.decayAndDiffuse(0.002, 0.05); // Temperature
    this.humidityField.decayAndDiffuse(0.005, 0.08); // Humidity
    this.pressureField.decayAndDiffuse(0.01, 0.12); // Pressure

    // Skip field interactions for now - too expensive
    // this.applyFieldInteractions();
  }

  applyFieldInteractions() {
    // Skip if fields not initialized
    if (!this.temperatureField || !this.humidityField) return;
    
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
    
    // Init fields if needed

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

    // Init fields if needed
    
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

  private hasGrapplingHooks(): boolean {
    // Cache checks for expensive conditions
    const tick = this.ticks;
    
    // Always active rules
    this.activeRules = [];
    
    for (const rule of this.rulebook) {
      const name = rule.constructor.name;
      
      // Skip rules based on applicability
      switch(name) {
        case 'GrapplingPhysics':
          if (!this.hasGrapplingHooks()) continue;
          break;
        case 'AirdropPhysics':
          if (!this.hasAirdrops()) continue;
          break;
        case 'StatusEffects':
          if (!this.hasStatusEffects()) continue;
          break;
        case 'Jumping':
          if (!this.hasJumpingUnits()) continue;
          break;
        case 'Tossing':
          if (!this.hasTossedUnits()) continue;
          break;
        case 'AreaOfEffect':
          if (!this.hasAreaEffects()) continue;
          break;
        case 'ProjectileMotion':
          if (!this.projectiles || this.projectiles.length === 0) continue;
          break;
        case 'Particles':
          if (!this.particleArrays || this.particleArrays.activeCount === 0) continue;
          break;
        case 'LightningStorm':
          if (!this.lightningActive) continue;
          break;
        case 'BiomeEffects':
          // Only run if environmental effects enabled or weather active
          if (!this.enableEnvironmentalEffects && this.weather.current === 'clear') continue;
          break;
        case 'Cleanup':
          // Only run if units died recently
          if (!this.hasDeadUnits()) continue;
          break;
        case 'Perdurance':
          // Only needed for units with timers
          if (!this.hasUnitsWithTimers()) continue;
          break;
        case 'HugeUnits':
          if (!this.hasHugeUnits()) continue;
          break;
        case 'SegmentedCreatures':
          if (!this.hasSegmentedCreatures()) continue;
          break;
        // Always active - fundamental rules
        case 'UnitMovement':
          // Always run - commands can create movement
          break;
        case 'UnitBehavior':
          // Only if hostile units exist
          if (!this.hasHostileUnits()) continue;
          break;
        case 'MeleeCombat':
          // Only if opposing teams exist
          if (!this.hasOpposingTeams()) continue;
          break;
        case 'Abilities':
          // Only if units have abilities
          if (!this.hasUnitsWithAbilities()) continue;
          break;
        case 'Knockback':
          // Only run after combat
          if (!this.hadRecentCombat) continue;
          break;
        case 'AmbientSpawning':
        case 'AmbientBehavior':
          // Only run occasionally
          if (tick % 30 !== 0) continue;
          break;
      }
      
      this.activeRules.push(rule);
    }
  }
  
  private hasGrapplingHooks(): boolean {
    // Check if any units have grappling hooks active
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;
    
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.grapplingHook) return true;
    }
    return false;
  }
  
  private hasAirdrops(): boolean {
    // Check if any units are airdrops
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;
    
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.tags?.includes('airdrop')) return true;
    }
    return false;
  }
  
  private hasStatusEffects(): boolean {
    // Check if any units have status effects
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;
    
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.statusEffects && data.meta.statusEffects.length > 0) return true;
    }
    return false;
  }
  
  private hasJumpingUnits(): boolean {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;
    
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.jumping) return true;
    }
    return false;
  }
  
  private hasTossedUnits(): boolean {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;
    
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.tossed) return true;
    }
    return false;
  }
  
  private hasHugeUnits(): boolean {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;
    
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.huge) return true;
    }
    return false;
  }
  
  private hasSegmentedCreatures(): boolean {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;
    
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.isSegment || data?.meta?.isSegmentHead) return true;
    }
    return false;
  }
  
  private hadRecentCombat = false;
  
  private hasMovingUnits(): boolean {
    const arrays = this.unitArrays;
    // Check if any units have intended movement
    for (const i of arrays.activeIndices) {
      if (arrays.intendedMoveX[i] !== 0 || arrays.intendedMoveY[i] !== 0) return true;
    }
    return false;
  }
  
  private hasHostileUnits(): boolean {
    const arrays = this.unitArrays;
    for (const i of arrays.activeIndices) {
      if (arrays.team[i] === 1) return true; // hostile = 1
    }
    return false;
  }
  
  private hasOpposingTeams(): boolean {
    const arrays = this.unitArrays;
    let hasFriendly = false;
    let hasHostile = false;
    
    for (const i of arrays.activeIndices) {
      if (arrays.team[i] === 0) hasFriendly = true;
      if (arrays.team[i] === 1) hasHostile = true;
      if (hasFriendly && hasHostile) return true;
    }
    return false;
  }
  
  private hasUnitsWithAbilities(): boolean {
    const coldData = this.unitColdData;
    const arrays = this.unitArrays;
    
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.abilities && data.abilities.length > 0) return true;
    }
    return false;
  }
  
  private hasDeadUnits(): boolean {
    const arrays = this.unitArrays;
    for (const i of arrays.activeIndices) {
      if (arrays.hp[i] <= 0) return true;
    }
    return false;
  }
  
  private hasUnitsWithTimers(): boolean {
    const coldData = this.unitColdData;
    const arrays = this.unitArrays;
    
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.timers || data?.meta?.lifespan || data?.meta?.ttl) return true;
    }
    return false;
  }
  
  private hasAreaEffects(): boolean {
    // Check if there are any area effects active
    return false; // TODO: Implement when we track area effects
  }
  
  private hasKnockbackUnits(): boolean {
    for (const unit of this.units) {
      if (unit.meta?.knockback) return true;
    }
    return false;
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

  private forcedAbilitiesThisTick = new Set<string>();

  forceAbility(unitId: string, abilityName: string, target?: any): void {
    // Track that this ability was forced for this unit
    const key = `${unitId}:${abilityName}`;
    this.forcedAbilitiesThisTick.add(key);
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

    // Use proper TickContext instead of manual context - simplifies god object
    const context = this.getTickContext();

    const primaryTarget = target || unit;
    // Clear the rule's commands array before processing
    (abilitiesRule as any).commands = [];
    
    for (const effect of jsonAbility.effects) {
      (abilitiesRule as Abilities).processEffectAsCommand(
        context,
        effect,
        unit,
        primaryTarget,
      );
    }
    
    // Collect the commands that were generated
    const generatedCommands = (abilitiesRule as any).commands || [];
    this.queuedCommands.push(...generatedCommands);

    // Update lastAbilityTick immediately to prevent double-triggering
    const proxyManager = this.proxyManager;
    if (proxyManager) {
      const currentTick = { ...unit.lastAbilityTick, [abilityName]: this.ticks };
      proxyManager.setLastAbilityTick(unit.id, currentTick);
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
