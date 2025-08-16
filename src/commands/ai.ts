import { Command } from "../rules/command";
import { Simulator } from "../core/simulator";

/**
 * Higher-order 'ai' command - bulk AI processing and intent setting
 * Replaces individual target/pose commands with vectorized AI updates
 */
export class AICommand extends Command {
  private transform: any;

  constructor(sim: any, transform: any) {
    super(sim);
    this.transform = transform;
  }

  execute(unitId: string | null, params: Record<string, any>): void {
    this.processAllAI();

    this.handleWoodlandSummoning();
  }

  private processAllAI(): void {
    const proxyManager = this.sim.getProxyManager();
    if (proxyManager) {
      this.processAIBatched();
    } else {
      this.processAllAILegacy();
    }
  }

  private processAIBatched(): void {
    const postures = new Map<string, string>();
    for (const unit of this.sim.units) {
      if (unit.state !== "dead") {
        let posture = unit.posture || unit.meta?.posture;
        if (!posture && unit.tags) {
          if (unit.tags.includes("hunt")) posture = "hunt";
          else if (unit.tags.includes("guard")) posture = "guard";
          else if (unit.tags.includes("swarm")) posture = "swarm";
          else if (unit.tags.includes("wander")) posture = "wander";
          else if (unit.tags.includes("aggressive")) posture = "bully";
        }
        postures.set(unit.id, posture || "wait");
      }
    }

    const proxyManager = this.sim.getProxyManager();
    if (!proxyManager) {
      return;
    }
    const moves = proxyManager.batchProcessAI(postures);

    for (const [unitId, move] of moves) {
      if (move.dx !== 0 || move.dy !== 0) {
        this.sim.queuedCommands.push({
          type: "move",
          params: { unitId, dx: move.dx, dy: move.dy },
        });
      }
    }
  }

  private processAIVectorizedOLD_REMOVED(arrays: any): void {
    const capacity = arrays.capacity;
    const searchRadius = 15;
    const MAX_SEARCH_RADIUS_SQ = searchRadius * searchRadius;

    const closestEnemy = new Int16Array(capacity);
    const closestAlly = new Int16Array(capacity);
    const enemyDistSq = new Float32Array(capacity);
    const allyDistSq = new Float32Array(capacity);

    enemyDistSq.fill(Infinity);
    allyDistSq.fill(Infinity);
    closestEnemy.fill(-1);
    closestAlly.fill(-1);

    const gridSize = 5; // 5x5 cells for search radius
    const gridWidth = Math.ceil(this.sim.fieldWidth / gridSize);
    const gridHeight = Math.ceil(this.sim.fieldHeight / gridSize);
    const grid = new Array(gridWidth * gridHeight);
    for (let i = 0; i < grid.length; i++) {
      grid[i] = [];
    }

    for (let i = 0; i < capacity; i++) {
      if (arrays.active[i] === 0 || arrays.state[i] === 3) continue;
      const gx = Math.floor(arrays.posX[i] / gridSize);
      const gy = Math.floor(arrays.posY[i] / gridSize);
      const gridIdx = gy * gridWidth + gx;
      if (grid[gridIdx]) grid[gridIdx].push(i);
    }

    for (let i = 0; i < capacity; i++) {
      if (arrays.active[i] === 0 || arrays.state[i] === 3) continue;

      const x1 = arrays.posX[i];
      const y1 = arrays.posY[i];
      const team1 = arrays.team[i];

      const gx = Math.floor(x1 / gridSize);
      const gy = Math.floor(y1 / gridSize);
      const searchCells = Math.ceil(searchRadius / gridSize);

      for (let dy = -searchCells; dy <= searchCells; dy++) {
        for (let dx = -searchCells; dx <= searchCells; dx++) {
          const checkGx = gx + dx;
          const checkGy = gy + dy;

          if (
            checkGx < 0 ||
            checkGx >= gridWidth ||
            checkGy < 0 ||
            checkGy >= gridHeight
          )
            continue;

          const gridIdx = checkGy * gridWidth + checkGx;
          const cellUnits = grid[gridIdx];
          if (!cellUnits) continue;

          for (const j of cellUnits) {
            if (i === j) continue;

            const dx = arrays.posX[j] - x1;
            const dy = arrays.posY[j] - y1;
            const distSq = dx * dx + dy * dy;

            if (distSq > MAX_SEARCH_RADIUS_SQ) continue;

            if (arrays.team[j] !== team1) {
              if (distSq < enemyDistSq[i]) {
                enemyDistSq[i] = distSq;
                closestEnemy[i] = j;
              }
            } else {
              if (distSq < allyDistSq[i]) {
                allyDistSq[i] = distSq;
                closestAlly[i] = j;
              }
            }
          }
        }
      }
    }

    for (let i = 0; i < capacity; i++) {
      if (arrays.active[i] === 0 || arrays.state[i] === 3) continue;

      const unitId = arrays.unitIds[i];
      const meta = this.sim.getUnitColdData().get(unitId);
      const tags = meta?.tags;
      const posture = meta?.posture || meta?.meta?.posture;

      if (!tags && !posture) {
        if (arrays.intendedMoveX[i] !== 0 || arrays.intendedMoveY[i] !== 0) {
          continue; // Keep existing movement
        }
      }

      let dx = 0,
        dy = 0;

      if (
        (posture === "hunt" || tags?.includes("hunt")) &&
        closestEnemy[i] >= 0
      ) {
        const targetIdx = closestEnemy[i];
        const targetX = arrays.posX[targetIdx];
        const targetY = arrays.posY[targetIdx];

        const diffX = targetX - arrays.posX[i];
        const diffY = targetY - arrays.posY[i];

        if (Math.abs(diffX) > Math.abs(diffY)) {
          dx = diffX > 0 ? 1 : -1;
        } else if (Math.abs(diffY) > 0) {
          dy = diffY > 0 ? 1 : -1;
        }
      } else if (tags?.includes("wander")) {
        const UnitMovement = this.sim.rulebook.find(
          (r) => r.constructor.name === "UnitMovement",
        )?.constructor as any;
        const wanderRate = UnitMovement?.wanderRate || 0.15;

        if (Simulator.rng.random() < wanderRate) {
          const dir = Math.floor(Simulator.rng.random() * 4);
          switch (dir) {
            case 0:
              dx = 1;
              break;
            case 1:
              dx = -1;
              break;
            case 2:
              dy = 1;
              break;
            case 3:
              dy = -1;
              break;
          }
        }
      }

      arrays.intendedMoveX[i] = dx;
      arrays.intendedMoveY[i] = dy;
    }
  }

