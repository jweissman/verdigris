# Refactoring Plan: Towards Clean ECS Architecture

## Current Issues

### 1. Generic "meta" Commands (70+ uses!)
The MetaCommand is used everywhere to update arbitrary properties. This is anti-ECS and makes it impossible to understand what's being mutated.

**Examples found:**
- Flying units updating z-position via meta
- Status effects updating timers via meta  
- Grappling physics updating grapple state via meta
- Combat updating lastAttackTick via meta

**Solution**: Decompose into specific component commands:
- `SetPositionCommand` for position updates
- `SetVelocityCommand` for velocity updates
- `SetStatusCommand` for status effects
- `SetTimerCommand` for cooldowns/timers
- `SetGrappleStateCommand` for grappling

### 2. Direct Simulator Mutations
Many places directly mutate sim properties instead of using commands:

**Weather/Environment:**
- `sim.lightningActive = true`
- `sim.winterActive = true`  
- `sim.sandstormActive = true`

**Command/Event Queue:**
- `sim.queuedCommands.push(...)`
- `sim.queuedEvents.push(...)`

**Entities:**
- `sim.projectiles.push(...)`
- `sim.particles.push(...)`

**Solution**: All mutations should go through commands or a mutation interface.

### 3. Rules Violating Architecture
Some rules still have direct sim access:
- `Particles` rule directly manipulates particleArrays
- Rules accessing `sim.queuedCommands` directly

### 4. Missing Query Interface
We need a unified query interface like DataQuery but for all game state:

```typescript
interface SimulatorQuery {
  // Unit queries
  getUnits(): readonly Unit[];
  getUnitsInRadius(center: Vec2, radius: number): Unit[];
  getUnitById(id: string): Unit | undefined;
  
  // Environment queries  
  isLightningActive(): boolean;
  isWinterActive(): boolean;
  getWeatherState(): WeatherState;
  
  // Projectile queries
  getProjectiles(): readonly Projectile[];
  
  // Particle queries
  getParticles(): readonly Particle[];
  getParticleCount(): number;
  
  // Field queries
  getFieldWidth(): number;
  getFieldHeight(): number;
  getHumidityAt(x: number, y: number): number;
  getTemperatureAt(x: number, y: number): number;
}
```

### 5. Component Decomposition Needed

Current "meta" object contains mixed concerns:
- Physics state (z, velocity, grounded)
- Combat state (lastAttackTick, combo)
- Status state (frozen, burning, timers)
- AI state (patrolPoint, targetId)

These should be separate components with their own commands.

## Performance Impact of Refactoring

### Positive:
- Specific commands can be optimized (e.g., batch position updates)
- Clear component boundaries enable vectorization
- No more generic property bag lookups

### Negative:
- More command types = more dispatch overhead
- Need careful design to avoid command explosion

## Recommended Approach

### Phase 1: Query Interface (Low Risk)
1. Create SimulatorQuery interface
2. Implement in TickContext
3. Migrate rules to use query interface only

### Phase 2: Command Decomposition (Medium Risk)
1. Identify top 5 most-used meta updates
2. Create specific commands for those
3. Gradually migrate rules
4. Keep MetaCommand as fallback during transition

### Phase 3: Eliminate Direct Mutations (High Risk)
1. Create MutationContext for controlled mutations
2. Move all queueCommand/queueEvent through context
3. Remove direct sim access from all rules

### Phase 4: True ECS Components (Major Refactor)
1. Split Unit into components (Position, Health, Combat, etc.)
2. Create systems for each component type
3. Rules become systems operating on components

## Command Provenance Tracking

To detect loops and understand command flow:

1. Add source tracking to commands:
```typescript
interface QueuedCommand {
  type: string;
  params: any;
  source?: string; // Which rule/command created this
  depth?: number;  // How deep in the chain
}
```

2. Log command chains during development
3. Detect and warn about potential loops
4. Visualize command flow for optimization

## Next Steps

1. **Immediate**: Fix the Particles rule to not access sim directly
2. **Short term**: Create specific commands for the most common meta updates
3. **Medium term**: Implement SimulatorQuery interface
4. **Long term**: Full ECS component refactor