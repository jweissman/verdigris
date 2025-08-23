import { Game } from "../core/game";
import { HeroAnimation } from "../rules/hero_animation";
import { PlayerControl } from "../rules/player_control";
import { Jumping } from "../rules/jumping";

export class HeroGame extends Game {
  private playerControl: PlayerControl;
  
  constructor(canvas: HTMLCanvasElement, opts?: any) {
    super(canvas, opts);
    // Speed up tick rate for more responsive hero movement
    this.simTickRate = 16; // 16fps instead of 8fps
  }
  
  bootstrap() {
    super.bootstrap();
    this.renderer.setViewMode("iso");
    
    // Add player control rule
    this.playerControl = new PlayerControl();
    this.sim.rulebook.push(this.playerControl);
    this.sim.rulebook.push(new HeroAnimation());
    this.sim.rulebook.push(new Jumping());
    
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
        onRooftop: true
      }
    });
    
    // Spawn some enemies
    for (let i = 0; i < 3; i++) {
      this.sim.addUnit({
        id: `enemy_${i}`,
        pos: { x: 20 + i * 5, y: 10 },
        team: "hostile",
        hp: 20,
        maxHp: 20,
        dmg: 5,
        sprite: "soldier", // Give enemies a sprite
        tags: ["enemy"]
      });
    }
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