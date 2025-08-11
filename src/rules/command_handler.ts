import { Rule } from "./rule";
import { Command } from "./command";
import { Toss } from "../commands/toss";
import { ChangeWeather } from "../commands/change_weather";
import { Deploy } from "../commands/deploy";
import { AirdropCommand } from "../commands/airdrop_command";
import { Lightning } from "../commands/lightning";
import { Grapple } from "../commands/grapple";
import { Pin } from "../commands/pin";
import { Temperature } from "../commands/temperature";
import { Damage } from "../commands/damage";
import { Heal } from "../commands/heal";
import { AoE } from "../commands/aoe";
import { Projectile } from "../commands/projectile";
import { JumpCommand } from "../commands/jump";
import { CleanupCommand } from "../commands/cleanup";
import { RemoveCommand } from "../commands/remove";
import { MoveCommand } from "../commands/move";
import { KnockbackCommand } from "../commands/knockback";
import { UpdateTossCommand } from "../commands/update_toss";
import { ApplyStatusEffectCommand, UpdateStatusEffectsCommand } from "../commands/status_effect";
import { MarkDeadCommand } from "../commands/mark_dead";
import { SetIntendedMoveCommand } from "../commands/set_intended_move";

export type QueuedCommand = {
  type: string;
  params: Record<string, any>; // Named parameters dictionary
  unitId?: string; // Optional for system commands
  tick?: number;
  id?: string; // Unique ID for deduplication
};

export class CommandHandler extends Rule {
  private commands: Map<string, Command> = new Map();

  constructor(sim: any) {
    super(sim);
    // Register available commands
    this.commands.set('toss', new Toss(sim));
    this.commands.set('weather', new ChangeWeather(sim));
    this.commands.set('deploy', new Deploy(sim));
    this.commands.set('spawn', new Deploy(sim)); // Alias for deploy
    this.commands.set('airdrop', new AirdropCommand(sim));
    this.commands.set('drop', new AirdropCommand(sim)); // Alias for airdrop
    this.commands.set('lightning', new Lightning(sim));
    this.commands.set('bolt', new Lightning(sim)); // Alias for lightning
    this.commands.set('grapple', new Grapple(sim));
    this.commands.set('hook', new Grapple(sim)); // Alias for grapple
    this.commands.set('pin', new Pin(sim));
    this.commands.set('temperature', new Temperature(sim));
    this.commands.set('temp', new Temperature(sim)); // Alias
    // JSON Abilities commands
    this.commands.set('damage', new Damage(sim));
    this.commands.set('heal', new Heal(sim));
    this.commands.set('aoe', new AoE(sim));
    this.commands.set('projectile', new Projectile(sim));
    this.commands.set('jump', new JumpCommand(sim));
    // System commands
    this.commands.set('cleanup', new CleanupCommand(sim));
    this.commands.set('remove', new RemoveCommand(sim));
    this.commands.set('move', new MoveCommand(sim));
    this.commands.set('knockback', new KnockbackCommand(sim));
    this.commands.set('updateToss', new UpdateTossCommand(sim));
    this.commands.set('applyStatusEffect', new ApplyStatusEffectCommand(sim));
    this.commands.set('updateStatusEffects', new UpdateStatusEffectsCommand(sim));
    this.commands.set('markDead', new MarkDeadCommand(sim));
    this.commands.set('setIntendedMove', new SetIntendedMoveCommand(sim));
  }

  apply = () => {
    // Early exit if nothing to process
    if (!this.sim.queuedCommands?.length && !this.sim.queuedEvents?.length) {
      return;
    }
    
    // Keep processing commands and events until there are none left (fixpoint)
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops
    const processedCommandIds = new Set<string>(); // Track processed command IDs
    
    while (iterations < maxIterations) {
      iterations++;
      let didWork = false;
      
      // Process commands
      if (this.sim.queuedCommands?.length > 0) {
        didWork = true;
        const commandsToProcess = [];
        const commandsToKeep = [];
        
        for (const queuedCommand of this.sim.queuedCommands) {
          if (queuedCommand.tick !== undefined && queuedCommand.tick > this.sim.ticks) {
            commandsToKeep.push(queuedCommand);
          } else {
            // If command has an ID, check if we've already processed it
            if (queuedCommand.id && processedCommandIds.has(queuedCommand.id)) {
              continue; // Skip duplicate
            }
            
            // Mark as processed if it has an ID
            if (queuedCommand.id) {
              processedCommandIds.add(queuedCommand.id);
            }
            
            commandsToProcess.push(queuedCommand);
          }
        }
        
        for (const queuedCommand of commandsToProcess) {
          if (!queuedCommand.type) continue;
          
          const command = this.commands.get(queuedCommand.type);
          if (command) {
            command.execute(queuedCommand.unitId || null, queuedCommand.params);
          }
        }
        
        this.sim.queuedCommands = commandsToKeep;
        
        // Commit Transform changes after processing commands
        const transform = this.sim.getTransform();
        if (transform) {
          transform.commit();
        }
      }
      
      // Process events (which may create new commands)
      if (this.sim.queuedEvents?.length > 0) {
        didWork = true;
        const eventHandler = this.sim.rulebook.find(r => r.constructor.name === 'EventHandler');
        if (eventHandler) {
          eventHandler.apply();
        }
      }
      
      // If nothing was processed, we're done
      if (!didWork) break;
    }
  }
  
