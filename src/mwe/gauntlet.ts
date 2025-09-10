import { Game } from "../core/game";

/**
 * Gauntlet MWE - An endless corridor with changing backgrounds
 * Tests transitioning between different scenes/areas
 */
export class GauntletGame extends Game {
  private currentZone = 0;
  private zoneWidth = 30; // Width of each zone
  private zones = [
    { name: "forest", bg: "forest", enemyTypes: ["goblin", "wolf"] },
    { name: "dungeon", bg: "dungeon", enemyTypes: ["skeleton", "zombie"] },
    { name: "ice", bg: "ice", enemyTypes: ["freezebot", "yeti"] },
    { name: "fire", bg: "lava", enemyTypes: ["imp", "demon"] },
    { name: "void", bg: "void", enemyTypes: ["wraith", "shadow"] },
  ];
  
  bootstrap() {
    super.bootstrap();
    
    // Start with a longer field for the gauntlet
    this.sim.fieldWidth = 120; // Extra wide for multiple zones
    this.sim.fieldHeight = 20;
    
    this.setupGauntlet();
    this.setupHero();
  }
  
  private setupGauntlet() {
    // Create each zone with enemies and obstacles
    this.zones.forEach((zone, zoneIndex) => {
      const startX = zoneIndex * this.zoneWidth;
      
      // Add enemies for this zone
      this.spawnZoneEnemies(zone, startX);
      
      // Add zone barriers/decorations
      this.addZoneDecorations(zone, startX);
      
      // Add zone transition markers
      if (zoneIndex < this.zones.length - 1) {
        this.addTransitionGate(startX + this.zoneWidth - 2);
      }
    });
    
    // Set initial background
    this.sim.sceneBackground = this.zones[0].bg;
  }
  
  private setupHero() {
    const hero = this.sim.addUnit({
      id: "hero",
      type: "hero",
      pos: { x: 2, y: 10 }, // Start at the left
      team: "friendly",
      hp: 100,
      maxHp: 100,
      dmg: 15,
      mass: 10,
      sprite: "hero",
      tags: ["hero"],
      abilities: ["strike", "dash", "groundPound", "blink"],
      meta: {
        controlled: true,
        useRig: true,
        facing: "right",
        primaryAbility: "strike",
      }
    });
  }
  
  private spawnZoneEnemies(zone: any, startX: number) {
    // Create waves of enemies in this zone
    const enemyCount = 3 + Math.floor(Math.random() * 3); // 3-5 enemies per zone
    
    for (let i = 0; i < enemyCount; i++) {
      const enemyType = zone.enemyTypes[Math.floor(Math.random() * zone.enemyTypes.length)];
      const x = startX + 5 + Math.floor(Math.random() * (this.zoneWidth - 10));
      const y = 5 + Math.floor(Math.random() * 10);
      
      // Check if this enemy type exists, otherwise use goblin
      const finalType = this.isValidEnemyType(enemyType) ? enemyType : "goblin";
      
      this.sim.addUnit({
        id: `${zone.name}_enemy_${i}`,
        type: finalType,
        pos: { x, y },
        team: "hostile",
        hp: 40 + this.currentZone * 10, // Enemies get stronger in later zones
        maxHp: 40 + this.currentZone * 10,
        dmg: 10 + this.currentZone * 2,
        sprite: finalType,
        tags: ["enemy", zone.name],
      });
    }
  }
  
  private isValidEnemyType(type: string): boolean {
    // List of enemy types we know exist
    const validTypes = ["goblin", "skeleton", "wolf", "zombie", "imp"];
    return validTypes.includes(type);
  }
  
  private addZoneDecorations(zone: any, startX: number) {
    // Add visual markers for zone boundaries
    for (let y = 0; y < this.sim.fieldHeight; y += 3) {
      // Left wall
      if (startX > 0) {
        this.sim.addUnit({
          id: `wall_${startX}_${y}`,
          type: "wall",
          pos: { x: startX, y },
          team: "neutral",
          hp: 1000,
          maxHp: 1000,
          sprite: "wall",
          tags: ["obstacle", "wall"],
          meta: {
            noMove: true,
            noTarget: true,
          }
        });
      }
    }
  }
  
  private addTransitionGate(x: number) {
    // Add a visual gate between zones
    this.sim.addUnit({
      id: `gate_${x}`,
      type: "gate",
      pos: { x, y: 10 },
      team: "neutral",
      hp: 1000,
      maxHp: 1000,
      sprite: "gate",
      tags: ["gate", "transition"],
      meta: {
        noMove: true,
        noTarget: true,
        isGate: true,
      }
    });
  }
  
