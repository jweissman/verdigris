import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

export class PlayerControl extends Rule {
  private keysHeld: Set<string> = new Set();
  private moveTarget: { x: number; y: number } | null = null;
  private attackMoveTarget: { x: number; y: number } | null = null;
  private abilitySwitchCooldown: number = 0;
  
  // Store cooldowns directly on units via meta, not in this rule
  private readonly MOVE_COOLDOWN = 1;  // Keep it smooth
  private readonly JUMP_COOLDOWN = 5;
  private readonly ABILITY_SWITCH_COOLDOWN = 10;

  constructor() {
    super();
  }

  setKeyState(key: string, pressed: boolean) {
    if (pressed) {
      this.keysHeld.add(key.toLowerCase());
    } else {
      this.keysHeld.delete(key.toLowerCase());
    }
  }

  setMoveTarget(target: { x: number; y: number }) {
    this.moveTarget = target;
    this.attackMoveTarget = null;
  }

  setAttackMoveTarget(target: { x: number; y: number }) {
    this.attackMoveTarget = target;
    this.moveTarget = null;
  }

  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    
    // Decrement ability switch cooldown regardless of input
    if (this.abilitySwitchCooldown > 0) {
      this.abilitySwitchCooldown--;
    }
    
    // Ultra-early exit if no input AND no cooldown to update
    if (this.keysHeld.size === 0 && !this.moveTarget && !this.attackMoveTarget && this.abilitySwitchCooldown <= 0) {
      return [];
    }
    
    const allUnits = context.getAllUnits();
    
    // Early exit if no heroes exist
    const heroes = allUnits.filter(u => u.meta?.controlled || u.tags?.includes("hero"));
    if (heroes.length === 0) {
      console.log("[PlayerControl] No heroes found, keysHeld:", Array.from(this.keysHeld));
      return commands;
    }
    
    const currentTick = context.getCurrentTick();

    for (const unit of heroes) {
        if (this.moveTarget || this.attackMoveTarget) {
          const target = this.moveTarget || this.attackMoveTarget;
          if (target) {
            const dx = target.x - unit.pos.x;
            const dy = target.y - unit.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.5) {
              const lastMove = unit.meta?.lastMoveTime;
              if (lastMove === undefined || currentTick - lastMove >= this.MOVE_COOLDOWN) {
                const moveX = Math.sign(dx);
                const moveY = Math.sign(dy);

                if (moveX !== 0) {
                  unit.meta = unit.meta || {};
                  unit.meta.facing = moveX > 0 ? "right" : "left";
                }

                commands.push({
                  type: "hero" as const,
                  params: {
                    action: this.getMoveAction(moveX, moveY),
                  },
                });
                
                commands.push({
                  type: "meta",
                  params: {
                    unitId: unit.id,
                    meta: { lastMoveTime: currentTick }
                  }
                });
              }
            } else {
              this.moveTarget = null;
              this.attackMoveTarget = null;
            }

            if (this.attackMoveTarget) {
              const enemies = allUnits.filter(
                (u) =>
                  u.team !== unit.team &&
                  u.hp > 0 &&
                  Math.abs(u.pos.x - unit.pos.x) < 2 &&
                  Math.abs(u.pos.y - unit.pos.y) < 2,
              );

              if (enemies.length > 0) {
                this.attackMoveTarget = null;
                commands.push({
                  type: "strike",
                  unitId: unit.id,
                  params: {
                    targetId: enemies[0].id,
                  },
                });
              }
            }
            continue; // Skip keyboard controls when using click-to-move
          }
        }

