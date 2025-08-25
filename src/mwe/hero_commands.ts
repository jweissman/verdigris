import { Game } from "../core/game";
import Input from "../core/input";
import Encyclopaedia from "../dmg/encyclopaedia";
import type { Unit } from "../types/Unit";

/**
 * Hero Commands MWE - Testing ground for hero movement and abilities
 *
 * Features:
 * - Triple jump mechanics
 * - Ground pound ability
 * - Dash/heroic leap
 * - Auto-targeting for abilities
 * - Card draw system (simulated)
 */
export class HeroCommandsGame extends Game {
  private heroId: string = "hero_player";
  private heroType: string = "champion";
  private jumpCount: number = 0;
  private maxJumps: number = 3;
  private cardHand: string[] = [];
  private maxCards: number = 5;
  private cardCooldown: number = 0;
  input: Input = new Input(this.sim, this.renderer);

  bootstrap() {
    super.bootstrap();
    this.loadDesertScene();
    this.spawnHero();
    this.initCardSystem();
  }

  private loadDesertScene() {
    this.sim.queuedCommands.push({
      type: "sceneMetadata",
      params: {
        background: "desert",
        music: "exploration",
      },
    });
  }

  private spawnHero() {
    const heroData = Encyclopaedia.unit(this.heroType) || {};
    const hero: Unit = {
      id: this.heroId,
      type: this.heroType,
      pos: { x: 20, y: 15 },
      intendedMove: { x: 0, y: 0 },
      team: "friendly" as const,
      state: "idle" as const,
      hp: heroData.hp || 150,
      maxHp: heroData.maxHp || 150,
      mass: heroData.mass || 10,
      sprite: heroData.sprite || "champion",
      abilities: ["groundPound", "heroicLeap", "tripleJump"],
      dmg: heroData.dmg || 15,
      tags: ["hero", "controlled"],
      meta: {
        controlled: true,
        facing: "right" as const,
        jumpCount: 0,
        dashAvailable: true,
      },
    };

    this.sim.addUnit(hero);

    this.spawnTestEnemies();

    console.log(`Hero spawned: ${this.heroType} at (20, 15)`);
    console.log(
      `Controls: WASD=move, Space=jump, Q=ground pound, E=dash, 1-5=play cards`,
    );
  }

  private spawnTestEnemies() {
    const enemyTypes = ["skeleton", "ghost", "soldier"];
    for (let i = 0; i < 3; i++) {
      const enemyData = Encyclopaedia.unit(enemyTypes[i]) || {};
      this.sim.addUnit({
        id: `enemy_${i}`,
        type: enemyTypes[i],
        pos: { x: 35 + i * 5, y: 15 },
        intendedMove: { x: 0, y: 0 },
        team: "hostile" as const,
        state: "idle" as const,
        hp: enemyData.hp || 30,
        maxHp: enemyData.maxHp || 30,
        mass: enemyData.mass || 5,
        sprite: enemyData.sprite || enemyTypes[i],
        abilities: enemyData.abilities || [],
        dmg: enemyData.dmg || 5,
        tags: ["enemy"],
      });
    }
  }

  private initCardSystem() {
    const possibleCards = ["bolt", "heal", "freeze", "burn", "shield"];
    for (let i = 0; i < 3; i++) {
      const card =
        possibleCards[Math.floor(Math.random() * possibleCards.length)];
      if (this.cardHand.length < this.maxCards) {
        this.cardHand.push(card);
      }
    }
    console.log(`Starting hand: ${this.cardHand.join(", ")}`);
  }

  getInputHandler(): (e: { key: string }) => void {
    return (e) => {
      const hero = this.sim.units.find((u) => u.id === this.heroId);
      if (!hero) return;

      switch (e.key.toLowerCase()) {
        case "w":
          this.moveHero(0, -1);
          break;
        case "a":
          this.moveHero(-1, 0);
          break;
        case "s":
          this.moveHero(0, 1);
          break;
        case "d":
          this.moveHero(1, 0);
          break;
        case " ":
          this.performJump();
          break;
        case "q":
          this.performGroundPound();
          break;
        case "e":
          this.performDash();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
          this.playCard(parseInt(e.key) - 1);
          break;
        case "r":
          this.resetScene();
          break;
        case "h":
          this.showHelp();
          break;
        default:
          super.getInputHandler()(e);
      }
    };
  }