  private processAllAILegacy(): void {
    const units = this.sim.units;

    const targetMap = new Map<string, string | null>();
    const allyMap = new Map<string, string | null>();

    const searchRadius = 15;
    const MAX_SEARCH_RADIUS = searchRadius * searchRadius;

    // Use spatial queries instead of O(n²) nested loops
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      if (unit.state === "dead" || unit.hp <= 0) continue;

      if (unit.meta.phantom) continue;

      if (units.length > 100 && i % 3 !== 0) continue;

      let closestEnemy: any = null;
      let closestAlly: any = null;
      let closestEnemyDist = Infinity;
      let closestAllyDist = Infinity;

      // Use spatial queries to get only nearby units - O(log n) instead of O(n)
      const nearbyUnits = this.sim.getUnitsNear(unit.pos.x, unit.pos.y, searchRadius);

      for (const other of nearbyUnits) {
        if (other.state === "dead" || other.hp <= 0) continue;
        if (other.id === unit.id) continue;

        if (other.meta.phantom) continue;

        const dx = other.pos.x - unit.pos.x;
        const dy = other.pos.y - unit.pos.y;
        const dist = dx * dx + dy * dy;

        if (dist > MAX_SEARCH_RADIUS) continue;

        if (other.team !== unit.team) {
          if (dist < closestEnemyDist) {
            closestEnemyDist = dist;
            closestEnemy = other;
          }
        } else {
          if (dist < closestAllyDist) {
            closestAllyDist = dist;
            closestAlly = other;
          }
        }
      }

      targetMap.set(unit.id, closestEnemy?.id || null);
      allyMap.set(unit.id, closestAlly?.id || null);
    }

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      if (unit.state === "dead" || unit.hp <= 0) continue;
      if (unit.meta.jumping) continue;

      if (unit.meta.phantom) continue;

      const hasAIBehavior =
        unit.tags?.length || unit.posture || unit.meta.posture;
      if (
        !hasAIBehavior &&
        unit.intendedMove &&
        (unit.intendedMove.x !== 0 || unit.intendedMove.y !== 0)
      ) {
        continue; // Let them keep their existing intendedMove
      }

      const targetId = targetMap.get(unit.id);
      const allyId = allyMap.get(unit.id);

      if (targetId !== unit.meta.intendedTarget) {
        this.sim.queuedCommands.push({
          type: "target",
          params: { unitId: unit.id, targetId },
        });
      }

      let posture = unit.meta.posture || unit.posture;
      if (!posture && unit.tags) {
        if (unit.tags.includes("wander")) posture = "wander";
        else if (unit.tags.includes("hunt")) posture = "hunt";
        else if (unit.tags.includes("guard")) posture = "guard";
        else if (unit.tags.includes("swarm")) posture = "swarm";
      }
      if (!posture) posture = hasAIBehavior ? "hunt" : "wait";

      let intendedMove = { x: 0, y: 0 };

