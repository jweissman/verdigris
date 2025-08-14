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
  currentMusic: string = '';
  currentScenario: string = ''; // Track the current scenario
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
      
      // Store the current scenario for restart
      this.currentScenario = scenario;
      
      this.sceneLoader.loadScenario(scenario);
      
      // Debug output for spawned creatures
      console.log(`=== Scene "${scenario}" loaded ===`);
      console.log(`Total units: ${this.sim.units.length}`);
      
      // Count by type
      const unitCounts = new Map<string, number>();
      this.sim.units.forEach(unit => {
        const type = unit.type || unit.sprite || 'unknown';
        unitCounts.set(type, (unitCounts.get(type) || 0) + 1);
      });
      
      console.log('Unit types spawned:');
      unitCounts.forEach((count, type) => {
        console.log(`  ${type}: ${count}`);
      });
      
      // Check for sprite mismatches
      const spriteMismatches = this.sim.units.filter(u => u.type && u.sprite && u.type !== u.sprite);
      if (spriteMismatches.length > 0) {
        console.log('Units with placeholder sprites:');
        spriteMismatches.forEach(u => {
          console.log(`  ${u.type} using sprite "${u.sprite}"`);
        });
      }
      
      this.draw();
      
      // Don't auto-start music, let user control it via selector
      // Scene metadata can override with 'play' command
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
    if (this.currentScenario) {
      this.loadScene(this.currentScenario);
    } else {
      // Fallback to first scenario if none loaded yet
      const firstScenario = Object.keys(SceneLoader.scenarios)[0];
      if (firstScenario) {
        this.loadScene(firstScenario);
      }
    }
  }

  toggleView() {
    const currentMode = this.renderer.viewMode || 'cinematic';
    let newMode: 'grid' | 'cinematic' | 'iso';
    
    // Cycle through: cinematic -> iso -> grid -> cinematic
    switch(currentMode) {
      case 'cinematic':
        newMode = 'iso';
        break;
      case 'iso':
        newMode = 'grid';
        break;
      case 'grid':
        newMode = 'cinematic';
        break;
      default:
        newMode = 'cinematic';
    }
    
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

  // Music controls
  const musicSelector = document.getElementById('music-selector') as HTMLSelectElement;
  musicSelector.addEventListener('change', (e) => {
    const selectedMusic = (e.target as HTMLSelectElement).value;
    viewer.jukebox.stopMusic();
    if (selectedMusic) {
      viewer.currentMusic = selectedMusic;
      viewer.jukebox.playProgression(selectedMusic, true);
      console.log(`🎵 Playing: ${selectedMusic}`);
    } else {
      viewer.currentMusic = '';
      console.log('🔇 Music stopped');
    }
  });
  
  document.getElementById('toggle-music').addEventListener('click', () => {
    viewer.musicEnabled = !viewer.musicEnabled;
    if (!viewer.musicEnabled) {
      viewer.jukebox.stopMusic();
      console.log('⏸️ Music paused');
    } else if (viewer.currentMusic) {
      viewer.jukebox.playProgression(viewer.currentMusic, true);
      console.log('▶️ Music resumed');
    }
  });

  document.getElementById('next-music').addEventListener('click', () => {
    const progressions = viewer.jukebox.getAvailableProgressions();
    const currentIndex = progressions.indexOf(viewer.currentMusic);
    const nextIndex = (currentIndex + 1) % progressions.length;
    const nextMusic = progressions[nextIndex];
    musicSelector.value = nextMusic;
    musicSelector.dispatchEvent(new Event('change'));
  });

  console.log('Scene tester ready! Select a battle scenario to begin.');
  
  const initialScene = (document.getElementById('scene-selector') as HTMLSelectElement).value;
  console.log('Initial scene:', initialScene);
  if (initialScene) {
    (document.getElementById('scene-selector') as HTMLSelectElement).dispatchEvent(new Event('change'));
  }
}