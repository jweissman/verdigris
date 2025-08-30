import { Command } from "../rules/command";
import { generateAttackPattern } from "../utils/attack_patterns";

/**
 * Hero command - applies commands to all units tagged 'hero'
 * Examples:
 *   hero jump
 *   hero left
 *   hero right
 *   hero attack
 */
export class HeroCommand extends Command {
  execute(unitId: string | null, params: Record<string, any>): void {
    const action = params.action as string;

    if (action === "rotate-ability") {
      const heroes = this.sim.units.filter((u) => u.tags?.includes("hero"));
      for (const hero of heroes) {
        if (!hero.meta) hero.meta = {};
        const abilities = ["strike", "bolt", "jump", "heal"];
        const currentIndex = abilities.indexOf(
          hero.meta.primaryAbility || "strike",
        );
        const nextIndex = (currentIndex + 1) % abilities.length;
        hero.meta.primaryAbility = abilities[nextIndex];
      }
      return;
    }

    if (action === "primary") {
      const heroes = this.sim.units.filter((u) => u.tags?.includes("hero"));
      for (const hero of heroes) {
        const primaryAbility = hero.meta?.primaryAbility || "strike";

        this.sim.queuedCommands.push({
          type: "hero",
          params: {
            action: primaryAbility,
            ...params, // Pass through any additional params
          },
        });
      }
      return;
    }

    if (action === "move-to") {
      const targetX = params.x as number;
      const targetY = params.y as number;
      const heroes = this.sim.units.filter((u) => u.tags?.includes("hero"));

      for (const hero of heroes) {
        if (!hero.meta) hero.meta = {};
        hero.meta.moveTarget = {
          x: targetX,
          y: targetY,
          attackMove: params.attackMove || false,
          setTick: this.sim.ticks,
        };
      }
      return;
    }

    const heroes = this.sim.units.filter((u) => u.tags?.includes("hero"));

    for (const hero of heroes) {
      switch (action) {
        case "jump": {
          const jumpDistance = params.distance || 3;
          const jumpHeight = params.height || 5;
          const aoeDamage = params.damage || hero.dmg || 20; // Significant AoE damage
          const aoeRadius = params.radius || 3; // Large impact radius

          const facing = hero.meta?.facing || "right";
          const landX =
            hero.pos.x + (facing === "right" ? jumpDistance : -jumpDistance);
          const landY = hero.pos.y;

          const impactZones: Array<{ x: number; y: number }> = [];
          for (let dx = -aoeRadius; dx <= aoeRadius; dx++) {
            for (let dy = -aoeRadius; dy <= aoeRadius; dy++) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= aoeRadius) {
                const zoneX = Math.round(landX + dx);
                const zoneY = Math.round(landY + dy);
                if (
                  zoneX >= 0 &&
                  zoneX < this.sim.width &&
                  zoneY >= 0 &&
                  zoneY < this.sim.height
                ) {
                  impactZones.push({ x: zoneX, y: zoneY });

                  this.sim.queuedCommands.push({
                    type: "particle",
                    params: {
                      pos: { x: zoneX * 8 + 4, y: zoneY * 8 + 4 },
                      vel: { x: 0, y: -0.1 },
                      lifetime: 20,
                      type: "warning",
                      color: `hsla(30, 100%, ${70 - dist * 10}%, ${0.6 - dist * 0.1})`,
                      radius: 3 - dist * 0.3,
                      z: 1,
                    },
                  });
                }
              }
            }
          }

          hero.meta.impactZones = impactZones;
          hero.meta.impactZonesExpiry = this.sim.ticks + 20;

          this.sim.queuedCommands.push({
            type: "jump",
            unitId: hero.id,
            params: {
              distance: jumpDistance,
              height: jumpHeight,
              damage: aoeDamage,
              radius: aoeRadius,
            },
          });
          break;
        }

        case "move": {
          const dx = params.dx || 0;
          const dy = params.dy || 0;

          let adjustedDx = dx;
          let adjustedDy = dy;

          if (dx !== 0 && Math.floor(hero.pos.y) % 2 === 1) {
            adjustedDy = dy || (dx > 0 ? -1 : 1);
          }

          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: adjustedDx, dy: adjustedDy },
          });
          break;
        }

        case "left":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: -1, dy: 0 },
          });
          break;

        case "right":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: 1, dy: 0 },
          });
          break;

        case "up":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: 0, dy: -2 },
          });
          break;

        case "down":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: 0, dy: 2 },
          });
          break;

        case "up-left":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: -1, dy: -2 },
          });
          break;

        case "up-right":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: 1, dy: -2 },
          });
          break;

        case "down-left":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: -1, dy: 2 },
          });
          break;

        case "down-right":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: 1, dy: 2 },
          });
          break;

        case "knight-left":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: -1, dy: -2 },
          });
          break;

        case "knight-right":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: 1, dy: -2 },
          });
          break;

        case "attack":
        case "strike": {
          const direction = params.direction || hero.meta?.facing || "right";
          const range = params.range || 7; // Deeper range
          const damage = params.damage || hero.dmg || 25;

          // Use pattern generator for cleaner, more powerful attack
          const attackZones = generateAttackPattern({
            origin: hero.pos,
            direction: direction as 'left' | 'right' | 'up' | 'down',
            range: range,
            pattern: 'cone',
            width: 13, // Even wider base
            taper: 1.2  // Gentler taper for broader reach
          });

          const attackDx =
            direction === "right" ? 1 : direction === "left" ? -1 : 0;
          const attackDy =
            direction === "down" ? 1 : direction === "up" ? -1 : 0;

          // Generate particles for each attack zone
          for (const zone of attackZones) {
            const dist = Math.abs(zone.x - hero.pos.x) + Math.abs(zone.y - hero.pos.y);
            
            this.sim.queuedCommands.push({
              type: "particle",
              params: {
                pos: { x: zone.x * 8 + 4, y: zone.y * 8 + 4 },
                vel: { x: attackDx * 1.5, y: attackDy * 1.5 },
                lifetime: 20 + dist * 3,
                type: "spark",
                color: `hsl(${45 + dist * 5}, 90%, ${70 - dist * 3}%)`,
                radius: 4 + dist * 0.5,
                z: 3,
              },
            });

            // Add secondary glow effect
            this.sim.queuedCommands.push({
              type: "particle",
              params: {
                pos: { x: zone.x * 8 + 4, y: zone.y * 8 + 4 },
                vel: { x: attackDx * 0.5, y: attackDy * 0.5 },
                lifetime: 15 + dist * 2,
                type: "glow",
                color: `hsla(${45 + dist * 5}, 100%, 80%, 0.6)`,
                radius: 6 + dist * 0.8,
                z: 2,
              },
            });
          }

          hero.meta.attackZones = attackZones;
          hero.meta.attackZonesExpiry = this.sim.ticks + 30; // Show much longer for huge visor effect

          const enemiesSet = new Set<string>();
          const enemies = this.sim.units.filter((u) => {
            // Don't hit yourself or your allies, but hit neutral and hostile units
            if (u.id === hero.id || u.team === hero.team || u.hp <= 0)
              return false;
            const inZone = attackZones.some(
              (zone) => u.pos.x === zone.x && u.pos.y === zone.y,
            );
            if (inZone) {
              enemiesSet.add(u.id);
            }
            return inZone;
          });

          for (const enemy of enemies) {
            const strikeCommand = {
              type: "strike",
              unitId: hero.id,
              params: {
                targetId: enemy.id,
                direction: direction,
                range: range,
                damage: damage,
              },
            };
            this.sim.queuedCommands.push(strikeCommand);
          }

          if (enemies.length === 0) {
            this.sim.queuedCommands.push({
              type: "strike",
              unitId: hero.id,
              params: {
                direction: direction,
                range: range,
                damage: damage,
              },
            });
          }

          const transform = this.sim.getTransform();
          transform.updateUnit(hero.id, {
            state: "attack",
            meta: {
              ...hero.meta,
              attackStartTick: this.sim.ticks,
              attackEndTick: this.sim.ticks + 6, // Quick punch animation
            },
          });
          break;
        }

        case "charge_attack": {
          const currentCharge = hero.meta?.attackCharge || 0;
          const newCharge = Math.min(currentCharge + 1, 5); // Max 5x charge

          const transform = this.sim.getTransform();
          transform.updateUnit(hero.id, {
            state: "charging",
            meta: {
              ...hero.meta,
              attackCharge: newCharge,
              chargingAttack: true,
            },
          });

          this.sim.queuedCommands.push({
            type: "particle",
            params: {
              pos: { x: hero.pos.x * 8 + 4, y: hero.pos.y * 8 + 4 },
              vel: { x: 0, y: -0.5 },
              lifetime: 15,
              type: "energy",
              color: `hsl(${60 + newCharge * 30}, 100%, ${50 + newCharge * 10}%)`,
              radius: 0.8 + currentCharge * 0.2,
              z: 3,
            },
          });
          break;
        }

        case "release_attack": {
          const chargeLevel = hero.meta?.attackCharge || 1;
          const baseDamage = hero.dmg || 15;
          const chargedDamage = baseDamage * chargeLevel;
          const direction = params.direction || hero.meta?.facing || "right";

          const transform = this.sim.getTransform();
          transform.updateUnit(hero.id, {
            state: "attack",
            meta: {
              ...hero.meta,
              attackCharge: 0,
              chargingAttack: false,
            },
          });

          this.sim.queuedCommands.push({
            type: "strike",
            unitId: hero.id,
            params: {
              direction: direction,
              damage: chargedDamage,
              range: 3, // Longer range for charged attack
              knockback: chargeLevel * 2, // More knockback with charge
              aspect: "charged",
            },
          });
          break;
        }

        case "bolt": {
          // Lightning bolt attack in facing direction
          const direction = params.direction || hero.meta?.facing || "right";
          const range = params.range || 8; // Long range lightning
          const damage = params.damage || 40; // High damage

          // Find first enemy in line
          const dx = direction === "right" ? 1 : direction === "left" ? -1 : 0;
          const dy = direction === "down" ? 1 : direction === "up" ? -1 : 0;

          let target = null;
          let targetDist = 0;
          for (let dist = 1; dist <= range; dist++) {
            const checkX = hero.pos.x + dx * dist;
            const checkY = hero.pos.y + dy * dist;

            const enemy = this.sim.units.find(
              (u) =>
                u.pos.x === checkX &&
                u.pos.y === checkY &&
                u.id !== hero.id && // Don't hit yourself
                u.team !== "friendly" && // Hit neutral and hostile units
                u.hp > 0,
            );

            if (enemy) {
              target = enemy;
              targetDist = dist;
              break;
            }
          }

          // Create a lightning effect (no projectile sprite, just particles)

          // Lightning visual effects along the path
          for (let dist = 0; dist <= (targetDist || range); dist++) {
            const sparkX = hero.pos.x + dx * dist;
            const sparkY = hero.pos.y + dy * dist;

            // Main bolt particle
            this.sim.queuedCommands.push({
              type: "particle",
              params: {
                pos: { x: sparkX * 8 + 4, y: sparkY * 8 + 4 },
                vel: { x: 0, y: 0 },
                lifetime: 10 + dist,
                type: "lightning",
                color: "#FFFFFF",
                radius: 3,
                z: 5,
              },
            });

            // Glow effect
            this.sim.queuedCommands.push({
              type: "particle",
              params: {
                pos: { x: sparkX * 8 + 4, y: sparkY * 8 + 4 },
                vel: {
                  x: (Math.random() - 0.5) * 0.5,
                  y: (Math.random() - 0.5) * 0.5,
                },
                lifetime: 15 + dist,
                type: "electric_spark",
                color: "#AAAAFF",
                radius: 4,
                z: 4,
              },
            });
          }

          // Impact effect at target
          if (target) {
            this.sim.queuedCommands.push({
              type: "damage",
              params: {
                targetId: target.id,
                amount: damage,
                sourceId: hero.id,
              },
            });

            // Thunder ring at impact
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              this.sim.queuedCommands.push({
                type: "particle",
                params: {
                  pos: { x: target.pos.x * 8 + 4, y: target.pos.y * 8 + 4 },
                  vel: {
                    x: Math.cos(angle) * 1.5,
                    y: Math.sin(angle) * 1.5,
                  },
                  lifetime: 20,
                  type: "thunder_ring",
                  color: "#8888FF",
                  radius: 2,
                  z: 3,
                },
              });
            }
          }

          break;
        }

        case "heal": {
          // Heal self
          const healAmount = params.amount || 25;
          this.sim.queuedCommands.push({
            type: "heal",
            params: {
              targetId: hero.id,
              amount: healAmount,
            },
          });
          break;
        }

        case "move-to": {
          // Move hero to target position
          const targetX = params.x;
          const targetY = params.y;
          const attackMove = params.attackMove || false;

          if (typeof targetX === "number" && typeof targetY === "number") {
            this.sim.queuedCommands.push({
              type: "move_target",
              unitId: hero.id,
              params: {
                x: targetX,
                y: targetY,
                attackMove: attackMove,
              },
            });
          }
          break;
        }

        default:
          console.warn(`Unknown hero action: ${action}`);
      }
    }
  }
}
