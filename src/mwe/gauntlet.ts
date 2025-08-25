import { Game } from "../core/game";
import Input from "../core/input";

export class GauntletGame extends Game {
  private heroId: string = "hero_gauntlet";
  private currentStage: number = 0;
  private stageProgress: number = 0;
  private maxStageProgress: number = 150; // Ticks to auto-advance

  input: Input = new Input(this.sim, this.renderer);

  private stages = [
    {
      name: "Castle Gates",
      background: "castle",
      width: 80,
      height: 40,
      enemies: ["soldier", "ranger"],
      description: "Storm the castle gates",
    },
    {
      name: "Piedmont Hills",
      background: "mountain",
      width: 120,
      height: 40,
      enemies: ["soldier", "ranger", "priest"],
      description: "Traverse rolling hills",
    },
    {
      name: "Forest Depths",
      background: "forest",
      width: 100,
      height: 50,
      enemies: ["ranger", "wildmage", "naturist"],
      description: "Navigate ancient woods",
    },
    {
      name: "Mountain Pass",
      background: "mountain",
      width: 140,
      height: 30,
      enemies: ["bombardier", "clanker", "mechatronist"],
      description: "Scale treacherous peaks",
    },
    {
      name: "Desert Oasis",
      background: "desert",
      width: 160,
      height: 35,
      enemies: ["bombardier", "naturist", "farmer"],
      description: "Cross burning sands",
    },
  ];

  bootstrap() {
    super.bootstrap();

    this.sim.fieldWidth = this.stages[0].width;
    this.sim.fieldHeight = this.stages[0].height;

    this.renderer.setViewMode("iso");

    this.loadStage(0);

    console.log("=== GAUNTLET MWE ===");
    console.log("Epic backgrounds with dynamic stitching");
    console.log("Controls:");
    console.log("  WASD - Move hero");
    console.log("  SPACE - Jump");
    console.log("  E - Strike");
    console.log("  N - Next stage");
    console.log("  P - Previous stage");
    console.log("  R - Reset current stage");
    console.log("");
    this.displayStageInfo();
  }

  private loadStage(stageIndex: number) {
    if (stageIndex < 0 || stageIndex >= this.stages.length) return;

    this.currentStage = stageIndex;
    this.stageProgress = 0;
    const stage = this.stages[stageIndex];

    this.sim.reset();
    this.sim.fieldWidth = stage.width;
    this.sim.fieldHeight = stage.height;

    this.sim.sceneBackground = stage.background;

    this.spawnHero();

    this.spawnStageEnemies(stage);

    this.createStageTransitionEffect();

    console.log(`\\n🏰 STAGE ${stageIndex + 1}: ${stage.name.toUpperCase()}`);
    console.log(`📏 Battlefield: ${stage.width}x${stage.height}`);
    console.log(`🎨 Background: ${stage.background}`);
    console.log(`📖 ${stage.description}`);
  }

  private spawnHero() {
    const stage = this.stages[this.currentStage];

    const hero = {
      id: this.heroId,
      type: "champion",
      pos: { x: 10, y: Math.floor(stage.height / 2) }, // Left side, center height
      intendedMove: { x: 0, y: 0 },
      team: "friendly" as const,
      state: "idle" as const,
      sprite: "champion",
      hp: 120,
      maxHp: 120,
      dmg: 18,
      mass: 12,
      abilities: ["strike", "jump"],
      tags: ["hero", "controlled", "champion"],
      meta: {
        controlled: true,
        facing: "right" as const,
        scale: "hero" as const,
        stageHero: true,
      },
    };

    this.sim.addUnit(hero);
  }

