import { MeleeCombat } from "../rules/melee_combat";
import { Knockback } from "../rules/knockback";
import { ProjectileMotion } from "../rules/projectile_motion";
import { UnitMovement } from "../rules/unit_movement";
import { AreaOfEffect } from "../rules/area_of_effect";
import { Rule } from "../rules/rule";
import { UnitBehavior } from "../rules/unit_behavior";
import Cleanup from "../rules/cleanup";
import { Jumping } from "../rules/jumping";
import { Tossing } from "../rules/tossing";
import { Abilities } from "../rules/abilities";
import { EventHandler } from "../rules/event_handler";
import { CommandHandler, QueuedCommand } from "../rules/command_handler";
import { HugeUnits } from "../rules/huge_units";
import { SegmentedCreatures } from "../rules/segmented_creatures";
import { GrapplingPhysics } from "../rules/grappling_physics";
import { DesertEffects } from "../rules/desert_effects";
import { Perdurance } from "../rules/perdurance";
import { StatusEffects } from "../rules/status_effects";
import { WinterEffects } from "../rules/winter_effects";
import { LightningStorm } from "../rules/lightning_storm";
import { Projectile } from "../types/Projectile";
import { Unit } from "../types/Unit";
import { Particle } from "../types/Particle";
import { Action } from "../types/Action";
import { DoubleBuffer, SpatialHash } from "../sim/double_buffer";
import { PerformanceProfiler } from "./performance_profiler";
import { Transform } from "./transform";

class ScalarField {
  private grid: number[][];
  public readonly width: number;
  public readonly height: number;

  
  constructor(width: number, height: number, initialValue: number = 0) {
    this.width = width;
    this.height = height;
    this.grid = Array(height).fill(null).map(() => Array(width).fill(initialValue));
  }
  
  get(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.grid[Math.floor(y)][Math.floor(x)];
  }
  
  set(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.grid[Math.floor(y)][Math.floor(x)] = value;
  }
  
  add(x: number, y: number, delta: number): void {
    this.set(x, y, this.get(x, y) + delta);
  }
  
  // Smoothly blend a value over an area with falloff
  addGradient(centerX: number, centerY: number, radius: number, intensity: number): void {
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(centerY + radius));
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
          const falloff = 1 - (distance / radius);
          const contribution = intensity * falloff * falloff; // Quadratic falloff
          this.add(x, y, contribution);
        }
      }
    }
  }
  
  // Apply diffusion to smooth out the field
  diffuse(rate: number = 0.1): void {
    const newGrid = this.grid.map(row => [...row]);
    
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const neighbors = [
          this.grid[y-1][x], this.grid[y+1][x], // vertical
          this.grid[y][x-1], this.grid[y][x+1]  // horizontal
        ];
        const avgChange = neighbors.reduce((sum, val) => sum + val, 0) / 4 - this.grid[y][x];
        newGrid[y][x] += avgChange * rate;
      }
    }
    
    this.grid = newGrid;
  }
  
  // Decay all values toward zero
  decay(rate: number = 0.01): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] *= (1 - rate);
      }
    }
  }
  
  // Get the maximum value in the field
  getMaxValue(): number {
    let max = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        max = Math.max(max, Math.abs(this.grid[y][x]));
      }
    }
    return max;
  }
}

class Simulator {
  sceneBackground: string = 'winter';  // burning-city';
  // weather: string = 'clear'; // Default weather

  fieldWidth: number;
  fieldHeight: number;

  // Double buffering: current (for reading) and pending (for writing)
  private _units: Unit[] = [];
  private bufferA: Unit[] = [];
  private bufferB: Unit[] = [];
  private currentBuffer: 'A' | 'B' = 'A';
  private inFrame: boolean = false; // Track if we're processing a frame
  private spatialHash: SpatialHash;
  private dirtyUnits: Set<string> = new Set();
  
  // Public access - returns current for reading
  get units(): Unit[] {
    // During frame processing, return pending units so rules see updates
    if (this.inFrame) {
      return this.getPendingUnits();
    }
    // Outside frame, return current buffer
    return this.currentBuffer === 'A' ? this.bufferA : this.bufferB;
  }
  
