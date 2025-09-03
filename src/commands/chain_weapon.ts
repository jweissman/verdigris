import { Command } from "../rules/command";

export class ChainWeaponCommand extends Command {
  
  execute(unitId: string | null, params: Record<string, any>): void {
    const action = params.action as string;
    
    if (action === "equip" && unitId) {
      const unit = this.sim.units.find(u => u.id === unitId);
      if (!unit) return;
      
      // Create the ball as an actual unit in the simulation
      const ballId = `${unitId}_chain_ball`;
      
      // Remove old ball if it exists
      const oldBall = this.sim.units.find(u => u.id === ballId);
      if (oldBall) {
        this.sim.units = this.sim.units.filter(u => u.id !== ballId);
      }
      
      // Create ball unit - starts at rest below hero
      const ball = this.sim.addUnit({
        id: ballId,
        type: "chain_ball",
        pos: { x: unit.pos.x, y: unit.pos.y + 3 }, // 3 tiles below hero
        hp: 1000, // Indestructible
        maxHp: 1000,
        team: unit.team,
        mass: 50, // Very heavy
        sprite: "chain_ball", // We'll need a sprite for this
        tags: ["projectile", "chain_ball", "no_collision"], // no_collision so it doesn't block movement
        intendedMove: { x: 0, y: 0 },
        meta: {
          ownerId: unitId,
          isChainBall: true,
          chainLength: 24, // Maximum chain length in pixels (3 tiles)
          noBlock: true, // Don't block other units
        }
      });
      
      // Store chain info in hero's meta
      if (!unit.meta) unit.meta = {};
      unit.meta.chainWeapon = true;
      unit.meta.chainBallId = ballId;
      
      return;
    }
    
    if (action === "swing" && unitId) {
      const unit = this.sim.units.find(u => u.id === unitId);
      const ballId = unit?.meta?.chainBallId;
      if (!unit || !ballId) return;
      
      const ball = this.sim.units.find(u => u.id === ballId);
      if (!ball) return;
      
      const direction = params.direction || unit.meta?.facing || "right";
      const power = params.power || 5;
      
      // For attacks, create a whipping motion
      const isAttack = params.isAttack;
      
      if (isAttack) {
        // Calculate whip direction and force
        const whipPower = power || 8; // Strong default power for attacks
        
        // Direction vectors
        let forceX = 0;
        let forceY = 0;
        
        switch(direction) {
          case "right": forceX = whipPower; break;
          case "left": forceX = -whipPower; break;
          case "up": forceY = -whipPower; break;
          case "down": forceY = whipPower; break;
        }
        
        // Add some upward component for a more natural whip arc
        if (forceX !== 0) {
          forceY -= whipPower * 0.3; // Slight upward arc when swinging horizontally
        }
        
        // Apply the impulse to the ball
        if (!ball.intendedMove) {
          ball.intendedMove = { x: 0, y: 0 };
        }
        
        // Add to existing movement (impulse)
        ball.intendedMove.x += forceX;
        ball.intendedMove.y += forceY;
        
        // Store velocity for damage calculation
        if (!ball.meta) ball.meta = {};
        ball.meta.velocity = { x: forceX, y: forceY };
        ball.meta.lastSwingTick = this.sim.ticks;
      }
      
      // Check for collisions with enemies using ball's actual position
      const enemies = this.sim.units.filter(u => {
        if (u.id === unitId || u.id === ballId || u.team === unit.team || u.hp <= 0) return false;
        
        const dx = u.pos.x - ball.pos.x;
        const dy = u.pos.y - ball.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        return dist <= 1.5; // Within 1.5 tiles for collision
      });
      
      // Damage enemies based on ball velocity
      const velocity = ball.meta?.velocity || { x: 0, y: 0 };
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      const damage = Math.floor(speed * 3); // Damage based on swing speed
        
      // Create ground impact effect if ball is moving fast AND hitting enemies
      if (speed > 5 && enemies.length > 0) {
        // Impact particle at ball position
        this.sim.queuedCommands.push({
          type: "particle",
          params: {
            pos: { x: ball.pos.x * 8 + 4, y: ball.pos.y * 8 + 4 },
            vel: { x: 0, y: -1 },
            lifetime: 10,
            type: "impact",
            color: "#000000",
            radius: 2,
            z: 0
          }
        });
        
        // Ground crack/impact zone visualization
        this.sim.queuedEvents.push({
          kind: "aoe",
          source: unitId,
          target: { x: ball.pos.x, y: ball.pos.y },
          zones: [{ x: ball.pos.x, y: ball.pos.y }],
          kind_flavor: "impact",
          duration: 5,
          meta: {
            aspect: "kinetic"
          }
        });
      }
        
        for (const enemy of enemies) {
          if (damage > 0) {
            this.sim.queuedCommands.push({
              type: "damage",
              params: {
                targetId: enemy.id,
                amount: damage,
                sourceId: unitId,
                aspect: "kinetic"
              }
            });
            
            // Knockback
            const knockbackForce = Math.min(speed / 2, 3);
            this.sim.queuedCommands.push({
              type: "knockback",
              params: {
                targetId: enemy.id,
                dx: Math.sign(velocity.x) * knockbackForce,
                dy: Math.sign(velocity.y) * knockbackForce
              }
            });
            
            // Visual feedback
            this.sim.queuedCommands.push({
              type: "particle",
              params: {
                pos: { x: enemy.pos.x * 8 + 4, y: enemy.pos.y * 8 + 4 },
                vel: { x: velocity.x / 4, y: velocity.y / 4 },
                lifetime: 15,
                type: "impact",
                color: "#FF4444",
                radius: 3,
                z: 5
              }
            });
          }
        }
      
      return;
    }
    
    if (action === "update") {
      // This action is no longer needed - ball is a real unit now
      // Chain constraint is handled by ChainConstraint rule
      return;
    }
  }
}