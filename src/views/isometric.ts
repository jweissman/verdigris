import { Projectile, Unit } from "../sim/types";
import View from "./view";
// Temporarily removed TextRenderer until MWE is working

export default class Isometric extends View {
  // private textRenderer: TextRenderer;
  
  constructor(
    ctx: CanvasRenderingContext2D,
    sim: any,
    width: number,
    height: number,
    sprites: Map<string, HTMLImageElement>,
    backgrounds: Map<string, HTMLImageElement> = new Map()
  ) {
    super(ctx, sim, width, height, sprites, backgrounds);
    // this.textRenderer = new TextRenderer();
    // this.textRenderer.setContext(ctx);
  }
  
  show() {
    this.updateMovementInterpolations();
    this.updateProjectileInterpolations();

    // Draw background from cinematic view
    this.renderBackground();
    
    // Draw cell effects layer (fire, ice, etc)
    this.renderCellEffects();
    
    // Draw grid dots from battle view
    this.ctx.save();
    this.ctx.globalAlpha = 0.3; // Slightly more visible
    this.grid();
    this.ctx.restore();
    
    // Sort units by y position for proper layering (from cinematic view)
    const sortedUnits = [...this.sim.units].sort((a, b) => b.pos.y - a.pos.y > 0 ? 1 : -1);

    // Draw units normally (from battle view)
    for (const unit of sortedUnits) {
      this.showUnit(unit);
    }
    
    // Draw speech bubbles for units
    this.renderSpeechBubbles();
    
    // Draw projectiles (from battle view)
    for (const projectile of this.sim.projectiles) {
      this.showProjectile(projectile);
    }

    // Draw grappling lines
    this.renderGrapplingLines();

    // Draw particles (lightning, weather effects, etc.)
    this.renderParticles();

    // Render overlays (from battle view)
    this.renderOverlays();
  }

  private renderBackground() {
    const sceneBackground = this.sim.sceneBackground;
    
    if (sceneBackground) {
      this.renderSceneBackground(sceneBackground);
    }
  }
  
  private renderSceneBackground(backgroundType: string) {
    this.ctx.save();
    
    const backgroundImage = this.backgrounds.get(backgroundType);
    if (backgroundImage) {
      const scaleX = this.ctx.canvas.width / backgroundImage.width;
      const scaleY = this.ctx.canvas.height / backgroundImage.height;
      const scale = Math.max(scaleX, scaleY);
      
      const scaledWidth = backgroundImage.width * scale;
      const scaledHeight = backgroundImage.height * scale;
      const offsetX = (this.ctx.canvas.width - scaledWidth) / 2;
      const offsetY = (this.ctx.canvas.height - scaledHeight) / 2;
      
      this.ctx.drawImage(backgroundImage, offsetX, offsetY, scaledWidth, scaledHeight);
    } else {
      console.warn(`No background image found for type: ${backgroundType}`);
    }
    
    this.ctx.restore();
  }
  
  // Configurable coordinate offsets - can be adjusted for different canvas sizes
  protected baseOffsetX: number = -20;  // Default for battle scenes
  protected baseOffsetY: number = 125;  // Default for battle scenes (battlestrip area)
  
  private getBattleStripOffsets(): { x: number, y: number } {
    // Check for explicit strip width metadata
    const stripWidth = (this.sim as any).stripWidth;
    if (stripWidth === 'wide') {
      return { x: -40, y: 100 };
    } else if (stripWidth === 'narrow') {
      return { x: 0, y: 145 };
    }
    
    // Default positioning based on background
    const bg = this.sim.sceneBackground || (this.sim as any).background;
    
    switch(bg) {
      case 'mountain':
      case 'winter':
        // Narrow battle strip for mountain/cliff scenes
        return { x: -20, y: 140 };
        
      case 'desert':
      case 'lake':
      case 'forest':
        // Wide open battlefield
        return { x: -20, y: 110 };
        
      case 'toyforge':
      case 'monastery':
        // Indoor/structured scenes
        return { x: -20, y: 130 };
        
      case 'burning-city':
        // Chaotic urban environment
        return { x: -20, y: 120 };
        
      default:
        return { x: this.baseOffsetX, y: this.baseOffsetY };
    }
  }
  
