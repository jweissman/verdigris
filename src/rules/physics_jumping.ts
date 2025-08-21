import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";

/**
 * Physics-based jumping with gravity, terminal velocity, and game feel
 */
export class PhysicsJumping extends Rule {
  private commands: QueuedCommand[] = [];
  
  // Physics constants
  private readonly GRAVITY = 0.8;           // Gravity acceleration
  private readonly JUMP_POWER = -12;        // Initial jump velocity (negative = up)
  private readonly TERMINAL_VELOCITY = 15;  // Max fall speed
  private readonly AIR_CONTROL = 0.3;       // Horizontal control while airborne
  private readonly DOUBLE_JUMP_POWER = -10; // Slightly weaker double jump
  
  // Game feel constants
  private readonly COYOTE_TIME = 3;         // Ticks after leaving ground where jump still works
  private readonly JUMP_BUFFER_TIME = 3;    // Ticks to buffer jump input before landing
  
  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    const units = context.getAllUnits();
    
    for (const unit of units) {
      if (unit.meta?.hasPhysics) {
        this.updatePhysics(context, unit);
      }
    }
    
    return this.commands;
  }
  
  private updatePhysics(context: TickContext, unit: any): void {
    const velocity = unit.meta.velocity || { x: 0, y: 0 };
    const grounded = unit.meta.grounded ?? true;
    const position = unit.pos;
    
    // Apply gravity if not grounded
    if (!grounded) {
      velocity.y = Math.min(velocity.y + this.GRAVITY, this.TERMINAL_VELOCITY);
    }
    
    // Update position based on velocity
    const newX = position.x + velocity.x;
    const newY = position.y + velocity.y;
    const newZ = Math.max(0, (unit.meta.z || 0) - velocity.y); // Z is height above ground
    
    // Check if landing
    if (newZ <= 0 && velocity.y > 0) {
      // Landing!
      this.land(unit);
      velocity.y = 0;
      
      // Check jump buffer
      if (unit.meta.jumpBuffered && context.getCurrentTick() - unit.meta.jumpBufferTime <= this.JUMP_BUFFER_TIME) {
        this.initiateJump(unit);
      }
    }
    
    // Update coyote time
    if (grounded) {
      unit.meta.coyoteTime = context.getCurrentTick();
    }
    
    // Apply movement
    if (Math.abs(velocity.x) > 0.01 || Math.abs(velocity.y) > 0.01) {
      this.commands.push({
        type: "move",
        params: {
          unitId: unit.id,
          x: newX,
          y: position.y // Keep Y constant for 2D movement
        }
      });
    }
    
    // Update metadata
    this.commands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          ...unit.meta,
          velocity: velocity,
          z: newZ,
          grounded: newZ <= 0
        }
      }
    });
  }
  
  private initiateJump(unit: any): void {
    const velocity = unit.meta.velocity || { x: 0, y: 0 };
    const canDoubleJump = unit.meta.canDoubleJump ?? false;
    const grounded = unit.meta.grounded ?? true;
    const coyoteValid = this.isInCoyoteTime(unit);
    
    if (grounded || coyoteValid) {
      // First jump
      velocity.y = this.JUMP_POWER;
      unit.meta.canDoubleJump = true;
      unit.meta.grounded = false;
      unit.meta.jumpBuffered = false;
    } else if (canDoubleJump) {
      // Double jump
      velocity.y = this.DOUBLE_JUMP_POWER;
      unit.meta.canDoubleJump = false;
    }
  }
  
  private land(unit: any): void {
    unit.meta.grounded = true;
    unit.meta.canDoubleJump = false;
    unit.meta.z = 0;
  }
  
  private isInCoyoteTime(unit: any): boolean {
    const currentTick = unit.meta.currentTick || 0;
    const coyoteTime = unit.meta.coyoteTime || 0;
    return currentTick - coyoteTime <= this.COYOTE_TIME;
  }
  
  /**
   * Apply horizontal movement with air control
   */
  applyHorizontalMovement(unit: any, direction: number): void {
    const velocity = unit.meta.velocity || { x: 0, y: 0 };
    const grounded = unit.meta.grounded ?? true;
    
    if (grounded) {
      // Full control on ground
      velocity.x = direction * 2; // Base move speed
    } else {
      // Reduced control in air
      velocity.x += direction * this.AIR_CONTROL;
      velocity.x = Math.max(-3, Math.min(3, velocity.x)); // Clamp air speed
    }
  }
}