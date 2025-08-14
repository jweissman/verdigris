# Dragon Day Specification

## Dragon Unit Design

**Core Concept**: Dragons are distinct from sandworms - they're flying, armored, fire-breathing creatures that cannot be segmented but require specialized tactics to defeat.

### Dragon Stats
```json
"dragon": {
  "hp": 400,
  "maxHp": 400,
  "mass": 100,
  "sprite": "dragon", 
  "team": "hostile",
  "tags": ["dragon", "flying", "mythic", "armored", "fire-breathing"],
  "abilities": ["dragonFire", "wingStorm", "terrifyingRoar"],
  "meta": {
    "flying": true,
    "huge": true,
    "width": 96,
    "height": 64,
    "armor": 10,
    "fireImmune": true,
    "segmented": true,
    "segmentCount": 8,
    "facing": "right"
  }
}
```

**Key Differences from Sandworms**:
- **Segmented but armored** - has segments like worms but with heavy armor plating
- **Flying** - operates at different Z-level, immune to ground effects  
- **Heavily armored segments** - each segment has armor, requires anti-armor weapons
- **Fire immunity** - standard fire attacks ineffective

## Lancer Unit Design

**Core Concept**: Anti-dragon specialists with kinematic chain harpoons that can pierce armor and anchor flying creatures.

### Lancer Stats
```json
"lancer": {
  "hp": 45,
  "maxHp": 45,
  "mass": 1.2,
  "sprite": "lancer",
  "team": "friendly", 
  "tags": ["specialist", "anti-armor", "dragon-hunter"],
  "abilities": ["harpoonChain", "winchPull", "armorPierce"],
  "meta": {
    "facing": "right",
    "harpoonRange": 12,
    "chainLength": 15,
    "armorPiercing": 8,
    "windSpeed": 2
  }
}
```

## Wormhunter Enhancement

**Core Concept**: Agile units that can run up grappling ropes to attack weak points.

### Enhanced Wormhunter
```json
"worm-hunter": {
  // existing stats +
  "abilities": ["ropeClimb", "segmentStrike"],
  "meta": {
    // existing meta +
    "canClimbGrapples": true,
    "climbSpeed": 3,
    "segmentDamageBonus": 2
  }
}
```

## New Abilities Needed

### harpoonChain
- **Range**: 12 cells
- **Effect**: Pierces armor, pins flying creatures to ground
- **Special**: Can penetrate dragon armor (ignores 50% of armor value)

### winchPull  
- **Effect**: Mechanically pulls pinned creatures, no mass limit
- **Special**: Works on any creature regardless of size/mass

### ropeClimb
- **Effect**: Move along grappling ropes toward target
- **Special**: Immune to rope damage, can reach elevated/flying enemies

### armorPierce
- **Effect**: Ignore armor on next attack
- **Cooldown**: 60 ticks

## Scene: Dragon Valley Battle

```
# Dragon Valley - The Ultimate Dragon Hunt
# Lancers vs Ancient Dragon

L.........L.........L
.....................
.........w.w.........
.....................
.........D...........
.....................
.........G.G.........
.....................

# L = lancer (anti-dragon specialist)
# w = worm-hunter (rope climbers) 
# G = grappler (support harpoons)
# D = dragon (the target)

bg mountain-pass
weather storm
strip wide
width 400
height 300
```

## Implementation Priority

1. **Add dragon to units.json** 
2. **Add lancer to units.json**
3. **Implement harpoonChain ability** in abilities.json
4. **Enhance grappling physics** for armor piercing
5. **Add ropeClimb mechanic** to movement system
6. **Create dragon-valley.battle.txt** scene
7. **Test with existing grappling/segmented systems**

This creates a tactical puzzle: dragons are too armored for normal attacks, too heavy to grapple normally, and fly above ground units. Only specialized lancers with armor-piercing harpoons can bring them down, while wormhunters exploit the ropes to reach weak points.