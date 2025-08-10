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
    'toyforge', 'winter', 'mountain', 'lake', 'burning-city', 'monastery', 'desert'
  ];
  private weathers: string[] = ['clear', 'rain', 'winter', 'storm', 'sandstorm'];
  private viewModes: string[] = ['isometric', 'orthographic'];
  private currentBgIndex: number = 0;
  private currentWeatherIndex: number = 0;
  private currentViewIndex: number = 1;
  private isPlaying: boolean = true;
  private lastTime: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    // this.canvas.width = 640; // Set desired width
    // this.canvas.height = 400; // Set desired height
    // this.canvas.style.width = '640px'; // Set CSS width
    // this.canvas.style.height = '400px'; // Set CSS height

    this.ctx = this.canvas.getContext('2d')!;

    // Available backgrounds
    this.backgrounds = [
      'toyforge', 'winter', 'mountain', 'lake', 'burning-city', 'monastery', 'desert'
    ];

    // Available weather types
    this.weathers = [
      'clear', 'rain', 'winter', 'storm', 'sandstorm'
    ];

    // Available view modes
    this.viewModes = ['isometric', 'orthographic'];

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
    // this.sim.rulebook = [
    //   new CommandHandler(this.sim),
    //   new Abilities(this.sim),
    //   new EventHandler(this.sim),
    //   new WinterEffects(this.sim),
    //   new HugeUnits(this.sim),
    //   new SegmentedCreatures(this.sim),
    //   new GrapplingPhysics(this.sim),
    //   new DesertEffects(this.sim)
    // ];

    this.placeTestCreatures();
  }

  setupViews() {
    let sprites = Game.loadSprites();
    let backgrounds = Game.loadBackgrounds();
    this.views = {
      isometric: new Isometric(this.ctx, this.sim, 320, 200, sprites, backgrounds),
      orthographic: new Orthographic(this.ctx, this.sim, 320, 200, sprites, backgrounds)
    };
  }

  placeTestCreatures() {
    // Clear existing units
    this.sim.units = [];

    // Add a diverse set of creatures to test rendering
    // const testCreatures = [
    //   { type: 'grappler', pos: { x: 8, y: 6 } },
    //   { type: 'desert-megaworm', pos: { x: 12, y: 8 } },
    //   { type: 'mechatron', pos: { x: 16, y: 10 } },
    //   { type: 'clanker', pos: { x: 6, y: 12 } },
    //   { type: 'freezebot', pos: { x: 20, y: 14 } },
    //   { type: 'big-worm', pos: { x: 24, y: 6 } },
    //   { type: 'megasquirrel', pos: { x: 4, y: 16 } }
    // ];

    // testCreatures.forEach((creature, index) => {
    //   try {
    //     const unit = {
    //       ...Encyclopaedia.unit(creature.type),
    //       pos: creature.pos,
    //       id: `test_${creature.type}_${index}`
    //     };
    //     this.sim.addUnit(unit);
    //   } catch (error) {
    //     console.warn(`Failed to create ${creature.type}:`, error);
    //   }
    // });

    // // Run a few steps to set up segments and phantoms
    // for (let i = 0; i < 5; i++) {
    //   this.sim.step();
    // }
  }

  setupKeyboardControls() {
    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'ArrowLeft':
          this.currentBgIndex = (this.currentBgIndex - 1 + this.backgrounds.length) % this.backgrounds.length;
          this.updateDisplay();
          break;
        case 'ArrowRight':
          this.currentBgIndex = (this.currentBgIndex + 1) % this.backgrounds.length;
          this.updateDisplay();
          break;
        case 'ArrowUp':
          this.currentWeatherIndex = (this.currentWeatherIndex - 1 + this.weathers.length) % this.weathers.length;
          this.applyWeather();
          this.updateDisplay();
          break;
        case 'ArrowDown':
          this.currentWeatherIndex = (this.currentWeatherIndex + 1) % this.weathers.length;
          this.applyWeather();
          this.updateDisplay();
          break;
        case 'KeyV':
          this.currentViewIndex = (this.currentViewIndex + 1) % this.viewModes.length;
          this.updateDisplay();
          break;
        case 'Space':
          this.isPlaying = !this.isPlaying;
          event.preventDefault();
          break;
        case 'KeyR':
          this.resetScene();
          break;
      }
    });
  }

  applyWeather() {
    const weather = this.weathers[this.currentWeatherIndex];

    // Clear existing weather effects
    this.sim.particles = [];
    // this.sim.weatherActive = false;
    this.sim.lightningActive = false;

    switch (weather) {
      case 'rain':
        this.sim.queuedCommands = [{ type: 'weather', args: ['rain', '120', '0.8'] }];
        break;
      case 'winter':
        this.sim.queuedCommands = [{ type: 'weather', args: ['winter'] }];
        break;
      case 'storm':
        this.sim.queuedCommands = [
          { type: 'weather', args: ['rain', '120', '1.0'] },
          { type: 'lightning', args: ['16', '12'] }
        ];
        break;
      case 'sandstorm':
        this.sim.queuedCommands = [
          { type: 'temperature', args: ['35'] },
          { type: 'weather', args: ['sand', '200', '0.6'] }
        ];
        break;
      case 'clear':
        this.sim.queuedCommands = [{ type: 'weather', args: ['clear'] }];
        break;
    }

    // Process weather commands
    this.sim.step();
  }

  resetScene() {
    this.placeTestCreatures();
    this.applyWeather();
  }

  updateDisplay() {
    document.getElementById('bg-name').textContent = this.backgrounds[this.currentBgIndex];
    document.getElementById('weather-name').textContent = this.weathers[this.currentWeatherIndex];
    document.getElementById('view-name').textContent = this.viewModes[this.currentViewIndex];
  }

  updateWeatherInfo() {
    document.getElementById('particle-count').textContent = this.sim.particles.length;

    // Calculate average temperature and humidity
    let avgTemp = 20, avgHumidity = 0.5;
    if (this.sim.temperatureField) {
      let totalTemp = 0, totalHumidity = 0, count = 0;
      for (let x = 0; x < this.sim.fieldWidth; x++) {
        for (let y = 0; y < this.sim.fieldHeight; y++) {
          if (this.sim.temperatureField[x] && this.sim.temperatureField[x][y] !== undefined) {
            totalTemp += this.sim.temperatureField[x][y];
            count++;
          }
          if (this.sim.humidityField && this.sim.humidityField[x] && this.sim.humidityField[x][y] !== undefined) {
            totalHumidity += this.sim.humidityField[x][y];
          }
        }
      }
      if (count > 0) {
        avgTemp = Math.round(totalTemp / count);
        avgHumidity = Math.round((totalHumidity / count) * 100) / 100;
      }
    }

    document.getElementById('temperature').textContent = avgTemp;
    document.getElementById('humidity').textContent = avgHumidity;
    document.getElementById('wind').textContent = this.sim.lightningActive ? 'stormy' : 'calm';
  }

  gameLoop(currentTime = 0) {
    const deltaTime = currentTime - this.lastTime;

    if (this.isPlaying && deltaTime > 100) { // ~10 FPS for simulation
      this.sim.step();
      this.lastTime = currentTime;
    }

    // Render at full framerate
    this.render();
    this.updateWeatherInfo();

    requestAnimationFrame((time) => this.gameLoop(time));
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Set background
    const bgName = this.backgrounds[this.currentBgIndex];

    // Note: this is not how you set the background?
    this.sim.sceneBackground = bgName;

    // Render with current view mode
    const currentView = this.views[this.viewModes[this.currentViewIndex]];
    console.log(`Rendering view: ${this.viewModes[this.currentViewIndex]}`); // with background: ${bgName}`);
    // if (currentView && currentView.render) {
    //   currentView.render();
    // }

    currentView.show();

    // Draw UI overlay info
    // this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    // this.ctx.font = '14px monospace';
    // this.ctx.fillText(`Units: ${this.sim.units.length}`, this.canvas.width - 150, this.canvas.height - 60);
    // this.ctx.fillText(`Particles: ${this.sim.particles.length}`, this.canvas.width - 150, this.canvas.height - 40);
    // this.ctx.fillText(`Tick: ${this.sim.ticks}`, this.canvas.width - 150, this.canvas.height - 20);
  }
}

if (typeof document !== 'undefined') {
  // @ts-ignore
  window.WeatherViewer = SceneWeatherViewer;
  // Initialize the viewer when the page loads
  window.addEventListener('load', () => {
    new SceneWeatherViewer();
  });
}