  protected toIsometric(x: number, y: number): { x: number; y: number } {
    const tileWidth = 16;
    const rowOffset = 8; // Pixels to offset each row for pseudo-isometric depth
    
    const offsets = this.getBattleStripOffsets();
    
    // Check for battlefield height compression
    const battleHeight = (this.sim as any).battleHeight;
    let verticalSpacing = 3; // Default vertical spacing between rows
    
    if (battleHeight === 'compressed') {
      verticalSpacing = 2; // Tighter vertical spacing
    } else if (battleHeight === 'half') {
      verticalSpacing = 1.5; // Very tight for maps with limited vertical space
    }
    
    // Simple orthogonal grid with row staggering for depth illusion
    const screenX = x * tileWidth + (y * rowOffset) + offsets.x;
    const screenY = (y * verticalSpacing) + offsets.y;
    
    return { x: screenX, y: screenY };
  }

  private grid() {
    const cellEffectsSprite = this.sprites.get('cell-effects');
    if (!cellEffectsSprite) return;
    
    // Draw white cell sprite for each grid position as the base
    for (let x = 0; x < this.sim.fieldWidth; x++) {
      for (let y = 0; y < this.sim.fieldHeight; y++) {
        const { x: screenX, y: screenY } = this.toIsometric(x, y);
        
        // Draw white cell (frame 0) as the base grid
        this.ctx.drawImage(
          cellEffectsSprite,
          0, 0, 16, 16,  // Frame 0 is the white cell
          screenX - 8, screenY - 8, 16, 16
        );
      }
    }
  }

