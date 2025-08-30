import { Simulator } from "../core/simulator";
import type { QueuedCommand } from "../core/command_handler";

/**
 * Hero Controller - manages keyboard input for hero unit
 * This is a normal module that uses the simulator properly
 */
export class HeroController {
  private heroId: string = "hero_player";
  private sim: Simulator;
  private keysPressed: Set<string> = new Set();

  constructor(sim: Simulator) {
    this.sim = sim;
  }

  spawnHero(x: number = 10, y: number = 10) {
    const hero = {
      id: this.heroId,
      type: "champion",
      pos: { x, y },
      intendedMove: { x: 0, y: 0 },
      team: "friendly" as const,
      sprite: "champion",
      state: "idle" as const,
      hp: 120,
      maxHp: 120,
      dmg: 10,
      mass: 10,
      abilities: ["heroicLeap", "groundPound"],
      tags: ["hero", "controlled"],
      meta: {
        facing: "right" as const,
        controlled: true,
      },
    };

    this.sim.addUnit(hero);
  }

  handleKeyDown(key: string) {
    this.keysPressed.add(key);

    const hero = this.sim.units.find((u) => u.id === this.heroId);
    if (!hero) return;

    switch (key.toLowerCase()) {
      case " ":
        this.jump();
        break;
      case "q":
        this.useAbility("groundPound");
        break;
      case "e":
        this.useAbility("heroicLeap");
        break;
    }
  }

  handleKeyUp(key: string) {
    this.keysPressed.delete(key);
  }

  update() {
    const hero = this.sim.units.find((u) => u.id === this.heroId);
    if (!hero || hero.meta?.jumping) return;

    let dx = 0,
      dy = 0;

    if (this.keysPressed.has("w")) dy = -1;
    if (this.keysPressed.has("s")) dy = 1;
    if (this.keysPressed.has("a")) dx = -1;
    if (this.keysPressed.has("d")) dx = 1;

    if (dx !== 0 || dy !== 0) {
      this.move(dx, dy);
    }
  }

  private move(dx: number, dy: number) {
    const hero = this.sim.units.find((u) => u.id === this.heroId);
    if (!hero) return;

    const newX = Math.max(
      0,
      Math.min(this.sim.fieldWidth - 1, hero.pos.x + dx),
    );
    const newY = Math.max(
      0,
      Math.min(this.sim.fieldHeight - 1, hero.pos.y + dy),
    );

    this.sim.queuedCommands.push({
      type: "move",
      params: {
        unitId: this.heroId,
        x: newX,
        y: newY,
      },
    });

    if (dx !== 0) {
      this.sim.queuedCommands.push({
        type: "meta",
        params: {
          unitId: this.heroId,
          meta: {
            facing: dx > 0 ? "right" : "left",
          },
        },
      });
    }
  }

  private jump() {
    const hero = this.sim.units.find((u) => u.id === this.heroId);
    if (!hero) {
      return;
    }

    if (hero.meta?.jumping) {
      return;
    }

    const jumpDistance = 4;
    const facingRight = hero.meta?.facing === "right";
    const targetX = facingRight
      ? Math.min(this.sim.fieldWidth - 1, hero.pos.x + jumpDistance)
      : Math.max(0, hero.pos.x - jumpDistance);

    const jumpCommand = {
      type: "jump",
      unitId: this.heroId,
      params: {
        targetX: targetX,
        targetY: hero.pos.y,
        height: 5,
        damage: 0,
        radius: 0,
      },
    };

    this.sim.queuedCommands.push(jumpCommand);
  }

  private useAbility(abilityName: string) {
    const hero = this.sim.units.find((u) => u.id === this.heroId);
    if (!hero || !hero.abilities?.includes(abilityName)) return;

    this.sim.queuedCommands.push({
      type: "ability",
      params: {
        unitId: this.heroId,
        abilityName: abilityName,
        target: hero.pos,
      },
    });
  }
}
