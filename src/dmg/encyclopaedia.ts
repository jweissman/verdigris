import { Abilities } from "../rules/abilities";
import { Unit, UnitState } from "../types/Unit";
import { Vec2 } from "../types/Vec2";
import { Simulator } from "../core/simulator";
// import abilities from "../../data/abilities.json";

export default class Encyclopaedia {
  static abilities = Abilities.all;  //{...abilities};

  static bestiary: { [key: string]: Partial<Unit> } = {
    worm: {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "worm",
      state: "idle" as UnitState,
      hp: 10,
      maxHp: 10,
      mass: 4,
      abilities: ['jumps'],
    },
    farmer: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "farmer",
      state: "idle" as UnitState,
      hp: 25,
      maxHp: 25,
      mass: 1,
      tags: ['hunt'],
    },
    soldier: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "soldier",
      state: "idle" as UnitState,
      hp: 30,
      maxHp: 30,
      mass: 1,
      tags: ['hunt'],
    },
    ranger: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "slinger",
      state: "idle" as UnitState,
      hp: 20,
      maxHp: 20,
      mass: 1,
      abilities: ['ranged'],
    },
    bombardier: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "bombardier",
      state: "idle" as UnitState,
      hp: 18,
      maxHp: 18,
      mass: 1,
      abilities: ['bombardier'],
      tags: ['ranged'],
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },
    priest: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "priest",
      state: "idle" as UnitState,
      hp: 20,
      maxHp: 20,
      mass: 1,
      abilities: ['heal', 'radiant']
      // {
      //   heal: this.abilities.heal
      // }
    },
    tamer: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "tamer",
      state: "idle" as UnitState,
      hp: 20,
      maxHp: 20,
      mass: 1,
      // abilities: {
      //   // summon: Freehold.abilities.squirrel
      // }
    },
    squirrel: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "squirrel",
      state: "idle" as UnitState,
      hp: 5,
      maxHp: 5,
      mass: 1,
      tags: ['follower', 'beast', 'forest'],
      abilities: ['jumps']
    },
    megasquirrel: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "megasquirrel",
      state: "idle" as UnitState,
      hp: 40,
      maxHp: 40,
      mass: 8, // Much heavier than regular units
      tags: ['mythic', 'beast', 'forest'],
      abilities: ['jumps'],
      meta: {
        huge: true, // Mark as multi-cell unit
        facing: 'right' as 'left' | 'right' // Megasquirrels face right by default
      }
    },

    // Black faction units
    rainmaker: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "rainmaker",
      state: "idle" as UnitState,
      hp: 80,
      maxHp: 80,
      mass: 1,
      tags: ['weather', 'mythic'],
      abilities: ['makeRain'],
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    skeleton: {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "skeleton",
      state: "idle" as UnitState,
      hp: 25,
      maxHp: 25,
      mass: 1, // Lighter than living units
      tags: ['undead', 'black', 'hunt'],
      abilities: [],
      meta: {
        perdurance: 'undead', // Different healing rules
        facing: 'right' as 'left' | 'right'
      }
    },

    'skeleton-mage': {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "skeleton-mage",
      state: "idle" as UnitState,
      hp: 20,
      maxHp: 20,
      mass: 0.7, // Lighter than regular skeletons
      tags: ['undead', 'black', 'caster'],
      abilities: [],
      meta: {
        perdurance: 'undead', // Same as regular skeleton
        facing: 'right' as 'left' | 'right'
      }
    },

    ghost: {
      intendedMove: { x: 0, y: 0 },
      team: "hostile", 
      sprite: "ghost",
      state: "idle" as UnitState,
      hp: 30,
      maxHp: 30,
      mass: 0.1, // Nearly weightless
      tags: ['undead', 'spectral', 'black'],
      abilities: [],
      meta: {
        perdurance: 'spectral', // Only damaged by magic/environmental
        facing: 'right' as 'left' | 'right'
      }
    },

    demon: {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "demon", 
      state: "idle" as UnitState,
      hp: 60,
      maxHp: 60,
      mass: 2, // Heavy and strong
      tags: ['fiend', 'black', 'hunt'],
      abilities: ['fireBlast'],
      meta: {
        perdurance: 'fiendish', // Resistant to physical damage
        facing: 'right' as 'left' | 'right'
      }
    },

    'mimic-worm': {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "mimic-worm",
      state: "idle" as UnitState, 
      hp: 35,
      maxHp: 35,
      mass: 1.5,
      tags: ['shapeshifter', 'black'],
      abilities: ['jumps'],
      meta: {
        segmented: true, // Could be segmented like big worm
        segmentCount: 3, // Smaller than big worm
        facing: 'right' as 'left' | 'right'
      }
    },
    'big-worm': {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "big-worm",
      state: "idle" as UnitState,
      hp: 120,
      maxHp: 120,
      mass: 2,
      tags: ['beast', 'black', 'hunt'],
      abilities: ['breatheFire'],
      meta: {
        huge: true, // Mark as multi-cell unit
        segmented: true,
        segmentCount: 5, // Larger than mimic-worm
        facing: 'right' as 'left' | 'right'
      }
    },

    // Desert Megaworm - massive segmented desert predator
    'desert-megaworm': {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "big-worm", // Use big-worm sprite for now, can be updated later
      state: "idle" as UnitState,
      hp: 300,
      maxHp: 300,
      mass: 4,
      tags: ['beast', 'desert', 'hunt', 'segmented', 'massive'],
      abilities: ['sandBlast'],
      meta: {
        huge: true,
        segmented: true,
        segmentCount: 12, // Much longer than other worms
        facing: 'right' as 'left' | 'right',
        desertAdapted: true,
        heatResistant: true
      }
    },

    // Forest Day creatures
    "forest-squirrel": {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "squirrel",
      state: "idle" as UnitState,
      hp: 25,
      maxHp: 25,
      mass: 0.8,
      tags: ['forest', 'agile', 'gatherer'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        canClimb: true,
        jumpHeight: 3,
        acornStash: 0
      }
    },

    "owl": {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "demon", // Using demon sprite for now - looks owl-like
      state: "idle" as UnitState,
      hp: 30,
      maxHp: 30,
      mass: 1,
      tags: ['forest', 'flying', 'hunter', 'nocturnal'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        flying: true,
        z: 2, // Flies above ground
        vision: 12, // Excellent night vision
        silentFlight: true
      }
    },

    "bear": {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "megasquirrel", // Using megasquirrel for now - large forest creature
      state: "idle" as UnitState,
      hp: 80,
      maxHp: 80,
      mass: 3,
      tags: ['forest', 'tank', 'territorial'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        intimidating: true,
        hibernating: false,
        swipeRange: 2
      }
    },

    "bird": {
      intendedMove: { x: 0, y: 0 },
      team: "neutral",
      sprite: "leaf", // Small sprite for ambient bird
      state: "idle" as UnitState,
      hp: 5,
      maxHp: 5,
      mass: 0.2,
      tags: ['forest', 'ambient', 'energy', 'flying'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        flying: true,
        z: 3,
        energyValue: 10, // Provides energy when caught
        flightPattern: 'circular'
      }
    },

    "tracker": {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "ranger",
      state: "idle" as UnitState,
      hp: 35,
      maxHp: 35,
      mass: 1,
      tags: ['forest', 'hunter', 'specialist'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        tracking: true,
        footprintDetection: 5, // Can see footprints within 5 tiles
        trapSetting: true,
        netRange: 4
      }
    },

    // Desert Grappler - specialized hunter with grappling hooks
    grappler: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "grappler", // New grappler sprite!
      state: "idle" as UnitState,
      hp: 35,
      maxHp: 35,
      dmg: 8,
      mass: 1,
      tags: ['desert', 'hunter', 'specialist', 'grappler'],
      abilities: ['grapplingHook', 'pinTarget'],
      meta: {
        facing: 'right' as 'left' | 'right',
        desertAdapted: true,
        grapplingRange: 8,
        maxGrapples: 2 // Can maintain 2 grapples simultaneously
      }
    },

    // Additional forest creatures
    deer: {
      intendedMove: { x: 0, y: 0 },
      team: "neutral",
      sprite: "deer",
      state: "idle" as UnitState,
      hp: 20,
      maxHp: 20,
      dmg: 2,
      mass: 1.5,
      tags: ['forest', 'beast', 'peaceful'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        moveSpeed: 1.2, // Fast runner
        fleeDistance: 5, // Runs from threats
        peaceful: true
      }
    },

    rabbit: {
      intendedMove: { x: 0, y: 0 },
      team: "neutral",
      sprite: "rabbit",
      state: "idle" as UnitState,
      hp: 8,
      maxHp: 8,
      dmg: 1,
      mass: 0.3,
      tags: ['forest', 'beast', 'small', 'peaceful'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        moveSpeed: 1.5, // Very fast
        jumpRange: 3,
        fleeDistance: 6,
        peaceful: true
      }
    },

    fox: {
      intendedMove: { x: 0, y: 0 },
      team: "neutral",
      sprite: "fox",
      state: "idle" as UnitState,
      hp: 15,
      maxHp: 15,
      dmg: 4,
      mass: 0.8,
      tags: ['forest', 'beast', 'hunter', 'clever'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        moveSpeed: 1.1,
        stealthy: true, // Harder to detect
        huntSmallCreatures: true // Will hunt rabbits, birds
      }
    },

    wolf: {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "wolf",
      state: "idle" as UnitState,
      hp: 30,
      maxHp: 30,
      dmg: 8,
      mass: 2,
      tags: ['forest', 'beast', 'predator', 'pack'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        packHunter: true, // Gets stronger near other wolves
        howl: true // Can call other wolves
      }
    },

    badger: {
      intendedMove: { x: 0, y: 0 },
      team: "neutral",
      sprite: "badger",
      state: "idle" as UnitState,
      hp: 25,
      maxHp: 25,
      dmg: 6,
      mass: 1.8,
      tags: ['forest', 'beast', 'burrower', 'defensive'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        canBurrow: true,
        defensive: true, // Higher defense when threatened
        territorial: true // Attacks if approached
      }
    },

    naturalist: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "naturalist",
      state: "idle" as UnitState,
      hp: 30,
      maxHp: 30,
      dmg: 3,
      mass: 1,
      tags: ['forest', 'support', 'beast-tamer'],
      abilities: ['tameMegabeast', 'calmAnimals'],
      meta: {
        facing: 'right' as 'left' | 'right',
        forestAdapted: true,
        beastAffinity: true // Beasts are less likely to attack
      }
    },

    // Desert day units
    "worm-hunter": {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "wormrider", // New worm rider sprite!
      state: "idle" as UnitState,
      hp: 25,
      maxHp: 25,
      mass: 0.8, // Light and fast
      tags: ['desert', 'hunter', 'agile', 'assassin'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        desertAdapted: true,
        canClimbGrapples: true, // Can move along grapple lines
        moveSpeed: 1.5, // 50% faster than normal
        dashRange: 4
      }
    },

    waterbearer: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "waterpriest", // New water priest sprite!
      state: "idle" as UnitState,
      hp: 30,
      maxHp: 30,
      mass: 1,
      tags: ['desert', 'support', 'healer', 'detector'],
      abilities: ['waterBless', 'detectSpies'],
      meta: {
        facing: 'right' as 'left' | 'right',
        desertAdapted: true,
        waterReserves: 100, // Special resource for abilities
        detectRange: 6 // Can detect hidden/spy units
      }
    },

    skirmisher: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "soldier", // Fast melee fighter
      state: "idle" as UnitState,
      hp: 22,
      maxHp: 22,
      mass: 0.9,
      tags: ['desert', 'melee', 'agile', 'duelist'],
      abilities: ['dualKnifeDance'],
      meta: {
        facing: 'right' as 'left' | 'right',
        desertAdapted: true,
        dualWield: true,
        attackSpeed: 1.5, // Faster attacks
        dodgeChance: 0.25 // 25% chance to dodge
      }
    },

    // Segmented worm creatures
    "sand-ant": {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "worm",
      state: "idle" as UnitState,
      hp: 20,
      maxHp: 20,
      mass: 2,
      tags: ['desert', 'segmented', 'construct', 'toy'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        segmented: true,
        segmentCount: 2, // Tiny toy ant with 2 segments
        sandAdapted: true
      }
    },

    "desert-worm": {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "worm",
      state: "idle" as UnitState,
      hp: 60,
      maxHp: 60,
      mass: 6,
      tags: ['desert', 'segmented', 'beast', 'burrower'],
      abilities: ['sandBlast', 'burrowAmbush'],
      meta: {
        facing: 'right' as 'left' | 'right',
        segmented: true,
        segmentCount: 4, // 4 body segments - medium size
        canBurrow: true,
        sandAdapted: true
      }
    },

    // Medium-sized mesoworm with custom sprites for each segment
    mesoworm: {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "mesoworm-head",
      state: "idle" as UnitState,
      hp: 35,
      maxHp: 35,
      mass: 2.5,
      dmg: 5,
      tags: ['forest', 'beast', 'segmented'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        segmented: true,
        segmentCount: 2, // 2 segments: body and tail
        useCustomSegmentSprites: true, // Use mesoworm-body and mesoworm-tail
        moveSpeed: 0.8 // Slightly slower than normal
      }
    },

    // Regular-sized segmented worm - separates segmented from huge concept
    "segmented-worm": {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "worm", // Uses regular worm sprite (16x16)
      state: "idle" as UnitState,
      hp: 40,
      maxHp: 40,
      mass: 3,
      tags: ['beast', 'segmented'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        segmented: true,
        segmentCount: 3, // 3 body segments - medium size
        // No huge flag - this is a regular-sized creature
        // No special width/height - uses standard 16x16
      }
    },

    "giant-sandworm": {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "big-worm", // Use the big-worm sprite
      state: "idle" as UnitState,
      hp: 120,
      maxHp: 120,
      mass: 50, // Massive creature, can't be pulled only pinned
      tags: ['desert', 'segmented', 'titan', 'burrower'],
      abilities: [],
      meta: {
        facing: 'right' as 'left' | 'right',
        segmented: true,
        segmentCount: 6, // 6 body segments for massive worm
        canBurrow: true,
        sandAdapted: true,
        huge: true, // Takes up multiple grid cells
        width: 64,  // Each frame is 64x32
        height: 32
      }
    },

    // Mechanist leader - calls in Mechatron support
    mechatronist: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "mechatronist",
      state: "idle" as UnitState,
      hp: 30,
      maxHp: 30,
      mass: 1,
      tags: ['mechanical', 'leader', 'engineer'],
      abilities: ['callAirdrop', 'tacticalOverride'],
      meta: {
        facing: 'right' as 'left' | 'right',
        calledAirdrop: false,
        canRideMechatron: true // Enable riding mechanics
      }
    },

    // Support mechanist units
    builder: { // Rigger role - construct assembly
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "builder",
      state: "idle" as UnitState,
      hp: 20,
      maxHp: 20,
      mass: 1,
      tags: ['mechanical', 'support', 'builder'],
      abilities: ['reinforceConstruct'],
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    fueler: { // Energy management specialist
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "fueler",
      state: "idle" as UnitState,
      hp: 18,
      maxHp: 18,
      mass: 1,
      tags: ['mechanical', 'support', 'energy'],
      abilities: ['powerSurge'],
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    mechanic: { // Repair specialist
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "mechanic",
      state: "idle" as UnitState,
      hp: 22,
      maxHp: 22,
      mass: 1,
      tags: ['mechanical', 'support', 'repair'],
      abilities: ['emergencyRepair'],
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    engineer: { // Systems specialist
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "engineer",
      state: "idle" as UnitState,
      hp: 25,
      maxHp: 25,
      mass: 1,
      tags: ['mechanical', 'support', 'systems'],
      abilities: ['shieldGenerator', 'systemHack'],
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    welder: { // Alternative repair/build unit
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "welder",
      state: "idle" as UnitState,
      hp: 24,
      maxHp: 24,
      mass: 1,
      tags: ['mechanical', 'support', 'welder'],
      abilities: ['emergencyRepair', 'reinforceConstruct'],
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    assembler: { // Advanced constructor
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "assembler",
      state: "idle" as UnitState,
      hp: 26,
      maxHp: 26,
      mass: 1,
      tags: ['mechanical', 'support', 'assembler'],
      abilities: ['reinforceConstruct', 'powerSurge'],
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    // Massive war machine - airdropped from above
    mechatron: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "mechatron",
      state: "idle" as UnitState,
      hp: 200,
      maxHp: 200,
      mass: 5, // Extremely heavy
      tags: ['mechanical', 'huge', 'artillery', 'hunt'],
      abilities: ['missileBarrage', 'laserSweep', 'empPulse', 'shieldRecharge'],
      meta: {
        huge: true,
        width: 32, // 32 pixels wide
        height: 64, // 64 pixels tall 
        cellsWide: 4, // 4 cells wide (32/8)
        cellsHigh: 8, // 8 cells high (64/8)
        armor: 5, // Heavy armor reduces incoming damage
        facing: 'right' as 'left' | 'right',
        shieldActive: false,
        damageReduction: 0.2 // Base 20% damage reduction from armor
      }
    },

    // Toymaker and constructs
    toymaker: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "toymaker",
      state: "idle" as UnitState,
      hp: 25,
      maxHp: 25,
      mass: 1,
      tags: ['mechanical', 'craftor'],
      abilities: ['deployBot'],
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    freezebot: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "freezebot",
      state: "idle" as UnitState,
      hp: 8,
      maxHp: 8,
      mass: 0.5,
      tags: ['construct', 'ice', 'hunt'],
      abilities: ['freezeAura'],
      meta: {
        perdurance: 'sturdiness', // Takes max 1 damage per hit
        facing: 'right' as 'left' | 'right'
      }
    },

    clanker: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "clanker",
      state: "idle" as UnitState,
      hp: 6,
      maxHp: 6,
      mass: 0.8,
      tags: ['construct', 'explosive', 'hunt', 'aggressive'],
      abilities: ['explode'],
      meta: {
        perdurance: 'sturdiness',
        facing: 'right' as 'left' | 'right'
      }
    },

    spiker: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly", 
      sprite: "spikebot",
      state: "idle" as UnitState,
      hp: 10,
      maxHp: 10,
      mass: 0.6,
      tags: ['construct', 'melee', 'hunt'],
      abilities: ['whipChain'],
      meta: {
        perdurance: 'sturdiness',
        facing: 'right' as 'left' | 'right'
      }
    },

    swarmbot: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "swarmbot",
      state: "idle" as UnitState,
      hp: 12, // Population-based: each HP represents several small bots
      maxHp: 12,
      mass: 0.3,
      tags: ['construct', 'swarm', 'hunt'],
      abilities: [],
      meta: {
        perdurance: 'swarm', // Population-based health
        facing: 'right' as 'left' | 'right'
      }
    },

    roller: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "jumpbot", // Using jumpbot sprite for roller
      state: "idle" as UnitState,
      hp: 15,
      maxHp: 15,
      mass: 1.2,
      tags: ['construct', 'charger', 'hunt'],
      abilities: ['chargeAttack'],
      meta: {
        perdurance: 'sturdiness',
        facing: 'right' as 'left' | 'right'
      }
    },

    zapper: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "zapper", // Using proper zapper sprite
      state: "idle" as UnitState,
      hp: 8,
      maxHp: 8,
      mass: 0.4,
      tags: ['construct', 'electrical', 'hunt'],
      abilities: ['zapHighest'],
      meta: {
        perdurance: 'sturdiness',
        facing: 'right' as 'left' | 'right'
      }
    },

    druid: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "druid",
      state: "idle" as UnitState,
      hp: 35,
      maxHp: 35,
      dmg: 4,
      mass: 1,
      tags: ['forest', 'magic', 'nature'],
      abilities: ['summonForestCreature', 'entangle'],
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    naturist: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "naturist",
      state: "idle" as UnitState,
      hp: 28,
      maxHp: 28,
      dmg: 3,
      mass: 1,
      tags: ['forest', 'support', 'nature'],
      abilities: ['regenerate'],
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    wildmage: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "wildmage",
      state: "idle" as UnitState,
      hp: 25,
      maxHp: 25,
      dmg: 6,
      mass: 1,
      tags: ['forest', 'magic', 'chaos'],
      abilities: ['wildBolt'],
      meta: {
        facing: 'right' as 'left' | 'right'
      }
    },

    // Miner - resource gatherer and tunnel creator
    miner: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "miner",
      state: "idle" as UnitState,
      hp: 35,
      maxHp: 35,
      dmg: 5,
      mass: 1.2,
      tags: ['worker', 'burrower', 'explorer'],
      abilities: ['digTrench'],
      meta: {
        facing: 'right' as 'left' | 'right',
        canBurrow: true,
        miningSpeed: 2,
        oreCarryCapacity: 10,
        currentOre: 0,
        tunnelRange: 5
      }
    },

    // Mindmender - psychic healer and buff unit
    mindmender: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "mindmender",
      state: "idle" as UnitState,
      hp: 28,
      maxHp: 28,
      dmg: 2,
      mass: 0.9,
      tags: ['psychic', 'support', 'healer'],
      abilities: ['psychicHeal'],
      meta: {
        facing: 'right' as 'left' | 'right',
        psychicRange: 6,
        mindShieldDuration: 50,
        confuseDuration: 30,
        healAmount: 15
      }
    }
  }

  static counts: { [seriesName: string]: number } = {}
  static id(seriesName: string): number | string {
    this.counts = this.counts || {};
    let count = (this.counts[seriesName] || 0);
    this.counts[seriesName] = count + 1;
    return count || "";
  }

  static unit(beast: string): Unit {
    let u = {
        id: beast + this.id(beast),
        type: beast,
        pos: { x: 0, y: 0 }, // Default position, will be overridden when placing
        intendedMove: { x: 0, y: 0 },
        state: "idle" as UnitState,
        team: 'neutral' as const, // Default team
        ...this.bestiary[beast],
        hp: this.bestiary[beast]?.hp || 10, // Default HP if not specified
        maxHp: this.bestiary[beast]?.hp || 10,
        abilities: this.bestiary[beast]?.abilities || [],
        sprite: this.bestiary[beast]?.sprite || beast,
        mass: this.bestiary[beast]?.mass || 1,
        dmg: this.bestiary[beast]?.dmg || 1, // Default
        meta: { ...(this.bestiary[beast]?.meta || {}) }, // Deep clone meta to avoid shared state
        tags: [
          ...(this.bestiary[beast]?.tags || []), // Include tags from bestiary
          ...(beast === "worm" ? ["swarm"] : []),
          ...(beast === "megasquirrel" ? ["hunt"] : []),
          ...(beast === "squirrel" ? ["hunt"] : []),
          ...(beast === "farmer" ? ["hunt"] : []),
          ...(beast === "soldier" ? ["hunt"] : []),
        ]
      };

    // Ensure meta property always exists
    if (!u.meta) {
      u.meta = {};
    }

    return u;
  }
}