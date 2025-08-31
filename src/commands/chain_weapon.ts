import { Command } from "../rules/command";
import { KinematicChain } from "../weapons/kinematic_chain";

export class ChainWeaponCommand extends Command {
  private static chains: Map<string, KinematicChain> = new Map();
  private static initialized: boolean = false;
  
  execute(unitId: string | null, params: Record<string, any>): void {
    const action = params.action as string;
    
    if (action === "equip" && unitId) {
      const unit = this.sim.units.find(u => u.id === unitId);
      if (!unit) return;
      
      // Create a chain for this unit
      const chain = new KinematicChain(
        { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 }, // Convert to pixel coords (center of tile)
        6, // 6 links
        4  // Ball radius
      );
      
      ChainWeaponCommand.chains.set(unitId, chain);
      
      // Store chain in unit meta for rendering
      if (!unit.meta) unit.meta = {};
      unit.meta.chainWeapon = true;
      
      console.log(`[ChainWeapon] Equipped chain weapon on ${unitId}`);
      return;
    }
    
    if (action === "swing" && unitId) {
      const unit = this.sim.units.find(u => u.id === unitId);
      const chain = ChainWeaponCommand.chains.get(unitId);
      if (!unit || !chain) return;
      
      const direction = params.direction || unit.meta?.facing || "right";
      const power = params.power || 5;
      
      // Apply swing force to the ball
      const force = {
        x: direction === "right" ? power : direction === "left" ? -power : 0,
        y: direction === "up" ? -power : direction === "down" ? power : 0
      };
      
      chain.applyForce(force);
      
      // Check for collisions with enemies
      const ballPos = chain.getBallPosition();
      if (ballPos) {
        // Convert back to tile coordinates
        const ballTileX = Math.floor(ballPos.x / 8);
        const ballTileY = Math.floor(ballPos.y / 8);
        
        console.log(`[ChainWeapon] Ball position: pixel(${ballPos.x}, ${ballPos.y}) -> tile(${ballTileX}, ${ballTileY})`);
        
        // Find enemies near the ball
        const enemies = this.sim.units.filter(u => {
          if (u.id === unitId || u.team === unit.team || u.hp <= 0) return false;
          
          const dx = u.pos.x - ballTileX;
          const dy = u.pos.y - ballTileY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          console.log(`[ChainWeapon] Checking enemy ${u.id} at (${u.pos.x}, ${u.pos.y}), distance: ${dist}`);
          
          return dist <= 1; // Within 1 tile
        });
        
        console.log(`[ChainWeapon] Found ${enemies.length} enemies near ball`);
        
        // Damage enemies based on ball velocity
        const velocity = chain.getBallVelocity();
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
        const damage = Math.floor(speed * 3); // Damage based on swing speed
        
        console.log(`[ChainWeapon] Ball velocity: (${velocity.x}, ${velocity.y}), speed: ${speed}, damage: ${damage}`);
        
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
      }
      
      console.log(`[ChainWeapon] Swinging chain weapon for ${unitId}`);
      return;
    }
    
    if (action === "update") {
      // Update all chains physics
      for (const [unitId, chain] of ChainWeaponCommand.chains) {
        const unit = this.sim.units.find(u => u.id === unitId);
        if (unit) {
          // Update anchor position to follow hero's hand
          const handX = unit.pos.x * 8 + 8;
          const handY = unit.pos.y * 8 - 4; // Slightly above center
          
          // If hero has a rig, use the actual hand position
          if (unit.meta?.rig && Array.isArray(unit.meta.rig)) {
            const rightArm = unit.meta.rig.find((part: any) => part.name === "rarm");
            if (rightArm && rightArm.offset) {
              chain.setAnchorPosition({
                x: handX + rightArm.offset.x,
                y: handY + rightArm.offset.y
              });
            } else {
              chain.setAnchorPosition({ x: handX, y: handY });
            }
          } else {
            chain.setAnchorPosition({ x: handX, y: handY });
          }
          
          // Update physics
          chain.update(1);
          
          // Store chain data in unit meta for rendering
          if (!unit.meta) unit.meta = {};
          unit.meta.chainLinks = chain.getLinkPositions();
          unit.meta.chainBallPos = chain.getBallPosition();
          
          // Debug: Log chain position periodically
          if (Math.random() < 0.01) {
            console.log(`[ChainWeapon] Chain for ${unitId} - Ball at:`, unit.meta.chainBallPos);
          }
        } else {
          // Remove chain if unit no longer exists
          ChainWeaponCommand.chains.delete(unitId);
        }
      }
    }
  }
}