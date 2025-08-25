import { Game } from "../core/game";
import { HeroAnimation } from "../rules/hero_animation";
import { PlayerControl } from "../rules/player_control";
import { Jumping } from "../rules/jumping";
import { Hunting } from "../rules/hunting";
import { MeleeCombat } from "../rules/melee_combat";

export class HeroGame extends Game {
  private playerControl: PlayerControl;
  public cursorWorldPos: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement, opts?: any) {
    super(canvas, opts);

    this.simTickRate = 30;

    // NOTE: THIS DOESN'T WORK AT ALL AND IS MISGUIDED
  }

  // TODO create a spawning pool object!! what is this

  update() {
    // Pass hover cell to renderer through a temporary property
    if (this.cursorWorldPos && this.renderer) {
      (this.renderer as any).hoverCell = this.cursorWorldPos;
    }
    super.update();
  }

  bootstrap() {
    super.bootstrap();
    this.renderer.setViewMode("iso");

    this.playerControl = new PlayerControl();
    this.sim.rulebook.push(this.playerControl);
    this.sim.rulebook.push(new HeroAnimation());
    this.sim.rulebook.push(new Jumping());
    this.sim.rulebook.push(new Hunting());
    this.sim.rulebook.push(new MeleeCombat());

    const MoveToTarget = require("../rules/move_to_target").MoveToTarget;
    this.sim.rulebook.push(new MoveToTarget());

    this.sim.sceneBackground = "grad";

    this.sim.addUnit({
      id: "hero",
      pos: { x: 10, y: 10 },
      team: "friendly",
      hp: 100,
      maxHp: 100,
      dmg: 15,
      sprite: "hero", // Add sprite for Z-axis rendering to work
      tags: ["hero"],
      abilities: ["heroRegeneration"], // Add regeneration passive
      meta: {
        controlled: true,
        useRig: true,
        onRooftop: true,
        weapon: "sword", // Default weapon
        facing: "right",
      },
    });

    // Add some ambient creatures to test attacks - make them hostile so they attack
    for (let i = 0; i < 5; i++) {
      this.sim.addUnit({
        id: `squirrel_${i}`,
        pos: { x: 12 + i * 2, y: 8 + (i % 2) * 3 },
        team: "hostile", // Make them hostile so they attack
        hp: 20,
        maxHp: 20,
        dmg: 2,
        sprite: "squirrel",
        tags: ["ambient", "creature", "hunter"],
        meta: {
          sightRange: 5,
          attackRange: 1,
        },
      });
    }

    // Add a few hostile enemies too
    for (let i = 0; i < 3; i++) {
      this.sim.addUnit({
        id: `goblin_${i}`,
        pos: { x: 15 + i * 3, y: 12 + i },
        team: "hostile",
        hp: 30,
        maxHp: 30,
        dmg: 5,
        sprite: "goblin",
        tags: ["enemy", "hunter"], // Add hunter tag for AI
        meta: {
          sightRange: 8,
          attackRange: 1,
        },
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
      let addInputListener = (
        cb: (e: { key: string; type?: string }) => void,
      ) => {};

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

      canvas.addEventListener("mousemove", (e) => {
        if (game && game.sim) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;

          const offsets = { x: -20, y: 130 }; // Default rooftop offsets
          const tileWidth = 16;
          const verticalSpacing = 3;

          const adjustedY = Math.floor((y - offsets.y) / verticalSpacing);
          const hexOffset = adjustedY % 2 === 1 ? tileWidth / 2 : 0;
          const adjustedX = Math.floor((x - offsets.x - hexOffset) / tileWidth);

          const worldX = adjustedX;
          const worldY = adjustedY;

          // Store hover cell in the hero game instance instead
          game.cursorWorldPos = { x: worldX, y: worldY };
        }
      });

      canvas.addEventListener("click", (e) => {
        if (game && game.sim) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;

          const worldX =
            Math.round(
              (x - canvas.width / 2) / 8 + (y - canvas.height / 2) / 4,
            ) + 10;
          const worldY =
            Math.round(
              (y - canvas.height / 2) / 4 - (x - canvas.width / 2) / 16,
            ) + 10;

          game.sim.queuedCommands.push({
            type: "hero",
            params: {
              action: "move-to",
              x: worldX,
              y: worldY,
              attackMove: false,
            },
          });
          console.log(`Click to move: hero move-to (${worldX}, ${worldY})`);
        }
      });

      canvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (game && game.sim) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;

          const worldX = Math.round(
            (x - canvas.width / 2) / 8 + (y - canvas.height / 2) / 4,
          );
          const worldY = Math.round(
            (y - canvas.height / 2) / 4 - (x - canvas.width / 2) / 16,
          );

          const hero = game.sim.units.find((u) => u.tags?.includes("hero"));
          if (hero) {
            game.sim.queuedCommands.push({
              type: "move_target",
              unitId: hero.id,
              params: {
                x: worldX + 10,
                y: worldY + 10,
                attackMove: true,
              },
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => HeroGame.boot());
  } else {
    HeroGame.boot();
  }
}
