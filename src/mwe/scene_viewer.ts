import { Game } from "../core/game";
import { createScaledRenderer } from "../core/renderer";
import { SceneLoader } from "../core/scene_loader";
import { Simulator } from "../core/simulator";
import { Jukebox } from "../audio/jukebox";

class ScenarioViewer {
  sim: Simulator;
  sceneLoader: SceneLoader;
  renderer;
  jukebox: Jukebox;
  isPlaying: boolean = false;
  musicEnabled: boolean = true;
  gameLoop;
  lastSimTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.sim = new Simulator(40, 25);
    this.sceneLoader = new SceneLoader(this.sim);
    this.jukebox = new Jukebox();
    const sprites = Game.loadSprites();
    const backgrounds = Game.loadBackgrounds();
    const { renderer, handleResize, draw } = createScaledRenderer(320, 200, canvas, this.sim, sprites, backgrounds);
    this.renderer = renderer;
    handleResize();
    this.draw = draw;
    this.startGame();
  }

  startGame() {
    if (this.gameLoop) cancelAnimationFrame(this.gameLoop);
    
    const animate = () => {
      // Simulation runs at 8 FPS
      const now = Date.now();
      if (this.isPlaying && now - this.lastSimTime > 125) {
        this.sim.step();
        this.lastSimTime = now;
      }
      
      // Rendering runs at 60 FPS
      this.draw();
      this.gameLoop = requestAnimationFrame(animate);
    };
    
    this.lastSimTime = Date.now();
    this.gameLoop = requestAnimationFrame(animate);
  }

  draw: () => void;

  loadScene(scenario: string) {
    try {
      // Stop any current music first
      this.jukebox.stopMusic();
      
      this.sceneLoader.loadScenario(scenario);
      this.draw();
      
      // Start appropriate music based on scene type (only if enabled)
      if (this.musicEnabled) {
        if (scenario.toLowerCase().includes('forest')) {
          console.log('🌲 Starting forest ambience...');
          this.jukebox.startForestMusic(); // Just music, not automatic ambient sounds
        } else if (scenario.toLowerCase().includes('desert')) {
          console.log('🏜️ Starting exploration music...');
          this.jukebox.startExplorationMusic();
        } else if (scenario.toLowerCase().includes('battle') || scenario.toLowerCase().includes('complex')) {
          console.log('⚔️ Starting battle music...');
          this.jukebox.startBattleMusic();
        } else {
          console.log('🎵 Starting exploration music...');
          this.jukebox.startExplorationMusic();
        }
      }
    } catch (error) {
      console.error('Failed to load scene:', error);
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
    const currentScenario = Object.keys(SceneLoader.scenarios)[0]; // or store the last loaded scenario
    if (currentScenario) {
      this.loadScene(currentScenario);
    }
  }

  toggleView() {
    const currentMode = this.renderer.viewMode || 'cinematic';
    const newMode = currentMode === 'grid' ? 'cinematic' : 'grid';
    this.renderer.setViewMode(newMode);
    this.draw();
  }
}

window.onload = () => {
  const canvas = document.getElementById('battlefield') as HTMLCanvasElement;
  const viewer = new ScenarioViewer(canvas);

  // Console logging to the UI
  const logDiv = document.getElementById('console') as HTMLDivElement;
  logDiv.style.whiteSpace = 'pre-wrap';
  logDiv.style.fontFamily = 'monospace';
  logDiv.style.color = 'white';
  logDiv.style.backgroundColor = 'black';
  logDiv.style.padding = '10px';
  logDiv.style.overflowY = 'auto';
  logDiv.style.maxHeight = '200px';
  logDiv.style.border = '1px solid #333';
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog(...args);
    logDiv.textContent += args.join(' ') + '\n\n';
    logDiv.scrollTop = logDiv.scrollHeight;
  };

  // Controls
  function handleSceneChange(e) {
    const selectedScene = e.target.value;
    if (!selectedScene) return;
    viewer.loadScene(selectedScene);
  }
  document.getElementById('scene-selector').addEventListener('change', (e) => {
    handleSceneChange(e);
  });

  document.getElementById('play-pause').addEventListener('click', () => {
    viewer.togglePlayPause();
  });

  document.getElementById('step').addEventListener('click', () => {
    viewer.step();
  });

  document.getElementById('restart').addEventListener('click', () => {
    viewer.restart();
  });

  document.getElementById('toggle-view').addEventListener('click', () => {
    viewer.toggleView();
  });

  // Audio controls
  document.getElementById('toggle-music').addEventListener('click', () => {
    viewer.musicEnabled = !viewer.musicEnabled;
    if (!viewer.musicEnabled) {
      viewer.jukebox.stopMusic();
      console.log('🔇 Music disabled');
    } else {
      console.log('🎵 Music enabled');
      // Reload current scene music if any
      const currentScene = (document.getElementById('scene-selector') as HTMLSelectElement).value;
      if (currentScene) {
        viewer.loadScene(currentScene);
      }
    }
  });

  document.getElementById('play-bird').addEventListener('click', () => {
    viewer.jukebox.playBirdSong();
    console.log('🐦 Bird song played');
  });

  document.getElementById('play-ambient').addEventListener('click', () => {
    viewer.jukebox.playForestAmbience();
    console.log('🌿 Forest ambient sound played');
  });

  document.getElementById('volume').addEventListener('input', (e) => {
    const volume = parseFloat((e.target as HTMLInputElement).value);
    // TODO: Implement volume control in jukebox
    console.log(`🔊 Volume set to ${Math.round(volume * 100)}%`);
  });

  console.log('Scene tester ready! Select a battle scenario to begin.');
  
  const initialScene = (document.getElementById('scene-selector') as HTMLSelectElement).value;
  console.log('Initial scene:', initialScene);
  if (initialScene) {
    (document.getElementById('scene-selector') as HTMLSelectElement).dispatchEvent(new Event('change'));
  }
}