  // Start a new frame - copy current to pending for mutations
  private beginFrame(): void {
    this.inFrame = true;
    const currentUnits = this.currentBuffer === 'A' ? this.bufferA : this.bufferB;
    const pendingUnits = this.currentBuffer === 'A' ? this.bufferB : this.bufferA;
    
    // Clear pending and copy current state
    pendingUnits.length = 0;
    for (const unit of currentUnits) {
      pendingUnits.push({
        ...unit,
        meta: unit.meta ? { ...unit.meta } : {}
      });
    }
  }
  
  // End frame - swap buffers (no copy!)
  private endFrame(): void {
    // Just swap the buffer pointer - this is the performance win!
    this.currentBuffer = this.currentBuffer === 'A' ? 'B' : 'A';
    this.inFrame = false;
  }
  
  // Get pending units for mutations
  getPendingUnits(): Unit[] {
    // Pending is always the opposite buffer
    return this.currentBuffer === 'A' ? this.bufferB : this.bufferA;
  }
  
  // Get units for Transform
  getUnitsForTransform(): Unit[] {
    return this.units;
  }
  
  // Set units from Transform
  setUnitsFromTransform(units: Unit[]): void {
    this._units = units;
  }
  
  projectiles: Projectile[];
  rulebook: Rule[];
  queuedEvents: Action[] = [];
  processedEvents: Action[] = [];
  queuedCommands: QueuedCommand[] = [];
  particles: Particle[] = [];
  
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
  
  // Performance profiling
  profiler?: PerformanceProfiler;
  enableProfiling: boolean = false;
  
  // Transform for controlled mutations
  private transform: Transform;
  
  // Factory methods for rules that need Transform
  createCommandHandler() {
    return new CommandHandler(this, this.transform);
  }
  
  createEventHandler() {
    return new EventHandler(this);
  }

  protected getTransform() { return this.transform; }

  constructor(fieldWidth = 128, fieldHeight = 128) {
    this.fieldWidth = fieldWidth;
    this.fieldHeight = fieldHeight;
    
    // Initialize spatial hash for collision detection
    this.spatialHash = new SpatialHash(4); // 4x4 grid cells
    this.dirtyUnits = new Set();
    
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
    const type = parts[0];
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
    }
    
