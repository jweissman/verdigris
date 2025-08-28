import { Simulator } from "../core/simulator";
import Renderer from "../core/renderer";
import { HeroController } from "./hero_controller";

/**
 * Hero Game - minimal working example using normal simulator
 * This demonstrates hero control with jump mechanics
 */
class HeroGameRunner {
  private sim: Simulator;
  private renderer: Renderer;
  private hero: HeroController;
  private animationId?: number;
  private paused: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.sim = new Simulator(30, 20); // Slightly larger for rooftop

    const sprites = new Map<string, HTMLImageElement>();
    const championSprite = new Image();
    championSprite.src = "../assets/champion.png";
    sprites.set("champion", championSprite);

    const backgrounds = new Map<string, HTMLImageElement>();
    const rooftopImg = new Image();
    rooftopImg.src = "../assets/bg/rooftop.png";
    backgrounds.set("rooftop", rooftopImg);

    this.sim.setBackground("rooftop");

    this.renderer = new Renderer(
      320,
      200,
      canvas,
      this.sim,
      sprites,
      backgrounds,
    );

    this.hero = new HeroController(this.sim);

    this.hero.spawnHero(15, 10);

    this.setupInput();
  }

  private setupInput() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "r" || e.key === "R") {
        this.reset();
        return;
      }

      if (e.key === "p" || e.key === "P") {
        this.paused = !this.paused;
        return;
      }

      this.hero.handleKeyDown(e.key);
    });

    document.addEventListener("keyup", (e) => {
      this.hero.handleKeyUp(e.key);
    });
  }

  private reset() {
    this.sim.reset();
    this.hero.spawnHero(15, 10);
    console.log("Game reset");
  }

  start() {
    let lastJumpState = false;

    const gameLoop = () => {
      if (!this.paused) {
        this.hero.update();

        this.sim.step();

        const hero = this.sim.units.find((u) => u.id === "hero_player");
        if (hero) {
          const isJumping = hero.meta?.jumping || false;
          if (isJumping !== lastJumpState) {
            if (isJumping) {
              console.log(`[JUMP START] Hero began jumping`);
            } else {
              console.log(
                `[JUMP END] Hero landed at (${hero.pos.x.toFixed(1)}, ${hero.pos.y.toFixed(1)})`,
              );
            }
            lastJumpState = isJumping;
          }

          if (isJumping && hero.meta?.jumpProgress !== undefined) {
            const progress = hero.meta.jumpProgress;
            const height = hero.meta.z || hero.meta.jumpHeight || 0;
            if (progress % 3 === 0) {
              console.log(
                `[JUMP PROGRESS] Step ${progress}, Height: ${height.toFixed(2)}, Pos: (${hero.pos.x.toFixed(1)}, ${hero.pos.y.toFixed(1)})`,
              );
            }
          }
        }

        this.renderer.render();
      }

      this.animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

function boot() {
  const canvas = document.getElementById("battlefield") as HTMLCanvasElement;
  if (!canvas) {
    console.error("Canvas not found");
    return;
  }

  const game = new HeroGameRunner(canvas);
  game.start();

  console.log("Hero MWE started - use WASD to move, Space to jump");

  (window as any).heroGame = game;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
