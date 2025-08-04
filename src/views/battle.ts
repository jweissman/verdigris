// TODO: move battlestrip/field view logic out of renderer.ts
// would also be nice to work out how to pass options to the renderer from the sim (like cinematic mode)

import { Projectile, Unit } from "../sim/types";
import View from "./view";

export default class Battle extends View {
  // animationTime: number = 0;

  show() {
    this.updateMovementInterpolations();
    this.updateProjectileInterpolations();

    // Draw grid dots
    this.ctx.save();
    this.ctx.globalAlpha = 0.2;
    this.grid();
    this.ctx.restore();
    
    // Draw units normally
    for (const unit of this.sim.units) {
      this.showUnit(unit);
    }
    
    // Draw projectiles
    for (const projectile of this.sim.projectiles) {
      this.showProjectile(projectile);
    }

    this.renderOverlays();
  }

  private grid({
    dotSize,
  } = { dotSize: 3 }) {
    // Draw grid dots at exact integer positions
    for (let x = 0; x < this.width; x += 8) {
      for (let y = 0; y < this.height; y += 8) {
        this.ctx.beginPath();
        // Ensure grid dots are centered at integer coordinates
        this.ctx.arc(x + 4, y + 4, dotSize, 0, 2 * Math.PI);
        this.ctx.fillStyle = "#888";
        this.ctx.fill();
      }
    }
  }

  private showUnit(unit: Unit) {
    // Check if unit was recently damaged and should blink
    const recentDamage = this.sim.processedEvents.find(event => 
      event.kind === 'damage' && 
      event.target === unit.id && 
      event.tick && 
      (this.sim.ticks - event.tick) < 2 // Blink for 8 ticks
    );
    
    // Skip rendering on alternating ticks if recently damaged
    if (recentDamage && Math.floor(this.animationTime / 100) % 2 === 0) {
      return; // Don't render this frame (creates blink effect)
    }

    // Calculate render position (interpolated if moving)
    let renderX = unit.pos.x;
    let renderY = unit.pos.y;
    let renderZ = unit.meta?.z || 0;
      
    const interp = this.unitInterpolations.get(unit.id);
    if (interp) {
      // Use smooth interpolation with easing
      const easeProgress = this.easeInOutQuad(interp.progress);
      renderX = interp.startX + (interp.targetX - interp.startX) * easeProgress;
      renderY = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      renderZ = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
    }
      
    // CRITICAL: Round to integer pixels to prevent blurring
    // Position sprites so they're centered on 8x8 grid cells but drawn at 16x16
    const gridCenterX = Math.round(renderX * 8) + 4; // Center of grid cell
    const gridCenterY = Math.round(renderY * 8) + 4; // Center of grid cell
    const pixelX = gridCenterX - 8; // Offset to center 16x16 sprite
    const pixelY = gridCenterY - 8; // Offset to center 16x16 sprite

    let realPixelY = pixelY; // Default to pixelY unless adjusted for z height
      
    const sprite = this.sprites.get(unit.sprite);
    if (sprite) {
      // Choose frame based on unit state and animation
      let frameIndex = 0;
        
      if (unit.state === 'dead') {
        frameIndex = 3; // Frame 4 (index 3) for death
      } else if (unit.state === 'attack') {
        frameIndex = 2; // Frame 3 (index 2) for attack
      } else {
        // Idle animation - cycle between frames 0 and 1 every 400ms (slower)
        frameIndex = Math.floor((this.animationTime / 400) % 2);
      }
        
      // Assuming 4 frames of 16x16 arranged horizontally in sprite sheet
      const frameX = frameIndex * 16;

      // Offset for z height (using interpolated z value)
      if (renderZ > 0) {
        // Apply z offset for jumping or elevation
        realPixelY -= renderZ * 2.4; // Adjust Y position based on z height
      }

      realPixelY = Math.round(realPixelY); // Ensure pixelY is an integer
        
      // Draw at native 16x16 size for maximum sharpness
      this.ctx.drawImage(
        sprite,
        frameX, 0, 16, 16,  // Source: current frame at native size
        pixelX, realPixelY, 16, 16  // Dest: native 16x16 size, centered on grid
      );
    } else {
      // Fallback to colored rectangle - keep at 8x8 for grid alignment
      const fallbackX = Math.round(renderX * 8);
      const fallbackY = Math.round(renderY * 8);
      this.ctx.fillStyle = unit.sprite === "worm" ? "green" : "blue";
      this.ctx.fillRect(fallbackX, fallbackY, 8, 8);
    }
      
    // Draw HP bar above unit - position relative to sprite center
    if (typeof unit.hp === 'number') {
      const maxHp = unit.maxHp || 100; // fallback if not present
      const hpRatio = Math.max(0, Math.min(1, unit.hp / maxHp));
      this.drawBar("hit points", pixelX, realPixelY - 4, 16, 2, hpRatio);
    }

    // Draw ability progress bar if applicable
    if (unit.abilities && unit.abilities.jumps) {
      const ability = unit.abilities.jumps;
      // jump progress 
      const duration = ability.config?.jumpDuration || 10; // Default duration if not specified
      const progress = unit.meta.jumpProgress || 0;
      // const jumpDuration = ability.config?.speed || 10; // Default duration if not specified
      const progressRatio = (progress / duration) || 0;
      if (progressRatio > 0 && progressRatio < 1) {
        this.drawBar("jump progress", pixelX, realPixelY - 6, 16, 2, progressRatio, '#ace');
      }
    }
  }

