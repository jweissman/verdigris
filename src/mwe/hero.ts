import { Game } from "../core/game";
import Input from "../core/input";
import Encyclopaedia from "../dmg/encyclopaedia";

export class HeroGame extends Game {
  private heroId: string = "hero_player";
  private heroType: string = "champion";
  input: Input = new Input(this.sim, this.renderer);
  
  bootstrap() {
    super.bootstrap();
    // Load rooftop scene if available
    this.spawnHero();
  }
  
  private spawnHero() {
    const heroData = Encyclopaedia.unit(this.heroType);
    const hero = {
      ...heroData,
      id: this.heroId,
      pos: { x: 10, y: 10 },
      intendedMove: { x: 0, y: 0 },
      team: "friendly" as const,
      state: "idle" as const,
      hp: heroData.hp || 120,
      maxHp: heroData.maxHp || 120,
      mass: heroData.mass || 10,
      sprite: heroData.sprite || "champion",
      abilities: heroData.abilities || [],
      dmg: heroData.dmg || 10,
      meta: {
        ...heroData.meta,
        controlled: true,
        facing: "right" as const
      }
    };
    
    this.sim.addUnit(hero);
    console.log(`Hero spawned: ${this.heroType} at (10, 10)`);
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
    
    this.sim.queuedCommands.push({
      type: "move",
      params: {
        unitId: this.heroId,
        x: newX,
        y: newY
      }
    });
    
    if (dx !== 0) {
      this.sim.queuedCommands.push({
        type: "meta",
        params: {
          unitId: this.heroId,
          meta: {
            ...hero.meta,
            facing: dx > 0 ? "right" : "left"
          }
        }
      });
    }
  }
  
  private jumpHero() {
    const hero = this.sim.units.find(u => u.id === this.heroId);
    if (!hero || hero.meta?.jumping) return;
    
    const jumpDistance = 3;
    const facingRight = hero.meta?.facing === "right";
    const targetX = facingRight ? 
      Math.min(this.sim.fieldWidth - 1, hero.pos.x + jumpDistance) :
      Math.max(0, hero.pos.x - jumpDistance);
    
    // Use the proper jump command
    this.sim.queuedCommands.push({
      type: "jump",
      params: {
        unitId: this.heroId,
        targetX: targetX,
        targetY: hero.pos.y,
        height: 4,
        damage: 0, // No damage for basic jump
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
    this.spawnHero();
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
}