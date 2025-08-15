import { Rule } from "./rule";
import { Command } from "./command";
import type { TickContext } from "../core/tick_context";
import { EventHandler } from "./event_handler";
import { Toss } from "../commands/toss";
import { ChangeWeather } from "../commands/change_weather";
import { Deploy } from "../commands/deploy";
import { Airdrop } from "../commands/airdrop";
import { BoltCommand } from "../commands/bolt";
import { StormCommand } from "../commands/storm";
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
// UpdateTossCommand replaced by unified MoveCommand
import { ApplyStatusEffectCommand, UpdateStatusEffectsCommand } from "../commands/status_effect";
import { Kill } from "../commands/kill";
import { HaltCommand } from "../commands/halt";
import { MetaCommand } from "../commands/meta";
import { PullCommand } from "../commands/pull";
import { BurrowCommand } from "../commands/burrow";
import { CharmCommand } from "../commands/charm";
import { SpawnCommand } from "../commands/spawn";
import { PoseCommand } from "../commands/pose";
import { TargetCommand } from "../commands/target";
import { GuardCommand } from "../commands/guard";
import { FaceCommand } from "../commands/face";
import { ForcesCommand } from "../commands/forces";
import { AICommand } from "../commands/ai";
import { SimulateCommand } from "../commands/simulate";
import { Wander } from "../commands/wander";
import { RemoveProjectileCommand } from "../commands/update_projectile";
import { ParticleCommand } from "../commands/particle";

export type QueuedCommand = {
  type: string;
  params: Record<string, any>; // Named parameters dictionary
  unitId?: string; // Optional for system commands
  tick?: number;
  id?: string; // Unique ID for deduplication
};

export class CommandHandler extends Rule {
  private commands: Map<string, Command> = new Map();
  private transform: any; // Transform object for mutations
  private sim: any;

  constructor(sim: any, transform?: any) {
    super();
    this.sim = sim;
    this.transform = transform || sim.getTransform();
    
    // Register available commands - pass transform to each
    this.commands.set('toss', new Toss(sim, this.transform));
    this.commands.set('weather', new ChangeWeather(sim, this.transform));
    this.commands.set('deploy', new Deploy(sim, this.transform));
    this.commands.set('spawn', new Deploy(sim, this.transform)); // Alias for deploy
    this.commands.set('airdrop', new Airdrop(sim, this.transform));
    this.commands.set('drop', new Airdrop(sim, this.transform)); // Alias for airdrop
    this.commands.set('bolt', new BoltCommand(sim));
    this.commands.set('lightning', new BoltCommand(sim)); // Alias for compatibility
    this.commands.set('storm', new StormCommand(sim));
    this.commands.set('grapple', new Grapple(sim, this.transform));
    this.commands.set('hook', new Grapple(sim, this.transform)); // Alias for grapple
    this.commands.set('pin', new Pin(sim, this.transform));
    this.commands.set('temperature', new Temperature(sim, this.transform));
    this.commands.set('temp', new Temperature(sim, this.transform)); // Alias
    this.commands.set('wander', new Wander(sim, this.transform));
    // JSON Abilities commands
    this.commands.set('damage', new Damage(sim, this.transform));
    this.commands.set('heal', new Heal(sim, this.transform));
    this.commands.set('aoe', new AoE(sim, this.transform));
    this.commands.set('projectile', new Projectile(sim, this.transform));
    this.commands.set('jump', new JumpCommand(sim, this.transform));
    // System commands
    this.commands.set('cleanup', new CleanupCommand(sim, this.transform));
    this.commands.set('remove', new RemoveCommand(sim, this.transform));
    this.commands.set('move', new MoveCommand(sim, this.transform));
    this.commands.set('knockback', new KnockbackCommand(sim, this.transform));
    // updateToss replaced by unified move command
    this.commands.set('applyStatusEffect', new ApplyStatusEffectCommand(sim, this.transform));
    this.commands.set('updateStatusEffects', new UpdateStatusEffectsCommand(sim, this.transform));
    this.commands.set('markDead', new Kill(sim, this.transform));
    this.commands.set('halt', new HaltCommand(sim, this.transform));
    this.commands.set('meta', new MetaCommand(sim, this.transform));
    this.commands.set('pull', new PullCommand(sim, this.transform));
    this.commands.set('burrow', new BurrowCommand(sim, this.transform));
    this.commands.set('charm', new CharmCommand(sim, this.transform));
    this.commands.set('changeTeam', new CharmCommand(sim, this.transform)); // Alias
    this.commands.set('spawn', new SpawnCommand(sim, this.transform));
    this.commands.set('add', new SpawnCommand(sim, this.transform)); // Alias for backwards compatibility
    // Sharp semantic commands
    this.commands.set('pose', new PoseCommand(sim, this.transform));
    this.commands.set('target', new TargetCommand(sim, this.transform));
    this.commands.set('guard', new GuardCommand(sim, this.transform));
    this.commands.set('face', new FaceCommand(sim, this.transform));
    
    // Higher-order bulk commands for performance
    this.commands.set('forces', new ForcesCommand(sim, this.transform));
    this.commands.set('ai', new AICommand(sim, this.transform));
    this.commands.set('simulate', new SimulateCommand(sim, this.transform));
    
    // Projectile commands
    this.commands.set('removeProjectile', new RemoveProjectileCommand(sim, this.transform));
    
    // Effect commands
    this.commands.set('particle', new ParticleCommand(sim, this.transform));
  }

