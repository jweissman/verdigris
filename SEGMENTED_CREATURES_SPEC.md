# Segmented Creatures Specification

## Overview
Segmented creatures are multi-part entities that behave as snake-like formations. Each creature has a head (the main unit) and multiple body/tail segments that follow behind in a path-following pattern.

## Core Mechanics

### Segment Creation
- **Trigger**: When a unit with `meta.segmented = true` enters the simulation
- **Timing**: Segments created during first rule application via queued `spawn` commands  
- **Count**: Controlled by `meta.segmentCount` property
- **Prevention**: `hasSegments()` check prevents duplicate creation

### Segment Types
- **Head**: The original unit (index 0)
- **Body**: Middle segments (indices 1 to segmentCount-1) 
- **Tail**: Final segment (index segmentCount)

### Custom Sprites
- **Standard**: All segments use same sprite as head
- **Custom**: When `meta.useCustomSegmentSprites = true`, uses `{base}-head`, `{base}-body`, `{base}-tail`
- **Example**: `mesoworm-head` → `mesoworm-body`, `mesoworm-tail`

### Movement System
- **Path History**: Head movement creates path trail
- **Following**: Segments follow path with lag based on `segmentIndex`
- **Snake-like**: Creates natural serpentine movement

### Damage System  
- **Propagation**: Segment damage transfers 50% to head
- **Chain Damage**: Destroyed segments damage adjacent segments (5hp)
- **Head Death**: Kills all segments via `cleanupOrphanedSegments()`

### Grappling Integration
- **Individual Targeting**: Each segment can be grappled separately
- **Movement Penalty**: Grappled segments slow entire creature
- **Compound Effect**: Multiple grappled segments increase slowdown
- **Head Pinning**: Pinning segment index 1 immobilizes entire creature

## Current Issues

### Rendering
- **Unknown**: Segments may not render correctly in all views
- **Positioning**: Large segments (huge creatures) might overlap incorrectly
- **Z-ordering**: Flying segmented creatures need proper layer handling

### Performance
- **Path History**: O(N) memory per creature, could accumulate
- **Grappling**: O(N²) pairwise checks scale with segment count  
- **Update Frequency**: Rules fire every tick, potentially expensive

### Creation Bug
- **Symptom**: Multiple creatures create excess segments
- **Cause**: Rule fires multiple times or hasSegments() fails
- **Workaround**: Test single creatures in isolation

## Test Integration Scenarios

### Scenario 1: Basic Segmented Movement
```
# Single worm movement test
w........
.........
---
bg forest
# w = mesoworm (2 segments, custom sprites)
```

### Scenario 2: Multi-Creature Grappling  
```
# Grappler vs segmented worm
g.......w
.........
---
bg desert
# g = grappler, w = desert-worm (4 segments)
```

### Scenario 3: Dragon Day Preview
```
# Dragon encounter (when ready)
L.......D
.........
---
bg mountain-pass
# L = lancer, D = dragon (8 segments, flying)
```

## Implementation Status

### ✅ Working
- Basic segment creation and following
- Damage propagation between segments
- Grappling slowdown effects
- Path history and movement
- Orphan cleanup

### ⚠️ Needs Testing  
- Rendering in all view modes
- Performance with many segmented creatures
- Flying segmented creatures (dragons)
- Custom sprite system (mesoworm)

### ❌ Broken
- Multi-creature scenarios create excess segments
- hasSegments() check may be insufficient
- Large creatures (96x64 dragons) positioning

## Next Steps

1. **Create minimal rendering test** - Single mesoworm in creature browser
2. **Fix creation bug** - Debug why multi-creature scenarios fail
3. **Performance test** - Many segmented creatures at once  
4. **Dragon integration** - Flying + segmented + huge mechanics
5. **Visual polish** - Ensure segments render as connected chain