  private spawnStageEnemies(stage: any) {
    const enemyCount = Math.min(stage.enemies.length + 2, 8); // 3-8 enemies per stage
    const spawnWidth = stage.width - 30; // Leave space at edges
    const spawnHeight = stage.height - 10;

    for (let i = 0; i < enemyCount; i++) {
      const enemyType = stage.enemies[i % stage.enemies.length];

      const x = 30 + (i * spawnWidth) / enemyCount + Math.random() * 10;
      const y = 5 + Math.random() * spawnHeight;

      this.sim.addUnit({
        id: `enemy_${i}_${enemyType}`,
        type: enemyType,
        pos: { x: Math.floor(x), y: Math.floor(y) },
        intendedMove: { x: 0, y: 0 },
        team: "hostile" as const,
        state: "idle" as const,
        sprite: enemyType,
        hp: 25 + Math.random() * 15, // 25-40 hp
        maxHp: 40,
        dmg: 8 + Math.random() * 6, // 8-14 damage
        mass: 5,
        abilities: this.getAbilitiesForType(enemyType),
        tags: ["enemy", "gauntlet"],
        meta: {
          facing: "left" as const,
          stageEnemy: true,
        },
      });
    }

    console.log(
      `⚔️  Spawned ${enemyCount} enemies: ${stage.enemies.join(", ")}`,
    );
  }

  private getAbilitiesForType(type: string): string[] {
    const abilityMap: Record<string, string[]> = {
      soldier: ["melee"],
      ranger: ["ranged"],
      priest: ["heal"],
      bombardier: ["ranged", "explosive"],
      wildmage: ["bolt"],
      naturist: ["heal", "plant"],
      clanker: ["melee", "explosive"],
      mechatronist: ["callAirdrop"],
      farmer: ["plant"],
    };
    return abilityMap[type] || ["melee"];
  }

