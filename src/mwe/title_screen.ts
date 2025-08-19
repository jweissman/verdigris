import { Simulator } from "../core/simulator";
import { SceneLoader } from "../core/scene_loader";
import { Game } from "../core/game";
import { createScaledRenderer } from "../core/renderer";

export interface MenuOption {
  text: string;
  action: () => void;
  hotkey?: string;
}

export class TitleScreen {
  private sim: Simulator;
  private sceneLoader: SceneLoader;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: any;
  private selectedOption = 0;
  private isActive = true;

  private menuOptions: MenuOption[] = [
    { text: "Start Game", hotkey: "S", action: () => this.startGame() },
    { text: "Hero Showcase", hotkey: "H", action: () => this.showHeroes() },
    { text: "Desert Battle", hotkey: "D", action: () => this.showDesert() },
    {
      text: "Toymaker Challenge",
      hotkey: "T",
      action: () => this.showToymaker(),
    },
    { text: "Settings", hotkey: "E", action: () => this.showSettings() },
    { text: "Quit", hotkey: "Q", action: () => this.quit() },
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    this.sim = new Simulator(40, 20);
    this.sceneLoader = new SceneLoader(this.sim);

    this.sceneLoader.loadScenario("titleBackground");

    const sprites = Game.loadSprites();
    const backgrounds = Game.loadBackgrounds();
    this.renderer = createScaledRenderer(
      320,
      200,
      canvas,
      this.sim,
      sprites,
      backgrounds,
    );

    this.setupEventHandlers();
    this.startAnimationLoop();
  }

  private setupEventHandlers(): void {
    document.addEventListener("keydown", (e) => {
      if (!this.isActive) return;

      switch (e.key) {
        case "ArrowUp":
          this.selectedOption = Math.max(0, this.selectedOption - 1);
          break;
        case "ArrowDown":
          this.selectedOption = Math.min(
            this.menuOptions.length - 1,
            this.selectedOption + 1,
          );
          break;
        case "Enter":
          this.menuOptions[this.selectedOption].action();
          break;
        default:
          const option = this.menuOptions.find(
            (opt) => opt.hotkey?.toLowerCase() === e.key.toLowerCase(),
          );
          if (option) {
            option.action();
          }
      }
    });
  }

  private startAnimationLoop(): void {
    const animate = () => {
      if (!this.isActive) return;

      this.sim.step();

      this.renderer.render();

      this.renderTitleUI();

      requestAnimationFrame(animate);
    };

    animate();
  }

  private renderTitleUI(): void {
    const canvas = this.canvas;
    const ctx = this.ctx;

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 48px serif";
    ctx.textAlign = "center";
    ctx.fillText("VERDIGRIS", canvas.width / 2, 100);

    ctx.fillStyle = "#87CEEB";
    ctx.font = "16px serif";
    ctx.fillText("Tactical Battle Simulation", canvas.width / 2, 130);

    this.menuOptions.forEach((option, index) => {
      const y = 200 + index * 40;
      const isSelected = index === this.selectedOption;

      if (isSelected) {
        ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
        ctx.fillRect(canvas.width / 2 - 150, y - 20, 300, 35);
      }

      ctx.fillStyle = isSelected ? "#FFD700" : "#FFFFFF";
      ctx.font = isSelected ? "bold 24px serif" : "20px serif";
      ctx.textAlign = "center";
      ctx.fillText(option.text, canvas.width / 2, y);

      if (option.hotkey) {
        ctx.fillStyle = "#87CEEB";
        ctx.font = "14px serif";
        ctx.textAlign = "left";
        ctx.fillText(`[${option.hotkey}]`, canvas.width / 2 + 120, y);
      }
    });

    ctx.fillStyle = "#CCCCCC";
    ctx.font = "14px serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "Use arrow keys or hotkeys to navigate, Enter to select",
      canvas.width / 2,
      canvas.height - 30,
    );

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(10, 10, 200, 80);

    ctx.fillStyle = "#90EE90";
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Background Simulation:`, 15, 25);
    ctx.fillText(`Ticks: ${this.sim.ticks}`, 15, 40);
    ctx.fillText(`Units: ${this.sim.units.length}`, 15, 55);
    ctx.fillText(
      `Weather: ${(this.sim as any).currentWeather || "clear"}`,
      15,
      70,
    );
  }

  private startGame(): void {
    this.transitionToScene("simple");
  }

  private showHeroes(): void {
    this.transitionToScene("heroShowcase");
  }

  private showDesert(): void {
    this.transitionToScene("desert");
  }

  private showToymaker(): void {
    this.transitionToScene("toymakerBalanced");
  }

  private showSettings(): void {
    alert("Settings screen would open here");
  }

  private quit(): void {
    this.isActive = false;

    alert("Game would quit here");
  }

  private transitionToScene(sceneName: string): void {
    this.isActive = false;

    this.sceneLoader.loadScenario(sceneName);

    setTimeout(() => {
      this.isActive = true;
      this.startAnimationLoop();
    }, 1000);
  }

  public destroy(): void {
    this.isActive = false;
  }
}

if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    if (canvas) {
      new TitleScreen(canvas);
    }
  });
}