  update() {
    super.update();
    
    // Check hero position and update zone/background
    const hero = this.sim.units.find(u => u.id === "hero");
    if (hero) {
      const newZone = Math.floor(hero.pos.x / this.zoneWidth);
      if (newZone !== this.currentZone && newZone < this.zones.length) {
        this.currentZone = newZone;
        const zone = this.zones[this.currentZone];
        
        // Change background
        this.sim.sceneBackground = zone.bg;
        
        // Add some zone transition effects
        this.createTransitionEffects(hero.pos);
        
        // Spawn additional enemies if zone is cleared
        this.checkAndRespawnEnemies(zone, newZone * this.zoneWidth);
      }
    }
  }
  
  private createTransitionEffects(pos: { x: number, y: number }) {
    // Create particle burst when entering new zone
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: pos.x * 8, y: pos.y * 8 },
            vel: { x: Math.cos(angle) * 2, y: Math.sin(angle) * 2 },
            radius: 2,
            color: "#FFFF00",
            lifetime: 30,
            type: "transition"
          }
        }
      });
    }
  }
  
  private checkAndRespawnEnemies(zone: any, startX: number) {
    // Check if all enemies in this zone are defeated
    const zoneEnemies = this.sim.units.filter(u => 
      u.tags?.includes("enemy") && u.tags?.includes(zone.name)
    );
    
    if (zoneEnemies.length === 0) {
      // Zone cleared! Spawn a reward or next wave
      this.spawnReward(startX + this.zoneWidth / 2, 10);
    }
  }
  
  private spawnReward(x: number, y: number) {
    // Spawn a health pickup or power-up
    this.sim.addUnit({
      id: `reward_${Date.now()}`,
      type: "healthpack",
      pos: { x, y },
      team: "neutral",
      hp: 1,
      maxHp: 1,
      sprite: "health",
      tags: ["pickup", "health"],
      meta: {
        healAmount: 25,
        noMove: true,
      }
    });
  }
}

// Browser setup
if (typeof window !== "undefined") {
  const canvas = document.getElementById("battlefield") as HTMLCanvasElement;
  if (canvas) {
    // @ts-ignore
    const game = (window.GauntletGame = new GauntletGame(canvas));
    game.bootstrap();
    
    // Enhanced controls for gauntlet
    const keys: Set<string> = new Set();
    
    document.addEventListener("keydown", (e) => {
      keys.add(e.key);
      
      const hero = game.sim.units.find(u => u.id === "hero");
      if (!hero) return;
      
      // Movement
      if (keys.has("w") || keys.has("ArrowUp")) {
        game.sim.queuedCommands.push({
          type: "move",
          unitId: "hero",
          params: { dx: 0, dy: -1 }
        });
      }
      if (keys.has("s") || keys.has("ArrowDown")) {
        game.sim.queuedCommands.push({
          type: "move",
          unitId: "hero",
          params: { dx: 0, dy: 1 }
        });
      }
      if (keys.has("a") || keys.has("ArrowLeft")) {
        game.sim.queuedCommands.push({
          type: "move",
          unitId: "hero",
          params: { dx: -1, dy: 0 }
        });
        hero.meta.facing = "left";
      }
      if (keys.has("d") || keys.has("ArrowRight")) {
        game.sim.queuedCommands.push({
          type: "move",
          unitId: "hero",
          params: { dx: 1, dy: 0 }
        });
        hero.meta.facing = "right";
      }
      
      // Abilities
      if (e.key === " ") {
        game.sim.queuedCommands.push({
          type: "strike",
          unitId: "hero",
          params: { direction: hero.meta?.facing || "right" }
        });
      }
      if (e.key === "Shift") {
        game.sim.queuedCommands.push({
          type: "dash",
          unitId: "hero",
          params: { direction: hero.meta?.facing || "right" }
        });
      }
      if (e.key === "e") {
        game.sim.queuedCommands.push({
          type: "groundPound",
          unitId: "hero",
          params: {}
        });
      }
    });
    
    document.addEventListener("keyup", (e) => {
      keys.delete(e.key);
    });
    
    // Camera follow hero
    const originalRender = game.renderer.render.bind(game.renderer);
    game.renderer.render = function() {
      const hero = game.sim.units.find(u => u.id === "hero");
      if (hero && this.ctx) {
        // Center camera on hero
        const screenCenterX = canvas.width / 2;
        const targetX = hero.pos.x * 16; // Approximate tile size
        const offsetX = screenCenterX - targetX;
        
        // Apply camera offset
        this.ctx.save();
        this.ctx.translate(Math.min(0, offsetX), 0);
      }
      
      originalRender();
      
      if (this.ctx) {
        this.ctx.restore();
      }
    };
    
    // Handle window resize
    window.addEventListener("resize", () => {
      if (game.handleResize) {
        game.handleResize();
      }
    });
    
    // Initial resize
    if (game.handleResize) {
      game.handleResize();
    }
  }
}