    this.queuedCommands.push({ type, params });
  }

  paused: boolean = false;
  pause() {
    this.paused = true;
  }

  reset() {
    this._units = [];
    this.bufferA = [];
    this.bufferB = [];
    this.currentBuffer = 'A';
    this.projectiles = [];
    this.processedEvents = [];
    this.queuedCommands = [];
    this.rulebook = [
      new Abilities(this),
      new UnitBehavior(this),
      new UnitMovement(this),
      new HugeUnits(this), // Handle huge unit phantoms after movement
      new SegmentedCreatures(this), // Handle segmented creatures after movement
      new GrapplingPhysics(this), // Handle grappling hook physics
      new MeleeCombat(this),

      new LightningStorm(this),

      // not sure i trust either of these yet
      new AreaOfEffect(this),
      new Knockback(this),
      // or this honestly
      new ProjectileMotion(this),

      new Jumping(this),
      new Tossing(this), // Handle tossed units
      new StatusEffects(this), // Handle status effects before damage processing
      new WinterEffects(this), // Handle environmental winter effects
      new DesertEffects(this), // Handle desert heat shimmer and environmental effects
      new Perdurance(this), // Process damage resistance before events are handled
      this.createEventHandler(), // Convert events to commands
      new Cleanup(this),
      new CommandHandler(this, this.transform) // Process ALL commands at the end
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
    };
    // If we're in a frame, add to pending buffer. Otherwise add to current.
    if (this.inFrame) {
      const pendingUnits = this.getPendingUnits();
      pendingUnits.push(u);
    } else {
      // Initial setup - add to current buffer
      const currentUnits = this.currentBuffer === 'A' ? this.bufferA : this.bufferB;
      currentUnits.push(u);
    }
    this.dirtyUnits.add(u.id); // Mark as dirty for rendering
    return u;
  }

  create(unit: Unit) {
    const newUnit = { ...unit, id: unit.id || `unit_${Date.now()}` };
    // If we're in a frame, add to pending buffer. Otherwise add to current.
    if (this.inFrame) {
      const pendingUnits = this.getPendingUnits();
      pendingUnits.push(newUnit);
    } else {
      // Initial setup - add to current buffer
      const currentUnits = this.currentBuffer === 'A' ? this.bufferA : this.bufferB;
      currentUnits.push(newUnit);
    }
    this.dirtyUnits.add(newUnit.id); // Mark as dirty for rendering
    return newUnit;
  }
  
  // Mark a unit as modified (needs re-rendering)
  markDirty(unitId: string) {
    this.dirtyUnits.add(unitId);
  }
  
  // Get units near a position using spatial hash
  getUnitsNear(x: number, y: number, radius: number = 2): Unit[] {
    if (!this.spatialHash) {
      // Fallback to O(n) search if spatial hash not initialized
      return this.units.filter(u => {
        const dx = u.pos.x - x;
        const dy = u.pos.y - y;
        return Math.sqrt(dx * dx + dy * dy) <= radius;
      });
    }
    
    const nearbyIds = this.spatialHash.query(x, y, radius);
    const nearbyUnits: Unit[] = [];
    
    for (const id of nearbyIds) {
      const unit = this.units.find(u => u.id === id);
      if (unit) {
        const dx = unit.pos.x - x;
        const dy = unit.pos.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          nearbyUnits.push(unit);
        }
      }
    }
    
    return nearbyUnits;
  }
  
  // Check if any units are dirty (need re-rendering)
  hasDirtyUnits(): boolean {
    return this.dirtyUnits.size > 0;
  }
  
  // Get list of dirty unit IDs
  getDirtyUnits(): Set<string> {
    return new Set(this.dirtyUnits);
  }
  

  get roster() {
    return Object.fromEntries(this.units.map(unit => [unit.id, unit]));
  }
  
  startProfiling() {
    this.enableProfiling = true;
    this.profiler = new PerformanceProfiler();
  }
  
  stopProfiling() {
    if (this.profiler) {
      this.profiler.printReport();
    }
    this.enableProfiling = false;
  }
  
  getProfilingReport() {
    return this.profiler?.getReport() || [];
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
    
    // Clear dirty tracking from last frame
    this.dirtyUnits.clear();
    
    // BEGIN FRAME - create working copy for double buffering
    this.beginFrame();
    
    // Rebuild spatial hash for collision detection
    this.spatialHash.clear();
    this.units.forEach(unit => {
      this.spatialHash.insert(unit.id, unit.pos.x, unit.pos.y);
    });
    
    // Store reference for debugging
    let lastUnits = [...this.units];
    
    for (const rule of this.rulebook) {
      const ruleName = rule.constructor.name;
      
      if (this.enableProfiling && this.profiler) {
        this.profiler.startTimer(ruleName);
      }
      
      let tr0 = performance.now();
      rule.execute();
      let tr1 = performance.now();
      
      if (this.enableProfiling && this.profiler) {
        this.profiler.endTimer();
      }
      
      let elapsed = tr1 - tr0;
      if (elapsed > 10) {
        console.warn(`- Rule ${ruleName} executed in ${elapsed}ms`);
      }

      // Debugging: print unit changes
      this._debugUnits(lastUnits, ruleName);
      lastUnits = this.units.map(u => ({ 
        ...u,
        meta: u.meta ? { ...u.meta } : {}
      }));
    }
    
    // END FRAME - commit all changes from working copy to current
    this.endFrame();
    
    let t1 = performance.now();
    let elapsed = t1 - t0;
    if (elapsed > 30) {
      console.warn(`Simulation step ${this.ticks} took ${elapsed.toFixed(2)}ms`);
    }
    
    // Update particles
    this.updateParticles();
    
    // Update scalar fields
    this.updateScalarFields();
    
    // Update weather system
    this.updateWeather();
    
    // Process fire effects
    this.processFireEffects();
    this.extinguishFires();
    
    // Spawn environmental particles occasionally
    if (Math.random() < 0.2) { // 2% chance per tick - gentler for testing
      this.spawnLeafParticle();
    }
    
    this.lastCall = t0;
    return this;
  }


  updateParticles() {
    this.particles = this.particles.filter(particle => {
      // Age the particle
      particle.lifetime--;
      if (particle.lifetime <= 0) return false;
      
      // Apply physics based on particle type
      if (particle.type === 'leaf') {
        this.updateLeafParticle(particle);
      } else if (particle.type === 'rain') {
        this.updateRainParticle(particle);
      }
      
      return true;
    });
  }
  
  updateLeafParticle(particle: Particle) {
    if (particle.landed) {
      // Landed leaves just sit there and fade - NO movement at all
      particle.vel.x = 0;
      particle.vel.y = 0;
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
      particle.z = Math.max(0, particle.z - particle.vel.y * 0.5); // Descend in 3D
    }
    
    // Wrap around field horizontally
    if (particle.pos.x < 0) particle.pos.x = this.fieldWidth;
    if (particle.pos.x > this.fieldWidth) particle.pos.x = 0;
    
    // Land when reaching ground level
    if (particle.z !== undefined && particle.z <= 0) {
      particle.landed = true;
      particle.z = 0;
      particle.vel.x = 0; // Stop all horizontal movement too
      particle.vel.y = 0;
      particle.lifetime = Math.max(particle.lifetime, 200); // Stay visible longer when landed
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
      particle.vel.x = 0;
      particle.vel.y = 0;
      particle.lifetime = Math.min(particle.lifetime, 30); // Fade quickly when landed
      
      // Add moisture to the field where rain lands
      this.humidityField.addGradient(particle.pos.x, particle.pos.y, 1, 0.05);
    }
  }
  
  spawnLeafParticle() {
    const leafColors = ['#228B22', '#32CD32', '#90EE90', '#9ACD32', '#8FBC8F'];
    
    const particle: Particle = {
      pos: {
        x: Math.random() * this.fieldWidth,
        y: -2 // Start above the visible area
      },
      vel: {
        x: (Math.random() - 0.5) * 0.1, // Small initial horizontal velocity
        y: Math.random() * 0.05 + 0.02  // Small downward velocity
      },
      radius: Math.random() * 1.5 + 0.5, // Small leaf size
      lifetime: 1000 + Math.random() * 500, // Long lifetime for drifting
      color: leafColors[Math.floor(Math.random() * leafColors.length)],
      z: 10 + Math.random() * 20, // Start at various heights
      type: 'leaf',
      landed: false
    };
    
    this.particles.push(particle);
  }

  updateScalarFields() {
    // Apply natural diffusion and decay to all fields
    this.temperatureField.diffuse(0.05); // Temperature spreads slowly  
    this.temperatureField.decay(0.002);  // Temperature normalizes slowly toward baseline
    
    this.humidityField.diffuse(0.08);    // Humidity spreads faster than temperature
    this.humidityField.decay(0.005);     // Humidity changes more quickly
    
    this.pressureField.diffuse(0.12);    // Pressure spreads fastest (gas dynamics)
    this.pressureField.decay(0.01);      // Pressure normalizes quickly toward 1 atm
    
    // Apply field interactions and unit effects
    this.applyFieldInteractions();
  }
  
  applyFieldInteractions() {
    // Temperature-humidity interactions
    for (let y = 0; y < this.fieldHeight; y++) {
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
          // TODO: Create puddle/water particles when this happens
        }
      }
    }
    
    // Unit effects on fields
    for (const unit of this.units) {
      if (unit.meta.phantom) continue; // Phantom units don't affect fields
      
      // All living units generate slight heat
      if (unit.state !== 'dead') {
        this.temperatureField.addGradient(unit.pos.x, unit.pos.y, 2, 0.5);
      }
      
      // Breathing/movement generates slight humidity
      if (unit.state === 'walk' || unit.state === 'attack') {
        this.humidityField.addGradient(unit.pos.x, unit.pos.y, 1.5, 0.02);
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
    }
  }
  
  applyRainEffects() {
    const intensity = this.weather.intensity;
    
    // Rain increases humidity across the field
    for (let i = 0; i < Math.ceil(intensity * 5); i++) {
      const x = Math.random() * this.fieldWidth;
      const y = Math.random() * this.fieldHeight;
      this.humidityField.addGradient(x, y, 2, intensity * 0.1);
    }
    
    // Rain cools the field slightly
    for (let i = 0; i < Math.ceil(intensity * 3); i++) {
      const x = Math.random() * this.fieldWidth;
      const y = Math.random() * this.fieldHeight;
      this.temperatureField.addGradient(x, y, 3, -intensity * 2);
    }
    
    // Spawn rain particles
    if (Math.random() < intensity * 0.5) {
      this.spawnRainParticle();
    }
  }
  
  applyStormEffects() {
    // Storms are like intense rain + pressure changes
    this.applyRainEffects();
    
    const intensity = this.weather.intensity;
    
    // Pressure fluctuations during storms
    for (let i = 0; i < Math.ceil(intensity * 3); i++) {
      const x = Math.random() * this.fieldWidth;
      const y = Math.random() * this.fieldHeight;
      const pressureChange = (Math.random() - 0.5) * intensity * 0.2;
      this.pressureField.addGradient(x, y, 4, pressureChange);
    }
  }
  
  // Weather control methods
  setWeather(type: 'clear' | 'rain' | 'storm' | 'sandstorm' | 'leaves', duration: number = 80, intensity: number = 0.7): void {
    this.weather.current = type;
    this.weather.duration = duration;
    this.weather.intensity = intensity;
  }
  
  spawnRainParticle() {
    const particle: Particle = {
      pos: {
        x: Math.random() * this.fieldWidth,
        y: -1 // Start above visible area
      },
      vel: {
        x: 0.2 + Math.random() * 0.3, // Diagonal movement (right)
        y: 0.8 + Math.random() * 0.4  // Fast downward
      },
      radius: 0.5 + Math.random() * 0.5, // Small drops
      lifetime: 50 + Math.random() * 30, // Short lifetime
      color: '#4A90E2', // Blue rain color
      z: 5 + Math.random() * 10, // Start at moderate height
      type: 'rain',
      landed: false
    };
    
    this.particles.push(particle);
  }

  spawnFireParticle(x: number, y: number) {
    const fireColors = ['#FF4500', '#FF6347', '#FFD700', '#FF8C00', '#DC143C'];
    
    const particle: Particle = {
      pos: { x, y },
      vel: {
        x: (Math.random() - 0.5) * 0.4, // Random horizontal spread
        y: -0.2 - Math.random() * 0.3   // Upward movement (fire rises)
      },
      radius: 0.8 + Math.random() * 0.7, // Variable spark size
      lifetime: 30 + Math.random() * 40, // Medium lifetime
      color: fireColors[Math.floor(Math.random() * fireColors.length)],
      z: Math.random() * 3, // Start at ground level to low height
      type: 'debris', // Reuse debris type for now
      landed: false
    };
    
    this.particles.push(particle);
  }

  setUnitOnFire(unit: Unit) {
    if (!unit.meta) unit.meta = {}; // Ensure meta exists
    if (unit.meta.onFire) return; // Already on fire
    unit.meta.onFire = true;
    unit.meta.fireDuration = 40; // Burn for 5 seconds at 8fps
    unit.meta.fireTickDamage = 2; // Damage per tick while burning
  }

  // Process fire effects on burning units
  processFireEffects() {
    for (const unit of this.units) {
      if (unit.meta && unit.meta.onFire && unit.meta.fireDuration > 0) {
        // Apply fire damage
        unit.hp -= unit.meta.fireTickDamage || 2;
        unit.meta.fireDuration--;
        
        // Spawn fire particles around burning unit
        if (Math.random() < 0.3) {
          const offsetX = (Math.random() - 0.5) * 2;
          const offsetY = (Math.random() - 0.5) * 2;
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
        if (unit.meta.onFire) {
          const humidity = this.getHumidity(unit.pos.x, unit.pos.y);
          const temperature = this.getTemperature(unit.pos.x, unit.pos.y);
          
          // High humidity and lower temperature can extinguish fires
          if (humidity > 0.6 && temperature < 30) {
            unit.meta.onFire = false;
            delete unit.meta.fireDuration;
            delete unit.meta.fireTickDamage;
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
    this.step();
    this.handleInput(input);
    return this;
  }

  clone() {
    const newSimulator = new Simulator();
    newSimulator._units = this._units.map(unit => ({ ...unit }));
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
    // Check if position is occupied in the apparent field
    // This includes both actual units and virtual occupancy from huge units
    
    for (const unit of this.units) {
      if (unit === excludeUnit) continue;
      if (this.isOwnPhantom(unit, excludeUnit)) continue;
      
      // Check if this unit occupies the position (works for both normal and huge units)
      const occupiedPositions = this.getHugeUnitBodyPositions(unit);
      for (const pos of occupiedPositions) {
        if (pos.x === x && pos.y === y) {
          return true;
        }
      }
    }
    
    return false;
  }

  private isOwnPhantom(unit, owner) {
    // Check if unit is a phantom belonging to the owner, OR if unit is the owner itself
    return (unit.meta.phantom && unit.meta.parentId === owner?.id) || unit === owner;
  }

  creatureById(id) {
    return this.units.find(unit => unit.id === id);
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
            // console.debug(`## ${phase}`);
            printedPhase = true;
          }
          let str = (`  ${u.id}`);
          Object.keys(delta).forEach(key => {
            let icon = this.attrEmoji[key] || '|';
            str += (` | ${icon} ${key}: ${this.prettyPrint(before[key])} → ${this.prettyPrint(u[key])}`);
          })
          // console.debug(str);

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
            unit.intendedMove = { x: 1, y: 0 };
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

    // Process the ability effects directly
    const primaryTarget = target || unit;
    for (const effect of jsonAbility.effects) {
      (abilitiesRule as Abilities).processEffectAsCommand(effect, unit, primaryTarget);
    }

    // Update cooldown
    if (!unit.lastAbilityTick) unit.lastAbilityTick = {};
    unit.lastAbilityTick[abilityName] = this.ticks;
  }

  // Legacy forceAbility implementation (to be removed)
  _legacyForceAbility(unitId: string, abilityName: string, target?: any): void {
    const unit = this.units.find(u => u.id === unitId);
    if (!unit || !unit.abilities[abilityName]) return;

    // Initialize queued commands if needed
    if (!this.queuedCommands) this.queuedCommands = [];

    // Queue the appropriate command based on ability name
    switch (abilityName) {
      case 'grapplingHook':
        const grappleTarget = target || { x: unit.pos.x + 5, y: unit.pos.y };
        this.queuedCommands.push({
          type: 'grapple',
          params: { x: grappleTarget.x, y: grappleTarget.y },
          unitId: unit.id
        });
        break;
      
      case 'makeRain':
        this.queuedCommands.push({
          type: 'weather',
          params: { weatherType: 'rain', duration: 80, intensity: 0.8 },
          unitId: unit.id
        });
        break;
      
      case 'deployBot':
        const deployTarget = target || { x: unit.pos.x + 3, y: unit.pos.y };
        this.queuedCommands.push({
          type: 'deploy',
          params: { unitType: 'clanker', x: deployTarget.x, y: deployTarget.y },
          unitId: unit.id
        });
        break;
      
      default:
        // For other abilities, try to use Abilities
        const jsonAbilitiesRule = this.rulebook.find(r => r.constructor.name === 'Abilities');
        if (jsonAbilitiesRule) {
          // Reset cooldown
          if (!unit.lastAbilityTick) unit.lastAbilityTick = {};
          unit.lastAbilityTick[abilityName] = -9999;
          
          // Store target in unit meta temporarily
          unit.meta._testTarget = target;
          
          // Run Abilities
          jsonAbilitiesRule.apply();
          
          // Clean up
          delete unit.meta._testTarget;
        }
    }
  }
}

export { Simulator };
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Simulator = Simulator; // Expose for browser use
}