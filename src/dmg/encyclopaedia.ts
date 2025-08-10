import { Abilities } from "../rules/abilities";
import { Unit, UnitState, Vec2 } from "../sim/types";
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
    },
    bombardier: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "bombardier",
      state: "idle" as UnitState,
      hp: 18,
      maxHp: 18,
      mass: 1,
    },
    priest: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "priest",
      state: "idle" as UnitState,
      hp: 20,
      mass: 1,
      abilities: ['heal']
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
      abilities: {
        jumps: this.abilities.jumps // Mini-squirrels can jump too
      }
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
      abilities: {
        jumps: this.abilities.jumps,
        // Could add special megasquirrel abilities here
      },
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
      abilities: {
        makeRain: this.abilities.makeRain
      },
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
      abilities: {},
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
      abilities: {
        // Could add lightning or magic missile abilities here
      },
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
      abilities: {},
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
      abilities: {
        fireBlast: this.abilities.fireBlast
      },
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
      abilities: {
        jumps: this.abilities.jumps, // Can jump like worms
      },
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
      abilities: {},
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
      abilities: {
        sandBlast: this.abilities.fireBlast // Repurpose fire blast as sand blast
      },
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {
        grapplingHook: this.abilities.grapplingHook,
        pinTarget: this.abilities.pinTarget
      },
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {
        tameMegabeast: Encyclopaedia.abilities.tameMegabeast,
        calmAnimals: Encyclopaedia.abilities.calmAnimals
      },
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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

    "sand-ant": {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "worm", // Small segmented creature
      state: "idle" as UnitState,
      hp: 20,
      maxHp: 20,
      mass: 2,
      tags: ['desert', 'segmented', 'swarm', 'construct'],
      abilities: {},
      meta: {
        facing: 'right' as 'left' | 'right',
        segmented: true,
        segmentCount: 2, // Just 2 segments for ant
        toyConstruct: true, // Mechanical toy ant
        sandAdapted: true
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {},
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
      abilities: {
        missileBarrage: this.abilities.missileBarrage,
        laserSweep: this.abilities.laserSweep,
        empPulse: this.abilities.empPulse,
        shieldRecharge: this.abilities.shieldRecharge
      },
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
      abilities: {},
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
      meta: {
        perdurance: 'sturdiness',
        facing: 'right' as 'left' | 'right'
      }
    },

    // Forest Day creatures
    'forest-squirrel': {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "squirrel",
      state: "idle" as UnitState,
      hp: 12,
      maxHp: 12,
      dmg: 3,
      mass: 0.5,
      tags: ['forest', 'agile'],
      abilities: {
        squirrel: {
          name: "nut-throw",
          energy: 3,
          cooldown: 8,
          range: 4,
          effect: (unit: Partial<Unit>, target: Vec2, sim: Simulator) => {
            const projectile = {
              id: `acorn_${unit.id}_${Date.now()}`,
              pos: { x: unit.pos.x, y: unit.pos.y },
              vel: { x: (target.x - unit.pos.x) * 0.3, y: (target.y - unit.pos.y) * 0.3 },
              team: unit.team,
              damage: 3,
              radius: 0.5,
              type: 'projectile'
            };
            sim.projectiles.push(projectile as any);
          }
        }
      }
    },

    owl: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "owl",
      state: "idle" as UnitState,
      hp: 20,
      maxHp: 20,
      dmg: 5,
      mass: 0.8,
      tags: ['forest', 'flying', 'nocturnal', 'beast'],
      abilities: {}
    },

    bear: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "bear",
      state: "idle" as UnitState,
      hp: 50,
      maxHp: 50,
      dmg: 12,
      mass: 3,
      tags: ['forest', 'heavy', 'powerful', 'beast'],
      abilities: {}
    },

    bird: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "bird",
      state: "idle" as UnitState,
      hp: 8,
      maxHp: 8,
      dmg: 2,
      mass: 0.3,
      tags: ['forest', 'flying', 'small', 'beast'],
      abilities: {}
    },

    tracker: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "ranger",
      state: "idle" as UnitState,
      hp: 25,
      maxHp: 25,
      dmg: 6,
      mass: 1,
      tags: ['forest', 'scout'],
      abilities: {
        ranged: {
          name: "arrow",
          energy: 3,
          cooldown: 10,
          range: 8,
          effect: (unit: Partial<Unit>, target: Vec2, sim: Simulator) => {
            const projectile = {
              id: `arrow_${unit.id}_${Date.now()}`,
              pos: { x: unit.pos.x, y: unit.pos.y },
              vel: { x: (target.x - unit.pos.x) * 0.4, y: (target.y - unit.pos.y) * 0.4 },
              team: unit.team,
              damage: 6,
              radius: 0.8,
              type: 'bullet'
            };
            sim.projectiles.push(projectile as any);
          }
        }
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
      abilities: {
        summonForestCreature: Encyclopaedia.abilities.summonForestCreature,
        entangle: {
          name: "entangle",
          energy: 5,
          cooldown: 15,
          range: 6,
          effect: (unit: Partial<Unit>, target: Vec2, sim: Simulator) => {
            // Find enemy at target position
            const enemy = sim.units.find(u => 
              u.team !== unit.team &&
              Math.abs(u.pos.x - target.x) < 1 &&
              Math.abs(u.pos.y - target.y) < 1
            );
            if (enemy) {
              if (!enemy.meta) enemy.meta = {};
              enemy.meta.pinned = true;
              enemy.meta.pinDuration = 30;
              // Visual effect
              sim.particles.push({
                pos: { x: enemy.pos.x * 8, y: enemy.pos.y * 8 },
                vel: { x: 0, y: -1 },
                radius: 3,
                color: '#228B22',
                lifetime: 30,
                type: 'entangle'
              });
            }
          }
        }
      },
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
      abilities: {
        regenerate: {
          name: "regenerate",
          energy: 4,
          cooldown: 20,
          range: 5,
          effect: (unit: Partial<Unit>, target: Vec2, sim: Simulator) => {
            // Heal all nearby friendly units
            const allies = sim.units.filter(u => 
              u.team === unit.team &&
              Math.abs(u.pos.x - unit.pos.x) <= 5 &&
              Math.abs(u.pos.y - unit.pos.y) <= 5
            );
            allies.forEach(ally => {
              if (ally.hp < ally.maxHp) {
                ally.hp = Math.min(ally.maxHp, ally.hp + 5);
                // Visual effect
                sim.particles.push({
                  pos: { x: ally.pos.x * 8, y: ally.pos.y * 8 },
                  vel: { x: 0, y: -0.5 },
                  radius: 2,
                  color: '#90EE90',
                  lifetime: 15,
                  type: 'heal'
                });
              }
            });
          }
        }
      },
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
      abilities: {
        wildBolt: {
          name: "wild-bolt",
          energy: 4,
          cooldown: 8,
          range: 7,
          effect: (unit: Partial<Unit>, target: Vec2, sim: Simulator) => {
            // Random elemental projectile
            const elements = ['fire', 'ice', 'lightning'];
            const element = elements[Math.floor(Math.random() * elements.length)];
            const colors = { fire: '#FF4500', ice: '#00BFFF', lightning: '#FFD700' };
            
            const projectile = {
              id: `wild_bolt_${unit.id}_${Date.now()}`,
              pos: { x: unit.pos.x, y: unit.pos.y },
              vel: { x: (target.x - unit.pos.x) * 0.4, y: (target.y - unit.pos.y) * 0.4 },
              team: unit.team,
              damage: element === 'lightning' ? 8 : 6,
              radius: 1,
              type: 'bullet',
              element: element
            };
            sim.projectiles.push(projectile as any);
            
            // Visual effect at launch
            sim.particles.push({
              pos: { x: unit.pos.x * 8, y: unit.pos.y * 8 },
              vel: { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1 },
              radius: 2,
              color: colors[element],
              lifetime: 10,
              type: 'magic'
            });
          }
        }
      },
      meta: {
        facing: 'right' as 'left' | 'right'
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
  static unit(beast: string): Partial<Unit> {
    let u = {
        id: beast + this.id(beast),
        type: beast,
        // pos: { x, y },
        intendedMove: { x: 0, y: 0 },
        state: "idle" as UnitState,
        ...this.bestiary[beast],
        maxHp: this.bestiary[beast].hp,
        abilities: {
          ...(this.bestiary[beast]?.abilities || {}), // Preserve abilities defined in bestiary
          ...(beast === "worm" ? { jumps: this.abilities.jumps } : {}),
          ...(beast === "ranger" ? { ranged: this.abilities.ranged } : {}),
          ...(beast === "bombardier" ? { bombardier: this.abilities.bombardier } : {}),
          ...(beast === "priest" ? { heal: this.abilities.heal, radiant: this.abilities.radiant } : {}),
          ...(beast === "tamer" ? { heal: this.abilities.squirrel } : {}),
          ...(beast === "megasquirrel" ? { jumps: this.abilities.jumps } : {}),
          ...(beast === "mimic-worm" ? { jumps: this.abilities.jumps } : {}),
          ...(beast === "demon" ? { fireBlast: this.abilities.fireBlast } : {}),
          ...(beast === "big-worm" ? { breatheFire: this.abilities.breatheFire } : {}),
          ...(beast === "desert-megaworm" ? { sandBlast: this.abilities.fireBlast } : {}),
          ...(beast === "grappler" ? { 
            grapplingHook: this.abilities.grapplingHook,
            pinTarget: this.abilities.pinTarget 
          } : {}),
          ...(beast === "worm-hunter" ? { 
            runGrappleLine: this.abilities.runGrappleLine,
            dualKnifeDance: this.abilities.dualKnifeDance
          } : {}),
          ...(beast === "waterbearer" ? { 
            waterBless: this.abilities.waterBless,
            detectSpies: this.abilities.detectSpies
          } : {}),
          ...(beast === "skirmisher" ? { 
            dualKnifeDance: this.abilities.dualKnifeDance
          } : {}),
          ...(beast === "desert-worm" ? { 
            sandBlast: this.abilities.sandBlast,
            burrowAmbush: this.abilities.burrowAmbush
          } : {}),
          ...(beast === "segmented-worm" ? { 
            // Regular segmented worm - simple abilities
            jumps: this.abilities.jumps
          } : {}),
          ...(beast === "giant-sandworm" ? { 
            sandBlast: this.abilities.sandBlast,
            burrowAmbush: this.abilities.burrowAmbush
          } : {}),
          ...(beast === "sand-ant" ? { 
            // Small segmented toy ant, no special abilities
          } : {}),
          ...(beast === "rainmaker" ? { makeRain: this.abilities.makeRain } : {}),
          ...(beast === "toymaker" ? { deployBot: this.abilities.deployBot } : {}),
          ...(beast === "freezebot" ? { freezeAura: this.abilities.freezeAura } : {}),
          ...(beast === "clanker" ? { explode: this.abilities.explode } : {}),
          ...(beast === "spiker" ? { whipChain: this.abilities.whipChain } : {}),
          ...(beast === "roller" ? { chargeAttack: this.abilities.chargeAttack } : {}),
          ...(beast === "zapper" ? { zapHighest: this.abilities.zapHighest } : {}),
          ...(beast === "mechatronist" ? { 
            callAirdrop: this.abilities.callAirdrop,
            tacticalOverride: this.abilities.tacticalOverride
          } : {}),
          ...(beast === "builder" ? { 
            reinforceConstruct: this.abilities.reinforceConstruct
          } : {}),
          ...(beast === "fueler" ? { 
            powerSurge: this.abilities.powerSurge
          } : {}),
          ...(beast === "mechanic" ? { 
            emergencyRepair: this.abilities.emergencyRepair
          } : {}),
          ...(beast === "engineer" ? { 
            shieldGenerator: this.abilities.shieldGenerator,
            systemHack: this.abilities.systemHack
          } : {}),
          ...(beast === "welder" ? { 
            emergencyRepair: this.abilities.emergencyRepair,
            reinforceConstruct: this.abilities.reinforceConstruct
          } : {}),
          ...(beast === "assembler" ? { 
            reinforceConstruct: this.abilities.reinforceConstruct,
            powerSurge: this.abilities.powerSurge
          } : {}),
          ...(beast === "mechatron" ? { 
            missileBarrage: this.abilities.missileBarrage,
            laserSweep: this.abilities.laserSweep,
            empPulse: this.abilities.empPulse,
            shieldRecharge: this.abilities.shieldRecharge
          } : {})
        },
        tags: [
          ...(this.bestiary[beast]?.tags || []), // Include tags from bestiary
          ...(beast === "worm" ? ["swarm"] : []),
          ...(beast === "megasquirrel" ? ["hunt"] : []),
          ...(beast === "squirrel" ? ["hunt"] : []),
          ...(beast === "farmer" ? ["hunt"] : []),
          ...(beast === "soldier" ? ["hunt"] : []),
          // ...(beast === "ranger" ? ["ranged"] : []),
          // ...(beast === "priest" ? ["heal"] : [])
        ]
      };

    // Ensure meta property always exists
    if (!u.meta) {
      u.meta = {};
    }
    return u;
  }
}