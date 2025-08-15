import { MeleeCombat } from "../rules/melee_combat";
import { Knockback } from "../rules/knockback";
import { ProjectileMotion } from "../rules/projectile_motion";
// Physics now handled directly in simulator.step()
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
  public sceneBackground: string = 'winter'; 
  public fieldWidth: number;
  public fieldHeight: number;
  public enableEnvironmentalEffects: boolean = false; // Disabled by default for performance
  
  // Aliases for backward compatibility  
  get width() { return this.fieldWidth; }
  get height() { return this.fieldHeight; }

  private readonly unitArrays: UnitArrays;
  private readonly unitColdData: Map<string, {
    sprite: string;
    abilities: any[];
    tags?: string[];
    meta: Record<string, any>;
    intendedTarget?: string | Vec2;
    posture?: string;
    type?: string;
    lastAbilityTick?: Record<string, number>;
  }> = new Map();
  
  private spatialHash: SpatialHash;
  private dirtyUnits: Set<string> = new Set();
  private positionMap: Map<string, Set<Unit>> = new Map();
  public spatialQueries: SpatialQueryBatcher;
  public pairwiseBatcher: PairwiseBatcher;
  public targetCache: TargetCache;
  public static rng: RNG = new RNG(12345);
  private static randomProtected: boolean = false;
  
  // Track units that changed this frame for render deltas
  private lastFrameUnits: Unit[] = [];
  private changedUnits: Set<string> = new Set();
  
  
  // Grid partition for O(1) spatial queries
  private gridPartition: GridPartition;
  
  // Proxy cache to avoid recreating them
  public proxyManager: UnitProxyManager;
  private unitDataStore: UnitDataStore;
  private proxyCache: UnitProxy[] = [];
  private proxyCacheValid = false;
  
  // Return proxies that wrap the SoA arrays
  get units(): readonly Unit[] {
    if (!this.proxyCacheValid) {
      // Only rebuild the array if cache is invalid
      // Reuse existing proxy objects where possible
      this.proxyCache = this.proxyManager.getAllProxies();
      this.proxyCacheValid = true;
    }
    return this.proxyCache;
  }
  
  
  // Arrays are now fully encapsulated in ProxyManager
  // Use ProxyManager.batchMove(), batchFindTargets(), etc for performance
  getUnitArrays(): any {
    return null; // Force fallback to non-array paths
  }
  
  getUnitColdData(): Map<string, any> {
    return this.unitColdData; // Still needed for now
  }
  
  
  // Get units for Transform
  getUnitsForTransform(): Unit[] {
    return this.units as Unit[];
  }
  
  // Deprecated - should not be called anymore
  // Units are managed through SoA arrays only
  setUnitsFromTransform(units: Unit[]): void {
    throw new Error('setUnitsFromTransform is deprecated! Units should be managed through addUnit/removeUnitById only');
  }
  
  // Remove a unit by ID
  removeUnitById(unitId: string): void {
    // Find the unit index by scanning the arrays
    for (let i = 0; i < this.unitArrays.capacity; i++) {
      if (this.unitArrays.active[i] === 0) continue;
      if (this.unitArrays.unitIds[i] === unitId) {
        // Mark as inactive in arrays
        this.unitArrays.active[i] = 0;
        this.unitArrays.activeCount--;
        
        // Remove from activeIndices
        const idx = this.unitArrays.activeIndices.indexOf(i);
        if (idx !== -1) {
          this.unitArrays.activeIndices.splice(idx, 1);
        }
        
        // Notify proxy manager
        this.proxyManager.notifyUnitRemoved(unitId);
        this.unitCache.delete(unitId);
        this.unitColdData.delete(unitId);
        
        // Invalidate proxy cache
        this.proxyCacheValid = false;
        return;
      }
    }
  }
  
  projectiles: Projectile[];
  rulebook: Rule[];
  queuedEvents: Action[] = [];
  processedEvents: Action[] = [];
  queuedCommands: QueuedCommand[] = [];
  public particleArrays: ParticleArrays = new ParticleArrays(5000); // SoA storage for performance
  
  // Legacy interface - getter that creates particle objects from SoA arrays
  get particles(): Particle[] {
    const result: Particle[] = [];
    const arrays = this.particleArrays;
    
    // Iterate through all slots and check active flag
    for (let i = 0; i < arrays.capacity; i++) {
      if (arrays.active[i] === 0) continue; // Skip inactive particles
      
      const typeId = arrays.type[i];
      result.push({
        id: arrays.particleIds[i] || `particle_${i}`,
        type: this.getParticleTypeName(typeId),
        pos: { x: arrays.posX[i], y: arrays.posY[i] },
        vel: { x: arrays.velX[i], y: arrays.velY[i] },
        radius: arrays.radius[i],
        color: arrays.color[i] || '#FFFFFF',
        lifetime: arrays.lifetime[i],
        z: arrays.z[i],
        landed: arrays.landed[i] === 1
      });
    }
    
    return result;
  }
  
  // Scalar fields for environmental effects
  temperatureField: ScalarField;
  humidityField: ScalarField;
  pressureField: ScalarField;
  
  // Weather system
  weather: {
    current: 'clear' | 'rain' | 'storm' | 'snow' | 'lightning' | 'sandstorm' | 'leaves';
    duration: number; // ticks remaining for current weather
    intensity: number; // 0-1 scale
  };
  
  // Environmental states
  winterActive?: boolean;
  lightningActive?: boolean;
  sandstormActive?: boolean;
  
  // Transform for controlled mutations
  private transform: Transform;
  
  // Factory methods for rules that need Transform
  createCommandHandler() {
    return new CommandHandler(this, this.transform);
  }
  
  // Get a TickContext for this simulator
  getTickContext(): TickContext {
    return new TickContextImpl(this);
  }
  
  createEventHandler() {
    return new EventHandler();
  }

  public getTransform() { return this.transform; }
  
  // Called by CommandHandler after processing events
  public recordProcessedEvents(events: Action[]): void {
    this.processedEvents.push(...events);
  }
  public getProxyManager() { return this.proxyManager; }

  private setupDeterministicRandomness(): void {
    if (Simulator.randomProtected) return;
    
    // Replace Math.random with our seeded RNG
    const originalRandom = Math.random;
    Math.random = () => {
      // console.warn('⚠️  NON-DETERMINISTIC Math.random() called! Use Simulator.rng.random() instead');
      // console.trace(); // Show stack trace to find the caller
      return Simulator.rng.random();
    };
    
    // Store original for potential restoration
    (Math as any)._originalRandom = originalRandom;
    Simulator.randomProtected = true;
  }

  constructor(fieldWidth = 128, fieldHeight = 128) {
    this.fieldWidth = fieldWidth;
    this.fieldHeight = fieldHeight;
    
    // Protect against non-deterministic Math.random usage
    this.setupDeterministicRandomness();
    
    // Initialize spatial hash for collision detection
    this.spatialHash = new SpatialHash(4); // 4x4 grid cells
    this.dirtyUnits = new Set();
    this.changedUnits = new Set();
    
    // Initialize spatial query batcher
    this.spatialQueries = new SpatialQueryBatcher();
    
    // Initialize pairwise batcher
    this.pairwiseBatcher = new PairwiseBatcher();
    
    // Initialize target cache for centralized target finding
    this.targetCache = new TargetCache();
    
    // Initialize grid partition for spatial queries (4x4 cells)
    this.gridPartition = new GridPartition(fieldWidth, fieldHeight, 4);
    
    // Initialize SoA storage for performance
    this.unitArrays = new UnitArrays(1000); // Support up to 1000 units
    
    // Initialize cold data storage
    this.unitColdData = new Map();
    
    // Initialize data store - the ONLY place that knows about SoA
    this.unitDataStore = new UnitDataStore(this.unitArrays, this.unitColdData);
    
    // Initialize proxy manager (for backward compatibility during transition)
    this.proxyManager = new UnitProxyManager(this.unitArrays, this.unitColdData);
    
    // Initialize transform for controlled mutations
    this.transform = new Transform(this);
    
    // Initialize scalar fields
    this.temperatureField = new ScalarField(fieldWidth, fieldHeight, 20); // Base temperature ~20°C
    this.humidityField = new ScalarField(fieldWidth, fieldHeight, 0.3); // Base humidity 30%
    this.pressureField = new ScalarField(fieldWidth, fieldHeight, 1.0); // Base pressure 1 atm
    
    // Initialize weather system
    this.weather = {
      current: 'clear',
      duration: 0,
      intensity: 0
    };
    
    this.reset();
  }

  parseCommand(inputString: string) {
    const parts = inputString.split(' ');
    let type = parts[0];
    const params: Record<string, any> = {};
    
    // Parse command-specific parameters directly
    switch (type) {
      case 'weather':
        params.weatherType = parts[1];
        if (parts[2]) params.duration = parseInt(parts[2]);
        if (parts[3]) params.intensity = parseFloat(parts[3]);
        break;
      case 'deploy':
      case 'spawn':
        params.unitType = parts[1];
        if (parts[2]) params.x = parseFloat(parts[2]);
        if (parts[3]) params.y = parseFloat(parts[3]);
        break;
      case 'airdrop':
      case 'drop':
        params.unitType = parts[1];
        params.x = parseFloat(parts[2]);
        params.y = parseFloat(parts[3]);
        break;
      case 'lightning':
      case 'bolt':
        if (parts[1]) params.x = parseFloat(parts[1]);
        if (parts[2]) params.y = parseFloat(parts[2]);
        break;
      case 'temperature':
      case 'temp':
        params.amount = parts[1] ? parseFloat(parts[1]) : 20;
        break;
      case 'wander':
        params.team = parts[1] || 'all';
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
    // Clear SoA storage and proxy cache
    this.unitArrays.clear();
    this.unitCache.clear();
    this.unitColdData.clear();
    this.proxyCache = [];
    this.proxyCacheValid = false;
    // CRITICAL: Clear proxy manager's cache too!
    this.proxyManager.clearCache();
    
    this.projectiles = [];
    this.processedEvents = [];
    this.queuedCommands = [];
    this.rulebook = [
      // ALL RULES ENABLED - let's make them fast!
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
      new Particles(this),
      new Jumping(),
      new Tossing(),
      new StatusEffects(),
      new Perdurance(),
      new Cleanup(),
      new CommandHandler(this, this.transform)
    ];
  }

  addUnit(unit: Partial<Unit>): Unit {
    const hp = unit.hp === undefined ? 100 : unit.hp;
    let u = {
      ...unit,
      id: unit.id || `unit_${Date.now()}`,
      hp: hp,
      team: unit.team || 'friendly',
      pos: unit.pos || { x: 1, y: 1 },
      intendedMove: unit.intendedMove || { x: 0, y: 0 },
      maxHp: unit.maxHp || unit.hp || 100,
      sprite: unit.sprite || 'default',
      state: unit.state || (hp <= 0 ? 'dead' : 'idle'),
      mass: unit.mass || 1,
      abilities: unit.abilities || [],
      meta: unit.meta || {}
    } as Unit;
    
    // Add to SoA storage (stores full unit AND breaks out hot data)
    const index = this.unitArrays.addUnit(u);
    this.dirtyUnits.add(u.id); // Mark as dirty for rendering
    this.proxyCacheValid = false; // Invalidate proxy cache
    this.proxyManager.rebuildIndex(); // Ensure proxy index is updated
    
    // Store cold data separately
    this.unitColdData.set(u.id, {
      sprite: u.sprite || 'default',
      abilities: u.abilities || [],
      tags: u.tags,
      meta: u.meta || {},
      intendedTarget: u.intendedTarget,
      posture: u.posture,
      type: u.type,
      lastAbilityTick: u.lastAbilityTick
    });
    
    // Notify proxy manager about the new unit
    this.proxyManager.notifyUnitAdded(u.id, index);
    
    // Invalidate proxy cache
    this.proxyCacheValid = false;
    
    // Use proxy manager to get/create proxy
    const proxy = this.proxyManager.getProxy(index);
    this.unitCache.set(u.id, proxy);
    return proxy;
  }

  create(unit: Unit) {
    const newUnit = { ...unit, id: unit.id || `unit_${Date.now()}` };
    const index = this.unitArrays.addUnit(newUnit);
    
    // Store cold data
    this.unitColdData.set(newUnit.id, {
      sprite: newUnit.sprite || 'default',
      abilities: newUnit.abilities || [],
      tags: newUnit.tags,
      meta: newUnit.meta || {},
      intendedTarget: newUnit.intendedTarget,
      posture: newUnit.posture,
      type: newUnit.type,
      lastAbilityTick: newUnit.lastAbilityTick
    });
    
    // Notify proxy manager about the new unit
    this.proxyManager.notifyUnitAdded(newUnit.id, index);
    
    this.dirtyUnits.add(newUnit.id); // Mark as dirty for rendering
    
    // Invalidate proxy cache
    this.proxyCacheValid = false;
    
    // Use proxy manager to get/create proxy
    const proxy = this.proxyManager.getProxy(index);
    this.unitCache.set(newUnit.id, proxy);
    return proxy;
  }
  
  // Mark a unit as modified (needs re-rendering)
  markDirty(unitId: string) {
    this.dirtyUnits.add(unitId);
  }
  
  // Get units near a position using grid partition for O(1) performance
  getUnitsNear(x: number, y: number, radius: number = 2): Unit[] {
    // Use grid partition if available (much faster!)
    if (this.gridPartition) {
      return this.gridPartition.getNearby(x, y, radius);
    }
    
    // Fallback to O(n) search if grid not initialized
    return this.units.filter(u => {
      const dx = u.pos.x - x;
      const dy = u.pos.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }
  
  // Check if any units are dirty (need re-rendering)
  hasDirtyUnits(): boolean {
    return this.dirtyUnits.size > 0;
  }
  
  // Sync units to SoA for performance-critical operations
  
  
  // Get list of dirty unit IDs
  getDirtyUnits(): Set<string> {
    return new Set(this.dirtyUnits);
  }
  

  get roster() {
    return Object.fromEntries(this.units.map(unit => [unit.id, unit]));
  }
  

  tick() { this.step(true); }

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
    
    // Save dirty units from last frame for getChangedUnits()
    this.changedUnits = new Set(this.dirtyUnits);
    
    // Clear dirty tracking for this frame
    this.dirtyUnits.clear();
    
    // Build proxy cache once at start of tick for all rules to share
    // Note: This is still expensive - we need to migrate rules to use spatial queries
    this.proxyCacheValid = false; // Force rebuild at start of tick
    const _ = this.units; // Build the cache
    
    // Skip expensive double buffering - just work on the main array
    // The overliteral double buffer was hurting performance
    
    // Always rebuild spatial structures - they enable O(1) neighbor queries!
    // Use SoA arrays to avoid proxy overhead
    {
      this.spatialHash.clear();
      this.positionMap.clear();
      this.gridPartition.clear();
      this.unitCache.clear();
      
      const arrays = this.unitArrays;
      const hasHugeUnits = this.rulebook.some(r => r.constructor.name === 'HugeUnits');
      
      for (let i = 0; i < arrays.capacity; i++) {
        if (arrays.active[i] === 0) continue;
        
        const id = arrays.unitIds[i];
        const x = arrays.posX[i];
        const y = arrays.posY[i];
        
        // Insert into spatial hash
        this.spatialHash.insert(id, x, y);
        
        // Get proxy for grid partition (needed for spatial queries)
        const proxy = this.proxyManager.getProxy(i);
        this.unitCache.set(id, proxy);
        this.gridPartition.insert(proxy);
        
        // For huge units, we need special handling
        const coldData = this.unitColdData.get(id);
        if (hasHugeUnits && coldData?.meta?.huge) {
          
          // Add all body positions for huge units
          const positions = this.getHugeUnitBodyPositions(proxy);
          for (const pos of positions) {
            const key = `${Math.round(pos.x)},${Math.round(pos.y)}`;
            if (!this.positionMap.has(key)) {
              this.positionMap.set(key, new Set());
            }
            this.positionMap.get(key)!.add(proxy);
          }
        } else {
          // Regular units - no proxy needed
          const key = `${Math.round(x)},${Math.round(y)}`;
          if (!this.positionMap.has(key)) {
            this.positionMap.set(key, new Set());
          }
          this.positionMap.get(key)!.add(id as any);
        }
      }
    }
    
      // Execute rules - all rules use context now
      const context = new TickContextImpl(this);
      for (const rule of this.rulebook) {
        rule.execute(context);
      }
      
      // Movement is handled by ForcesCommand via UnitMovement rule
      // Uncomment below to test pure vectorized movement without collision detection:
      // this.applyVectorizedMovement();
    
    // Phase 2: Process ALL pairwise intents in a single pass
    // DISABLED: This calls this.units which creates proxies!
    if (false && this.pairwiseBatcher) {
      // Always process to update target cache, even if no intents
      this.pairwiseBatcher.process(this.units, this);
      // Copy the populated target cache to simulator
      this.targetCache = this.pairwiseBatcher.targetCache;
    }
    
    // Track changed units for render deltas
    this.updateChangedUnits();
    
    // Process environmental updates only if needed
    {
      // Only update projectiles if there are any
      if (this.projectiles && this.projectiles.length > 0) {
        this.updateProjectilePhysics();
      }
      
      // Only update particles if there are any
      if (this.particleArrays && this.particleArrays.activeCount > 0) {
        this.updateParticles();
      }
      
      // Scalar fields and weather are optional features
      if (this.enableEnvironmentalEffects) {
        this.updateScalarFields();
        this.updateWeather();
        
        // Spawn environmental particles occasionally
        if (Simulator.rng.random() < 0.02) { // 2% chance per tick
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
    
    // Update all projectile positions in a single pass
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      
      // Update position
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;
      
      // Apply gravity for bombs
      if (p.type === 'bomb') {
        p.vel.y += 0.2;
        p.lifetime = (p.lifetime || 0) + 1;
      }
      
      // Mark for removal if out of bounds
      if (p.pos.x < 0 || p.pos.x >= this.fieldWidth ||
          p.pos.y < 0 || p.pos.y >= this.fieldHeight) {
        toRemove.push(i);
      }
    }
    
    // Remove out-of-bounds projectiles
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.projectiles.splice(toRemove[i], 1);
    }
  }
  
  updateParticles() {
    // Use vectorized particle physics for massive speedup!
    const arrays = this.particleArrays;
    
    // Update all particles in one vectorized pass
    arrays.updatePhysics();
    
    // Apply type-specific physics in vectorized loops
    for (let i = 0; i < arrays.capacity; i++) {
      if (arrays.active[i] === 0) continue;
      
      const type = arrays.type[i];
      
      // Leaf particles: gentle floating
      if (type === 1) { // leaf
        arrays.velX[i] += (Math.random() - 0.5) * 0.02; // Gentle sway
        arrays.velY[i] = Math.min(arrays.velY[i], 0.5); // Terminal velocity
      }
      // Rain particles: straight down
      else if (type === 2) { // rain
        arrays.velY[i] = 1.0; // Constant fall speed
      }
      // Snow particles: straight down (no drift for test compatibility)
      else if (type === 3) { // snow
        arrays.velX[i] = 0; // No horizontal drift
        arrays.velY[i] = 0.15;
      }
      
      // Remove if lifetime expired or out of bounds (in pixels)
      if (arrays.lifetime[i] <= 0 || 
          arrays.posY[i] > this.fieldHeight * 8 ||
          arrays.posX[i] < 0 || arrays.posX[i] > this.fieldWidth * 8) {
        arrays.removeParticle(i);
      }
    }
    
    // Legacy array is now handled by the getter, no sync needed
  }
  
  private getParticleTypeName(typeId: number): any {
    const types = ['', 'leaf', 'rain', 'snow', 'debris', 'lightning', 'sand', 'energy', 'magic', 'grapple_line', 'test_particle', 'test', 'pin', 'storm_cloud', 'lightning_branch', 'electric_spark', 'power_surge', 'ground_burst'];
    return types[typeId] || undefined;
  }
  
  // Vectorized movement update using SoA arrays directly
  applyVectorizedMovement() {
    const count = this.unitArrays.capacity;
    const posX = this.unitArrays.posX;
    const posY = this.unitArrays.posY;
    const moveX = this.unitArrays.intendedMoveX;
    const moveY = this.unitArrays.intendedMoveY;
    const active = this.unitArrays.active;
    const state = this.unitArrays.state;
    
    // TRUE vectorization - no branches in the hot loop!
    // The compiler can SIMD this across multiple elements at once
    for (let i = 0; i < count; i++) {
      // Compute mask: 1 if unit should move, 0 otherwise
      const shouldMove = active[i] * (1 - (state[i] >> 1 & 1)); // active AND not dead
      
      // Branchless update using mask
      posX[i] += moveX[i] * shouldMove;
      posY[i] += moveY[i] * shouldMove;
      
      // Clear intended move
      moveX[i] *= (1 - shouldMove);
      moveY[i] *= (1 - shouldMove);
    }
  }
  
  updateLeafParticle(particle: Particle) {
    if (particle.landed) {
      // Landed leaves just sit there and fade quickly - NO movement at all
      particle.vel.x = 0;
      particle.vel.y = 0;
      particle.lifetime -= 3; // Fade 4x faster when landed (including normal decrement)
      return;
    }
    
    // Falling with air resistance and drift
    const gravity = 0.02;
    const airResistance = 0.98;
    const wind = 0.000;
    
    // Add some gentle swaying motion
    const sway = Math.sin(this.ticks * 0.05 + particle.pos.x * 0.1) * 0.01;
    
    // Update velocity
    particle.vel.y += gravity; // Gravity pulls down
    particle.vel.x += wind + sway; // Wind and swaying
    particle.vel.x *= airResistance;
    particle.vel.y *= airResistance;
    
    // Update position
    particle.pos.x += particle.vel.x;
    particle.pos.y += particle.vel.y;
    if (particle.z !== undefined) {
      // Descend in 3D - z decreases as particle falls (vel.y is positive when falling)
      particle.z = Math.max(0, particle.z - Math.abs(particle.vel.y) * 0.5);
    }
    
    // Wrap around field horizontally (in pixel coordinates)
    const fieldWidthPixels = this.fieldWidth * 8;
    if (particle.pos.x < 0) particle.pos.x = fieldWidthPixels + particle.pos.x;
    if (particle.pos.x > fieldWidthPixels) particle.pos.x = particle.pos.x - fieldWidthPixels;
    
    // Land when reaching ground level
    if (particle.z !== undefined && particle.z <= 0) {
      particle.landed = true;
      particle.z = 0;
      
      // Snap to center of nearest grid cell
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
      // Landed rain just sits and fades quickly
      particle.vel.x = 0;
      particle.vel.y = 0;
      return;
    }
    
    // Rain falls fast and straight with slight diagonal movement
    const gravity = 0.1; // Stronger gravity than leaves
    const airResistance = 0.99; // Less air resistance
    const wind = 0.05; // Slight diagonal drift
    
    // Update velocity
    particle.vel.y += gravity;
    particle.vel.x += wind;
    particle.vel.x *= airResistance;
    particle.vel.y *= airResistance;
    
    // Update position
    particle.pos.x += particle.vel.x;
    particle.pos.y += particle.vel.y;
    if (particle.z !== undefined) {
      particle.z = Math.max(0, particle.z - particle.vel.y * 2); // Descend faster than leaves
    }
    
    // Wrap around field horizontally
    if (particle.pos.x < 0) particle.pos.x = this.fieldWidth;
    if (particle.pos.x > this.fieldWidth) particle.pos.x = 0;
    
    // Land when reaching ground level
    if (particle.z !== undefined && particle.z <= 0) {
      particle.landed = true;
      particle.z = 0;
      
      // Snap to center of nearest grid cell
      const gridX = Math.floor(particle.pos.x / 8);
      const gridY = Math.floor(particle.pos.y / 8);
      particle.pos.x = gridX * 8 + 4; // Center of cell
      particle.pos.y = gridY * 8 + 4; // Center of cell
      
      particle.vel.x = 0;
      particle.vel.y = 0;
      particle.lifetime = Math.min(particle.lifetime, 30); // Fade quickly when landed
      
      // Add moisture to the field where rain lands (use grid coordinates)
      this.humidityField.addGradient(gridX, gridY, 1, 0.05);
    }
  }
  
  spawnLeafParticle() {
    // Add particle directly to SoA arrays for performance
    this.particleArrays.addParticle({
      pos: {
        x: Simulator.rng.random() * this.fieldWidth,
        y: -2 // Start above the visible area
      },
      vel: {
        x: (Simulator.rng.random() - 0.5) * 0.1, // Small initial horizontal velocity
        y: Simulator.rng.random() * 0.05 + 0.02  // Small downward velocity
      },
      radius: Simulator.rng.random() * 1.5 + 0.5, // Small leaf size
      lifetime: 1000 + Simulator.rng.random() * 500, // Long lifetime for drifting
      z: 10 + Simulator.rng.random() * 20, // Start at various heights
      type: 'leaf',
      landed: false
    });
  }

  updateScalarFields() {
    // Only update scalar fields every 10 ticks for performance
    if (this.ticks % 10 !== 0) return;
    
    // Use combined SIMD-optimized operations
    this.temperatureField.decayAndDiffuse(0.002, 0.05);  // Temperature
    this.humidityField.decayAndDiffuse(0.005, 0.08);     // Humidity  
    this.pressureField.decayAndDiffuse(0.01, 0.12);      // Pressure
    
    // Apply field interactions and unit effects
    this.applyFieldInteractions();
  }
  
  applyFieldInteractions() {
    // OPTIMIZATION: Only process a subset of cells each tick
    // Process 1/10th of the field each time for 100x speedup
    const startY = (this.ticks % 10) * Math.floor(this.fieldHeight / 10);
    const endY = Math.min(startY + Math.floor(this.fieldHeight / 10), this.fieldHeight);
    
    for (let y = startY; y < endY; y++) {
      for (let x = 0; x < this.fieldWidth; x++) {
        const temp = this.temperatureField.get(x, y);
        const humidity = this.humidityField.get(x, y);
        
        // Hot areas evaporate moisture (reduce humidity)
        if (temp > 30) {
          const evaporation = (temp - 30) * 0.001;
          this.humidityField.add(x, y, -evaporation);
        }
        
        // Very humid areas can condense into puddles (rain effect)
        if (humidity > 0.8) {
          const condensation = (humidity - 0.8) * 0.01;
          this.humidityField.add(x, y, -condensation);
        }
      }
    }
    
    // Unit effects on fields - DISABLED for performance
    // This was iterating over all units creating proxies!
    // TODO: Use SoA arrays directly or make this a rule
    if (false) {
      for (const unit of this.units) {
        if (unit.meta.phantom) continue;
        
        if (unit.state !== 'dead') {
          const pos = unit.pos;
          const x = pos.x;
          const y = pos.y;
          this.temperatureField.addGradient(x, y, 2, 0.5);
        }
        
        if (unit.state === 'walk' || unit.state === 'attack') {
          this.humidityField.addGradient(unit.pos.x, unit.pos.y, 1.5, 0.02);
        }
      }
    }
  }
  
  // Getter for average temperature
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

  // Utility methods for field access
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
  
  addMoisture(x: number, y: number, intensity: number, radius: number = 3): void {
    this.humidityField.addGradient(x, y, radius, intensity);
  }
  
  adjustPressure(x: number, y: number, intensity: number, radius: number = 4): void {
    this.pressureField.addGradient(x, y, radius, intensity);
  }
  
  // Weather system methods
  updateWeather() {
    // Decrease weather duration
    if (this.weather.duration > 0) {
      this.weather.duration--;
      
      // Apply weather effects while active
      this.applyWeatherEffects();
      
      // Weather ends
      if (this.weather.duration <= 0) {
        this.weather.current = 'clear';
        this.weather.intensity = 0;
      }
    }
  }
  
  applyWeatherEffects() {
    switch (this.weather.current) {
      case 'rain':
        this.applyRainEffects();
        break;
      case 'storm':
        this.applyStormEffects();
        break;
      case 'leaves':
        this.applyLeavesEffects();
        break;
    }
  }
  
  applyRainEffects() {
    const intensity = this.weather.intensity;
    
    // Rain increases humidity across the field
    for (let i = 0; i < Math.ceil(intensity * 5); i++) {
      const x = Simulator.rng.random() * this.fieldWidth;
      const y = Simulator.rng.random() * this.fieldHeight;
      this.humidityField.addGradient(x, y, 2, intensity * 0.1);
    }
    
    // Rain cools the field slightly
    for (let i = 0; i < Math.ceil(intensity * 3); i++) {
      const x = Simulator.rng.random() * this.fieldWidth;
      const y = Simulator.rng.random() * this.fieldHeight;
      this.temperatureField.addGradient(x, y, 3, -intensity * 2);
    }
    
    // Spawn rain particles
    if (Simulator.rng.random() < intensity * 0.5) {
      this.spawnRainParticle();
    }
    
    // Rain can extinguish fires
    this.extinguishFires();
  }
  
  applyStormEffects() {
    // Storms are like intense rain + pressure changes
    this.applyRainEffects();
    
    const intensity = this.weather.intensity;
    
    // Pressure fluctuations during storms
    for (let i = 0; i < Math.ceil(intensity * 3); i++) {
      const x = Simulator.rng.random() * this.fieldWidth;
      const y = Simulator.rng.random() * this.fieldHeight;
      const pressureChange = (Simulator.rng.random() - 0.5) * intensity * 0.2;
      this.pressureField.addGradient(x, y, 4, pressureChange);
    }
  }
  
  applyLeavesEffects() {
    const intensity = this.weather.intensity;
    
    // Spawn new leaves periodically to keep them falling
    if (Simulator.rng.random() < intensity * 0.3) { // 30% chance per tick at full intensity
      // Spawn 1-3 leaves at a time
      const leafCount = 1 + Math.floor(Simulator.rng.random() * 3);
      for (let i = 0; i < leafCount; i++) {
        this.particleArrays.addParticle({
          id: `leaf_${Date.now()}_${this.ticks}_${i}`,
          type: 'leaf',
          pos: { 
            x: Simulator.rng.random() * this.fieldWidth * 8, // Spread across full width
            y: -10 - Simulator.rng.random() * 10 // Start above the field
          },
          vel: { 
            x: Simulator.rng.random() * 0.5 - 0.25, // Gentle drift
            y: 0.2 + Simulator.rng.random() * 0.2 // Slow fall
          },
          z: 15 + Simulator.rng.random() * 25, // Varying heights
          lifetime: 400 + Simulator.rng.random() * 200, // Long lifetime to cross field
          radius: 1,
          color: 'green'
        });
      }
    }
  }
  
  // Weather control methods
  setWeather(type: 'clear' | 'rain' | 'storm' | 'sandstorm' | 'leaves', duration: number = 80, intensity: number = 0.7): void {
    this.weather.current = type;
    this.weather.duration = duration;
    this.weather.intensity = intensity;
    // Auto-enable environmental effects when weather is set
    if (type !== 'clear' && duration > 0) {
      this.enableEnvironmentalEffects = true;
    }
  }
  
  spawnRainParticle() {
    this.particleArrays.addParticle({
      pos: {
        x: Simulator.rng.random() * this.fieldWidth,
        y: -1 // Start above visible area
      },
      vel: {
        x: 0.2 + Simulator.rng.random() * 0.3, // Diagonal movement (right)
        y: 0.8 + Simulator.rng.random() * 0.4  // Fast downward
      },
      radius: 0.5 + Simulator.rng.random() * 0.5, // Small drops
      lifetime: 50 + Simulator.rng.random() * 30, // Short lifetime
      // No color - 1-bit aesthetic
      z: 5 + Simulator.rng.random() * 10, // Start at moderate height
      type: 'rain',
      landed: false
    });
  }

  spawnFireParticle(x: number, y: number) {
    // No colors - 1-bit aesthetic
    
    this.particleArrays.addParticle({
      pos: { x, y },
      vel: {
        x: (Simulator.rng.random() - 0.5) * 0.4, // Random horizontal spread
        y: -0.2 - Simulator.rng.random() * 0.3   // Upward movement (fire rises)
      },
      radius: 0.8 + Simulator.rng.random() * 0.7, // Variable spark size
      lifetime: 30 + Simulator.rng.random() * 40, // Medium lifetime
      // No color - 1-bit aesthetic
      z: Simulator.rng.random() * 3, // Start at ground level to low height
      type: 'debris', // Reuse debris type for now
      landed: false
    });
  }

  setUnitOnFire(unit: Unit) {
    if (unit.meta?.onFire) return; // Already on fire
    
    // Set on fire through command system
    this.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: unit.id,
        meta: {
          ...unit.meta,
          onFire: true,
          fireDuration: 40, // Burn for 5 seconds at 8fps
          fireTickDamage: 2 // Damage per tick while burning
        }
      }
    });
  }

  // Process fire effects on burning units
  processFireEffects() {
    for (const unit of this.units) {
      if (unit.meta && unit.meta.onFire && unit.meta.fireDuration > 0) {
        // Apply fire damage through command system
        this.queuedCommands.push({
          type: 'damage',
          params: {
            targetId: unit.id,
            amount: unit.meta.fireTickDamage || 2,
            aspect: 'fire',
            sourceId: 'fire'
          }
        });
        
        // Update fire duration through command
        this.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              ...unit.meta,
              fireDuration: unit.meta.fireDuration - 1
            }
          }
        });
        
        // Spawn fire particles around burning unit
        if (Simulator.rng.random() < 0.3) {
          const offsetX = (Simulator.rng.random() - 0.5) * 2;
          const offsetY = (Simulator.rng.random() - 0.5) * 2;
          this.spawnFireParticle(unit.pos.x + offsetX, unit.pos.y + offsetY);
        }
        
        // Add heat to surrounding area
        this.addHeat(unit.pos.x, unit.pos.y, 3, 1.5);
        
        // Extinguish if duration expires
        if (unit.meta.fireDuration <= 0) {
          unit.meta.onFire = false;
          delete unit.meta.fireDuration;
          delete unit.meta.fireTickDamage;
        }
      }
    }
  }

  // Rain can extinguish fires
  extinguishFires() {
    if (this.weather.current === 'rain' || this.weather.current === 'storm') {
      for (const unit of this.units) {
        if (unit.meta?.onFire) {
          const humidity = this.getHumidity(unit.pos.x, unit.pos.y);
          const temperature = this.getTemperature(unit.pos.x, unit.pos.y);
          
          // High humidity and lower temperature can extinguish fires
          if (humidity > 0.6 && temperature < 30) {
            // Extinguish fire through command system
            this.queuedCommands.push({
              type: 'meta',
              params: {
                unitId: unit.id,
                meta: {
                  ...unit.meta,
                  onFire: false,
                  fireDuration: undefined,
                  fireTickDamage: undefined
                }
              }
            });
          }
        }
      }
    }
  }
  // Helper method to add weather command handling
  processWeatherCommand(command: string, ...args: any[]): void {
    switch (command) {
      case 'rain':
        const duration = parseInt(args[0]) || 80;
        const intensity = parseFloat(args[1]) || 0.7;
        this.setWeather('rain', duration, intensity);
        break;
      case 'storm':
        const stormDuration = parseInt(args[0]) || 120;
        const stormIntensity = parseFloat(args[1]) || 0.9;
        this.setWeather('storm', stormDuration, stormIntensity);
        break;
      case 'clear':
        this.setWeather('clear', 0, 0);
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
    // Clone units via SoA
    for (let i = 0; i < this.unitArrays.capacity; i++) {
      if (this.unitArrays.active[i] === 0) continue;
      // Reconstruct unit from arrays
      const unit = {
        id: this.unitArrays.unitIds[i],
        pos: { x: this.unitArrays.posX[i], y: this.unitArrays.posY[i] },
        intendedMove: { x: this.unitArrays.intendedMoveX[i], y: this.unitArrays.intendedMoveY[i] },
        hp: this.unitArrays.hp[i],
        maxHp: this.unitArrays.maxHp[i],
        team: ['friendly', 'hostile', 'neutral'][this.unitArrays.team[i]],
        state: ['idle', 'walk', 'attack', 'dead'][this.unitArrays.state[i]],
        mass: this.unitArrays.mass[i],
        dmg: this.unitArrays.damage[i],
        sprite: this.unitColdData.get(this.unitArrays.unitIds[i])?.sprite || 'default',
        abilities: this.unitColdData.get(this.unitArrays.unitIds[i])?.abilities || [],
        meta: this.unitColdData.get(this.unitArrays.unitIds[i])?.meta || {}
      } as Unit;
      newSimulator.addUnit(unit);
    }
    return newSimulator;
  }

  validMove(unit, dx, dy) {
    if (!unit) return false;
    
    // For huge units, validate all body positions
    if (unit.meta.huge) {
      const bodyPositions = this.getHugeUnitBodyPositions(unit);
      
      for (const pos of bodyPositions) {
        const newX = pos.x + dx;
        const newY = pos.y + dy;
        
        // Check boundaries
        if (newX < 0 || newX >= this.fieldWidth || newY < 0 || newY >= this.fieldHeight) {
          return false;
        }
        
        // Check if new position would be blocked
        if (this.isApparentlyOccupied(newX, newY, unit)) {
          return false;
        }
      }
      
      return true;
    }
    
    // For normal units, simple validation
    const newX = unit.pos.x + dx;
    const newY = unit.pos.y + dy;
    
    // Check boundaries
    if (newX < 0 || newX >= this.fieldWidth || newY < 0 || newY >= this.fieldHeight) return false;
    
    // Check against apparent field
    return !this.isApparentlyOccupied(newX, newY, unit);
  }

  getHugeUnitBodyPositions(unit) {
    // Return all positions occupied by a huge unit (head + body)
    if (!unit.meta.huge) return [unit.pos];
    
    return [
      unit.pos, // Head
      { x: unit.pos.x, y: unit.pos.y + 1 }, // Body segment 1
      { x: unit.pos.x, y: unit.pos.y + 2 }, // Body segment 2
      { x: unit.pos.x, y: unit.pos.y + 3 }  // Body segment 3
    ];
  }

  // Field abstraction methods
  getRealUnits() {
    // Only non-phantom units
    return this.units.filter(unit => !unit.meta.phantom);
  }

  getApparentUnits() {
    // All units including phantoms (what queries see)
    return this.units;
  }

  isApparentlyOccupied(x: number, y: number, excludeUnit: Unit | null = null): boolean {
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    
    // Grid partition not reliable for exact position checks because units can have
    // body parts that extend beyond their main position. Skip it for now.
    
    // Fallback to position map if available
    if (this.positionMap.size > 0) {
      const key = `${roundedX},${roundedY}`;
      const unitsAtPos = this.positionMap.get(key);
      
      if (!unitsAtPos || unitsAtPos.size === 0) {
        return false;
      }
      
      // Check if any unit at this position should block
      for (const unit of unitsAtPos) {
        if (unit === excludeUnit) continue;
        if (this.isOwnPhantom(unit, excludeUnit)) continue;
        return true; // Position is occupied
      }
      
      return false;
    }
    
    // Final fallback to O(n) search
    for (const unit of this.units) {
      if (unit === excludeUnit) continue;
      if (unit.state === 'dead') continue;
      
      // Check all positions this unit occupies
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
    // Check if unit is a phantom belonging to the owner, OR if unit is the owner itself
    return (unit.meta.phantom && unit.meta.parentId === owner?.id) || unit === owner;
  }

  // Unit lookup cache for O(1) performance
  private unitCache: Map<string, Unit> = new Map();

  creatureById(id) {
    return this.unitCache.get(id);
  }

  objEq(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
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
    // return a list of attributes that have changed
    const changes: Partial<Unit> = {};
    for (const key of Object.keys(before)) {
      if (!this.objEq(
        before[key], after[key]
      )) {
        changes[key] = after[key];
      }
    }
    return changes;
  }

  prettyPrint(val: any) {
    return (JSON.stringify(val, null, 2)||"").replace(/\n/g, '').replace(/ /g, '');
  }

  attrEmoji: { [key: string]: string } = {
    hp: '❤️',
    mass: '⚖️',
    pos: '📍',
    intendedMove: '➡️',
    intendedTarget: '🎯',
    state: '🛡️',
  }

  // Update which units changed this frame for render optimization
  private updateChangedUnits(): void {
    // Delta tracking now handled by dirtyUnits/changedUnits swap in step()
    // This method is kept for backward compatibility but does nothing
    return;
  }
  
  // Public API for renderer to get only changed units
  public getChangedUnits(): string[] {
    return Array.from(this.changedUnits);
  }
  
  // Public API to check if a specific unit changed
  public hasUnitChanged(unitId: string): boolean {
    return this.changedUnits.has(unitId);
  }
  

  _debugUnits(unitsBefore: Unit[], phase: string) {
    let printedPhase = false;
    for (const u of this.units) {
      if (unitsBefore) {
        const before = unitsBefore.find(b => b.id === u.id);
        if (before) {
          let delta = this.delta(before, u);
          if (Object.keys(delta).length === 0) {
            continue; // No changes, skip detailed logging
          }
          if (!printedPhase) {
            console.debug(`## ${phase}`);
            printedPhase = true;
          }
          let str = (`  ${u.id}`);
          Object.keys(delta).forEach(key => {
            let icon = this.attrEmoji[key] || '|';
            str += (` | ${icon} ${key}: ${this.prettyPrint(before[key])} → ${this.prettyPrint(u[key])}`);
          })
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
          if (cmd.action === 'move') {
            // Set intendedMove based on target
            if (cmd.target) {
              // Find unit in arrays and update intendedMove
              for (let i = 0; i < this.unitArrays.capacity; i++) {
                if (this.unitArrays.unitIds[i] === unit.id && this.unitArrays.active[i] === 1) {
                  this.unitArrays.intendedMoveX[i] = cmd.target.x;
                  this.unitArrays.intendedMoveY[i] = cmd.target.y;
                  break;
                }
              }
            }
          }
          if (cmd.action === 'fire' && cmd.target) {
            // Find target unit
            const target = this.units.find(u => u.id === cmd.target);
            if (target) {
              // Compute direction vector (normalized)
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
                type: 'bullet'
              });
            }
          }
        }
      }
    }
    return this;
  }

  unitAt(x: number, y: number): Unit | undefined {
    return this.units.find(u => u.pos.x === x && u.pos.y === y);
  }

  areaDamage(config: { pos: { x: number; y: number; }; radius: number; damage: number; team: string; }) {
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

  // Helper method for tests to force ability activation
  forceAbility(unitId: string, abilityName: string, target?: any): void {
    const unit = this.units.find(u => u.id === unitId);
    if (!unit || !Array.isArray(unit.abilities) || !unit.abilities.includes(abilityName)) return;

    // Get the Abilities rule from the rulebook
    const abilitiesRule = this.rulebook.find(rule => rule.constructor.name === 'Abilities');
    if (!abilitiesRule) {
      console.warn('Abilities rule not found in rulebook');
      return;
    }

    // Get the ability definition from JSON
    const jsonAbility = Abilities.all[abilityName];
    if (!jsonAbility) {
      console.warn(`Ability ${abilityName} not found in JSON definitions`);
      return;
    }

    // Create a basic TickContext for processing the ability
    const context = {
      findUnitsInRadius: (center: any, radius: number) => this.getUnitsNear(center.x, center.y, radius),
      findUnitById: (id: string) => this.units.find(u => u.id === id),
      getAllUnits: () => this.units as readonly any[],
      getUnitsInTeam: (team: string) => this.units.filter(u => u.team === team),
      getUnitsAt: (pos: any) => this.units.filter(u => 
        Math.floor(u.pos.x) === Math.floor(pos.x) && 
        Math.floor(u.pos.y) === Math.floor(pos.y)
      ),
      getUnitsInRect: (x: number, y: number, width: number, height: number) => 
        this.units.filter(u => 
          u.pos.x >= x && u.pos.x < x + width &&
          u.pos.y >= y && u.pos.y < y + height
        ),
      queueCommand: (cmd: any) => this.queuedCommands.push(cmd),
      queueEvent: (event: any) => this.queuedEvents.push(event),
      getRandom: () => Math.random(), // TODO: Use deterministic RNG
      getCurrentTick: () => this.ticks,
      getFieldWidth: () => this.fieldWidth,
      getFieldHeight: () => this.fieldHeight,
      getProjectiles: () => this.projectiles as readonly any[],
      getParticles: () => this.particles as readonly any[],
      getTemperatureAt: (x: number, y: number) => this.temperatureField?.get?.(x, y) || 20,
      getSceneBackground: () => this.sceneBackground
    };

    // Process the ability effects through the rule
    const primaryTarget = target || unit;
    for (const effect of jsonAbility.effects) {
      (abilitiesRule as Abilities).processEffectAsCommand(context, effect, unit, primaryTarget);
    }
    
    // Update lastAbilityTick through command to prevent re-firing
    // Note: This will be processed after abilities run, so forceAbility + step() may double-fire
    this.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: unit.id,
        meta: {
          lastAbilityTick: {
            ...unit.lastAbilityTick,
            [abilityName]: this.ticks
          }
        }
      }
    });
  }
}

export { Simulator };
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Simulator = Simulator; // Expose for browser use
}