  private drawBar(_label: string, pixelX: number, pixelY: number, width: number, height: number, ratio: number, colorOverride?: string) {

        const barWidth = width; // Match sprite width
        const barHeight = height;
        const barX = pixelX;
        const barY = pixelY - 4; // Above the 16x16 sprite
        // Background
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        // HP amount
        this.ctx.fillStyle = ratio > 0.5 ? '#0f0' : ratio > 0.2 ? '#ff0' : '#f00';
        if (colorOverride) {
          this.ctx.fillStyle = colorOverride; // Use custom color if provided
        }
        this.ctx.fillRect(barX, barY, Math.round(barWidth * ratio), barHeight);
      // }
    // }
  }

  private showProjectile(projectile: any) {
    // Calculate interpolated render position for smooth movement
    let renderX = projectile.pos.x;
    let renderY = projectile.pos.y;
    let renderZ = projectile.z || 0;
    
    const interp = this.projectileInterpolations.get(projectile.id);
    if (interp) {
      // Use smooth interpolation with easing
      const easeProgress = projectile.type === 'bomb' ? 
        this.easeInOutQuad(interp.progress) : // Smooth for bombs
        interp.progress; // Linear for bullets
      
      renderX = interp.startX + (interp.targetX - interp.startX) * easeProgress;
      renderY = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      renderZ = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
    }
    
    const pixelX = Math.round(renderX * 8);
    const pixelY = Math.round(renderY * 8);
    let adjustedPixelY = pixelY;
    
    // Apply z-axis offset for bombs
    if (renderZ > 0) {
      adjustedPixelY -= renderZ * 2.4; // Same scale as units
    }
    
    this.ctx.save();
    
    // Monochrome projectile rendering
    if (projectile.type === 'bomb') {
      // Draw parabolic arc trail if bomb is in flight
      if (projectile.origin && projectile.target && projectile.progress && projectile.duration) {
        this.drawBombArcTrail(projectile);
      }
      
      // Bombs are larger circles, dark fill with white border
      this.ctx.fillStyle = '#000';
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(pixelX + 4, adjustedPixelY + 4, (projectile.radius || 2) * 1.2, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
      
      // Add a shadow if elevated
      if (renderZ > 0) {
        this.ctx.fillStyle = '#00000040';
        this.ctx.beginPath();
        this.ctx.arc(pixelX + 4, pixelY + 4, (projectile.radius || 2) * 0.8, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    } else {
      // Bullets are small dots
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.arc(pixelX + 4, adjustedPixelY + 4, projectile.radius || 1.5, 0, 2 * Math.PI);
      this.ctx.fill();
      
      // Simple trail for bullets in grid view only
      if (projectile.vel) {
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.3;
        this.ctx.beginPath();
        const trailX = pixelX + 4 - (projectile.vel.x || 0) * 4;
        const trailY = adjustedPixelY + 4 - (projectile.vel.y || 0) * 4;
        this.ctx.moveTo(trailX, trailY);
        this.ctx.lineTo(pixelX + 4, adjustedPixelY + 4);
        this.ctx.stroke();
      }
    }
    
    this.ctx.restore();
  }


  private easeInOutQuad(t: number): number {
    // Less smooth, more chunky movement
    // Sharp acceleration at start, then linear
    return t < 0.3 ? 4 * t * t : 0.36 + 0.64 * (t - 0.3) / 0.7;
  }

  private drawBombArcTrail(projectile: Projectile) {
    let { origin, target, progress, duration } = projectile;
    if (!origin || !target || progress === undefined || duration === undefined) {
      return; // Cannot draw arc without these
    }
    // Calculate the parabolic arc from origin to target
    const originX = origin.x * 8 + 4;
    const originY = origin.y * 8 + 4;
    const targetX = target.x * 8 + 4;
    const targetY = target.y * 8 + 4;
    
    // Calculate distance for height scaling (same as projectile motion)
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const baseHeight = 12;
    const distanceMultiplier = Math.min(2, distance / 5);
    const height = baseHeight * distanceMultiplier;
    
    // Draw arc with dots showing parabolic path
    this.ctx.save();
    this.ctx.fillStyle = '#666';
    this.ctx.globalAlpha = 0.4;
    
    // Sample points along the arc
    const numPoints = Math.max(8, Math.floor(distance * 2));
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const x = originX + (targetX - originX) * t;
      const y = originY + (targetY - originY) * t;
      const z = height * Math.sin(Math.PI * t);
      const arcY = y - z * 2.4; // Same z scaling as units
      
      // Draw small dots for the arc trail
      this.ctx.beginPath();
      this.ctx.arc(x, arcY, 1, 0, 2 * Math.PI);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private renderOverlays() {
    for (const unit of this.sim.units) {
      if (unit.state === 'dead') continue;
      
      // Movement intention arrows
      this.renderMovementIntention(unit);
      
      // Jump target highlights
      this.renderJumpTarget(unit);
      
      // Toss target highlights
      this.renderTossTarget(unit);
      
      // Combat target highlights
      // this.renderCombatTarget(unit);
    }
    
    // AoE effect visualizations
    this.renderAoEEffects();
  }

  private renderMovementIntention(unit: Unit) {
    // Only show if unit has movement intention
    if (!unit.intendedMove || (unit.intendedMove.x === 0 && unit.intendedMove.y === 0)) {
      return;
    }

    // Calculate current unit pixel position (center of sprite)
    const unitCenterX = Math.round(unit.pos.x * 8) + 4;
    const unitCenterY = Math.round(unit.pos.y * 8) + 4;
    
    // Calculate intended target position
    const targetX = unitCenterX + unit.intendedMove.x * 8;
    const targetY = unitCenterY + unit.intendedMove.y * 8;
    
    // Draw arrow
    this.ctx.save();
    this.ctx.strokeStyle = unit.team === 'friendly' ? '#00ff00' : '#ff4444';
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.8;
    
    // Arrow line
    this.ctx.beginPath();
    this.ctx.moveTo(unitCenterX, unitCenterY);
    this.ctx.lineTo(targetX, targetY);
    this.ctx.stroke();
    
    // Arrow head
    const angle = Math.atan2(targetY - unitCenterY, targetX - unitCenterX);
    const headLength = 4;
    
    this.ctx.beginPath();
    this.ctx.moveTo(targetX, targetY);
    this.ctx.lineTo(
      targetX - headLength * Math.cos(angle - Math.PI / 6),
      targetY - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(targetX, targetY);
    this.ctx.lineTo(
      targetX - headLength * Math.cos(angle + Math.PI / 6),
      targetY - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private renderJumpTarget(unit: Unit) {
    // Only show if unit is jumping and has a target
    if (!unit.meta?.jumping || !unit.meta?.jumpTarget) {
      return;
    }

    const targetX = Math.round(unit.meta.jumpTarget.x * 8);
    const targetY = Math.round(unit.meta.jumpTarget.y * 8);
    
    // Highlight target cell with blue overlay
    this.ctx.save();
    this.ctx.fillStyle = '#4444ff';
    this.ctx.globalAlpha = 0.4;
    this.ctx.fillRect(targetX, targetY, 8, 8);
    this.ctx.restore();
  }

  private renderTossTarget(unit: Unit) {
    // Only show if unit is being tossed and has a target
    if (!unit.meta?.tossing || !unit.meta?.tossTarget) {
      return;
    }

    const targetX = Math.round(unit.meta.tossTarget.x * 8);
    const targetY = Math.round(unit.meta.tossTarget.y * 8);
    
    // Highlight target cell with purple overlay (involuntary movement)
    this.ctx.save();
    this.ctx.fillStyle = '#8844ff';
    this.ctx.globalAlpha = 0.5;
    this.ctx.fillRect(targetX, targetY, 8, 8);
    
    // Add a pulsing border to indicate involuntary movement
    this.ctx.strokeStyle = '#ff44aa';
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.7;
    this.ctx.strokeRect(targetX, targetY, 8, 8);
    this.ctx.restore();
  }

  // private renderCombatTarget(unit: Unit) {
  //   // Only show if unit has a combat target
  //   if (!unit.intendedTarget || typeof unit.intendedTarget !== 'string') {
  //     return;
  //   }

  //   const target = this.sim.creatureById(unit.intendedTarget);
  //   if (!target) return;

  //   const targetX = Math.round(target.pos.x * 8);
  //   const targetY = Math.round(target.pos.y * 8);
    
  //   // Highlight target cell with red overlay
  //   this.ctx.save();
  //   this.ctx.fillStyle = '#ff4444';
  //   this.ctx.globalAlpha = 0.4;
  //   this.ctx.fillRect(targetX, targetY, 8, 8);
  //   this.ctx.restore();
  // }

  private renderAoEEffects() {
    // Query simulator for recent AoE events
    const recentAoEEvents = this.sim.processedEvents.filter(event => 
      event.kind === 'aoe' && 
      event.tick && 
      (this.sim.ticks - event.tick) < 10 // Show for 10 ticks
    );

    for (const event of recentAoEEvents) {
      if (typeof event.target !== 'object' || !('x' in event.target)) continue;
      
      const pos = event.target as {x: number, y: number};
      const radius = event.meta.radius || 3;
      const age = event.tick ? (this.sim.ticks - event.tick) : 0;
      const maxAge = 10;
      
      // Fade out over time
      const alpha = Math.max(0, 1 - (age / maxAge));
      
      // Calculate affected grid cells
      const affectedCells: {x: number, y: number}[] = [];
      const centerGridX = Math.round(pos.x);
      const centerGridY = Math.round(pos.y);
      
      // Check each cell in a square around the center
      const checkRadius = Math.ceil(radius);
      for (let dx = -checkRadius; dx <= checkRadius; dx++) {
        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
          const cellX = centerGridX + dx;
          const cellY = centerGridY + dy;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance <= radius) {
            affectedCells.push({x: cellX, y: cellY});
          }
        }
      }
      
      // Highlight each affected cell
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.4;
      this.ctx.fillStyle = '#ffaa00'; // Orange for explosion
      
      for (const cell of affectedCells) {
        const pixelX = cell.x * 8;
        const pixelY = cell.y * 8;
        this.ctx.fillRect(pixelX, pixelY, 8, 8);
      }
      this.ctx.restore();
      
      // Draw impact ring around the center for visual emphasis
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.6;
      this.ctx.strokeStyle = '#ff4400';
      this.ctx.lineWidth = 1;
      const centerPixelX = Math.round(pos.x * 8) + 4;
      const centerPixelY = Math.round(pos.y * 8) + 4;
      const pixelRadius = radius * 8;
      this.ctx.beginPath();
      this.ctx.arc(centerPixelX, centerPixelY, pixelRadius, 0, 2 * Math.PI);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

}