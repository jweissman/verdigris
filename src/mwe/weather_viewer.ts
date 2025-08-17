import Encyclopaedia from "../dmg/encyclopaedia";
import { Freehold } from "../freehold";
import { Game } from "../core/game";
import { Simulator } from "../simulator";
import Isometric from "../views/isometric";
import Orthographic from "../views/orthographic";
import View from "../views/view";

export default class SceneWeatherViewer {
  private sim: Simulator;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private views: { [key: string]: View };
  private backgrounds: string[] = [
    "toyforge",
    "winter",
    "mountain",
    "lake",
    "burning-city",
    "monastery",
    "desert",
  ];
  private weathers: string[] = [
    "clear",
    "rain",
    "winter",
    "storm",
    "sandstorm",
  ];
  private viewModes: string[] = ["isometric", "orthographic"];
  private currentBgIndex: number = 0;
  private currentWeatherIndex: number = 0;
  private currentViewIndex: number = 1;
  private isPlaying: boolean = true;
  private lastTime: number = 0;

  constructor() {
    this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;

    this.ctx = this.canvas.getContext("2d")!;

    this.backgrounds = [
      "toyforge",
      "winter",
      "mountain",
      "lake",
      "burning-city",
      "monastery",
      "desert",
    ];

    this.weathers = ["clear", "rain", "winter", "storm", "sandstorm"];

    this.viewModes = ["isometric", "orthographic"];

    this.currentBgIndex = 0;
    this.currentWeatherIndex = 0;
    this.currentViewIndex = 0;
    this.isPlaying = true;

    this.setupSimulator();
    this.setupViews();
    this.setupKeyboardControls();
    this.updateDisplay();

    this.lastTime = 0;
    this.gameLoop();
  }

  setupSimulator() {
    this.sim = new Simulator(32, 24);

    this.placeTestCreatures();
  }

  setupViews() {
    let sprites = Game.loadSprites();
    let backgrounds = Game.loadBackgrounds();
    this.views = {
      isometric: new Isometric(
        this.ctx,
        this.sim,
        320,
        200,
        sprites,
        backgrounds,
      ),
      orthographic: new Orthographic(
        this.ctx,
        this.sim,
        320,
        200,
        sprites,
        backgrounds,
      ),
    };
  }

  placeTestCreatures() {
    this.sim.units = [];
  }

  setupKeyboardControls() {
    document.addEventListener("keydown", (event) => {
      switch (event.code) {
        case "ArrowLeft":
          this.currentBgIndex =
            (this.currentBgIndex - 1 + this.backgrounds.length) %
            this.backgrounds.length;
          this.updateDisplay();
          break;
        case "ArrowRight":
          this.currentBgIndex =
            (this.currentBgIndex + 1) % this.backgrounds.length;
          this.updateDisplay();
          break;
        case "ArrowUp":
          this.currentWeatherIndex =
            (this.currentWeatherIndex - 1 + this.weathers.length) %
            this.weathers.length;
          this.applyWeather();
          this.updateDisplay();
          break;
        case "ArrowDown":
          this.currentWeatherIndex =
            (this.currentWeatherIndex + 1) % this.weathers.length;
          this.applyWeather();
          this.updateDisplay();
          break;
        case "KeyV":
          this.currentViewIndex =
            (this.currentViewIndex + 1) % this.viewModes.length;
          this.updateDisplay();
          break;
        case "Space":
          this.isPlaying = !this.isPlaying;
          event.preventDefault();
          break;
        case "KeyR":
          this.resetScene();
          break;
      }
    });
  }

  applyWeather() {
    const weather = this.weathers[this.currentWeatherIndex];

    this.sim.particles = [];

    this.sim.lightningActive = false;

    switch (weather) {
      case "rain":
        this.sim.queuedCommands = [
          { type: "weather", args: ["rain", "120", "0.8"] },
        ];
        break;
      case "winter":
        this.sim.queuedCommands = [{ type: "weather", args: ["winter"] }];
        break;
      case "storm":
        this.sim.queuedCommands = [
          { type: "weather", args: ["rain", "120", "1.0"] },
          { type: "lightning", args: ["16", "12"] },
        ];
        break;
      case "sandstorm":
        this.sim.queuedCommands = [
          { type: "temperature", args: ["35"] },
          { type: "weather", args: ["sand", "200", "0.6"] },
        ];
        break;
      case "clear":
        this.sim.queuedCommands = [{ type: "weather", args: ["clear"] }];
        break;
    }

    this.sim.step();
  }

  resetScene() {
    this.placeTestCreatures();
    this.applyWeather();
  }

  updateDisplay() {
    document.getElementById("bg-name").textContent =
      this.backgrounds[this.currentBgIndex];
    document.getElementById("weather-name").textContent =
      this.weathers[this.currentWeatherIndex];
    document.getElementById("view-name").textContent =
      this.viewModes[this.currentViewIndex];
  }

  updateWeatherInfo() {
    document.getElementById("particle-count").textContent =
      this.sim.particles.length;

    let avgTemp = 20,
      avgHumidity = 0.5;
    if (this.sim.temperatureField) {
      let totalTemp = 0,
        totalHumidity = 0,
        count = 0;
      for (let x = 0; x < this.sim.fieldWidth; x++) {
        for (let y = 0; y < this.sim.fieldHeight; y++) {
          if (
            this.sim.temperatureField[x] &&
            this.sim.temperatureField[x][y] !== undefined
          ) {
            totalTemp += this.sim.temperatureField[x][y];
            count++;
          }
          if (
            this.sim.humidityField &&
            this.sim.humidityField[x] &&
            this.sim.humidityField[x][y] !== undefined
          ) {
            totalHumidity += this.sim.humidityField[x][y];
          }
        }
      }
      if (count > 0) {
        avgTemp = Math.round(totalTemp / count);
        avgHumidity = Math.round((totalHumidity / count) * 100) / 100;
      }
    }

    document.getElementById("temperature").textContent = avgTemp;
    document.getElementById("humidity").textContent = avgHumidity;
    document.getElementById("wind").textContent = this.sim.lightningActive
      ? "stormy"
      : "calm";
  }

  gameLoop(currentTime = 0) {
    const deltaTime = currentTime - this.lastTime;

    if (this.isPlaying && deltaTime > 100) {

      this.sim.step();
      this.lastTime = currentTime;
    }

    this.render();
    this.updateWeatherInfo();

    requestAnimationFrame((time) => this.gameLoop(time));
  }

  render() {
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const bgName = this.backgrounds[this.currentBgIndex];

    this.sim.sceneBackground = bgName;

    const currentView = this.views[this.viewModes[this.currentViewIndex]];
    currentView.show();
  }
}

if (typeof document !== "undefined") {
  // @ts-ignore
  window.WeatherViewer = SceneWeatherViewer;

  window.addEventListener("load", () => {
    new SceneWeatherViewer();
  });
}
