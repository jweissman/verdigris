# Command Consolidation Analysis

## Current Commands (49 total)

### Unit Management
- **spawn/add** - Create new units
- **deploy** - Deploy units (similar to spawn?)
- **airdrop/drop** - Drop units from above
- **remove** - Remove units
- **cleanup** - Clean up dead units
- **kill/markDead** - Kill units
- **hero** - Hero-specific actions

### Movement & Positioning
- **move** - Move unit
- **moves** - Multiple moves
- **move_target** - Move to target
- **jump** - Jump to location
- **toss** - Throw unit
- **knockback** - Push unit back
- **pull** - Pull unit
- **grapple/hook** - Grapple mechanics
- **burrow** - Burrow underground
- **wander** - Random movement

### Combat
- **strike/attack** - Melee attack
- **damage** - Deal damage
- **heal** - Heal unit
- **projectile** - Create projectile
- **removeProjectile** - Remove projectile
- **bolt/lightning** - Lightning strike
- **fire** - Fire attack
- **aoe** - Area of effect

### Status & State
- **charm/changeTeam** - Change team
- **pin** - Pin unit
- **halt** - Stop unit
- **pose** - Change pose
- **guard** - Guard position
- **face** - Face direction
- **target** - Set target
- **applyStatusEffect** - Apply status
- **updateStatusEffects** - Update statuses
- **meta** - Update metadata

### Environment
- **weather** - Change weather
- **storm** - Storm effects (merged into weather?)
- **temperature/temp** - Temperature change
- **humidity** - Humidity change
- **plant** - Plant vegetation
- **bg** - Background effects

### Visual Effects
- **particle** - Single particle
- **particles** - Batch particles
- **effects** - General effects
- **ability_effects** - Ability-specific effects

### System
- **forces** - Physics forces
- **ai** - AI behavior
- **simulate** - Simulation control
- **scene_metadata** - Scene metadata

## Consolidation Recommendations

### 1. Merge Duplicates (Already Done)
- bolt = lightning
- airdrop = drop
- grapple = hook
- strike = attack
- spawn = add
- charm = changeTeam
- temperature = temp

### 2. Combine Related Commands

#### Unit Creation → "spawn"
- Merge: spawn, deploy, airdrop
- Parameters: type, position, method (normal/airdrop/deploy)

#### Movement → "move"
- Keep move as is, but enhance with:
  - mode: walk/jump/burrow/wander
  - target: position/unit/direction

#### Combat → "attack"
- Merge: strike, damage
- Parameters: type (melee/ranged), damage, aspect

#### Effects → "effect"
- Merge: particle, particles, effects, ability_effects
- Parameters: type, batch, ability-specific

#### Status → "status"
- Merge: applyStatusEffect, updateStatusEffects
- Parameters: action (apply/update/remove), effect

#### Weather → "weather"
- Merge: weather, storm, temperature, humidity
- Parameters: type (rain/storm/clear), property (temp/humidity)

### 3. Remove Redundant Commands
- **removeProjectile** - Can be handled by projectile command with remove action
- **updateStatusEffects** - Can be part of status command
- **moves** - Can be handled by move command with multiple targets
- **move_target** - Can be part of move command

### 4. Simplify Names
- applyStatusEffect → status
- ability_effects → effects (with ability parameter)
- scene_metadata → scene

## Proposed Simplified Command List (~30 commands)

### Core Unit Commands (7)
1. **spawn** - Create units (normal/airdrop/deploy)
2. **remove** - Remove units
3. **kill** - Kill units
4. **hero** - Hero actions
5. **charm** - Change team/charm
6. **guard** - Guard position
7. **face** - Face direction

### Movement (5)
8. **move** - All movement (walk/jump/burrow/wander)
9. **toss** - Throw unit
10. **knockback** - Push back
11. **pull** - Pull unit
12. **grapple** - Grapple/hook

### Combat (6)
13. **attack** - Melee/ranged attack
14. **heal** - Heal unit
15. **projectile** - Projectile management
16. **bolt** - Lightning strike
17. **fire** - Fire attack
18. **aoe** - Area effect

### Status & State (5)
19. **status** - Status effects
20. **pin** - Pin unit
21. **halt** - Stop unit
22. **pose** - Change pose
23. **target** - Set target
24. **meta** - Metadata

### Environment (4)
25. **weather** - All weather (rain/storm/temp/humidity)
26. **plant** - Plant vegetation
27. **bg** - Background

### System (3)
28. **effect** - All visual effects
29. **ai** - AI behavior
30. **simulate** - Simulation control