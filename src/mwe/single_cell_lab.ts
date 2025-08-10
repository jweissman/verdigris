import { Game } from "../core/game";
import { Simulator } from "../simulator";
import Isometric from "../views/isometric";
import { createScaledRenderer } from "./scene_viewer";

/**
 * Single Cell Lab
 * Isolated test scene with exactly one cell in view
 * Perfect for testing:
 * - Ability targeting
 * - Cell effects
 * - Particle positioning
 * - Precise sprite rendering
 */
export default class SingleCellLab {
  private sim: Simulator;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private view: Isometric;
  private sprites: Map<string, HTMLImageElement>;
  private backgrounds: Map<string, HTMLImageElement>;
  
  // Lab controls
  private currentCell: { x: number, y: number } = { x: 0, y: 0 };
  private zoom: number = 8; // High zoom for single cell view
  private showGrid: boolean = true;
  private showParticles: boolean = true;
  private showEffects: boolean = true;
  private isPaused: boolean = false;
  
  // Test subjects
  private testUnit: any = null;
  private testEffect: string | null = null;
  private testParticles: any[] = [];
  
  constructor() {
    console.log('Initializing Single Cell Lab...');
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    // Small simulator - we only need a few cells
    this.sim = new Simulator(3, 3);
    
    // Load resources
    this.sprites = Game.loadSprites();
    this.backgrounds = Game.loadBackgrounds();
    
    // Create view
    this.view = new Isometric(this.ctx, this.sim, 320, 200, this.sprites, this.backgrounds);
    
    this.setupControls();
    this.setupTestEnvironment();
    this.gameLoop();
  }
  