        const lastMove = unit.meta?.lastMoveTime;
        if (lastMove === undefined || currentTick - lastMove >= this.MOVE_COOLDOWN) {
          let dx = 0;
          let dy = 0;

          if (this.keysHeld.has("w") || this.keysHeld.has("arrowup")) {
            dy = -1;
          }
          if (this.keysHeld.has("s") || this.keysHeld.has("arrowdown")) {
            dy = 1;
          }
          if (this.keysHeld.has("a") || this.keysHeld.has("arrowleft")) {
            dx = -1;

            if (!unit.meta) unit.meta = {};
            unit.meta.facing = "left";
          }
          if (this.keysHeld.has("d") || this.keysHeld.has("arrowright")) {
            dx = 1;

            if (!unit.meta) unit.meta = {};
            unit.meta.facing = "right";
          }

          let action = "";
          if (dx < 0 && dy === 0) action = "left";
          else if (dx > 0 && dy === 0) action = "right";
          else if (dx === 0 && dy < 0) action = "up";
          else if (dx === 0 && dy > 0) action = "down";
          else if (dx < 0 && dy < 0) action = "up-left";
          else if (dx > 0 && dy < 0) action = "up-right";
          else if (dx < 0 && dy > 0) action = "down-left";
          else if (dx > 0 && dy > 0) action = "down-right";

          if (action) {
            console.log(`[PlayerControl] Generating move action: ${action} for unit ${unit.id}`);
            commands.push({
              type: "hero" as const,
              params: { action },
            });
            
            commands.push({
              type: "meta",
              params: {
                unitId: unit.id,
                meta: { lastMoveTime: currentTick }
              }
            });
          }
        }

