import { Game } from "../core/game";
import Input from "../core/input";
import Encyclopaedia from "../dmg/encyclopaedia";

export class HeroGame extends Game {
  private heroId: string = "hero_player";
  private heroType: string = "champion";
  private currentBackground: number = 0;
  private backgrounds: string[] = ["rooftop", "cityscape", "mountain", "forest", "desert", "castle", "tower-gate"];
  input: Input = new Input(this.sim, this.renderer);
  
  // Movement state
  private keysHeld: Set<string> = new Set();
  private jumpBufferTime: number = 0;
  
  // Override tick rate for more responsive controls
  protected simTickRate: number = 60; // 60fps for maximum responsiveness
  
  bootstrap() {
    super.bootstrap();
    // Use isometric view to show backgrounds
    this.renderer.setViewMode("iso");
    // Load rooftop background scene
    this.loadRooftopScene();
    // Wait a bit for sprites to load
    setTimeout(() => {
      this.spawnHero();
      console.log('Hero spawned with rooftop background');
    }, 100);
  }
  
  private loadRooftopScene() {
    // Set background directly since sceneMetadata command doesn't exist yet
    this.sim.sceneBackground = "rooftop";
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
    
    // Spawn some enemies to fight
    this.spawnEnemies();
    
    console.log(`Champion hero spawned at (10, 10)`);
    console.log(`Controls: WASD: move, Space: jump, E: strike, B: cycle background, R: reset`);
  }
  
  private spawnEnemies() {
    // Spawn a few worms as enemies
    const enemies = [
      { x: 20, y: 10, sprite: "worm" },
      { x: 25, y: 8, sprite: "worm" },
      { x: 30, y: 12, sprite: "worm" }
    ];
    
    enemies.forEach((enemy, i) => {
      this.sim.addUnit({
        id: `enemy_${i}`,
        type: "worm",
        pos: { x: enemy.x, y: enemy.y },
        intendedMove: { x: 0, y: 0 },
        team: "hostile" as const,
        state: "idle" as const,
        sprite: enemy.sprite,
        hp: 20,
        maxHp: 20,
        dmg: 5,
        mass: 5,
        abilities: [],
        tags: ["enemy"],
        meta: {
          facing: "left" as const
        }
      });
    });
    
    console.log(`Spawned ${enemies.length} enemies`);
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
          this.strikeHero();
          break;
        case 'f':
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
    const hero = this.sim.units.find(u => u.id === this.heroId);
    if (!hero) return;
    if (hero.meta?.jumping) return;
    
    // Simple jump in facing direction
    this.sim.queuedCommands.push({
      type: "jump",
      unitId: this.heroId,
      params: {
        distance: 3,  // Jump 3 tiles forward - tighter control
        height: 5    // Good arc but fast
      }
    });
  }
  
  private strikeHero() {
    const hero = this.sim.units.find(u => u.id === this.heroId);
    if (!hero) return;
    
    // Strike command handles animation state
    this.sim.queuedCommands.push({
      type: "strike",
      unitId: this.heroId,
      params: {
        direction: hero.meta?.facing || "right",
        range: 1.5,  // Slightly longer than standard melee
        damage: hero.dmg || 15
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
    this.spawnHero(); // This also spawns enemies
  }
  
  private cycleBackground() {
    this.currentBackground = (this.currentBackground + 1) % this.backgrounds.length;
    const newBg = this.backgrounds[this.currentBackground];
    
    // Set background directly
    this.sim.sceneBackground = newBg;
    
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