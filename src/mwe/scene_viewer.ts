import { Game } from "../core/game";
import Renderer, { createScaledRenderer } from "../core/renderer";
import { SceneLoader } from "../core/scene_loader";
import { Simulator } from "../core/simulator";
import { Jukebox } from "../audio/jukebox";

class ScenarioViewer {
  sim: Simulator;
  sceneLoader: SceneLoader;
  renderer: Renderer;
  jukebox: Jukebox;
  isPlaying: boolean = false;
  musicEnabled: boolean = true;
  currentMusic: string = "";
  currentScenario: string = ""; // Track the current scenario
  gameLoop;
  lastSimTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.sim = new Simulator(40, 25);
    this.sceneLoader = new SceneLoader(this.sim);
    this.jukebox = new Jukebox();
    const sprites = Game.loadSprites();
    const backgrounds = Game.loadBackgrounds();
    const { renderer, handleResize, draw } = createScaledRenderer(
      320,
      200,
      canvas,
      this.sim,
      sprites,
      backgrounds,
    );
    this.renderer = renderer;
    handleResize();
    this.draw = draw;
    this.startGame();
  }

  startGame() {
    if (this.gameLoop) cancelAnimationFrame(this.gameLoop);

    const animate = () => {
      const now = Date.now();
      if (this.isPlaying && now - this.lastSimTime > 125) {
        this.sim.step();
        this.lastSimTime = now;
      }

      this.draw();
      this.gameLoop = requestAnimationFrame(animate);
    };

    this.lastSimTime = Date.now();
    this.gameLoop = requestAnimationFrame(animate);
  }

  draw: () => void;

  loadScene(scenario: string) {
    try {
      this.jukebox.stopMusic();

      this.currentScenario = scenario;

      this.sceneLoader.loadScenario(scenario);
      const unitCounts = new Map<string, number>();
      this.sim.units.forEach((unit) => {
        const type = unit.type || unit.sprite || "unknown";
        unitCounts.set(type, (unitCounts.get(type) || 0) + 1);
      });

      this.draw();
    } catch (error) {
      console.error("Failed to load scene:", error);
    }
  }

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
  }

  step() {
    this.sim.step();
    this.draw();
  }

  restart() {
    if (this.currentScenario) {
      this.loadScene(this.currentScenario);
    } else {
      const firstScenario = Object.keys(SceneLoader.scenarios)[0];
      if (firstScenario) {
        this.loadScene(firstScenario);
      }
    }
  }

  toggleView() {
    const currentMode = this.renderer.viewMode || "cinematic";
    let newMode: "grid" | "cinematic" | "iso";

    switch (currentMode) {
      case "cinematic":
        newMode = "iso";
        break;
      case "iso":
        newMode = "grid";
        break;
      case "grid":
        newMode = "cinematic";
        break;
      default:
        newMode = "cinematic";
    }

    this.renderer.setViewMode(newMode);
    this.draw();
  }
}

window.onload = () => {
  const canvas = document.getElementById("battlefield") as HTMLCanvasElement;
  const viewer = new ScenarioViewer(canvas);

  const logDiv = document.getElementById("console") as HTMLDivElement;
  logDiv.style.whiteSpace = "pre-wrap";
  logDiv.style.fontFamily = "monospace";
  logDiv.style.color = "white";
  logDiv.style.backgroundColor = "black";
  logDiv.style.padding = "10px";
  logDiv.style.overflowY = "auto";
  logDiv.style.maxHeight = "200px";
  logDiv.style.border = "1px solid #333";
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog(...args);
    logDiv.textContent += args.join(" ") + "\n\n";
    logDiv.scrollTop = logDiv.scrollHeight;
  };

  function handleSceneChange(e) {
    const selectedScene = e.target.value;
    if (!selectedScene) return;
    viewer.loadScene(selectedScene);
  }
  document.getElementById("scene-selector").addEventListener("change", (e) => {
    handleSceneChange(e);
  });

  document.getElementById("play-pause").addEventListener("click", () => {
    viewer.togglePlayPause();
  });

  document.getElementById("step").addEventListener("click", () => {
    viewer.step();
  });

  document.getElementById("restart").addEventListener("click", () => {
    viewer.restart();
  });

  document.getElementById("toggle-view").addEventListener("click", () => {
    viewer.toggleView();
  });

  const musicSelector = document.getElementById(
    "music-selector",
  ) as HTMLSelectElement;
  musicSelector.addEventListener("change", (e) => {
    const selectedMusic = (e.target as HTMLSelectElement).value;
    viewer.jukebox.stopMusic();
    if (selectedMusic) {
      viewer.currentMusic = selectedMusic;
      viewer.jukebox.playProgression(selectedMusic, true);
    } else {
      viewer.currentMusic = "";
    }
  });

  document.getElementById("toggle-music").addEventListener("click", () => {
    viewer.musicEnabled = !viewer.musicEnabled;
    if (!viewer.musicEnabled) {
      viewer.jukebox.stopMusic();
    } else if (viewer.currentMusic) {
      viewer.jukebox.playProgression(viewer.currentMusic, true);
    }
  });

  document.getElementById("next-music").addEventListener("click", () => {
    const progressions = viewer.jukebox.getAvailableProgressions();
    const currentIndex = progressions.indexOf(viewer.currentMusic);
    const nextIndex = (currentIndex + 1) % progressions.length;
    const nextMusic = progressions[nextIndex];
    musicSelector.value = nextMusic;
    musicSelector.dispatchEvent(new Event("change"));
  });

  const initialScene = (
    document.getElementById("scene-selector") as HTMLSelectElement
  ).value;
  if (initialScene) {
    (
      document.getElementById("scene-selector") as HTMLSelectElement
    ).dispatchEvent(new Event("change"));
  }
};