  private createStageTransitionEffect() {
    const stage = this.stages[this.currentStage];
    const centerX = stage.width / 2;
    const centerY = stage.height / 2;

    const stageColors: Record<string, string> = {
      castle: "#8B4513", // Brown
      mountain: "#708090", // Slate gray
      forest: "#228B22", // Forest green
      desert: "#DAA520", // Goldenrod
    };

    const color = stageColors[stage.background] || "#FFFFFF";

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 15 + Math.random() * 10;

      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: {
              x: centerX + Math.cos(angle) * distance,
              y: centerY + Math.sin(angle) * distance,
            },
            vel: {
              x: Math.cos(angle) * 0.3,
              y: Math.sin(angle) * 0.3,
            },
            radius: 2,
            lifetime: 45,
            color: color,
            type: "stage_transition",
          },
        },
      });
    }
  }

  private displayStageInfo() {
    const stage = this.stages[this.currentStage];
    console.log(`\\n📍 Current: ${stage.name}`);
    console.log(
      `📊 Progress: Stage ${this.currentStage + 1}/${this.stages.length}`,
    );
    console.log(`🎯 Objective: Clear all enemies to advance`);
  }

  private checkStageCompletion() {
    const enemies = this.sim.units.filter(
      (u) => u.team === "hostile" && u.hp > 0 && u.state !== "dead",
    );

    if (enemies.length === 0) {
      this.completeStage();
      return true;
    }

    this.stageProgress++;
    if (this.stageProgress >= this.maxStageProgress) {
      console.log("\\n⏰ Stage timeout - auto advancing...");
      this.advanceStage();
      return true;
    }

    return false;
  }

  private completeStage() {
    const stage = this.stages[this.currentStage];
    console.log(`\\n🎉 ${stage.name.toUpperCase()} CLEARED!`);
    console.log(`⭐ Enemies defeated in ${this.stageProgress} ticks`);

    this.createVictoryEffect();

    setTimeout(() => {
      this.advanceStage();
    }, 2000);
  }

  private createVictoryEffect() {
    const hero = this.sim.units.find((u) => u.id === this.heroId);
    if (!hero) return;

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const radius = 3 + Math.random() * 2;

      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: {
              x: hero.pos.x + Math.cos(angle) * radius,
              y: hero.pos.y + Math.sin(angle) * radius,
            },
            vel: {
              x: Math.cos(angle) * 0.1,
              y: Math.sin(angle) * 0.1 - 0.2,
            },
            radius: 1.5,
            lifetime: 60,
            color: "#FFD700", // Gold
            type: "victory",
          },
        },
      });
    }
  }

  private advanceStage() {
    if (this.currentStage < this.stages.length - 1) {
      this.loadStage(this.currentStage + 1);
    } else {
      this.completeGauntlet();
    }
  }

  private completeGauntlet() {
    console.log("\\n🏆 ===== GAUNTLET COMPLETED! =====");
    console.log("🎖️  You have conquered all stages!");
    console.log("🌟 From castle gates to desert oasis");
    console.log("⚔️  A true champion emerges!");
    console.log("\\n🔄 Press R to restart the gauntlet");

    const centerX = this.sim.fieldWidth / 2;
    const centerY = this.sim.fieldHeight / 2;

    for (let i = 0; i < 24; i++) {
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: centerX, y: centerY },
            vel: {
              x: (Math.random() - 0.5) * 0.6,
              y: (Math.random() - 0.5) * 0.6 - 0.3,
            },
            radius: 2 + Math.random(),
            lifetime: 80,
            color: ["#FFD700", "#FF6B35", "#FF1493", "#00FF00"][i % 4],
            type: "completion",
          },
        },
      });
    }
  }

  getInputHandler(): (e: { key: string; type?: string }) => void {
    return (e) => {
      if (e.type !== "keydown") return;

      const key = e.key.toLowerCase();
      const hero = this.sim.units.find((u) => u.id === this.heroId);
      if (!hero) return;

      switch (key) {
        case "w":
        case "arrowup":
          this.moveHero(0, -1);
          break;
        case "s":
        case "arrowdown":
          this.moveHero(0, 1);
          break;
        case "a":
        case "arrowleft":
          this.moveHero(-1, 0);
          break;
        case "d":
        case "arrowright":
          this.moveHero(1, 0);
          break;
        case " ":
          this.jumpHero();
          break;
        case "e":
          this.strikeHero();
          break;
        case "n":
          if (this.currentStage < this.stages.length - 1) {
            this.loadStage(this.currentStage + 1);
          }
          break;
        case "p":
          if (this.currentStage > 0) {
            this.loadStage(this.currentStage - 1);
          }
          break;
        case "r":
          this.loadStage(this.currentStage);
          break;
      }
    };
  }

  private moveHero(dx: number, dy: number) {
    const hero = this.sim.units.find((u) => u.id === this.heroId);
    if (!hero || hero.meta?.jumping) return;

    const stage = this.stages[this.currentStage];
    const newX = Math.max(1, Math.min(stage.width - 2, hero.pos.x + dx));
    const newY = Math.max(1, Math.min(stage.height - 2, hero.pos.y + dy));

    this.sim.queuedCommands.push({
      type: "move",
      unitId: this.heroId,
      params: { x: newX, y: newY },
    });

    if (dx !== 0) {
      this.sim.queuedCommands.push({
        type: "meta",
        unitId: this.heroId,
        params: {
          meta: { facing: dx > 0 ? "right" : "left" },
        },
      });
    }
  }

  private jumpHero() {
    const hero = this.sim.units.find((u) => u.id === this.heroId);
    if (!hero || hero.meta?.jumping) return;

    this.sim.queuedCommands.push({
      type: "jump",
      unitId: this.heroId,
      params: {
        distance: 4,
        height: 6,
      },
    });
  }

  private strikeHero() {
    const hero = this.sim.units.find((u) => u.id === this.heroId);
    if (!hero) return;

    this.sim.queuedCommands.push({
      type: "strike",
      unitId: this.heroId,
      params: {
        direction: hero.meta?.facing || "right",
        range: 2,
        damage: hero.dmg || 18,
      },
    });
  }

  update() {
    super.update();

    this.checkStageCompletion();
  }

  static boot(canvasId: string | HTMLCanvasElement = "battlefield") {
    let game: GauntletGame | null = null;
    const canvas =
      canvasId instanceof HTMLCanvasElement
        ? canvasId
        : (document.getElementById(canvasId) as HTMLCanvasElement);
    if (canvas) {
      let addInputListener = (
        cb: (e: { key: string; type?: string }) => void,
      ) => {
        document.addEventListener("keydown", (e) => {
          cb({ key: e.key, type: "keydown" });
        });
        document.addEventListener("keyup", (e) => {
          cb({ key: e.key, type: "keyup" });
        });
      };

      game = new GauntletGame(canvas, {
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
  window.GauntletGame = GauntletGame;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => GauntletGame.boot());
  } else {
    GauntletGame.boot();
  }
}