      if (posture === "hunt" && targetId) {
        const target = units.find((u) => u.id === targetId);
        if (target) {
          const dx = target.pos.x - unit.pos.x;
          const dy = target.pos.y - unit.pos.y;

          if (Math.abs(dx) > Math.abs(dy)) {
            intendedMove.x = dx > 0 ? 1 : -1;
          } else if (Math.abs(dy) > 0) {
            intendedMove.y = dy > 0 ? 1 : -1;
          }
        }
      } else if (posture === "guard" && allyId) {
        const ally = units.find((u) => u.id === allyId);
        if (ally) {
          const dx = ally.pos.x - unit.pos.x;
          const dy = ally.pos.y - unit.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 2) {
            intendedMove.x = dx > 0 ? 1 : -1;
            intendedMove.y = dy > 0 ? 1 : -1;
          }
        }
      } else if (posture === "wander") {
        const UnitMovement = this.sim.rulebook.find(
          (r) => r.constructor.name === "UnitMovement",
        )?.constructor as any;
        const wanderRate = UnitMovement?.wanderRate || 0.15;

        if (Simulator.rng.random() < wanderRate) {
          const dirs = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ];
          const [dx, dy] =
            dirs[Math.floor(Simulator.rng.random() * dirs.length)];
          intendedMove.x = dx;
          intendedMove.y = dy;
        }
      } else if (posture === "swarm") {
        let avgX = unit.pos.x;
        let avgY = unit.pos.y;
        let count = 1;

        // Use spatial queries to find nearby allies - O(log n) instead of O(n)
        const nearbyUnits = this.sim.getUnitsNear(unit.pos.x, unit.pos.y, 5);
        
        for (const other of nearbyUnits) {
          if (other.id === unit.id || other.team !== unit.team) continue;
          if (other.state === "dead" || other.hp <= 0) continue;
          if (other.meta.phantom) continue;

          const dx = other.pos.x - unit.pos.x;
          const dy = other.pos.y - unit.pos.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < 25) {
            // Within 5 units
            avgX += other.pos.x;
            avgY += other.pos.y;
            count++;
          }
        }

        if (count > 1) {
          avgX /= count;
          avgY /= count;

          const dx = avgX - unit.pos.x;
          const dy = avgY - unit.pos.y;

          if (Math.abs(dx) >= 1) {
            intendedMove.x = dx > 0 ? 1 : -1;
          }
          if (Math.abs(dy) >= 1) {
            intendedMove.y = dy > 0 ? 1 : -1;
          }
        } else {
          if (Simulator.rng.random() < 0.15) {
            const dirs = [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ];
            const [dx, dy] =
              dirs[Math.floor(Simulator.rng.random() * dirs.length)];
            intendedMove.x = dx;
            intendedMove.y = dy;
          }
        }
      }

      if (intendedMove.x !== 0 || intendedMove.y !== 0) {
        this.sim.queuedCommands.push({
          type: "move",
          unitId: unit.id, // Move command expects unitId at top level
          params: { unitId: unit.id, dx: intendedMove.x, dy: intendedMove.y },
        });
      }
    }
  }

  private handleWoodlandSummoning(): void {
    const bg = (this.sim as any).sceneBackground || "";
    if (!bg.includes("forest") && !bg.includes("title")) return;

    const woodlandTypes = ["squirrel", "forest-squirrel", "bird", "deer"];
    const woodlandCreatures = this.sim.units.filter(
      (u) => woodlandTypes.includes(u.type) && u.hp > 0 && u.team !== "hostile",
    );

    woodlandCreatures.forEach((creature) => {
      if (woodlandCreatures.length >= 12) return;

      if (Math.random() < 0.01) {
        this.summonWoodlandFriend(creature);
      }
    });
  }

  private summonWoodlandFriend(summoner: any): void {
    let friendType: string;
    if (summoner.type.includes("squirrel")) {
      friendType = Math.random() < 0.7 ? "squirrel" : "forest-squirrel";
    } else if (summoner.type === "bird") {
      friendType = Math.random() < 0.8 ? "bird" : "squirrel";
    } else if (summoner.type === "deer") {
      friendType = Math.random() < 0.5 ? "deer" : "forest-squirrel";
    } else {
      friendType = "squirrel";
    }

    const spawnPos = this.getNearbySpawnPosition(summoner.pos);

    this.sim.queuedCommands.push({
      type: "spawn",
      params: {
        unitType: friendType,
        x: spawnPos.x,
        y: spawnPos.y,
        team: "neutral",
      },
    });

    this.sim.queuedCommands.push({
      type: "effect",
      params: {
        type: "gentle-summon",
        x: spawnPos.x,
        y: spawnPos.y,
        color: "#90EE90",
      },
    });
  }

  private getNearbySpawnPosition(center: { x: number; y: number }): {
    x: number;
    y: number;
  } {
    const distance = 2 + Math.random() * 2;
    const angle = Math.random() * 2 * Math.PI;

    return {
      x: Math.max(
        1,
        Math.min(this.sim.width - 1, center.x + Math.cos(angle) * distance),
      ),
      y: Math.max(
        1,
        Math.min(this.sim.height - 1, center.y + Math.sin(angle) * distance),
      ),
    };
  }
}