        if (
          !unit.meta?.jumping &&
          unit.meta?.jumpResetTime &&
          context.getCurrentTick() >= unit.meta.jumpResetTime
        ) {
          commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                jumpCount: 0,
                jumpResetTime: null,
              },
            },
          });
        }

        // Simple jump - no multi-jump complexity
        if (
          this.keysHeld.has(" ") &&
          !unit.meta?.jumping
        ) {
          commands.push({
            type: "jump",
            unitId: unit.id,
            params: {
              direction: unit.meta?.facing || "right",
              distance: 6,
              height: 6,
            },
          });
        }

        // Primary action (Q key or E key)
        if (
          this.keysHeld.has("q") ||
          this.keysHeld.has("e") ||
          this.keysHeld.has("enter")
        ) {
          const actionCooldown = unit.meta?.lastAction
            ? context.getCurrentTick() - unit.meta.lastAction
            : 999;
          if (actionCooldown > 2) { // Much faster attacks
            const primaryAction = unit.meta?.primaryAction || "strike";

            if (primaryAction === "strike") {
              // Send strike command with direction
              const facing = unit.meta?.facing || "right";
              
              commands.push({
                type: "strike",
                unitId: unit.id,
                params: {
                  direction: facing,
                  // Don't set range - let strike command use its default for heroes
                  damage: unit.dmg || 15,
                },
              });
            } else if (primaryAction === "bolt") {
              // Find nearest enemy
              const enemies = context
                .getAllUnits()
                .filter((u) => u.team !== unit.team && u.hp > 0);

              if (enemies.length > 0) {
                // Sort by distance
                enemies.sort((a, b) => {
                  const distA =
                    Math.abs(a.pos.x - unit.pos.x) +
                    Math.abs(a.pos.y - unit.pos.y);
                  const distB =
                    Math.abs(b.pos.x - unit.pos.x) +
                    Math.abs(b.pos.y - unit.pos.y);
                  return distA - distB;
                });

                const target = enemies[0];
                commands.push({
                  type: "bolt",
                  params: {
                    x: target.pos.x,
                    y: target.pos.y,
                  },
                });
              }
            } else if (primaryAction === "heal") {
              commands.push({
                type: "heal",
                params: {
                  targetId: unit.id,
                  amount: 25,
                },
              });
            }

            unit.meta = unit.meta || {};
            unit.meta.lastAction = context.getCurrentTick();
          }
        }

        // Rotate primary action with comma/period keys (with cooldown)
        if (this.abilitySwitchCooldown <= 0) {
          if (this.keysHeld.has(",") || this.keysHeld.has("<")) {
            const actions = ["strike", "bolt", "heal"];
            const currentIndex = actions.indexOf(
              unit.meta?.primaryAction || "strike",
            );
            const prevIndex =
              (currentIndex - 1 + actions.length) % actions.length;

            commands.push({
              type: "meta",
              params: {
                unitId: unit.id,
                meta: {
                  ...unit.meta,
                  primaryAction: actions[prevIndex],
                },
              },
            });

            // Visual feedback for ability switch
            const colors: Record<string, string> = {
              strike: "#FFD700", // Gold for sword
              bolt: "#87CEEB", // Sky blue for lightning
              heal: "#00FF00", // Green for heal
            };

            for (let i = 0; i < 5; i++) {
              commands.push({
                type: "particle",
                params: {
                  pos: {
                    x: unit.pos.x * 8 + 4 + (Math.random() - 0.5) * 12,
                    y: unit.pos.y * 8 + 4,
                  },
                  vel: { x: 0, y: -1 },
                  lifetime: 15,
                  type: "energy",
                  color: colors[actions[prevIndex]] || "#FFFFFF",
                  radius: 3,
                  z: 5,
                },
              });
            }

            console.log(
              `[PlayerControl] Primary action: ${actions[prevIndex]}`,
            );
            this.abilitySwitchCooldown = this.ABILITY_SWITCH_COOLDOWN;
          }

          if (this.keysHeld.has(".") || this.keysHeld.has(">")) {
            const actions = ["strike", "bolt", "heal"];
            const currentIndex = actions.indexOf(
              unit.meta?.primaryAction || "strike",
            );
            const nextIndex = (currentIndex + 1) % actions.length;

            commands.push({
              type: "meta",
              params: {
                unitId: unit.id,
                meta: {
                  ...unit.meta,
                  primaryAction: actions[nextIndex],
                },
              },
            });

            // Visual feedback for ability switch
            const colors: Record<string, string> = {
              strike: "#FFD700", // Gold for sword
              bolt: "#87CEEB", // Sky blue for lightning
              heal: "#00FF00", // Green for heal
            };

            for (let i = 0; i < 5; i++) {
              commands.push({
                type: "particle",
                params: {
                  pos: {
                    x: unit.pos.x * 8 + 4 + (Math.random() - 0.5) * 12,
                    y: unit.pos.y * 8 + 4,
                  },
                  vel: { x: 0, y: -1 },
                  lifetime: 15,
                  type: "energy",
                  color: colors[actions[nextIndex]] || "#FFFFFF",
                  radius: 3,
                  z: 5,
                },
              });
            }

            console.log(
              `[PlayerControl] Primary action: ${actions[nextIndex]}`,
            );
            this.abilitySwitchCooldown = this.ABILITY_SWITCH_COOLDOWN;
          }
        }

        const weaponTypes = ["sword", "spear", "axe", "bow", "shield", "staff"];
        for (let i = 0; i < weaponTypes.length; i++) {
          const key = (i + 1).toString();
          if (this.keysHeld.has(key)) {
            commands.push({
              type: "meta",
              params: {
                unitId: unit.id,
                meta: {
                  ...unit.meta,
                  weapon: weaponTypes[i],
                },
              },
            });
            console.log(`[PlayerControl] Switching to ${weaponTypes[i]}`);
          }
        }
      }
    return commands;
    }

  // }

  private getMoveAction(dx: number, dy: number): string {
    if (dx === -1 && dy === 0) return "left";
    if (dx === 1 && dy === 0) return "right";
    if (dx === 0 && dy === -1) return "up";
    if (dx === 0 && dy === 1) return "down";
    if (dx === -1 && dy === -1) return "up-left";
    if (dx === 1 && dy === -1) return "up-right";
    if (dx === -1 && dy === 1) return "down-left";
    if (dx === 1 && dy === 1) return "down-right";
    return "left"; // Default
  }
}