  private moveHero(dx: number, dy: number) {
    const hero = this.sim.units.find((u) => u.id === this.heroId);
    if (!hero) return;

    if (!hero.meta?.jumping && this.jumpCount > 0) {
      this.jumpCount = 0;
      console.log("Jump count reset");
    }

    const newX = Math.max(
      0,
      Math.min(this.sim.fieldWidth - 1, hero.pos.x + dx),
    );
    const newY = Math.max(
      0,
      Math.min(this.sim.fieldHeight - 1, hero.pos.y + dy),
    );

    this.sim.queuedCommands.push({
      type: "move",
      params: {
        unitId: this.heroId,
        x: newX,
        y: newY,
      },
    });

    if (dx !== 0) {
      this.sim.queuedCommands.push({
        type: "meta",
        params: {
          unitId: this.heroId,
          meta: {
            ...hero.meta,
            facing: dx > 0 ? "right" : "left",
          },
        },
      });
    }
  }

  private performJump() {
    const hero = this.sim.units.find((u) => u.id === this.heroId);
    if (!hero) return;

    if (this.jumpCount >= this.maxJumps) {
      console.log(`Max jumps (${this.maxJumps}) reached`);
      return;
    }

    this.jumpCount++;
    const jumpPower = this.jumpCount === 3 ? 6 : 4; // Third jump is higher
    const jumpDistance = this.jumpCount === 3 ? 5 : 3;

    const facingRight = hero.meta?.facing === "right";
    const targetX = facingRight
      ? Math.min(this.sim.fieldWidth - 1, hero.pos.x + jumpDistance)
      : Math.max(0, hero.pos.x - jumpDistance);

    this.sim.queuedCommands.push({
      type: "jump",
      params: {
        unitId: this.heroId,
        targetX: targetX,
        targetY: hero.pos.y,
        height: jumpPower,
        damage: this.jumpCount === 3 ? 10 : 0, // Ground pound on third jump
        radius: this.jumpCount === 3 ? 2 : 0,
      },
    });

    console.log(
      `Jump ${this.jumpCount}/${this.maxJumps} - Height: ${jumpPower}`,
    );
  }

  private performGroundPound() {
    const hero = this.sim.units.find((u) => u.id === this.heroId);
    if (!hero) return;

    const enemies = this.sim.units.filter(
      (u) =>
        u.team === "hostile" &&
        Math.abs(u.pos.x - hero.pos.x) <= 6 &&
        Math.abs(u.pos.y - hero.pos.y) <= 6,
    );

    this.sim.queuedCommands.push({
      type: "aoe",
      params: {
        unitId: this.heroId,
        x: hero.pos.x,
        y: hero.pos.y,
        radius: 4,
        damage: 25,
        knockback: 8,
      },
    });

    this.sim.queuedCommands.push({
      type: "particle",
      params: {
        x: hero.pos.x,
        y: hero.pos.y,
        type: "explosion",
        count: 10,
      },
    });

    console.log(`Ground Pound! Hit ${enemies.length} enemies`);
  }

  private performDash() {
    const hero = this.sim.units.find((u) => u.id === this.heroId);
    if (!hero || !hero.meta?.dashAvailable) {
      console.log("Dash not available");
      return;
    }

    const enemies = this.sim.units.filter((u) => u.team === "hostile");
    let targetX = hero.pos.x;
    let targetY = hero.pos.y;

    if (enemies.length > 0) {
      const closest = enemies.reduce((prev, curr) => {
        const prevDist =
          Math.abs(prev.pos.x - hero.pos.x) + Math.abs(prev.pos.y - hero.pos.y);
        const currDist =
          Math.abs(curr.pos.x - hero.pos.x) + Math.abs(curr.pos.y - hero.pos.y);
        return currDist < prevDist ? curr : prev;
      });

      targetX = closest.pos.x;
      targetY = closest.pos.y;
      console.log(`Dashing to enemy at (${targetX}, ${targetY})`);
    } else {
      const facingRight = hero.meta?.facing === "right";
      targetX = facingRight
        ? Math.min(this.sim.fieldWidth - 1, hero.pos.x + 8)
        : Math.max(0, hero.pos.x - 8);
      console.log("Dashing forward");
    }

    this.sim.queuedCommands.push({
      type: "jump",
      params: {
        unitId: this.heroId,
        targetX: targetX,
        targetY: targetY,
        height: 6,
        damage: 20,
        radius: 3,
      },
    });

    hero.meta.dashAvailable = false;
    setTimeout(() => {
      const h = this.sim.units.find((u) => u.id === this.heroId);
      if (h && h.meta) {
        h.meta.dashAvailable = true;
        console.log("Dash ready!");
      }
    }, 2000);
  }

