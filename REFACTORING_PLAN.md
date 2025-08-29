# Simulator Refactoring Plan

## Current Issues
The Simulator class (1874 lines) is a god class with too many responsibilities:
- Unit management
- Weather/environment state
- Particle systems
- Rule execution
- Command processing  
- Collision detection
- Event recording
- Random number generation
- Field management (temperature, humidity, pressure)
- Projectile management

## Proposed Architecture

### 1. UnitManager (Created)
**Responsibilities:**
- Store and retrieve units
- Add/remove units
- Query units by team, tag, ability
- Maintain unit roster
- Provide batch array access for performance

**Status:** ✅ Created in `/src/core/unit_manager.ts`

### 2. EnvironmentManager (Created)
**Responsibilities:**
- Weather state and transitions
- Background/biome management
- Battlefield properties (strip width, height)
- Environmental queries (isWinterActive, isSandstormActive, etc.)

**Status:** ✅ Created in `/src/core/environment_manager.ts`

### 3. ParticleSystem (To Do)
**Responsibilities:**
- Particle storage (using SoA arrays)
- Particle lifecycle management
- Particle rendering data preparation
- Particle type conversions

### 4. ProjectileSystem (To Do)
**Responsibilities:**
- Projectile storage (using SoA arrays)
- Projectile physics and collision
- Projectile lifecycle management
- Type-specific projectile behavior

### 5. FieldManager (To Do)
**Responsibilities:**
- Temperature field
- Humidity field  
- Pressure field
- Field updates and queries

### 6. RuleEngine (To Do)
**Responsibilities:**
- Rule selection based on game state
- Rule execution orchestration
- Command collection from rules
- Rule performance monitoring

### 7. EventSystem (Partially Exists)
**Responsibilities:**
- Event queueing
- Event processing
- Event history recording
- Event filtering and routing

## Integration Strategy

### Phase 1: Extract without breaking changes
1. Create manager classes with same interface as Simulator
2. Delegate Simulator methods to managers
3. Keep backward compatibility

### Phase 2: Update dependencies
1. Update rules to use managers directly
2. Update commands to use managers
3. Update tests to use managers

### Phase 3: Remove delegation
1. Remove delegated methods from Simulator
2. Simulator becomes a coordinator only
3. Clean up interfaces

## Benefits
- **Testability:** Each manager can be tested in isolation
- **Maintainability:** Smaller, focused classes are easier to understand
- **Performance:** Specialized managers can optimize for their use case
- **Extensibility:** New features can be added to specific managers

## Migration Path

1. **Start with UnitManager and EnvironmentManager** (DONE)
   - Low risk, clear boundaries
   - Most frequently accessed

2. **Extract ParticleSystem next**
   - Already uses SoA arrays
   - Clear performance benefits

3. **Extract ProjectileSystem**
   - Similar to ParticleSystem
   - Clear domain boundary

4. **Extract FieldManager**
   - Self-contained scalar fields
   - Used by weather/environment rules

5. **Finally extract RuleEngine**
   - Most complex extraction
   - Touches many parts of system

## Risks and Mitigations

**Risk:** Breaking existing functionality
**Mitigation:** Keep all tests passing at each step, use delegation pattern

**Risk:** Performance regression
**Mitigation:** Profile before and after, keep SoA optimizations

**Risk:** Increased complexity from more classes
**Mitigation:** Clear interfaces and documentation, follow single responsibility principle

## Success Criteria
- Simulator class under 500 lines
- All tests still passing
- No performance regression
- Each manager under 300 lines
- Clear separation of concerns