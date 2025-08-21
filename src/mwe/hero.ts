import { Game } from "../core/game";
import Input from "../core/input";
import Encyclopaedia from "../dmg/encyclopaedia";

export class HeroGame extends Game {
  private heroId: string = "hero_player";
  private heroType: string = "champion";
  private currentBackground: number = 0;
  private backgrounds: string[] = ["rooftop", "cityscape", "mountain", "forest", "desert", "castle", "tower-gate"];
  input: Input = new Input(this.sim, this.renderer);
  
  bootstrap() {
    super.bootstrap();
    // Load rooftop background scene
    this.loadRooftopScene();
    this.spawnHero();
  }
  
  private loadRooftopScene() {
    // Queue scene metadata command to set background
    this.sim.queuedCommands.push({
      type: "sceneMetadata",
      params: {
        background: "rooftop",
        music: "exploration"
      }
    });
    console.log('Rooftop scene loaded');
  }
  
  private spawnHero() {
    // Create a champion unit directly since it's not in the bestiary
    const hero = {
      id: this.heroId,
      type: "champion",
      pos: { x: 10, y: 10 },
      intendedMove: { x: 0, y: 0 },
      team: "friendly" as const,
      state: "idle" as const,
      sprite: "champion", // Use the 48x48 champion.png sprite
      hp: 100,
      maxHp: 100,
      dmg: 15,
      mass: 10,
      abilities: [],
      tags: ["hero", "controlled", "champion"], // Tags trigger hero scale
      meta: {
        controlled: true,
        facing: "right" as const,
        scale: "hero" as const // Explicitly set hero scale for 48x48
      }
    };
    
    this.sim.addUnit(hero);
    console.log(`Champion hero spawned at (10, 10) - WASD: move, Space: jump, B: cycle background`);
  }
  
  getInputHandler(): (e: { key: string }) => void {
    return (e) => {
      const hero = this.sim.units.find(u => u.id === this.heroId);
      if (!hero) return;
      
      switch(e.key.toLowerCase()) {
        case 'w':
          this.moveHero(0, -1);
          break;
        case 'a':
          this.moveHero(-1, 0);
          break;
        case 's':
          this.moveHero(0, 1);
          break;
        case 'd':
          this.moveHero(1, 0);
          break;
        case ' ':
          this.jumpHero();
          break;
        case 'q':
          this.useAbility('groundPound');
          break;
        case 'e':
          this.useAbility('heroicLeap');
          break;
        case 'r':
          this.resetScene();
          break;
        case 'b':
          this.cycleBackground();
          break;
        default:
          super.getInputHandler()(e);
      }
    };
  }
  
  private moveHero(dx: number, dy: number) {
    const hero = this.sim.units.find(u => u.id === this.heroId);
    if (!hero || hero.meta?.jumping) return;
    
    const newX = Math.max(0, Math.min(this.sim.fieldWidth - 1, hero.pos.x + dx));
    const newY = Math.max(0, Math.min(this.sim.fieldHeight - 1, hero.pos.y + dy));
    
    // Use proper move command structure
    this.sim.queuedCommands.push({
      type: "move",
      unitId: this.heroId,
      params: {
        x: newX,
        y: newY
      }
    });
    
    // Update facing direction
    if (dx !== 0) {
      this.sim.queuedCommands.push({
        type: "meta",
        unitId: this.heroId,
        params: {
          meta: {
            facing: dx > 0 ? "right" : "left"
          }
        }
      });
    }
  }
  
  private jumpHero() {
    console.log('Jump pressed!');
    const hero = this.sim.units.find(u => u.id === this.heroId);
    if (!hero) {
      console.log('No hero found!');
      return;
    }
    if (hero.meta?.jumping) {
      console.log('Already jumping');
      return;
    }
    
    const jumpDistance = 3;
    const facingRight = hero.meta?.facing === "right";
    const targetX = facingRight ? 
      Math.min(this.sim.fieldWidth - 1, hero.pos.x + jumpDistance) :
      Math.max(0, hero.pos.x - jumpDistance);
    
    console.log(`Queueing jump from (${hero.pos.x}, ${hero.pos.y}) to (${targetX}, ${hero.pos.y})`);
    
    // Fix: unitId should NOT be in params for jump command
    this.sim.queuedCommands.push({
      type: "jump",
      unitId: this.heroId,
      params: {
        targetX: targetX,
        targetY: hero.pos.y,
        height: 4,
        damage: 0,
        radius: 0
      }
    });
  }
  
  private useAbility(abilityName: string) {
    const hero = this.sim.units.find(u => u.id === this.heroId);
    if (!hero || !hero.abilities?.includes(abilityName)) return;
    
    this.sim.queuedCommands.push({
      type: "ability",
      params: {
        unitId: this.heroId,
        abilityName: abilityName,
        target: hero.pos
      }
    });
  }
  
  private resetScene() {
    this.sim.reset();
    this.loadRooftopScene(); // Reload background
    this.spawnHero();
  }
  
  private cycleBackground() {
    this.currentBackground = (this.currentBackground + 1) % this.backgrounds.length;
    const newBg = this.backgrounds[this.currentBackground];
    
    this.sim.queuedCommands.push({
      type: "sceneMetadata",
      params: {
        background: newBg
      }
    });
    
    console.log(`Background changed to: ${newBg}`);
  }

  static boot(canvasId: string | HTMLCanvasElement = "battlefield") {
    let game: HeroGame | null = null;
    const canvas =
      canvasId instanceof HTMLCanvasElement
        ? canvasId
        : (document.getElementById(canvasId) as HTMLCanvasElement);
    if (canvas) {
      let addInputListener = (cb: (e: { key: string }) => void) => {
        document.addEventListener("keydown", (e) => {
          cb({ key: e.key });
        });
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