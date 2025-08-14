import { Simulator } from '../core/simulator';
import { SceneLoader } from '../core/scene_loader';
import { Game } from '../core/game';
import { createScaledRenderer } from '../render/scaled_renderer';

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
    { text: 'Start Game', hotkey: 'S', action: () => this.startGame() },
    { text: 'Hero Showcase', hotkey: 'H', action: () => this.showHeroes() },
    { text: 'Desert Battle', hotkey: 'D', action: () => this.showDesert() },
    { text: 'Toymaker Challenge', hotkey: 'T', action: () => this.showToymaker() },
    { text: 'Settings', hotkey: 'E', action: () => this.showSettings() },
    { text: 'Quit', hotkey: 'Q', action: () => this.quit() }
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    // Create background simulation
    this.sim = new Simulator(40, 20);
    this.sceneLoader = new SceneLoader(this.sim);
    
    // Load peaceful title background scene
    this.sceneLoader.loadScenario('titleBackground');
    
    // Create renderer for background
    const sprites = Game.loadSprites();
    const backgrounds = Game.loadBackgrounds();
    this.renderer = createScaledRenderer(320, 200, canvas, this.sim, sprites, backgrounds);
    
    this.setupEventHandlers();
    this.startAnimationLoop();
  }

  private setupEventHandlers(): void {
    document.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      switch (e.key) {
        case 'ArrowUp':
          this.selectedOption = Math.max(0, this.selectedOption - 1);
          break;
        case 'ArrowDown':
          this.selectedOption = Math.min(this.menuOptions.length - 1, this.selectedOption + 1);
          break;
        case 'Enter':
          this.menuOptions[this.selectedOption].action();
          break;
        default:
          // Check hotkeys
          const option = this.menuOptions.find(opt => 
            opt.hotkey?.toLowerCase() === e.key.toLowerCase()
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
      
      // Update background simulation
      this.sim.step();
      
      // Render background
      this.renderer.render();
      
      // Render title screen UI overlay
      this.renderTitleUI();
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }

  private renderTitleUI(): void {
    const canvas = this.canvas;
    const ctx = this.ctx;
    
    // Title screen overlay with transparency
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Game title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERDIGRIS', canvas.width / 2, 100);
    
    // Subtitle
    ctx.fillStyle = '#87CEEB';
    ctx.font = '16px serif';
    ctx.fillText('Tactical Battle Simulation', canvas.width / 2, 130);
    
    // Menu options
    this.menuOptions.forEach((option, index) => {
      const y = 200 + index * 40;
      const isSelected = index === this.selectedOption;
      
      // Highlight selected option
      if (isSelected) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.fillRect(canvas.width / 2 - 150, y - 20, 300, 35);
      }
      
      // Option text
      ctx.fillStyle = isSelected ? '#FFD700' : '#FFFFFF';
      ctx.font = isSelected ? 'bold 24px serif' : '20px serif';
      ctx.textAlign = 'center';
      ctx.fillText(option.text, canvas.width / 2, y);
      
      // Hotkey hint
      if (option.hotkey) {
        ctx.fillStyle = '#87CEEB';
        ctx.font = '14px serif';
        ctx.textAlign = 'left';
        ctx.fillText(`[${option.hotkey}]`, canvas.width / 2 + 120, y);
      }
    });
    
    // Instructions
    ctx.fillStyle = '#CCCCCC';
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillText('Use arrow keys or hotkeys to navigate, Enter to select', canvas.width / 2, canvas.height - 30);
    
    // Stats overlay (show background sim activity)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 200, 80);
    
    ctx.fillStyle = '#90EE90';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Background Simulation:`, 15, 25);
    ctx.fillText(`Ticks: ${this.sim.ticks}`, 15, 40);
    ctx.fillText(`Units: ${this.sim.units.length}`, 15, 55);
    ctx.fillText(`Weather: ${(this.sim as any).currentWeather || 'clear'}`, 15, 70);
  }

  private startGame(): void {
    console.log('🎮 Starting main game...');
    this.transitionToScene('simple');
  }

  private showHeroes(): void {
    console.log('🦸 Showing hero showcase...');
    this.transitionToScene('heroShowcase');
  }

  private showDesert(): void {
    console.log('🏜️ Loading desert battle...');
    this.transitionToScene('desert');
  }

  private showToymaker(): void {
    console.log('🤖 Loading toymaker challenge...');
    this.transitionToScene('toymakerBalanced');
  }

  private showSettings(): void {
    console.log('⚙️ Opening settings...');
    // Could transition to settings screen
    alert('Settings screen would open here');
  }

  private quit(): void {
    console.log('👋 Goodbye!');
    this.isActive = false;
    // Could trigger application exit
    alert('Game would quit here');
  }

  private transitionToScene(sceneName: string): void {
    console.log(`🎬 Transitioning to scene: ${sceneName}`);
    
    // Fade out title screen
    this.isActive = false;
    
    // Load new scene
    this.sceneLoader.loadScenario(sceneName);
    
    // Here you would transition to the main game renderer
    // For now, just reload the title with new scene
    setTimeout(() => {
      this.isActive = true;
      this.startAnimationLoop();
    }, 1000);
  }

  public destroy(): void {
    this.isActive = false;
  }
}

// Initialize title screen when DOM is ready
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (canvas) {
      new TitleScreen(canvas);
    }
  });
}