  private playCard(index: number) {
    if (index < 0 || index >= this.cardHand.length) {
      console.log("No card at that position");
      return;
    }

    const card = this.cardHand[index];
    const hero = this.sim.units.find((u) => u.id === this.heroId);
    if (!hero) return;

    console.log(`Playing card: ${card}`);

    switch (card) {
      case "bolt":
        this.sim.queuedCommands.push({
          type: "bolt",
          params: {
            unitId: this.heroId,
            damage: 30,
            range: 10,
          },
        });
        break;
      case "heal":
        this.sim.queuedCommands.push({
          type: "heal",
          params: {
            unitId: this.heroId,
            amount: 30,
          },
        });
        break;
      case "freeze":
        this.sim.queuedCommands.push({
          type: "statusEffect",
          params: {
            unitId: this.heroId,
            effect: "frozen",
            duration: 60,
            radius: 3,
          },
        });
        break;
      case "burn":
        this.sim.queuedCommands.push({
          type: "statusEffect",
          params: {
            unitId: this.heroId,
            effect: "burning",
            duration: 100,
            radius: 4,
          },
        });
        break;
      case "shield":
        hero.meta = { ...hero.meta, shielded: true };
        setTimeout(() => {
          const h = this.sim.units.find((u) => u.id === this.heroId);
          if (h && h.meta) {
            h.meta.shielded = false;
          }
        }, 5000);
        break;
    }

    this.cardHand.splice(index, 1);
    this.drawCard();
  }

  private drawCard() {
    if (this.cardCooldown > 0) {
      this.cardCooldown--;
      return;
    }

    if (this.cardHand.length >= this.maxCards) {
      console.log("Hand full!");
      return;
    }

    const possibleCards = [
      "bolt",
      "heal",
      "freeze",
      "burn",
      "shield",
      "teleport",
      "summon",
    ];
    const newCard =
      possibleCards[Math.floor(Math.random() * possibleCards.length)];
    this.cardHand.push(newCard);
    this.cardCooldown = 30; // Cooldown before next draw

    console.log(`Drew card: ${newCard}`);
    console.log(`Current hand: ${this.cardHand.join(", ")}`);
  }

  private resetScene() {
    this.sim.reset();
    this.jumpCount = 0;
    this.cardHand = [];
    this.spawnHero();
    this.initCardSystem();
  }

  private showHelp() {
    console.log("=== Hero Commands MWE ===");
    console.log("WASD - Move");
    console.log("Space - Jump (triple jump!)");
    console.log("Q - Ground Pound");
    console.log("E - Dash/Heroic Leap");
    console.log("1-5 - Play cards from hand");
    console.log("R - Reset scene");
    console.log("H - Show this help");
  }

  update() {
    super.update();

    const enemies = this.sim.units.filter((u) => u.team === "hostile");
    if (enemies.length === 0 && this.cardCooldown === 0) {
      this.drawCard();

      this.spawnTestEnemies();
    }

    if (this.cardCooldown > 0) {
      this.cardCooldown--;
    }
  }

  static boot(canvasId: string | HTMLCanvasElement = "battlefield") {
    let game: HeroCommandsGame | null = null;
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

      game = new HeroCommandsGame(canvas, {
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
      game.showHelp();
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
  window.HeroCommandsGame = HeroCommandsGame;
}
