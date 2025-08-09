import { Game } from "../game";
import { createScaledRenderer } from "../renderer";
import { SceneLoader } from "../scene_loader";
import { Simulator } from "../simulator";


// const canvas = document.getElementById('battlefield');
// const sim = new Simulator(40, 25);
// const sceneLoader = new SceneLoader(sim);
// const sprites = Game.loadSprites();

// const { renderer, handleResize, draw } = createScaledRenderer(320, 200, canvas, sim, sprites);
// handleResize();

// // Console logging to the UI
// const logDiv = document.getElementById('console-log') as HTMLDivElement;
// logDiv.style.whiteSpace = 'pre-wrap';
// logDiv.style.fontFamily = 'monospace';
// logDiv.style.color = 'white';
// logDiv.style.backgroundColor = 'black';
// logDiv.style.padding = '10px';
// logDiv.style.overflowY = 'auto';
// logDiv.style.maxHeight = '200px';
// logDiv.style.border = '1px solid #333';
// const originalLog = console.log;
// console.log = (...args) => {
//   originalLog(...args);
//   logDiv.textContent += args.join(' ') + '\n\n';
//   logDiv.scrollTop = logDiv.scrollHeight;
// };

// let isPlaying = false;
// let gameLoop;

// function startGame() {
//   if (gameLoop) clearInterval(gameLoop);
//   gameLoop = setInterval(() => {
//     if (isPlaying) {
//       sim.step();
//       console.log(`Stepped to tick ${sim.ticks}`);
//     }
//     draw();
//   }, 100); // 10 FPS for easier observation
// }

// // Controls
// function handleSceneChange(e) {
//   const selectedScene = e.target.value;
//   if (!selectedScene) return;
  
//   try {
//     sceneLoader.loadScenario(selectedScene);
//     draw();
//   } catch (error) {
//     console.error('Failed to load scene:', error);
//   }
// };
// document.getElementById('scene-selector').addEventListener('change', async (e) => {
//   handleSceneChange(e);
// });

// document.getElementById('play-pause').addEventListener('click', () => {
//   isPlaying = !isPlaying;
//   console.log(isPlaying ? 'Playing...' : 'Paused');
// });

// document.getElementById('step').addEventListener('click', () => {
//   sim.step();
//   console.log(`Stepped to tick ${sim.ticks}`);
//   draw();
// });

// document.getElementById('restart').addEventListener('click', () => {
//   // const selector = document.getElementById('scene-selector');
//   // if (selector.value) {
//   //   selector.dispatchEvent(new Event('change'));
//   // }
//   // console.log('Restarted scene');
//   handleSceneChange({ target: document.getElementById('scene-selector') });
// });

// document.getElementById('toggle-view').addEventListener('click', () => {
//   const currentMode = renderer.viewMode || 'cinematic';
//   const newMode = currentMode === 'grid' ? 'cinematic' : 'grid';
//   renderer.setViewMode(newMode);
//   console.log(`Switched to ${newMode} view`);
//   draw();
// });

// // Start the rendering loop
// startGame();
// console.log('Scene tester ready! Select a battle scenario to begin.');
// // load the first scene if any
// // const initialScene = document.getElementById('scene-selector').value;
// // if (initialScene) {
// //   document.getElementById('scene-selector').dispatchEvent(new Event('change'));
// // }
// window.onload = () => {
//   const initialScene = document.getElementById('scene-selector').value;
//   console.log('Initial scene:', initialScene);
//   if (initialScene) {
//     document.getElementById('scene-selector').dispatchEvent(new Event('change'));
//   }
// };

// classically we could write

class ScenarioViewer {
  sim: Simulator;
  sceneLoader: SceneLoader;
  renderer;
  isPlaying: boolean = false;
  gameLoop;

  constructor(canvas: HTMLCanvasElement) {
    this.sim = new Simulator(40, 25);
    this.sceneLoader = new SceneLoader(this.sim);
    const sprites = Game.loadSprites();
    const backgrounds = Game.loadBackgrounds();
    const { renderer, handleResize, draw } = createScaledRenderer(320, 200, canvas, this.sim, sprites, backgrounds);
    this.renderer = renderer;
    handleResize();
    this.draw = draw;
    this.startGame();
  }

  startGame() {
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.gameLoop = setInterval(() => {
      if (this.isPlaying) {
        this.sim.step();
        console.log(`Stepped to tick ${this.sim.ticks}`);
      }
      this.draw();
    }, 100); // 10 FPS for easier observation
  }

  draw: () => void;

  loadScene(scenario: string) {
    try {
      this.sceneLoader.loadScenario(scenario);
      this.draw();
    } catch (error) {
      console.error('Failed to load scene:', error);
    }
  }

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    console.log(this.isPlaying ? 'Playing...' : 'Paused');
  }

  step() {
    this.sim.step();
    console.log(`Stepped to tick ${this.sim.ticks}`);
    this.draw();
  }

  restart() {
    const currentScenario = Object.keys(SceneLoader.scenarios)[0]; // or store the last loaded scenario
    if (currentScenario) {
      this.loadScene(currentScenario);
      console.log('Restarted scene');
    }
  }

  toggleView() {
    const currentMode = this.renderer.viewMode || 'cinematic';
    const newMode = currentMode === 'grid' ? 'cinematic' : 'grid';
    this.renderer.setViewMode(newMode);
    console.log(`Switched to ${newMode} view`);
    this.draw();
  }
}

window.onload = () => {
  const canvas = document.getElementById('battlefield') as HTMLCanvasElement;
  const viewer = new ScenarioViewer(canvas);

  // Console logging to the UI
  const logDiv = document.getElementById('console-log') as HTMLDivElement;
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

  console.log('Scene tester ready! Select a battle scenario to begin.');
  
  const initialScene = (document.getElementById('scene-selector') as HTMLSelectElement).value;
  console.log('Initial scene:', initialScene);
  if (initialScene) {
    (document.getElementById('scene-selector') as HTMLSelectElement).dispatchEvent(new Event('change'));
  }
}