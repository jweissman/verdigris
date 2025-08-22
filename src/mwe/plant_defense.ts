import { Game } from "../core/game";
import Input from "../core/input";

export class PlantDefenseGame extends Game {
  private farmerId: string = "player_farmer";
  private waveNumber: number = 0;
  private enemiesDefeated: number = 0;
  private bushesPlanted: number = 0;
  
  input: Input = new Input(this.sim, this.renderer);
  
  bootstrap() {
    super.bootstrap();
    
    // Set up a defensive scenario
    this.sim.fieldWidth = 30;
    this.sim.fieldHeight = 20;
    
    // Use top-down view for strategic placement
    this.renderer.setViewMode("top");
    
    // Create player farmer
    this.spawnFarmer();
    
    // Start first wave
    this.startWave();
    
    console.log('=== PLANT DEFENSE MWE ===');
    console.log('Use farmers to create defensive bush mazes!');
    console.log('');
    console.log('Controls:');
    console.log('  WASD - Move farmer');
    console.log('  SPACE - Plant bush');
    console.log('  R - Restart wave');
    console.log('  N - Next wave (after clearing)');
    console.log('');
    console.log('Strategy:');
    console.log('  - Bushes have 15 HP and block enemy movement');
    console.log('  - Create mazes to slow enemies');
    console.log('  - Protect your farmer and allies');
    console.log('  - Bushes only block enemies, not allies!');
  }
  
  private spawnFarmer() {
    const farmer = {
      id: this.farmerId,
      type: "farmer",
      pos: { x: 5, y: 10 },
      intendedMove: { x: 0, y: 0 },
      team: "friendly" as const,
      state: "idle" as const,
      sprite: "farmer",
      hp: 25,
      maxHp: 25,
      dmg: 3,
      mass: 1,
      abilities: ["plant"],
      tags: ["controlled", "farmer"],
      meta: {
        controlled: true,
        lastPlantTick: 0
      }
    };
    
    this.sim.addUnit(farmer);
    
    // Add some allied rangers
    for (let i = 0; i < 2; i++) {
      this.sim.addUnit({
        id: `ranger_${i}`,
        type: "ranger",
        pos: { x: 3, y: 8 + i * 4 },
        intendedMove: { x: 0, y: 0 },
        team: "friendly" as const,
        state: "idle" as const,
        sprite: "ranger",
        hp: 28,
        maxHp: 28,
        dmg: 4,
        mass: 1,
        abilities: ["ranged"],
        tags: ["ally", "ranger"]
      });
    }
  }
  
  private startWave() {
    this.waveNumber++;
    console.log(`\n🌊 WAVE ${this.waveNumber} STARTING!`);
    
    // Spawn enemies on the right side
    const enemyCount = 3 + this.waveNumber;
    const enemyTypes = this.waveNumber > 2 ? 
      ["soldier", "ranger", "bombardier"] : 
      ["soldier", "worm"];
    
    for (let i = 0; i < enemyCount; i++) {
      const enemyType = enemyTypes[i % enemyTypes.length];
      
      this.sim.addUnit({
        id: `enemy_${this.waveNumber}_${i}`,
        type: enemyType,
        pos: { 
          x: 25 + Math.floor(i / 3), 
          y: 5 + (i % 3) * 5 
        },
        intendedMove: { x: -0.5, y: 0 }, // Move left toward farmers
        team: "hostile" as const,
        state: "idle" as const,
        sprite: enemyType,
        hp: 20 + this.waveNumber * 5,
        maxHp: 20 + this.waveNumber * 5,
        dmg: 5 + this.waveNumber,
        mass: 1,
        abilities: enemyType === "ranger" ? ["ranged"] : [],
        tags: ["enemy", "wave_enemy"],
        meta: {
          waveNumber: this.waveNumber
        }
      });
    }
    
    console.log(`Spawned ${enemyCount} enemies!`);
  }
  
  private checkWaveComplete() {
    const enemies = this.sim.units.filter(u => 
      u.team === "hostile" && u.state !== "dead" && u.hp > 0
    );
    
    if (enemies.length === 0) {
      console.log(`\n✅ Wave ${this.waveNumber} cleared!`);
      console.log(`Enemies defeated: ${this.enemiesDefeated}`);
      console.log(`Bushes planted: ${this.bushesPlanted}`);
      console.log(`Press N for next wave`);
      return true;
    }
    
    return false;
  }
  
