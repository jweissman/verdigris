import { Game } from "../core/game";
import Input from "../core/input";
import Encyclopaedia from "../dmg/encyclopaedia";
import { HeroAnimation } from "../rules/hero_animation";

export class HeroGame extends Game {
  private heroId: string = "hero_player";
  private heroType: string = "champion";
  private currentBackground: number = 0;
  private backgrounds: string[] = ["rooftop", "cityscape", "mountain", "forest", "desert", "castle", "tower-gate"];
  input: Input = new Input(this.sim, this.renderer);
  
  // Movement state
  private keysHeld: Map<string, boolean> = new Map();
  private moveSpeed: number = 0.15; // Gradual movement speed
  private lastMoveTime: number = 0;
  
  // Override tick rate for more responsive controls
  protected simTickRate: number = 60; // 60fps for maximum responsiveness
  
  bootstrap() {
    super.bootstrap();
    // Use isometric view to show backgrounds
    this.renderer.setViewMode("iso");
    // Load rooftop background scene
    this.loadRooftopScene();
    
    // Setup click handler for attacks
    this.setupClickHandler();
    
    // Wait a bit for sprites to load
    setTimeout(() => {
      this.spawnHero();
    }, 100);
  }
  
  private setupClickHandler() {
    if (this.canvas) {
      this.canvas.addEventListener('click', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert screen coords to world coords
        const worldPos = this.renderer.screenToWorld(x, y);
        if (worldPos) {
          this.attackToward(worldPos.x, worldPos.y);
        }
      });
    }
  }
  
  private loadRooftopScene() {
    // Set background directly since sceneMetadata command doesn't exist yet
    this.sim.sceneBackground = "rooftop";
    
    // Add hero animation rule if not present
    const hasHeroAnimation = this.sim.rulebook.some(
      rule => rule.constructor.name === 'HeroAnimation'
    );
    if (!hasHeroAnimation) {
      this.sim.rulebook.push(new HeroAnimation());
    }
    
    console.log('Rooftop scene loaded with hero animation');
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
        scale: "hero" as const, // Explicitly set hero scale for 48x48
        useRig: true, // Use modular body parts instead of single sprite
        onRooftop: true // For wind effect
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
  
  getInputHandler(): (e: { key: string; type?: string }) => void {
    return (e) => {
      const hero = this.sim.units.find(u => u.id === this.heroId);
      if (!hero) return;
      
      const key = e.key.toLowerCase();
      const isKeyDown = e.type === 'keydown';
      const isKeyUp = e.type === 'keyup';
      
      // Handle key state for continuous movement
      if (isKeyDown) {
        this.keysHeld.set(key, true);
      } else if (isKeyUp) {
        this.keysHeld.delete(key);
      }
      
      // Handle single-press actions
      if (isKeyDown) {
        switch(key) {
          case ' ':
            this.jumpHero();
            break;
          case 'e':
            this.strikeHero();
            break;
          case 'r':
            this.resetScene();
            break;
          case 'b':
            this.cycleBackground();
            break;
          case 'arrowup':
            this.keysHeld.set('w', true);
            break;
          case 'arrowdown':
            this.keysHeld.set('s', true);
            break;
          case 'arrowleft':
            this.keysHeld.set('a', true);
            break;
          case 'arrowright':
            this.keysHeld.set('d', true);
            break;
        }
      }
    };
  }
  
  update() {
    super.update();
    
    // Process continuous movement every frame
    this.processContinuousMovement();
  }
  
  private processContinuousMovement() {
    let dx = 0;
    let dy = 0;
    
    if (this.keysHeld.get('w') || this.keysHeld.get('arrowup')) dy = -1;
    if (this.keysHeld.get('s') || this.keysHeld.get('arrowdown')) dy = 1;
    if (this.keysHeld.get('a') || this.keysHeld.get('arrowleft')) dx = -1;
    if (this.keysHeld.get('d') || this.keysHeld.get('arrowright')) dx = 1;
    
    if (dx !== 0 || dy !== 0) {
      this.moveHero(dx * this.moveSpeed, dy * this.moveSpeed);
    }
  }
  
  private moveHero(dx: number, dy: number) {
    const hero = this.sim.units.find(u => u.id === this.heroId);
    if (!hero || hero.meta?.jumping) return;
    
    // Use dx/dy for gradual movement, not x/y for teleporting
    this.sim.queuedCommands.push({
      type: "move",
      unitId: this.heroId,
      params: {
        dx: dx,
        dy: dy
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
  
  private attackToward(worldX: number, worldY: number) {
    const hero = this.sim.units.find(u => u.id === this.heroId);
    if (!hero) return;
    
    // Calculate direction to target
    const dx = worldX - hero.pos.x;
    const dy = worldY - hero.pos.y;
    
    // Update facing based on attack direction
    if (Math.abs(dx) > 0.1) {
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
    
    // Perform strike
    this.strikeHero();
  }

  static boot(canvasId: string | HTMLCanvasElement = "battlefield") {
    let game: HeroGame | null = null;
    const canvas =
      canvasId instanceof HTMLCanvasElement
        ? canvasId
        : (document.getElementById(canvasId) as HTMLCanvasElement);
    if (canvas) {
      let addInputListener = (cb: (e: { key: string; type?: string }) => void) => {
        document.addEventListener("keydown", (e) => {
          cb({ key: e.key, type: 'keydown' });
        });
        document.addEventListener("keyup", (e) => {
          cb({ key: e.key, type: 'keyup' });
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