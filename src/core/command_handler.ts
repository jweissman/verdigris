import { Rule } from "../rules/rule";
import { Command } from "../rules/command";
import type { TickContext } from "./tick_context";
import { EventHandler } from "../rules/event_handler";
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
import { StrikeCommand } from "../commands/strike";
import { CleanupCommand } from "../commands/cleanup";
import { RemoveCommand } from "../commands/remove";
import { MoveCommand } from "../commands/move";
import { KnockbackCommand } from "../commands/knockback";

import {
  ApplyStatusEffectCommand,
  UpdateStatusEffectsCommand,
} from "../commands/status_effect";
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
import { ParticlesBatchCommand } from "../commands/particles_batch";
import { HumidityCommand } from "../commands/humidity";
import { MovesCommand } from "../commands/moves";
import { EffectsCommand } from "../commands/effects";
import { AbilityEffectsCommand } from "../commands/ability_effects";

export type QueuedCommand = {
  type: string;
  params: Record<string, any>; // Named parameters dictionary
  unitId?: string; // Optional for system commands
  tick?: number;
  id?: string; // Unique ID for deduplication
};

export class CommandHandler {
  private commands: Map<string, Command> = new Map();
  private transform: any; // Transform object for mutations
  private sim: any;

  constructor(sim: any, transform?: any) {
    this.sim = sim;
    this.transform = transform || sim.getTransform();

    this.commands.set("toss", new Toss(sim, this.transform));
    this.commands.set("weather", new ChangeWeather(sim));
    this.commands.set("deploy", new Deploy(sim));
    this.commands.set("spawn", new Deploy(sim, this.transform)); // Alias for deploy
    this.commands.set("airdrop", new Airdrop(sim, this.transform));
    this.commands.set("drop", new Airdrop(sim, this.transform)); // Alias for airdrop
    this.commands.set("bolt", new BoltCommand(sim));
    this.commands.set("lightning", new BoltCommand(sim)); // Alias for compatibility
    this.commands.set("storm", new StormCommand(sim));
    this.commands.set("grapple", new Grapple(sim, this.transform));
    this.commands.set("hook", new Grapple(sim, this.transform)); // Alias for grapple
    this.commands.set("pin", new Pin(sim, this.transform));
    this.commands.set("temperature", new Temperature(sim, this.transform));
    this.commands.set("temp", new Temperature(sim, this.transform)); // Alias
    this.commands.set("wander", new Wander(sim, this.transform));

    this.commands.set("damage", new Damage(sim, this.transform));
    this.commands.set("heal", new Heal(sim, this.transform));
    this.commands.set("aoe", new AoE(sim, this.transform));
    this.commands.set("projectile", new Projectile(sim, this.transform));
    this.commands.set("jump", new JumpCommand(sim, this.transform));
    this.commands.set("strike", new StrikeCommand(sim, this.transform));
    this.commands.set("attack", new StrikeCommand(sim, this.transform)); // Alias

    this.commands.set("cleanup", new CleanupCommand(sim));
    this.commands.set("remove", new RemoveCommand(sim));
    this.commands.set("move", new MoveCommand(sim));
    this.commands.set("moves", new MovesCommand(sim));
    this.commands.set("knockback", new KnockbackCommand(sim));

    this.commands.set("applyStatusEffect", new ApplyStatusEffectCommand(sim));
    this.commands.set(
      "updateStatusEffects",
      new UpdateStatusEffectsCommand(sim),
    );
    this.commands.set("markDead", new Kill(sim));
    this.commands.set("halt", new HaltCommand(sim, this.transform));
    this.commands.set("meta", new MetaCommand(sim, this.transform));
    this.commands.set("pull", new PullCommand(sim, this.transform));
    this.commands.set("burrow", new BurrowCommand(sim, this.transform));
    this.commands.set("charm", new CharmCommand(sim, this.transform));
    this.commands.set("changeTeam", new CharmCommand(sim, this.transform)); // Alias
    this.commands.set("spawn", new SpawnCommand(sim, this.transform));
    this.commands.set("add", new SpawnCommand(sim, this.transform)); // Alias for backwards compatibility

    this.commands.set("pose", new PoseCommand(sim, this.transform));
    this.commands.set("target", new TargetCommand(sim, this.transform));
    this.commands.set("guard", new GuardCommand(sim, this.transform));
    this.commands.set("face", new FaceCommand(sim, this.transform));

    this.commands.set("forces", new ForcesCommand(sim, this.transform));
    this.commands.set("ai", new AICommand(sim, this.transform));
    this.commands.set("simulate", new SimulateCommand(sim, this.transform));

    this.commands.set(
      "removeProjectile",
      new RemoveProjectileCommand(sim, this.transform),
    );

    this.commands.set("particle", new ParticleCommand(sim, this.transform));
    this.commands.set(
      "particles",
      new ParticlesBatchCommand(sim, this.transform),
    );

    this.commands.set("toss", new Toss(sim, this.transform));
    this.commands.set("humidity", new HumidityCommand(sim, this.transform));
    this.commands.set("effects", new EffectsCommand(sim, this.transform));
    this.commands.set(
      "ability_effects",
      new AbilityEffectsCommand(sim, this.transform),
    );
  }