  private setupControls() {
    document.addEventListener('keydown', (event) => {
      switch(event.key) {
        // Navigation
        case 'ArrowLeft':
          this.currentCell.x = Math.max(0, this.currentCell.x - 1);
          break;
        case 'ArrowRight':
          this.currentCell.x = Math.min(2, this.currentCell.x + 1);
          break;
        case 'ArrowUp':
          this.currentCell.y = Math.max(0, this.currentCell.y - 1);
          break;
        case 'ArrowDown':
          this.currentCell.y = Math.min(2, this.currentCell.y + 1);
          break;
          
        // Zoom
        case '+':
        case '=':
          this.zoom = Math.min(16, this.zoom + 1);
          break;
        case '-':
        case '_':
          this.zoom = Math.max(4, this.zoom - 1);
          break;
          
        // Toggle displays
        case 'g':
          this.showGrid = !this.showGrid;
          break;
        case 'p':
          this.showParticles = !this.showParticles;
          break;
        case 'e':
          this.showEffects = !this.showEffects;
          break;
        case ' ':
          this.isPaused = !this.isPaused;
          event.preventDefault();
          break;
          
        // Test triggers
        case '1':
          this.spawnTestUnit('soldier');
          break;
        case '2':
          this.spawnTestUnit('worm');
          break;
        case '3':
          this.spawnTestUnit('grappler');
          break;
        case '4':
          this.triggerCellEffect('fire');
          break;
        case '5':
          this.triggerCellEffect('explosion');
          break;
        case '6':
          this.triggerCellEffect('ice');
          break;
        case '7':
          this.spawnTestParticle('rain');
          break;
        case '8':
          this.spawnTestParticle('snow');
          break;
        case '9':
          this.spawnTestParticle('lightning');
          break;
        case '0':
          this.clearCell();
          break;
          
        // Ability test
        case 'a':
          this.testAbility();
          break;
      }
      
      this.updateDisplay();
    });
    
    // Mouse interaction
    this.canvas.addEventListener('click', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Convert to cell coordinates
      const cellX = Math.floor(x / (16 * this.zoom));
      const cellY = Math.floor(y / (16 * this.zoom));
      
      if (cellX >= 0 && cellX < 3 && cellY >= 0 && cellY < 3) {
        this.currentCell = { x: cellX, y: cellY };
        this.updateDisplay();
      }
    });
  }
  
  private setupTestEnvironment() {
    // Place center unit for reference
    this.sim.addUnit({
      id: 'center-marker',
      pos: { x: 1, y: 1 },
      intendedMove: { x: 0, y: 0 },
      team: 'neutral' as any,
      sprite: 'dot',
      state: 'idle' as any,
      hp: 1,
      maxHp: 1,
      abilities: {},
      tags: ['marker'],
      meta: {}
    });
    
    this.updateDisplay();
  }
  
  private spawnTestUnit(type: string) {
    // Remove existing test unit
    if (this.testUnit) {
      this.sim.units = this.sim.units.filter(u => u.id !== this.testUnit.id);
    }
    
    // Create new test unit at current cell
    this.testUnit = {
      id: `test-${type}-${Date.now()}`,
      pos: { x: this.currentCell.x, y: this.currentCell.y },
      intendedMove: { x: 0, y: 0 },
      team: 'friendly' as any,
      sprite: type,
      state: 'idle' as any,
      hp: 30,
      maxHp: 30,
      abilities: {},
      tags: [type],
      meta: {}
    };
    
    this.sim.addUnit(this.testUnit);
    console.log(`Spawned ${type} at cell (${this.currentCell.x}, ${this.currentCell.y})`);
  }
  
  private triggerCellEffect(effect: string) {
    this.testEffect = effect;
    
    // Add to sim's cell effects
    if (!this.sim.cellEffects) {
      this.sim.cellEffects = new Map();
    }
    
    const key = `${this.currentCell.x},${this.currentCell.y}`;
    this.sim.cellEffects.set(key, {
      type: effect,
      duration: 60,
      intensity: 1.0
    });
    
    console.log(`Triggered ${effect} effect at cell (${this.currentCell.x}, ${this.currentCell.y})`);
  }
  
  private spawnTestParticle(type: string) {
    const particle = {
      pos: { 
        x: this.currentCell.x * 8 + Math.random() * 8, 
        y: this.currentCell.y * 8 + Math.random() * 8 
      },
      vel: { x: 0, y: type === 'rain' ? 1 : 0.5 },
      radius: type === 'lightning' ? 3 : 1.5,
      color: type === 'rain' ? '#4444FF' : type === 'snow' ? '#FFFFFF' : '#FFFF00',
      lifetime: 100,
      z: type === 'lightning' ? 0 : 10,
      type: type
    };
    
    this.sim.particles.push(particle);
    this.testParticles.push(particle);
    
    console.log(`Spawned ${type} particle at cell (${this.currentCell.x}, ${this.currentCell.y})`);
  }
  
  private testAbility() {
    if (!this.testUnit) {
      console.log('No test unit to trigger ability');
      return;
    }
    
    // Trigger a simple ability
    console.log(`Testing ability for unit at (${this.testUnit.pos.x}, ${this.testUnit.pos.y})`);
    
    // Change to attack state briefly
    this.testUnit.state = 'attack';
    setTimeout(() => {
      if (this.testUnit) {
        this.testUnit.state = 'idle';
      }
    }, 500);
  }
  
  private clearCell() {
    // Remove test unit at current cell
    this.sim.units = this.sim.units.filter(u => 
      !(u.pos.x === this.currentCell.x && u.pos.y === this.currentCell.y)
    );
    
    // Clear cell effects
    const key = `${this.currentCell.x},${this.currentCell.y}`;
    if (this.sim.cellEffects) {
      this.sim.cellEffects.delete(key);
    }
    
    // Clear particles at this cell
    this.sim.particles = this.sim.particles.filter(p => {
      const cellX = Math.floor(p.pos.x / 8);
      const cellY = Math.floor(p.pos.y / 8);
      return !(cellX === this.currentCell.x && cellY === this.currentCell.y);
    });
    
    this.testUnit = null;
    this.testEffect = null;
    console.log(`Cleared cell (${this.currentCell.x}, ${this.currentCell.y})`);
  }
  
  private updateDisplay() {
    const info = document.getElementById('lab-info');
    if (info) {
      info.innerHTML = `
        <div>Cell: (${this.currentCell.x}, ${this.currentCell.y})</div>
        <div>Zoom: ${this.zoom}x</div>
        <div>Grid: ${this.showGrid ? 'ON' : 'OFF'}</div>
        <div>Particles: ${this.showParticles ? 'ON' : 'OFF'}</div>
        <div>Effects: ${this.showEffects ? 'ON' : 'OFF'}</div>
        <div>Unit: ${this.testUnit ? this.testUnit.sprite : 'none'}</div>
        <div>Effect: ${this.testEffect || 'none'}</div>
        <div>Particles: ${this.testParticles.length}</div>
      `;
    }
  }
  
  private gameLoop() {
    // Update simulation
    if (!this.isPaused) {
      this.sim.step();
      
      // Update particle lifetimes
      this.sim.particles = this.sim.particles.filter(p => {
        p.lifetime--;
        p.pos.x += p.vel.x;
        p.pos.y += p.vel.y;
        if (p.z !== undefined && p.z > 0) {
          p.z = Math.max(0, p.z - 0.5);
        }
        return p.lifetime > 0;
      });
      
      // Update cell effect durations
      if (this.sim.cellEffects) {
        for (const [key, effect] of this.sim.cellEffects.entries()) {
          effect.duration--;
          if (effect.duration <= 0) {
            this.sim.cellEffects.delete(key);
          }
        }
      }
    }
    
    // Render
    this.render();
    
    requestAnimationFrame(() => this.gameLoop());
  }
  
  private render() {
    // Clear canvas
    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Save context
    this.ctx.save();
    
    // Apply zoom and center on current cell
    this.ctx.scale(this.zoom, this.zoom);
    this.ctx.translate(
      -this.currentCell.x * 16 + (this.canvas.width / this.zoom - 16) / 2,
      -this.currentCell.y * 16 + (this.canvas.height / this.zoom - 16) / 2
    );
    
    // Draw grid
    if (this.showGrid) {
      this.drawGrid();
    }
    
    // Draw cell effects
    if (this.showEffects && this.sim.cellEffects) {
      this.drawCellEffects();
    }
    
    // Draw units
    this.drawUnits();
    
    // Draw particles
    if (this.showParticles) {
      this.drawParticles();
    }
    
    // Highlight current cell
    this.highlightCell(this.currentCell.x, this.currentCell.y);
    
    this.ctx.restore();
  }
  
  private drawGrid() {
    this.ctx.strokeStyle = '#444';
    this.ctx.lineWidth = 0.5;
    
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        this.ctx.strokeRect(x * 16, y * 16, 16, 16);
      }
    }
  }
  
  private drawCellEffects() {
    const cellEffectsSprite = this.sprites.get('cell-effects');
    if (!cellEffectsSprite) return;
    
    for (const [key, effect] of this.sim.cellEffects.entries()) {
      const [x, y] = key.split(',').map(Number);
      
      // Determine frame based on effect type
      let frame = 0;
      switch(effect.type) {
        case 'fire': frame = 4 + Math.floor(Math.random() * 7); break;
        case 'explosion': frame = 11 + Math.floor(Math.random() * 9); break;
        case 'ice': frame = 20; break;
      }
      
      const frameX = (frame % 4) * 16;
      const frameY = Math.floor(frame / 4) * 16;
      
      this.ctx.globalAlpha = Math.min(1, effect.duration / 30);
      this.ctx.drawImage(
        cellEffectsSprite,
        frameX, frameY, 16, 16,
        x * 16, y * 16, 16, 16
      );
      this.ctx.globalAlpha = 1;
    }
  }
  
  private drawUnits() {
    for (const unit of this.sim.units) {
      const sprite = this.sprites.get(unit.sprite);
      if (!sprite) continue;
      
      // Determine animation frame
      let frame = 0;
      if (unit.state === 'walk') frame = 1 + (this.sim.ticks % 2);
      if (unit.state === 'attack') frame = 3;
      
      const frameX = frame * 16;
      this.ctx.drawImage(
        sprite,
        frameX, 0, 16, 16,
        unit.pos.x * 16, unit.pos.y * 16, 16, 16
      );
    }
  }
  
  private drawParticles() {
    for (const particle of this.sim.particles) {
      const x = particle.pos.x * 2; // Convert from sim to pixel coords
      const y = particle.pos.y * 2;
      
      this.ctx.fillStyle = particle.color || '#FFF';
      this.ctx.globalAlpha = Math.min(1, particle.lifetime / 50);
      this.ctx.beginPath();
      this.ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }
  }
  
  private highlightCell(x: number, y: number) {
    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x * 16, y * 16, 16, 16);
  }
}

// Browser initialization
if (typeof document !== 'undefined') {
  (window as any).SingleCellLab = SingleCellLab;
  window.addEventListener('load', () => {
    new SingleCellLab();
  });
}