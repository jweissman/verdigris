import { Game } from "../core/game";
import { HeroAnimation } from "../rules/hero_animation";
import { PlayerControl } from "../rules/player_control";
import { Jumping } from "../rules/jumping";

export class HeroGame extends Game {
  private playerControl: PlayerControl;
  private cursorWorldPos: { x: number; y: number } | null = null;
  
  constructor(canvas: HTMLCanvasElement, opts?: any) {
    super(canvas, opts);
    // Balanced tick rate for smooth yet controlled movement
    this.simTickRate = 60;
    this.ninjaCount = 0;
    this.waveNumber = 0;
    // Half-size battlefield for rooftop scene
    this.fieldWidth = 15;
    this.fieldHeight = 10;
  }
  
  private ninjaCount: number;
  private waveNumber: number;
  
  spawnNinjaWave() {
    // Spawn ninjas in multiple lanes within battlefield bounds
    const lanes = [4, 5, 6]; // Three lanes in the middle of 10-height battlefield
    
    for (const lane of lanes) {
      const ninja = {
        id: `ninja_${this.ninjaCount++}`,
        pos: { x: 14, y: lane }, // Spawn at right edge of 15-width battlefield
        team: "hostile",
        hp: 10,
        maxHp: 10,
        dmg: 3,
        sprite: "ninja",
        type: "ninja", // Add type fallback
        tags: ["enemy", "ninja"],
        intendedMove: { x: -1, y: 0 }, // Move left towards hero
        meta: {
          speed: 0.5
        }
      };
      console.log(`Spawning ninja: ${ninja.id} at (${ninja.pos.x}, ${ninja.pos.y})`);
      this.sim.addUnit(ninja);
    }
    
    // Schedule next wave
    setTimeout(() => {
      if (this.waveNumber < 10) { // Limit to 10 waves
        this.waveNumber++;
        this.spawnNinjaWave();
      }
    }, 3000); // New wave every 3 seconds
  }
  
  bootstrap() {
    super.bootstrap();
    this.renderer.setViewMode("iso");
    
    // Add player control rule
    this.playerControl = new PlayerControl();
    this.sim.rulebook.push(this.playerControl);
    this.sim.rulebook.push(new HeroAnimation());
    this.sim.rulebook.push(new Jumping());
    
    // Add move-to-target rule for click navigation
    const MoveToTarget = require("../rules/move_to_target").MoveToTarget;
    this.sim.rulebook.push(new MoveToTarget());
    
    // Set background
    this.sim.sceneBackground = "rooftop";
    
    // Spawn hero unit - just a unit with hero tag
    this.sim.addUnit({
      id: "hero",
      pos: { x: 10, y: 10 },
      team: "friendly",
      hp: 100,
      maxHp: 100,
      dmg: 15,
      sprite: "hero", // Add sprite for Z-axis rendering to work
      tags: ["hero"],
      meta: {
        controlled: true,
        useRig: true,
        onRooftop: true,
        weapon: "sword", // Default weapon
        facing: "right"
      }
    });
    
    // Start spawning ninjas
    this.spawnNinjaWave();
  }
  

  static boot(canvasId: string | HTMLCanvasElement = "battlefield") {
    let game: HeroGame | null = null;
    const canvas =
      canvasId instanceof HTMLCanvasElement
        ? canvasId
        : (document.getElementById(canvasId) as HTMLCanvasElement);
    if (canvas) {
      let addInputListener = (cb: (e: { key: string; type?: string }) => void) => {
        // Don't add listeners here - handle input directly
      };

      game = new HeroGame(canvas, {
        addInputListener,
        animationFrame: (cb) => requestAnimationFrame(cb),
      });

      window.addEventListener("resize", () => {
        if (game && game.handleResize) {
          game.handleResize();
        }
      });

      if (game && game.handleResize) {
        game.handleResize();
      }

      game.bootstrap();
      
      // Set up input handling
      document.addEventListener("keydown", (e) => {
        if (game && game.playerControl) {
          game.playerControl.setKeyState(e.key, true);
        }
      });
      
      document.addEventListener("keyup", (e) => {
        if (game && game.playerControl) {
          game.playerControl.setKeyState(e.key, false);
        }
      });
      
      // Add click-to-move functionality
      canvas.addEventListener("click", (e) => {
        if (game && game.sim) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;
          
          // Convert screen coords to world coords (rough isometric conversion)
          // Adjust for camera offset and isometric projection
          const worldX = Math.round((x - canvas.width/2) / 8 + (y - canvas.height/2) / 4) + 10;
          const worldY = Math.round((y - canvas.height/2) / 4 - (x - canvas.width/2) / 16) + 10;
          
          // Use hero command to move to position
          game.sim.queuedCommands.push({
            type: 'hero',
            params: {
              action: 'move-to',
              x: worldX,
              y: worldY,
              attackMove: false
            }
          });
          console.log(`Click to move: hero move-to (${worldX}, ${worldY})`);
        }
      });
      
      // Add right-click for attack-move
      canvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (game && game.sim) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;
          
          // Convert screen coords to world coords
          const worldX = Math.round((x - canvas.width/2) / 8 + (y - canvas.height/2) / 4);
          const worldY = Math.round((y - canvas.height/2) / 4 - (x - canvas.width/2) / 16);
          
          // Find hero unit
          const hero = game.sim.units.find(u => u.tags?.includes('hero'));
          if (hero) {
            // Queue move_target command with attack-move
            game.sim.queuedCommands.push({
              type: 'move_target',
              unitId: hero.id,
              params: {
                x: worldX + 10,
                y: worldY + 10,
                attackMove: true
              }
            });
            console.log(`Attack-move to: (${worldX + 10}, ${worldY + 10})`);
          }
        }
      });
    } else {
      console.error(`Canvas element ${canvasId} not found!`);
    }
    function gameLoop() {
      if (game) {
        game.update();
      }
      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
  }
}

if (typeof window !== "undefined") {
  // @ts-ignore
  window.HeroGame = HeroGame;
  
  // Auto-boot when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HeroGame.boot());
  } else {
    HeroGame.boot();
  }
}