  execute(context: TickContext): void {
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
        
        // Track command counts for profiling
        const commandCounts: { [key: string]: number } = {};
        
        // Batch commands per unit to reduce processing overhead
        const metaBatch: { [unitId: string]: any } = {};
        const moveBatch: { [unitId: string]: any } = {};
        const otherCommands: any[] = [];
        
        for (const queuedCommand of commandsToProcess) {
          if (!queuedCommand.type) continue;
          
          commandCounts[queuedCommand.type] = (commandCounts[queuedCommand.type] || 0) + 1;
          
          // Batch meta commands
          if (queuedCommand.type === 'meta' && queuedCommand.params?.unitId) {
            const unitId = queuedCommand.params.unitId as string;
            if (!metaBatch[unitId]) {
              metaBatch[unitId] = { meta: {}, state: null };
            }
            if (queuedCommand.params.meta !== undefined) {
              // Filter out undefined values that would delete properties
              const cleanMeta = {};
              for (const [key, value] of Object.entries(queuedCommand.params.meta)) {
                if (value !== undefined) {
                  cleanMeta[key] = value;
                }
              }
              
              // Only assign if there are actual values to update
              if (Object.keys(cleanMeta).length > 0) {
                Object.assign(metaBatch[unitId].meta, cleanMeta);
              }
            }
            if (queuedCommand.params.state) {
              metaBatch[unitId].state = queuedCommand.params.state;
            }
          }
          // Batch move commands (last move wins)
          else if (queuedCommand.type === 'move' && queuedCommand.params?.unitId) {
            const unitId = queuedCommand.params.unitId as string;
            moveBatch[unitId] = queuedCommand.params; // Last move command wins
          } else {
            otherCommands.push(queuedCommand);
          }
        }
        
        // Process batched meta commands
        const metaCommand = this.commands.get('meta');
        if (metaCommand) {
          for (const [unitId, updates] of Object.entries(metaBatch)) {
            // MetaCommand expects params format with unitId and meta properties
            const params = {
              unitId: unitId,
              meta: updates.meta,
              state: updates.state
            };
            metaCommand.execute(null, params);
          }
        }
        
        // Process batched move commands
        // TODO: Consider adding a batch move API to Transform for performance
        const moveCommand = this.commands.get('move');
        if (moveCommand) {
          for (const [unitId, params] of Object.entries(moveBatch)) {
            moveCommand.execute(unitId, params);
          }
        }
        
        // Process other commands
        for (const queuedCommand of otherCommands) {
          const command = this.commands.get(queuedCommand.type);
          if (command) {
            command.execute(queuedCommand.unitId || null, queuedCommand.params);
          }
        }
        
        // Log command counts if profiling enabled
        if (this.sim.enableProfiling && Object.keys(commandCounts).length > 0) {
          const total = Object.values(commandCounts).reduce((a, b) => a + b, 0);
          if (total > 0) { // Always log when profiling
            // console.log(`[Step ${this.sim.ticks}] Processed ${total} commands:`, JSON.stringify(commandCounts));
          }
        }
        
        // Merge commands to keep with any new commands added during processing
        this.sim.queuedCommands = [...commandsToKeep, ...this.sim.queuedCommands.filter(c => !commandsToProcess.includes(c) && !commandsToKeep.includes(c))];
        
        // Commit Transform changes after processing commands
        if (this.transform) {
          this.transform.commit();
        }
      }
      
      // Process events (which may create new commands)
      if (this.sim.queuedEvents?.length > 0) {
        didWork = true;
        // Store events before processing
        const eventsToProcess = [...this.sim.queuedEvents];
        
        // Create a temporary EventHandler to process events
        const eventHandler = new EventHandler();
        eventHandler.execute(context);
        
        // Record processed events
        this.sim.recordProcessedEvents(eventsToProcess);
        // Clear events after processing
        this.sim.queuedEvents = [];
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
        
      case 'storm':
        // args: [action] - 'start' or 'stop'
        return {
          action: args[0] || 'start'
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