  private executeOne(
    queuedCommand: QueuedCommand,
    context: TickContext,
  ): boolean {
    if (!queuedCommand.type) return false;

    const command = this.commands.get(queuedCommand.type);
    if (command) {
      command.execute(queuedCommand.unitId || null, queuedCommand.params);
      return true;
    }

    return false;
  }

  execute(context: TickContext): Command[] {
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (
      (this.sim.queuedCommands?.length > 0 ||
        this.sim.queuedEvents?.length > 0) &&
      iterations < maxIterations
    ) {
      iterations++;
      this.executeOnce(context);
    }

    if (iterations >= maxIterations) {
      console.warn(
        `Command handler hit max iterations (${maxIterations}) - possible infinite loop`,
      );
    }

    return [];
  }

  private executeOnce(context: TickContext): void {
    if (!this.sim.queuedCommands?.length && !this.sim.queuedEvents?.length) {
      return;
    }

    const processedCommandIds = new Set<string>(); // Track processed command IDs

    if (this.sim.queuedCommands?.length > 0) {
      const commandsToProcess = [];
      const commandsToKeep = [];

      for (const queuedCommand of this.sim.queuedCommands) {
        if (
          queuedCommand.tick !== undefined &&
          queuedCommand.tick > this.sim.ticks
        ) {
          commandsToKeep.push(queuedCommand);
        } else {
          if (queuedCommand.id && processedCommandIds.has(queuedCommand.id)) {
            continue; // Skip duplicate
          }

          if (queuedCommand.id) {
            processedCommandIds.add(queuedCommand.id);
          }

          commandsToProcess.push(queuedCommand);
        }
      }

      const commandCounts: { [key: string]: number } = {};

      const metaBatch: { [unitId: string]: any } = {};
      const moveBatch: { [unitId: string]: any } = {};
      const otherCommands: any[] = [];

      for (const queuedCommand of commandsToProcess) {
        if (!queuedCommand.type) continue;

        commandCounts[queuedCommand.type] =
          (commandCounts[queuedCommand.type] || 0) + 1;

        if (queuedCommand.type === "meta" && queuedCommand.params?.unitId) {
          const unitId = queuedCommand.params.unitId as string;
          if (!metaBatch[unitId]) {
            metaBatch[unitId] = { meta: {}, state: null };
          }
          if (queuedCommand.params.meta !== undefined) {
            const cleanMeta = {};
            for (const [key, value] of Object.entries(
              queuedCommand.params.meta,
            )) {
              if (value !== undefined) {
                cleanMeta[key] = value;
              }
            }

            if (Object.keys(cleanMeta).length > 0) {
              Object.assign(metaBatch[unitId].meta, cleanMeta);
            }
          }
          if (queuedCommand.params.state) {
            metaBatch[unitId].state = queuedCommand.params.state;
          }
        } else if (
          queuedCommand.type === "move" &&
          queuedCommand.params?.unitId
        ) {
          const unitId = queuedCommand.params.unitId as string;
          moveBatch[unitId] = queuedCommand.params; // Last move command wins
        } else {
          otherCommands.push(queuedCommand);
        }
      }

      const metaCommand = this.commands.get("meta");
      if (metaCommand) {
        for (const [unitId, updates] of Object.entries(metaBatch)) {
          const params = {
            unitId: unitId,
            meta: updates.meta,
            state: updates.state,
          };
          metaCommand.execute(null, params);
        }
      }

      const moveCommand = this.commands.get("move");
      if (moveCommand && Object.keys(moveBatch).length > 0) {
        const moveEntries = Object.entries(moveBatch);
        for (const [unitId, params] of moveEntries) {
          moveCommand.execute(unitId, params);
        }
      }

      const commandsByType = new Map<string, QueuedCommand[]>();
      for (const queuedCommand of otherCommands) {
        if (!queuedCommand.type) continue;
        if (!commandsByType.has(queuedCommand.type)) {
          commandsByType.set(queuedCommand.type, []);
        }
        commandsByType.get(queuedCommand.type)!.push(queuedCommand);
      }

      for (const [cmdType, cmds] of commandsByType) {
        const command = this.commands.get(cmdType);
        if (command) {
          for (const queuedCommand of cmds) {
            command.execute(queuedCommand.unitId || null, queuedCommand.params);
          }
        }
      }

      const newCommands: QueuedCommand[] = [];
      for (const cmd of this.sim.queuedCommands) {
        if (!commandsToProcess.includes(cmd) && !commandsToKeep.includes(cmd)) {
          newCommands.push(cmd);
        }
      }

      if (newCommands.length > 0) {
      }

      this.sim.queuedCommands = [...commandsToKeep, ...newCommands];

      if (this.transform) {
        this.transform.commit();
      }
    }

    if (this.sim.queuedEvents?.length > 0) {
      const eventsToProcess = [...this.sim.queuedEvents];

      const eventHandler = new EventHandler();
      const eventCommands = eventHandler.execute(context);

      if (eventCommands && eventCommands.length > 0) {
        this.sim.queuedCommands.push(...eventCommands);
      }

      this.sim.recordProcessedEvents(eventsToProcess);

      this.sim.queuedEvents = [];
    }
  }

