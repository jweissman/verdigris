import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

/**
 * Enforces chain constraint between hero and chain ball
 * The ball should:
 * 1. Stay within max chain length of hero
 * 2. Fall with gravity when not being thrown
 * 3. Come to complete rest when not moving
 * 4. Never move without external force
 */
export class ChainConstraint extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    
    // Find all chain balls
    const chainBalls = context.getAllUnits().filter(u => 
      u.tags?.includes("chain_ball")
    );
    
    for (const ball of chainBalls) {
      const ownerId = ball.meta?.ownerId;
      if (!ownerId) continue;
      
      const owner = context.getAllUnits().find(u => u.id === ownerId);
      if (!owner) continue;
      
      const maxChainLength = ball.meta?.chainLength || 24; // In pixels
      const maxTileDistance = maxChainLength / 8; // Convert to tiles
      
      // Calculate distance between owner and ball
      const dx = ball.pos.x - owner.pos.x;
      const dy = ball.pos.y - owner.pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If ball is beyond max chain length, pull it along
      if (distance > maxTileDistance) {
        // Calculate how much we're over-extended
        const overExtension = distance - maxTileDistance;
        
        // Calculate unit vector from ball to owner (pull direction)
        const pullX = -dx / distance;
        const pullY = -dy / distance;
        
        // Apply a pulling force proportional to over-extension
        // This creates a spring-like constraint
        const stiffness = 0.5; // How strongly the chain pulls (0-1)
        const pullForce = overExtension * stiffness;
        
        // Add to ball's intended move (this will make it follow the hero)
        if (!ball.intendedMove) {
          ball.intendedMove = { x: 0, y: 0 };
        }
        
        // Apply the pull
        ball.intendedMove.x += pullX * pullForce;
        ball.intendedMove.y += pullY * pullForce;
        
        // Also directly constrain if WAY over-extended (safety)
        if (overExtension > 2) {
          // Hard constraint - snap back to max distance
          const ux = dx / distance;
          const uy = dy / distance;
          const newX = owner.pos.x + ux * maxTileDistance;
          const newY = owner.pos.y + uy * maxTileDistance;
          
          ball.pos.x = Math.floor(newX);
          ball.pos.y = Math.floor(newY);
        }
      }
      
      // Apply damping to ball movement
      if (ball.intendedMove) {
        // Less damping when chain is taut (being pulled)
        const isTaut = distance > maxTileDistance * 0.9; // 90% extended
        const dampingFactor = isTaut ? 0.95 : 0.8; // Less damping when taut
        
        ball.intendedMove.x *= dampingFactor;
        ball.intendedMove.y *= dampingFactor;
        
        // If movement is very small AND chain is not taut, stop completely
        if (!isTaut && Math.abs(ball.intendedMove.x) < 0.1 && Math.abs(ball.intendedMove.y) < 0.1) {
          ball.intendedMove.x = 0;
          ball.intendedMove.y = 0;
        }
      }
      
      // Apply subtle gravity to make the ball feel heavy
      const isMoving = ball.intendedMove && 
                       (Math.abs(ball.intendedMove.x) > 0.1 || Math.abs(ball.intendedMove.y) > 0.1);
      
      // Always apply a tiny bit of gravity (makes it hang naturally)
      if (ball.intendedMove) {
        const gravityStrength = isMoving ? 0.3 : 0.05; // More gravity when moving
        ball.intendedMove.y += gravityStrength;
        
        // But cap downward velocity to prevent infinite acceleration
        if (ball.intendedMove.y > 5) {
          ball.intendedMove.y = 5;
        }
      }
      
      // When at rest and chain is slack, gently pull toward rest position
      if (!isMoving && distance < maxTileDistance * 0.8) {
        // Calculate rest position (slightly behind and below owner based on facing)
        const facing = owner.meta?.facing || "right";
        const restOffsetX = facing === "left" ? 1 : facing === "right" ? -1 : 0;
        const restX = owner.pos.x + restOffsetX;
        const restY = owner.pos.y + 2; // 2 tiles below
        
        // Very gentle force toward rest position
        const toRestX = restX - ball.pos.x;
        const toRestY = restY - ball.pos.y;
        const restDist = Math.sqrt(toRestX * toRestX + toRestY * toRestY);
        
        if (restDist > 0.5) {
          // Apply a very gentle centering force
          if (!ball.intendedMove) {
            ball.intendedMove = { x: 0, y: 0 };
          }
          ball.intendedMove.x += toRestX * 0.02;
          ball.intendedMove.y += toRestY * 0.02;
        }
      }
    }
    
    return commands;
  }
}