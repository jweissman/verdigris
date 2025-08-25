import { Game } from "../core/game";
import { PlayerControl } from "../rules/player_control";

export class HeroGame extends Game {
  private playerControl: PlayerControl | undefined;
  public cursorWorldPos: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement, opts?: any) {
    super(canvas, opts);

    this.simTickRate = 8; // Slow down for debugging

    // NOTE: THIS DOESN'T WORK AT ALL AND IS MISGUIDED
  }

  // TODO create a spawning pool object!! what is this

  update() {
    // Pass hover cell to renderer
    if (this.cursorWorldPos && this.renderer) {
      (this.renderer as any).hoverCell = this.cursorWorldPos;
    }
    super.update();
  }

  bootstrap() {
    super.bootstrap();
    this.renderer.setViewMode("iso");

    // Get PlayerControl from the simulator's existing rules
    this.playerControl = this.sim.rules.find(
      (r) => r instanceof PlayerControl,
    ) as PlayerControl;

    this.sim.sceneBackground = "grad";

    this.sim.addUnit({
      id: "hero",
      type: "hero",
      pos: { x: 10, y: 10 },
      team: "friendly",
      hp: 100,
      maxHp: 100,
      dmg: 15,
      mass: 10, // High mass to prevent being pushed around
      sprite: "hero",
      tags: ["hero"],
      meta: {
        controlled: true,
        useRig: true, // Re-enable rig for proper display
        onRooftop: true,
        facing: "right",
      },
    });

    // Add creatures from encyclopaedia with ambient behavior
    for (let i = 0; i < 3; i++) {
      this.sim.addUnit({
        type: "squirrel",
        pos: { x: 12 + i * 2, y: 8 + (i % 2) * 2 },
        tags: ["wander"] // Allow wandering with behavioral tag
      });
    }

    // Add goblins as enemies for hero to fight
    for (let i = 0; i < 3; i++) {
      this.sim.addUnit({
        type: "goblin",
        pos: { x: 14 + i * 2, y: 11 + (i % 2) },
        team: "hostile",
      });
    }

    // Add a bear with ambient behavior
    this.sim.addUnit({
      type: "bear",
      pos: { x: 20, y: 15 },
      tags: ["wander"] // Allow wandering with behavioral tag
    });
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
        // Handle view switching
        if (e.key === "i" || e.key === "I") {
          if (game && game.renderer) {
            const currentMode = (game.renderer as any).viewMode;
            if (currentMode === "inventory") {
              game.renderer.setViewMode("iso");
            } else {
              game.renderer.setViewMode("inventory");
            }
          }
        } else if (game && game.playerControl) {
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
          const mouseX = (e.clientX - rect.left) * scaleX;
          const mouseY = (e.clientY - rect.top) * scaleY;

          // Reverse the isometric transformation
          // From isometric.ts: screenX = x * 16 + hexOffset + offsets.x
          //                     screenY = y * 3 + offsets.y (with verticalSpacing=3)
          const offsets = { x: -20, y: 130 }; // Default rooftop offsets from isometric.ts
          const tileWidth = 16;
          const verticalSpacing = 3;

          // Adjust for offsets
          const adjustedY = (mouseY - offsets.y) / verticalSpacing;
          const y = Math.floor(adjustedY);

          // Account for hex offset
          const hexOffset = y % 2 === 1 ? tileWidth / 2 : 0;
          const adjustedX = (mouseX - offsets.x - hexOffset) / tileWidth;
          const x = Math.floor(adjustedX);

          game.cursorWorldPos = { x, y };
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
