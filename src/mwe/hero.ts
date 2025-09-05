import { Game } from "../core/game";
import { PlayerControl } from "../rules/player_control";

export class HeroGame extends Game {
  // private playerControl: PlayerControl | undefined;
  public cursorWorldPos: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement, opts?: any) {
    super(canvas, opts);

    // doe sthis do anything???
    // this.simTickRate = 8; // Slow down for debugging

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

  // Override setupInput to prevent default handler
  setupInput() {
    // Don't add the default input listener
  }

  bootstrap() {
    super.bootstrap();
    this.renderer.setViewMode("iso");

    // Get PlayerControl from the simulator's existing rules
    // this.playerControl = this.sim.rules.find(
    //   (r) => r instanceof PlayerControl,
    // ) as PlayerControl;

    this.sim.sceneBackground = "grad";

    const hero = this.sim.addUnit({
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
      abilities: ["strike", "bolt", "jump", "dash", "blink", "groundPound"],
      meta: {
        controlled: true,
        useRig: true, // Re-enable rig for proper display
        onRooftop: true,
        facing: "right",
        primaryAction: "strike",  // This is what PlayerControl looks for!
        abilityA: "bolt",      // Ranged projectile
        abilityB: "groundPound", // Area effect slam
      },
    });
    
    // Hero starts with sword (default weapon)

    // Add creatures from encyclopaedia with ambient behavior
    for (let i = 0; i < 3; i++) {
      this.sim.addUnit({
        type: "squirrel",
        pos: { x: 12 + i * 2, y: 8 + (i % 2) * 2 },
        tags: ["wander"], // Allow wandering with behavioral tag
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
      tags: ["wander"], // Allow wandering with behavioral tag
    });
  }
}

if (typeof window !== "undefined") {
  const canvas = document.getElementById("battlefield") as HTMLCanvasElement;
  if (canvas) {
    // @ts-ignore
    const game = (window.HeroGame = new HeroGame(canvas));

    // Bootstrap the game (this starts the internal loop)
    game.bootstrap();

    // Get PlayerControl from the simulator's existing rules
    const playerControl = game.sim.rules.find(
      (r) => r instanceof PlayerControl,
    ) as PlayerControl | undefined;

    document.addEventListener("keydown", (e) => {
      // Handle view switching
      if (e.key === "i" || e.key === "I") {
        const currentMode = (game.renderer as any).viewMode;
        if (currentMode === "inventory") {
          game.renderer.setViewMode("iso");
        } else {
          game.renderer.setViewMode("inventory");
        }
      } else if (playerControl) {
        playerControl.setKeyState(e.key, true);
      }
    });

    document.addEventListener("keyup", (e) => {
      if (playerControl) {
        playerControl.setKeyState(e.key, false);
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      // Reverse the isometric transformation
      const offsets = { x: -20, y: 130 };
      const tileWidth = 16;
      const verticalSpacing = 3;

      const adjustedY = (mouseY - offsets.y) / verticalSpacing;
      const y = Math.floor(adjustedY);

      const hexOffset = y % 2 === 1 ? tileWidth / 2 : 0;
      const adjustedX = (mouseX - offsets.x - hexOffset) / tileWidth;
      const x = Math.floor(adjustedX);

      game.cursorWorldPos = { x, y };
    });

    window.addEventListener("resize", () => {
      if (game.handleResize) {
        game.handleResize();
      }
    });

    // Initial resize
    if (game.handleResize) {
      game.handleResize();
    }
  }
}