  // Convert legacy args to params based on command type
  private convertArgsToParams(commandType: string, args: any[]): Record<string, any> {
    // Map command types to convert legacy args to params
    switch (commandType) {
      case 'projectile':
        // args: [type, startX, startY, targetX?, targetY?, damage?, radius?, team?]
        return {
          projectileType: args[0],
          x: parseFloat(args[1]),
          y: parseFloat(args[2]),
          targetX: args[3] ? parseFloat(args[3]) : undefined,
          targetY: args[4] ? parseFloat(args[4]) : undefined,
          damage: args[5] ? parseInt(args[5]) : undefined,
          radius: args[6] ? parseFloat(args[6]) : undefined,
          team: args[7]
        };
        
      case 'toss':
        // args can be [direction, force?, distance?] or [targetId, distance]
        if (typeof args[0] === 'object' && args[0].x !== undefined) {
          // Direction-based toss
          return {
            direction: args[0],
            force: args[1] || 5,
            distance: args[2] || 3
          };
        } else {
          // Target-based toss (from abilities)
          return {
            targetId: args[0],
            distance: parseInt(args[1]) || 5
          };
        }
        
      case 'weather':
        // args: [weatherType, duration?, intensity?]
        return {
          weatherType: args[0],
          duration: args[1] ? parseInt(args[1]) : undefined,
          intensity: args[2] ? parseFloat(args[2]) : undefined
        };
        
      case 'airdrop':
      case 'drop':
        // args: [unitType, x, y]
        return {
          unitType: args[0],
          x: parseFloat(args[1]),
          y: parseFloat(args[2])
        };
        
      case 'deploy':
      case 'spawn':
        // args: [unitType, x?, y?]
        return {
          unitType: args[0],
          x: args[1] ? parseFloat(args[1]) : undefined,
          y: args[2] ? parseFloat(args[2]) : undefined
        };
        
      case 'temperature':
      case 'temp':
        // args can be: [amount] for global, or [x, y, amount, radius?] for local
        if (args.length === 1) {
          // Global temperature setting
          return {
            amount: parseFloat(args[0])
          };
        } else {
          // Local temperature at position
          return {
            x: parseFloat(args[0]),
            y: parseFloat(args[1]),
            amount: parseFloat(args[2]),
            radius: args[3] ? parseFloat(args[3]) : 3
          };
        }
        
      case 'lightning':
      case 'bolt':
        // args: [x?, y?]
        return {
          x: args[0] ? parseFloat(args[0]) : undefined,
          y: args[1] ? parseFloat(args[1]) : undefined
        };
        
      case 'jump':
        // args: [targetX, targetY, height?, damage?, radius?]
        return {
          targetX: parseFloat(args[0]),
          targetY: parseFloat(args[1]),
          height: args[2] ? parseFloat(args[2]) : 5,
          damage: args[3] ? parseFloat(args[3]) : 5,
          radius: args[4] ? parseFloat(args[4]) : 3
        };
        
      case 'damage':
        // args: [targetId, amount, aspect?]
        return {
          targetId: args[0],
          amount: parseInt(args[1]) || 0,
          aspect: args[2] || 'physical'
        };
        
      case 'heal':
        // args: [targetId, amount, aspect?]
        return {
          targetId: args[0],
          amount: parseInt(args[1]) || 0,
          aspect: args[2] || 'healing'
        };
        
      default:
        // For unknown commands, return empty params
        console.warn(`Unknown command type ${commandType} - cannot convert args to params`);
        return {};
    }
  }
}