  private convertArgsToParams(
    commandType: string,
    args: any[],
  ): Record<string, any> {
    switch (commandType) {
      case "projectile":
        return {
          projectileType: args[0],
          x: parseFloat(args[1]),
          y: parseFloat(args[2]),
          targetX: args[3] ? parseFloat(args[3]) : undefined,
          targetY: args[4] ? parseFloat(args[4]) : undefined,
          damage: args[5] ? parseInt(args[5]) : undefined,
          radius: args[6] ? parseFloat(args[6]) : undefined,
          team: args[7],
        };

      case "toss":
        if (typeof args[0] === "object" && args[0].x !== undefined) {
          return {
            direction: args[0],
            force: args[1] || 5,
            distance: args[2] || 3,
          };
        } else {
          return {
            targetId: args[0],
            distance: parseInt(args[1]) || 5,
          };
        }

      case "weather":
        return {
          weatherType: args[0],
          duration: args[1] ? parseInt(args[1]) : undefined,
          intensity: args[2] ? parseFloat(args[2]) : undefined,
        };

      case "airdrop":
      case "drop":
        return {
          unitType: args[0],
          x: parseFloat(args[1]),
          y: parseFloat(args[2]),
        };

      case "deploy":
      case "spawn":
        return {
          unitType: args[0],
          x: args[1] ? parseFloat(args[1]) : undefined,
          y: args[2] ? parseFloat(args[2]) : undefined,
        };

      case "temperature":
      case "temp":
        if (args.length === 1) {
          return {
            amount: parseFloat(args[0]),
          };
        } else {
          return {
            x: parseFloat(args[0]),
            y: parseFloat(args[1]),
            amount: parseFloat(args[2]),
            radius: args[3] ? parseFloat(args[3]) : 3,
          };
        }

      case "lightning":
      case "bolt":
        return {
          x: args[0] ? parseFloat(args[0]) : undefined,
          y: args[1] ? parseFloat(args[1]) : undefined,
        };

      case "storm":
        return {
          action: args[0] || "start",
        };

      case "particle":
        if (typeof args === "object" && !Array.isArray(args)) {
          return args; // Already an object with particle data
        }
        return args[0] || {};

      case "jump":
        return {
          targetX: parseFloat(args[0]),
          targetY: parseFloat(args[1]),
          height: args[2] ? parseFloat(args[2]) : 5,
          damage: args[3] ? parseFloat(args[3]) : 5,
          radius: args[4] ? parseFloat(args[4]) : 3,
        };

      case "damage":
        return {
          targetId: args[0],
          amount: parseInt(args[1]) || 0,
          aspect: args[2] || "physical",
        };

      case "heal":
        return {
          targetId: args[0],
          amount: parseInt(args[1]) || 0,
          aspect: args[2] || "healing",
        };

      default:
        console.warn(
          `Unknown command type ${commandType} - cannot convert args to params`,
        );
        return {};
    }
  }
}