  private showUnit(unit: Unit) {
    if (unit.meta.phantom) {
      return;
    }

    // Removed debug logging - coordinate issue resolved

    const recentDamage = this.sim.processedEvents.find(event => 
      event.kind === 'damage' && 
      event.target === unit.id && 
      event.tick && 
      (this.sim.ticks - event.tick) < 2
    );
    
    if (recentDamage && Math.floor(this.animationTime / 100) % 2 === 0) {
      return;
    }

    let renderX = unit.pos.x;
    let renderY = unit.pos.y;
    let renderZ = unit.meta?.z || 0;
      
    const interp = this.unitInterpolations.get(unit.id);
    if (interp) {
      const easeProgress = this.easeInOutQuad(interp.progress);
      renderX = interp.startX + (interp.targetX - interp.startX) * easeProgress;
      renderY = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      renderZ = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
    }
      
    const isHuge = unit.meta.huge;
    let spriteWidth = 16;
    let spriteHeight = 16;
    
    if (isHuge) {
      spriteWidth = unit.meta.width || 64;
      spriteHeight = unit.meta.height || 32;
    }
    
    const { x: screenX, y: screenY } = this.toIsometric(renderX, renderY);
    
    // Add coordinate logging for small canvas debugging
    // if (isSmallCanvas) {
    //   console.log(`      📍 toIsometric(${renderX}, ${renderY}) -> screen(${screenX}, ${screenY})`);
    // }
    
    const pixelX = screenX - spriteWidth / 2;
    const pixelY = screenY - spriteHeight / 2; // Center vertically instead of bottom-align

    let realPixelY = pixelY;
      
    const sprite = this.sprites.get(unit.sprite);
    if (sprite) {
      let frameIndex = 0;
        
      // Check if unit recently dealt damage (show attack frame)
      const recentAttack = this.sim.processedEvents.find((event: any) => 
        event.kind === 'damage' && 
        event.source === unit.id && 
        event.tick && 
        (this.sim.ticks - event.tick) < 1 // Only show attack frame for 1 tick
      );
      
      if (unit.state === 'dead') {
        frameIndex = 3; // Frame 3 for dead/stunned
      } else if (recentAttack || unit.state === 'attack') {
        frameIndex = 3; // Frame 3 is the attack frame
      } else if (unit.state === 'walk') {
        frameIndex = 1 + Math.floor((this.animationTime / 400) % 2); // Frames 1-2 for walking
      } else {
        frameIndex = 0; // Frame 0 for idle
      }
        
      // Check if sprite has multiple frames or is single-frame
      const expectedSpriteWidth = spriteWidth * 4; // 4 frames expected
      const actualSpriteWidth = sprite.width;
      const frameX = (actualSpriteWidth >= expectedSpriteWidth) ? frameIndex * spriteWidth : 0;

      if (renderZ > 0) {
        realPixelY -= renderZ * 8;
      }

      realPixelY = Math.round(realPixelY);
      
      this.ctx.save();
      this.ctx.fillStyle = '#00000005';
      this.ctx.beginPath();
      const shadowWidth = spriteWidth * 0.8;
      const shadowHeight = shadowWidth / 2;
      this.ctx.ellipse(screenX, screenY, shadowWidth, shadowHeight, 0, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.restore();

      this.ctx.save();
      const facing = unit.meta.facing || 'right';
      const shouldFlip = facing === 'left';
      
      if (shouldFlip) {
        this.ctx.scale(-1, 1);
        this.ctx.translate(-screenX * 2, 0);
      }
      
      this.ctx.drawImage(
        sprite,
        frameX, 0, spriteWidth, spriteHeight,
        pixelX, realPixelY, spriteWidth, spriteHeight
      );
      
      this.ctx.restore();
    } else {

      this.ctx.fillStyle = unit.sprite === "worm" ? "green" : "blue";
      this.ctx.fillRect(pixelX, realPixelY, 8, 8);
    }
      
    if (typeof unit.hp === 'number') {
      const maxHp = unit.maxHp || 100;
      const hpRatio = Math.max(0, Math.min(1, unit.hp / maxHp));
      this.drawBar("hit points", pixelX, realPixelY - 4, spriteWidth, 2, hpRatio);
    }

    if (unit.abilities && unit.abilities.jumps) {
      const ability = unit.abilities.jumps;
      const duration = ability.config?.jumpDuration || 10;
      const progress = unit.meta.jumpProgress || 0;
      const progressRatio = (progress / duration) || 0;
      if (progressRatio > 0 && progressRatio < 1) {
        this.drawBar("jump progress", pixelX, realPixelY - 6, spriteWidth, 2, progressRatio, '#ace');
      }
    }
  }

  private drawBar(_label: string, pixelX: number, pixelY: number, width: number, height: number, ratio: number, colorOverride?: string) {
    const barWidth = width;
    const barHeight = height;
    const barX = pixelX;
    const barY = pixelY - 4;
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    this.ctx.fillStyle = ratio > 0.5 ? '#0f0' : ratio > 0.2 ? '#ff0' : '#f00';
    if (colorOverride) {
      this.ctx.fillStyle = colorOverride;
    }
    this.ctx.fillRect(barX, barY, Math.round(barWidth * ratio), barHeight);
  }

  private showProjectile(projectile: any) {
    let renderX = projectile.pos.x;
    let renderY = projectile.pos.y;
    let renderZ = projectile.z || 0;
    
    const interp = this.projectileInterpolations.get(projectile.id);
    if (interp) {
      const easeProgress = projectile.type === 'bomb' ? 
        this.easeInOutQuad(interp.progress) :
        interp.progress;
      
      renderX = interp.startX + (interp.targetX - interp.startX) * easeProgress;
      renderY = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      renderZ = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
    }
    
    const { x: screenX, y: screenY } = this.toIsometric(renderX, renderY);
    
    let adjustedScreenY = screenY;
    if (renderZ > 0) {
      adjustedScreenY -= renderZ * 8;
    }
    
    this.ctx.save();
    
    if (projectile.type === 'bomb') {
      if (projectile.origin && projectile.target && projectile.progress && projectile.duration) {
        this.drawBombArcTrail(projectile);
      }
      
      this.ctx.fillStyle = '#000';
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(screenX, adjustedScreenY, (projectile.radius || 2) * 1.2, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
      
      if (renderZ > 0) {
        this.ctx.fillStyle = '#00000040';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, (projectile.radius || 2) * 0.8, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    } else {
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.arc(screenX, adjustedScreenY, projectile.radius || 0.5, 0, 2 * Math.PI);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private easeInOutQuad(t: number): number {
    return t < 0.3 ? 4 * t * t : 0.36 + 0.64 * (t - 0.3) / 0.7;
  }

  private drawBombArcTrail(projectile: Projectile) {
    let { origin, target, progress, duration } = projectile;
    if (!origin || !target || progress === undefined || duration === undefined) {
      return;
    }
    
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const baseHeight = 12;
    const distanceMultiplier = Math.min(2, distance / 5);
    const height = baseHeight * distanceMultiplier;
    
    this.ctx.save();
    this.ctx.fillStyle = '#666';
    this.ctx.globalAlpha = 0.4;
    
    const numPoints = Math.max(8, Math.floor(distance * 2));
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const x = origin.x + (target.x - origin.x) * t;
      const y = origin.y + (target.y - origin.y) * t;
      const z = height * Math.sin(Math.PI * t);
      
      const isoPos = this.toIsometric(x, y);
      const arcY = isoPos.y - z * 8;
      
      this.ctx.beginPath();
      this.ctx.arc(isoPos.x, arcY, 1, 0, 2 * Math.PI);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private renderSpeechBubbles() {
    // if (!this.textRenderer.fontsReady) return;
    return; // Disabled until text renderer is fixed
    
    for (const unit of this.sim.units) {
      let bubbleText: string | null = null;
      
      // Check for various conditions that trigger speech
      
      // Burrow event (desert worm)
      if (unit.meta.burrowing && unit.meta.burrowProgress === 0) {
        bubbleText = "WORMSIGN";
      }
      
      // Taking heavy damage
      const recentDamage = this.sim.processedEvents.find((event: any) => 
        event.kind === 'damage' && 
        event.target === unit.id && 
        event.tick && 
        (this.sim.ticks - event.tick) < 2 &&
        event.meta?.amount > 10
      );
      if (recentDamage) {
        bubbleText = "OOF!";
      }
      
      // Healing
      const recentHeal = this.sim.processedEvents.find((event: any) => 
        event.kind === 'heal' && 
        event.target === unit.id && 
        event.tick && 
        (this.sim.ticks - event.tick) < 2
      );
      if (recentHeal) {
        bubbleText = "THANKS!";
      }
      
      // Grappled
      if (unit.meta.grappled && !unit.meta.speechShown) {
        bubbleText = "HEY!";
        unit.meta.speechShown = true;
      }
      
      // Frozen
      if (unit.meta.frozen && !unit.meta.frozenSpeechShown) {
        bubbleText = "BRRR!";
        unit.meta.frozenSpeechShown = true;
      }
      
      // On fire
      if (unit.meta.onFire && !unit.meta.fireSpeechShown) {
        bubbleText = "HOT!";
        unit.meta.fireSpeechShown = true;
      }
      
      // Draw the bubble if we have text
      if (bubbleText) {
        const pos = this.toIsometric(unit.pos.x, unit.pos.y);
        this.textRenderer.drawBubble(
          bubbleText,
          pos.x,
          pos.y - 20,
          { type: 'speech' },
          'tiny'
        );
      }
      
      // Draw damage numbers
      const damageEvent = this.sim.processedEvents.find((event: any) => 
        event.kind === 'damage' && 
        event.target === unit.id && 
        event.tick && 
        (this.sim.ticks - event.tick) < 10
      );
      
      if (damageEvent && damageEvent.meta?.amount && damageEvent.tick) {
        const pos = this.toIsometric(unit.pos.x, unit.pos.y);
        const floatOffset = (10 - (this.sim.ticks - damageEvent.tick)) * 2;
        this.textRenderer.drawDamageNumber(
          damageEvent.meta.amount,
          pos.x - 8,
          pos.y - 10 - floatOffset,
          '#FF0000'
        );
      }
    }
  }
  
  private renderOverlays() {
    for (const unit of this.sim.units) {
      if (unit.state === 'dead') continue;
      
      this.renderMovementIntention(unit);
      this.renderJumpTarget(unit);
      this.renderTossTarget(unit);
    }
    
    this.renderAoEEffects();
  }

  private renderMovementIntention(unit: Unit) {
    if (!unit.intendedMove || (unit.intendedMove.x === 0 && unit.intendedMove.y === 0)) {
      return;
    }

    const { x: unitScreenX, y: unitScreenY } = this.toIsometric(unit.pos.x, unit.pos.y);
    const targetPos = { x: unit.pos.x + unit.intendedMove.x, y: unit.pos.y + unit.intendedMove.y };
    const { x: targetScreenX, y: targetScreenY } = this.toIsometric(targetPos.x, targetPos.y);
    
    this.ctx.save();
    this.ctx.strokeStyle = unit.team === 'friendly' ? '#00ff00' : '#ff4444';
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.8;
    
    this.ctx.beginPath();
    this.ctx.moveTo(unitScreenX, unitScreenY - 16);
    this.ctx.lineTo(targetScreenX, targetScreenY - 16);
    this.ctx.stroke();
    
    const angle = Math.atan2(targetScreenY - unitScreenY, targetScreenX - unitScreenX);
    const headLength = 6;
    
    this.ctx.beginPath();
    this.ctx.moveTo(targetScreenX, targetScreenY - 16);
    this.ctx.lineTo(
      targetScreenX - headLength * Math.cos(angle - Math.PI / 6),
      targetScreenY - 16 - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(targetScreenX, targetScreenY - 16);
    this.ctx.lineTo(
      targetScreenX - headLength * Math.cos(angle + Math.PI / 6),
      targetScreenY - 16 - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private renderJumpTarget(unit: Unit) {
    if (!unit.meta?.jumping || !unit.meta?.jumpTarget) {
      return;
    }

    const { x: screenX, y: screenY } = this.toIsometric(unit.meta.jumpTarget.x, unit.meta.jumpTarget.y);
    
    this.ctx.save();
    this.ctx.fillStyle = '#4444ff';
    this.ctx.globalAlpha = 0.4;
    this.ctx.beginPath();
    this.ctx.ellipse(screenX, screenY, 8, 4, 0, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.restore();
  }

  private renderTossTarget(unit: Unit) {
    if (!unit.meta?.tossing || !unit.meta?.tossTarget) {
      return;
    }

    const { x: screenX, y: screenY } = this.toIsometric(unit.meta.tossTarget.x, unit.meta.tossTarget.y);
    
    this.ctx.save();
    this.ctx.fillStyle = '#8844ff';
    this.ctx.globalAlpha = 0.5;
    this.ctx.beginPath();
    this.ctx.ellipse(screenX, screenY, 8, 4, 0, 0, 2 * Math.PI);
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#ff44aa';
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.7;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderAoEEffects() {
    const recentAoEEvents = this.sim.processedEvents.filter(event => 
      event.kind === 'aoe' && 
      event.tick && 
      (this.sim.ticks - event.tick) < 10
    );

    for (const event of recentAoEEvents) {
      if (typeof event.target !== 'object' || !('x' in event.target)) continue;
      
      const pos = event.target as {x: number, y: number};
      const radius = event.meta.radius || 3;
      const age = event.tick ? (this.sim.ticks - event.tick) : 0;
      const maxAge = 10;
      
      const alpha = Math.max(0, 1 - (age / maxAge));
      
      const centerScreen = this.toIsometric(pos.x, pos.y);
      
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.4;
      this.ctx.fillStyle = '#ffaa00';
      
      const pixelRadiusX = radius * 8;
      const pixelRadiusY = radius * 4;

      this.ctx.beginPath();
      this.ctx.ellipse(centerScreen.x, centerScreen.y, pixelRadiusX, pixelRadiusY, 0, 0, 2 * Math.PI);
      this.ctx.fill();
      
      this.ctx.restore();
    }
  }

  private renderCellEffects() {
    const cellEffectsSprite = this.sprites.get('cell-effects');
    if (!cellEffectsSprite) return;

    // Track which cells have effects (priority system - only one effect per cell)
    const cellEffects = new Map<string, { type: string, priority: number }>();
    
    // Priority levels (higher = more important)
    const priorities = {
      explosion: 10,
      fire: 9,
      lightning: 8,
      ice: 7,
      snow: 6,
      heat: 5,
      pressed: 4,
      black: 2,
      white: 1
    };
    
    // Helper to set cell effect if higher priority
    const setCellEffect = (x: number, y: number, type: string) => {
      const key = `${x},${y}`;
      const current = cellEffects.get(key);
      const priority = priorities[type] || 0;
      if (!current || current.priority < priority) {
        cellEffects.set(key, { type, priority });
      }
    };
    
    // Check temperature effects on ground cells
    // Sample temperature from center of battlefield
    const centerX = Math.floor(this.sim.fieldWidth / 2);
    const centerY = Math.floor(this.sim.fieldHeight / 2);
    const temp = this.sim.getTemperature(centerX, centerY);
    
    if (temp > 30) {
      // Hot cells - show heat shimmer on bottom rows
      for (let x = 0; x < this.sim.fieldWidth; x++) {
        for (let y = this.sim.fieldHeight - 2; y < this.sim.fieldHeight; y++) {
          setCellEffect(x, y, 'heat');
        }
      }
    } else if (temp < 0) {
      // Cold cells - show ice/snow
      for (let x = 0; x < this.sim.fieldWidth; x++) {
        for (let y = this.sim.fieldHeight - 2; y < this.sim.fieldHeight; y++) {
          setCellEffect(x, y, 'snow');
        }
      }
    }
    
    // Check for units with status effects
    for (const unit of this.sim.units) {
      const x = Math.floor(unit.pos.x);
      const y = Math.floor(unit.pos.y);
      
      if (unit.meta?.onFire) {
        setCellEffect(x, y, 'fire');
      } else if (unit.meta?.frozen) {
        setCellEffect(x, y, 'ice');
      } else if (unit.meta?.electrified) {
        setCellEffect(x, y, 'lightning');
      }
    }
    
    // Check recent explosion events
    const recentExplosions = this.sim.processedEvents?.filter(event =>
      event.kind === 'aoe' && 
      event.tick && 
      (this.sim.ticks - event.tick) < 5
    ) || [];
    
    for (const explosion of recentExplosions) {
      // AoE events have position in their data
      const pos = (explosion as any).position || (explosion as any).center;
      if (pos) {
        const x = Math.floor(pos.x);
        const y = Math.floor(pos.y);
        setCellEffect(x, y, 'explosion');
      }
    }
    
    // Render cell effects with proper sprite mapping
    this.ctx.save();
    
    for (const [cellKey, effect] of cellEffects.entries()) {
      const [x, y] = cellKey.split(',').map(Number);
      const { x: screenX, y: screenY } = this.toIsometric(x, y);
      
      let frameX = -1;
      let animationFrames = 1;
      let frameSpeed = 200;
      
      // Sprite sheet layout (16x16 tiles, horizontal strip):
      // 0: white cell, 1: black cell, 2: pressed, 3-9: fire, 10-18: explosion
      switch(effect.type) {
        case 'white':
          frameX = 0;
          break;
        case 'black':
          frameX = 1;
          break;
        case 'pressed':
          frameX = 2;
          break;
        case 'fire':
        case 'heat':
          animationFrames = 5;
          frameSpeed = 100;
          const fireFrame = Math.floor((this.animationTime / frameSpeed) % animationFrames);
          frameX = 5 + fireFrame; 
          break;
        case 'explosion':
          // Explosion animation frames 11-19 (not 10)
          animationFrames = 9;
          frameSpeed = 80;
          const explFrame = Math.floor((this.animationTime / frameSpeed) % animationFrames);
          frameX = 11 + explFrame;  // Start at frame 11
          break;
        case 'ice':
        case 'snow':
          // Use pressed frame for ice/snow (temporary)
          frameX = 2;
          this.ctx.globalAlpha = 0.5;
          break;
        case 'lightning':
          // Use fire frame with different tint
          frameX = 4;
          break;
      }
      
      // Draw the cell effect sprite
      if (frameX < 0) continue; // Skip if no valid frame found
      const spriteSize = 16;
      this.ctx.drawImage(
        cellEffectsSprite,
        frameX * spriteSize, 0, spriteSize, spriteSize,
        screenX - 8, screenY - 8, spriteSize, spriteSize
      );
    }
    
    this.ctx.restore();
  }

  private renderGrapplingLines() {
    // Draw tether lines between grappled units
    for (const unit of this.sim.units) {
      if (unit.meta?.grappled && unit.meta?.tetherPoint) {
        // Find the grappler
        const grappler = this.sim.units.find(u => u.id === unit.meta.grappledBy);
        if (!grappler) continue;
        
        const startPos = this.toIsometric(grappler.pos.x, grappler.pos.y);
        const endPos = this.toIsometric(unit.pos.x, unit.pos.y);
        
        // Draw rope/tether line (monochrome black)
        this.ctx.save();
        this.ctx.strokeStyle = '#000000'; // Black rope
        this.ctx.lineWidth = 1; // Thin 1px line
        
        this.ctx.beginPath();
        this.ctx.moveTo(startPos.x, startPos.y);
        
        // Add slight sag to the rope for physics feel
        const midX = (startPos.x + endPos.x) / 2;
        const midY = (startPos.y + endPos.y) / 2 + 3; // Slight sag
        
        this.ctx.quadraticCurveTo(midX, midY, endPos.x, endPos.y);
        this.ctx.stroke();
        
        // Draw small anchor points
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(startPos.x, startPos.y, 1, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(endPos.x, endPos.y, 1, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.restore();
      }
    }
    
    // Draw in-flight grapple projectiles with trailing rope
    const grappleProjectiles = this.sim.projectiles.filter(p => 
      (p as any).type === 'grapple'
    );
    
    for (const grapple of grappleProjectiles) {
      const grapplerID = (grapple as any).grapplerID;
      const grappler = this.sim.units.find(u => u.id === grapplerID);
      if (!grappler) continue;
      
      const startPos = this.toIsometric(grappler.pos.x, grappler.pos.y);
      const endPos = this.toIsometric(grapple.pos.x, grapple.pos.y);
      
      // Draw rope trailing behind projectile (monochrome black)
      this.ctx.save();
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 1;
      this.ctx.globalAlpha = 0.8;
      
      this.ctx.beginPath();
      this.ctx.moveTo(startPos.x, startPos.y);
      this.ctx.lineTo(endPos.x, endPos.y);
      this.ctx.stroke();
      
      this.ctx.restore();
    }
  }

  private renderParticles() {
    if (!this.sim.particles || this.sim.particles.length === 0) return;

    this.ctx.save();

    for (const particle of this.sim.particles) {
      this.renderParticle(particle);
    }

    this.ctx.restore();
  }

  private renderParticle(particle: any) {
    // Handle both sim coordinates and pixel coordinates
    // Most particles are created with pixel coordinates (x*8, y*8)
    let x: number, y: number;
    
    if (particle.pos) {
      // Most particles use pos with pixel coordinates (x*8, y*8)
      // Convert back to sim coordinates
      x = particle.pos.x / 8;
      y = particle.pos.y / 8;
    } else if (particle.x !== undefined && particle.y !== undefined) {
      // Some particles might use direct x,y
      // Check if these are pixel or sim coordinates based on magnitude
      if (particle.x > this.sim.fieldWidth || particle.y > this.sim.fieldHeight) {
        // Likely pixel coordinates
        x = particle.x / 8;
        y = particle.y / 8;
      } else {
        // Likely sim coordinates
        x = particle.x;
        y = particle.y;
      }
    } else {
      // Fallback
      x = 0;
      y = 0;
    }
    
    const z = particle.z || 0;
    
    const isoPos = this.toIsometric(x, y);
    const screenY = isoPos.y - (z * 8); // Apply height offset
    
    this.ctx.save();
    
    // Apply particle transparency based on lifetime
    const alpha = particle.lifetime > 100 ? 1 : particle.lifetime / 100;
    this.ctx.globalAlpha = Math.min(alpha, 0.8);
    
    // Lightning particles get special bright rendering
    if (particle.type === 'lightning') {
      this.ctx.fillStyle = particle.color || '#ffff00';
      this.ctx.shadowColor = particle.color || '#ffff00';
      this.ctx.shadowBlur = 4;
      this.ctx.beginPath();
      this.ctx.arc(isoPos.x, screenY, particle.radius || 2, 0, 2 * Math.PI);
      this.ctx.fill();
    } else if (particle.type === 'rain' || particle.type === 'snow') {
      // Weather particles
      this.ctx.fillStyle = particle.color || (particle.type === 'snow' ? '#ffffff' : '#4444ff');
      this.ctx.beginPath();
      this.ctx.arc(isoPos.x, screenY, particle.radius || 1, 0, 2 * Math.PI);
      this.ctx.fill();
      
      // Draw shadow on ground if particle is in the air
      if (z > 0) {
        this.ctx.globalAlpha = 0.2;
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(isoPos.x, isoPos.y, particle.radius || 1, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    } else {
      // Generic particle rendering
      this.ctx.fillStyle = particle.color || '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(isoPos.x, screenY, particle.radius || 1, 0, 2 * Math.PI);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }
}