  private plantBush() {
    const farmer = this.sim.units.find(u => u.id === this.farmerId);
    if (!farmer) return;
    
    const currentTick = this.sim.ticks || 0;
    const lastPlant = farmer.meta?.lastPlantTick || 0;
    
    // Check cooldown (20 ticks)
    if (currentTick - lastPlant < 20) {
      console.log(`Plant on cooldown: ${20 - (currentTick - lastPlant)} ticks remaining`);
      return;
    }
    
    // Force plant ability
    this.sim.forceAbility(this.farmerId, 'plant', farmer.pos);
    
    // Update meta
    this.sim.queuedCommands.push({
      type: "meta",
      params: {
        unitId: this.farmerId,
        meta: {
          lastPlantTick: currentTick
        }
      }
    });
    
    this.bushesPlanted++;
    console.log(`🌳 Planted bush #${this.bushesPlanted}`);
  }
  
  getInputHandler(): (e: { key: string; type?: string }) => void {
    return (e) => {
      if (e.type !== 'keydown') return;
      
      const key = e.key.toLowerCase();
      const farmer = this.sim.units.find(u => u.id === this.farmerId);
      if (!farmer) return;
      
      switch(key) {
        case 'w':
        case 'arrowup':
          this.moveFarmer(0, -1);
          break;
        case 's':
        case 'arrowdown':
          this.moveFarmer(0, 1);
          break;
        case 'a':
        case 'arrowleft':
          this.moveFarmer(-1, 0);
          break;
        case 'd':
        case 'arrowright':
          this.moveFarmer(1, 0);
          break;
        case ' ':
          this.plantBush();
          break;
        case 'r':
          this.restartWave();
          break;
        case 'n':
          if (this.checkWaveComplete()) {
            this.startWave();
          }
          break;
      }
    };
  }
  
  private moveFarmer(dx: number, dy: number) {
    const farmer = this.sim.units.find(u => u.id === this.farmerId);
    if (!farmer) return;
    
    const newX = Math.max(0, Math.min(this.sim.fieldWidth - 1, farmer.pos.x + dx));
    const newY = Math.max(0, Math.min(this.sim.fieldHeight - 1, farmer.pos.y + dy));
    
    this.sim.queuedCommands.push({
      type: "move",
      unitId: this.farmerId,
      params: { x: newX, y: newY }
    });
  }
  
  private restartWave() {
    // Remove all enemies and bushes
    const toRemove = this.sim.units.filter(u => 
      u.team === "hostile" || u.type === "bush"
    );
    
    for (const unit of toRemove) {
      this.sim.queuedCommands.push({
        type: "remove",
        params: { unitId: unit.id }
      });
    }
    
    this.bushesPlanted = 0;
    this.enemiesDefeated = 0;
    
    console.log("\n🔄 Restarting wave...");
    this.startWave();
  }
  
  update() {
    super.update();
    
    // Track defeated enemies
    const deadEnemies = this.sim.units.filter(u => 
      u.team === "hostile" && u.state === "dead"
    );
    this.enemiesDefeated = deadEnemies.length;
    
    // Check for wave completion
    this.checkWaveComplete();
    
    // Check if farmer died
    const farmer = this.sim.units.find(u => u.id === this.farmerId);
    if (!farmer || farmer.state === "dead") {
      console.log("\n💀 GAME OVER - Farmer defeated!");
      console.log(`Reached wave ${this.waveNumber}`);
      console.log(`Total bushes planted: ${this.bushesPlanted}`);
    }
  }
  
  static boot(canvasId: string | HTMLCanvasElement = "battlefield") {
    let game: PlantDefenseGame | null = null;
    const canvas =
      canvasId instanceof HTMLCanvasElement
        ? canvasId
        : (document.getElementById(canvasId) as HTMLCanvasElement);
    if (canvas) {
      let addInputListener = (cb: (e: { key: string; type?: string }) => void) => {
        document.addEventListener("keydown", (e) => {
          cb({ key: e.key, type: 'keydown' });
        });
        document.addEventListener("keyup", (e) => {
          cb({ key: e.key, type: 'keyup' });
        });
      };

      game = new PlantDefenseGame(canvas, {
        addInputListener,
        animationFrame: (cb) => requestAnimationFrame(cb),
      });

      window.addEventListener("resize", () => {
        if (game && game.handleResize) {
          game.handleResize();
        }
      });

      if (game && game.handleResize) {
        game.handleResize();
      }

      game.bootstrap();
    } else {
      console.error(`Canvas element ${canvasId} not found!`);
    }
    
    function gameLoop() {
      if (game) {
        game.update();
      }
      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
  }
}

if (typeof window !== "undefined") {
  // @ts-ignore
  window.PlantDefenseGame = PlantDefenseGame;
  
  // Auto-boot when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PlantDefenseGame.boot());
  } else {
    PlantDefenseGame.boot();
  }
}