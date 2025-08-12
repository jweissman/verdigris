# Rule Rearchitecture Plan

## Current Problem
Rules have sequential dependencies - each needs to see mutations from previous rules.
This prevents clean double-buffering and command-based architecture.

## New Architecture

### Phase 1: Calculate Intents (Pure Functions)
All rules observe the SAME frozen state and calculate what they want to do:

1. **MovementIntent**: Calculate where each unit wants to move
2. **CombatIntent**: Calculate who wants to attack whom  
3. **KnockbackIntent**: Calculate collision forces

### Phase 2: Resolve Conflicts
Resolve conflicts between intents:

1. **MovementResolver**: Resolve movement collisions, apply knockback forces
2. **CombatResolver**: Apply damage from all combat intents
3. **StateResolver**: Update unit states (dead, stunned, etc)

### Phase 3: Apply All Changes
Queue all resolved changes as commands and apply them at once via Transform.

## Example: Combat + Knockback

### OLD (Sequential):
```typescript
// MeleeCombat runs first
for (unit of units) {
  for (target of nearby) {
    if (inRange) {
      attack(unit, target); // MUTATES
    }
  }
}

// Knockback runs second, sees mutations
for (unit of units) {
  for (other of nearby) {
    if (colliding) {
      pushApart(unit, other); // MUTATES
    }
  }
}
```

### NEW (Parallel Intents):
```typescript
// Phase 1: Gather ALL intents (no mutations)
const combatIntents = [];
const knockbackForces = [];

// All rules see the SAME state
for (unit of units) {
  for (other of nearby) {
    if (canAttack(unit, other)) {
      combatIntents.push({ attacker: unit.id, target: other.id, damage: unit.dmg });
    }
    if (isColliding(unit, other)) {
      knockbackForces.push({ unit: unit.id, force: calculateForce(unit, other) });
    }
  }
}

// Phase 2: Resolve and batch
const commands = [];
for (intent of combatIntents) {
  commands.push({ type: 'damage', params: intent });
}
for (force of knockbackForces) {
  commands.push({ type: 'knockback', params: force });
}

// Phase 3: Apply all at once
processCommands(commands);
transform.commit();
```

## Benefits
1. **True Double Buffering**: All rules read from frozen state
2. **Parallelizable**: Rules can run concurrently
3. **Deterministic**: No order dependencies
4. **Better Performance**: Single N^2 loop instead of multiple
5. **Clean Architecture**: Clear separation of calculation and mutation

## Implementation Steps
1. Create Intent types for each interaction
2. Rewrite rules as intent calculators
3. Create resolvers to handle conflicts
4. Batch all commands
5. Single commit at end of step