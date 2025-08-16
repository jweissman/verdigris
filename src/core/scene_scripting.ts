export interface SceneScript {
  events: SceneEvent[];
}

export interface SceneEvent {
  trigger: "timer" | "unit-death" | "wave-cleared" | "weather-change";
  tick?: number;
  unitType?: string;
  action: SceneAction;
}

export interface SceneAction {
  type:
    | "spawn-wave"
    | "change-weather"
    | "trigger-ability"
    | "announce"
    | "modify-spawn-rate";
  params: any;
}

export class SceneScripting {
  private events: SceneEvent[] = [];
  private triggeredEvents: Set<string> = new Set();

  constructor(private sim: any) {}

  parseScriptCommand(command: string, args: string[]): boolean {
    switch (command) {
      case "spawn-wave":
        const tick = parseInt(args[0]);
        const unitType = args[1];
        const count = parseInt(args[2]);
        const formation = args[3];

        this.events.push({
          trigger: "timer",
          tick,
          action: {
            type: "spawn-wave",
            params: { unitType, count, formation },
          },
        });
        return true;

      case "on-death":
        const targetType = args[0];
        const actionType = args[1] as any;
        const spawnType = args[2];
        const spawnCount = parseInt(args[3]);
        const spawnPattern = args[4];

        this.events.push({
          trigger: "unit-death",
          unitType: targetType,
          action: {
            type: actionType,
            params: {
              unitType: spawnType,
              count: spawnCount,
              formation: spawnPattern,
            },
          },
        });
        return true;

      case "weather-cycle":
        const interval = parseInt(args[0]);
        const weatherTypes = args.slice(1);

        weatherTypes.forEach((weather, i) => {
          this.events.push({
            trigger: "timer",
            tick: interval * (i + 1),
            action: {
              type: "change-weather",
              params: { weather, duration: interval },
            },
          });
        });
        return true;

      case "announce":
        const announceTick = parseInt(args[0]);
        const message = args.slice(1).join(" ").replace(/"/g, "");

        this.events.push({
          trigger: "timer",
          tick: announceTick,
          action: {
            type: "announce",
            params: { message },
          },
        });
        return true;

      case "spawn-rate":
        const biome = args[0];
        const multiplier = parseFloat(args[1]);

        this.events.push({
          trigger: "timer",
          tick: 1,
          action: {
            type: "modify-spawn-rate",
            params: { biome, multiplier },
          },
        });
        return true;

      default:
        return false; // Not a script command
    }
  }

  update(): void {
    this.events.forEach((event, index) => {
      const eventId = `${index}_${event.trigger}_${event.tick || 0}`;

      if (this.triggeredEvents.has(eventId)) return;

      let shouldTrigger = false;

      switch (event.trigger) {
        case "timer":
          shouldTrigger = this.sim.ticks >= (event.tick || 0);
          break;

        case "unit-death":
          const deadUnits = this.sim.units.filter(
            (u: any) => u.type === event.unitType && u.hp <= 0,
          );
          shouldTrigger = deadUnits.length > 0;
          break;

        case "wave-cleared":
          const hostileUnits = this.sim.units.filter(
            (u: any) => u.team === "hostile" && u.hp > 0,
          );
          shouldTrigger = hostileUnits.length === 0;
          break;
      }

      if (shouldTrigger) {
        this.executeAction(event.action);
        this.triggeredEvents.add(eventId);
      }
    });
  }

  private executeAction(action: SceneAction): void {
    switch (action.type) {
      case "spawn-wave":
        this.spawnWave(action.params);
        break;

      case "change-weather":
        this.sim.parseCommand(
          `weather ${action.params.weather} ${action.params.duration || 100} 0.7`,
        );
        break;

      case "announce":
        console.warn(`📢 ${action.params.message}`);

        break;

      case "modify-spawn-rate":
        this.sim.queuedCommands.push({
          type: "modify-spawn-rate",
          params: action.params,
        });
        break;
    }
  }

  private spawnWave(params: any): void {
    const { unitType, count, formation } = params;
    const positions = this.getFormationPositions(formation, count);

    positions.forEach((pos, i) => {
      this.sim.queuedCommands.push({
        type: "spawn",
        params: {
          unitType,
          x: pos.x,
          y: pos.y,
        },
        tick: this.sim.ticks + i * 2, // 2 tick stagger
      });
    });
  }

  private getFormationPositions(
    formation: string,
    count: number,
  ): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];

    if (formation.includes("x")) {
      const [cols, rows] = formation.split("x").map((n) => parseInt(n));
      const spacing = 2;

      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.push({
          x: col * spacing + 5,
          y: row * spacing + this.sim.height - 10,
        });
      }
    } else if (formation === "circle") {
      const centerX = this.sim.width / 2;
      const centerY = this.sim.height / 2;
      const radius = 8;

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * 2 * Math.PI;
        positions.push({
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        });
      }
    } else if (formation === "line") {
      const spacing = this.sim.width / (count + 1);
      for (let i = 0; i < count; i++) {
        positions.push({
          x: (i + 1) * spacing,
          y: this.sim.height - 5,
        });
      }
    }

    return positions.slice(0, count);
  }

  reset(): void {
    this.events = [];
    this.triggeredEvents.clear();
  }
}
