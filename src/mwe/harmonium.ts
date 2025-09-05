import { Game } from "../core/game";
import { SimpleAI } from "../rules/simple_ai";

/**
 * Harmonium MWE - Testing ground for mages vs skeletons
 * A mystical battlefield where arcane forces clash with undead
 */
export class HarmoniumGame extends Game {
  bootstrap() {
    super.bootstrap();
    
    // Set up mystical background
    this.sim.sceneBackground = "grad";
    
    // Add simple AI for units to attack
    this.sim.rules.push(new SimpleAI(this.sim));
    
    // Create battle lines
    this.setupMages();
    this.setupSkeletons();
    this.setupHero();
    
    // Add some environmental elements
    this.addEnvironment();
  }
  
  private setupMages() {
    // Create a line of mages on the left side
    const magePositions = [
      { x: 5, y: 8 },
      { x: 5, y: 12 },
      { x: 5, y: 16 },
      { x: 8, y: 10 },
      { x: 8, y: 14 },
    ];
    
    magePositions.forEach((pos, i) => {
      this.sim.addUnit({
        id: `mage_${i}`,
        type: "mage",
        pos,
        team: "friendly",
        hp: 60,
        maxHp: 60,
        dmg: 20,
        sprite: "mage",
        tags: ["mage", "caster"],
        abilities: ["bolt", "fire", "blink"],
        meta: {
          primaryAction: "bolt",
          facing: "right",
        }
      });
    });
  }
  
  private setupSkeletons() {
    // Create waves of skeletons on the right side
    const skeletonPositions = [
      // Front line
      { x: 25, y: 7 },
      { x: 25, y: 10 },
      { x: 25, y: 13 },
      { x: 25, y: 16 },
      { x: 25, y: 19 },
      // Second wave
      { x: 28, y: 9 },
      { x: 28, y: 12 },
      { x: 28, y: 15 },
      { x: 28, y: 18 },
      // Third wave
      { x: 31, y: 11 },
      { x: 31, y: 14 },
      { x: 31, y: 17 },
    ];
    
    skeletonPositions.forEach((pos, i) => {
      this.sim.addUnit({
        id: `skeleton_${i}`,
        type: "skeleton",
        pos,
        team: "hostile",
        hp: 40,
        maxHp: 40,
        dmg: 10,
        sprite: "skeleton",
        tags: ["undead", "skeleton"],
        meta: {
          facing: "left",
        }
      });
    });
  }
  
  private setupHero() {
    // Add hero in the middle to influence the battle
    const hero = this.sim.addUnit({
      id: "hero",
      type: "hero",
      pos: { x: 15, y: 12 },
      team: "friendly",
      hp: 100,
      maxHp: 100,
      dmg: 15,
      mass: 10,
      sprite: "hero",
      tags: ["hero"],
      abilities: ["strike", "bolt", "groundPound", "dash"],
      meta: {
        controlled: true,
        useRig: true,
        facing: "right",
        primaryAction: "strike",  // Fixed: PlayerControl looks for primaryAction, not primaryAbility
      }
    });
  }
  
  private addEnvironment() {
    // Add some mystical crystals as obstacles
    const crystalPositions = [
      { x: 10, y: 6 },
      { x: 20, y: 8 },
      { x: 15, y: 20 },
      { x: 12, y: 15 },
    ];
    
    crystalPositions.forEach((pos, i) => {
      this.sim.addUnit({
        id: `crystal_${i}`,
        type: "crystal",
        pos,
        team: "neutral",
        hp: 1000,
        maxHp: 1000,
        sprite: "crystal",
        state: "idle",
        mass: 1000,  // Very heavy, can't be pushed
        tags: ["obstacle", "indestructible"],
        abilities: [],
        meta: {
          noMove: true,
          noTarget: true,
        }
      });
    });
    
    // Add particle effects for atmosphere
    for (let i = 0; i < 5; i++) {
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: { 
              x: Math.random() * this.sim.fieldWidth * 8, 
              y: Math.random() * this.sim.fieldHeight * 8 
            },
            vel: { x: (Math.random() - 0.5) * 0.5, y: -Math.random() * 0.5 },
            radius: 1,
            color: "#8888FF",
            lifetime: 100,
            type: "magic"
          }
        }
      });
    }
  }
}

// Browser setup
if (typeof window !== "undefined") {
  const canvas = document.getElementById("battlefield") as HTMLCanvasElement;
  if (canvas) {
    // @ts-ignore
    const game = (window.HarmoniumGame = new HarmoniumGame(canvas));
    game.bootstrap();
    
    // Simple keyboard controls
    document.addEventListener("keydown", (e) => {
      const hero = game.sim.units.find(u => u.id === "hero");
      if (!hero) return;
      
      switch(e.key) {
        case "ArrowUp":
        case "w":
          game.sim.queuedCommands.push({
            type: "move",
            unitId: "hero",
            params: { dx: 0, dy: -1 }
          });
          break;
        case "ArrowDown":
        case "s":
          game.sim.queuedCommands.push({
            type: "move",
            unitId: "hero",
            params: { dx: 0, dy: 1 }
          });
          break;
        case "ArrowLeft":
        case "a":
          game.sim.queuedCommands.push({
            type: "move",
            unitId: "hero",
            params: { dx: -1, dy: 0 }
          });
          break;
        case "ArrowRight":
        case "d":
          game.sim.queuedCommands.push({
            type: "move",
            unitId: "hero",
            params: { dx: 1, dy: 0 }
          });
          break;
        case " ":
          // Attack
          game.sim.queuedCommands.push({
            type: "strike",
            unitId: "hero",
            params: { direction: hero.meta?.facing || "right" }
          });
          break;
        case "q":
          // Bolt
          game.sim.queuedCommands.push({
            type: "bolt",
            unitId: "hero",
            params: {}
          });
          break;
        case "e":
          // Ground pound
          game.sim.queuedCommands.push({
            type: "groundPound",
            unitId: "hero",
            params: {}
          });
          break;
      }
    });
    
    // Handle window resize
    window.addEventListener("resize", () => {
      if (game.handleResize) {
        game.handleResize();
      }
    });
    
    // Initial resize
    if (game.handleResize) {
      game.handleResize();
    }
  }
}