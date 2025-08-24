var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __moduleCache = /* @__PURE__ */ new WeakMap;
var __toCommonJS = (from) => {
  var entry = __moduleCache.get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function")
    __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    }));
  __moduleCache.set(from, entry);
  return entry;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// src/core/rng.ts
class RNG {
  seed;
  constructor(seed = Date.now()) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) % 2147483647;
    return this.seed / 2147483647;
  }
  random() {
    return this.next();
  }
  randomInt(min, max) {
    return Math.floor(min + this.random() * (max - min + 1));
  }
  dn(faces) {
    return this.randomInt(1, faces);
  }
  d3 = () => this.dn(3);
  randomChoice(array) {
    return array[this.randomInt(0, array.length - 1)];
  }
  reset(seed) {
    this.seed = seed ?? this.seed;
  }
}
var globalRNG;
var init_rng = __esm(() => {
  globalRNG = new RNG;
});

// src/rules/rule.ts
class Rule {
  rng;
  constructor(rng) {
    this.rng = rng || new RNG(12345);
  }
  pairwise(context, callback, maxDistance) {
    const units = context.getAllUnits();
    const maxDistSq = maxDistance ? maxDistance * maxDistance : Infinity;
    for (let i = 0;i < units.length; i++) {
      for (let j = i + 1;j < units.length; j++) {
        const a = units[i];
        const b = units[j];
        if (maxDistance) {
          const dx = a.pos.x - b.pos.x;
          const dy = a.pos.y - b.pos.y;
          if (dx * dx + dy * dy > maxDistSq)
            continue;
        }
        callback(a, b);
      }
    }
  }
  unitsWithinRadius(context, center, radius) {
    return context.findUnitsInRadius(center, radius);
  }
}
var init_rule = __esm(() => {
  init_rng();
});

// src/rules/move_to_target.ts
var exports_move_to_target = {};
__export(exports_move_to_target, {
  MoveToTarget: () => MoveToTarget
});
var MoveToTarget;
var init_move_to_target = __esm(() => {
  init_rule();
  MoveToTarget = class MoveToTarget extends Rule {
    moveCooldowns = new Map;
    MOVE_COOLDOWN = 3;
    execute(context) {
      const commands = [];
      const allUnits = context.getAllUnits();
      const currentTick = context.getCurrentTick();
      for (const [unitId, cooldown] of this.moveCooldowns.entries()) {
        if (cooldown > 0) {
          this.moveCooldowns.set(unitId, cooldown - 1);
        }
      }
      for (const unit of allUnits) {
        if (!unit.meta?.moveTarget)
          continue;
        if (unit.hp <= 0)
          continue;
        const target = unit.meta.moveTarget;
        const dx = target.x - unit.pos.x;
        const dy = target.y - unit.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 0.5) {
          commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                ...unit.meta,
                moveTarget: null,
                currentPath: null
              }
            }
          });
          continue;
        }
        const cooldown = this.moveCooldowns.get(unit.id) || 0;
        if (cooldown > 0)
          continue;
        if (target.attackMove) {
          const enemies = allUnits.filter((u) => u.team !== unit.team && u.hp > 0 && Math.abs(u.pos.x - unit.pos.x) < 2 && Math.abs(u.pos.y - unit.pos.y) < 2);
          if (enemies.length > 0) {
            commands.push({
              type: "strike",
              unitId: unit.id,
              params: {
                targetId: enemies[0].id
              }
            });
            commands.push({
              type: "meta",
              params: {
                unitId: unit.id,
                meta: {
                  ...unit.meta,
                  moveTarget: null
                }
              }
            });
            continue;
          }
        }
        const moveX = Math.sign(dx);
        const moveY = Math.sign(dy);
        if (moveX !== 0) {
          commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                ...unit.meta,
                facing: moveX > 0 ? "right" : "left"
              }
            }
          });
        }
        commands.push({
          type: "move",
          params: {
            unitId: unit.id,
            dx: moveX,
            dy: moveY
          }
        });
        this.moveCooldowns.set(unit.id, this.MOVE_COOLDOWN);
      }
      return commands;
    }
  };
});

// src/rules/melee_combat.ts
init_rule();

class MeleeCombat extends Rule {
  engagements = new Map;
  lastAttacks = new Map;
  execute(context) {
    const commands = [];
    const currentTick = context.getCurrentTick();
    const arrays = context.getArrays();
    for (const i of arrays.activeIndices) {
      if (arrays.state[i] === 2) {
        const unitId = arrays.unitIds[i];
        const coldData = context.getUnitColdData(unitId);
        if (coldData?.meta?.lastAttacked) {
          const ticksSinceAttack = currentTick - coldData.meta.lastAttacked;
          if (ticksSinceAttack > 2) {
            commands.push({
              type: "meta",
              params: {
                unitId,
                state: "idle"
              }
            });
          }
        }
      }
    }
    this.engagements.clear();
    this.performMeleeCombat(context, commands);
    return commands;
  }
  performMeleeCombat(context, commands) {
    const meleeRange = 1.5;
    const meleeRangeSq = meleeRange * meleeRange;
    const arrays = context.sim?.unitArrays;
    const coldData = context.sim?.unitColdData;
    if (arrays && coldData) {
      const activeIndices = arrays.activeIndices;
      const count = activeIndices.length;
      for (let i = 0;i < count; i++) {
        const idxA = activeIndices[i];
        if (arrays.state[idxA] === 3 || arrays.hp[idxA] <= 0)
          continue;
        const attackerId = arrays.unitIds[idxA];
        if (this.engagements.has(attackerId))
          continue;
        const coldA = coldData.get(attackerId);
        if (coldA?.meta?.jumping || coldA?.tags?.includes("noncombatant"))
          continue;
        const x1 = arrays.posX[idxA];
        const y1 = arrays.posY[idxA];
        const team1 = arrays.team[idxA];
        for (let j = i + 1;j < count; j++) {
          const idxB = activeIndices[j];
          if (arrays.state[idxB] === 3 || arrays.hp[idxB] <= 0)
            continue;
          if (team1 === arrays.team[idxB])
            continue;
          const targetId = arrays.unitIds[idxB];
          if (this.engagements.has(targetId))
            continue;
          const dx = arrays.posX[idxB] - x1;
          const dy = arrays.posY[idxB] - y1;
          const distSq = dx * dx + dy * dy;
          if (distSq > meleeRangeSq)
            continue;
          const coldB = coldData.get(targetId);
          if (coldB?.meta?.jumping || coldB?.tags?.includes("noncombatant"))
            continue;
          this.engagements.set(attackerId, targetId);
          this.engagements.set(targetId, attackerId);
          const currentTick = context.getCurrentTick();
          const attackerLastAttack = this.lastAttacks.get(attackerId) || -100;
          const targetLastAttack = this.lastAttacks.get(targetId) || -100;
          const attackCooldown = 5;
          const attackerCanAttack = currentTick - attackerLastAttack >= attackCooldown;
          const targetCanAttack = currentTick - targetLastAttack >= attackCooldown;
          if (attackerCanAttack) {
            this.registerHit(attackerId, targetId, arrays.dmg[idxA] || 1, context, commands);
          }
          if (targetCanAttack && attackerCanAttack) {
            if (idxA < idxB) {} else {
              this.registerHit(targetId, attackerId, arrays.dmg[idxB] || 1, context, commands);
            }
          } else if (targetCanAttack && !attackerCanAttack) {
            this.registerHit(targetId, attackerId, arrays.dmg[idxB] || 1, context, commands);
          }
          break;
        }
      }
    } else {
      const allUnits = context.getAllUnits();
      for (const attacker of allUnits) {
        if (this.engagements.has(attacker.id))
          continue;
        if (attacker.hp <= 0)
          continue;
        if (attacker.meta?.jumping)
          continue;
        if (attacker.tags?.includes("noncombatant"))
          continue;
        const nearbyUnits = context.findUnitsInRadius(attacker.pos, meleeRange);
        for (const target of nearbyUnits) {
          if (target.id === attacker.id)
            continue;
          if (target.hp <= 0)
            continue;
          if (target.meta?.jumping)
            continue;
          if (target.tags?.includes("noncombatant"))
            continue;
          if (attacker.team === target.team)
            continue;
          this.processHit(context, attacker, target, commands);
          break;
        }
      }
    }
  }
  registerHit(attackerId, targetId, damage, context, commands) {
    this.lastAttacks.set(attackerId, context.getCurrentTick());
    commands.push({
      type: "halt",
      params: { unitId: attackerId }
    });
    commands.push({
      type: "meta",
      params: {
        unitId: attackerId,
        meta: { lastAttacked: context.getCurrentTick() },
        state: "attack"
      }
    });
    commands.push({
      type: "damage",
      params: {
        targetId,
        amount: damage,
        aspect: "physical",
        sourceId: attackerId
      }
    });
  }
  processHit(context, attacker, target, commands) {
    if (attacker.hp <= 0 || target.hp <= 0)
      return;
    this.registerHit(attacker.id, target.id, attacker.dmg || 1, context, commands);
  }
}

// src/rules/knockback.ts
init_rule();

class Knockback extends Rule {
  commands = [];
  execute(context) {
    this.commands = [];
    const knockbackRange = 1.1;
    const knockbackRangeSq = knockbackRange * knockbackRange;
    const arrays = context.getArrays();
    for (const i of arrays.activeIndices) {
      if (arrays.state[i] === 3 || arrays.mass[i] === 0)
        continue;
      const x1 = arrays.posX[i];
      const y1 = arrays.posY[i];
      const team1 = arrays.team[i];
      const mass1 = arrays.mass[i];
      for (const j of arrays.activeIndices) {
        if (i === j || arrays.state[j] === 3 || arrays.mass[j] === 0)
          continue;
        if (team1 === arrays.team[j])
          continue;
        const dx = arrays.posX[j] - x1;
        const dy = arrays.posY[j] - y1;
        const distSq = dx * dx + dy * dy;
        if (distSq <= knockbackRangeSq && distSq > 0) {
          const mass2 = arrays.mass[j];
          const massDiff = mass1 - mass2;
          if (massDiff > 0) {
            const coldData = context.getUnitColdDataByIndex(j);
            if (coldData?.meta?.phantom)
              continue;
            const dist = Math.sqrt(distSq);
            const pushX = dx / dist * 0.5;
            const pushY = dy / dist * 0.5;
            this.commands.push({
              type: "move",
              params: {
                unitId: arrays.unitIds[j],
                dx: pushX,
                dy: pushY
              }
            });
          }
        }
      }
    }
    return this.commands;
  }
}

// src/rules/projectile_motion.ts
init_rule();

class ProjectileMotion extends Rule {
  commands = [];
  execute(context) {
    this.commands = [];
    const projectiles = context.getProjectiles();
    if (projectiles.length === 0)
      return this.commands;
    const arrays = context.getArrays();
    for (const projectile of projectiles) {
      const radiusSq = (projectile.radius || 1) * (projectile.radius || 1);
      if (projectile.type === "grapple") {
        const radius = projectile.radius || 1;
        for (const idx of arrays.activeIndices) {
          if (arrays.hp[idx] <= 0)
            continue;
          const absDx = Math.abs(arrays.posX[idx] - projectile.pos.x);
          const absDy = Math.abs(arrays.posY[idx] - projectile.pos.y);
          if (absDx > radius || absDy > radius)
            continue;
          const dx = arrays.posX[idx] - projectile.pos.x;
          const dy = arrays.posY[idx] - projectile.pos.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < radiusSq) {
            this.commands.push({
              type: "meta",
              params: {
                unitId: arrays.unitIds[idx],
                meta: {
                  grappleHit: true,
                  grapplerID: projectile.sourceId || "unknown",
                  grappleOrigin: { ...projectile.pos }
                }
              }
            });
            this.commands.push({
              type: "removeProjectile",
              params: { id: projectile.id }
            });
            break;
          }
        }
      } else {
        const projectileTeam = projectile.team === "friendly" ? 1 : projectile.team === "hostile" ? 2 : 0;
        for (const idx of arrays.activeIndices) {
          if (arrays.team[idx] === projectileTeam || arrays.hp[idx] <= 0)
            continue;
          const absDx = Math.abs(arrays.posX[idx] - projectile.pos.x);
          const absDy = Math.abs(arrays.posY[idx] - projectile.pos.y);
          const radius = projectile.radius || 1;
          if (absDx > radius || absDy > radius)
            continue;
          const dx = arrays.posX[idx] - projectile.pos.x;
          const dy = arrays.posY[idx] - projectile.pos.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < radiusSq) {
            this.commands.push({
              type: "damage",
              params: {
                targetId: arrays.unitIds[idx],
                amount: projectile.damage || 10,
                aspect: projectile.aspect || "physical",
                origin: projectile.pos
              }
            });
            this.commands.push({
              type: "removeProjectile",
              params: { id: projectile.id }
            });
            break;
          }
        }
      }
      if (projectile.type === "bomb" && (projectile.target && projectile.progress !== undefined && projectile.duration !== undefined && projectile.progress >= projectile.duration || projectile.lifetime && projectile.lifetime >= 30)) {
        const explosionRadius = projectile.explosionRadius || 3;
        const explosionRadiusSq = explosionRadius * explosionRadius;
        const explosionDamage = projectile.damage || 20;
        const projectileTeam = projectile.team === "friendly" ? 1 : projectile.team === "hostile" ? 2 : 0;
        for (const idx of arrays.activeIndices) {
          if (arrays.team[idx] === projectileTeam)
            continue;
          if (projectile.sourceId && arrays.unitIds[idx] === projectile.sourceId)
            continue;
          const dx = arrays.posX[idx] - projectile.pos.x;
          const dy = arrays.posY[idx] - projectile.pos.y;
          const distSq = dx * dx + dy * dy;
          if (distSq <= explosionRadiusSq) {
            const distance = Math.sqrt(distSq);
            const damageMultiplier = Math.max(0.3, 1 - distance / explosionRadius * 0.5);
            const damage = Math.floor(explosionDamage * damageMultiplier);
            if (damage > 0) {
              this.commands.push({
                type: "damage",
                params: {
                  targetId: arrays.unitIds[idx],
                  amount: damage,
                  aspect: "explosion"
                }
              });
              const knockbackForce = 2;
              const knockbackX = dx !== 0 ? dx / Math.abs(dx) * knockbackForce : 0;
              const knockbackY = dy !== 0 ? dy / Math.abs(dy) * knockbackForce : 0;
              this.commands.push({
                type: "move",
                params: {
                  unitId: arrays.unitIds[idx],
                  x: arrays.posX[idx] + knockbackX,
                  y: arrays.posY[idx] + knockbackY
                }
              });
            }
          }
        }
        this.commands.push({
          type: "removeProjectile",
          params: { id: projectile.id }
        });
      }
    }
    return this.commands;
  }
  executeWithSpatialIndex(context, projectiles) {
    this.commands = [];
    for (const projectile of projectiles) {
      const radius = projectile.radius || 1;
      const nearbyUnits = context.findUnitsInRadius(projectile.pos, radius + 0.5);
      if (projectile.type === "grapple") {
        for (const unit of nearbyUnits) {
          if (unit.hp <= 0)
            continue;
          const dx = unit.pos.x - projectile.pos.x;
          const dy = unit.pos.y - projectile.pos.y;
          const distSq = dx * dx + dy * dy;
          const radiusSq = radius * radius;
          if (distSq < radiusSq) {
            this.commands.push({
              type: "meta",
              params: {
                unitId: unit.id,
                meta: {
                  grappleHit: true,
                  grapplerID: projectile.sourceId || "unknown",
                  grappleOrigin: { ...projectile.pos }
                }
              }
            });
            this.commands.push({
              type: "removeProjectile",
              params: { id: projectile.id }
            });
            break;
          }
        }
      } else {
        for (const unit of nearbyUnits) {
          if (unit.hp <= 0)
            continue;
          if (unit.team === projectile.team)
            continue;
          const dx = unit.pos.x - projectile.pos.x;
          const dy = unit.pos.y - projectile.pos.y;
          const distSq = dx * dx + dy * dy;
          const radiusSq = radius * radius;
          if (distSq < radiusSq) {
            this.commands.push({
              type: "damage",
              params: {
                targetId: unit.id,
                amount: projectile.damage || 10,
                aspect: projectile.aspect || "physical",
                origin: projectile.pos
              }
            });
            this.commands.push({
              type: "removeProjectile",
              params: { id: projectile.id }
            });
            break;
          }
        }
      }
      if (projectile.type === "bomb" && (projectile.target && projectile.progress !== undefined && projectile.duration !== undefined && projectile.progress >= projectile.duration || projectile.lifetime && projectile.lifetime >= 30)) {
        const explosionRadius = projectile.explosionRadius || 3;
        const explosionDamage = projectile.damage || 20;
        const affectedUnits = context.findUnitsInRadius(projectile.pos, explosionRadius);
        for (const unit of affectedUnits) {
          if (unit.team === projectile.team)
            continue;
          const dx = unit.pos.x - projectile.pos.x;
          const dy = unit.pos.y - projectile.pos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= explosionRadius) {
            const damageMultiplier = Math.max(0.3, 1 - distance / explosionRadius * 0.5);
            const damage = Math.floor(explosionDamage * damageMultiplier);
            if (damage > 0) {
              this.commands.push({
                type: "damage",
                params: {
                  targetId: unit.id,
                  amount: damage,
                  aspect: "explosion"
                }
              });
              const knockbackForce = 2;
              const knockbackX = dx !== 0 ? dx / Math.abs(dx) * knockbackForce : 0;
              const knockbackY = dy !== 0 ? dy / Math.abs(dy) * knockbackForce : 0;
              this.commands.push({
                type: "move",
                params: {
                  unitId: unit.id,
                  x: unit.pos.x + knockbackX,
                  y: unit.pos.y + knockbackY
                }
              });
            }
          }
        }
        this.commands.push({
          type: "removeProjectile",
          params: { id: projectile.id }
        });
      }
    }
    return this.commands;
  }
}

// src/rules/unit_movement.ts
init_rule();

class UnitMovement extends Rule {
  static wanderRate = 0.15;
  execute(context) {
    return [
      {
        type: "forces",
        params: {}
      }
    ];
  }
}

// src/rules/area_of_effect.ts
init_rule();

class AreaOfEffect extends Rule {
  commands = [];
  constructor() {
    super();
  }
  execute(context) {
    this.commands = [];
    const unitsWithAoE = context.getAllUnits().filter((unit) => unit.meta?.exploding || unit.meta?.aoeEffect || unit.meta?.detonating);
    for (const explosiveUnit of unitsWithAoE) {
      if (explosiveUnit.meta?.exploding) {
        this.handleExplosion(context, explosiveUnit);
      }
      if (explosiveUnit.meta?.aoeEffect) {
        this.handleAoEEffect(context, explosiveUnit);
      }
    }
    return this.commands;
  }
  handleExplosion(context, explosiveUnit) {
    const radius = explosiveUnit.meta.explosionRadius || 5;
    const damage = explosiveUnit.meta.explosionDamage || 5;
    for (const unit of context.getAllUnits()) {
      if (unit.team !== explosiveUnit.team && unit.state !== "dead") {
        const dx = unit.pos.x - explosiveUnit.pos.x;
        const dy = unit.pos.y - explosiveUnit.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          context.queueEvent({
            kind: "damage",
            source: explosiveUnit.id,
            target: unit.id,
            meta: {
              amount: damage,
              aspect: "explosion"
            }
          });
          const knockback = 6.5;
          const nx = (dx / dist || 1) * knockback;
          const ny = (dy / dist || 1) * knockback;
          context.queueEvent({
            kind: "knockback",
            source: explosiveUnit.id,
            target: unit.id,
            meta: {
              force: { x: nx, y: ny }
            }
          });
        }
      }
    }
    this.commands.push({
      type: "meta",
      params: {
        unitId: explosiveUnit.id,
        meta: {
          exploding: false,
          explosionRadius: undefined,
          explosionDamage: undefined
        }
      }
    });
  }
  handleAoEEffect(context, unit) {
    const aoe = unit.meta.aoeEffect;
    const targetPos = aoe.target || unit.pos;
    const radius = aoe.radius || 3;
    const damage = aoe.damage || 10;
    const force = aoe.force || 5;
    for (const target of context.getAllUnits()) {
      if (target.team !== unit.team && target.state !== "dead") {
        const dx = target.pos.x - targetPos.x;
        const dy = target.pos.y - targetPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const damageMultiplier = 1 - dist / (radius * 2);
          const actualDamage = Math.floor(damage * damageMultiplier);
          context.queueEvent({
            kind: "damage",
            source: unit.id,
            target: target.id,
            meta: {
              amount: actualDamage,
              aspect: aoe.aspect || "physical"
            }
          });
          if (force > 0 && dist > 0) {
            const knockbackForce = force * (1 - dist / radius);
            const nx = dx / dist * knockbackForce;
            const ny = dy / dist * knockbackForce;
            context.queueEvent({
              kind: "knockback",
              source: unit.id,
              target: target.id,
              meta: {
                force: { x: nx, y: ny }
              }
            });
          }
        }
      }
    }
    this.commands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          aoeEffect: undefined
        }
      }
    });
  }
}

// src/rules/unit_behavior.ts
init_rule();

class UnitBehavior extends Rule {
  execute(context) {
    return [
      {
        type: "ai",
        params: {}
      }
    ];
  }
}

// src/rules/cleanup.ts
init_rule();

class Cleanup extends Rule {
  execute(context) {
    const deadUnits = context.getAllUnits().filter((unit) => unit.state === "dead" || unit.hp <= 0);
    return deadUnits.map((unit) => ({
      type: "remove",
      params: { unitId: unit.id }
    }));
  }
}

// src/rules/jumping.ts
init_rule();

class Jumping extends Rule {
  commands = [];
  GRAVITY = 0.5;
  JUMP_VELOCITY = -8;
  TERMINAL_VELOCITY = 10;
  COYOTE_TIME = 3;
  JUMP_BUFFER_TIME = 5;
  execute(context) {
    this.commands = [];
    const units = context.getAllUnits();
    for (const unit of units) {
      if (unit.meta?.jumping) {
        this.updateJump(context, unit);
      }
      if (unit.meta?.wasGrounded && !unit.meta?.jumping) {
        unit.meta.coyoteTimeLeft = this.COYOTE_TIME;
        unit.meta.wasGrounded = false;
      }
      if (unit.meta?.coyoteTimeLeft > 0) {
        unit.meta.coyoteTimeLeft--;
      }
      if (unit.meta?.jumpBuffered) {
        const timeSinceBuffer = context.getCurrentTick() - (unit.meta.jumpBufferTick || 0);
        if (timeSinceBuffer > this.JUMP_BUFFER_TIME) {
          unit.meta.jumpBuffered = false;
        }
      }
    }
    return this.commands;
  }
  updateJump(context, unit) {
    const jumpTarget = unit.meta.jumpTarget;
    const jumpOrigin = unit.meta.jumpOrigin || unit.pos;
    const progress = (unit.meta.jumpProgress || 0) + 1;
    const jumpDuration = 18;
    const t = progress / jumpDuration;
    let newX = jumpOrigin.x;
    let newY = jumpOrigin.y;
    if (jumpTarget && jumpOrigin) {
      const dx = jumpTarget.x - jumpOrigin.x;
      const dy = jumpTarget.y - jumpOrigin.y;
      newX = jumpOrigin.x + dx * t;
      newY = jumpOrigin.y + dy * t;
    }
    const peakHeight = unit.meta.jumpHeight || 6;
    const z = Math.max(0, 4 * peakHeight * t * (1 - t));
    if (progress >= jumpDuration) {
      if (jumpTarget) {
        this.commands.push({
          type: "move",
          params: {
            unitId: unit.id,
            x: jumpTarget.x,
            y: jumpTarget.y
          }
        });
      }
      if (unit.meta.jumpBuffered) {
        const timeSinceBuffer = context.getCurrentTick() - (unit.meta.jumpBufferTick || 0);
        if (timeSinceBuffer <= this.JUMP_BUFFER_TIME) {
          this.commands.push({
            type: "jump",
            unitId: unit.id,
            params: unit.meta.bufferedJumpParams || {}
          });
        }
        unit.meta.jumpBuffered = false;
      }
      if (unit.meta.jumpDamage && unit.meta.jumpRadius) {
        context.queueEvent({
          kind: "aoe",
          source: unit.id,
          target: unit.meta.jumpTarget || unit.pos,
          meta: {
            aspect: "kinetic",
            radius: unit.meta.jumpRadius,
            amount: unit.meta.jumpDamage,
            force: 3,
            friendlyFire: false,
            excludeSource: true
          }
        });
      }
      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            ...unit.meta,
            jumping: false,
            jumpProgress: 0,
            z: 0,
            jumpTarget: null,
            jumpOrigin: null,
            jumpDamage: null,
            jumpRadius: null
          }
        }
      });
    } else {
      this.commands.push({
        type: "move",
        params: {
          unitId: unit.id,
          x: newX,
          y: newY
        }
      });
      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            ...unit.meta,
            jumpProgress: progress,
            z
          }
        }
      });
    }
  }
}

// src/rules/airdrop_physics.ts
init_rule();

class AirdropPhysics extends Rule {
  constructor() {
    super();
  }
  execute(context) {
    const commands = [];
    const units = context.getAllUnits();
    units.forEach((unit) => {
      if (unit.meta.dropping && unit.meta.z > 0) {
        const newZ = unit.meta.z - (unit.meta.dropSpeed || 0.5);
        if (context.getCurrentTick() % 3 === 0) {
          commands.push({
            type: "particle",
            params: {
              particle: {
                pos: {
                  x: unit.pos.x + (context.getRandom() - 0.5) * 2,
                  y: unit.pos.y + (context.getRandom() - 0.5) * 2
                },
                vel: { x: (context.getRandom() - 0.5) * 0.4, y: 0.8 },
                radius: 0.5,
                lifetime: 15,
                color: "#AAAAAA",
                z: unit.meta.z + 1,
                type: "debris",
                landed: false
              }
            }
          });
        }
        if (newZ <= 0) {
          this.handleLanding(context, unit, commands);
        } else {
          commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                z: newZ
              }
            }
          });
        }
      }
    });
    return commands;
  }
  handleLanding(context, unit, commands) {
    const shouldApplyImpact = unit.meta.landingImpact;
    commands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          z: 0,
          dropping: false,
          landingImpact: false,
          dropSpeed: 0,
          landingInvulnerability: 10
        }
      }
    });
    if (shouldApplyImpact) {
      const impactRadius = unit.meta.huge ? 8 : 4;
      const impactDamage = unit.meta.huge ? 25 : 15;
      context.queueEvent({
        kind: "aoe",
        source: unit.id,
        target: unit.pos,
        meta: {
          aspect: "kinetic",
          radius: impactRadius,
          amount: impactDamage,
          force: 8,
          origin: unit.pos
        }
      });
    }
    for (let i = 0;i < 20; i++) {
      const angle = Math.PI * 2 * i / 20;
      const distance = 2 + context.getRandom() * 3;
      commands.push({
        type: "particle",
        params: {
          particle: {
            pos: {
              x: unit.pos.x + Math.cos(angle) * distance,
              y: unit.pos.y + Math.sin(angle) * distance
            },
            vel: {
              x: Math.cos(angle) * 0.8,
              y: Math.sin(angle) * 0.8
            },
            radius: 1 + context.getRandom(),
            lifetime: 30 + context.getRandom() * 20,
            color: "#8B4513",
            z: 0,
            type: "debris",
            landed: false
          }
        }
      });
    }
  }
}

// src/rules/tossing.ts
init_rule();

class Tossing extends Rule {
  commands = [];
  execute(context) {
    this.commands = [];
    const units = context.getAllUnits();
    for (const unit of units) {
      if (unit.meta.tossing) {
        this.processToss(context, unit);
      }
    }
    return this.commands;
  }
  processToss(context, unit) {
    const tossDuration = 8;
    const tossProgress = (unit.meta.tossProgress || 0) + 1;
    if (tossProgress >= tossDuration) {
      this.commands.push({
        type: "move",
        params: {
          unitId: unit.id,
          x: unit.meta.tossTarget?.x || unit.pos.x,
          y: unit.meta.tossTarget?.y || unit.pos.y,
          z: 0
        }
      });
      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            tossing: false,
            tossProgress: undefined,
            tossOrigin: undefined,
            tossTarget: undefined,
            tossForce: undefined
          }
        }
      });
      if (unit.meta.tossForce && unit.meta.tossForce > 3) {
        context.queueEvent({
          kind: "aoe",
          source: unit.id,
          target: unit.pos,
          meta: {
            radius: 1,
            amount: Math.floor(unit.meta.tossForce / 2)
          }
        });
      }
    } else {
      const progress = tossProgress / tossDuration;
      const origin = unit.meta.tossOrigin || { x: unit.pos.x, y: unit.pos.y };
      const target = unit.meta.tossTarget || { x: unit.pos.x, y: unit.pos.y };
      const newX = origin.x + (target.x - origin.x) * progress;
      const newY = origin.y + (target.y - origin.y) * progress;
      const maxHeight = 3;
      const newZ = maxHeight * Math.sin(progress * Math.PI) * 2;
      this.commands.push({
        type: "move",
        params: {
          unitId: unit.id,
          x: newX,
          y: newY,
          z: newZ
        }
      });
      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: { tossProgress }
        }
      });
    }
  }
}

// src/core/team_utils.ts
function areTeamsHostile(team1, team2) {
  if (team1 === team2)
    return false;
  if (team1 === "neutral" || team2 === "neutral")
    return false;
  return true;
}
function isEnemy(unit, other) {
  if (other.state === "dead")
    return false;
  return areTeamsHostile(unit.team, other.team);
}

// src/rules/dsl.ts
class DSL {
  static clearCache() {}
  static noun = (unit, allUnits, context, sort = null, filter = (u) => true, dist2Fn) => {
    const sortKey = sort ? "sorted" : "none";
    const cacheKey = `${unit.id}_${sortKey}`;
    const dist2 = dist2Fn || ((u1, u2) => {
      const dx = u1.pos.x - u2.pos.x;
      const dy = u1.pos.y - u2.pos.y;
      return dx * dx + dy * dy;
    });
    const isDistanceSort = sort && sort.toString().includes("dist2");
    return {
      ally: () => {
        let bestAlly = null;
        let bestScore = sort ? Infinity : 0;
        for (const u of allUnits) {
          if (u.team === unit.team && u.state !== "dead" && u.id !== unit.id && filter(u)) {
            if (!sort) {
              bestAlly = u;
              break;
            } else {
              const score = sort(u, unit);
              if (score < bestScore) {
                bestScore = score;
                bestAlly = u;
              }
            }
          }
        }
        return bestAlly;
      },
      enemy: () => {
        let bestEnemy = null;
        let bestScore = sort ? Infinity : 0;
        for (const u of allUnits) {
          if (isEnemy(unit, u) && filter(u)) {
            if (!sort) {
              return u;
            }
            const score = sort(u, unit);
            if (score < bestScore) {
              bestScore = score;
              bestEnemy = u;
            }
          }
        }
        return bestEnemy;
      },
      in_range: (range) => {
        const rangeFilter = (u) => {
          return dist2(u, unit) <= range * range && filter(u);
        };
        return this.noun(unit, allUnits, context, sort, rangeFilter, dist2);
      },
      enemy_in_range: (range) => {
        let bestEnemy = null;
        let bestScore = sort ? Infinity : 0;
        const rangeSq = range * range;
        for (const u of allUnits) {
          if (isEnemy(unit, u) && filter(u)) {
            const distSq = dist2(u, unit);
            if (distSq <= rangeSq) {
              if (!sort) {
                bestEnemy = u;
                break;
              } else {
                const score = sort(u, unit);
                if (score < bestScore) {
                  bestScore = score;
                  bestEnemy = u;
                }
              }
            }
          }
        }
        return bestEnemy;
      }
    };
  };
}

// src/rules/abilities.ts
init_rule();

// data/abilities.json
var exports_abilities = {};
__export(exports_abilities, {
  zapHighest: () => zapHighest,
  wingStorm: () => wingStorm,
  whipChain: () => whipChain,
  toss: () => toss,
  terrifyingRoar: () => terrifyingRoar,
  teleport: () => teleport,
  tameMegabeast: () => tameMegabeast,
  tacticalOverride: () => tacticalOverride,
  systemHack: () => systemHack,
  summonForestCreature: () => summonForestCreature,
  stomp: () => stomp,
  squirrel: () => squirrel,
  simpleHeal: () => simpleHeal,
  simpleAttack: () => simpleAttack,
  shieldRecharge: () => shieldRecharge,
  shieldGenerator: () => shieldGenerator,
  riddle: () => riddle,
  reinforceConstruct: () => reinforceConstruct,
  ranged: () => ranged,
  radiant: () => radiant,
  psychicHeal: () => psychicHeal,
  powerSurge: () => powerSurge,
  plant: () => plant,
  pinTarget: () => pinTarget,
  pinDown: () => pinDown,
  missileBarrage: () => missileBarrage,
  melee: () => melee,
  makeRain: () => makeRain,
  lightning: () => lightning,
  laserSweep: () => laserSweep,
  jumps: () => jumps,
  heal: () => heal,
  grapplingHook: () => grapplingHook,
  freezeAura: () => freezeAura,
  fireBlast: () => fireBlast,
  explode: () => explode,
  entangle: () => entangle,
  empPulse: () => empPulse,
  emergencyRepair: () => emergencyRepair,
  dualKnifeDance: () => dualKnifeDance,
  dragonFire: () => dragonFire,
  digTrench: () => digTrench,
  detectSpies: () => detectSpies,
  deployBot: () => deployBot,
  default: () => abilities_default,
  chargeAttack: () => chargeAttack,
  calmAnimals: () => calmAnimals,
  callAirdrop: () => callAirdrop,
  burrowAmbush: () => burrowAmbush,
  breatheFire: () => breatheFire,
  bombardier: () => bombardier,
  bite: () => bite
});
var plant = {
  name: "Plant Bush",
  cooldown: 60,
  effects: [
    {
      type: "plant",
      offsetX: 1,
      offsetY: 0
    }
  ]
};
var squirrel = {
  name: "Summon Squirrel",
  cooldown: 10,
  effects: [
    {
      type: "summon",
      unit: "squirrel",
      intendedProtectee: "self.id",
      posture: "guard"
    },
    {
      type: "projectile",
      id: "nut",
      pos: "self.pos",
      radius: 2,
      damage: 0,
      team: "self.team",
      projectileType: "bomb",
      target: "randomPos(self.pos.x, self.pos.y, 2)",
      origin: "self.pos",
      progress: 0,
      duration: 3,
      z: 0,
      aoeRadius: 0
    }
  ]
};
var jumps = {
  name: "Hurl Self",
  cooldown: 100,
  config: {
    height: 5,
    speed: 2,
    impact: {
      radius: 3,
      damage: 5
    },
    duration: 10
  },
  target: "closest.enemy()?.pos",
  trigger: "distance(closest.enemy()?.pos) > 10",
  effects: [
    {
      type: "jump",
      target: "target",
      condition: "target_exists",
      meta: {
        jumping: true,
        jumpProgress: 0,
        jumpOrigin: "self.pos",
        jumpTarget: "target"
      }
    }
  ]
};
var ranged = {
  name: "Sling Shot",
  cooldown: 6,
  config: {
    range: 10,
    damage: 4,
    speed: 2
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 10 && distance(closest.enemy()?.pos) > 2",
  effects: [
    {
      type: "projectile",
      id: "bullet",
      pos: "self.pos",
      vel: "normalized_direction_to_target * 2",
      radius: 1.5,
      damage: 4,
      team: "self.team",
      projectileType: "bullet"
    }
  ]
};
var bombardier = {
  name: "Bomb Toss",
  cooldown: 12,
  config: {
    range: 14,
    damage: 10,
    aoeRadius: 4,
    duration: 8
  },
  target: "closest.enemy()?.pos",
  trigger: "distance(closest.enemy()?.pos) <= 14 && distance(closest.enemy()?.pos) > 5",
  effects: [
    {
      type: "projectile",
      id: "bomb",
      pos: "self.pos",
      vel: "{ x: 0, y: 0 }",
      radius: 2,
      damage: 10,
      team: "self.team",
      projectileType: "bomb",
      target: "target",
      origin: "self.pos",
      progress: 0,
      duration: 4,
      z: 0,
      aoeRadius: 3
    }
  ]
};
var heal = {
  name: "Sacred Circle",
  cooldown: 40,
  config: {
    range: 8,
    healAmount: 8,
    aoeRadius: 3
  },
  target: "weakest.ally()",
  effects: [
    {
      type: "aoe",
      target: "centroid.wounded_allies() || self.pos",
      aspect: "heal",
      amount: 18,
      radius: 3,
      condition: "wounded_allies_in_range"
    }
  ]
};
var radiant = {
  name: "Radiant Strike",
  cooldown: 30,
  config: {
    range: 2,
    damage: 8,
    bonusDamage: 20
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 2",
  effects: [
    {
      type: "damage",
      target: "target",
      aspect: "radiant",
      amount: 20,
      origin: "self.pos"
    },
    {
      type: "heat",
      target: "target.pos",
      amount: 5,
      radius: 1
    }
  ]
};
var fireBlast = {
  name: "Fire Blast",
  cooldown: 40,
  config: {
    range: 3,
    damage: 12,
    radius: 2
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 3",
  effects: [
    {
      type: "damage",
      target: "target",
      aspect: "heat",
      amount: 12,
      origin: "self.pos"
    },
    {
      type: "heat",
      target: "target.pos",
      amount: 20,
      radius: 2
    },
    {
      type: "setOnFire",
      target: "target"
    },
    {
      type: "particles",
      particleType: "fire",
      count: 5,
      target: "target.pos",
      spread: 3
    }
  ]
};
var makeRain = {
  name: "Make Rain",
  cooldown: 200,
  config: {
    duration: 80,
    intensity: 0.8,
    radius: 5
  },
  effects: [
    {
      type: "weather",
      weatherType: "rain",
      duration: 80,
      intensity: 0.8
    },
    {
      type: "moisture",
      target: "self.pos",
      amount: 1,
      radius: 5
    },
    {
      type: "heat",
      target: "self.pos",
      amount: -10,
      radius: 5
    }
  ]
};
var breatheFire = {
  name: "Breathe Fire",
  cooldown: 60,
  config: {
    range: 4,
    coneAngle: 1.047,
    fireIntensity: 15,
    sparkCount: 8
  },
  effects: [
    {
      type: "cone",
      direction: "self.facing",
      range: 4,
      width: 3,
      effects: [
        {
          type: "heat",
          amount: 20,
          radius: 2
        },
        {
          type: "particles",
          particleType: "fire"
        },
        {
          type: "damage",
          aspect: "heat",
          amount: 15,
          origin: "self.pos"
        },
        {
          type: "setOnFire"
        }
      ]
    }
  ]
};
var deployBot = {
  name: "Deploy Bot",
  cooldown: 80,
  maxUses: 4,
  config: {
    range: 12,
    constructTypes: [
      "freezebot",
      "clanker",
      "spiker",
      "swarmbot",
      "roller",
      "zapper"
    ]
  },
  target: "closest.enemy()?.pos || self.pos",
  trigger: "distance(closest.enemy()?.pos) <= 12 || true",
  effects: [
    {
      type: "deploy",
      constructType: "pick(['freezebot', 'clanker', 'spiker', 'swarmbot', 'roller', 'zapper'])",
      target: "target"
    }
  ]
};
var missileBarrage = {
  name: "Missile Barrage",
  cooldown: 80,
  config: {
    range: 15,
    volleySize: 6
  },
  target: "closest.enemy()?.pos",
  trigger: "distance(closest.enemy()?.pos) <= 15",
  effects: [
    {
      type: "multiple_projectiles",
      count: 6,
      projectileType: "bomb",
      pos: "self.pos",
      vel: "{ x: 0, y: 0 }",
      radius: 3,
      damage: 12,
      team: "self.team",
      target: "target",
      spread: 8,
      origin: "self.pos",
      duration: 12,
      stagger: 2,
      z: 8
    }
  ]
};
var laserSweep = {
  name: "Laser Sweep",
  cooldown: 35,
  config: {
    range: 20,
    width: 3
  },
  target: "closest.enemy()?.pos",
  trigger: "distance(closest.enemy()?.pos) <= 20",
  effects: [
    {
      type: "projectile",
      projectileType: "laser_beam",
      pos: "self.pos",
      vel: "normalized_direction_to_target * 2",
      target: "target",
      origin: "self.pos",
      progress: 0,
      duration: "max(4, floor(distance_to_target / 3))",
      z: 0,
      radius: 2,
      color: "#FF0000"
    },
    {
      type: "particles",
      particleType: "muzzle_flash",
      pos: "self.pos",
      color: "#FFFF00",
      lifetime: 6
    },
    {
      type: "particles",
      particleType: "laser_impact",
      pos: "target",
      color: "#FF8800",
      lifetime: 8
    },
    {
      type: "line_aoe",
      start: "self.pos",
      end: "target",
      width: 3,
      aspect: "laser",
      amount: 15,
      piercing: true
    }
  ]
};
var empPulse = {
  name: "EMP Pulse",
  cooldown: 100,
  config: {
    radius: 8,
    duration: 40
  },
  target: "self.pos",
  trigger: "closest.enemy() && distance(closest.enemy()?.pos) <= 8",
  effects: [
    {
      type: "aoe",
      target: "self.pos",
      aspect: "emp",
      radius: 8,
      amount: 0,
      stunDuration: 40,
      disruptor: true
    }
  ]
};
var shieldRecharge = {
  name: "Shield Recharge",
  cooldown: 120,
  target: "self.pos",
  trigger: "self.hp < self.maxHp * 0.5",
  effects: [
    {
      type: "heal",
      target: "self",
      aspect: "technological",
      amount: "Math.floor(self.maxHp * 0.3)"
    },
    {
      type: "buff",
      target: "self",
      meta: {
        shieldActive: true,
        shieldDuration: 60,
        damageReduction: 0.5
      }
    }
  ]
};
var callAirdrop = {
  name: "Call Mechatron Airdrop",
  cooldown: 120,
  config: {
    range: 20,
    minAllies: 2
  },
  target: "closest.enemy()?.pos",
  trigger: "distance(closest.enemy()?.pos) > 8",
  effects: [
    {
      type: "airdrop",
      unit: "mechatron",
      target: "target"
    },
    {
      type: "buff",
      target: "self",
      meta: {
        calledAirdrop: true,
        airdropTick: "sim.tick"
      }
    }
  ]
};
var tacticalOverride = {
  name: "Tactical Override",
  cooldown: 45,
  config: {
    range: 6,
    boostAmount: 0.5
  },
  target: "self.pos",
  trigger: "closest.ally() != null",
  effects: [
    {
      type: "area_buff",
      target: "self.pos",
      radius: 6,
      condition: "target.tags.includes('mechanical')",
      buff: {
        tacticalBoost: true,
        tacticalBoostDuration: 40,
        resetCooldowns: true
      }
    },
    {
      type: "particles",
      particleType: "energy",
      pos: "self.pos",
      color: "#00FFFF",
      lifetime: 30
    }
  ]
};
var reinforceConstruct = {
  name: "Reinforce Construct",
  cooldown: 45,
  config: {
    range: 3
  },
  target: "closest.ally()",
  trigger: "closest.ally()?.tags?.includes('construct')",
  effects: [
    {
      type: "buff",
      target: "target",
      buff: {
        maxHp: "+10",
        armor: "+1"
      }
    },
    {
      type: "heal",
      target: "target",
      amount: 10
    },
    {
      type: "particles",
      particleType: "energy",
      pos: "target.pos",
      color: "#00FF88",
      lifetime: 20
    }
  ]
};
var powerSurge = {
  name: "Power Surge",
  cooldown: 40,
  config: {
    range: 4
  },
  target: "self.pos",
  trigger: "closest.ally()?.tags?.includes('construct') || closest.ally()?.tags?.includes('mechanical')",
  effects: [
    {
      type: "area_buff",
      target: "self.pos",
      radius: 4,
      condition: "target.tags.includes('construct') || target.tags.includes('mechanical')",
      buff: {
        resetCooldowns: true
      }
    },
    {
      type: "particles",
      particleType: "energy_field",
      pos: "self.pos",
      color: "#FFAA00",
      count: 8,
      lifetime: 30
    }
  ]
};
var emergencyRepair = {
  name: "Emergency Repair",
  cooldown: 35,
  config: {
    range: 2
  },
  target: "closest.ally()",
  trigger: "closest.ally()?.hp < closest.ally()?.maxHp * 0.7",
  effects: [
    {
      type: "heal",
      target: "target",
      amount: 15
    },
    {
      type: "cleanse",
      target: "target",
      effectsToRemove: [
        "stunned",
        "stunDuration",
        "frozen"
      ]
    },
    {
      type: "particles",
      particleType: "electric_spark",
      pos: "target.pos",
      color: "#FFFF00",
      count: 6,
      lifetime: 15
    }
  ]
};
var shieldGenerator = {
  name: "Shield Generator",
  cooldown: 60,
  config: {
    range: 3
  },
  target: "self.pos",
  trigger: "distance(closest.enemy()?.pos) <= 6",
  effects: [
    {
      type: "area_particles",
      center: "self.pos",
      size: "3x3",
      particleType: "energy",
      color: "#00CCFF",
      lifetime: 80,
      z: 2,
      blockProjectiles: true
    }
  ]
};
var systemHack = {
  name: "System Hack",
  cooldown: 50,
  config: {
    range: 6
  },
  target: "closest.enemy()?.pos",
  trigger: "distance(closest.enemy()?.pos) <= 6",
  effects: [
    {
      type: "debuff",
      target: "target",
      debuff: {
        systemsHacked: true,
        hackDuration: 30,
        disableAbilities: true
      }
    },
    {
      type: "particles",
      particleType: "energy",
      pos: "target.pos",
      color: "#FF0088",
      lifetime: 30
    }
  ]
};
var freezeAura = {
  name: "Chill Aura",
  cooldown: 15,
  config: {
    radius: 2
  },
  effects: [
    {
      type: "aoe",
      target: "self.pos",
      aspect: "chill",
      radius: 2,
      amount: 0,
      origin: "self.pos"
    }
  ]
};
var explode = {
  name: "Self Destruct",
  cooldown: 1,
  trigger: "distance(closest.enemy()?.pos) <= 3",
  effects: [
    {
      type: "aoe",
      target: "self.pos",
      aspect: "impact",
      radius: 3,
      amount: 8,
      force: 5,
      origin: "self.pos"
    },
    {
      type: "damage",
      target: "self",
      aspect: "impact",
      amount: 999
    }
  ]
};
var whipChain = {
  name: "Chain Whip",
  cooldown: 20,
  config: {
    range: 3
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 3",
  effects: [
    {
      type: "damage",
      target: "target",
      aspect: "impact",
      amount: 4,
      force: 3,
      origin: "self.pos"
    }
  ]
};
var chargeAttack = {
  name: "Roller Charge",
  cooldown: 30,
  config: {
    chargeDistance: 5
  },
  trigger: "distance(closest.enemy()?.pos) <= 6",
  effects: [
    {
      type: "buff",
      target: "self",
      buff: {
        charging: true,
        chargeProgress: 0,
        chargeTarget: "target?.pos || {x: self.pos.x + 5, y: self.pos.y}"
      }
    }
  ]
};
var zapHighest = {
  name: "Power Zap",
  cooldown: 25,
  config: {
    range: 6
  },
  effects: [
    {
      type: "damage",
      target: "healthiest.enemy_in_range(6)",
      aspect: "shock",
      amount: 6,
      origin: "self.pos"
    }
  ]
};
var grapplingHook = {
  name: "Grappling Hook",
  cooldown: 30,
  config: {
    range: 8
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 8",
  effects: [
    {
      type: "grapple",
      target: "target"
    }
  ]
};
var melee = {
  name: "Melee Attack",
  cooldown: 10,
  config: {
    damage: 5,
    range: 2
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 2",
  effects: [
    {
      type: "damage",
      target: "target",
      aspect: "physical",
      amount: 5,
      origin: "self.pos"
    }
  ]
};
var simpleAttack = {
  name: "Simple Attack",
  cooldown: 5,
  config: {
    damage: 3,
    range: 1
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 1",
  effects: [
    {
      type: "damage",
      target: "target",
      aspect: "physical",
      amount: 3,
      origin: "self.pos"
    }
  ]
};
var simpleHeal = {
  name: "Simple Heal",
  cooldown: 10,
  config: {
    healAmount: 5,
    range: 3
  },
  target: "weakest.ally() || self",
  trigger: "(weakest.ally() && distance(weakest.ally()?.pos) <= 3) || self.hp < self.maxHp",
  effects: [
    {
      type: "heal",
      target: "target",
      aspect: "healing",
      amount: 5
    }
  ]
};
var bite = {
  name: "Bite",
  cooldown: 8,
  config: {
    damage: 4,
    range: 1
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 1",
  effects: [
    {
      type: "damage",
      target: "target",
      aspect: "physical",
      amount: 4,
      origin: "self.pos"
    }
  ]
};
var stomp = {
  name: "Stomp",
  cooldown: 20,
  config: {
    damage: 8,
    range: 2,
    radius: 2
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 2",
  effects: [
    {
      type: "aoe",
      target: "self.pos",
      aspect: "impact",
      amount: 8,
      radius: 2,
      origin: "self.pos"
    }
  ]
};
var lightning = {
  name: "Lightning Strike",
  cooldown: 40,
  config: {
    damage: 15,
    range: 10
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 10",
  effects: [
    {
      type: "lightning",
      target: "target.pos"
    },
    {
      type: "damage",
      target: "target",
      aspect: "shock",
      amount: 15,
      origin: "self.pos"
    }
  ]
};
var toss = {
  name: "Toss",
  cooldown: 20,
  config: {
    range: 2,
    throwDistance: 5
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 2",
  effects: [
    {
      type: "toss",
      target: "target",
      distance: 5
    }
  ]
};
var pinDown = {
  name: "Pin Down",
  cooldown: 30,
  config: {
    range: 1,
    duration: 30
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 1",
  effects: [
    {
      type: "pin",
      target: "target",
      duration: 30
    }
  ]
};
var detectSpies = {
  name: "Detect Spies",
  cooldown: 40,
  config: {
    range: 6
  },
  effects: [
    {
      type: "reveal",
      radius: 6,
      target: "self.pos"
    }
  ]
};
var dualKnifeDance = {
  name: "Dual Knife Dance",
  cooldown: 25,
  config: {
    range: 2
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 2",
  effects: [
    {
      type: "damage",
      target: "target",
      aspect: "physical",
      amount: 4
    },
    {
      type: "damage",
      target: "target",
      aspect: "physical",
      amount: 4
    }
  ]
};
var burrowAmbush = {
  name: "Burrow Ambush",
  cooldown: 60,
  target: "closest.enemy()",
  effects: [
    {
      type: "burrow",
      duration: 15,
      target: "self"
    },
    {
      type: "damage",
      target: "target",
      aspect: "physical",
      amount: 8,
      delay: 15
    }
  ]
};
var pinTarget = {
  name: "Pin Target",
  cooldown: 30,
  config: {
    range: 5
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 5",
  effects: [
    {
      type: "pin",
      target: "target",
      duration: 20
    }
  ]
};
var summonForestCreature = {
  name: "Summon Forest Creature",
  cooldown: 60,
  maxUses: 3,
  config: {
    creatures: [
      "squirrel",
      "deer",
      "wolf",
      "bear"
    ]
  },
  effects: [
    {
      type: "summon",
      unit: "pick(['squirrel', 'deer', 'wolf', 'bear'])",
      target: "self.pos"
    }
  ]
};
var entangle = {
  name: "Entangle",
  cooldown: 40,
  target: "closest.enemy()",
  effects: [
    {
      type: "entangle",
      target: "target",
      duration: 30,
      radius: 3
    }
  ]
};
var tameMegabeast = {
  name: "Tame Megabeast",
  cooldown: 80,
  config: {
    range: 3
  },
  target: "closest.enemy()",
  trigger: "distance(closest.enemy()?.pos) <= 3 && closest.enemy()?.tags?.includes('megabeast')",
  effects: [
    {
      type: "tame",
      target: "target"
    }
  ]
};
var calmAnimals = {
  name: "Calm Animals",
  cooldown: 40,
  config: {
    range: 5
  },
  effects: [
    {
      type: "calm",
      radius: 5,
      target: "self.pos"
    }
  ]
};
var psychicHeal = {
  name: "Psychic Heal",
  cooldown: 40,
  trigger: "distance(weakest.ally()?.pos) <= 6",
  effects: [
    {
      type: "heal",
      amount: 15,
      target: "weakest.ally()"
    }
  ]
};
var digTrench = {
  name: "Dig Trench",
  cooldown: 60,
  effects: [
    {
      type: "terrain",
      terrainType: "trench",
      duration: 200,
      target: "self.pos",
      radius: 2
    }
  ]
};
var riddle = {
  name: "Sphinx's Riddle",
  cooldown: 100,
  trigger: "closest.ally() != null && distance(closest.ally()?.pos) <= 2",
  target: "closest.ally()",
  effects: [
    {
      type: "buff",
      stat: "wisdom",
      duration: 50,
      meta: {
        riddleText: "Answer my riddle for wisdom...",
        interactionType: "dialogue"
      }
    }
  ]
};
var teleport = {
  name: "Ancient Teleport",
  cooldown: 30,
  trigger: "distance(closest.enemy()?.pos) <= 3",
  target: "randomPos(self.pos.x, self.pos.y, 10)",
  effects: [
    {
      type: "move",
      teleport: true,
      meta: {
        particles: "ancient_dust",
        sound: "phase_shift"
      }
    }
  ]
};
var dragonFire = {
  name: "Dragon's Breath",
  cooldown: 40,
  config: {
    range: 8,
    coneAngle: 1.57,
    damage: 30
  },
  target: "closest.enemy()?.pos",
  trigger: "distance(closest.enemy()?.pos) <= 8",
  effects: [
    {
      type: "cone",
      direction: "self.facing",
      range: 8,
      width: 5,
      effects: [
        {
          type: "heat",
          amount: 50,
          radius: 3
        },
        {
          type: "particles",
          particleType: "fire",
          count: 20
        },
        {
          type: "damage",
          aspect: "heat",
          amount: 30,
          origin: "self.pos"
        },
        {
          type: "setOnFire"
        }
      ]
    }
  ]
};
var wingStorm = {
  name: "Wing Storm",
  cooldown: 60,
  config: {
    radius: 10,
    knockback: 8
  },
  target: "self.pos",
  trigger: "count.enemies_in_range(10) >= 2",
  effects: [
    {
      type: "aoe",
      target: "self.pos",
      aspect: "wind",
      radius: 10,
      amount: 15,
      force: 8,
      origin: "self.pos"
    },
    {
      type: "particles",
      particleType: "dust",
      pos: "self.pos",
      count: 30,
      spread: 10
    }
  ]
};
var terrifyingRoar = {
  name: "Terrifying Roar",
  cooldown: 80,
  config: {
    radius: 15,
    fearDuration: 40
  },
  target: "self.pos",
  trigger: "self.hp < self.maxHp * 0.5",
  effects: [
    {
      type: "aoe",
      target: "self.pos",
      aspect: "fear",
      radius: 15,
      amount: 0,
      stunDuration: 40
    },
    {
      type: "buff",
      target: "self",
      meta: {
        enraged: true,
        damageBoost: 1.5,
        speedBoost: 1.5,
        duration: 60
      }
    },
    {
      type: "particles",
      particleType: "shockwave",
      pos: "self.pos",
      color: "#FF0000",
      lifetime: 30
    }
  ]
};
var abilities_default = {
  plant,
  squirrel,
  jumps,
  ranged,
  bombardier,
  heal,
  radiant,
  fireBlast,
  makeRain,
  breatheFire,
  deployBot,
  missileBarrage,
  laserSweep,
  empPulse,
  shieldRecharge,
  callAirdrop,
  tacticalOverride,
  reinforceConstruct,
  powerSurge,
  emergencyRepair,
  shieldGenerator,
  systemHack,
  freezeAura,
  explode,
  whipChain,
  chargeAttack,
  zapHighest,
  grapplingHook,
  melee,
  simpleAttack,
  simpleHeal,
  bite,
  stomp,
  lightning,
  toss,
  pinDown,
  detectSpies,
  dualKnifeDance,
  burrowAmbush,
  pinTarget,
  summonForestCreature,
  entangle,
  tameMegabeast,
  calmAnimals,
  psychicHeal,
  digTrench,
  riddle,
  teleport,
  dragonFire,
  wingStorm,
  terrifyingRoar
};

// node_modules/ohm-js/src/common.js
var exports_common = {};
__export(exports_common, {
  unexpectedObjToString: () => unexpectedObjToString,
  unescapeCodePoint: () => unescapeCodePoint,
  repeatStr: () => repeatStr,
  repeatFn: () => repeatFn,
  repeat: () => repeat,
  padLeft: () => padLeft,
  isSyntactic: () => isSyntactic,
  isLexical: () => isLexical,
  getDuplicates: () => getDuplicates,
  defineLazyProperty: () => defineLazyProperty,
  copyWithoutDuplicates: () => copyWithoutDuplicates,
  clone: () => clone,
  checkNotNull: () => checkNotNull,
  assert: () => assert,
  abstract: () => abstract,
  StringBuffer: () => StringBuffer
});
var escapeStringFor = {};
for (let c = 0;c < 128; c++) {
  escapeStringFor[c] = String.fromCharCode(c);
}
escapeStringFor[39] = "\\'";
escapeStringFor[34] = "\\\"";
escapeStringFor[92] = "\\\\";
escapeStringFor[8] = "\\b";
escapeStringFor[12] = "\\f";
escapeStringFor[10] = "\\n";
escapeStringFor[13] = "\\r";
escapeStringFor[9] = "\\t";
escapeStringFor[11] = "\\v";
function abstract(optMethodName) {
  const methodName = optMethodName || "";
  return function() {
    throw new Error("this method " + methodName + " is abstract! " + "(it has no implementation in class " + this.constructor.name + ")");
  };
}
function assert(cond, message) {
  if (!cond) {
    throw new Error(message || "Assertion failed");
  }
}
function defineLazyProperty(obj, propName, getterFn) {
  let memo;
  Object.defineProperty(obj, propName, {
    get() {
      if (!memo) {
        memo = getterFn.call(this);
      }
      return memo;
    }
  });
}
function clone(obj) {
  if (obj) {
    return Object.assign({}, obj);
  }
  return obj;
}
function repeatFn(fn, n) {
  const arr = [];
  while (n-- > 0) {
    arr.push(fn());
  }
  return arr;
}
function repeatStr(str, n) {
  return new Array(n + 1).join(str);
}
function repeat(x, n) {
  return repeatFn(() => x, n);
}
function getDuplicates(array) {
  const duplicates = [];
  for (let idx = 0;idx < array.length; idx++) {
    const x = array[idx];
    if (array.lastIndexOf(x) !== idx && duplicates.indexOf(x) < 0) {
      duplicates.push(x);
    }
  }
  return duplicates;
}
function copyWithoutDuplicates(array) {
  const noDuplicates = [];
  array.forEach((entry) => {
    if (noDuplicates.indexOf(entry) < 0) {
      noDuplicates.push(entry);
    }
  });
  return noDuplicates;
}
function isSyntactic(ruleName) {
  const firstChar = ruleName[0];
  return firstChar === firstChar.toUpperCase();
}
function isLexical(ruleName) {
  return !isSyntactic(ruleName);
}
function padLeft(str, len, optChar) {
  const ch = optChar || " ";
  if (str.length < len) {
    return repeatStr(ch, len - str.length) + str;
  }
  return str;
}
function StringBuffer() {
  this.strings = [];
}
StringBuffer.prototype.append = function(str) {
  this.strings.push(str);
};
StringBuffer.prototype.contents = function() {
  return this.strings.join("");
};
var escapeUnicode = (str) => String.fromCodePoint(parseInt(str, 16));
function unescapeCodePoint(s) {
  if (s.charAt(0) === "\\") {
    switch (s.charAt(1)) {
      case "b":
        return "\b";
      case "f":
        return "\f";
      case "n":
        return `
`;
      case "r":
        return "\r";
      case "t":
        return "\t";
      case "v":
        return "\v";
      case "x":
        return escapeUnicode(s.slice(2, 4));
      case "u":
        return s.charAt(2) === "{" ? escapeUnicode(s.slice(3, -1)) : escapeUnicode(s.slice(2, 6));
      default:
        return s.charAt(1);
    }
  } else {
    return s;
  }
}
function unexpectedObjToString(obj) {
  if (obj == null) {
    return String(obj);
  }
  const baseToString = Object.prototype.toString.call(obj);
  try {
    let typeName;
    if (obj.constructor && obj.constructor.name) {
      typeName = obj.constructor.name;
    } else if (baseToString.indexOf("[object ") === 0) {
      typeName = baseToString.slice(8, -1);
    } else {
      typeName = typeof obj;
    }
    return typeName + ": " + JSON.stringify(String(obj));
  } catch (e) {
    return baseToString;
  }
}
function checkNotNull(obj, message = "unexpected null value") {
  if (obj == null) {
    throw new Error(message);
  }
  return obj;
}

// node_modules/ohm-js/src/UnicodeCategories.js
var UnicodeCategories = {
  Lu: /\p{Lu}/u,
  Ll: /\p{Ll}/u,
  Lt: /\p{Lt}/u,
  Lm: /\p{Lm}/u,
  Lo: /\p{Lo}/u,
  Nl: /\p{Nl}/u,
  Nd: /\p{Nd}/u,
  Mn: /\p{Mn}/u,
  Mc: /\p{Mc}/u,
  Pc: /\p{Pc}/u,
  Zs: /\p{Zs}/u,
  L: /\p{Letter}/u,
  Ltmo: /\p{Lt}|\p{Lm}|\p{Lo}/u
};

// node_modules/ohm-js/src/pexprs-main.js
class PExpr {
  constructor() {
    if (this.constructor === PExpr) {
      throw new Error("PExpr cannot be instantiated -- it's abstract");
    }
  }
  withSource(interval) {
    if (interval) {
      this.source = interval.trimmed();
    }
    return this;
  }
}
var any = Object.create(PExpr.prototype);
var end = Object.create(PExpr.prototype);

class Terminal extends PExpr {
  constructor(obj) {
    super();
    this.obj = obj;
  }
}

class Range extends PExpr {
  constructor(from, to) {
    super();
    this.from = from;
    this.to = to;
    this.matchCodePoint = from.length > 1 || to.length > 1;
  }
}

class Param extends PExpr {
  constructor(index) {
    super();
    this.index = index;
  }
}

class Alt extends PExpr {
  constructor(terms) {
    super();
    this.terms = terms;
  }
}

class Extend extends Alt {
  constructor(superGrammar, name, body) {
    const origBody = superGrammar.rules[name].body;
    super([body, origBody]);
    this.superGrammar = superGrammar;
    this.name = name;
    this.body = body;
  }
}

class Splice extends Alt {
  constructor(superGrammar, ruleName, beforeTerms, afterTerms) {
    const origBody = superGrammar.rules[ruleName].body;
    super([...beforeTerms, origBody, ...afterTerms]);
    this.superGrammar = superGrammar;
    this.ruleName = ruleName;
    this.expansionPos = beforeTerms.length;
  }
}

class Seq extends PExpr {
  constructor(factors) {
    super();
    this.factors = factors;
  }
}

class Iter extends PExpr {
  constructor(expr) {
    super();
    this.expr = expr;
  }
}

class Star extends Iter {
}

class Plus extends Iter {
}

class Opt extends Iter {
}
Star.prototype.operator = "*";
Plus.prototype.operator = "+";
Opt.prototype.operator = "?";
Star.prototype.minNumMatches = 0;
Plus.prototype.minNumMatches = 1;
Opt.prototype.minNumMatches = 0;
Star.prototype.maxNumMatches = Number.POSITIVE_INFINITY;
Plus.prototype.maxNumMatches = Number.POSITIVE_INFINITY;
Opt.prototype.maxNumMatches = 1;

class Not extends PExpr {
  constructor(expr) {
    super();
    this.expr = expr;
  }
}

class Lookahead extends PExpr {
  constructor(expr) {
    super();
    this.expr = expr;
  }
}

class Lex extends PExpr {
  constructor(expr) {
    super();
    this.expr = expr;
  }
}

class Apply extends PExpr {
  constructor(ruleName, args = []) {
    super();
    this.ruleName = ruleName;
    this.args = args;
  }
  isSyntactic() {
    return isSyntactic(this.ruleName);
  }
  toMemoKey() {
    if (!this._memoKey) {
      Object.defineProperty(this, "_memoKey", { value: this.toString() });
    }
    return this._memoKey;
  }
}

class UnicodeChar extends PExpr {
  constructor(category) {
    super();
    this.category = category;
    this.pattern = UnicodeCategories[category];
  }
}

// node_modules/ohm-js/src/errors.js
function createError(message, optInterval) {
  let e;
  if (optInterval) {
    e = new Error(optInterval.getLineAndColumnMessage() + message);
    e.shortMessage = message;
    e.interval = optInterval;
  } else {
    e = new Error(message);
  }
  return e;
}
function intervalSourcesDontMatch() {
  return createError("Interval sources don't match");
}
function grammarSyntaxError(matchFailure) {
  const e = new Error;
  Object.defineProperty(e, "message", {
    enumerable: true,
    get() {
      return matchFailure.message;
    }
  });
  Object.defineProperty(e, "shortMessage", {
    enumerable: true,
    get() {
      return "Expected " + matchFailure.getExpectedText();
    }
  });
  e.interval = matchFailure.getInterval();
  return e;
}
function undeclaredGrammar(grammarName, namespace, interval) {
  const message = namespace ? `Grammar ${grammarName} is not declared in namespace '${namespace}'` : "Undeclared grammar " + grammarName;
  return createError(message, interval);
}
function duplicateGrammarDeclaration(grammar, namespace) {
  return createError("Grammar " + grammar.name + " is already declared in this namespace");
}
function grammarDoesNotSupportIncrementalParsing(grammar) {
  return createError(`Grammar '${grammar.name}' does not support incremental parsing`);
}
function undeclaredRule(ruleName, grammarName, optInterval) {
  return createError("Rule " + ruleName + " is not declared in grammar " + grammarName, optInterval);
}
function cannotOverrideUndeclaredRule(ruleName, grammarName, optSource) {
  return createError("Cannot override rule " + ruleName + " because it is not declared in " + grammarName, optSource);
}
function cannotExtendUndeclaredRule(ruleName, grammarName, optSource) {
  return createError("Cannot extend rule " + ruleName + " because it is not declared in " + grammarName, optSource);
}
function duplicateRuleDeclaration(ruleName, grammarName, declGrammarName, optSource) {
  let message = "Duplicate declaration for rule '" + ruleName + "' in grammar '" + grammarName + "'";
  if (grammarName !== declGrammarName) {
    message += " (originally declared in '" + declGrammarName + "')";
  }
  return createError(message, optSource);
}
function wrongNumberOfParameters(ruleName, expected, actual, source) {
  return createError("Wrong number of parameters for rule " + ruleName + " (expected " + expected + ", got " + actual + ")", source);
}
function wrongNumberOfArguments(ruleName, expected, actual, expr) {
  return createError("Wrong number of arguments for rule " + ruleName + " (expected " + expected + ", got " + actual + ")", expr);
}
function duplicateParameterNames(ruleName, duplicates, source) {
  return createError("Duplicate parameter names in rule " + ruleName + ": " + duplicates.join(", "), source);
}
function invalidParameter(ruleName, expr) {
  return createError("Invalid parameter to rule " + ruleName + ": " + expr + " has arity " + expr.getArity() + ", but parameter expressions must have arity 1", expr.source);
}
var syntacticVsLexicalNote = "NOTE: A _syntactic rule_ is a rule whose name begins with a capital letter. " + "See https://ohmjs.org/d/svl for more details.";
function applicationOfSyntacticRuleFromLexicalContext(ruleName, applyExpr) {
  return createError("Cannot apply syntactic rule " + ruleName + " from here (inside a lexical context)", applyExpr.source);
}
function applySyntacticWithLexicalRuleApplication(applyExpr) {
  const { ruleName } = applyExpr;
  return createError(`applySyntactic is for syntactic rules, but '${ruleName}' is a lexical rule. ` + syntacticVsLexicalNote, applyExpr.source);
}
function unnecessaryExperimentalApplySyntactic(applyExpr) {
  return createError("applySyntactic is not required here (in a syntactic context)", applyExpr.source);
}
function incorrectArgumentType(expectedType, expr) {
  return createError("Incorrect argument type: expected " + expectedType, expr.source);
}
function multipleSuperSplices(expr) {
  return createError("'...' can appear at most once in a rule body", expr.source);
}
function invalidCodePoint(applyWrapper) {
  const node = applyWrapper._node;
  assert(node && node.isNonterminal() && node.ctorName === "escapeChar_unicodeCodePoint");
  const digitIntervals = applyWrapper.children.slice(1, -1).map((d) => d.source);
  const fullInterval = digitIntervals[0].coverageWith(...digitIntervals.slice(1));
  return createError(`U+${fullInterval.contents} is not a valid Unicode code point`, fullInterval);
}
function kleeneExprHasNullableOperand(kleeneExpr, applicationStack) {
  const actuals = applicationStack.length > 0 ? applicationStack[applicationStack.length - 1].args : [];
  const expr = kleeneExpr.expr.substituteParams(actuals);
  let message = "Nullable expression " + expr + " is not allowed inside '" + kleeneExpr.operator + "' (possible infinite loop)";
  if (applicationStack.length > 0) {
    const stackTrace = applicationStack.map((app) => new Apply(app.ruleName, app.args)).join(`
`);
    message += `
Application stack (most recent application last):
` + stackTrace;
  }
  return createError(message, kleeneExpr.expr.source);
}
function inconsistentArity(ruleName, expected, actual, expr) {
  return createError("Rule " + ruleName + " involves an alternation which has inconsistent arity " + "(expected " + expected + ", got " + actual + ")", expr.source);
}
function multipleErrors(errors) {
  const messages = errors.map((e) => e.message);
  return createError(["Errors:"].concat(messages).join(`
- `), errors[0].interval);
}
function missingSemanticAction(ctorName, name, type, stack) {
  let stackTrace = stack.slice(0, -1).map((info) => {
    const ans = "  " + info[0].name + " > " + info[1];
    return info.length === 3 ? ans + " for '" + info[2] + "'" : ans;
  }).join(`
`);
  stackTrace += `
  ` + name + " > " + ctorName;
  let moreInfo = "";
  if (ctorName === "_iter") {
    moreInfo = [
      `
NOTE: as of Ohm v16, there is no default action for iteration nodes — see `,
      "  https://ohmjs.org/d/dsa for details."
    ].join(`
`);
  }
  const message = [
    `Missing semantic action for '${ctorName}' in ${type} '${name}'.${moreInfo}`,
    "Action stack (most recent call last):",
    stackTrace
  ].join(`
`);
  const e = createError(message);
  e.name = "missingSemanticAction";
  return e;
}
function throwErrors(errors) {
  if (errors.length === 1) {
    throw errors[0];
  }
  if (errors.length > 1) {
    throw multipleErrors(errors);
  }
}

// node_modules/ohm-js/src/util.js
function padNumbersToEqualLength(arr) {
  let maxLen = 0;
  const strings = arr.map((n) => {
    const str = n.toString();
    maxLen = Math.max(maxLen, str.length);
    return str;
  });
  return strings.map((s) => padLeft(s, maxLen));
}
function strcpy(dest, src, offset) {
  const origDestLen = dest.length;
  const start = dest.slice(0, offset);
  const end2 = dest.slice(offset + src.length);
  return (start + src + end2).substr(0, origDestLen);
}
function lineAndColumnToMessage(...ranges) {
  const lineAndCol = this;
  const { offset } = lineAndCol;
  const { repeatStr: repeatStr2 } = exports_common;
  const sb = new StringBuffer;
  sb.append("Line " + lineAndCol.lineNum + ", col " + lineAndCol.colNum + `:
`);
  const lineNumbers = padNumbersToEqualLength([
    lineAndCol.prevLine == null ? 0 : lineAndCol.lineNum - 1,
    lineAndCol.lineNum,
    lineAndCol.nextLine == null ? 0 : lineAndCol.lineNum + 1
  ]);
  const appendLine = (num, content, prefix) => {
    sb.append(prefix + lineNumbers[num] + " | " + content + `
`);
  };
  if (lineAndCol.prevLine != null) {
    appendLine(0, lineAndCol.prevLine, "  ");
  }
  appendLine(1, lineAndCol.line, "> ");
  const lineLen = lineAndCol.line.length;
  let indicationLine = repeatStr2(" ", lineLen + 1);
  for (let i = 0;i < ranges.length; ++i) {
    let startIdx = ranges[i][0];
    let endIdx = ranges[i][1];
    assert(startIdx >= 0 && startIdx <= endIdx, "range start must be >= 0 and <= end");
    const lineStartOffset = offset - lineAndCol.colNum + 1;
    startIdx = Math.max(0, startIdx - lineStartOffset);
    endIdx = Math.min(endIdx - lineStartOffset, lineLen);
    indicationLine = strcpy(indicationLine, repeatStr2("~", endIdx - startIdx), startIdx);
  }
  const gutterWidth = 2 + lineNumbers[1].length + 3;
  sb.append(repeatStr2(" ", gutterWidth));
  indicationLine = strcpy(indicationLine, "^", lineAndCol.colNum - 1);
  sb.append(indicationLine.replace(/ +$/, "") + `
`);
  if (lineAndCol.nextLine != null) {
    appendLine(2, lineAndCol.nextLine, "  ");
  }
  return sb.contents();
}
var builtInRulesCallbacks = [];
function awaitBuiltInRules(cb) {
  builtInRulesCallbacks.push(cb);
}
function announceBuiltInRules(grammar) {
  builtInRulesCallbacks.forEach((cb) => {
    cb(grammar);
  });
  builtInRulesCallbacks = null;
}
function getLineAndColumn(str, offset) {
  let lineNum = 1;
  let colNum = 1;
  let currOffset = 0;
  let lineStartOffset = 0;
  let nextLine = null;
  let prevLine = null;
  let prevLineStartOffset = -1;
  while (currOffset < offset) {
    const c = str.charAt(currOffset++);
    if (c === `
`) {
      lineNum++;
      colNum = 1;
      prevLineStartOffset = lineStartOffset;
      lineStartOffset = currOffset;
    } else if (c !== "\r") {
      colNum++;
    }
  }
  let lineEndOffset = str.indexOf(`
`, lineStartOffset);
  if (lineEndOffset === -1) {
    lineEndOffset = str.length;
  } else {
    const nextLineEndOffset = str.indexOf(`
`, lineEndOffset + 1);
    nextLine = nextLineEndOffset === -1 ? str.slice(lineEndOffset) : str.slice(lineEndOffset, nextLineEndOffset);
    nextLine = nextLine.replace(/^\r?\n/, "").replace(/\r$/, "");
  }
  if (prevLineStartOffset >= 0) {
    prevLine = str.slice(prevLineStartOffset, lineStartOffset).replace(/\r?\n$/, "");
  }
  const line = str.slice(lineStartOffset, lineEndOffset).replace(/\r$/, "");
  return {
    offset,
    lineNum,
    colNum,
    line,
    prevLine,
    nextLine,
    toString: lineAndColumnToMessage
  };
}
function getLineAndColumnMessage(str, offset, ...ranges) {
  return getLineAndColumn(str, offset).toString(...ranges);
}
var uniqueId = (() => {
  let idCounter = 0;
  return (prefix) => "" + prefix + idCounter++;
})();

// node_modules/ohm-js/src/Interval.js
class Interval {
  constructor(sourceString, startIdx, endIdx) {
    this.sourceString = sourceString;
    this.startIdx = startIdx;
    this.endIdx = endIdx;
  }
  get contents() {
    if (this._contents === undefined) {
      this._contents = this.sourceString.slice(this.startIdx, this.endIdx);
    }
    return this._contents;
  }
  get length() {
    return this.endIdx - this.startIdx;
  }
  coverageWith(...intervals) {
    return Interval.coverage(...intervals, this);
  }
  collapsedLeft() {
    return new Interval(this.sourceString, this.startIdx, this.startIdx);
  }
  collapsedRight() {
    return new Interval(this.sourceString, this.endIdx, this.endIdx);
  }
  getLineAndColumn() {
    return getLineAndColumn(this.sourceString, this.startIdx);
  }
  getLineAndColumnMessage() {
    const range = [this.startIdx, this.endIdx];
    return getLineAndColumnMessage(this.sourceString, this.startIdx, range);
  }
  minus(that) {
    if (this.sourceString !== that.sourceString) {
      throw intervalSourcesDontMatch();
    } else if (this.startIdx === that.startIdx && this.endIdx === that.endIdx) {
      return [];
    } else if (this.startIdx < that.startIdx && that.endIdx < this.endIdx) {
      return [
        new Interval(this.sourceString, this.startIdx, that.startIdx),
        new Interval(this.sourceString, that.endIdx, this.endIdx)
      ];
    } else if (this.startIdx < that.endIdx && that.endIdx < this.endIdx) {
      return [new Interval(this.sourceString, that.endIdx, this.endIdx)];
    } else if (this.startIdx < that.startIdx && that.startIdx < this.endIdx) {
      return [new Interval(this.sourceString, this.startIdx, that.startIdx)];
    } else {
      return [this];
    }
  }
  relativeTo(that) {
    if (this.sourceString !== that.sourceString) {
      throw intervalSourcesDontMatch();
    }
    assert(this.startIdx >= that.startIdx && this.endIdx <= that.endIdx, "other interval does not cover this one");
    return new Interval(this.sourceString, this.startIdx - that.startIdx, this.endIdx - that.startIdx);
  }
  trimmed() {
    const { contents } = this;
    const startIdx = this.startIdx + contents.match(/^\s*/)[0].length;
    const endIdx = this.endIdx - contents.match(/\s*$/)[0].length;
    return new Interval(this.sourceString, startIdx, endIdx);
  }
  subInterval(offset, len) {
    const newStartIdx = this.startIdx + offset;
    return new Interval(this.sourceString, newStartIdx, newStartIdx + len);
  }
}
Interval.coverage = function(firstInterval, ...intervals) {
  let { startIdx, endIdx } = firstInterval;
  for (const interval of intervals) {
    if (interval.sourceString !== firstInterval.sourceString) {
      throw intervalSourcesDontMatch();
    } else {
      startIdx = Math.min(startIdx, interval.startIdx);
      endIdx = Math.max(endIdx, interval.endIdx);
    }
  }
  return new Interval(firstInterval.sourceString, startIdx, endIdx);
};

// node_modules/ohm-js/src/InputStream.js
var MAX_CHAR_CODE = 65535;

class InputStream {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.examinedLength = 0;
  }
  atEnd() {
    const ans = this.pos >= this.source.length;
    this.examinedLength = Math.max(this.examinedLength, this.pos + 1);
    return ans;
  }
  next() {
    const ans = this.source[this.pos++];
    this.examinedLength = Math.max(this.examinedLength, this.pos);
    return ans;
  }
  nextCharCode() {
    const nextChar = this.next();
    return nextChar && nextChar.charCodeAt(0);
  }
  nextCodePoint() {
    const cp = this.source.slice(this.pos++).codePointAt(0);
    if (cp > MAX_CHAR_CODE) {
      this.pos += 1;
    }
    this.examinedLength = Math.max(this.examinedLength, this.pos);
    return cp;
  }
  matchString(s, optIgnoreCase) {
    let idx;
    if (optIgnoreCase) {
      for (idx = 0;idx < s.length; idx++) {
        const actual = this.next();
        const expected = s[idx];
        if (actual == null || actual.toUpperCase() !== expected.toUpperCase()) {
          return false;
        }
      }
      return true;
    }
    for (idx = 0;idx < s.length; idx++) {
      if (this.next() !== s[idx]) {
        return false;
      }
    }
    return true;
  }
  sourceSlice(startIdx, endIdx) {
    return this.source.slice(startIdx, endIdx);
  }
  interval(startIdx, optEndIdx) {
    return new Interval(this.source, startIdx, optEndIdx ? optEndIdx : this.pos);
  }
}

// node_modules/ohm-js/src/MatchResult.js
class MatchResult {
  constructor(matcher, input, startExpr, cst, cstOffset, rightmostFailurePosition, optRecordedFailures) {
    this.matcher = matcher;
    this.input = input;
    this.startExpr = startExpr;
    this._cst = cst;
    this._cstOffset = cstOffset;
    this._rightmostFailurePosition = rightmostFailurePosition;
    this._rightmostFailures = optRecordedFailures;
    if (this.failed()) {
      defineLazyProperty(this, "message", function() {
        const detail = "Expected " + this.getExpectedText();
        return getLineAndColumnMessage(this.input, this.getRightmostFailurePosition()) + detail;
      });
      defineLazyProperty(this, "shortMessage", function() {
        const detail = "expected " + this.getExpectedText();
        const errorInfo = getLineAndColumn(this.input, this.getRightmostFailurePosition());
        return "Line " + errorInfo.lineNum + ", col " + errorInfo.colNum + ": " + detail;
      });
    }
  }
  succeeded() {
    return !!this._cst;
  }
  failed() {
    return !this.succeeded();
  }
  getRightmostFailurePosition() {
    return this._rightmostFailurePosition;
  }
  getRightmostFailures() {
    if (!this._rightmostFailures) {
      this.matcher.setInput(this.input);
      const matchResultWithFailures = this.matcher._match(this.startExpr, {
        tracing: false,
        positionToRecordFailures: this.getRightmostFailurePosition()
      });
      this._rightmostFailures = matchResultWithFailures.getRightmostFailures();
    }
    return this._rightmostFailures;
  }
  toString() {
    return this.succeeded() ? "[match succeeded]" : "[match failed at position " + this.getRightmostFailurePosition() + "]";
  }
  getExpectedText() {
    if (this.succeeded()) {
      throw new Error("cannot get expected text of a successful MatchResult");
    }
    const sb = new StringBuffer;
    let failures = this.getRightmostFailures();
    failures = failures.filter((failure) => !failure.isFluffy());
    for (let idx = 0;idx < failures.length; idx++) {
      if (idx > 0) {
        if (idx === failures.length - 1) {
          sb.append(failures.length > 2 ? ", or " : " or ");
        } else {
          sb.append(", ");
        }
      }
      sb.append(failures[idx].toString());
    }
    return sb.contents();
  }
  getInterval() {
    const pos = this.getRightmostFailurePosition();
    return new Interval(this.input, pos, pos);
  }
}

// node_modules/ohm-js/src/PosInfo.js
class PosInfo {
  constructor() {
    this.applicationMemoKeyStack = [];
    this.memo = {};
    this.maxExaminedLength = 0;
    this.maxRightmostFailureOffset = -1;
    this.currentLeftRecursion = undefined;
  }
  isActive(application) {
    return this.applicationMemoKeyStack.indexOf(application.toMemoKey()) >= 0;
  }
  enter(application) {
    this.applicationMemoKeyStack.push(application.toMemoKey());
  }
  exit() {
    this.applicationMemoKeyStack.pop();
  }
  startLeftRecursion(headApplication, memoRec) {
    memoRec.isLeftRecursion = true;
    memoRec.headApplication = headApplication;
    memoRec.nextLeftRecursion = this.currentLeftRecursion;
    this.currentLeftRecursion = memoRec;
    const { applicationMemoKeyStack } = this;
    const indexOfFirstInvolvedRule = applicationMemoKeyStack.indexOf(headApplication.toMemoKey()) + 1;
    const involvedApplicationMemoKeys = applicationMemoKeyStack.slice(indexOfFirstInvolvedRule);
    memoRec.isInvolved = function(applicationMemoKey) {
      return involvedApplicationMemoKeys.indexOf(applicationMemoKey) >= 0;
    };
    memoRec.updateInvolvedApplicationMemoKeys = function() {
      for (let idx = indexOfFirstInvolvedRule;idx < applicationMemoKeyStack.length; idx++) {
        const applicationMemoKey = applicationMemoKeyStack[idx];
        if (!this.isInvolved(applicationMemoKey)) {
          involvedApplicationMemoKeys.push(applicationMemoKey);
        }
      }
    };
  }
  endLeftRecursion() {
    this.currentLeftRecursion = this.currentLeftRecursion.nextLeftRecursion;
  }
  shouldUseMemoizedResult(memoRec) {
    if (!memoRec.isLeftRecursion) {
      return true;
    }
    const { applicationMemoKeyStack } = this;
    for (let idx = 0;idx < applicationMemoKeyStack.length; idx++) {
      const applicationMemoKey = applicationMemoKeyStack[idx];
      if (memoRec.isInvolved(applicationMemoKey)) {
        return false;
      }
    }
    return true;
  }
  memoize(memoKey, memoRec) {
    this.memo[memoKey] = memoRec;
    this.maxExaminedLength = Math.max(this.maxExaminedLength, memoRec.examinedLength);
    this.maxRightmostFailureOffset = Math.max(this.maxRightmostFailureOffset, memoRec.rightmostFailureOffset);
    return memoRec;
  }
  clearObsoleteEntries(pos, invalidatedIdx) {
    if (pos + this.maxExaminedLength <= invalidatedIdx) {
      return;
    }
    const { memo } = this;
    this.maxExaminedLength = 0;
    this.maxRightmostFailureOffset = -1;
    Object.keys(memo).forEach((k) => {
      const memoRec = memo[k];
      if (pos + memoRec.examinedLength > invalidatedIdx) {
        delete memo[k];
      } else {
        this.maxExaminedLength = Math.max(this.maxExaminedLength, memoRec.examinedLength);
        this.maxRightmostFailureOffset = Math.max(this.maxRightmostFailureOffset, memoRec.rightmostFailureOffset);
      }
    });
  }
}

// node_modules/ohm-js/src/Trace.js
var BALLOT_X = "✗";
var CHECK_MARK = "✓";
var DOT_OPERATOR = "⋅";
var RIGHTWARDS_DOUBLE_ARROW = "⇒";
var SYMBOL_FOR_HORIZONTAL_TABULATION = "␉";
var SYMBOL_FOR_LINE_FEED = "␊";
var SYMBOL_FOR_CARRIAGE_RETURN = "␍";
var Flags = {
  succeeded: 1 << 0,
  isRootNode: 1 << 1,
  isImplicitSpaces: 1 << 2,
  isMemoized: 1 << 3,
  isHeadOfLeftRecursion: 1 << 4,
  terminatesLR: 1 << 5
};
function spaces(n) {
  return repeat(" ", n).join("");
}
function getInputExcerpt(input, pos, len) {
  const excerpt = asEscapedString(input.slice(pos, pos + len));
  if (excerpt.length < len) {
    return excerpt + repeat(" ", len - excerpt.length).join("");
  }
  return excerpt;
}
function asEscapedString(obj) {
  if (typeof obj === "string") {
    return obj.replace(/ /g, DOT_OPERATOR).replace(/\t/g, SYMBOL_FOR_HORIZONTAL_TABULATION).replace(/\n/g, SYMBOL_FOR_LINE_FEED).replace(/\r/g, SYMBOL_FOR_CARRIAGE_RETURN);
  }
  return String(obj);
}

class Trace {
  constructor(input, pos1, pos2, expr, succeeded, bindings, optChildren) {
    this.input = input;
    this.pos = this.pos1 = pos1;
    this.pos2 = pos2;
    this.source = new Interval(input, pos1, pos2);
    this.expr = expr;
    this.bindings = bindings;
    this.children = optChildren || [];
    this.terminatingLREntry = null;
    this._flags = succeeded ? Flags.succeeded : 0;
  }
  get displayString() {
    return this.expr.toDisplayString();
  }
  clone() {
    return this.cloneWithExpr(this.expr);
  }
  cloneWithExpr(expr) {
    const ans = new Trace(this.input, this.pos, this.pos2, expr, this.succeeded, this.bindings, this.children);
    ans.isHeadOfLeftRecursion = this.isHeadOfLeftRecursion;
    ans.isImplicitSpaces = this.isImplicitSpaces;
    ans.isMemoized = this.isMemoized;
    ans.isRootNode = this.isRootNode;
    ans.terminatesLR = this.terminatesLR;
    ans.terminatingLREntry = this.terminatingLREntry;
    return ans;
  }
  recordLRTermination(ruleBodyTrace, value) {
    this.terminatingLREntry = new Trace(this.input, this.pos, this.pos2, this.expr, false, [value], [ruleBodyTrace]);
    this.terminatingLREntry.terminatesLR = true;
  }
  walk(visitorObjOrFn, optThisArg) {
    let visitor = visitorObjOrFn;
    if (typeof visitor === "function") {
      visitor = { enter: visitor };
    }
    function _walk(node, parent, depth) {
      let recurse = true;
      if (visitor.enter) {
        if (visitor.enter.call(optThisArg, node, parent, depth) === Trace.prototype.SKIP) {
          recurse = false;
        }
      }
      if (recurse) {
        node.children.forEach((child) => {
          _walk(child, node, depth + 1);
        });
        if (visitor.exit) {
          visitor.exit.call(optThisArg, node, parent, depth);
        }
      }
    }
    if (this.isRootNode) {
      this.children.forEach((c) => {
        _walk(c, null, 0);
      });
    } else {
      _walk(this, null, 0);
    }
  }
  toString() {
    const sb = new StringBuffer;
    this.walk((node, parent, depth) => {
      if (!node) {
        return this.SKIP;
      }
      const ctorName = node.expr.constructor.name;
      if (ctorName === "Alt") {
        return;
      }
      sb.append(getInputExcerpt(node.input, node.pos, 10) + spaces(depth * 2 + 1));
      sb.append((node.succeeded ? CHECK_MARK : BALLOT_X) + " " + node.displayString);
      if (node.isHeadOfLeftRecursion) {
        sb.append(" (LR)");
      }
      if (node.succeeded) {
        const contents = asEscapedString(node.source.contents);
        sb.append(" " + RIGHTWARDS_DOUBLE_ARROW + "  ");
        sb.append(typeof contents === "string" ? '"' + contents + '"' : contents);
      }
      sb.append(`
`);
    });
    return sb.contents();
  }
}
Trace.prototype.SKIP = {};
Object.keys(Flags).forEach((name) => {
  const mask = Flags[name];
  Object.defineProperty(Trace.prototype, name, {
    get() {
      return (this._flags & mask) !== 0;
    },
    set(val) {
      if (val) {
        this._flags |= mask;
      } else {
        this._flags &= ~mask;
      }
    }
  });
});

// node_modules/ohm-js/src/pexprs-allowsSkippingPrecedingSpace.js
PExpr.prototype.allowsSkippingPrecedingSpace = abstract("allowsSkippingPrecedingSpace");
any.allowsSkippingPrecedingSpace = end.allowsSkippingPrecedingSpace = Apply.prototype.allowsSkippingPrecedingSpace = Terminal.prototype.allowsSkippingPrecedingSpace = Range.prototype.allowsSkippingPrecedingSpace = UnicodeChar.prototype.allowsSkippingPrecedingSpace = function() {
  return true;
};
Alt.prototype.allowsSkippingPrecedingSpace = Iter.prototype.allowsSkippingPrecedingSpace = Lex.prototype.allowsSkippingPrecedingSpace = Lookahead.prototype.allowsSkippingPrecedingSpace = Not.prototype.allowsSkippingPrecedingSpace = Param.prototype.allowsSkippingPrecedingSpace = Seq.prototype.allowsSkippingPrecedingSpace = function() {
  return false;
};

// node_modules/ohm-js/src/pexprs-assertAllApplicationsAreValid.js
var BuiltInRules;
awaitBuiltInRules((g) => {
  BuiltInRules = g;
});
var lexifyCount;
PExpr.prototype.assertAllApplicationsAreValid = function(ruleName, grammar) {
  lexifyCount = 0;
  this._assertAllApplicationsAreValid(ruleName, grammar);
};
PExpr.prototype._assertAllApplicationsAreValid = abstract("_assertAllApplicationsAreValid");
any._assertAllApplicationsAreValid = end._assertAllApplicationsAreValid = Terminal.prototype._assertAllApplicationsAreValid = Range.prototype._assertAllApplicationsAreValid = Param.prototype._assertAllApplicationsAreValid = UnicodeChar.prototype._assertAllApplicationsAreValid = function(ruleName, grammar) {};
Lex.prototype._assertAllApplicationsAreValid = function(ruleName, grammar) {
  lexifyCount++;
  this.expr._assertAllApplicationsAreValid(ruleName, grammar);
  lexifyCount--;
};
Alt.prototype._assertAllApplicationsAreValid = function(ruleName, grammar) {
  for (let idx = 0;idx < this.terms.length; idx++) {
    this.terms[idx]._assertAllApplicationsAreValid(ruleName, grammar);
  }
};
Seq.prototype._assertAllApplicationsAreValid = function(ruleName, grammar) {
  for (let idx = 0;idx < this.factors.length; idx++) {
    this.factors[idx]._assertAllApplicationsAreValid(ruleName, grammar);
  }
};
Iter.prototype._assertAllApplicationsAreValid = Not.prototype._assertAllApplicationsAreValid = Lookahead.prototype._assertAllApplicationsAreValid = function(ruleName, grammar) {
  this.expr._assertAllApplicationsAreValid(ruleName, grammar);
};
Apply.prototype._assertAllApplicationsAreValid = function(ruleName, grammar, skipSyntacticCheck = false) {
  const ruleInfo = grammar.rules[this.ruleName];
  const isContextSyntactic = isSyntactic(ruleName) && lexifyCount === 0;
  if (!ruleInfo) {
    throw undeclaredRule(this.ruleName, grammar.name, this.source);
  }
  if (!skipSyntacticCheck && isSyntactic(this.ruleName) && !isContextSyntactic) {
    throw applicationOfSyntacticRuleFromLexicalContext(this.ruleName, this);
  }
  const actual = this.args.length;
  const expected = ruleInfo.formals.length;
  if (actual !== expected) {
    throw wrongNumberOfArguments(this.ruleName, expected, actual, this.source);
  }
  const isBuiltInApplySyntactic = BuiltInRules && ruleInfo === BuiltInRules.rules.applySyntactic;
  const isBuiltInCaseInsensitive = BuiltInRules && ruleInfo === BuiltInRules.rules.caseInsensitive;
  if (isBuiltInCaseInsensitive) {
    if (!(this.args[0] instanceof Terminal)) {
      throw incorrectArgumentType('a Terminal (e.g. "abc")', this.args[0]);
    }
  }
  if (isBuiltInApplySyntactic) {
    const arg = this.args[0];
    if (!(arg instanceof Apply)) {
      throw incorrectArgumentType("a syntactic rule application", arg);
    }
    if (!isSyntactic(arg.ruleName)) {
      throw applySyntacticWithLexicalRuleApplication(arg);
    }
    if (isContextSyntactic) {
      throw unnecessaryExperimentalApplySyntactic(this);
    }
  }
  this.args.forEach((arg) => {
    arg._assertAllApplicationsAreValid(ruleName, grammar, isBuiltInApplySyntactic);
    if (arg.getArity() !== 1) {
      throw invalidParameter(this.ruleName, arg);
    }
  });
};

// node_modules/ohm-js/src/pexprs-assertChoicesHaveUniformArity.js
PExpr.prototype.assertChoicesHaveUniformArity = abstract("assertChoicesHaveUniformArity");
any.assertChoicesHaveUniformArity = end.assertChoicesHaveUniformArity = Terminal.prototype.assertChoicesHaveUniformArity = Range.prototype.assertChoicesHaveUniformArity = Param.prototype.assertChoicesHaveUniformArity = Lex.prototype.assertChoicesHaveUniformArity = UnicodeChar.prototype.assertChoicesHaveUniformArity = function(ruleName) {};
Alt.prototype.assertChoicesHaveUniformArity = function(ruleName) {
  if (this.terms.length === 0) {
    return;
  }
  const arity = this.terms[0].getArity();
  for (let idx = 0;idx < this.terms.length; idx++) {
    const term = this.terms[idx];
    term.assertChoicesHaveUniformArity();
    const otherArity = term.getArity();
    if (arity !== otherArity) {
      throw inconsistentArity(ruleName, arity, otherArity, term);
    }
  }
};
Extend.prototype.assertChoicesHaveUniformArity = function(ruleName) {
  const actualArity = this.terms[0].getArity();
  const expectedArity = this.terms[1].getArity();
  if (actualArity !== expectedArity) {
    throw inconsistentArity(ruleName, expectedArity, actualArity, this.terms[0]);
  }
};
Seq.prototype.assertChoicesHaveUniformArity = function(ruleName) {
  for (let idx = 0;idx < this.factors.length; idx++) {
    this.factors[idx].assertChoicesHaveUniformArity(ruleName);
  }
};
Iter.prototype.assertChoicesHaveUniformArity = function(ruleName) {
  this.expr.assertChoicesHaveUniformArity(ruleName);
};
Not.prototype.assertChoicesHaveUniformArity = function(ruleName) {};
Lookahead.prototype.assertChoicesHaveUniformArity = function(ruleName) {
  this.expr.assertChoicesHaveUniformArity(ruleName);
};
Apply.prototype.assertChoicesHaveUniformArity = function(ruleName) {};

// node_modules/ohm-js/src/pexprs-assertIteratedExprsAreNotNullable.js
PExpr.prototype.assertIteratedExprsAreNotNullable = abstract("assertIteratedExprsAreNotNullable");
any.assertIteratedExprsAreNotNullable = end.assertIteratedExprsAreNotNullable = Terminal.prototype.assertIteratedExprsAreNotNullable = Range.prototype.assertIteratedExprsAreNotNullable = Param.prototype.assertIteratedExprsAreNotNullable = UnicodeChar.prototype.assertIteratedExprsAreNotNullable = function(grammar) {};
Alt.prototype.assertIteratedExprsAreNotNullable = function(grammar) {
  for (let idx = 0;idx < this.terms.length; idx++) {
    this.terms[idx].assertIteratedExprsAreNotNullable(grammar);
  }
};
Seq.prototype.assertIteratedExprsAreNotNullable = function(grammar) {
  for (let idx = 0;idx < this.factors.length; idx++) {
    this.factors[idx].assertIteratedExprsAreNotNullable(grammar);
  }
};
Iter.prototype.assertIteratedExprsAreNotNullable = function(grammar) {
  this.expr.assertIteratedExprsAreNotNullable(grammar);
  if (this.expr.isNullable(grammar)) {
    throw kleeneExprHasNullableOperand(this, []);
  }
};
Opt.prototype.assertIteratedExprsAreNotNullable = Not.prototype.assertIteratedExprsAreNotNullable = Lookahead.prototype.assertIteratedExprsAreNotNullable = Lex.prototype.assertIteratedExprsAreNotNullable = function(grammar) {
  this.expr.assertIteratedExprsAreNotNullable(grammar);
};
Apply.prototype.assertIteratedExprsAreNotNullable = function(grammar) {
  this.args.forEach((arg) => {
    arg.assertIteratedExprsAreNotNullable(grammar);
  });
};

// node_modules/ohm-js/src/nodes.js
class Node {
  constructor(matchLength) {
    this.matchLength = matchLength;
  }
  get ctorName() {
    throw new Error("subclass responsibility");
  }
  numChildren() {
    return this.children ? this.children.length : 0;
  }
  childAt(idx) {
    if (this.children) {
      return this.children[idx];
    }
  }
  indexOfChild(arg) {
    return this.children.indexOf(arg);
  }
  hasChildren() {
    return this.numChildren() > 0;
  }
  hasNoChildren() {
    return !this.hasChildren();
  }
  onlyChild() {
    if (this.numChildren() !== 1) {
      throw new Error("cannot get only child of a node of type " + this.ctorName + " (it has " + this.numChildren() + " children)");
    } else {
      return this.firstChild();
    }
  }
  firstChild() {
    if (this.hasNoChildren()) {
      throw new Error("cannot get first child of a " + this.ctorName + " node, which has no children");
    } else {
      return this.childAt(0);
    }
  }
  lastChild() {
    if (this.hasNoChildren()) {
      throw new Error("cannot get last child of a " + this.ctorName + " node, which has no children");
    } else {
      return this.childAt(this.numChildren() - 1);
    }
  }
  childBefore(child) {
    const childIdx = this.indexOfChild(child);
    if (childIdx < 0) {
      throw new Error("Node.childBefore() called w/ an argument that is not a child");
    } else if (childIdx === 0) {
      throw new Error("cannot get child before first child");
    } else {
      return this.childAt(childIdx - 1);
    }
  }
  childAfter(child) {
    const childIdx = this.indexOfChild(child);
    if (childIdx < 0) {
      throw new Error("Node.childAfter() called w/ an argument that is not a child");
    } else if (childIdx === this.numChildren() - 1) {
      throw new Error("cannot get child after last child");
    } else {
      return this.childAt(childIdx + 1);
    }
  }
  isTerminal() {
    return false;
  }
  isNonterminal() {
    return false;
  }
  isIteration() {
    return false;
  }
  isOptional() {
    return false;
  }
}

class TerminalNode extends Node {
  get ctorName() {
    return "_terminal";
  }
  isTerminal() {
    return true;
  }
  get primitiveValue() {
    throw new Error("The `primitiveValue` property was removed in Ohm v17.");
  }
}

class NonterminalNode extends Node {
  constructor(ruleName, children, childOffsets, matchLength) {
    super(matchLength);
    this.ruleName = ruleName;
    this.children = children;
    this.childOffsets = childOffsets;
  }
  get ctorName() {
    return this.ruleName;
  }
  isNonterminal() {
    return true;
  }
  isLexical() {
    return isLexical(this.ctorName);
  }
  isSyntactic() {
    return isSyntactic(this.ctorName);
  }
}

class IterationNode extends Node {
  constructor(children, childOffsets, matchLength, isOptional) {
    super(matchLength);
    this.children = children;
    this.childOffsets = childOffsets;
    this.optional = isOptional;
  }
  get ctorName() {
    return "_iter";
  }
  isIteration() {
    return true;
  }
  isOptional() {
    return this.optional;
  }
}

// node_modules/ohm-js/src/pexprs-eval.js
PExpr.prototype.eval = abstract("eval");
any.eval = function(state) {
  const { inputStream } = state;
  const origPos = inputStream.pos;
  const cp = inputStream.nextCodePoint();
  if (cp !== undefined) {
    state.pushBinding(new TerminalNode(String.fromCodePoint(cp).length), origPos);
    return true;
  } else {
    state.processFailure(origPos, this);
    return false;
  }
};
end.eval = function(state) {
  const { inputStream } = state;
  const origPos = inputStream.pos;
  if (inputStream.atEnd()) {
    state.pushBinding(new TerminalNode(0), origPos);
    return true;
  } else {
    state.processFailure(origPos, this);
    return false;
  }
};
Terminal.prototype.eval = function(state) {
  const { inputStream } = state;
  const origPos = inputStream.pos;
  if (!inputStream.matchString(this.obj)) {
    state.processFailure(origPos, this);
    return false;
  } else {
    state.pushBinding(new TerminalNode(this.obj.length), origPos);
    return true;
  }
};
Range.prototype.eval = function(state) {
  const { inputStream } = state;
  const origPos = inputStream.pos;
  const cp = this.matchCodePoint ? inputStream.nextCodePoint() : inputStream.nextCharCode();
  if (cp !== undefined && this.from.codePointAt(0) <= cp && cp <= this.to.codePointAt(0)) {
    state.pushBinding(new TerminalNode(String.fromCodePoint(cp).length), origPos);
    return true;
  } else {
    state.processFailure(origPos, this);
    return false;
  }
};
Param.prototype.eval = function(state) {
  return state.eval(state.currentApplication().args[this.index]);
};
Lex.prototype.eval = function(state) {
  state.enterLexifiedContext();
  const ans = state.eval(this.expr);
  state.exitLexifiedContext();
  return ans;
};
Alt.prototype.eval = function(state) {
  for (let idx = 0;idx < this.terms.length; idx++) {
    if (state.eval(this.terms[idx])) {
      return true;
    }
  }
  return false;
};
Seq.prototype.eval = function(state) {
  for (let idx = 0;idx < this.factors.length; idx++) {
    const factor = this.factors[idx];
    if (!state.eval(factor)) {
      return false;
    }
  }
  return true;
};
Iter.prototype.eval = function(state) {
  const { inputStream } = state;
  const origPos = inputStream.pos;
  const arity = this.getArity();
  const cols = [];
  const colOffsets = [];
  while (cols.length < arity) {
    cols.push([]);
    colOffsets.push([]);
  }
  let numMatches = 0;
  let prevPos = origPos;
  let idx;
  while (numMatches < this.maxNumMatches && state.eval(this.expr)) {
    if (inputStream.pos === prevPos) {
      throw kleeneExprHasNullableOperand(this, state._applicationStack);
    }
    prevPos = inputStream.pos;
    numMatches++;
    const row = state._bindings.splice(state._bindings.length - arity, arity);
    const rowOffsets = state._bindingOffsets.splice(state._bindingOffsets.length - arity, arity);
    for (idx = 0;idx < row.length; idx++) {
      cols[idx].push(row[idx]);
      colOffsets[idx].push(rowOffsets[idx]);
    }
  }
  if (numMatches < this.minNumMatches) {
    return false;
  }
  let offset = state.posToOffset(origPos);
  let matchLength = 0;
  if (numMatches > 0) {
    const lastCol = cols[arity - 1];
    const lastColOffsets = colOffsets[arity - 1];
    const endOffset = lastColOffsets[lastColOffsets.length - 1] + lastCol[lastCol.length - 1].matchLength;
    offset = colOffsets[0][0];
    matchLength = endOffset - offset;
  }
  const isOptional = this instanceof Opt;
  for (idx = 0;idx < cols.length; idx++) {
    state._bindings.push(new IterationNode(cols[idx], colOffsets[idx], matchLength, isOptional));
    state._bindingOffsets.push(offset);
  }
  return true;
};
Not.prototype.eval = function(state) {
  const { inputStream } = state;
  const origPos = inputStream.pos;
  state.pushFailuresInfo();
  const ans = state.eval(this.expr);
  state.popFailuresInfo();
  if (ans) {
    state.processFailure(origPos, this);
    return false;
  }
  inputStream.pos = origPos;
  return true;
};
Lookahead.prototype.eval = function(state) {
  const { inputStream } = state;
  const origPos = inputStream.pos;
  if (state.eval(this.expr)) {
    inputStream.pos = origPos;
    return true;
  } else {
    return false;
  }
};
Apply.prototype.eval = function(state) {
  const caller = state.currentApplication();
  const actuals = caller ? caller.args : [];
  const app = this.substituteParams(actuals);
  const posInfo = state.getCurrentPosInfo();
  if (posInfo.isActive(app)) {
    return app.handleCycle(state);
  }
  const memoKey = app.toMemoKey();
  const memoRec = posInfo.memo[memoKey];
  if (memoRec && posInfo.shouldUseMemoizedResult(memoRec)) {
    if (state.hasNecessaryInfo(memoRec)) {
      return state.useMemoizedResult(state.inputStream.pos, memoRec);
    }
    delete posInfo.memo[memoKey];
  }
  return app.reallyEval(state);
};
Apply.prototype.handleCycle = function(state) {
  const posInfo = state.getCurrentPosInfo();
  const { currentLeftRecursion } = posInfo;
  const memoKey = this.toMemoKey();
  let memoRec = posInfo.memo[memoKey];
  if (currentLeftRecursion && currentLeftRecursion.headApplication.toMemoKey() === memoKey) {
    memoRec.updateInvolvedApplicationMemoKeys();
  } else if (!memoRec) {
    memoRec = posInfo.memoize(memoKey, {
      matchLength: 0,
      examinedLength: 0,
      value: false,
      rightmostFailureOffset: -1
    });
    posInfo.startLeftRecursion(this, memoRec);
  }
  return state.useMemoizedResult(state.inputStream.pos, memoRec);
};
Apply.prototype.reallyEval = function(state) {
  const { inputStream } = state;
  const origPos = inputStream.pos;
  const origPosInfo = state.getCurrentPosInfo();
  const ruleInfo = state.grammar.rules[this.ruleName];
  const { body } = ruleInfo;
  const { description } = ruleInfo;
  state.enterApplication(origPosInfo, this);
  if (description) {
    state.pushFailuresInfo();
  }
  const origInputStreamExaminedLength = inputStream.examinedLength;
  inputStream.examinedLength = 0;
  let value = this.evalOnce(body, state);
  const currentLR = origPosInfo.currentLeftRecursion;
  const memoKey = this.toMemoKey();
  const isHeadOfLeftRecursion = currentLR && currentLR.headApplication.toMemoKey() === memoKey;
  let memoRec;
  if (state.doNotMemoize) {
    state.doNotMemoize = false;
  } else if (isHeadOfLeftRecursion) {
    value = this.growSeedResult(body, state, origPos, currentLR, value);
    origPosInfo.endLeftRecursion();
    memoRec = currentLR;
    memoRec.examinedLength = inputStream.examinedLength - origPos;
    memoRec.rightmostFailureOffset = state._getRightmostFailureOffset();
    origPosInfo.memoize(memoKey, memoRec);
  } else if (!currentLR || !currentLR.isInvolved(memoKey)) {
    memoRec = origPosInfo.memoize(memoKey, {
      matchLength: inputStream.pos - origPos,
      examinedLength: inputStream.examinedLength - origPos,
      value,
      failuresAtRightmostPosition: state.cloneRecordedFailures(),
      rightmostFailureOffset: state._getRightmostFailureOffset()
    });
  }
  const succeeded = !!value;
  if (description) {
    state.popFailuresInfo();
    if (!succeeded) {
      state.processFailure(origPos, this);
    }
    if (memoRec) {
      memoRec.failuresAtRightmostPosition = state.cloneRecordedFailures();
    }
  }
  if (state.isTracing() && memoRec) {
    const entry = state.getTraceEntry(origPos, this, succeeded, succeeded ? [value] : []);
    if (isHeadOfLeftRecursion) {
      assert(entry.terminatingLREntry != null || !succeeded);
      entry.isHeadOfLeftRecursion = true;
    }
    memoRec.traceEntry = entry;
  }
  inputStream.examinedLength = Math.max(inputStream.examinedLength, origInputStreamExaminedLength);
  state.exitApplication(origPosInfo, value);
  return succeeded;
};
Apply.prototype.evalOnce = function(expr, state) {
  const { inputStream } = state;
  const origPos = inputStream.pos;
  if (state.eval(expr)) {
    const arity = expr.getArity();
    const bindings = state._bindings.splice(state._bindings.length - arity, arity);
    const offsets = state._bindingOffsets.splice(state._bindingOffsets.length - arity, arity);
    const matchLength = inputStream.pos - origPos;
    return new NonterminalNode(this.ruleName, bindings, offsets, matchLength);
  } else {
    return false;
  }
};
Apply.prototype.growSeedResult = function(body, state, origPos, lrMemoRec, newValue) {
  if (!newValue) {
    return false;
  }
  const { inputStream } = state;
  while (true) {
    lrMemoRec.matchLength = inputStream.pos - origPos;
    lrMemoRec.value = newValue;
    lrMemoRec.failuresAtRightmostPosition = state.cloneRecordedFailures();
    if (state.isTracing()) {
      const seedTrace = state.trace[state.trace.length - 1];
      lrMemoRec.traceEntry = new Trace(state.input, origPos, inputStream.pos, this, true, [newValue], [seedTrace.clone()]);
    }
    inputStream.pos = origPos;
    newValue = this.evalOnce(body, state);
    if (inputStream.pos - origPos <= lrMemoRec.matchLength) {
      break;
    }
    if (state.isTracing()) {
      state.trace.splice(-2, 1);
    }
  }
  if (state.isTracing()) {
    lrMemoRec.traceEntry.recordLRTermination(state.trace.pop(), newValue);
  }
  inputStream.pos = origPos + lrMemoRec.matchLength;
  return lrMemoRec.value;
};
UnicodeChar.prototype.eval = function(state) {
  const { inputStream } = state;
  const origPos = inputStream.pos;
  const ch = inputStream.next();
  if (ch && this.pattern.test(ch)) {
    state.pushBinding(new TerminalNode(ch.length), origPos);
    return true;
  } else {
    state.processFailure(origPos, this);
    return false;
  }
};

// node_modules/ohm-js/src/pexprs-getArity.js
PExpr.prototype.getArity = abstract("getArity");
any.getArity = end.getArity = Terminal.prototype.getArity = Range.prototype.getArity = Param.prototype.getArity = Apply.prototype.getArity = UnicodeChar.prototype.getArity = function() {
  return 1;
};
Alt.prototype.getArity = function() {
  return this.terms.length === 0 ? 0 : this.terms[0].getArity();
};
Seq.prototype.getArity = function() {
  let arity = 0;
  for (let idx = 0;idx < this.factors.length; idx++) {
    arity += this.factors[idx].getArity();
  }
  return arity;
};
Iter.prototype.getArity = function() {
  return this.expr.getArity();
};
Not.prototype.getArity = function() {
  return 0;
};
Lookahead.prototype.getArity = Lex.prototype.getArity = function() {
  return this.expr.getArity();
};

// node_modules/ohm-js/src/pexprs-outputRecipe.js
function getMetaInfo(expr, grammarInterval) {
  const metaInfo = {};
  if (expr.source && grammarInterval) {
    const adjusted = expr.source.relativeTo(grammarInterval);
    metaInfo.sourceInterval = [adjusted.startIdx, adjusted.endIdx];
  }
  return metaInfo;
}
PExpr.prototype.outputRecipe = abstract("outputRecipe");
any.outputRecipe = function(formals, grammarInterval) {
  return ["any", getMetaInfo(this, grammarInterval)];
};
end.outputRecipe = function(formals, grammarInterval) {
  return ["end", getMetaInfo(this, grammarInterval)];
};
Terminal.prototype.outputRecipe = function(formals, grammarInterval) {
  return ["terminal", getMetaInfo(this, grammarInterval), this.obj];
};
Range.prototype.outputRecipe = function(formals, grammarInterval) {
  return ["range", getMetaInfo(this, grammarInterval), this.from, this.to];
};
Param.prototype.outputRecipe = function(formals, grammarInterval) {
  return ["param", getMetaInfo(this, grammarInterval), this.index];
};
Alt.prototype.outputRecipe = function(formals, grammarInterval) {
  return ["alt", getMetaInfo(this, grammarInterval)].concat(this.terms.map((term) => term.outputRecipe(formals, grammarInterval)));
};
Extend.prototype.outputRecipe = function(formals, grammarInterval) {
  const extension = this.terms[0];
  return extension.outputRecipe(formals, grammarInterval);
};
Splice.prototype.outputRecipe = function(formals, grammarInterval) {
  const beforeTerms = this.terms.slice(0, this.expansionPos);
  const afterTerms = this.terms.slice(this.expansionPos + 1);
  return [
    "splice",
    getMetaInfo(this, grammarInterval),
    beforeTerms.map((term) => term.outputRecipe(formals, grammarInterval)),
    afterTerms.map((term) => term.outputRecipe(formals, grammarInterval))
  ];
};
Seq.prototype.outputRecipe = function(formals, grammarInterval) {
  return ["seq", getMetaInfo(this, grammarInterval)].concat(this.factors.map((factor) => factor.outputRecipe(formals, grammarInterval)));
};
Star.prototype.outputRecipe = Plus.prototype.outputRecipe = Opt.prototype.outputRecipe = Not.prototype.outputRecipe = Lookahead.prototype.outputRecipe = Lex.prototype.outputRecipe = function(formals, grammarInterval) {
  return [
    this.constructor.name.toLowerCase(),
    getMetaInfo(this, grammarInterval),
    this.expr.outputRecipe(formals, grammarInterval)
  ];
};
Apply.prototype.outputRecipe = function(formals, grammarInterval) {
  return [
    "app",
    getMetaInfo(this, grammarInterval),
    this.ruleName,
    this.args.map((arg) => arg.outputRecipe(formals, grammarInterval))
  ];
};
UnicodeChar.prototype.outputRecipe = function(formals, grammarInterval) {
  return ["unicodeChar", getMetaInfo(this, grammarInterval), this.category];
};

// node_modules/ohm-js/src/pexprs-introduceParams.js
PExpr.prototype.introduceParams = abstract("introduceParams");
any.introduceParams = end.introduceParams = Terminal.prototype.introduceParams = Range.prototype.introduceParams = Param.prototype.introduceParams = UnicodeChar.prototype.introduceParams = function(formals) {
  return this;
};
Alt.prototype.introduceParams = function(formals) {
  this.terms.forEach((term, idx, terms) => {
    terms[idx] = term.introduceParams(formals);
  });
  return this;
};
Seq.prototype.introduceParams = function(formals) {
  this.factors.forEach((factor, idx, factors) => {
    factors[idx] = factor.introduceParams(formals);
  });
  return this;
};
Iter.prototype.introduceParams = Not.prototype.introduceParams = Lookahead.prototype.introduceParams = Lex.prototype.introduceParams = function(formals) {
  this.expr = this.expr.introduceParams(formals);
  return this;
};
Apply.prototype.introduceParams = function(formals) {
  const index = formals.indexOf(this.ruleName);
  if (index >= 0) {
    if (this.args.length > 0) {
      throw new Error("Parameterized rules cannot be passed as arguments to another rule.");
    }
    return new Param(index).withSource(this.source);
  } else {
    this.args.forEach((arg, idx, args) => {
      args[idx] = arg.introduceParams(formals);
    });
    return this;
  }
};

// node_modules/ohm-js/src/pexprs-isNullable.js
PExpr.prototype.isNullable = function(grammar) {
  return this._isNullable(grammar, Object.create(null));
};
PExpr.prototype._isNullable = abstract("_isNullable");
any._isNullable = Range.prototype._isNullable = Param.prototype._isNullable = Plus.prototype._isNullable = UnicodeChar.prototype._isNullable = function(grammar, memo) {
  return false;
};
end._isNullable = function(grammar, memo) {
  return true;
};
Terminal.prototype._isNullable = function(grammar, memo) {
  if (typeof this.obj === "string") {
    return this.obj === "";
  } else {
    return false;
  }
};
Alt.prototype._isNullable = function(grammar, memo) {
  return this.terms.length === 0 || this.terms.some((term) => term._isNullable(grammar, memo));
};
Seq.prototype._isNullable = function(grammar, memo) {
  return this.factors.every((factor) => factor._isNullable(grammar, memo));
};
Star.prototype._isNullable = Opt.prototype._isNullable = Not.prototype._isNullable = Lookahead.prototype._isNullable = function(grammar, memo) {
  return true;
};
Lex.prototype._isNullable = function(grammar, memo) {
  return this.expr._isNullable(grammar, memo);
};
Apply.prototype._isNullable = function(grammar, memo) {
  const key = this.toMemoKey();
  if (!Object.prototype.hasOwnProperty.call(memo, key)) {
    const { body } = grammar.rules[this.ruleName];
    const inlined = body.substituteParams(this.args);
    memo[key] = false;
    memo[key] = inlined._isNullable(grammar, memo);
  }
  return memo[key];
};

// node_modules/ohm-js/src/pexprs-substituteParams.js
PExpr.prototype.substituteParams = abstract("substituteParams");
any.substituteParams = end.substituteParams = Terminal.prototype.substituteParams = Range.prototype.substituteParams = UnicodeChar.prototype.substituteParams = function(actuals) {
  return this;
};
Param.prototype.substituteParams = function(actuals) {
  return checkNotNull(actuals[this.index]);
};
Alt.prototype.substituteParams = function(actuals) {
  return new Alt(this.terms.map((term) => term.substituteParams(actuals)));
};
Seq.prototype.substituteParams = function(actuals) {
  return new Seq(this.factors.map((factor) => factor.substituteParams(actuals)));
};
Iter.prototype.substituteParams = Not.prototype.substituteParams = Lookahead.prototype.substituteParams = Lex.prototype.substituteParams = function(actuals) {
  return new this.constructor(this.expr.substituteParams(actuals));
};
Apply.prototype.substituteParams = function(actuals) {
  if (this.args.length === 0) {
    return this;
  } else {
    const args = this.args.map((arg) => arg.substituteParams(actuals));
    return new Apply(this.ruleName, args);
  }
};

// node_modules/ohm-js/src/pexprs-toArgumentNameList.js
function isRestrictedJSIdentifier(str) {
  return /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(str);
}
function resolveDuplicatedNames(argumentNameList) {
  const count = Object.create(null);
  argumentNameList.forEach((argName) => {
    count[argName] = (count[argName] || 0) + 1;
  });
  Object.keys(count).forEach((dupArgName) => {
    if (count[dupArgName] <= 1) {
      return;
    }
    let subscript = 1;
    argumentNameList.forEach((argName, idx) => {
      if (argName === dupArgName) {
        argumentNameList[idx] = argName + "_" + subscript++;
      }
    });
  });
}
PExpr.prototype.toArgumentNameList = abstract("toArgumentNameList");
any.toArgumentNameList = function(firstArgIndex, noDupCheck) {
  return ["any"];
};
end.toArgumentNameList = function(firstArgIndex, noDupCheck) {
  return ["end"];
};
Terminal.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
  if (typeof this.obj === "string" && /^[_a-zA-Z0-9]+$/.test(this.obj)) {
    return ["_" + this.obj];
  } else {
    return ["$" + firstArgIndex];
  }
};
Range.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
  let argName = this.from + "_to_" + this.to;
  if (!isRestrictedJSIdentifier(argName)) {
    argName = "_" + argName;
  }
  if (!isRestrictedJSIdentifier(argName)) {
    argName = "$" + firstArgIndex;
  }
  return [argName];
};
Alt.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
  const termArgNameLists = this.terms.map((term) => term.toArgumentNameList(firstArgIndex, true));
  const argumentNameList = [];
  const numArgs = termArgNameLists[0].length;
  for (let colIdx = 0;colIdx < numArgs; colIdx++) {
    const col = [];
    for (let rowIdx = 0;rowIdx < this.terms.length; rowIdx++) {
      col.push(termArgNameLists[rowIdx][colIdx]);
    }
    const uniqueNames = copyWithoutDuplicates(col);
    argumentNameList.push(uniqueNames.join("_or_"));
  }
  if (!noDupCheck) {
    resolveDuplicatedNames(argumentNameList);
  }
  return argumentNameList;
};
Seq.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
  let argumentNameList = [];
  this.factors.forEach((factor) => {
    const factorArgumentNameList = factor.toArgumentNameList(firstArgIndex, true);
    argumentNameList = argumentNameList.concat(factorArgumentNameList);
    firstArgIndex += factorArgumentNameList.length;
  });
  if (!noDupCheck) {
    resolveDuplicatedNames(argumentNameList);
  }
  return argumentNameList;
};
Iter.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
  const argumentNameList = this.expr.toArgumentNameList(firstArgIndex, noDupCheck).map((exprArgumentString) => exprArgumentString[exprArgumentString.length - 1] === "s" ? exprArgumentString + "es" : exprArgumentString + "s");
  if (!noDupCheck) {
    resolveDuplicatedNames(argumentNameList);
  }
  return argumentNameList;
};
Opt.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
  return this.expr.toArgumentNameList(firstArgIndex, noDupCheck).map((argName) => {
    return "opt" + argName[0].toUpperCase() + argName.slice(1);
  });
};
Not.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
  return [];
};
Lookahead.prototype.toArgumentNameList = Lex.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
  return this.expr.toArgumentNameList(firstArgIndex, noDupCheck);
};
Apply.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
  return [this.ruleName];
};
UnicodeChar.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
  return ["$" + firstArgIndex];
};
Param.prototype.toArgumentNameList = function(firstArgIndex, noDupCheck) {
  return ["param" + this.index];
};

// node_modules/ohm-js/src/pexprs-toDisplayString.js
PExpr.prototype.toDisplayString = abstract("toDisplayString");
Alt.prototype.toDisplayString = Seq.prototype.toDisplayString = function() {
  if (this.source) {
    return this.source.trimmed().contents;
  }
  return "[" + this.constructor.name + "]";
};
any.toDisplayString = end.toDisplayString = Iter.prototype.toDisplayString = Not.prototype.toDisplayString = Lookahead.prototype.toDisplayString = Lex.prototype.toDisplayString = Terminal.prototype.toDisplayString = Range.prototype.toDisplayString = Param.prototype.toDisplayString = function() {
  return this.toString();
};
Apply.prototype.toDisplayString = function() {
  if (this.args.length > 0) {
    const ps = this.args.map((arg) => arg.toDisplayString());
    return this.ruleName + "<" + ps.join(",") + ">";
  } else {
    return this.ruleName;
  }
};
UnicodeChar.prototype.toDisplayString = function() {
  return "Unicode [" + this.category + "] character";
};

// node_modules/ohm-js/src/Failure.js
function isValidType(type) {
  return type === "description" || type === "string" || type === "code";
}

class Failure {
  constructor(pexpr, text, type) {
    if (!isValidType(type)) {
      throw new Error("invalid Failure type: " + type);
    }
    this.pexpr = pexpr;
    this.text = text;
    this.type = type;
    this.fluffy = false;
  }
  getPExpr() {
    return this.pexpr;
  }
  getText() {
    return this.text;
  }
  getType() {
    return this.type;
  }
  isDescription() {
    return this.type === "description";
  }
  isStringTerminal() {
    return this.type === "string";
  }
  isCode() {
    return this.type === "code";
  }
  isFluffy() {
    return this.fluffy;
  }
  makeFluffy() {
    this.fluffy = true;
  }
  clearFluffy() {
    this.fluffy = false;
  }
  subsumes(that) {
    return this.getText() === that.getText() && this.type === that.type && (!this.isFluffy() || this.isFluffy() && that.isFluffy());
  }
  toString() {
    return this.type === "string" ? JSON.stringify(this.getText()) : this.getText();
  }
  clone() {
    const failure = new Failure(this.pexpr, this.text, this.type);
    if (this.isFluffy()) {
      failure.makeFluffy();
    }
    return failure;
  }
  toKey() {
    return this.toString() + "#" + this.type;
  }
}

// node_modules/ohm-js/src/pexprs-toFailure.js
PExpr.prototype.toFailure = abstract("toFailure");
any.toFailure = function(grammar) {
  return new Failure(this, "any object", "description");
};
end.toFailure = function(grammar) {
  return new Failure(this, "end of input", "description");
};
Terminal.prototype.toFailure = function(grammar) {
  return new Failure(this, this.obj, "string");
};
Range.prototype.toFailure = function(grammar) {
  return new Failure(this, JSON.stringify(this.from) + ".." + JSON.stringify(this.to), "code");
};
Not.prototype.toFailure = function(grammar) {
  const description = this.expr === any ? "nothing" : "not " + this.expr.toFailure(grammar);
  return new Failure(this, description, "description");
};
Lookahead.prototype.toFailure = function(grammar) {
  return this.expr.toFailure(grammar);
};
Apply.prototype.toFailure = function(grammar) {
  let { description } = grammar.rules[this.ruleName];
  if (!description) {
    const article = /^[aeiouAEIOU]/.test(this.ruleName) ? "an" : "a";
    description = article + " " + this.ruleName;
  }
  return new Failure(this, description, "description");
};
UnicodeChar.prototype.toFailure = function(grammar) {
  return new Failure(this, "a Unicode [" + this.category + "] character", "description");
};
Alt.prototype.toFailure = function(grammar) {
  const fs = this.terms.map((t) => t.toFailure(grammar));
  const description = "(" + fs.join(" or ") + ")";
  return new Failure(this, description, "description");
};
Seq.prototype.toFailure = function(grammar) {
  const fs = this.factors.map((f) => f.toFailure(grammar));
  const description = "(" + fs.join(" ") + ")";
  return new Failure(this, description, "description");
};
Iter.prototype.toFailure = function(grammar) {
  const description = "(" + this.expr.toFailure(grammar) + this.operator + ")";
  return new Failure(this, description, "description");
};

// node_modules/ohm-js/src/pexprs-toString.js
PExpr.prototype.toString = abstract("toString");
any.toString = function() {
  return "any";
};
end.toString = function() {
  return "end";
};
Terminal.prototype.toString = function() {
  return JSON.stringify(this.obj);
};
Range.prototype.toString = function() {
  return JSON.stringify(this.from) + ".." + JSON.stringify(this.to);
};
Param.prototype.toString = function() {
  return "$" + this.index;
};
Lex.prototype.toString = function() {
  return "#(" + this.expr.toString() + ")";
};
Alt.prototype.toString = function() {
  return this.terms.length === 1 ? this.terms[0].toString() : "(" + this.terms.map((term) => term.toString()).join(" | ") + ")";
};
Seq.prototype.toString = function() {
  return this.factors.length === 1 ? this.factors[0].toString() : "(" + this.factors.map((factor) => factor.toString()).join(" ") + ")";
};
Iter.prototype.toString = function() {
  return this.expr + this.operator;
};
Not.prototype.toString = function() {
  return "~" + this.expr;
};
Lookahead.prototype.toString = function() {
  return "&" + this.expr;
};
Apply.prototype.toString = function() {
  if (this.args.length > 0) {
    const ps = this.args.map((arg) => arg.toString());
    return this.ruleName + "<" + ps.join(",") + ">";
  } else {
    return this.ruleName;
  }
};
UnicodeChar.prototype.toString = function() {
  return "\\p{" + this.category + "}";
};
// node_modules/ohm-js/src/CaseInsensitiveTerminal.js
class CaseInsensitiveTerminal extends PExpr {
  constructor(param) {
    super();
    this.obj = param;
  }
  _getString(state) {
    const terminal = state.currentApplication().args[this.obj.index];
    assert(terminal instanceof Terminal, "expected a Terminal expression");
    return terminal.obj;
  }
  allowsSkippingPrecedingSpace() {
    return true;
  }
  eval(state) {
    const { inputStream } = state;
    const origPos = inputStream.pos;
    const matchStr = this._getString(state);
    if (!inputStream.matchString(matchStr, true)) {
      state.processFailure(origPos, this);
      return false;
    } else {
      state.pushBinding(new TerminalNode(matchStr.length), origPos);
      return true;
    }
  }
  getArity() {
    return 1;
  }
  substituteParams(actuals) {
    return new CaseInsensitiveTerminal(this.obj.substituteParams(actuals));
  }
  toDisplayString() {
    return this.obj.toDisplayString() + " (case-insensitive)";
  }
  toFailure(grammar) {
    return new Failure(this, this.obj.toFailure(grammar) + " (case-insensitive)", "description");
  }
  _isNullable(grammar, memo) {
    return this.obj._isNullable(grammar, memo);
  }
}
// node_modules/ohm-js/src/MatchState.js
var builtInApplySyntacticBody;
awaitBuiltInRules((builtInRules) => {
  builtInApplySyntacticBody = builtInRules.rules.applySyntactic.body;
});
var applySpaces = new Apply("spaces");

class MatchState {
  constructor(matcher, startExpr, optPositionToRecordFailures) {
    this.matcher = matcher;
    this.startExpr = startExpr;
    this.grammar = matcher.grammar;
    this.input = matcher.getInput();
    this.inputStream = new InputStream(this.input);
    this.memoTable = matcher._memoTable;
    this.userData = undefined;
    this.doNotMemoize = false;
    this._bindings = [];
    this._bindingOffsets = [];
    this._applicationStack = [];
    this._posStack = [0];
    this.inLexifiedContextStack = [false];
    this.rightmostFailurePosition = -1;
    this._rightmostFailurePositionStack = [];
    this._recordedFailuresStack = [];
    if (optPositionToRecordFailures !== undefined) {
      this.positionToRecordFailures = optPositionToRecordFailures;
      this.recordedFailures = Object.create(null);
    }
  }
  posToOffset(pos) {
    return pos - this._posStack[this._posStack.length - 1];
  }
  enterApplication(posInfo, app) {
    this._posStack.push(this.inputStream.pos);
    this._applicationStack.push(app);
    this.inLexifiedContextStack.push(false);
    posInfo.enter(app);
    this._rightmostFailurePositionStack.push(this.rightmostFailurePosition);
    this.rightmostFailurePosition = -1;
  }
  exitApplication(posInfo, optNode) {
    const origPos = this._posStack.pop();
    this._applicationStack.pop();
    this.inLexifiedContextStack.pop();
    posInfo.exit();
    this.rightmostFailurePosition = Math.max(this.rightmostFailurePosition, this._rightmostFailurePositionStack.pop());
    if (optNode) {
      this.pushBinding(optNode, origPos);
    }
  }
  enterLexifiedContext() {
    this.inLexifiedContextStack.push(true);
  }
  exitLexifiedContext() {
    this.inLexifiedContextStack.pop();
  }
  currentApplication() {
    return this._applicationStack[this._applicationStack.length - 1];
  }
  inSyntacticContext() {
    const currentApplication = this.currentApplication();
    if (currentApplication) {
      return currentApplication.isSyntactic() && !this.inLexifiedContext();
    } else {
      return this.startExpr.factors[0].isSyntactic();
    }
  }
  inLexifiedContext() {
    return this.inLexifiedContextStack[this.inLexifiedContextStack.length - 1];
  }
  skipSpaces() {
    this.pushFailuresInfo();
    this.eval(applySpaces);
    this.popBinding();
    this.popFailuresInfo();
    return this.inputStream.pos;
  }
  skipSpacesIfInSyntacticContext() {
    return this.inSyntacticContext() ? this.skipSpaces() : this.inputStream.pos;
  }
  maybeSkipSpacesBefore(expr) {
    if (expr.allowsSkippingPrecedingSpace() && expr !== applySpaces) {
      return this.skipSpacesIfInSyntacticContext();
    } else {
      return this.inputStream.pos;
    }
  }
  pushBinding(node, origPos) {
    this._bindings.push(node);
    this._bindingOffsets.push(this.posToOffset(origPos));
  }
  popBinding() {
    this._bindings.pop();
    this._bindingOffsets.pop();
  }
  numBindings() {
    return this._bindings.length;
  }
  truncateBindings(newLength) {
    while (this._bindings.length > newLength) {
      this.popBinding();
    }
  }
  getCurrentPosInfo() {
    return this.getPosInfo(this.inputStream.pos);
  }
  getPosInfo(pos) {
    let posInfo = this.memoTable[pos];
    if (!posInfo) {
      posInfo = this.memoTable[pos] = new PosInfo;
    }
    return posInfo;
  }
  processFailure(pos, expr) {
    this.rightmostFailurePosition = Math.max(this.rightmostFailurePosition, pos);
    if (this.recordedFailures && pos === this.positionToRecordFailures) {
      const app = this.currentApplication();
      if (app) {
        expr = expr.substituteParams(app.args);
      } else {}
      this.recordFailure(expr.toFailure(this.grammar), false);
    }
  }
  recordFailure(failure, shouldCloneIfNew) {
    const key = failure.toKey();
    if (!this.recordedFailures[key]) {
      this.recordedFailures[key] = shouldCloneIfNew ? failure.clone() : failure;
    } else if (this.recordedFailures[key].isFluffy() && !failure.isFluffy()) {
      this.recordedFailures[key].clearFluffy();
    }
  }
  recordFailures(failures, shouldCloneIfNew) {
    Object.keys(failures).forEach((key) => {
      this.recordFailure(failures[key], shouldCloneIfNew);
    });
  }
  cloneRecordedFailures() {
    if (!this.recordedFailures) {
      return;
    }
    const ans = Object.create(null);
    Object.keys(this.recordedFailures).forEach((key) => {
      ans[key] = this.recordedFailures[key].clone();
    });
    return ans;
  }
  getRightmostFailurePosition() {
    return this.rightmostFailurePosition;
  }
  _getRightmostFailureOffset() {
    return this.rightmostFailurePosition >= 0 ? this.posToOffset(this.rightmostFailurePosition) : -1;
  }
  getMemoizedTraceEntry(pos, expr) {
    const posInfo = this.memoTable[pos];
    if (posInfo && expr instanceof Apply) {
      const memoRec = posInfo.memo[expr.toMemoKey()];
      if (memoRec && memoRec.traceEntry) {
        const entry = memoRec.traceEntry.cloneWithExpr(expr);
        entry.isMemoized = true;
        return entry;
      }
    }
    return null;
  }
  getTraceEntry(pos, expr, succeeded, bindings) {
    if (expr instanceof Apply) {
      const app = this.currentApplication();
      const actuals = app ? app.args : [];
      expr = expr.substituteParams(actuals);
    }
    return this.getMemoizedTraceEntry(pos, expr) || new Trace(this.input, pos, this.inputStream.pos, expr, succeeded, bindings, this.trace);
  }
  isTracing() {
    return !!this.trace;
  }
  hasNecessaryInfo(memoRec) {
    if (this.trace && !memoRec.traceEntry) {
      return false;
    }
    if (this.recordedFailures && this.inputStream.pos + memoRec.rightmostFailureOffset === this.positionToRecordFailures) {
      return !!memoRec.failuresAtRightmostPosition;
    }
    return true;
  }
  useMemoizedResult(origPos, memoRec) {
    if (this.trace) {
      this.trace.push(memoRec.traceEntry);
    }
    const memoRecRightmostFailurePosition = this.inputStream.pos + memoRec.rightmostFailureOffset;
    this.rightmostFailurePosition = Math.max(this.rightmostFailurePosition, memoRecRightmostFailurePosition);
    if (this.recordedFailures && this.positionToRecordFailures === memoRecRightmostFailurePosition && memoRec.failuresAtRightmostPosition) {
      this.recordFailures(memoRec.failuresAtRightmostPosition, true);
    }
    this.inputStream.examinedLength = Math.max(this.inputStream.examinedLength, memoRec.examinedLength + origPos);
    if (memoRec.value) {
      this.inputStream.pos += memoRec.matchLength;
      this.pushBinding(memoRec.value, origPos);
      return true;
    }
    return false;
  }
  eval(expr) {
    const { inputStream } = this;
    const origNumBindings = this._bindings.length;
    const origUserData = this.userData;
    let origRecordedFailures;
    if (this.recordedFailures) {
      origRecordedFailures = this.recordedFailures;
      this.recordedFailures = Object.create(null);
    }
    const origPos = inputStream.pos;
    const memoPos = this.maybeSkipSpacesBefore(expr);
    let origTrace;
    if (this.trace) {
      origTrace = this.trace;
      this.trace = [];
    }
    const ans = expr.eval(this);
    if (this.trace) {
      const bindings = this._bindings.slice(origNumBindings);
      const traceEntry = this.getTraceEntry(memoPos, expr, ans, bindings);
      traceEntry.isImplicitSpaces = expr === applySpaces;
      traceEntry.isRootNode = expr === this.startExpr;
      origTrace.push(traceEntry);
      this.trace = origTrace;
    }
    if (ans) {
      if (this.recordedFailures && inputStream.pos === this.positionToRecordFailures) {
        Object.keys(this.recordedFailures).forEach((key) => {
          this.recordedFailures[key].makeFluffy();
        });
      }
    } else {
      inputStream.pos = origPos;
      this.truncateBindings(origNumBindings);
      this.userData = origUserData;
    }
    if (this.recordedFailures) {
      this.recordFailures(origRecordedFailures, false);
    }
    if (expr === builtInApplySyntacticBody) {
      this.skipSpaces();
    }
    return ans;
  }
  getMatchResult() {
    this.grammar._setUpMatchState(this);
    this.eval(this.startExpr);
    let rightmostFailures;
    if (this.recordedFailures) {
      rightmostFailures = Object.keys(this.recordedFailures).map((key) => this.recordedFailures[key]);
    }
    const cst = this._bindings[0];
    if (cst) {
      cst.grammar = this.grammar;
    }
    return new MatchResult(this.matcher, this.input, this.startExpr, cst, this._bindingOffsets[0], this.rightmostFailurePosition, rightmostFailures);
  }
  getTrace() {
    this.trace = [];
    const matchResult = this.getMatchResult();
    const rootTrace = this.trace[this.trace.length - 1];
    rootTrace.result = matchResult;
    return rootTrace;
  }
  pushFailuresInfo() {
    this._rightmostFailurePositionStack.push(this.rightmostFailurePosition);
    this._recordedFailuresStack.push(this.recordedFailures);
  }
  popFailuresInfo() {
    this.rightmostFailurePosition = this._rightmostFailurePositionStack.pop();
    this.recordedFailures = this._recordedFailuresStack.pop();
  }
}

// node_modules/ohm-js/src/Matcher.js
class Matcher {
  constructor(grammar) {
    this.grammar = grammar;
    this._memoTable = [];
    this._input = "";
    this._isMemoTableStale = false;
  }
  _resetMemoTable() {
    this._memoTable = [];
    this._isMemoTableStale = false;
  }
  getInput() {
    return this._input;
  }
  setInput(str) {
    if (this._input !== str) {
      this.replaceInputRange(0, this._input.length, str);
    }
    return this;
  }
  replaceInputRange(startIdx, endIdx, str) {
    const prevInput = this._input;
    const memoTable = this._memoTable;
    if (startIdx < 0 || startIdx > prevInput.length || endIdx < 0 || endIdx > prevInput.length || startIdx > endIdx) {
      throw new Error("Invalid indices: " + startIdx + " and " + endIdx);
    }
    this._input = prevInput.slice(0, startIdx) + str + prevInput.slice(endIdx);
    if (this._input !== prevInput && memoTable.length > 0) {
      this._isMemoTableStale = true;
    }
    const restOfMemoTable = memoTable.slice(endIdx);
    memoTable.length = startIdx;
    for (let idx = 0;idx < str.length; idx++) {
      memoTable.push(undefined);
    }
    for (const posInfo of restOfMemoTable) {
      memoTable.push(posInfo);
    }
    for (let pos = 0;pos < startIdx; pos++) {
      const posInfo = memoTable[pos];
      if (posInfo) {
        posInfo.clearObsoleteEntries(pos, startIdx);
      }
    }
    return this;
  }
  match(optStartApplicationStr, options = { incremental: true }) {
    return this._match(this._getStartExpr(optStartApplicationStr), {
      incremental: options.incremental,
      tracing: false
    });
  }
  trace(optStartApplicationStr, options = { incremental: true }) {
    return this._match(this._getStartExpr(optStartApplicationStr), {
      incremental: options.incremental,
      tracing: true
    });
  }
  _match(startExpr, options = {}) {
    const opts = {
      tracing: false,
      incremental: true,
      positionToRecordFailures: undefined,
      ...options
    };
    if (!opts.incremental) {
      this._resetMemoTable();
    } else if (this._isMemoTableStale && !this.grammar.supportsIncrementalParsing) {
      throw grammarDoesNotSupportIncrementalParsing(this.grammar);
    }
    const state = new MatchState(this, startExpr, opts.positionToRecordFailures);
    return opts.tracing ? state.getTrace() : state.getMatchResult();
  }
  _getStartExpr(optStartApplicationStr) {
    const applicationStr = optStartApplicationStr || this.grammar.defaultStartRule;
    if (!applicationStr) {
      throw new Error("Missing start rule argument -- the grammar has no default start rule.");
    }
    const startApp = this.grammar.parseApplication(applicationStr);
    return new Seq([startApp, end]);
  }
}

// node_modules/ohm-js/src/Semantics.js
var globalActionStack = [];
var hasOwnProperty = (x, prop) => Object.prototype.hasOwnProperty.call(x, prop);

class Wrapper {
  constructor(node, sourceInterval, baseInterval) {
    this._node = node;
    this.source = sourceInterval;
    this._baseInterval = baseInterval;
    if (node.isNonterminal()) {
      assert(sourceInterval === baseInterval);
    }
    this._childWrappers = [];
  }
  _forgetMemoizedResultFor(attributeName) {
    delete this._node[this._semantics.attributeKeys[attributeName]];
    this.children.forEach((child) => {
      child._forgetMemoizedResultFor(attributeName);
    });
  }
  child(idx) {
    if (!(0 <= idx && idx < this._node.numChildren())) {
      return;
    }
    let childWrapper = this._childWrappers[idx];
    if (!childWrapper) {
      const childNode = this._node.childAt(idx);
      const offset = this._node.childOffsets[idx];
      const source = this._baseInterval.subInterval(offset, childNode.matchLength);
      const base = childNode.isNonterminal() ? source : this._baseInterval;
      childWrapper = this._childWrappers[idx] = this._semantics.wrap(childNode, source, base);
    }
    return childWrapper;
  }
  _children() {
    for (let idx = 0;idx < this._node.numChildren(); idx++) {
      this.child(idx);
    }
    return this._childWrappers;
  }
  isIteration() {
    return this._node.isIteration();
  }
  isTerminal() {
    return this._node.isTerminal();
  }
  isNonterminal() {
    return this._node.isNonterminal();
  }
  isSyntactic() {
    return this.isNonterminal() && this._node.isSyntactic();
  }
  isLexical() {
    return this.isNonterminal() && this._node.isLexical();
  }
  isOptional() {
    return this._node.isOptional();
  }
  iteration(optChildWrappers) {
    const childWrappers = optChildWrappers || [];
    const childNodes = childWrappers.map((c) => c._node);
    const iter = new IterationNode(childNodes, [], -1, false);
    const wrapper = this._semantics.wrap(iter, null, null);
    wrapper._childWrappers = childWrappers;
    return wrapper;
  }
  get children() {
    return this._children();
  }
  get ctorName() {
    return this._node.ctorName;
  }
  get numChildren() {
    return this._node.numChildren();
  }
  get sourceString() {
    return this.source.contents;
  }
}

class Semantics {
  constructor(grammar, superSemantics) {
    const self = this;
    this.grammar = grammar;
    this.checkedActionDicts = false;
    this.Wrapper = class extends (superSemantics ? superSemantics.Wrapper : Wrapper) {
      constructor(node, sourceInterval, baseInterval) {
        super(node, sourceInterval, baseInterval);
        self.checkActionDictsIfHaventAlready();
        this._semantics = self;
      }
      toString() {
        return "[semantics wrapper for " + self.grammar.name + "]";
      }
    };
    this.super = superSemantics;
    if (superSemantics) {
      if (!(grammar.equals(this.super.grammar) || grammar._inheritsFrom(this.super.grammar))) {
        throw new Error("Cannot extend a semantics for grammar '" + this.super.grammar.name + "' for use with grammar '" + grammar.name + "' (not a sub-grammar)");
      }
      this.operations = Object.create(this.super.operations);
      this.attributes = Object.create(this.super.attributes);
      this.attributeKeys = Object.create(null);
      for (const attributeName in this.attributes) {
        Object.defineProperty(this.attributeKeys, attributeName, {
          value: uniqueId(attributeName)
        });
      }
    } else {
      this.operations = Object.create(null);
      this.attributes = Object.create(null);
      this.attributeKeys = Object.create(null);
    }
  }
  toString() {
    return "[semantics for " + this.grammar.name + "]";
  }
  checkActionDictsIfHaventAlready() {
    if (!this.checkedActionDicts) {
      this.checkActionDicts();
      this.checkedActionDicts = true;
    }
  }
  checkActionDicts() {
    let name;
    for (name in this.operations) {
      this.operations[name].checkActionDict(this.grammar);
    }
    for (name in this.attributes) {
      this.attributes[name].checkActionDict(this.grammar);
    }
  }
  toRecipe(semanticsOnly) {
    function hasSuperSemantics(s) {
      return s.super !== Semantics.BuiltInSemantics._getSemantics();
    }
    let str = `(function(g) {
`;
    if (hasSuperSemantics(this)) {
      str += "  var semantics = " + this.super.toRecipe(true) + "(g";
      const superSemanticsGrammar = this.super.grammar;
      let relatedGrammar = this.grammar;
      while (relatedGrammar !== superSemanticsGrammar) {
        str += ".superGrammar";
        relatedGrammar = relatedGrammar.superGrammar;
      }
      str += `);
`;
      str += "  return g.extendSemantics(semantics)";
    } else {
      str += "  return g.createSemantics()";
    }
    ["Operation", "Attribute"].forEach((type) => {
      const semanticOperations = this[type.toLowerCase() + "s"];
      Object.keys(semanticOperations).forEach((name) => {
        const { actionDict, formals, builtInDefault } = semanticOperations[name];
        let signature = name;
        if (formals.length > 0) {
          signature += "(" + formals.join(", ") + ")";
        }
        let method;
        if (hasSuperSemantics(this) && this.super[type.toLowerCase() + "s"][name]) {
          method = "extend" + type;
        } else {
          method = "add" + type;
        }
        str += `
    .` + method + "(" + JSON.stringify(signature) + ", {";
        const srcArray = [];
        Object.keys(actionDict).forEach((actionName) => {
          if (actionDict[actionName] !== builtInDefault) {
            let source = actionDict[actionName].toString().trim();
            source = source.replace(/^.*\(/, "function(");
            srcArray.push(`
      ` + JSON.stringify(actionName) + ": " + source);
          }
        });
        str += srcArray.join(",") + `
    })`;
      });
    });
    str += `;
  })`;
    if (!semanticsOnly) {
      str = `(function() {
` + "  var grammar = this.fromRecipe(" + this.grammar.toRecipe() + `);
` + "  var semantics = " + str + `(grammar);
` + `  return semantics;
` + `});
`;
    }
    return str;
  }
  addOperationOrAttribute(type, signature, actionDict) {
    const typePlural = type + "s";
    const parsedNameAndFormalArgs = parseSignature(signature, type);
    const { name } = parsedNameAndFormalArgs;
    const { formals } = parsedNameAndFormalArgs;
    this.assertNewName(name, type);
    const builtInDefault = newDefaultAction(type, name, doIt);
    const realActionDict = { _default: builtInDefault };
    Object.keys(actionDict).forEach((name2) => {
      realActionDict[name2] = actionDict[name2];
    });
    const entry = type === "operation" ? new Operation(name, formals, realActionDict, builtInDefault) : new Attribute(name, realActionDict, builtInDefault);
    entry.checkActionDict(this.grammar);
    this[typePlural][name] = entry;
    function doIt(...args) {
      const thisThing = this._semantics[typePlural][name];
      if (arguments.length !== thisThing.formals.length) {
        throw new Error("Invalid number of arguments passed to " + name + " " + type + " (expected " + thisThing.formals.length + ", got " + arguments.length + ")");
      }
      const argsObj = Object.create(null);
      for (const [idx, val] of Object.entries(args)) {
        const formal = thisThing.formals[idx];
        argsObj[formal] = val;
      }
      const oldArgs = this.args;
      this.args = argsObj;
      const ans = thisThing.execute(this._semantics, this);
      this.args = oldArgs;
      return ans;
    }
    if (type === "operation") {
      this.Wrapper.prototype[name] = doIt;
      this.Wrapper.prototype[name].toString = function() {
        return "[" + name + " operation]";
      };
    } else {
      Object.defineProperty(this.Wrapper.prototype, name, {
        get: doIt,
        configurable: true
      });
      Object.defineProperty(this.attributeKeys, name, {
        value: uniqueId(name)
      });
    }
  }
  extendOperationOrAttribute(type, name, actionDict) {
    const typePlural = type + "s";
    parseSignature(name, "attribute");
    if (!(this.super && (name in this.super[typePlural]))) {
      throw new Error("Cannot extend " + type + " '" + name + "': did not inherit an " + type + " with that name");
    }
    if (hasOwnProperty(this[typePlural], name)) {
      throw new Error("Cannot extend " + type + " '" + name + "' again");
    }
    const inheritedFormals = this[typePlural][name].formals;
    const inheritedActionDict = this[typePlural][name].actionDict;
    const newActionDict = Object.create(inheritedActionDict);
    Object.keys(actionDict).forEach((name2) => {
      newActionDict[name2] = actionDict[name2];
    });
    this[typePlural][name] = type === "operation" ? new Operation(name, inheritedFormals, newActionDict) : new Attribute(name, newActionDict);
    this[typePlural][name].checkActionDict(this.grammar);
  }
  assertNewName(name, type) {
    if (hasOwnProperty(Wrapper.prototype, name)) {
      throw new Error("Cannot add " + type + " '" + name + "': that's a reserved name");
    }
    if (name in this.operations) {
      throw new Error("Cannot add " + type + " '" + name + "': an operation with that name already exists");
    }
    if (name in this.attributes) {
      throw new Error("Cannot add " + type + " '" + name + "': an attribute with that name already exists");
    }
  }
  wrap(node, source, optBaseInterval) {
    const baseInterval = optBaseInterval || source;
    return node instanceof this.Wrapper ? node : new this.Wrapper(node, source, baseInterval);
  }
}
function parseSignature(signature, type) {
  if (!Semantics.prototypeGrammar) {
    assert(signature.indexOf("(") === -1);
    return {
      name: signature,
      formals: []
    };
  }
  const r = Semantics.prototypeGrammar.match(signature, type === "operation" ? "OperationSignature" : "AttributeSignature");
  if (r.failed()) {
    throw new Error(r.message);
  }
  return Semantics.prototypeGrammarSemantics(r).parse();
}
function newDefaultAction(type, name, doIt) {
  return function(...children) {
    const thisThing = this._semantics.operations[name] || this._semantics.attributes[name];
    const args = thisThing.formals.map((formal) => this.args[formal]);
    if (!this.isIteration() && children.length === 1) {
      return doIt.apply(children[0], args);
    } else {
      throw missingSemanticAction(this.ctorName, name, type, globalActionStack);
    }
  };
}
Semantics.createSemantics = function(grammar, optSuperSemantics) {
  const s = new Semantics(grammar, optSuperSemantics !== undefined ? optSuperSemantics : Semantics.BuiltInSemantics._getSemantics());
  const proxy = function ASemantics(matchResult) {
    if (!(matchResult instanceof MatchResult)) {
      throw new TypeError("Semantics expected a MatchResult, but got " + unexpectedObjToString(matchResult));
    }
    if (matchResult.failed()) {
      throw new TypeError("cannot apply Semantics to " + matchResult.toString());
    }
    const cst = matchResult._cst;
    if (cst.grammar !== grammar) {
      throw new Error("Cannot use a MatchResult from grammar '" + cst.grammar.name + "' with a semantics for '" + grammar.name + "'");
    }
    const inputStream = new InputStream(matchResult.input);
    return s.wrap(cst, inputStream.interval(matchResult._cstOffset, matchResult.input.length));
  };
  proxy.addOperation = function(signature, actionDict) {
    s.addOperationOrAttribute("operation", signature, actionDict);
    return proxy;
  };
  proxy.extendOperation = function(name, actionDict) {
    s.extendOperationOrAttribute("operation", name, actionDict);
    return proxy;
  };
  proxy.addAttribute = function(name, actionDict) {
    s.addOperationOrAttribute("attribute", name, actionDict);
    return proxy;
  };
  proxy.extendAttribute = function(name, actionDict) {
    s.extendOperationOrAttribute("attribute", name, actionDict);
    return proxy;
  };
  proxy._getActionDict = function(operationOrAttributeName) {
    const action = s.operations[operationOrAttributeName] || s.attributes[operationOrAttributeName];
    if (!action) {
      throw new Error('"' + operationOrAttributeName + '" is not a valid operation or attribute ' + 'name in this semantics for "' + grammar.name + '"');
    }
    return action.actionDict;
  };
  proxy._remove = function(operationOrAttributeName) {
    let semantic;
    if (operationOrAttributeName in s.operations) {
      semantic = s.operations[operationOrAttributeName];
      delete s.operations[operationOrAttributeName];
    } else if (operationOrAttributeName in s.attributes) {
      semantic = s.attributes[operationOrAttributeName];
      delete s.attributes[operationOrAttributeName];
    }
    delete s.Wrapper.prototype[operationOrAttributeName];
    return semantic;
  };
  proxy.getOperationNames = function() {
    return Object.keys(s.operations);
  };
  proxy.getAttributeNames = function() {
    return Object.keys(s.attributes);
  };
  proxy.getGrammar = function() {
    return s.grammar;
  };
  proxy.toRecipe = function(semanticsOnly) {
    return s.toRecipe(semanticsOnly);
  };
  proxy.toString = s.toString.bind(s);
  proxy._getSemantics = function() {
    return s;
  };
  return proxy;
};

class Operation {
  constructor(name, formals, actionDict, builtInDefault) {
    this.name = name;
    this.formals = formals;
    this.actionDict = actionDict;
    this.builtInDefault = builtInDefault;
  }
  checkActionDict(grammar) {
    grammar._checkTopDownActionDict(this.typeName, this.name, this.actionDict);
  }
  execute(semantics, nodeWrapper) {
    try {
      const { ctorName } = nodeWrapper._node;
      let actionFn = this.actionDict[ctorName];
      if (actionFn) {
        globalActionStack.push([this, ctorName]);
        return actionFn.apply(nodeWrapper, nodeWrapper._children());
      }
      if (nodeWrapper.isNonterminal()) {
        actionFn = this.actionDict._nonterminal;
        if (actionFn) {
          globalActionStack.push([this, "_nonterminal", ctorName]);
          return actionFn.apply(nodeWrapper, nodeWrapper._children());
        }
      }
      globalActionStack.push([this, "default action", ctorName]);
      return this.actionDict._default.apply(nodeWrapper, nodeWrapper._children());
    } finally {
      globalActionStack.pop();
    }
  }
}
Operation.prototype.typeName = "operation";

class Attribute extends Operation {
  constructor(name, actionDict, builtInDefault) {
    super(name, [], actionDict, builtInDefault);
  }
  execute(semantics, nodeWrapper) {
    const node = nodeWrapper._node;
    const key = semantics.attributeKeys[this.name];
    if (!hasOwnProperty(node, key)) {
      node[key] = Operation.prototype.execute.call(this, semantics, nodeWrapper);
    }
    return node[key];
  }
}
Attribute.prototype.typeName = "attribute";

// node_modules/ohm-js/src/Grammar.js
var SPECIAL_ACTION_NAMES = ["_iter", "_terminal", "_nonterminal", "_default"];
function getSortedRuleValues(grammar) {
  return Object.keys(grammar.rules).sort().map((name) => grammar.rules[name]);
}
var jsonToJS = (str) => str.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
var ohmGrammar;
var buildGrammar;

class Grammar {
  constructor(name, superGrammar, rules, optDefaultStartRule) {
    this.name = name;
    this.superGrammar = superGrammar;
    this.rules = rules;
    if (optDefaultStartRule) {
      if (!(optDefaultStartRule in rules)) {
        throw new Error("Invalid start rule: '" + optDefaultStartRule + "' is not a rule in grammar '" + name + "'");
      }
      this.defaultStartRule = optDefaultStartRule;
    }
    this._matchStateInitializer = undefined;
    this.supportsIncrementalParsing = true;
  }
  matcher() {
    return new Matcher(this);
  }
  isBuiltIn() {
    return this === Grammar.ProtoBuiltInRules || this === Grammar.BuiltInRules;
  }
  equals(g) {
    if (this === g) {
      return true;
    }
    if (g == null || this.name !== g.name || this.defaultStartRule !== g.defaultStartRule || !(this.superGrammar === g.superGrammar || this.superGrammar.equals(g.superGrammar))) {
      return false;
    }
    const myRules = getSortedRuleValues(this);
    const otherRules = getSortedRuleValues(g);
    return myRules.length === otherRules.length && myRules.every((rule, i) => {
      return rule.description === otherRules[i].description && rule.formals.join(",") === otherRules[i].formals.join(",") && rule.body.toString() === otherRules[i].body.toString();
    });
  }
  match(input, optStartApplication) {
    const m = this.matcher();
    m.replaceInputRange(0, 0, input);
    return m.match(optStartApplication);
  }
  trace(input, optStartApplication) {
    const m = this.matcher();
    m.replaceInputRange(0, 0, input);
    return m.trace(optStartApplication);
  }
  createSemantics() {
    return Semantics.createSemantics(this);
  }
  extendSemantics(superSemantics) {
    return Semantics.createSemantics(this, superSemantics._getSemantics());
  }
  _checkTopDownActionDict(what, name, actionDict) {
    const problems = [];
    for (const k in actionDict) {
      const v = actionDict[k];
      const isSpecialAction = SPECIAL_ACTION_NAMES.includes(k);
      if (!isSpecialAction && !(k in this.rules)) {
        problems.push(`'${k}' is not a valid semantic action for '${this.name}'`);
        continue;
      }
      if (typeof v !== "function") {
        problems.push(`'${k}' must be a function in an action dictionary for '${this.name}'`);
        continue;
      }
      const actual = v.length;
      const expected = this._topDownActionArity(k);
      if (actual !== expected) {
        let details;
        if (k === "_iter" || k === "_nonterminal") {
          details = `it should use a rest parameter, e.g. \`${k}(...children) {}\`. ` + "NOTE: this is new in Ohm v16 — see https://ohmjs.org/d/ati for details.";
        } else {
          details = `expected ${expected}, got ${actual}`;
        }
        problems.push(`Semantic action '${k}' has the wrong arity: ${details}`);
      }
    }
    if (problems.length > 0) {
      const prettyProblems = problems.map((problem) => "- " + problem);
      const error = new Error([
        `Found errors in the action dictionary of the '${name}' ${what}:`,
        ...prettyProblems
      ].join(`
`));
      error.problems = problems;
      throw error;
    }
  }
  _topDownActionArity(actionName) {
    return SPECIAL_ACTION_NAMES.includes(actionName) ? 0 : this.rules[actionName].body.getArity();
  }
  _inheritsFrom(grammar) {
    let g = this.superGrammar;
    while (g) {
      if (g.equals(grammar, true)) {
        return true;
      }
      g = g.superGrammar;
    }
    return false;
  }
  toRecipe(superGrammarExpr = undefined) {
    const metaInfo = {};
    if (this.source) {
      metaInfo.source = this.source.contents;
    }
    let startRule = null;
    if (this.defaultStartRule) {
      startRule = this.defaultStartRule;
    }
    const rules = {};
    Object.keys(this.rules).forEach((ruleName) => {
      const ruleInfo = this.rules[ruleName];
      const { body } = ruleInfo;
      const isDefinition = !this.superGrammar || !this.superGrammar.rules[ruleName];
      let operation;
      if (isDefinition) {
        operation = "define";
      } else {
        operation = body instanceof Extend ? "extend" : "override";
      }
      const metaInfo2 = {};
      if (ruleInfo.source && this.source) {
        const adjusted = ruleInfo.source.relativeTo(this.source);
        metaInfo2.sourceInterval = [adjusted.startIdx, adjusted.endIdx];
      }
      const description = isDefinition ? ruleInfo.description : null;
      const bodyRecipe = body.outputRecipe(ruleInfo.formals, this.source);
      rules[ruleName] = [
        operation,
        metaInfo2,
        description,
        ruleInfo.formals,
        bodyRecipe
      ];
    });
    let superGrammarOutput = "null";
    if (superGrammarExpr) {
      superGrammarOutput = superGrammarExpr;
    } else if (this.superGrammar && !this.superGrammar.isBuiltIn()) {
      superGrammarOutput = this.superGrammar.toRecipe();
    }
    const recipeElements = [
      ...["grammar", metaInfo, this.name].map(JSON.stringify),
      superGrammarOutput,
      ...[startRule, rules].map(JSON.stringify)
    ];
    return jsonToJS(`[${recipeElements.join(",")}]`);
  }
  toOperationActionDictionaryTemplate() {
    return this._toOperationOrAttributeActionDictionaryTemplate();
  }
  toAttributeActionDictionaryTemplate() {
    return this._toOperationOrAttributeActionDictionaryTemplate();
  }
  _toOperationOrAttributeActionDictionaryTemplate() {
    const sb = new StringBuffer;
    sb.append("{");
    let first = true;
    for (const ruleName in this.rules) {
      const { body } = this.rules[ruleName];
      if (first) {
        first = false;
      } else {
        sb.append(",");
      }
      sb.append(`
`);
      sb.append("  ");
      this.addSemanticActionTemplate(ruleName, body, sb);
    }
    sb.append(`
}`);
    return sb.contents();
  }
  addSemanticActionTemplate(ruleName, body, sb) {
    sb.append(ruleName);
    sb.append(": function(");
    const arity = this._topDownActionArity(ruleName);
    sb.append(repeat("_", arity).join(", "));
    sb.append(`) {
`);
    sb.append("  }");
  }
  parseApplication(str) {
    let app;
    if (str.indexOf("<") === -1) {
      app = new Apply(str);
    } else {
      const cst = ohmGrammar.match(str, "Base_application");
      app = buildGrammar(cst, {});
    }
    if (!(app.ruleName in this.rules)) {
      throw undeclaredRule(app.ruleName, this.name);
    }
    const { formals } = this.rules[app.ruleName];
    if (formals.length !== app.args.length) {
      const { source } = this.rules[app.ruleName];
      throw wrongNumberOfParameters(app.ruleName, formals.length, app.args.length, source);
    }
    return app;
  }
  _setUpMatchState(state) {
    if (this._matchStateInitializer) {
      this._matchStateInitializer(state);
    }
  }
}
Grammar.ProtoBuiltInRules = new Grammar("ProtoBuiltInRules", undefined, {
  any: {
    body: any,
    formals: [],
    description: "any character",
    primitive: true
  },
  end: {
    body: end,
    formals: [],
    description: "end of input",
    primitive: true
  },
  caseInsensitive: {
    body: new CaseInsensitiveTerminal(new Param(0)),
    formals: ["str"],
    primitive: true
  },
  lower: {
    body: new UnicodeChar("Ll"),
    formals: [],
    description: "a lowercase letter",
    primitive: true
  },
  upper: {
    body: new UnicodeChar("Lu"),
    formals: [],
    description: "an uppercase letter",
    primitive: true
  },
  unicodeLtmo: {
    body: new UnicodeChar("Ltmo"),
    formals: [],
    description: "a Unicode character in Lt, Lm, or Lo",
    primitive: true
  },
  spaces: {
    body: new Star(new Apply("space")),
    formals: []
  },
  space: {
    body: new Range("\x00", " "),
    formals: [],
    description: "a space"
  }
});
Grammar.initApplicationParser = function(grammar, builderFn) {
  ohmGrammar = grammar;
  buildGrammar = builderFn;
};

// node_modules/ohm-js/src/GrammarDecl.js
class GrammarDecl {
  constructor(name) {
    this.name = name;
  }
  sourceInterval(startIdx, endIdx) {
    return this.source.subInterval(startIdx, endIdx - startIdx);
  }
  ensureSuperGrammar() {
    if (!this.superGrammar) {
      this.withSuperGrammar(this.name === "BuiltInRules" ? Grammar.ProtoBuiltInRules : Grammar.BuiltInRules);
    }
    return this.superGrammar;
  }
  ensureSuperGrammarRuleForOverriding(name, source) {
    const ruleInfo = this.ensureSuperGrammar().rules[name];
    if (!ruleInfo) {
      throw cannotOverrideUndeclaredRule(name, this.superGrammar.name, source);
    }
    return ruleInfo;
  }
  installOverriddenOrExtendedRule(name, formals, body, source) {
    const duplicateParameterNames2 = getDuplicates(formals);
    if (duplicateParameterNames2.length > 0) {
      throw duplicateParameterNames(name, duplicateParameterNames2, source);
    }
    const ruleInfo = this.ensureSuperGrammar().rules[name];
    const expectedFormals = ruleInfo.formals;
    const expectedNumFormals = expectedFormals ? expectedFormals.length : 0;
    if (formals.length !== expectedNumFormals) {
      throw wrongNumberOfParameters(name, expectedNumFormals, formals.length, source);
    }
    return this.install(name, formals, body, ruleInfo.description, source);
  }
  install(name, formals, body, description, source, primitive = false) {
    this.rules[name] = {
      body: body.introduceParams(formals),
      formals,
      description,
      source,
      primitive
    };
    return this;
  }
  withSuperGrammar(superGrammar) {
    if (this.superGrammar) {
      throw new Error("the super grammar of a GrammarDecl cannot be set more than once");
    }
    this.superGrammar = superGrammar;
    this.rules = Object.create(superGrammar.rules);
    if (!superGrammar.isBuiltIn()) {
      this.defaultStartRule = superGrammar.defaultStartRule;
    }
    return this;
  }
  withDefaultStartRule(ruleName) {
    this.defaultStartRule = ruleName;
    return this;
  }
  withSource(source) {
    this.source = new InputStream(source).interval(0, source.length);
    return this;
  }
  build() {
    const grammar = new Grammar(this.name, this.ensureSuperGrammar(), this.rules, this.defaultStartRule);
    grammar._matchStateInitializer = grammar.superGrammar._matchStateInitializer;
    grammar.supportsIncrementalParsing = grammar.superGrammar.supportsIncrementalParsing;
    const grammarErrors = [];
    let grammarHasInvalidApplications = false;
    Object.keys(grammar.rules).forEach((ruleName) => {
      const { body } = grammar.rules[ruleName];
      try {
        body.assertChoicesHaveUniformArity(ruleName);
      } catch (e) {
        grammarErrors.push(e);
      }
      try {
        body.assertAllApplicationsAreValid(ruleName, grammar);
      } catch (e) {
        grammarErrors.push(e);
        grammarHasInvalidApplications = true;
      }
    });
    if (!grammarHasInvalidApplications) {
      Object.keys(grammar.rules).forEach((ruleName) => {
        const { body } = grammar.rules[ruleName];
        try {
          body.assertIteratedExprsAreNotNullable(grammar, []);
        } catch (e) {
          grammarErrors.push(e);
        }
      });
    }
    if (grammarErrors.length > 0) {
      throwErrors(grammarErrors);
    }
    if (this.source) {
      grammar.source = this.source;
    }
    return grammar;
  }
  define(name, formals, body, description, source, primitive) {
    this.ensureSuperGrammar();
    if (this.superGrammar.rules[name]) {
      throw duplicateRuleDeclaration(name, this.name, this.superGrammar.name, source);
    } else if (this.rules[name]) {
      throw duplicateRuleDeclaration(name, this.name, this.name, source);
    }
    const duplicateParameterNames2 = getDuplicates(formals);
    if (duplicateParameterNames2.length > 0) {
      throw duplicateParameterNames(name, duplicateParameterNames2, source);
    }
    return this.install(name, formals, body, description, source, primitive);
  }
  override(name, formals, body, descIgnored, source) {
    this.ensureSuperGrammarRuleForOverriding(name, source);
    this.installOverriddenOrExtendedRule(name, formals, body, source);
    return this;
  }
  extend(name, formals, fragment, descIgnored, source) {
    const ruleInfo = this.ensureSuperGrammar().rules[name];
    if (!ruleInfo) {
      throw cannotExtendUndeclaredRule(name, this.superGrammar.name, source);
    }
    const body = new Extend(this.superGrammar, name, fragment);
    body.source = fragment.source;
    this.installOverriddenOrExtendedRule(name, formals, body, source);
    return this;
  }
}

// node_modules/ohm-js/src/Builder.js
class Builder {
  constructor() {
    this.currentDecl = null;
    this.currentRuleName = null;
  }
  newGrammar(name) {
    return new GrammarDecl(name);
  }
  grammar(metaInfo, name, superGrammar, defaultStartRule, rules) {
    const gDecl = new GrammarDecl(name);
    if (superGrammar) {
      gDecl.withSuperGrammar(superGrammar instanceof Grammar ? superGrammar : this.fromRecipe(superGrammar));
    }
    if (defaultStartRule) {
      gDecl.withDefaultStartRule(defaultStartRule);
    }
    if (metaInfo && metaInfo.source) {
      gDecl.withSource(metaInfo.source);
    }
    this.currentDecl = gDecl;
    Object.keys(rules).forEach((ruleName) => {
      this.currentRuleName = ruleName;
      const ruleRecipe = rules[ruleName];
      const action = ruleRecipe[0];
      const metaInfo2 = ruleRecipe[1];
      const description = ruleRecipe[2];
      const formals = ruleRecipe[3];
      const body = this.fromRecipe(ruleRecipe[4]);
      let source;
      if (gDecl.source && metaInfo2 && metaInfo2.sourceInterval) {
        source = gDecl.source.subInterval(metaInfo2.sourceInterval[0], metaInfo2.sourceInterval[1] - metaInfo2.sourceInterval[0]);
      }
      gDecl[action](ruleName, formals, body, description, source);
    });
    this.currentRuleName = this.currentDecl = null;
    return gDecl.build();
  }
  terminal(x) {
    return new Terminal(x);
  }
  range(from, to) {
    return new Range(from, to);
  }
  param(index) {
    return new Param(index);
  }
  alt(...termArgs) {
    let terms = [];
    for (let arg of termArgs) {
      if (!(arg instanceof PExpr)) {
        arg = this.fromRecipe(arg);
      }
      if (arg instanceof Alt) {
        terms = terms.concat(arg.terms);
      } else {
        terms.push(arg);
      }
    }
    return terms.length === 1 ? terms[0] : new Alt(terms);
  }
  seq(...factorArgs) {
    let factors = [];
    for (let arg of factorArgs) {
      if (!(arg instanceof PExpr)) {
        arg = this.fromRecipe(arg);
      }
      if (arg instanceof Seq) {
        factors = factors.concat(arg.factors);
      } else {
        factors.push(arg);
      }
    }
    return factors.length === 1 ? factors[0] : new Seq(factors);
  }
  star(expr) {
    if (!(expr instanceof PExpr)) {
      expr = this.fromRecipe(expr);
    }
    return new Star(expr);
  }
  plus(expr) {
    if (!(expr instanceof PExpr)) {
      expr = this.fromRecipe(expr);
    }
    return new Plus(expr);
  }
  opt(expr) {
    if (!(expr instanceof PExpr)) {
      expr = this.fromRecipe(expr);
    }
    return new Opt(expr);
  }
  not(expr) {
    if (!(expr instanceof PExpr)) {
      expr = this.fromRecipe(expr);
    }
    return new Not(expr);
  }
  lookahead(expr) {
    if (!(expr instanceof PExpr)) {
      expr = this.fromRecipe(expr);
    }
    return new Lookahead(expr);
  }
  lex(expr) {
    if (!(expr instanceof PExpr)) {
      expr = this.fromRecipe(expr);
    }
    return new Lex(expr);
  }
  app(ruleName, optParams) {
    if (optParams && optParams.length > 0) {
      optParams = optParams.map(function(param) {
        return param instanceof PExpr ? param : this.fromRecipe(param);
      }, this);
    }
    return new Apply(ruleName, optParams);
  }
  splice(beforeTerms, afterTerms) {
    return new Splice(this.currentDecl.superGrammar, this.currentRuleName, beforeTerms.map((term) => this.fromRecipe(term)), afterTerms.map((term) => this.fromRecipe(term)));
  }
  fromRecipe(recipe) {
    const args = recipe[0] === "grammar" ? recipe.slice(1) : recipe.slice(2);
    const result = this[recipe[0]](...args);
    const metaInfo = recipe[1];
    if (metaInfo) {
      if (metaInfo.sourceInterval && this.currentDecl) {
        result.withSource(this.currentDecl.sourceInterval(...metaInfo.sourceInterval));
      }
    }
    return result;
  }
}

// node_modules/ohm-js/src/makeRecipe.js
function makeRecipe(recipe) {
  if (typeof recipe === "function") {
    return recipe.call(new Builder);
  } else {
    if (typeof recipe === "string") {
      recipe = JSON.parse(recipe);
    }
    return new Builder().fromRecipe(recipe);
  }
}

// node_modules/ohm-js/dist/built-in-rules.js
var built_in_rules_default = makeRecipe(["grammar", { source: `BuiltInRules {

  alnum  (an alpha-numeric character)
    = letter
    | digit

  letter  (a letter)
    = lower
    | upper
    | unicodeLtmo

  digit  (a digit)
    = "0".."9"

  hexDigit  (a hexadecimal digit)
    = digit
    | "a".."f"
    | "A".."F"

  ListOf<elem, sep>
    = NonemptyListOf<elem, sep>
    | EmptyListOf<elem, sep>

  NonemptyListOf<elem, sep>
    = elem (sep elem)*

  EmptyListOf<elem, sep>
    = /* nothing */

  listOf<elem, sep>
    = nonemptyListOf<elem, sep>
    | emptyListOf<elem, sep>

  nonemptyListOf<elem, sep>
    = elem (sep elem)*

  emptyListOf<elem, sep>
    = /* nothing */

  // Allows a syntactic rule application within a lexical context.
  applySyntactic<app> = app
}` }, "BuiltInRules", null, null, { alnum: ["define", { sourceInterval: [18, 78] }, "an alpha-numeric character", [], ["alt", { sourceInterval: [60, 78] }, ["app", { sourceInterval: [60, 66] }, "letter", []], ["app", { sourceInterval: [73, 78] }, "digit", []]]], letter: ["define", { sourceInterval: [82, 142] }, "a letter", [], ["alt", { sourceInterval: [107, 142] }, ["app", { sourceInterval: [107, 112] }, "lower", []], ["app", { sourceInterval: [119, 124] }, "upper", []], ["app", { sourceInterval: [131, 142] }, "unicodeLtmo", []]]], digit: ["define", { sourceInterval: [146, 177] }, "a digit", [], ["range", { sourceInterval: [169, 177] }, "0", "9"]], hexDigit: ["define", { sourceInterval: [181, 254] }, "a hexadecimal digit", [], ["alt", { sourceInterval: [219, 254] }, ["app", { sourceInterval: [219, 224] }, "digit", []], ["range", { sourceInterval: [231, 239] }, "a", "f"], ["range", { sourceInterval: [246, 254] }, "A", "F"]]], ListOf: ["define", { sourceInterval: [258, 336] }, null, ["elem", "sep"], ["alt", { sourceInterval: [282, 336] }, ["app", { sourceInterval: [282, 307] }, "NonemptyListOf", [["param", { sourceInterval: [297, 301] }, 0], ["param", { sourceInterval: [303, 306] }, 1]]], ["app", { sourceInterval: [314, 336] }, "EmptyListOf", [["param", { sourceInterval: [326, 330] }, 0], ["param", { sourceInterval: [332, 335] }, 1]]]]], NonemptyListOf: ["define", { sourceInterval: [340, 388] }, null, ["elem", "sep"], ["seq", { sourceInterval: [372, 388] }, ["param", { sourceInterval: [372, 376] }, 0], ["star", { sourceInterval: [377, 388] }, ["seq", { sourceInterval: [378, 386] }, ["param", { sourceInterval: [378, 381] }, 1], ["param", { sourceInterval: [382, 386] }, 0]]]]], EmptyListOf: ["define", { sourceInterval: [392, 434] }, null, ["elem", "sep"], ["seq", { sourceInterval: [438, 438] }]], listOf: ["define", { sourceInterval: [438, 516] }, null, ["elem", "sep"], ["alt", { sourceInterval: [462, 516] }, ["app", { sourceInterval: [462, 487] }, "nonemptyListOf", [["param", { sourceInterval: [477, 481] }, 0], ["param", { sourceInterval: [483, 486] }, 1]]], ["app", { sourceInterval: [494, 516] }, "emptyListOf", [["param", { sourceInterval: [506, 510] }, 0], ["param", { sourceInterval: [512, 515] }, 1]]]]], nonemptyListOf: ["define", { sourceInterval: [520, 568] }, null, ["elem", "sep"], ["seq", { sourceInterval: [552, 568] }, ["param", { sourceInterval: [552, 556] }, 0], ["star", { sourceInterval: [557, 568] }, ["seq", { sourceInterval: [558, 566] }, ["param", { sourceInterval: [558, 561] }, 1], ["param", { sourceInterval: [562, 566] }, 0]]]]], emptyListOf: ["define", { sourceInterval: [572, 682] }, null, ["elem", "sep"], ["seq", { sourceInterval: [685, 685] }]], applySyntactic: ["define", { sourceInterval: [685, 710] }, null, ["app"], ["param", { sourceInterval: [707, 710] }, 0]] }]);

// node_modules/ohm-js/src/main-kernel.js
Grammar.BuiltInRules = built_in_rules_default;
announceBuiltInRules(Grammar.BuiltInRules);

// node_modules/ohm-js/dist/ohm-grammar.js
var ohm_grammar_default = makeRecipe(["grammar", { source: `Ohm {

  Grammars
    = Grammar*

  Grammar
    = ident SuperGrammar? "{" Rule* "}"

  SuperGrammar
    = "<:" ident

  Rule
    = ident Formals? ruleDescr? "="  RuleBody  -- define
    | ident Formals?            ":=" OverrideRuleBody  -- override
    | ident Formals?            "+=" RuleBody  -- extend

  RuleBody
    = "|"? NonemptyListOf<TopLevelTerm, "|">

  TopLevelTerm
    = Seq caseName  -- inline
    | Seq

  OverrideRuleBody
    = "|"? NonemptyListOf<OverrideTopLevelTerm, "|">

  OverrideTopLevelTerm
    = "..."  -- superSplice
    | TopLevelTerm

  Formals
    = "<" ListOf<ident, ","> ">"

  Params
    = "<" ListOf<Seq, ","> ">"

  Alt
    = NonemptyListOf<Seq, "|">

  Seq
    = Iter*

  Iter
    = Pred "*"  -- star
    | Pred "+"  -- plus
    | Pred "?"  -- opt
    | Pred

  Pred
    = "~" Lex  -- not
    | "&" Lex  -- lookahead
    | Lex

  Lex
    = "#" Base  -- lex
    | Base

  Base
    = ident Params? ~(ruleDescr? "=" | ":=" | "+=")  -- application
    | oneCharTerminal ".." oneCharTerminal           -- range
    | terminal                                       -- terminal
    | "(" Alt ")"                                    -- paren

  ruleDescr  (a rule description)
    = "(" ruleDescrText ")"

  ruleDescrText
    = (~")" any)*

  caseName
    = "--" (~"\\n" space)* name (~"\\n" space)* ("\\n" | &"}")

  name  (a name)
    = nameFirst nameRest*

  nameFirst
    = "_"
    | letter

  nameRest
    = "_"
    | alnum

  ident  (an identifier)
    = name

  terminal
    = "\\"" terminalChar* "\\""

  oneCharTerminal
    = "\\"" terminalChar "\\""

  terminalChar
    = escapeChar
      | ~"\\\\" ~"\\"" ~"\\n" "\\u{0}".."\\u{10FFFF}"

  escapeChar  (an escape sequence)
    = "\\\\\\\\"                                     -- backslash
    | "\\\\\\""                                     -- doubleQuote
    | "\\\\\\'"                                     -- singleQuote
    | "\\\\b"                                      -- backspace
    | "\\\\n"                                      -- lineFeed
    | "\\\\r"                                      -- carriageReturn
    | "\\\\t"                                      -- tab
    | "\\\\u{" hexDigit hexDigit? hexDigit?
             hexDigit? hexDigit? hexDigit? "}"   -- unicodeCodePoint
    | "\\\\u" hexDigit hexDigit hexDigit hexDigit  -- unicodeEscape
    | "\\\\x" hexDigit hexDigit                    -- hexEscape

  space
   += comment

  comment
    = "//" (~"\\n" any)* &("\\n" | end)  -- singleLine
    | "/*" (~"*/" any)* "*/"  -- multiLine

  tokens = token*

  token = caseName | comment | ident | operator | punctuation | terminal | any

  operator = "<:" | "=" | ":=" | "+=" | "*" | "+" | "?" | "~" | "&"

  punctuation = "<" | ">" | "," | "--"
}` }, "Ohm", null, "Grammars", { Grammars: ["define", { sourceInterval: [9, 32] }, null, [], ["star", { sourceInterval: [24, 32] }, ["app", { sourceInterval: [24, 31] }, "Grammar", []]]], Grammar: ["define", { sourceInterval: [36, 83] }, null, [], ["seq", { sourceInterval: [50, 83] }, ["app", { sourceInterval: [50, 55] }, "ident", []], ["opt", { sourceInterval: [56, 69] }, ["app", { sourceInterval: [56, 68] }, "SuperGrammar", []]], ["terminal", { sourceInterval: [70, 73] }, "{"], ["star", { sourceInterval: [74, 79] }, ["app", { sourceInterval: [74, 78] }, "Rule", []]], ["terminal", { sourceInterval: [80, 83] }, "}"]]], SuperGrammar: ["define", { sourceInterval: [87, 116] }, null, [], ["seq", { sourceInterval: [106, 116] }, ["terminal", { sourceInterval: [106, 110] }, "<:"], ["app", { sourceInterval: [111, 116] }, "ident", []]]], Rule_define: ["define", { sourceInterval: [131, 181] }, null, [], ["seq", { sourceInterval: [131, 170] }, ["app", { sourceInterval: [131, 136] }, "ident", []], ["opt", { sourceInterval: [137, 145] }, ["app", { sourceInterval: [137, 144] }, "Formals", []]], ["opt", { sourceInterval: [146, 156] }, ["app", { sourceInterval: [146, 155] }, "ruleDescr", []]], ["terminal", { sourceInterval: [157, 160] }, "="], ["app", { sourceInterval: [162, 170] }, "RuleBody", []]]], Rule_override: ["define", { sourceInterval: [188, 248] }, null, [], ["seq", { sourceInterval: [188, 235] }, ["app", { sourceInterval: [188, 193] }, "ident", []], ["opt", { sourceInterval: [194, 202] }, ["app", { sourceInterval: [194, 201] }, "Formals", []]], ["terminal", { sourceInterval: [214, 218] }, ":="], ["app", { sourceInterval: [219, 235] }, "OverrideRuleBody", []]]], Rule_extend: ["define", { sourceInterval: [255, 305] }, null, [], ["seq", { sourceInterval: [255, 294] }, ["app", { sourceInterval: [255, 260] }, "ident", []], ["opt", { sourceInterval: [261, 269] }, ["app", { sourceInterval: [261, 268] }, "Formals", []]], ["terminal", { sourceInterval: [281, 285] }, "+="], ["app", { sourceInterval: [286, 294] }, "RuleBody", []]]], Rule: ["define", { sourceInterval: [120, 305] }, null, [], ["alt", { sourceInterval: [131, 305] }, ["app", { sourceInterval: [131, 170] }, "Rule_define", []], ["app", { sourceInterval: [188, 235] }, "Rule_override", []], ["app", { sourceInterval: [255, 294] }, "Rule_extend", []]]], RuleBody: ["define", { sourceInterval: [309, 362] }, null, [], ["seq", { sourceInterval: [324, 362] }, ["opt", { sourceInterval: [324, 328] }, ["terminal", { sourceInterval: [324, 327] }, "|"]], ["app", { sourceInterval: [329, 362] }, "NonemptyListOf", [["app", { sourceInterval: [344, 356] }, "TopLevelTerm", []], ["terminal", { sourceInterval: [358, 361] }, "|"]]]]], TopLevelTerm_inline: ["define", { sourceInterval: [385, 408] }, null, [], ["seq", { sourceInterval: [385, 397] }, ["app", { sourceInterval: [385, 388] }, "Seq", []], ["app", { sourceInterval: [389, 397] }, "caseName", []]]], TopLevelTerm: ["define", { sourceInterval: [366, 418] }, null, [], ["alt", { sourceInterval: [385, 418] }, ["app", { sourceInterval: [385, 397] }, "TopLevelTerm_inline", []], ["app", { sourceInterval: [415, 418] }, "Seq", []]]], OverrideRuleBody: ["define", { sourceInterval: [422, 491] }, null, [], ["seq", { sourceInterval: [445, 491] }, ["opt", { sourceInterval: [445, 449] }, ["terminal", { sourceInterval: [445, 448] }, "|"]], ["app", { sourceInterval: [450, 491] }, "NonemptyListOf", [["app", { sourceInterval: [465, 485] }, "OverrideTopLevelTerm", []], ["terminal", { sourceInterval: [487, 490] }, "|"]]]]], OverrideTopLevelTerm_superSplice: ["define", { sourceInterval: [522, 543] }, null, [], ["terminal", { sourceInterval: [522, 527] }, "..."]], OverrideTopLevelTerm: ["define", { sourceInterval: [495, 562] }, null, [], ["alt", { sourceInterval: [522, 562] }, ["app", { sourceInterval: [522, 527] }, "OverrideTopLevelTerm_superSplice", []], ["app", { sourceInterval: [550, 562] }, "TopLevelTerm", []]]], Formals: ["define", { sourceInterval: [566, 606] }, null, [], ["seq", { sourceInterval: [580, 606] }, ["terminal", { sourceInterval: [580, 583] }, "<"], ["app", { sourceInterval: [584, 602] }, "ListOf", [["app", { sourceInterval: [591, 596] }, "ident", []], ["terminal", { sourceInterval: [598, 601] }, ","]]], ["terminal", { sourceInterval: [603, 606] }, ">"]]], Params: ["define", { sourceInterval: [610, 647] }, null, [], ["seq", { sourceInterval: [623, 647] }, ["terminal", { sourceInterval: [623, 626] }, "<"], ["app", { sourceInterval: [627, 643] }, "ListOf", [["app", { sourceInterval: [634, 637] }, "Seq", []], ["terminal", { sourceInterval: [639, 642] }, ","]]], ["terminal", { sourceInterval: [644, 647] }, ">"]]], Alt: ["define", { sourceInterval: [651, 685] }, null, [], ["app", { sourceInterval: [661, 685] }, "NonemptyListOf", [["app", { sourceInterval: [676, 679] }, "Seq", []], ["terminal", { sourceInterval: [681, 684] }, "|"]]]], Seq: ["define", { sourceInterval: [689, 704] }, null, [], ["star", { sourceInterval: [699, 704] }, ["app", { sourceInterval: [699, 703] }, "Iter", []]]], Iter_star: ["define", { sourceInterval: [719, 736] }, null, [], ["seq", { sourceInterval: [719, 727] }, ["app", { sourceInterval: [719, 723] }, "Pred", []], ["terminal", { sourceInterval: [724, 727] }, "*"]]], Iter_plus: ["define", { sourceInterval: [743, 760] }, null, [], ["seq", { sourceInterval: [743, 751] }, ["app", { sourceInterval: [743, 747] }, "Pred", []], ["terminal", { sourceInterval: [748, 751] }, "+"]]], Iter_opt: ["define", { sourceInterval: [767, 783] }, null, [], ["seq", { sourceInterval: [767, 775] }, ["app", { sourceInterval: [767, 771] }, "Pred", []], ["terminal", { sourceInterval: [772, 775] }, "?"]]], Iter: ["define", { sourceInterval: [708, 794] }, null, [], ["alt", { sourceInterval: [719, 794] }, ["app", { sourceInterval: [719, 727] }, "Iter_star", []], ["app", { sourceInterval: [743, 751] }, "Iter_plus", []], ["app", { sourceInterval: [767, 775] }, "Iter_opt", []], ["app", { sourceInterval: [790, 794] }, "Pred", []]]], Pred_not: ["define", { sourceInterval: [809, 824] }, null, [], ["seq", { sourceInterval: [809, 816] }, ["terminal", { sourceInterval: [809, 812] }, "~"], ["app", { sourceInterval: [813, 816] }, "Lex", []]]], Pred_lookahead: ["define", { sourceInterval: [831, 852] }, null, [], ["seq", { sourceInterval: [831, 838] }, ["terminal", { sourceInterval: [831, 834] }, "&"], ["app", { sourceInterval: [835, 838] }, "Lex", []]]], Pred: ["define", { sourceInterval: [798, 862] }, null, [], ["alt", { sourceInterval: [809, 862] }, ["app", { sourceInterval: [809, 816] }, "Pred_not", []], ["app", { sourceInterval: [831, 838] }, "Pred_lookahead", []], ["app", { sourceInterval: [859, 862] }, "Lex", []]]], Lex_lex: ["define", { sourceInterval: [876, 892] }, null, [], ["seq", { sourceInterval: [876, 884] }, ["terminal", { sourceInterval: [876, 879] }, "#"], ["app", { sourceInterval: [880, 884] }, "Base", []]]], Lex: ["define", { sourceInterval: [866, 903] }, null, [], ["alt", { sourceInterval: [876, 903] }, ["app", { sourceInterval: [876, 884] }, "Lex_lex", []], ["app", { sourceInterval: [899, 903] }, "Base", []]]], Base_application: ["define", { sourceInterval: [918, 979] }, null, [], ["seq", { sourceInterval: [918, 963] }, ["app", { sourceInterval: [918, 923] }, "ident", []], ["opt", { sourceInterval: [924, 931] }, ["app", { sourceInterval: [924, 930] }, "Params", []]], ["not", { sourceInterval: [932, 963] }, ["alt", { sourceInterval: [934, 962] }, ["seq", { sourceInterval: [934, 948] }, ["opt", { sourceInterval: [934, 944] }, ["app", { sourceInterval: [934, 943] }, "ruleDescr", []]], ["terminal", { sourceInterval: [945, 948] }, "="]], ["terminal", { sourceInterval: [951, 955] }, ":="], ["terminal", { sourceInterval: [958, 962] }, "+="]]]]], Base_range: ["define", { sourceInterval: [986, 1041] }, null, [], ["seq", { sourceInterval: [986, 1022] }, ["app", { sourceInterval: [986, 1001] }, "oneCharTerminal", []], ["terminal", { sourceInterval: [1002, 1006] }, ".."], ["app", { sourceInterval: [1007, 1022] }, "oneCharTerminal", []]]], Base_terminal: ["define", { sourceInterval: [1048, 1106] }, null, [], ["app", { sourceInterval: [1048, 1056] }, "terminal", []]], Base_paren: ["define", { sourceInterval: [1113, 1168] }, null, [], ["seq", { sourceInterval: [1113, 1124] }, ["terminal", { sourceInterval: [1113, 1116] }, "("], ["app", { sourceInterval: [1117, 1120] }, "Alt", []], ["terminal", { sourceInterval: [1121, 1124] }, ")"]]], Base: ["define", { sourceInterval: [907, 1168] }, null, [], ["alt", { sourceInterval: [918, 1168] }, ["app", { sourceInterval: [918, 963] }, "Base_application", []], ["app", { sourceInterval: [986, 1022] }, "Base_range", []], ["app", { sourceInterval: [1048, 1056] }, "Base_terminal", []], ["app", { sourceInterval: [1113, 1124] }, "Base_paren", []]]], ruleDescr: ["define", { sourceInterval: [1172, 1231] }, "a rule description", [], ["seq", { sourceInterval: [1210, 1231] }, ["terminal", { sourceInterval: [1210, 1213] }, "("], ["app", { sourceInterval: [1214, 1227] }, "ruleDescrText", []], ["terminal", { sourceInterval: [1228, 1231] }, ")"]]], ruleDescrText: ["define", { sourceInterval: [1235, 1266] }, null, [], ["star", { sourceInterval: [1255, 1266] }, ["seq", { sourceInterval: [1256, 1264] }, ["not", { sourceInterval: [1256, 1260] }, ["terminal", { sourceInterval: [1257, 1260] }, ")"]], ["app", { sourceInterval: [1261, 1264] }, "any", []]]]], caseName: ["define", { sourceInterval: [1270, 1338] }, null, [], ["seq", { sourceInterval: [1285, 1338] }, ["terminal", { sourceInterval: [1285, 1289] }, "--"], ["star", { sourceInterval: [1290, 1304] }, ["seq", { sourceInterval: [1291, 1302] }, ["not", { sourceInterval: [1291, 1296] }, ["terminal", { sourceInterval: [1292, 1296] }, `
`]], ["app", { sourceInterval: [1297, 1302] }, "space", []]]], ["app", { sourceInterval: [1305, 1309] }, "name", []], ["star", { sourceInterval: [1310, 1324] }, ["seq", { sourceInterval: [1311, 1322] }, ["not", { sourceInterval: [1311, 1316] }, ["terminal", { sourceInterval: [1312, 1316] }, `
`]], ["app", { sourceInterval: [1317, 1322] }, "space", []]]], ["alt", { sourceInterval: [1326, 1337] }, ["terminal", { sourceInterval: [1326, 1330] }, `
`], ["lookahead", { sourceInterval: [1333, 1337] }, ["terminal", { sourceInterval: [1334, 1337] }, "}"]]]]], name: ["define", { sourceInterval: [1342, 1382] }, "a name", [], ["seq", { sourceInterval: [1363, 1382] }, ["app", { sourceInterval: [1363, 1372] }, "nameFirst", []], ["star", { sourceInterval: [1373, 1382] }, ["app", { sourceInterval: [1373, 1381] }, "nameRest", []]]]], nameFirst: ["define", { sourceInterval: [1386, 1418] }, null, [], ["alt", { sourceInterval: [1402, 1418] }, ["terminal", { sourceInterval: [1402, 1405] }, "_"], ["app", { sourceInterval: [1412, 1418] }, "letter", []]]], nameRest: ["define", { sourceInterval: [1422, 1452] }, null, [], ["alt", { sourceInterval: [1437, 1452] }, ["terminal", { sourceInterval: [1437, 1440] }, "_"], ["app", { sourceInterval: [1447, 1452] }, "alnum", []]]], ident: ["define", { sourceInterval: [1456, 1489] }, "an identifier", [], ["app", { sourceInterval: [1485, 1489] }, "name", []]], terminal: ["define", { sourceInterval: [1493, 1531] }, null, [], ["seq", { sourceInterval: [1508, 1531] }, ["terminal", { sourceInterval: [1508, 1512] }, '"'], ["star", { sourceInterval: [1513, 1526] }, ["app", { sourceInterval: [1513, 1525] }, "terminalChar", []]], ["terminal", { sourceInterval: [1527, 1531] }, '"']]], oneCharTerminal: ["define", { sourceInterval: [1535, 1579] }, null, [], ["seq", { sourceInterval: [1557, 1579] }, ["terminal", { sourceInterval: [1557, 1561] }, '"'], ["app", { sourceInterval: [1562, 1574] }, "terminalChar", []], ["terminal", { sourceInterval: [1575, 1579] }, '"']]], terminalChar: ["define", { sourceInterval: [1583, 1660] }, null, [], ["alt", { sourceInterval: [1602, 1660] }, ["app", { sourceInterval: [1602, 1612] }, "escapeChar", []], ["seq", { sourceInterval: [1621, 1660] }, ["not", { sourceInterval: [1621, 1626] }, ["terminal", { sourceInterval: [1622, 1626] }, "\\"]], ["not", { sourceInterval: [1627, 1632] }, ["terminal", { sourceInterval: [1628, 1632] }, '"']], ["not", { sourceInterval: [1633, 1638] }, ["terminal", { sourceInterval: [1634, 1638] }, `
`]], ["range", { sourceInterval: [1639, 1660] }, "\x00", "\uDBFF\uDFFF"]]]], escapeChar_backslash: ["define", { sourceInterval: [1703, 1758] }, null, [], ["terminal", { sourceInterval: [1703, 1709] }, "\\\\"]], escapeChar_doubleQuote: ["define", { sourceInterval: [1765, 1822] }, null, [], ["terminal", { sourceInterval: [1765, 1771] }, "\\\""]], escapeChar_singleQuote: ["define", { sourceInterval: [1829, 1886] }, null, [], ["terminal", { sourceInterval: [1829, 1835] }, "\\'"]], escapeChar_backspace: ["define", { sourceInterval: [1893, 1948] }, null, [], ["terminal", { sourceInterval: [1893, 1898] }, "\\b"]], escapeChar_lineFeed: ["define", { sourceInterval: [1955, 2009] }, null, [], ["terminal", { sourceInterval: [1955, 1960] }, "\\n"]], escapeChar_carriageReturn: ["define", { sourceInterval: [2016, 2076] }, null, [], ["terminal", { sourceInterval: [2016, 2021] }, "\\r"]], escapeChar_tab: ["define", { sourceInterval: [2083, 2132] }, null, [], ["terminal", { sourceInterval: [2083, 2088] }, "\\t"]], escapeChar_unicodeCodePoint: ["define", { sourceInterval: [2139, 2243] }, null, [], ["seq", { sourceInterval: [2139, 2221] }, ["terminal", { sourceInterval: [2139, 2145] }, "\\u{"], ["app", { sourceInterval: [2146, 2154] }, "hexDigit", []], ["opt", { sourceInterval: [2155, 2164] }, ["app", { sourceInterval: [2155, 2163] }, "hexDigit", []]], ["opt", { sourceInterval: [2165, 2174] }, ["app", { sourceInterval: [2165, 2173] }, "hexDigit", []]], ["opt", { sourceInterval: [2188, 2197] }, ["app", { sourceInterval: [2188, 2196] }, "hexDigit", []]], ["opt", { sourceInterval: [2198, 2207] }, ["app", { sourceInterval: [2198, 2206] }, "hexDigit", []]], ["opt", { sourceInterval: [2208, 2217] }, ["app", { sourceInterval: [2208, 2216] }, "hexDigit", []]], ["terminal", { sourceInterval: [2218, 2221] }, "}"]]], escapeChar_unicodeEscape: ["define", { sourceInterval: [2250, 2309] }, null, [], ["seq", { sourceInterval: [2250, 2291] }, ["terminal", { sourceInterval: [2250, 2255] }, "\\u"], ["app", { sourceInterval: [2256, 2264] }, "hexDigit", []], ["app", { sourceInterval: [2265, 2273] }, "hexDigit", []], ["app", { sourceInterval: [2274, 2282] }, "hexDigit", []], ["app", { sourceInterval: [2283, 2291] }, "hexDigit", []]]], escapeChar_hexEscape: ["define", { sourceInterval: [2316, 2371] }, null, [], ["seq", { sourceInterval: [2316, 2339] }, ["terminal", { sourceInterval: [2316, 2321] }, "\\x"], ["app", { sourceInterval: [2322, 2330] }, "hexDigit", []], ["app", { sourceInterval: [2331, 2339] }, "hexDigit", []]]], escapeChar: ["define", { sourceInterval: [1664, 2371] }, "an escape sequence", [], ["alt", { sourceInterval: [1703, 2371] }, ["app", { sourceInterval: [1703, 1709] }, "escapeChar_backslash", []], ["app", { sourceInterval: [1765, 1771] }, "escapeChar_doubleQuote", []], ["app", { sourceInterval: [1829, 1835] }, "escapeChar_singleQuote", []], ["app", { sourceInterval: [1893, 1898] }, "escapeChar_backspace", []], ["app", { sourceInterval: [1955, 1960] }, "escapeChar_lineFeed", []], ["app", { sourceInterval: [2016, 2021] }, "escapeChar_carriageReturn", []], ["app", { sourceInterval: [2083, 2088] }, "escapeChar_tab", []], ["app", { sourceInterval: [2139, 2221] }, "escapeChar_unicodeCodePoint", []], ["app", { sourceInterval: [2250, 2291] }, "escapeChar_unicodeEscape", []], ["app", { sourceInterval: [2316, 2339] }, "escapeChar_hexEscape", []]]], space: ["extend", { sourceInterval: [2375, 2394] }, null, [], ["app", { sourceInterval: [2387, 2394] }, "comment", []]], comment_singleLine: ["define", { sourceInterval: [2412, 2458] }, null, [], ["seq", { sourceInterval: [2412, 2443] }, ["terminal", { sourceInterval: [2412, 2416] }, "//"], ["star", { sourceInterval: [2417, 2429] }, ["seq", { sourceInterval: [2418, 2427] }, ["not", { sourceInterval: [2418, 2423] }, ["terminal", { sourceInterval: [2419, 2423] }, `
`]], ["app", { sourceInterval: [2424, 2427] }, "any", []]]], ["lookahead", { sourceInterval: [2430, 2443] }, ["alt", { sourceInterval: [2432, 2442] }, ["terminal", { sourceInterval: [2432, 2436] }, `
`], ["app", { sourceInterval: [2439, 2442] }, "end", []]]]]], comment_multiLine: ["define", { sourceInterval: [2465, 2501] }, null, [], ["seq", { sourceInterval: [2465, 2487] }, ["terminal", { sourceInterval: [2465, 2469] }, "/*"], ["star", { sourceInterval: [2470, 2482] }, ["seq", { sourceInterval: [2471, 2480] }, ["not", { sourceInterval: [2471, 2476] }, ["terminal", { sourceInterval: [2472, 2476] }, "*/"]], ["app", { sourceInterval: [2477, 2480] }, "any", []]]], ["terminal", { sourceInterval: [2483, 2487] }, "*/"]]], comment: ["define", { sourceInterval: [2398, 2501] }, null, [], ["alt", { sourceInterval: [2412, 2501] }, ["app", { sourceInterval: [2412, 2443] }, "comment_singleLine", []], ["app", { sourceInterval: [2465, 2487] }, "comment_multiLine", []]]], tokens: ["define", { sourceInterval: [2505, 2520] }, null, [], ["star", { sourceInterval: [2514, 2520] }, ["app", { sourceInterval: [2514, 2519] }, "token", []]]], token: ["define", { sourceInterval: [2524, 2600] }, null, [], ["alt", { sourceInterval: [2532, 2600] }, ["app", { sourceInterval: [2532, 2540] }, "caseName", []], ["app", { sourceInterval: [2543, 2550] }, "comment", []], ["app", { sourceInterval: [2553, 2558] }, "ident", []], ["app", { sourceInterval: [2561, 2569] }, "operator", []], ["app", { sourceInterval: [2572, 2583] }, "punctuation", []], ["app", { sourceInterval: [2586, 2594] }, "terminal", []], ["app", { sourceInterval: [2597, 2600] }, "any", []]]], operator: ["define", { sourceInterval: [2604, 2669] }, null, [], ["alt", { sourceInterval: [2615, 2669] }, ["terminal", { sourceInterval: [2615, 2619] }, "<:"], ["terminal", { sourceInterval: [2622, 2625] }, "="], ["terminal", { sourceInterval: [2628, 2632] }, ":="], ["terminal", { sourceInterval: [2635, 2639] }, "+="], ["terminal", { sourceInterval: [2642, 2645] }, "*"], ["terminal", { sourceInterval: [2648, 2651] }, "+"], ["terminal", { sourceInterval: [2654, 2657] }, "?"], ["terminal", { sourceInterval: [2660, 2663] }, "~"], ["terminal", { sourceInterval: [2666, 2669] }, "&"]]], punctuation: ["define", { sourceInterval: [2673, 2709] }, null, [], ["alt", { sourceInterval: [2687, 2709] }, ["terminal", { sourceInterval: [2687, 2690] }, "<"], ["terminal", { sourceInterval: [2693, 2696] }, ">"], ["terminal", { sourceInterval: [2699, 2702] }, ","], ["terminal", { sourceInterval: [2705, 2709] }, "--"]]] }]);

// node_modules/ohm-js/src/buildGrammar.js
var superSplicePlaceholder = Object.create(PExpr.prototype);
function namespaceHas(ns, name) {
  for (const prop in ns) {
    if (prop === name)
      return true;
  }
  return false;
}
function buildGrammar2(match, namespace, optOhmGrammarForTesting) {
  const builder = new Builder;
  let decl;
  let currentRuleName;
  let currentRuleFormals;
  let overriding = false;
  const metaGrammar = optOhmGrammarForTesting || ohm_grammar_default;
  const helpers = metaGrammar.createSemantics().addOperation("visit", {
    Grammars(grammarIter) {
      return grammarIter.children.map((c) => c.visit());
    },
    Grammar(id, s, _open, rules, _close) {
      const grammarName = id.visit();
      decl = builder.newGrammar(grammarName);
      s.child(0) && s.child(0).visit();
      rules.children.map((c) => c.visit());
      const g = decl.build();
      g.source = this.source.trimmed();
      if (namespaceHas(namespace, grammarName)) {
        throw duplicateGrammarDeclaration(g, namespace);
      }
      namespace[grammarName] = g;
      return g;
    },
    SuperGrammar(_, n) {
      const superGrammarName = n.visit();
      if (superGrammarName === "null") {
        decl.withSuperGrammar(null);
      } else {
        if (!namespace || !namespaceHas(namespace, superGrammarName)) {
          throw undeclaredGrammar(superGrammarName, namespace, n.source);
        }
        decl.withSuperGrammar(namespace[superGrammarName]);
      }
    },
    Rule_define(n, fs, d, _, b) {
      currentRuleName = n.visit();
      currentRuleFormals = fs.children.map((c) => c.visit())[0] || [];
      if (!decl.defaultStartRule && decl.ensureSuperGrammar() !== Grammar.ProtoBuiltInRules) {
        decl.withDefaultStartRule(currentRuleName);
      }
      const body = b.visit();
      const description = d.children.map((c) => c.visit())[0];
      const source = this.source.trimmed();
      return decl.define(currentRuleName, currentRuleFormals, body, description, source);
    },
    Rule_override(n, fs, _, b) {
      currentRuleName = n.visit();
      currentRuleFormals = fs.children.map((c) => c.visit())[0] || [];
      const source = this.source.trimmed();
      decl.ensureSuperGrammarRuleForOverriding(currentRuleName, source);
      overriding = true;
      const body = b.visit();
      overriding = false;
      return decl.override(currentRuleName, currentRuleFormals, body, null, source);
    },
    Rule_extend(n, fs, _, b) {
      currentRuleName = n.visit();
      currentRuleFormals = fs.children.map((c) => c.visit())[0] || [];
      const body = b.visit();
      const source = this.source.trimmed();
      return decl.extend(currentRuleName, currentRuleFormals, body, null, source);
    },
    RuleBody(_, terms) {
      return builder.alt(...terms.visit()).withSource(this.source);
    },
    OverrideRuleBody(_, terms) {
      const args = terms.visit();
      const expansionPos = args.indexOf(superSplicePlaceholder);
      if (expansionPos >= 0) {
        const beforeTerms = args.slice(0, expansionPos);
        const afterTerms = args.slice(expansionPos + 1);
        afterTerms.forEach((t) => {
          if (t === superSplicePlaceholder)
            throw multipleSuperSplices(t);
        });
        return new Splice(decl.superGrammar, currentRuleName, beforeTerms, afterTerms).withSource(this.source);
      } else {
        return builder.alt(...args).withSource(this.source);
      }
    },
    Formals(opointy, fs, cpointy) {
      return fs.visit();
    },
    Params(opointy, ps, cpointy) {
      return ps.visit();
    },
    Alt(seqs) {
      return builder.alt(...seqs.visit()).withSource(this.source);
    },
    TopLevelTerm_inline(b, n) {
      const inlineRuleName = currentRuleName + "_" + n.visit();
      const body = b.visit();
      const source = this.source.trimmed();
      const isNewRuleDeclaration = !(decl.superGrammar && decl.superGrammar.rules[inlineRuleName]);
      if (overriding && !isNewRuleDeclaration) {
        decl.override(inlineRuleName, currentRuleFormals, body, null, source);
      } else {
        decl.define(inlineRuleName, currentRuleFormals, body, null, source);
      }
      const params = currentRuleFormals.map((formal) => builder.app(formal));
      return builder.app(inlineRuleName, params).withSource(body.source);
    },
    OverrideTopLevelTerm_superSplice(_) {
      return superSplicePlaceholder;
    },
    Seq(expr) {
      return builder.seq(...expr.children.map((c) => c.visit())).withSource(this.source);
    },
    Iter_star(x, _) {
      return builder.star(x.visit()).withSource(this.source);
    },
    Iter_plus(x, _) {
      return builder.plus(x.visit()).withSource(this.source);
    },
    Iter_opt(x, _) {
      return builder.opt(x.visit()).withSource(this.source);
    },
    Pred_not(_, x) {
      return builder.not(x.visit()).withSource(this.source);
    },
    Pred_lookahead(_, x) {
      return builder.lookahead(x.visit()).withSource(this.source);
    },
    Lex_lex(_, x) {
      return builder.lex(x.visit()).withSource(this.source);
    },
    Base_application(rule, ps) {
      const params = ps.children.map((c) => c.visit())[0] || [];
      return builder.app(rule.visit(), params).withSource(this.source);
    },
    Base_range(from, _, to) {
      return builder.range(from.visit(), to.visit()).withSource(this.source);
    },
    Base_terminal(expr) {
      return builder.terminal(expr.visit()).withSource(this.source);
    },
    Base_paren(open, x, close) {
      return x.visit();
    },
    ruleDescr(open, t, close) {
      return t.visit();
    },
    ruleDescrText(_) {
      return this.sourceString.trim();
    },
    caseName(_, space1, n, space2, end2) {
      return n.visit();
    },
    name(first, rest) {
      return this.sourceString;
    },
    nameFirst(expr) {},
    nameRest(expr) {},
    terminal(open, cs, close) {
      return cs.children.map((c) => c.visit()).join("");
    },
    oneCharTerminal(open, c, close) {
      return c.visit();
    },
    escapeChar(c) {
      try {
        return unescapeCodePoint(this.sourceString);
      } catch (err) {
        if (err instanceof RangeError && err.message.startsWith("Invalid code point ")) {
          throw invalidCodePoint(c);
        }
        throw err;
      }
    },
    NonemptyListOf(x, _, xs) {
      return [x.visit()].concat(xs.children.map((c) => c.visit()));
    },
    EmptyListOf() {
      return [];
    },
    _terminal() {
      return this.sourceString;
    }
  });
  return helpers(match).visit();
}

// node_modules/ohm-js/dist/operations-and-attributes.js
var operations_and_attributes_default = makeRecipe(["grammar", { source: `OperationsAndAttributes {

  AttributeSignature =
    name

  OperationSignature =
    name Formals?

  Formals
    = "(" ListOf<name, ","> ")"

  name  (a name)
    = nameFirst nameRest*

  nameFirst
    = "_"
    | letter

  nameRest
    = "_"
    | alnum

}` }, "OperationsAndAttributes", null, "AttributeSignature", { AttributeSignature: ["define", { sourceInterval: [29, 58] }, null, [], ["app", { sourceInterval: [54, 58] }, "name", []]], OperationSignature: ["define", { sourceInterval: [62, 100] }, null, [], ["seq", { sourceInterval: [87, 100] }, ["app", { sourceInterval: [87, 91] }, "name", []], ["opt", { sourceInterval: [92, 100] }, ["app", { sourceInterval: [92, 99] }, "Formals", []]]]], Formals: ["define", { sourceInterval: [104, 143] }, null, [], ["seq", { sourceInterval: [118, 143] }, ["terminal", { sourceInterval: [118, 121] }, "("], ["app", { sourceInterval: [122, 139] }, "ListOf", [["app", { sourceInterval: [129, 133] }, "name", []], ["terminal", { sourceInterval: [135, 138] }, ","]]], ["terminal", { sourceInterval: [140, 143] }, ")"]]], name: ["define", { sourceInterval: [147, 187] }, "a name", [], ["seq", { sourceInterval: [168, 187] }, ["app", { sourceInterval: [168, 177] }, "nameFirst", []], ["star", { sourceInterval: [178, 187] }, ["app", { sourceInterval: [178, 186] }, "nameRest", []]]]], nameFirst: ["define", { sourceInterval: [191, 223] }, null, [], ["alt", { sourceInterval: [207, 223] }, ["terminal", { sourceInterval: [207, 210] }, "_"], ["app", { sourceInterval: [217, 223] }, "letter", []]]], nameRest: ["define", { sourceInterval: [227, 257] }, null, [], ["alt", { sourceInterval: [242, 257] }, ["terminal", { sourceInterval: [242, 245] }, "_"], ["app", { sourceInterval: [252, 257] }, "alnum", []]]] }]);

// node_modules/ohm-js/src/semanticsDeferredInit.js
initBuiltInSemantics(Grammar.BuiltInRules);
initPrototypeParser(operations_and_attributes_default);
function initBuiltInSemantics(builtInRules) {
  const actions = {
    empty() {
      return this.iteration();
    },
    nonEmpty(first, _, rest) {
      return this.iteration([first].concat(rest.children));
    },
    self(..._children) {
      return this;
    }
  };
  Semantics.BuiltInSemantics = Semantics.createSemantics(builtInRules, null).addOperation("asIteration", {
    emptyListOf: actions.empty,
    nonemptyListOf: actions.nonEmpty,
    EmptyListOf: actions.empty,
    NonemptyListOf: actions.nonEmpty,
    _iter: actions.self
  });
}
function initPrototypeParser(grammar) {
  Semantics.prototypeGrammarSemantics = grammar.createSemantics().addOperation("parse", {
    AttributeSignature(name) {
      return {
        name: name.parse(),
        formals: []
      };
    },
    OperationSignature(name, optFormals) {
      return {
        name: name.parse(),
        formals: optFormals.children.map((c) => c.parse())[0] || []
      };
    },
    Formals(oparen, fs, cparen) {
      return fs.asIteration().children.map((c) => c.parse());
    },
    name(first, rest) {
      return this.sourceString;
    }
  });
  Semantics.prototypeGrammar = grammar;
}
// node_modules/ohm-js/src/findIndentation.js
function findIndentation(input) {
  let pos = 0;
  const stack = [0];
  const topOfStack = () => stack[stack.length - 1];
  const result = {};
  const regex = /( *).*(?:$|\r?\n|\r)/g;
  let match;
  while ((match = regex.exec(input)) != null) {
    const [line, indent] = match;
    if (line.length === 0)
      break;
    const indentSize = indent.length;
    const prevSize = topOfStack();
    const indentPos = pos + indentSize;
    if (indentSize > prevSize) {
      stack.push(indentSize);
      result[indentPos] = 1;
    } else if (indentSize < prevSize) {
      const prevLength = stack.length;
      while (topOfStack() !== indentSize) {
        stack.pop();
      }
      result[indentPos] = -1 * (prevLength - stack.length);
    }
    pos += line.length;
  }
  if (stack.length > 1) {
    result[pos] = 1 - stack.length;
  }
  return result;
}

// node_modules/ohm-js/src/IndentationSensitive.js
var INDENT_DESCRIPTION = "an indented block";
var DEDENT_DESCRIPTION = "a dedent";
var INVALID_CODE_POINT = 1114111 + 1;

class InputStreamWithIndentation extends InputStream {
  constructor(state) {
    super(state.input);
    this.state = state;
  }
  _indentationAt(pos) {
    return this.state.userData[pos] || 0;
  }
  atEnd() {
    return super.atEnd() && this._indentationAt(this.pos) === 0;
  }
  next() {
    if (this._indentationAt(this.pos) !== 0) {
      this.examinedLength = Math.max(this.examinedLength, this.pos);
      return;
    }
    return super.next();
  }
  nextCharCode() {
    if (this._indentationAt(this.pos) !== 0) {
      this.examinedLength = Math.max(this.examinedLength, this.pos);
      return INVALID_CODE_POINT;
    }
    return super.nextCharCode();
  }
  nextCodePoint() {
    if (this._indentationAt(this.pos) !== 0) {
      this.examinedLength = Math.max(this.examinedLength, this.pos);
      return INVALID_CODE_POINT;
    }
    return super.nextCodePoint();
  }
}

class Indentation extends PExpr {
  constructor(isIndent = true) {
    super();
    this.isIndent = isIndent;
  }
  allowsSkippingPrecedingSpace() {
    return true;
  }
  eval(state) {
    const { inputStream } = state;
    const pseudoTokens = state.userData;
    state.doNotMemoize = true;
    const origPos = inputStream.pos;
    const sign = this.isIndent ? 1 : -1;
    const count = (pseudoTokens[origPos] || 0) * sign;
    if (count > 0) {
      state.userData = Object.create(pseudoTokens);
      state.userData[origPos] -= sign;
      state.pushBinding(new TerminalNode(0), origPos);
      return true;
    } else {
      state.processFailure(origPos, this);
      return false;
    }
  }
  getArity() {
    return 1;
  }
  _assertAllApplicationsAreValid(ruleName, grammar) {}
  _isNullable(grammar, memo) {
    return false;
  }
  assertChoicesHaveUniformArity(ruleName) {}
  assertIteratedExprsAreNotNullable(grammar) {}
  introduceParams(formals) {
    return this;
  }
  substituteParams(actuals) {
    return this;
  }
  toString() {
    return this.isIndent ? "indent" : "dedent";
  }
  toDisplayString() {
    return this.toString();
  }
  toFailure(grammar) {
    const description = this.isIndent ? INDENT_DESCRIPTION : DEDENT_DESCRIPTION;
    return new Failure(this, description, "description");
  }
}
var applyIndent = new Apply("indent");
var applyDedent = new Apply("dedent");
var newAnyBody = new Splice(built_in_rules_default, "any", [applyIndent, applyDedent], []);
var IndentationSensitive = new Builder().newGrammar("IndentationSensitive").withSuperGrammar(built_in_rules_default).define("indent", [], new Indentation(true), INDENT_DESCRIPTION, undefined, true).define("dedent", [], new Indentation(false), DEDENT_DESCRIPTION, undefined, true).extend("any", [], newAnyBody, "any character", undefined).build();
Object.assign(IndentationSensitive, {
  _matchStateInitializer(state) {
    state.userData = findIndentation(state.input);
    state.inputStream = new InputStreamWithIndentation(state);
  },
  supportsIncrementalParsing: false
});

// node_modules/ohm-js/src/main.js
Grammar.initApplicationParser(ohm_grammar_default, buildGrammar2);
var isBuffer = (obj) => !!obj.constructor && typeof obj.constructor.isBuffer === "function" && obj.constructor.isBuffer(obj);
function compileAndLoad(source, namespace) {
  const m = ohm_grammar_default.match(source, "Grammars");
  if (m.failed()) {
    throw grammarSyntaxError(m);
  }
  return buildGrammar2(m, namespace);
}
function grammar(source, optNamespace) {
  const ns = grammars(source, optNamespace);
  const grammarNames = Object.keys(ns);
  if (grammarNames.length === 0) {
    throw new Error("Missing grammar definition");
  } else if (grammarNames.length > 1) {
    const secondGrammar = ns[grammarNames[1]];
    const interval = secondGrammar.source;
    throw new Error(getLineAndColumnMessage(interval.sourceString, interval.startIdx) + "Found more than one grammar definition -- use ohm.grammars() instead.");
  }
  return ns[grammarNames[0]];
}
function grammars(source, optNamespace) {
  const ns = Object.create(optNamespace || {});
  if (typeof source !== "string") {
    if (isBuffer(source)) {
      source = source.toString();
    } else {
      throw new TypeError("Expected string as first argument, got " + unexpectedObjToString(source));
    }
  }
  compileAndLoad(source, ns);
  return ns;
}
// src/lang/ao.ts
var aoGrammar = grammar(`
  Ao {
    Exp = OrExp
    
    OrExp = OrExp "||" AndExp  -- or
          | AndExp
    
    AndExp = AndExp "&&" CompExp  -- and
           | CompExp
    
    CompExp = AddExp "==" AddExp  -- eq
            | AddExp "!=" AddExp  -- neq
            | AddExp "<=" AddExp  -- lte
            | AddExp ">=" AddExp  -- gte
            | AddExp "<" AddExp   -- lt
            | AddExp ">" AddExp   -- gt
            | AddExp
    
    AddExp = AddExp "+" MulExp  -- add
           | AddExp "-" MulExp  -- sub
           | MulExp
    
    MulExp = MulExp "*" UnaryExp  -- mul
           | MulExp "/" UnaryExp  -- div
           | MulExp "%" UnaryExp  -- mod
           | UnaryExp
    
    UnaryExp = "!" CallExp  -- not
             | "-" CallExp  -- neg
             | CallExp
    
    CallExp = CallExp "." ident "(" ListOf<Exp, ","> ")"   -- methodCall
            | CallExp "?." ident "(" ListOf<Exp, ","> ")"  -- optMethodCall
            | CallExp "." ident                             -- propAccess
            | CallExp "?." ident                            -- optChain
            | CallExp "[" Exp "]"                           -- indexAccess
            | ident "(" ListOf<Exp, ","> ")"                -- funcCall
            | PrimaryExp
    
    PrimaryExp = "(" Exp ")"        -- paren
               | ArrayLiteral
               | ObjectLiteral
               | number
               | string
               | boolean
               | null
               | undefined
               | ident
    
    ArrayLiteral = "[" ListOf<Exp, ","> "]"
    
    ObjectLiteral = "{" ListOf<Property, ","> "}"
    
    Property = (ident | string) ":" Exp
    
    ident = letter (letter | digit | "_")*
    
    number = digit+ "." digit+  -- float
           | digit+              -- int
    
    string = "\\"" (~"\\"" any)* "\\""
           | "'" (~"'" any)* "'"
    
    boolean = "true" | "false"
    
    null = "null"
    
    undefined = "undefined"
    
    space += "//" (~"\\n" any)*  -- comment
  }
`);

class Ao {
  context;
  constructor(context = {}) {
    this.context = context;
  }
  interpret(expression) {
    try {
      const match = aoGrammar.match(expression);
      if (match.failed()) {
        console.error("Parse error:", match.message);
        return;
      }
      const semantics = this.createSemantics(this.context);
      return semantics(match).eval();
    } catch (error) {
      console.error("Evaluation error:", error);
      return;
    }
  }
  createSemantics(context) {
    return aoGrammar.createSemantics().addOperation("eval", {
      Exp(e) {
        return e.eval();
      },
      OrExp_or(left, _, right) {
        const l = left.eval();
        return l || right.eval();
      },
      AndExp_and(left, _, right) {
        const l = left.eval();
        return l && right.eval();
      },
      CompExp_eq(left, _, right) {
        return left.eval() == right.eval();
      },
      CompExp_neq(left, _, right) {
        return left.eval() != right.eval();
      },
      CompExp_lte(left, _, right) {
        return left.eval() <= right.eval();
      },
      CompExp_gte(left, _, right) {
        return left.eval() >= right.eval();
      },
      CompExp_lt(left, _, right) {
        return left.eval() < right.eval();
      },
      CompExp_gt(left, _, right) {
        return left.eval() > right.eval();
      },
      AddExp_add(left, _, right) {
        return left.eval() + right.eval();
      },
      AddExp_sub(left, _, right) {
        return left.eval() - right.eval();
      },
      MulExp_mul(left, _, right) {
        return left.eval() * right.eval();
      },
      MulExp_div(left, _, right) {
        return left.eval() / right.eval();
      },
      MulExp_mod(left, _, right) {
        return left.eval() % right.eval();
      },
      UnaryExp_not(_, expr) {
        return !expr.eval();
      },
      UnaryExp_neg(_, expr) {
        return -expr.eval();
      },
      CallExp_methodCall(obj, _1, methodName, _2, args, _3) {
        const o = obj.eval();
        const method = o[methodName.sourceString];
        const argVals = args.asIteration().children.map((arg) => arg.eval());
        if (typeof method === "function") {
          return method.apply(o, argVals);
        }
        return;
      },
      CallExp_optMethodCall(obj, _1, methodName, _2, args, _3) {
        const o = obj.eval();
        if (o == null)
          return;
        const method = o[methodName.sourceString];
        const argVals = args.asIteration().children.map((arg) => arg.eval());
        if (typeof method === "function") {
          return method.apply(o, argVals);
        }
        return;
      },
      CallExp_propAccess(obj, _, prop) {
        const o = obj.eval();
        return o == null ? undefined : o[prop.sourceString];
      },
      CallExp_optChain(obj, _, prop) {
        const o = obj.eval();
        return o == null ? undefined : o[prop.sourceString];
      },
      CallExp_indexAccess(obj, _1, index, _2) {
        return obj.eval()[index.eval()];
      },
      CallExp_funcCall(funcName, _1, args, _2) {
        const name = funcName.sourceString;
        const argVals = args.asIteration().children.map((arg) => arg.eval());
        if (context && typeof context[name] === "function") {
          return context[name](...argVals);
        }
        return;
      },
      PrimaryExp_paren(_1, exp, _2) {
        return exp.eval();
      },
      ArrayLiteral(_1, elems, _2) {
        return elems.asIteration().children.map((e) => e.eval());
      },
      ObjectLiteral(_1, props, _2) {
        const obj = {};
        props.asIteration().children.forEach((prop) => {
          const [key, value] = prop.eval();
          obj[key] = value;
        });
        return obj;
      },
      Property(key, _, value) {
        const keyNode = key.child(0);
        let k;
        if (keyNode.ctorName === "string") {
          k = keyNode.children[1].sourceString;
        } else {
          k = keyNode.sourceString;
        }
        return [k, value.eval()];
      },
      ident(_1, _2) {
        const name = this.sourceString;
        if (context && name in context) {
          return context[name];
        }
        return;
      },
      number_float(_int, _dot, _dec) {
        return parseFloat(this.sourceString);
      },
      number_int(_) {
        return parseInt(this.sourceString);
      },
      string(_1, str, _2) {
        return str.sourceString;
      },
      boolean(b) {
        return b.sourceString === "true";
      },
      null(_) {
        return null;
      },
      undefined(_) {
        return;
      },
      _terminal() {
        return this.sourceString;
      }
    });
  }
  static eval(expression, context = {}) {
    return new Ao(context).interpret(expression);
  }
}

// src/lang/ao_context.ts
class AoContext {
  helpers = new Map;
  cache = new Map;
  addHelpers(name, helpers) {
    this.helpers.set(name, helpers);
    return this;
  }
  addLazyHelpers(name, builder) {
    this.helpers.set(name, builder);
    return this;
  }
  build() {
    const context = {};
    for (const [name, helperOrBuilder] of this.helpers) {
      let helpers;
      if (typeof helperOrBuilder === "function") {
        if (!this.cache.has(name)) {
          this.cache.set(name, helperOrBuilder());
        }
        helpers = this.cache.get(name);
      } else {
        helpers = helperOrBuilder;
      }
      Object.assign(context, helpers);
    }
    return context;
  }
  clearCache() {
    this.cache.clear();
  }
  extend() {
    const extended = new AoContext;
    for (const [name, helpers] of this.helpers) {
      extended.helpers.set(name, helpers);
    }
    return extended;
  }
}

class StandardHelpers {
  static unitProperties(unit) {
    return {
      self: unit,
      unit,
      hp: unit.hp,
      maxHp: unit.maxHp,
      pos: unit.pos,
      team: unit.team,
      state: unit.state,
      abilities: unit.abilities || []
    };
  }
  static math() {
    return {
      Math,
      min: Math.min,
      max: Math.max,
      abs: Math.abs,
      sqrt: Math.sqrt,
      pow: Math.pow,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round
    };
  }
  static arrays() {
    return {
      Array
    };
  }
  static distance(unit) {
    return {
      distance: (target) => {
        if (!target)
          return Infinity;
        const pos = target.pos || target;
        const dx = pos.x - unit.pos.x;
        const dy = pos.y - unit.pos.y;
        return Math.sqrt(dx * dx + dy * dy);
      }
    };
  }
  static finders(unit, getUnits) {
    return {
      closest: {
        enemy: () => {
          let closest = null, minDistSq = Infinity;
          const units = getUnits();
          for (let i = 0;i < units.length; i++) {
            const e = units[i];
            if (e.team !== unit.team && e.state !== "dead" && e.hp > 0) {
              const dx = e.pos.x - unit.pos.x;
              const dy = e.pos.y - unit.pos.y;
              const distSq = dx * dx + dy * dy;
              if (distSq < minDistSq) {
                minDistSq = distSq;
                closest = e;
                if (distSq < 4)
                  break;
              }
            }
          }
          return closest;
        },
        ally: () => {
          let closest = null, minDistSq = Infinity;
          const units = getUnits();
          for (let i = 0;i < units.length; i++) {
            const a = units[i];
            if (a.team === unit.team && a.id !== unit.id && a.state !== "dead" && a.hp > 0) {
              const dx = a.pos.x - unit.pos.x;
              const dy = a.pos.y - unit.pos.y;
              const distSq = dx * dx + dy * dy;
              if (distSq < minDistSq) {
                minDistSq = distSq;
                closest = a;
                if (distSq < 4)
                  break;
              }
            }
          }
          return closest;
        }
      },
      weakest: {
        ally: () => {
          let weakest = null, minHp = Infinity;
          for (const a of getUnits()) {
            if (a.team === unit.team && a.id !== unit.id && a.state !== "dead" && a.hp > 0 && a.hp < minHp) {
              minHp = a.hp;
              weakest = a;
            }
          }
          return weakest;
        }
      },
      healthiest: {
        enemy: () => {
          let healthiest = null, maxHp = 0;
          for (const e of getUnits()) {
            if (e.team !== unit.team && e.state !== "dead" && e.hp > 0 && e.hp > maxHp) {
              maxHp = e.hp;
              healthiest = e;
            }
          }
          return healthiest;
        },
        enemy_in_range: (range) => {
          let healthiest = null, maxHp = 0;
          const rangeSq = range * range;
          for (const e of getUnits()) {
            if (e.team !== unit.team && e.state !== "dead" && e.hp > 0) {
              const dx = e.pos.x - unit.pos.x;
              const dy = e.pos.y - unit.pos.y;
              if (dx * dx + dy * dy <= rangeSq && e.hp > maxHp) {
                maxHp = e.hp;
                healthiest = e;
              }
            }
          }
          return healthiest;
        }
      }
    };
  }
  static counters(unit, getUnits) {
    return {
      count: {
        enemies_in_range: (range) => {
          const rangeSq = range * range;
          let count = 0;
          const units = getUnits();
          for (let i = 0;i < units.length; i++) {
            const e = units[i];
            if (e.team !== unit.team && e.state !== "dead" && e.hp > 0) {
              const absDx = Math.abs(e.pos.x - unit.pos.x);
              const absDy = Math.abs(e.pos.y - unit.pos.y);
              if (absDx <= range && absDy <= range) {
                const distSq = absDx * absDx + absDy * absDy;
                if (distSq <= rangeSq)
                  count++;
              }
            }
          }
          return count;
        },
        allies: () => {
          return getUnits().filter((u) => u.team === unit.team && u.state !== "dead" && u.hp > 0).length;
        },
        enemies: () => {
          return getUnits().filter((u) => u.team !== unit.team && u.state !== "dead" && u.hp > 0).length;
        }
      }
    };
  }
  static centroids(unit, getUnits) {
    return {
      centroid: {
        wounded_allies: () => {
          const wounded = getUnits().filter((u) => u.team === unit.team && u.id !== unit.id && u.state !== "dead" && u.hp < u.maxHp);
          if (wounded.length === 0)
            return null;
          const x = wounded.reduce((sum, u) => sum + u.pos.x, 0) / wounded.length;
          const y = wounded.reduce((sum, u) => sum + u.pos.y, 0) / wounded.length;
          return { x: Math.round(x), y: Math.round(y) };
        },
        allies: () => {
          const allies = getUnits().filter((u) => u.team === unit.team && u.id !== unit.id && u.state !== "dead");
          if (allies.length === 0)
            return null;
          const x = allies.reduce((sum, u) => sum + u.pos.x, 0) / allies.length;
          const y = allies.reduce((sum, u) => sum + u.pos.y, 0) / allies.length;
          return { x: Math.round(x), y: Math.round(y) };
        },
        enemies: () => {
          const enemies = getUnits().filter((u) => u.team !== unit.team && u.state !== "dead");
          if (enemies.length === 0)
            return null;
          const x = enemies.reduce((sum, u) => sum + u.pos.x, 0) / enemies.length;
          const y = enemies.reduce((sum, u) => sum + u.pos.y, 0) / enemies.length;
          return { x: Math.round(x), y: Math.round(y) };
        }
      }
    };
  }
  static random(tickContext) {
    return {
      random: () => tickContext.getRandom(),
      pick: (array) => array[Math.floor(tickContext.getRandom() * array.length)],
      randomPos: (centerX, centerY, range) => ({
        x: centerX + (tickContext.getRandom() - 0.5) * 2 * range,
        y: centerY + (tickContext.getRandom() - 0.5) * 2 * range
      })
    };
  }
}
function createGameContext(unit, tickContext, cachedUnits) {
  const getUnits = () => cachedUnits || tickContext.getAllUnits();
  return new AoContext().addHelpers("unit", StandardHelpers.unitProperties(unit)).addHelpers("math", StandardHelpers.math()).addHelpers("arrays", StandardHelpers.arrays()).addHelpers("distance", StandardHelpers.distance(unit)).addLazyHelpers("finders", () => StandardHelpers.finders(unit, getUnits)).addLazyHelpers("counters", () => StandardHelpers.counters(unit, getUnits)).addLazyHelpers("centroids", () => StandardHelpers.centroids(unit, getUnits)).addHelpers("random", StandardHelpers.random(tickContext)).build();
}

// src/dmg/dsl_compiler.ts
class DSLCompiler {
  cache = new Map;
  compile(expression) {
    if (this.cache.has(expression)) {
      return this.cache.get(expression);
    }
    const fn = (unit, tickContext) => {
      const context = this.buildContext(unit, tickContext);
      return Ao.eval(expression, context);
    };
    this.cache.set(expression, fn);
    return fn;
  }
  compileWithCachedUnits(expression, cachedUnits) {
    const fn = (unit, tickContext) => {
      const context = createGameContext(unit, tickContext, cachedUnits);
      return Ao.eval(expression, context);
    };
    return fn;
  }
  buildContext(unit, tickContext) {
    return createGameContext(unit, tickContext);
  }
  clearCache() {
    this.cache.clear();
  }
}
var dslCompiler = new DSLCompiler;
// data/units.json
var units_default = {
  hero: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "hero",
    state: "idle",
    hp: 100,
    maxHp: 100,
    dmg: 15,
    mass: 10,
    tags: ["hero"],
    meta: {
      scale: "hero",
      useRig: true
    }
  },
  worm: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "worm",
    state: "idle",
    hp: 10,
    maxHp: 10,
    dmg: 3,
    mass: 4,
    abilities: [
      "jumps"
    ]
  },
  squirrel: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "squirrel",
    state: "idle",
    hp: 5,
    maxHp: 5,
    mass: 1,
    tags: [
      "follower",
      "beast",
      "forest"
    ],
    abilities: [
      "jumps"
    ]
  },
  megasquirrel: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "megasquirrel",
    state: "idle",
    hp: 40,
    maxHp: 40,
    mass: 8,
    tags: [
      "mythic",
      "beast",
      "forest"
    ],
    abilities: [
      "jumps"
    ],
    meta: {
      huge: true,
      facing: "right"
    }
  },
  skeleton: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "skeleton",
    state: "idle",
    hp: 25,
    maxHp: 25,
    mass: 1,
    tags: [
      "undead",
      "black",
      "hunt"
    ],
    abilities: [],
    meta: {
      perdurance: "undead",
      facing: "right"
    }
  },
  "skeleton-mage": {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "skeleton-mage",
    state: "idle",
    hp: 20,
    maxHp: 20,
    mass: 0.7,
    tags: [
      "undead",
      "black",
      "caster"
    ],
    abilities: [],
    meta: {
      perdurance: "undead",
      facing: "right"
    }
  },
  ghost: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "ghost",
    state: "idle",
    hp: 30,
    maxHp: 30,
    mass: 0.1,
    tags: [
      "undead",
      "spectral",
      "black"
    ],
    abilities: [],
    meta: {
      perdurance: "spectral",
      facing: "right"
    }
  },
  demon: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "demon",
    state: "idle",
    hp: 60,
    maxHp: 60,
    mass: 2,
    tags: [
      "fiend",
      "black",
      "hunt"
    ],
    abilities: [
      "fireBlast"
    ],
    meta: {
      perdurance: "fiendish",
      facing: "right"
    }
  },
  "mimic-worm": {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "mimic-worm",
    state: "idle",
    hp: 50,
    maxHp: 50,
    mass: 1.5,
    tags: [
      "shapeshifter",
      "black"
    ],
    abilities: [
      "jumps"
    ],
    meta: {
      segmented: true,
      segmentCount: 3,
      facing: "right"
    }
  },
  "big-worm": {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "big-worm",
    state: "idle",
    hp: 90,
    maxHp: 90,
    mass: 2,
    tags: [
      "beast",
      "black",
      "hunt"
    ],
    abilities: [
      "breatheFire"
    ],
    meta: {
      huge: true,
      segmented: true,
      segmentCount: 5,
      facing: "right"
    }
  },
  "desert-megaworm": {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "big-worm",
    state: "idle",
    hp: 300,
    maxHp: 300,
    mass: 4,
    tags: [
      "beast",
      "desert",
      "hunt",
      "segmented",
      "massive"
    ],
    abilities: [
      "sandBlast"
    ],
    meta: {
      huge: true,
      segmented: true,
      segmentCount: 12,
      facing: "right",
      desertAdapted: true,
      heatResistant: true
    }
  },
  "forest-squirrel": {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "squirrel",
    state: "idle",
    hp: 25,
    maxHp: 25,
    mass: 0.8,
    tags: [
      "forest",
      "agile",
      "gatherer"
    ],
    abilities: [],
    meta: {
      facing: "right",
      canClimb: true,
      jumpHeight: 3,
      acornStash: 0
    }
  },
  owl: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "owl",
    state: "idle",
    hp: 30,
    maxHp: 30,
    mass: 1,
    tags: [
      "forest",
      "flying",
      "hunter",
      "nocturnal"
    ],
    abilities: [],
    meta: {
      facing: "right",
      flying: true,
      z: 2,
      vision: 12,
      silentFlight: true
    }
  },
  penguin: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "penguin",
    state: "idle",
    hp: 15,
    maxHp: 15,
    dmg: 2,
    mass: 1,
    tags: [
      "arctic",
      "bird",
      "cute"
    ],
    abilities: [],
    meta: {
      facing: "right",
      sliding: false,
      waddle: true
    }
  },
  bear: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "bear",
    state: "idle",
    hp: 80,
    maxHp: 80,
    mass: 3,
    tags: [
      "forest",
      "tank",
      "territorial"
    ],
    abilities: [],
    meta: {
      facing: "right",
      intimidating: true,
      hibernating: false,
      swipeRange: 2
    }
  },
  bird: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "leaf",
    state: "idle",
    hp: 5,
    maxHp: 5,
    mass: 0.2,
    tags: [
      "forest",
      "ambient",
      "energy",
      "flying"
    ],
    abilities: [],
    meta: {
      facing: "right",
      flying: true,
      z: 3,
      energyValue: 10,
      flightPattern: "circular"
    }
  },
  deer: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "deer",
    state: "idle",
    hp: 20,
    maxHp: 20,
    dmg: 2,
    mass: 1.5,
    tags: [
      "forest",
      "beast",
      "peaceful"
    ],
    abilities: [],
    meta: {
      facing: "right",
      moveSpeed: 1.2,
      fleeDistance: 5,
      peaceful: true
    }
  },
  rabbit: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "rabbit",
    state: "idle",
    hp: 8,
    maxHp: 8,
    dmg: 1,
    mass: 0.3,
    tags: [
      "forest",
      "beast",
      "small",
      "peaceful"
    ],
    abilities: [],
    meta: {
      facing: "right",
      moveSpeed: 1.5,
      jumpRange: 3,
      fleeDistance: 6,
      peaceful: true
    }
  },
  fox: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "fox",
    state: "idle",
    hp: 15,
    maxHp: 15,
    dmg: 4,
    mass: 0.8,
    tags: [
      "forest",
      "beast",
      "hunter",
      "clever"
    ],
    abilities: [],
    meta: {
      facing: "right",
      moveSpeed: 1.1,
      stealthy: true,
      huntSmallCreatures: true
    }
  },
  wolf: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "wolf",
    state: "idle",
    hp: 30,
    maxHp: 30,
    dmg: 8,
    mass: 2,
    tags: [
      "forest",
      "beast",
      "predator",
      "pack"
    ],
    abilities: [],
    meta: {
      facing: "right",
      packHunter: true,
      howl: true
    }
  },
  badger: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "badger",
    state: "idle",
    hp: 25,
    maxHp: 25,
    dmg: 6,
    mass: 1.8,
    tags: [
      "forest",
      "beast",
      "burrower",
      "defensive"
    ],
    abilities: [],
    meta: {
      facing: "right",
      canBurrow: true,
      defensive: true,
      territorial: true
    }
  },
  "worm-hunter": {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "wormrider",
    state: "idle",
    hp: 25,
    maxHp: 25,
    mass: 0.8,
    tags: [
      "desert",
      "hunter",
      "agile",
      "assassin"
    ],
    abilities: [],
    meta: {
      facing: "right",
      desertAdapted: true,
      canClimbGrapples: true,
      moveSpeed: 1.5,
      dashRange: 4
    }
  },
  "sand-ant": {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "worm",
    state: "idle",
    hp: 20,
    maxHp: 20,
    mass: 2,
    tags: [
      "desert",
      "segmented",
      "construct",
      "toy"
    ],
    abilities: [],
    meta: {
      facing: "right",
      segmented: true,
      segmentCount: 2,
      sandAdapted: true
    }
  },
  "desert-worm": {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "worm",
    state: "idle",
    hp: 60,
    maxHp: 60,
    mass: 6,
    tags: [
      "desert",
      "segmented",
      "beast",
      "burrower"
    ],
    abilities: [
      "sandBlast",
      "burrowAmbush"
    ],
    meta: {
      facing: "right",
      segmented: true,
      segmentCount: 4,
      canBurrow: true,
      sandAdapted: true
    }
  },
  mesoworm: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "mesoworm-head",
    state: "idle",
    hp: 35,
    maxHp: 35,
    mass: 2.5,
    dmg: 5,
    tags: [
      "forest",
      "beast",
      "segmented"
    ],
    abilities: [],
    meta: {
      facing: "right",
      segmented: true,
      segmentCount: 2,
      useCustomSegmentSprites: true,
      moveSpeed: 0.8
    }
  },
  "segmented-worm": {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "worm",
    state: "idle",
    hp: 40,
    maxHp: 40,
    mass: 3,
    tags: [
      "beast",
      "segmented"
    ],
    abilities: [],
    meta: {
      facing: "right",
      segmented: true,
      segmentCount: 3
    }
  },
  "giant-sandworm": {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "big-worm",
    state: "idle",
    hp: 120,
    maxHp: 120,
    mass: 50,
    tags: [
      "desert",
      "segmented",
      "titan",
      "burrower"
    ],
    abilities: [],
    meta: {
      facing: "right",
      segmented: true,
      segmentCount: 6,
      canBurrow: true,
      sandAdapted: true,
      huge: true,
      width: 64,
      height: 32
    }
  },
  mechatron: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "mechatron",
    state: "idle",
    hp: 200,
    maxHp: 200,
    mass: 5,
    tags: [
      "mechanical",
      "huge",
      "artillery",
      "hunt"
    ],
    abilities: [
      "missileBarrage",
      "laserSweep",
      "empPulse",
      "shieldRecharge"
    ],
    meta: {
      huge: true,
      width: 32,
      height: 64,
      cellsWide: 4,
      cellsHigh: 8,
      armor: 5,
      facing: "right",
      shieldActive: false,
      damageReduction: 0.2
    }
  },
  freezebot: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "freezebot",
    state: "idle",
    hp: 8,
    maxHp: 8,
    mass: 0.5,
    tags: [
      "construct",
      "ice",
      "hunt"
    ],
    abilities: [
      "freezeAura"
    ],
    meta: {
      perdurance: "sturdiness",
      facing: "right"
    }
  },
  clanker: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "clanker",
    state: "idle",
    hp: 6,
    maxHp: 6,
    mass: 0.8,
    tags: [
      "construct",
      "explosive",
      "hunt",
      "aggressive"
    ],
    abilities: [
      "explode"
    ],
    meta: {
      perdurance: "sturdiness",
      facing: "right"
    }
  },
  spiker: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "spikebot",
    state: "idle",
    hp: 10,
    maxHp: 10,
    mass: 0.6,
    tags: [
      "construct",
      "melee",
      "hunt"
    ],
    abilities: [
      "whipChain"
    ],
    meta: {
      perdurance: "sturdiness",
      facing: "right"
    }
  },
  swarmbot: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "swarmbot",
    state: "idle",
    hp: 12,
    maxHp: 12,
    mass: 0.3,
    tags: [
      "construct",
      "swarm",
      "hunt"
    ],
    abilities: [],
    meta: {
      perdurance: "swarm",
      facing: "right"
    }
  },
  roller: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "jumpbot",
    state: "idle",
    hp: 15,
    maxHp: 15,
    mass: 1.2,
    tags: [
      "construct",
      "charger",
      "hunt"
    ],
    abilities: [
      "chargeAttack"
    ],
    meta: {
      perdurance: "sturdiness",
      facing: "right"
    }
  },
  penguin: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "penguin",
    state: "idle",
    hp: 12,
    maxHp: 12,
    mass: 1,
    tags: [
      "ambient",
      "beast",
      "winter"
    ],
    abilities: [
      "slideKick"
    ],
    meta: {
      facing: "right"
    }
  },
  "arctic-fox": {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "arctic-fox",
    state: "idle",
    hp: 15,
    maxHp: 15,
    mass: 0.8,
    tags: [
      "ambient",
      "beast",
      "winter"
    ],
    meta: {
      facing: "right"
    }
  },
  "snow-owl": {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "snow-owl",
    state: "idle",
    hp: 10,
    maxHp: 10,
    mass: 0.6,
    tags: [
      "ambient",
      "beast",
      "winter",
      "flying"
    ],
    meta: {
      facing: "right"
    }
  },
  zapper: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "zapper",
    state: "idle",
    hp: 15,
    maxHp: 15,
    mass: 0.4,
    tags: [
      "construct",
      "electrical",
      "hunt"
    ],
    abilities: [
      "zapHighest"
    ],
    meta: {
      perdurance: "sturdiness",
      facing: "right"
    }
  },
  dragon: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "hostile",
    sprite: "dragon-head",
    state: "idle",
    hp: 400,
    maxHp: 400,
    mass: 100,
    dmg: 25,
    tags: [
      "dragon",
      "flying",
      "mythic",
      "armored",
      "fire-breathing",
      "segmented"
    ],
    abilities: [
      "dragonFire",
      "wingStorm",
      "terrifyingRoar"
    ],
    meta: {
      facing: "right",
      flying: true,
      huge: true,
      width: 96,
      height: 64,
      armor: 10,
      fireImmune: true,
      segmented: true,
      segmentCount: 8,
      useCustomSegmentSprites: true,
      z: 5
    }
  },
  sphinx: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "neutral",
    sprite: "priest",
    state: "idle",
    hp: 100,
    maxHp: 100,
    mass: 2,
    dmg: 0,
    tags: [
      "noncombatant",
      "dialogue",
      "quest_giver",
      "ancient",
      "wise"
    ],
    abilities: [
      "riddle",
      "teleport"
    ],
    meta: {
      dialogueId: "sphinx_riddles",
      questId: "sphinx_challenge",
      interactable: true,
      facing: "down",
      description: "An ancient guardian who speaks in riddles"
    }
  }
};
// data/folks.json
var folks_default = {
  farmer: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "farmer",
    state: "idle",
    hp: 25,
    maxHp: 25,
    dmg: 3,
    mass: 1,
    abilities: ["plant"],
    tags: [
      "hunt"
    ]
  },
  soldier: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "soldier",
    state: "idle",
    hp: 30,
    maxHp: 30,
    dmg: 5,
    mass: 1,
    tags: [
      "hunt"
    ]
  },
  priest: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "priest",
    state: "idle",
    hp: 20,
    maxHp: 20,
    dmg: 2,
    mass: 1,
    abilities: [
      "heal",
      "radiant"
    ]
  },
  ranger: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "slinger",
    state: "idle",
    hp: 28,
    maxHp: 28,
    dmg: 4,
    mass: 1,
    abilities: [
      "ranged"
    ]
  },
  bombardier: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "bombardier",
    state: "idle",
    hp: 25,
    maxHp: 25,
    dmg: 3,
    mass: 1,
    abilities: [
      "bombardier"
    ],
    tags: [
      "ranged"
    ],
    meta: {
      facing: "right"
    }
  },
  builder: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "builder",
    state: "idle",
    hp: 20,
    maxHp: 20,
    mass: 1,
    tags: [
      "mechanical",
      "support",
      "builder"
    ],
    abilities: [
      "reinforceConstruct"
    ],
    meta: {
      facing: "right"
    }
  },
  mechanic: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "mechanic",
    state: "idle",
    hp: 22,
    maxHp: 22,
    mass: 1,
    tags: [
      "mechanical",
      "support",
      "repair"
    ],
    abilities: [
      "emergencyRepair"
    ],
    meta: {
      facing: "right"
    }
  },
  mechatronist: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "mechatronist",
    state: "idle",
    hp: 30,
    maxHp: 30,
    mass: 1,
    tags: [
      "mechanical",
      "leader",
      "engineer"
    ],
    abilities: [
      "callAirdrop",
      "tacticalOverride"
    ],
    meta: {
      facing: "right",
      calledAirdrop: false,
      canRideMechatron: true
    }
  },
  skirmisher: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "soldier",
    state: "idle",
    hp: 22,
    maxHp: 22,
    mass: 0.9,
    tags: [
      "desert",
      "melee",
      "agile",
      "duelist"
    ],
    abilities: [
      "dualKnifeDance"
    ],
    meta: {
      facing: "right",
      desertAdapted: true,
      dualWield: true,
      attackSpeed: 1.5,
      dodgeChance: 0.25
    }
  },
  rainmaker: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "rainmaker",
    state: "idle",
    hp: 80,
    maxHp: 80,
    mass: 1,
    tags: [
      "weather",
      "mythic"
    ],
    abilities: [
      "makeRain"
    ],
    meta: {
      facing: "right"
    }
  },
  naturist: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "naturist",
    state: "idle",
    hp: 28,
    maxHp: 28,
    dmg: 3,
    mass: 1,
    tags: [
      "forest",
      "support",
      "nature"
    ],
    abilities: [
      "regenerate"
    ],
    meta: {
      facing: "right"
    }
  },
  wildmage: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "wildmage",
    state: "idle",
    hp: 25,
    maxHp: 25,
    dmg: 6,
    mass: 1,
    tags: [
      "forest",
      "magic",
      "chaos"
    ],
    abilities: [
      "wildBolt"
    ],
    meta: {
      facing: "right"
    }
  },
  miner: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "miner",
    state: "idle",
    hp: 35,
    maxHp: 35,
    dmg: 5,
    mass: 1.2,
    tags: [
      "worker",
      "burrower",
      "explorer"
    ],
    abilities: [
      "digTrench"
    ],
    meta: {
      facing: "right",
      canBurrow: true,
      miningSpeed: 2,
      oreCarryCapacity: 10,
      currentOre: 0,
      tunnelRange: 5
    }
  },
  mindmender: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "mindmender",
    state: "idle",
    hp: 28,
    maxHp: 28,
    dmg: 2,
    mass: 0.9,
    tags: [
      "psychic",
      "support",
      "healer"
    ],
    abilities: [
      "psychicHeal"
    ],
    meta: {
      facing: "right",
      psychicRange: 6,
      mindShieldDuration: 50,
      confuseDuration: 30,
      healAmount: 15
    }
  },
  fueler: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "fueler",
    state: "idle",
    hp: 18,
    maxHp: 18,
    mass: 1,
    tags: [
      "mechanical",
      "support",
      "energy"
    ],
    abilities: [
      "powerSurge"
    ],
    meta: {
      facing: "right"
    }
  },
  toymaker: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "toymaker",
    state: "idle",
    hp: 25,
    maxHp: 25,
    mass: 1,
    tags: [
      "mechanical",
      "craftor"
    ],
    abilities: [
      "deployBot"
    ],
    meta: {
      facing: "right"
    }
  },
  druid: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "druid",
    state: "idle",
    hp: 35,
    maxHp: 35,
    dmg: 4,
    mass: 1,
    tags: [
      "forest",
      "magic",
      "nature"
    ],
    abilities: [
      "summonForestCreature",
      "entangle"
    ],
    meta: {
      facing: "right"
    }
  },
  engineer: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "engineer",
    state: "idle",
    hp: 25,
    maxHp: 25,
    mass: 1,
    tags: [
      "mechanical",
      "support",
      "systems"
    ],
    abilities: [
      "shieldGenerator",
      "systemHack"
    ],
    meta: {
      facing: "right"
    }
  },
  lancer: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "lancer",
    state: "idle",
    hp: 45,
    maxHp: 45,
    mass: 1.2,
    dmg: 12,
    tags: [
      "specialist",
      "anti-armor",
      "dragon-hunter"
    ],
    abilities: [
      "harpoonChain",
      "winchPull",
      "armorPierce"
    ],
    meta: {
      facing: "right",
      harpoonRange: 12,
      chainLength: 15,
      armorPiercing: 8,
      winchSpeed: 2
    }
  },
  tamer: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "tamer",
    state: "idle",
    hp: 20,
    maxHp: 20,
    mass: 1
  },
  tracker: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "ranger",
    state: "idle",
    hp: 35,
    maxHp: 35,
    mass: 1,
    tags: [
      "forest",
      "hunter",
      "specialist"
    ],
    abilities: [],
    meta: {
      facing: "right",
      tracking: true,
      footprintDetection: 5,
      trapSetting: true,
      netRange: 4
    }
  },
  waterbearer: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "waterpriest",
    state: "idle",
    hp: 30,
    maxHp: 30,
    mass: 1,
    tags: [
      "desert",
      "support",
      "healer",
      "detector"
    ],
    abilities: [
      "waterBless",
      "detectSpies"
    ],
    meta: {
      facing: "right",
      desertAdapted: true,
      waterReserves: 100,
      detectRange: 6
    }
  },
  welder: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "welder",
    state: "idle",
    hp: 24,
    maxHp: 24,
    mass: 1,
    tags: [
      "mechanical",
      "support",
      "welder"
    ],
    abilities: [
      "emergencyRepair",
      "reinforceConstruct"
    ],
    meta: {
      facing: "right"
    }
  },
  grappler: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "grappler",
    state: "idle",
    hp: 35,
    maxHp: 35,
    dmg: 8,
    mass: 1,
    tags: [
      "desert",
      "hunter",
      "specialist",
      "grappler"
    ],
    abilities: [
      "grapplingHook",
      "pinTarget"
    ],
    meta: {
      facing: "right",
      desertAdapted: true,
      grapplingRange: 8,
      maxGrapples: 2
    }
  },
  assembler: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "assembler",
    state: "idle",
    hp: 26,
    maxHp: 26,
    mass: 1,
    tags: [
      "mechanical",
      "support",
      "assembler"
    ],
    abilities: [
      "reinforceConstruct",
      "powerSurge"
    ],
    meta: {
      facing: "right"
    }
  },
  naturalist: {
    intendedMove: {
      x: 0,
      y: 0
    },
    team: "friendly",
    sprite: "naturalist",
    state: "idle",
    hp: 30,
    maxHp: 30,
    dmg: 3,
    mass: 1,
    tags: [
      "forest",
      "support",
      "beast-tamer"
    ],
    abilities: [
      "tameMegabeast",
      "calmAnimals"
    ],
    meta: {
      facing: "right",
      forestAdapted: true,
      beastAffinity: true
    }
  }
};

// src/dmg/encyclopaedia.ts
class Encyclopaedia {
  static abilities = exports_abilities;
  static bestiary = {
    ...units_default,
    ...folks_default
  };
  static counts = {};
  static id(seriesName) {
    this.counts = this.counts || {};
    let count = this.counts[seriesName] || 0;
    this.counts[seriesName] = count + 1;
    return count === 0 ? "" : count.toString();
  }
  static unit(beast) {
    let u = {
      id: beast + this.id(beast),
      type: beast,
      pos: { x: 0, y: 0 },
      intendedMove: { x: 0, y: 0 },
      state: "idle",
      team: "neutral",
      ...this.bestiary[beast],
      hp: this.bestiary[beast]?.hp || 10,
      maxHp: this.bestiary[beast]?.hp || 10,
      abilities: this.bestiary[beast]?.abilities || [],
      sprite: this.bestiary[beast]?.sprite || beast,
      mass: this.bestiary[beast]?.mass || 1,
      dmg: this.bestiary[beast]?.dmg || 1,
      meta: { ...this.bestiary[beast]?.meta || {} },
      tags: [
        ...this.bestiary[beast]?.tags || [],
        ...beast === "worm" ? ["swarm"] : [],
        ...beast === "farmer" ? ["hunt"] : [],
        ...beast === "soldier" ? ["hunt"] : []
      ]
    };
    if (!u.meta) {
      u.meta = {};
    }
    if (u.abilities && u.abilities.length > 0) {
      const compiledTriggers = {};
      for (const abilityName of u.abilities) {
        const ability = this.abilities[abilityName];
        if (ability?.trigger) {
          try {
            const triggerFn = new Function("self", "context", "allUnits", `const closest = { 
                enemy: () => {
                  let result = null;
                  let minDist = Infinity;
                  for (const u of allUnits) {
                    if (u.team !== self.team && u.state !== "dead") {
                      const dx = u.pos.x - self.pos.x;
                      const dy = u.pos.y - self.pos.y;
                      const dist = dx * dx + dy * dy;
                      if (dist < minDist) {
                        minDist = dist;
                        result = u;
                      }
                    }
                  }
                  return result;
                }
              };
              const distance = (target) => {
                if (!target) return Infinity;
                const t = target.pos || target;
                const dx = t.x - self.pos.x;
                const dy = t.y - self.pos.y;
                return Math.sqrt(dx * dx + dy * dy);
              };
              return ${ability.trigger};`);
            compiledTriggers[ability.trigger] = triggerFn;
          } catch (e) {}
        }
      }
      if (Object.keys(compiledTriggers).length > 0) {
        u.meta.compiledTriggers = compiledTriggers;
      }
    }
    return u;
  }
}

// src/rules/abilities.ts
class Abilities extends Rule {
  static all = exports_abilities;
  static abilityCache = new Map;
  static precompiledAbilities = new Map;
  commands = [];
  cachedAllUnits = [];
  pendingEffects = [];
  constructor() {
    super();
    if (Abilities.precompiledAbilities.size === 0) {
      for (const name in Abilities.all) {
        const ability = Abilities.all[name];
        Abilities.abilityCache.set(name, ability);
        const compiled = { ability };
        Abilities.precompiledAbilities.set(name, compiled);
      }
    }
  }
  ability = (name) => {
    return Abilities.abilityCache.get(name);
  };
  compiledForTick = -1;
  recompileAbilitiesWithCache(cachedUnits, currentTick) {
    if (this.compiledForTick === currentTick) {
      return;
    }
    this.compiledForTick = currentTick;
    for (const compiled of Abilities.precompiledAbilities.values()) {
      compiled.trigger = undefined;
      compiled.target = undefined;
    }
    for (const [name, compiled] of Abilities.precompiledAbilities.entries()) {
      const ability = compiled.ability;
      if (ability.trigger) {
        try {
          compiled.trigger = dslCompiler.compileWithCachedUnits(ability.trigger, cachedUnits);
        } catch (err) {
          console.error(`Failed to compile trigger for ${name}:`, err);
        }
      }
      if (ability.target) {
        try {
          compiled.target = dslCompiler.compileWithCachedUnits(ability.target, cachedUnits);
        } catch (err) {
          console.error(`Failed to compile target for ${name}:`, err);
        }
      }
    }
  }
  execute(context) {
    const currentTick = context.getCurrentTick();
    this.commands = [];
    const metaCommands = [];
    const arrays = context.getArrays?.();
    const useArrays = arrays?.posX && arrays?.posY && arrays?.team;
    const allUnits = context.getAllUnits();
    this.cachedAllUnits = allUnits;
    this.recompileAbilitiesWithCache(allUnits, currentTick);
    const relevantUnits = [];
    for (const unit of allUnits) {
      if (unit.state === "dead" || unit.hp <= 0)
        continue;
      const abilities = unit.abilities;
      if (!abilities || !Array.isArray(abilities) || abilities.length === 0)
        continue;
      const hasNonCombatAbility = abilities.some((a) => a !== "melee" && a !== "ranged");
      if (!hasNonCombatAbility && !unit.meta?.burrowed)
        continue;
      relevantUnits.push(unit);
    }
    DSL.clearCache();
    if (relevantUnits.length === 0) {
      return this.commands;
    }
    context.cachedUnits = allUnits;
    const hostileUnits = allUnits.filter((u) => u.team === "hostile" && u.state !== "dead" && u.hp > 0);
    const friendlyUnits = allUnits.filter((u) => u.team === "friendly" && u.state !== "dead" && u.hp > 0);
    const hasEnemies = hostileUnits.length > 0 && friendlyUnits.length > 0;
    const closestEnemyMap = new Map;
    const enemyDistanceMap = new Map;
    if (hasEnemies) {
      for (const unit of relevantUnits) {
        let closestEnemy = null;
        let minDist = Infinity;
        const enemyUnits = unit.team === "friendly" ? hostileUnits : friendlyUnits;
        for (const enemy of enemyUnits) {
          const dx = enemy.pos.x - unit.pos.x;
          const dy = enemy.pos.y - unit.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) {
            minDist = dist;
            closestEnemy = enemy;
          }
        }
        closestEnemyMap.set(unit.id, closestEnemy);
        enemyDistanceMap.set(unit.id, minDist);
      }
    }
    for (const unit of relevantUnits) {
      const closestEnemyDist = enemyDistanceMap.get(unit.id) || Infinity;
      const meta = unit.meta;
      if (meta?.burrowed && meta.burrowStartTick !== undefined && meta.burrowDuration !== undefined) {
        const ticksBurrowed = currentTick - meta.burrowStartTick;
        if (ticksBurrowed >= meta.burrowDuration) {
          metaCommands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                burrowed: false,
                invisible: false,
                burrowStartTick: undefined,
                burrowDuration: undefined
              }
            }
          });
        }
      }
      const abilities = unit.abilities;
      if (!abilities || abilities.length === 0) {
        continue;
      }
      const lastAbilityTick = unit.lastAbilityTick;
      for (const abilityName of abilities) {
        if (abilityName === "melee" || abilityName === "ranged") {
          continue;
        }
        const ability = Abilities.abilityCache.get(abilityName);
        if (!ability) {
          continue;
        }
        if (context.isAbilityForced(unit.id, abilityName)) {
          continue;
        }
        let lastTick = lastAbilityTick ? lastAbilityTick[abilityName] : undefined;
        let ready = lastTick === undefined || currentTick - lastTick >= ability.cooldown;
        if (!ready) {
          continue;
        }
        if (ability.maxUses) {
          const usesKey = `${abilityName}Uses`;
          const currentUses = meta[usesKey] || 0;
          if (currentUses >= ability.maxUses) {
            continue;
          }
        }
        let shouldTrigger = true;
        let target = unit;
        if (ability.trigger && abilityName !== "melee" && abilityName !== "ranged") {
          const precompiled = Abilities.precompiledAbilities.get(abilityName);
          if (precompiled?.trigger) {
            try {
              shouldTrigger = precompiled.trigger(unit, context);
            } catch (error) {
              console.error(`Error evaluating trigger for ${abilityName}:`, error);
              continue;
            }
          } else {
            console.error(`No compiled trigger for ${abilityName}`);
            continue;
          }
          if (!shouldTrigger) {
            continue;
          }
        }
        if (ability.target && ability.target !== "self") {
          if ((abilityName === "melee" || abilityName === "ranged") && ability.target === "closest.enemy()") {
            target = closestEnemyMap.get(unit.id);
          } else {
            const precompiled = Abilities.precompiledAbilities.get(abilityName);
            if (precompiled?.target) {
              try {
                target = precompiled.target(unit, context);
              } catch (error) {
                console.error(`Error evaluating target for ${abilityName}:`, error);
                continue;
              }
            } else {
              console.error(`No compiled target for ${abilityName}`);
              continue;
            }
          }
          if (!target) {
            continue;
          }
        }
        if (!this.pendingEffects) {
          this.pendingEffects = [];
        }
        for (const effect of ability.effects) {
          this.pendingEffects.push({ effect, caster: unit, target });
        }
        const metaUpdate = {
          lastAbilityTick: {
            ...lastAbilityTick,
            [abilityName]: currentTick
          }
        };
        if (ability.maxUses) {
          const usesKey = `${abilityName}Uses`;
          const currentUses = meta[usesKey] || 0;
          metaUpdate[usesKey] = currentUses + 1;
        }
        metaCommands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: metaUpdate
          }
        });
      }
    }
    if (this.pendingEffects && this.pendingEffects.length > 0) {
      for (const { effect, caster, target } of this.pendingEffects) {
        this.processEffectAsCommand(context, effect, caster, target);
      }
      this.pendingEffects = [];
    }
    this.commands.push(...metaCommands);
    return this.commands;
  }
  effectToCommand(effect, caster, target) {
    const targetId = target?.id;
    const targetPos = target?.pos || target;
    switch (effect.type) {
      case "damage":
        if (!targetId)
          return null;
        return {
          type: "damage",
          params: {
            targetId,
            amount: effect.amount || 0,
            sourceId: caster.id
          }
        };
      case "heal":
        if (!targetId)
          return null;
        return {
          type: "heal",
          params: {
            targetId,
            amount: effect.amount || 0,
            sourceId: caster.id
          }
        };
      case "projectile":
        return {
          type: "projectile",
          params: {
            origin: caster.pos,
            destination: targetPos,
            speed: effect.speed || 1,
            damage: effect.damage || 0,
            casterId: caster.id,
            targetId,
            effect: effect.effect,
            style: effect.style || "bullet"
          }
        };
      default:
        return null;
    }
  }
  processEffectAsCommand(context, effect, caster, primaryTarget) {
    switch (effect.type) {
      case "damage":
        this.hurt(context, effect, caster, primaryTarget);
        break;
      case "heal":
        this.heal(context, effect, caster, primaryTarget);
        break;
      case "aoe":
        this.areaOfEffect(context, effect, caster, primaryTarget);
        break;
      case "projectile":
        this.project(context, effect, caster, primaryTarget);
        break;
      case "weather":
        this.changeWeather(context, effect, caster, primaryTarget);
        break;
      case "lightning":
        this.bolt(context, effect, caster, primaryTarget);
        break;
      case "jump":
        this.leap(context, effect, caster, primaryTarget);
        break;
      case "explode":
        this.explode(context, effect, caster);
        break;
      case "heat":
        this.adjustTemperature(context, effect, caster, primaryTarget);
        break;
      case "deploy":
        this.deploy(context, effect, caster, primaryTarget);
        break;
      case "grapple":
        this.grapply(context, effect, caster, primaryTarget);
        break;
      case "pin":
        this.pin(context, effect, caster, primaryTarget);
        break;
      case "airdrop":
        this.airdrop(context, effect, caster, primaryTarget);
        break;
      case "buff":
        this.buff(context, effect, caster, primaryTarget);
        break;
      case "summon":
        this.summon(context, effect, caster, primaryTarget);
        break;
      case "moisture":
        this.adjustHumidity(context, effect, caster, primaryTarget);
        break;
      case "toss":
        this.toss(context, effect, caster, primaryTarget);
        break;
      case "setOnFire":
        this.ignite(context, effect, caster, primaryTarget);
        break;
      case "particles":
        this.createParticles(context, effect, caster, primaryTarget);
        break;
      case "cone":
        this.coneOfEffect(context, effect, caster, primaryTarget);
        break;
      case "multiple_projectiles":
        this.multiproject(context, effect, caster, primaryTarget);
        break;
      case "line_aoe":
        this.lineOfEffect(context, effect, caster, primaryTarget);
        break;
      case "area_buff":
        this.domainBuff(context, effect, caster, primaryTarget);
        break;
      case "debuff":
        this.debuff(context, effect, caster, primaryTarget);
        break;
      case "cleanse":
        this.cleanse(context, effect, caster, primaryTarget);
        break;
      case "area_particles":
        this.createAreaParticles(context, effect, caster, primaryTarget);
        break;
      case "reveal":
        this.reveal(context, effect, caster, primaryTarget);
        break;
      case "burrow":
        this.burrow(context, effect, caster, primaryTarget);
        break;
      case "tame":
        this.tame(context, effect, caster, primaryTarget);
        break;
      case "calm":
        this.calm(context, effect, caster, primaryTarget);
        break;
      case "entangle":
        this.tangle(context, effect, caster, primaryTarget);
        break;
      case "terrain":
        this.modifyTerrain(context, effect, caster, primaryTarget);
        break;
      case "move":
        this.move(context, effect, caster, primaryTarget);
        break;
      case "plant":
        this.plant(context, effect, caster, primaryTarget);
        break;
      default:
        console.warn(`Abilities: Unknown effect type ${effect.type}`);
        throw new Error(`Unknown effect type: ${effect.type}`);
    }
  }
  resolveTarget(context, targetExpression, caster, primaryTarget) {
    if (!targetExpression)
      return primaryTarget;
    if (targetExpression === "self")
      return caster;
    if (targetExpression === "target")
      return primaryTarget;
    if (targetExpression === "self.pos")
      return caster.pos;
    if (targetExpression === "target.pos")
      return primaryTarget.pos || primaryTarget;
    if (typeof targetExpression === "object" && targetExpression !== null) {
      return targetExpression;
    }
    if (typeof targetExpression === "string") {
      try {
        const compiledFn = dslCompiler.compileWithCachedUnits(targetExpression, this.cachedAllUnits);
        return compiledFn(caster, context);
      } catch (error) {
        console.warn(`Failed to resolve target '${targetExpression}':`, error);
        return null;
      }
    }
    return targetExpression;
  }
  resolveValue(context, value, caster, target) {
    if (typeof value === "string") {
      try {
        const compiledFn = dslCompiler.compileWithCachedUnits(value, this.cachedAllUnits);
        return compiledFn(caster, context);
      } catch (error) {
        console.warn(`Failed to resolve DSL value '${value}':`, error);
        return value;
      }
    }
    if (typeof value !== "object")
      return value;
    if (value.$random) {
      if (Array.isArray(value.$random)) {
        return value.$random[Math.floor(context.getRandom() * value.$random.length)];
      } else if (value.$random.length === 2 && typeof value.$random[0] === "number") {
        const [min, max] = value.$random;
        return Math.floor(min + context.getRandom() * (max - min + 1));
      }
    }
    if (value.$conditional) {
      const condition = value.$conditional.if;
      try {
        const conditionStr = condition.replace(/target\./g, "");
        const targetForEval = target || caster;
        const hasTag = (tag) => targetForEval.tags?.includes(tag) || false;
        const isUndead = hasTag("undead");
        const isSpectral = hasTag("spectral");
        if (condition.includes("undead") && condition.includes("spectral")) {
          const conditionResult2 = isUndead || isSpectral;
          return conditionResult2 ? value.$conditional.then : value.$conditional.else;
        }
        const compiledCondition = dslCompiler.compileWithCachedUnits(condition, this.cachedAllUnits);
        const conditionResult = compiledCondition(caster, context);
        return conditionResult ? value.$conditional.then : value.$conditional.else;
      } catch (error) {
        console.warn(`Failed to evaluate conditional: ${condition}`, error);
        return value.$conditional.else || 0;
      }
    }
    return value;
  }
  hurt(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target, caster, primaryTarget);
    if (!target || !target.id)
      return;
    const amount = this.resolveValue(context, effect.amount, caster, target);
    const aspect = effect.aspect || "physical";
    this.commands.push({
      type: "damage",
      params: {
        targetId: target.id,
        amount,
        aspect
      },
      unitId: caster.id
    });
  }
  heal(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target, caster, primaryTarget);
    if (!target || !target.id)
      return;
    const amount = this.resolveValue(context, effect.amount, caster, target);
    const aspect = effect.aspect || "healing";
    this.commands.push({
      type: "heal",
      params: {
        targetId: target.id,
        amount,
        aspect
      },
      unitId: caster.id
    });
  }
  areaOfEffect(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target, caster, primaryTarget);
    if (!target)
      return;
    const pos = target.pos || target;
    const amount = this.resolveValue(context, effect.amount, caster, target);
    const radius = this.resolveValue(context, effect.radius, caster, target);
    const aspect = effect.aspect || "physical";
    this.commands.push({
      type: "aoe",
      params: {
        x: pos.x,
        y: pos.y,
        radius,
        damage: amount,
        type: aspect,
        stunDuration: this.resolveValue(context, effect.stunDuration, caster, target)
      },
      unitId: caster.id
    });
  }
  project(context, effect, caster, primaryTarget) {
    const startPos = this.resolveTarget(context, effect.pos || "self.pos", caster, primaryTarget);
    if (!startPos)
      return;
    const projectileType = effect.projectileType || effect.id || "bullet";
    const damage = this.resolveValue(context, effect.damage, caster, primaryTarget) || 0;
    const radius = this.resolveValue(context, effect.radius, caster, primaryTarget) || 1;
    const params = {
      x: startPos.x,
      y: startPos.y,
      projectileType,
      damage,
      radius,
      team: caster.team,
      z: this.resolveValue(context, effect.z, caster, primaryTarget)
    };
    if (effect.target) {
      const target = this.resolveTarget(context, effect.target, caster, primaryTarget);
      if (target) {
        const targetPos = target.pos || target;
        if (targetPos && typeof targetPos.x === "number" && typeof targetPos.y === "number") {
          params.targetX = targetPos.x;
          params.targetY = targetPos.y;
        }
      }
    } else if (primaryTarget && primaryTarget.pos) {
      params.targetX = primaryTarget.pos.x;
      params.targetY = primaryTarget.pos.y;
    }
    this.commands.push({
      type: "projectile",
      params,
      unitId: caster.id
    });
  }
  changeWeather(context, effect, caster, primaryTarget) {
    const weatherType = effect.weatherType || "rain";
    const duration = effect.duration || 60;
    const intensity = effect.intensity || 0.5;
    this.commands.push({
      type: "weather",
      params: {
        weatherType,
        duration,
        intensity
      },
      unitId: caster.id
    });
  }
  bolt(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "target", caster, primaryTarget);
    const params = {};
    if (target) {
      const pos = target.pos || target;
      params.x = pos.x;
      params.y = pos.y;
    }
    this.commands.push({
      type: "lightning",
      params,
      unitId: caster.id
    });
  }
  explode(context, effect, caster) {
    const radius = effect.meta?.radius || 2;
    const damage = effect.meta?.damage || caster.hp * 2;
    this.commands.push({
      type: "aoe",
      params: {
        x: caster.pos.x,
        y: caster.pos.y,
        radius,
        damage,
        type: "explosive"
      },
      unitId: caster.id
    });
    this.commands.push({
      type: "damage",
      params: {
        targetId: caster.id,
        amount: caster.hp + 100,
        damageType: "explosive"
      }
    });
  }
  leap(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "target", caster, primaryTarget);
    if (!target)
      return;
    const pos = target.pos || target;
    const height = this.resolveValue(context, effect.height, caster, target) || 5;
    const damage = this.resolveValue(context, effect.damage, caster, target) || 5;
    const radius = this.resolveValue(context, effect.radius, caster, target) || 3;
    this.commands.push({
      type: "jump",
      params: {
        targetX: pos.x,
        targetY: pos.y,
        height,
        damage,
        radius
      },
      unitId: caster.id
    });
  }
  adjustTemperature(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "target", caster, primaryTarget);
    if (!target)
      return;
    const pos = target.pos || target;
    const amount = this.resolveValue(context, effect.amount, caster, target) || 5;
    const radius = this.resolveValue(context, effect.radius, caster, target) || 1;
    this.commands.push({
      type: "temperature",
      params: {
        x: pos.x,
        y: pos.y,
        amount,
        radius
      },
      unitId: caster.id
    });
  }
  deploy(context, effect, caster, primaryTarget) {
    const constructType = this.resolveValue(context, effect.constructType, caster, primaryTarget) || "clanker";
    this.commands.push({
      type: "deploy",
      params: {
        unitType: constructType
      },
      unitId: caster.id
    });
    if (!caster.meta)
      caster.meta = {};
    if (!caster.meta.deployBotUses)
      caster.meta.deployBotUses = 0;
    caster.meta.deployBotUses++;
  }
  grapply(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "target", caster, primaryTarget);
    if (!target)
      return;
    const pos = target.pos || target;
    this.commands.push({
      type: "grapple",
      params: {
        x: pos.x,
        y: pos.y
      },
      unitId: caster.id
    });
  }
  pin(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "target", caster, primaryTarget);
    if (!target)
      return;
    const pos = target.pos || target;
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number")
      return;
    this.commands.push({
      type: "pin",
      params: {
        x: pos.x,
        y: pos.y
      },
      unitId: caster.id
    });
  }
  airdrop(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "self.pos", caster, primaryTarget);
    if (!target)
      return;
    let pos = target.pos || target;
    if (caster.sprite === "mechatronist") {
      if (pos.x !== undefined && pos.y !== undefined && !target.id) {
        pos = {
          x: (caster.pos.x + pos.x) / 2,
          y: (caster.pos.y + pos.y) / 2
        };
      } else if (target.id && target.team !== caster.team) {
        pos = {
          x: (caster.pos.x + target.pos.x) / 2,
          y: (caster.pos.y + target.pos.y) / 2
        };
      }
    }
    const unitType = effect.unit || "mechatron";
    this.commands.push({
      type: "airdrop",
      params: {
        unitType,
        x: pos.x,
        y: pos.y
      },
      unitId: caster.id
    });
  }
  buff(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "target", caster, primaryTarget);
    if (!target || !target.id)
      return;
    if (!target.meta)
      target.meta = {};
    if (effect.buff) {
      for (const [stat, value] of Object.entries(effect.buff)) {
        if (typeof value === "string" && value.startsWith("+")) {
          const increase = parseInt(value.substring(1));
          if (stat === "maxHp") {
            const oldMaxHp = target.maxHp || 0;
            this.commands.push({
              type: "heal",
              params: {
                targetId: target.id,
                amount: increase,
                newMaxHp: oldMaxHp + increase
              }
            });
            this.commands.push({
              type: "meta",
              params: {
                unitId: target.id,
                meta: {
                  maxHpBuffed: true,
                  maxHpBonus: increase
                }
              }
            });
          } else if (stat === "armor") {
            this.commands.push({
              type: "meta",
              params: {
                unitId: target.id,
                meta: {
                  ...target.meta,
                  armor: (target.meta.armor || 0) + increase
                }
              }
            });
          } else if (stat === "dmg") {
            this.commands.push({
              type: "meta",
              params: {
                unitId: target.id,
                dmg: (target.dmg || 0) + increase
              }
            });
          }
        } else {
          this.commands.push({
            type: "meta",
            params: {
              unitId: target.id,
              meta: {
                ...target.meta,
                [stat]: value
              }
            }
          });
        }
      }
    }
    if (effect.hpIncrease) {
      const increase = this.resolveValue(context, effect.hpIncrease, caster, target);
      target.hp = Math.min(target.maxHp, target.hp + increase);
    }
    if (effect.amount) {
      const amount = this.resolveValue(context, effect.amount, caster, target);
      target.hp = Math.min(target.maxHp, target.hp + amount);
    }
  }
  plant(context, effect, caster, primaryTarget) {
    const offsetX = effect.offsetX || 1;
    const offsetY = effect.offsetY || 0;
    context.queueCommand({
      type: "plant",
      unitId: caster.id,
      params: {
        offsetX,
        offsetY
      }
    });
  }
  summon(context, effect, caster, primaryTarget) {
    const unitType = this.resolveValue(context, effect.unit, caster, primaryTarget) || "squirrel";
    const pos = caster.pos;
    const summonedUnit = {
      ...Encyclopaedia.unit(unitType),
      id: `${unitType}_${caster.id}_${context.getCurrentTick()}`,
      pos: {
        x: pos.x + (context.getRandom() - 0.5) * 2,
        y: pos.y + (context.getRandom() - 0.5) * 2
      },
      team: caster.team,
      meta: {
        summoned: true,
        summonedBy: caster.id,
        summonTick: context.getCurrentTick()
      }
    };
    this.commands.push({
      type: "spawn",
      params: { unit: summonedUnit }
    });
  }
  adjustHumidity(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "target", caster, primaryTarget);
    if (!target)
      return;
    const pos = target.pos || target;
    const amount = this.resolveValue(context, effect.amount, caster, target) || 1;
    const radius = this.resolveValue(context, effect.radius, caster, target) || 5;
    context.queueEvent({
      kind: "moisture",
      source: caster.id,
      target: pos,
      meta: { amount, radius }
    });
  }
  toss(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "target", caster, primaryTarget);
    if (!target || !target.id)
      return;
    const distance = this.resolveValue(context, effect.distance, caster, target) || 5;
    this.commands.push({
      type: "toss",
      params: {
        targetId: target.id,
        distance
      },
      unitId: caster.id
    });
  }
  ignite(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "target", caster, primaryTarget);
    if (!target || !target.id)
      return;
    this.commands.push({
      type: "meta",
      params: {
        unitId: target.id,
        meta: {
          onFire: true,
          onFireDuration: 30
        }
      }
    });
  }
  move(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "target", caster, primaryTarget);
    if (!target)
      return;
    const pos = target.pos || target;
    const teleport2 = effect.teleport || false;
    if (teleport2) {
      this.commands.push({
        type: "teleport",
        params: {
          unitId: caster.id,
          x: pos.x,
          y: pos.y
        }
      });
    } else {
      this.commands.push({
        type: "move",
        params: {
          unitId: caster.id,
          dx: pos.x - caster.pos.x,
          dy: pos.y - caster.pos.y
        }
      });
    }
  }
  modifyTerrain(context, effect, caster, primaryTarget) {
    const pos = this.resolveTarget(context, effect.target || "self.pos", caster, primaryTarget);
    if (!pos)
      return;
    const terrainType = effect.terrainType;
    const radius = effect.radius || 1;
    const duration = effect.duration || 200;
    if (terrainType === "trench") {
      for (let dx = -radius;dx <= radius; dx++) {
        for (let dy = -radius;dy <= radius; dy++) {
          const x = Math.floor(pos.x + dx);
          const y = Math.floor(pos.y + dy);
          context.queueEvent({
            kind: "terrain",
            source: caster.id,
            target: { x, y },
            meta: {
              terrainType: "trench",
              duration,
              defenseBonus: 0.5,
              movementPenalty: 0.3
            }
          });
          for (let i = 0;i < 3; i++) {
            this.commands.push({
              type: "particle",
              params: {
                particle: {
                  pos: {
                    x: (x + context.getRandom()) * 8 + 4,
                    y: (y + context.getRandom()) * 8 + 4
                  },
                  vel: {
                    x: (context.getRandom() - 0.5) * 0.2,
                    y: -context.getRandom() * 0.3
                  },
                  radius: 0.5 + context.getRandom() * 0.5,
                  lifetime: 20 + context.getRandom() * 20,
                  color: "#8B4513",
                  type: "debris"
                }
              }
            });
          }
        }
      }
    }
  }
  tangle(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "target", caster, primaryTarget);
    if (!target)
      return;
    const duration = this.resolveValue(context, effect.duration, caster, target) || 30;
    const radius = this.resolveValue(context, effect.radius, caster, target) || 3;
    if (target.id) {
      this.commands.push({
        type: "meta",
        params: {
          unitId: target.id,
          meta: {
            pinned: true,
            pinDuration: duration,
            entangled: true
          }
        }
      });
      const particles = [];
      for (let i = 0;i < 8; i++) {
        particles.push({
          id: `entangle_${caster.id}_${context.getCurrentTick()}_${i}`,
          pos: {
            x: target.pos.x + (context.getRandom() - 0.5) * radius,
            y: target.pos.y + (context.getRandom() - 0.5) * radius
          },
          vel: { x: 0, y: 0 },
          lifetime: duration,
          color: "#228B22",
          type: "entangle",
          radius: 0.5
        });
      }
      for (const particle of particles) {
        this.commands.push({
          type: "particle",
          params: { particle }
        });
      }
    }
  }
  coneOfEffect(context, effect, caster, primaryTarget) {
    const direction = caster.facing || { x: 1, y: 0 };
    const range = effect.range || 4;
    const width = effect.width || 3;
    if (effect.effects) {
      for (const nestedEffect of effect.effects) {
        const unitsInCone = this.cachedAllUnits.filter((u) => {
          if (u.id === caster.id || u.team === caster.team)
            return false;
          const dist = Math.sqrt(Math.pow(u.pos.x - caster.pos.x, 2) + Math.pow(u.pos.y - caster.pos.y, 2));
          return dist <= (typeof range === "number" ? range : Number(range));
        });
        for (const unit of unitsInCone) {
          this.processEffectAsCommand(context, nestedEffect, caster, unit);
        }
      }
    }
  }
  multiproject(context, effect, caster, primaryTarget) {
    const count = this.resolveValue(context, effect.count, caster, primaryTarget) || 1;
    const stagger = this.resolveValue(context, effect.stagger, caster, primaryTarget) || 0;
    for (let i = 0;i < count; i++) {
      const projectileEffect = {
        type: "projectile",
        projectileType: effect.projectileType || "bullet",
        pos: effect.pos || "self.pos",
        target: effect.target,
        damage: effect.damage || effect.amount,
        radius: effect.radius,
        vel: effect.vel,
        z: effect.z,
        duration: effect.duration,
        spread: effect.spread,
        origin: effect.origin
      };
      if (stagger > 0 && i > 0) {}
      this.project(context, projectileEffect, caster, primaryTarget);
    }
  }
  lineOfEffect(context, effect, caster, primaryTarget) {
    const start = this.resolveTarget(context, effect.start || "self.pos", caster, primaryTarget);
    const end2 = this.resolveTarget(context, effect.end || "target", caster, primaryTarget);
    if (!start || !end2)
      return;
    const amount = this.resolveValue(context, effect.amount, caster, primaryTarget);
    const aspect = effect.aspect || "physical";
    const steps = 5;
    for (let i = 0;i <= steps; i++) {
      const t = i / steps;
      const x = start.x + (end2.x - start.x) * t;
      const y = start.y + (end2.y - start.y) * t;
      this.commands.push({
        type: "aoe",
        params: {
          x,
          y,
          radius: 1,
          damage: amount,
          type: aspect
        },
        unitId: caster.id
      });
    }
  }
  domainBuff(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "self.pos", caster, primaryTarget);
    if (!target)
      return;
    const pos = target.pos || target;
    const radius = this.resolveValue(context, effect.radius, caster, target) || 3;
    const allUnitsForSearch = this.cachedAllUnits;
    const unitsInArea = allUnitsForSearch.filter((u) => {
      const dist = Math.sqrt(Math.pow(u.pos.x - pos.x, 2) + Math.pow(u.pos.y - pos.y, 2));
      if (dist > radius)
        return false;
      if (effect.condition && typeof effect.condition === "string") {
        try {
          if (effect.condition === "target.tags.includes('mechanical')") {
            return u.tags?.includes("mechanical");
          }
          if (effect.condition === "target.tags.includes('construct')") {
            return u.tags?.includes("construct");
          }
          if (effect.condition.includes("mechanical")) {
            return u.tags?.includes("mechanical");
          }
          if (effect.condition.includes("construct")) {
            return u.tags?.includes("construct");
          }
          const safeUnit = { ...u, tags: u.tags || [] };
          const compiledCondition = dslCompiler.compileWithCachedUnits(effect.condition, this.cachedAllUnits);
          return compiledCondition(safeUnit, context);
        } catch (error) {
          console.warn(`Failed to evaluate condition '${effect.condition}':`, error);
          return false;
        }
      }
      return true;
    });
    for (const unit of unitsInArea) {
      if (effect.buff) {
        this.commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: effect.buff
          }
        });
        if (effect.buff.resetCooldowns && unit.lastAbilityTick) {
          const resetCooldowns = {};
          for (const abilityName in unit.lastAbilityTick) {
            resetCooldowns[abilityName] = 0;
          }
          this.commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              lastAbilityTick: resetCooldowns
            }
          });
        }
      }
    }
  }
  debuff(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "target", caster, primaryTarget);
    if (!target || !target.id)
      return;
    if (effect.debuff) {
      this.commands.push({
        type: "meta",
        params: {
          unitId: target.id,
          meta: effect.debuff
        }
      });
    }
  }
  cleanse(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "target", caster, primaryTarget);
    if (!target || !target.id)
      return;
    if (effect.effectsToRemove && target.meta) {
      for (const effectName of effect.effectsToRemove) {
        delete target.meta[effectName];
      }
    }
  }
  reveal(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "self.pos", caster, primaryTarget);
    if (!target)
      return;
    const pos = target.pos || target;
    const radius = effect.radius || 6;
    const unitsInArea = this.cachedAllUnits.filter((u) => {
      const dist = Math.sqrt(Math.pow(u.pos.x - pos.x, 2) + Math.pow(u.pos.y - pos.y, 2));
      return dist <= (typeof radius === "number" ? radius : Number(radius));
    });
    for (const unit of unitsInArea) {
      if (unit.meta.hidden || unit.meta.invisible) {
        this.commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              hidden: false,
              invisible: false,
              revealed: true
            }
          }
        });
      }
    }
  }
  burrow(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "self", caster, primaryTarget);
    if (!target)
      return;
    const duration = effect.duration || 15;
    if (!target.meta)
      target.meta = {};
    target.meta.burrowed = true;
    target.meta.invisible = true;
    target.meta.burrowDuration = duration;
    target.meta.burrowStartTick = context.getCurrentTick();
  }
  tame(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "target", caster, primaryTarget);
    if (!target || !target.id)
      return;
    const actualTarget = context.findUnitById(target.id);
    if (!actualTarget)
      return;
    if (caster.abilities?.includes("tameMegabeast") && actualTarget.mass < 10) {
      console.warn(`${caster.id} cannot tame ${actualTarget.id} - target mass ${actualTarget.mass} is too low (requires >= 10)`);
      return;
    }
    this.commands.push({
      type: "meta",
      params: {
        unitId: actualTarget.id,
        meta: {
          originalTeam: actualTarget.meta.originalTeam || actualTarget.team,
          tamed: true,
          tamedBy: caster.id
        }
      }
    });
    this.commands.push({
      type: "changeTeam",
      unitId: actualTarget.id,
      params: {
        team: caster.team
      }
    });
    for (let i = 0;i < 5; i++) {
      this.commands.push({
        type: "particle",
        params: {
          particle: {
            pos: {
              x: (actualTarget.pos.x + (context.getRandom() - 0.5) * 2) * 8 + 4,
              y: (actualTarget.pos.y + (context.getRandom() - 0.5) * 2) * 8 + 4
            },
            vel: { x: 0, y: -0.1 },
            radius: 0.3,
            lifetime: 20,
            color: "#90EE90",
            type: "tame"
          }
        }
      });
    }
  }
  calm(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.target || "self.pos", caster, primaryTarget);
    if (!target)
      return;
    const pos = target.pos || target;
    const radius = this.resolveValue(context, effect.radius, caster, primaryTarget) || 5;
    const beastSprites = [
      "bear",
      "owl",
      "wolf",
      "fox",
      "deer",
      "rabbit",
      "squirrel",
      "bird"
    ];
    const unitsInArea = this.cachedAllUnits.filter((u) => {
      const dist = Math.sqrt(Math.pow(u.pos.x - pos.x, 2) + Math.pow(u.pos.y - pos.y, 2));
      return dist <= radius && (u.tags?.includes("animal") || u.tags?.includes("beast") || beastSprites.includes(u.sprite));
    });
    for (const unit of unitsInArea) {
      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            calmed: true,
            aggressive: false
          }
        }
      });
      this.commands.push({
        type: "halt",
        params: { unitId: unit.id }
      });
      const particleId = `calm_${unit.id}`;
      if (!unit.meta.calmed && !context.getParticles().some((p) => p.id === particleId)) {
        this.commands.push({
          type: "particle",
          params: {
            particle: {
              pos: { x: unit.pos.x * 8 + 4, y: (unit.pos.y - 0.5) * 8 + 4 },
              vel: { x: 0, y: -0.05 },
              radius: 1,
              lifetime: 30,
              color: "#ADD8E6",
              type: "calm"
            }
          }
        });
      }
    }
  }
  createAreaParticles(context, effect, caster, primaryTarget) {
    const center = this.resolveTarget(context, effect.center || "self.pos", caster, primaryTarget);
    if (!center)
      return;
    const centerPos = center.pos || center;
    const size = String(effect.size || "3x3");
    const [width, height] = size.split("x").map((s) => parseInt(s));
    const particleType = effect.particleType || "energy";
    const color = effect.color || "#00CCFF";
    const lifetime = effect.lifetime || 80;
    for (let dx = -Math.floor(width / 2);dx <= Math.floor(width / 2); dx++) {
      for (let dy = -Math.floor(height / 2);dy <= Math.floor(height / 2); dy++) {
        this.commands.push({
          type: "particle",
          params: {
            particle: {
              pos: {
                x: (centerPos.x + dx) * 8 + 4,
                y: (centerPos.y + dy) * 8 + 4
              },
              vel: { x: 0, y: -0.1 },
              radius: 2,
              color,
              lifetime,
              type: particleType
            }
          }
        });
      }
    }
  }
  createParticles(context, effect, caster, primaryTarget) {
    const target = this.resolveTarget(context, effect.pos || effect.target || "self.pos", caster, primaryTarget);
    if (!target)
      return;
    const pos = target.pos || target;
    const color = effect.color || "#FFFFFF";
    const lifetime = this.resolveValue(context, effect.lifetime, caster, target) || 20;
    const count = this.resolveValue(context, effect.count, caster, target) || 5;
    for (let i = 0;i < count; i++) {
      this.commands.push({
        type: "particle",
        params: {
          particle: {
            pos: {
              x: (pos.x + (context.getRandom() - 0.5) * 2) * 8 + 4,
              y: (pos.y + (context.getRandom() - 0.5) * 2) * 8 + 4
            },
            vel: {
              x: (context.getRandom() - 0.5) * 0.2,
              y: (context.getRandom() - 0.5) * 0.2
            },
            radius: 1,
            lifetime: lifetime + context.getRandom() * 10,
            color,
            type: effect.particleType || "generic"
          }
        }
      });
    }
  }
}

// src/rules/ranged_combat.ts
init_rule();

class RangedCombat extends Rule {
  execute(context) {
    const commands = [];
    const currentTick = context.getCurrentTick();
    const arrays = context.getArrays();
    if (!arrays) {
      return this.executeWithProxies(context);
    }
    const { posX, posY, team, state, hp, unitIds, activeIndices } = arrays;
    for (const idx of activeIndices) {
      if (state[idx] === 5 || hp[idx] <= 0)
        continue;
      const unitId = unitIds[idx];
      const coldData = context.getUnitColdData(unitId);
      if (!coldData)
        continue;
      const abilities = coldData.abilities;
      if (!abilities || !Array.isArray(abilities) || !abilities.includes("ranged"))
        continue;
      const lastTick = coldData.lastAbilityTick?.ranged;
      if (lastTick !== undefined && currentTick - lastTick < 6)
        continue;
      const unitTeam = team[idx];
      const unitX = posX[idx];
      const unitY = posY[idx];
      let closestEnemyIdx = -1;
      let minDistSq = 36;
      for (const enemyIdx of activeIndices) {
        if (enemyIdx === idx)
          continue;
        if (state[enemyIdx] === 5 || hp[enemyIdx] <= 0)
          continue;
        if (team[enemyIdx] === unitTeam)
          continue;
        const absDx = Math.abs(posX[enemyIdx] - unitX);
        const absDy = Math.abs(posY[enemyIdx] - unitY);
        if (absDx > 6 || absDy > 6)
          continue;
        const dx2 = posX[enemyIdx] - unitX;
        const dy2 = posY[enemyIdx] - unitY;
        const distSq = dx2 * dx2 + dy2 * dy2;
        if (distSq <= 4 || distSq > 36)
          continue;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          closestEnemyIdx = enemyIdx;
          if (distSq <= 9)
            break;
        }
      }
      if (closestEnemyIdx === -1)
        continue;
      const enemyX = posX[closestEnemyIdx];
      const enemyY = posY[closestEnemyIdx];
      const dx = enemyX - unitX;
      const dy = enemyY - unitY;
      const norm = Math.sqrt(dx * dx + dy * dy);
      const vx = dx / norm * 2;
      const vy = dy / norm * 2;
      commands.push({
        type: "projectile",
        params: {
          x: unitX,
          y: unitY,
          vx,
          vy,
          projectileType: "bullet",
          damage: 4,
          radius: 1.5,
          team: unitTeam === 1 ? "friendly" : unitTeam === 2 ? "hostile" : "neutral"
        },
        unitId: unitIds[idx]
      });
      commands.push({
        type: "meta",
        params: {
          unitId: unitIds[idx],
          meta: {
            lastAbilityTick: {
              ...coldData.lastAbilityTick || {},
              ranged: currentTick
            }
          }
        }
      });
    }
    return commands;
  }
  executeWithProxies(context) {
    const commands = [];
    const currentTick = context.getCurrentTick();
    const allUnits = context.getAllUnits();
    for (const unit of allUnits) {
      if (unit.state === "dead" || unit.hp <= 0)
        continue;
      if (!unit.abilities?.includes("ranged"))
        continue;
      const lastTick = unit.lastAbilityTick?.ranged;
      if (lastTick !== undefined && currentTick - lastTick < 6)
        continue;
      let closestEnemy = null;
      let minDist = Infinity;
      for (const other of allUnits) {
        if (other.state === "dead" || other.hp <= 0)
          continue;
        if (other.team === unit.team)
          continue;
        const absDx = Math.abs(other.pos.x - unit.pos.x);
        const absDy = Math.abs(other.pos.y - unit.pos.y);
        if (absDx > 6 || absDy > 6)
          continue;
        const dx2 = other.pos.x - unit.pos.x;
        const dy2 = other.pos.y - unit.pos.y;
        const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (dist < minDist) {
          minDist = dist;
          closestEnemy = other;
          if (dist <= 3)
            break;
        }
      }
      if (!closestEnemy || minDist <= 2 || minDist > 6)
        continue;
      const dx = closestEnemy.pos.x - unit.pos.x;
      const dy = closestEnemy.pos.y - unit.pos.y;
      const norm = Math.sqrt(dx * dx + dy * dy);
      commands.push({
        type: "projectile",
        params: {
          x: unit.pos.x,
          y: unit.pos.y,
          vx: dx / norm * 2,
          vy: dy / norm * 2,
          projectileType: "bullet",
          damage: 4,
          radius: 1.5,
          team: unit.team
        },
        unitId: unit.id
      });
      commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            lastAbilityTick: {
              ...unit.lastAbilityTick || {},
              ranged: currentTick
            }
          }
        }
      });
    }
    return commands;
  }
}

// src/rules/event_handler.ts
init_rule();

class EventHandler extends Rule {
  constructor() {
    super();
  }
  glossary = (event, context) => {
    let targetUnit = context.findUnitById(event.target);
    let tx = {
      aoe: (e) => {
        const type = e.meta.aspect === "heal" ? "Healing circle" : "Impact";
        return `${type} from ${e.source} at (${e.target.x}, ${e.target.y}) with radius ${e.meta.radius}`;
      },
      damage: (e) => {
        const origin = e.meta?.origin ? ` from (${e.meta.origin.x}, ${e.meta.origin.y})` : "";
        return `${e.source} hit ${e.target} for ${e.meta.amount} ${e.meta.aspect} damage${origin} (now at ${targetUnit?.hp} hp)`;
      },
      heal: (e) => `${e.source} healed ${e.target} for ${e.meta.amount} (now at ${targetUnit?.hp} hp)`,
      terrain: (e) => `${e.source} formed ${e.meta.terrainType} at (${e.target?.x}, ${e.target?.y})`,
      particle: (e) => `${e.source} created a particle effect at (${e.target?.x}, ${e.target?.y})`,
      moisture: (e) => `${e.source} changed moisture at (${e.target?.x}, ${e.target?.y}) by ${e.meta.amount}`,
      spawn: (e) => `${e.source} spawned a unit at (${e.target?.x}, ${e.target?.y})`
    };
    if (!tx.hasOwnProperty(event.kind)) {
      return `Event: ${event.kind} from ${event.source} to ${event.target}`;
    }
    return tx[event.kind](event);
  };
  execute(context) {
    const commands = [];
    const queuedEvents = context.getQueuedEvents();
    if (queuedEvents.length === 0) {
      return commands;
    }
    for (const event of queuedEvents) {
      if (event._processed) {
        continue;
      }
      event._processed = true;
      if (typeof process !== "undefined" && process.env?.DEBUG_EVENTS || global.DEBUG_EVENTS) {
        console.log(this.glossary(event, context));
      }
      switch (event.kind) {
        case "aoe":
          this.handleAreaOfEffect(event, context, commands);
          break;
        case "damage":
          this.handleDamage(event, context, commands);
          break;
        case "heal":
          this.handleHeal(event, context, commands);
          break;
        case "knockback":
          this.handleKnockback(event, context, commands);
          break;
        case "spawn":
          this.handleSpawn(event, context, commands);
          break;
        case "terrain":
          this.handleTerrain(event, context, commands);
          break;
        case "particle":
          break;
        case "moisture":
          break;
        default:
          console.warn(`Unknown event kind: ${event.kind}`);
      }
    }
    return commands;
  }
  handleSpawn(event, context, commands) {
    if (!event.target || typeof event.target !== "object" || !(("x" in event.target) && ("y" in event.target))) {
      console.warn(`Invalid target for spawn event: ${event.target}`);
      return;
    }
    if (!event.meta.unit) {
      console.warn("Spawn event missing unit data");
      return;
    }
    const newUnit = {
      ...event.meta.unit,
      pos: { x: event.target.x, y: event.target.y },
      id: event.meta.unit?.id || `spawned_${Date.now()}`
    };
    commands.push({
      type: "spawn",
      params: { unit: newUnit }
    });
  }
  handleParticle(event, context, commands) {
    if (!event.meta)
      return;
    if (!event.meta.pos || !event.meta.vel) {
      console.error("Particle event missing pos or vel:", event);
      return;
    }
    commands.push({
      type: "particle",
      params: { particle: event.meta }
    });
  }
  handleAreaOfEffect(event, context, commands) {
    if (!event.target || typeof event.target !== "object" || !(("x" in event.target) && ("y" in event.target))) {
      console.warn(`Invalid target for AoE event: ${event.target}`);
      return;
    }
    let target = event.target;
    target.x = Math.round(target.x);
    target.y = Math.round(target.y);
    let sourceUnit = context.findUnitById(event.source);
    const isHealing = event.meta.aspect === "heal";
    const isEmp = event.meta.aspect === "emp";
    const isChill = event.meta.aspect === "chill";
    const affectedUnits = context.getAllUnits().filter((unit) => {
      const dx = unit.pos.x - target.x;
      const dy = unit.pos.y - target.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const inRange = distance <= (event.meta.radius || 5);
      if (isHealing) {
        return inRange && unit.team === sourceUnit?.team && unit.hp < unit.maxHp;
      } else if (isEmp) {
        const mechanicalImmune = event.meta.mechanicalImmune && unit.tags?.includes("mechanical");
        return inRange && !mechanicalImmune;
      } else if (isChill) {
        return inRange && unit.team !== sourceUnit?.team;
      } else {
        const friendlyFire = event.meta.friendlyFire !== false;
        if (!friendlyFire) {
          return inRange && sourceUnit && unit.team !== sourceUnit.team;
        } else {
          return inRange && unit.id !== event.source;
        }
      }
    });
    for (const unit of affectedUnits) {
      const distance = Math.sqrt(Math.pow(unit.pos.x - target.x, 2) + Math.pow(unit.pos.y - target.y, 2));
      if (isEmp) {
        commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              stunned: true,
              stunDuration: event.meta.stunDuration || 20
            }
          }
        });
        commands.push({
          type: "particle",
          params: {
            particle: {
              pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
              vel: { x: 0, y: -0.3 },
              radius: 2,
              color: "#FFFF88",
              lifetime: 25,
              type: "electric_spark"
            }
          }
        });
      } else if (isChill) {
        commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              chilled: true,
              chillIntensity: 0.5,
              chillDuration: event.meta.duration || 30
            }
          }
        });
      } else if (isHealing) {
        context.queueEvent({
          kind: "heal",
          source: event.source,
          target: unit.id,
          meta: {
            amount: event.meta.amount || 10,
            aspect: "magic",
            origin: event.target
          }
        });
      } else {
        const falloff = event.meta.falloff !== false;
        const maxRadius = event.meta.radius || 5;
        const damageMultiplier = falloff ? Math.max(0.3, 1 - distance / maxRadius * 0.5) : 1;
        const damage = Math.floor((event.meta.amount || 10) * damageMultiplier);
        if (damage > 0) {
          commands.push({
            type: "damage",
            params: {
              targetId: unit.id,
              amount: damage,
              aspect: event.meta.aspect || "explosion",
              sourceId: event.source,
              origin: event.target
            }
          });
        }
        if (event.meta.force && sourceUnit) {
          const massDiff = (sourceUnit.mass || 1) - (unit.mass || 1);
          if (massDiff >= 3) {
            const dx = unit.pos.x - target.x;
            const dy = unit.pos.y - target.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              const direction = { x: dx / dist, y: dy / dist };
              commands.push({
                type: "toss",
                unitId: unit.id,
                params: {
                  direction,
                  force: event.meta.force,
                  distance: Math.min(3, event.meta.force / 2)
                }
              });
            }
          }
        }
      }
    }
    const particleCount = isHealing ? 12 : 20;
    const particleColor = isHealing ? "#88FF88" : isEmp ? "#FFFF88" : isChill ? "#88DDFF" : "#FF8844";
    for (let i = 0;i < particleCount; i++) {
      const angle = i / particleCount * Math.PI * 2;
      const speed = isHealing ? 0.5 : 1.5;
      commands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: target.x * 8 + 4, y: target.y * 8 + 4 },
            vel: {
              x: Math.cos(angle) * speed,
              y: Math.sin(angle) * speed
            },
            radius: 2,
            color: particleColor,
            lifetime: 25,
            type: isHealing ? "heal_particle" : "explosion"
          }
        }
      });
    }
  }
  handleDamage(event, context, commands) {
    if (!event.target || !event.meta?.amount) {
      return;
    }
    const targetUnit = context.findUnitById(event.target);
    if (!targetUnit) {
      return;
    }
    commands.push({
      type: "damage",
      params: {
        targetId: targetUnit.id,
        amount: event.meta.amount,
        aspect: event.meta.aspect || "physical",
        sourceId: event.source,
        origin: event.meta.origin
      }
    });
    const origin = event.meta.origin || targetUnit.pos;
    const aspect = event.meta.aspect || "physical";
    for (let i = 0;i < 5; i++) {
      commands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: targetUnit.pos.x * 8 + 4, y: targetUnit.pos.y * 8 + 4 },
            vel: {
              x: (context.getRandom() - 0.5) * 2,
              y: -context.getRandom() * 2
            },
            radius: 1.5,
            color: aspect === "fire" ? "#FF6644" : "#FF4444",
            lifetime: 15,
            type: "damage"
          }
        }
      });
    }
  }
  handleHeal(event, context, commands) {
    if (!event.target || !event.meta?.amount) {
      return;
    }
    const targetUnit = context.findUnitById(event.target);
    if (!targetUnit) {
      return;
    }
    commands.push({
      type: "heal",
      params: {
        targetId: targetUnit.id,
        amount: event.meta.amount
      }
    });
    for (let i = 0;i < 8; i++) {
      const angle = i / 8 * Math.PI * 2;
      commands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: targetUnit.pos.x * 8 + 4, y: targetUnit.pos.y * 8 + 4 },
            vel: {
              x: Math.cos(angle) * 0.3,
              y: Math.sin(angle) * 0.3 - 0.5
            },
            radius: 1.5,
            color: "#88FF88",
            lifetime: 20,
            type: "heal"
          }
        }
      });
    }
  }
  handleKnockback(event, context, commands) {
    if (!event.target || !event.meta?.direction) {
      return;
    }
    const targetUnit = context.findUnitById(event.target);
    if (!targetUnit) {
      return;
    }
    const force = event.meta.force || 5;
    const direction = event.meta.direction;
    commands.push({
      type: "knockback",
      params: {
        unitId: targetUnit.id,
        direction,
        force
      }
    });
  }
  handleTerrain(event, context, commands) {
    if (event.meta?.terrainType) {}
  }
}

// src/rules/command.ts
class Command {
  sim;
  tx;
  constructor(sim, tx) {
    this.sim = sim;
    this.tx = tx;
  }
}

// src/commands/toss.ts
class Toss extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  execute(unitId, params) {
    const targetId = params.targetId || unitId;
    if (!targetId) {
      console.warn(`No target specified for toss command`);
      return;
    }
    const unit = this.sim.units.find((u) => u.id === targetId);
    if (!unit) {
      return;
    }
    let direction = params.direction;
    const force = params.force ?? 5;
    const distance = params.distance ?? 3;
    if (!direction && unitId && targetId !== unitId) {
      const caster = this.sim.units.find((u) => u.id === unitId);
      if (caster) {
        const dx = unit.pos.x - caster.pos.x;
        const dy = unit.pos.y - caster.pos.y;
        const mag = Math.sqrt(dx * dx + dy * dy) || 1;
        direction = { x: dx / mag, y: dy / mag };
      }
    }
    if (!direction) {
      direction = { x: 1, y: 0 };
    }
    if (unit.state === "dead") {
      return;
    }
    const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y) || 1;
    const normalizedDir = {
      x: direction.x / magnitude,
      y: direction.y / magnitude
    };
    const tossDistance = Math.min(distance, force);
    const targetX = Math.round(unit.pos.x + normalizedDir.x * tossDistance);
    const targetY = Math.round(unit.pos.y + normalizedDir.y * tossDistance);
    const clampedTargetX = Math.max(0, Math.min(this.sim.fieldWidth - 1, targetX));
    const clampedTargetY = Math.max(0, Math.min(this.sim.fieldHeight - 1, targetY));
    this.transform.updateUnit(unit.id, {
      meta: {
        ...unit.meta,
        tossing: true,
        tossProgress: 0,
        tossOrigin: { x: unit.pos.x, y: unit.pos.y },
        tossTarget: { x: clampedTargetX, y: clampedTargetY },
        tossForce: force,
        z: 0
      }
    });
  }
}

// src/commands/change_weather.ts
class ChangeWeather extends Command {
  execute(_unitId, params) {
    const weatherType = params.weatherType;
    const duration = params.duration;
    const intensity = params.intensity;
    const durationValue = duration ?? 80;
    const intensityValue = intensity ?? 0.8;
    switch (weatherType) {
      case "rain":
        if (this.sim.setWeather) {
          this.sim.setWeather("rain", durationValue, intensityValue);
        }
        for (let i = 0;i < Math.min(durationValue, 100); i++) {
          this.sim.particleArrays.addParticle({
            id: `rain_${Date.now()}_${i}`,
            type: "rain",
            pos: {
              x: Simulator.rng.random() * this.sim.fieldWidth * 8,
              y: Simulator.rng.random() * 10
            },
            vel: { x: 0, y: 1 + Simulator.rng.random() * 2 },
            radius: 1,
            color: "#4444FF",
            lifetime: 100
          });
        }
        break;
      case "winter":
      case "snow":
        if (this.sim.temperatureField) {
          for (let x = 0;x < this.sim.fieldWidth; x++) {
            for (let y = 0;y < this.sim.fieldHeight; y++) {
              const currentTemp = this.sim.temperatureField.get(x, y);
              this.sim.temperatureField.set(x, y, Math.max(-5, currentTemp - 15));
            }
          }
          this.sim.weather.current = "snow";
        }
        break;
      case "sand":
      case "sandstorm":
        if (this.sim.setWeather) {
          this.sim.setWeather("sandstorm", durationValue, intensityValue);
        }
        for (let i = 0;i < Math.min(durationValue, 200); i++) {
          this.sim.particleArrays.addParticle({
            id: `sand_${Date.now()}_${i}`,
            type: "sand",
            pos: {
              x: -5 + Simulator.rng.random() * (this.sim.fieldWidth + 10) * 8,
              y: Simulator.rng.random() * this.sim.fieldHeight * 8
            },
            vel: {
              x: 2 + Simulator.rng.random() * 3,
              y: (Simulator.rng.random() - 0.5) * 0.5
            },
            radius: 0.5 + Simulator.rng.random() * 0.5,
            color: "#CCAA66",
            lifetime: 100 + Simulator.rng.random() * 50
          });
        }
        let biomeRule = this.sim.rulebook?.find((r) => r.constructor.name === "BiomeEffects");
        if (biomeRule && biomeRule.triggerSandstorm) {
          biomeRule.triggerSandstorm(durationValue, intensityValue);
        }
        break;
      case "leaves":
      case "leaf":
        if (this.sim.setWeather) {
          this.sim.setWeather("leaves", durationValue, intensityValue);
        }
        const particleCount = Math.min(durationValue * 2, 30);
        for (let i = 0;i < particleCount; i++) {
          this.sim.particleArrays.addParticle({
            id: `leaf_${Date.now()}_${i}`,
            type: "leaf",
            pos: {
              x: Simulator.rng.random() * this.sim.fieldWidth * 8,
              y: -Simulator.rng.random() * 20
            },
            vel: {
              x: Simulator.rng.random() * 0.5 - 0.25,
              y: 0.2 + Simulator.rng.random() * 0.2
            },
            z: 10 + Simulator.rng.random() * 30,
            lifetime: 300 + Simulator.rng.random() * 200,
            radius: 1,
            color: "#88AA44"
          });
        }
        this.sim.weather.current = "leaves";
        break;
      case "clear":
        if (this.sim.setWeather) {
          this.sim.setWeather("clear", 1, 0);
        }
        if (this.sim.temperatureField) {
          for (let x = 0;x < this.sim.fieldWidth; x++) {
            for (let y = 0;y < this.sim.fieldHeight; y++) {
              const currentTemp = this.sim.temperatureField.get(x, y);
              this.sim.temperatureField.set(x, y, Math.min(20, currentTemp + 10));
            }
          }
          this.sim.weather.current = "clear";
        }
        break;
      default:
        console.warn(`Unknown weather type: ${weatherType}`);
    }
  }
}

// src/commands/deploy.ts
class Deploy extends Command {
  execute(unitId, params) {
    const unitType = params.unitType;
    const x = params.x;
    const y = params.y;
    const team = params.team;
    let deployX, deployY;
    if (x !== undefined && y !== undefined) {
      deployX = x;
      deployY = y;
    } else if (unitId) {
      const deployerUnit = this.sim.units.find((u) => u.id === unitId);
      if (deployerUnit) {
        const enemies = this.sim.units.filter((u) => u.team !== deployerUnit.team && u.hp > 0);
        if (enemies.length > 0) {
          const closestEnemy = enemies.reduce((closest, enemy) => {
            const dist1 = Math.sqrt(Math.pow(deployerUnit.pos.x - enemy.pos.x, 2) + Math.pow(deployerUnit.pos.y - enemy.pos.y, 2));
            const dist2 = Math.sqrt(Math.pow(deployerUnit.pos.x - closest.pos.x, 2) + Math.pow(deployerUnit.pos.y - closest.pos.y, 2));
            return dist1 < dist2 ? enemy : closest;
          });
          deployX = Math.floor((deployerUnit.pos.x + closestEnemy.pos.x) / 2);
          deployY = Math.floor((deployerUnit.pos.y + closestEnemy.pos.y) / 2);
        } else {
          deployX = deployerUnit.pos.x + 1;
          deployY = deployerUnit.pos.y;
        }
      } else {
        console.warn(`Deploy command: unit ${unitId} not found`);
        return;
      }
    } else {
      deployX = Math.floor(Simulator.rng.random() * this.sim.fieldWidth);
      deployY = Math.floor(Simulator.rng.random() * this.sim.fieldHeight);
    }
    try {
      const unit = Encyclopaedia.unit(unitType);
      this.sim.queuedEvents.push({
        kind: "spawn",
        source: unitId || "system",
        target: { x: deployX, y: deployY },
        meta: {
          unit: { ...unit, team: team || "friendly" }
        }
      });
    } catch (error) {
      console.error(`Deploy command failed: Unknown unit type '${unitType}'`);
    }
  }
}

// src/commands/airdrop.ts
class Airdrop extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform;
  }
  execute(unitId, params) {
    const unitType = params.unitType;
    const x = params.x;
    const y = params.y;
    let dropX, dropY;
    if (x !== undefined && y !== undefined) {
      dropX = x;
      dropY = y;
    } else {
      dropX = Math.floor(this.sim.fieldWidth / 2);
      dropY = Math.floor(this.sim.fieldHeight / 2);
    }
    dropX = Math.max(0, Math.min(this.sim.fieldWidth - 1, dropX));
    dropY = Math.max(0, Math.min(this.sim.fieldHeight - 1, dropY));
    try {
      const unit = Encyclopaedia.unit(unitType);
      const droppedUnit = {
        ...unit,
        team: "friendly",
        pos: { x: dropX, y: dropY },
        meta: {
          ...unit.meta,
          z: 20,
          dropping: true,
          dropSpeed: 0.8,
          landingImpact: true
        }
      };
      if (this.transform) {
        this.transform.addUnit(droppedUnit);
      } else {
        this.sim.addUnit(droppedUnit);
      }
      this.createAtmosphericEntry(dropX, dropY);
    } catch (error) {
      console.error(`Airdrop failed: Unknown unit type '${unitType}'`);
    }
  }
  createAtmosphericEntry(x, y) {
    for (let i = 0;i < 12; i++) {
      this.sim.particleArrays.addParticle({
        pos: {
          x: x + (Simulator.rng.random() - 0.5) * 3,
          y: Simulator.rng.random() * 10
        },
        vel: { x: (Simulator.rng.random() - 0.5) * 0.3, y: 0.6 },
        radius: 1.5 + Simulator.rng.random(),
        lifetime: 40 + Simulator.rng.random() * 20,
        color: "#666666",
        z: 15 + Simulator.rng.random() * 5,
        type: "debris",
        landed: false
      });
    }
    this.sim.queuedEvents.push({
      kind: "aoe",
      source: "airdrop",
      target: { x, y },
      meta: {
        aspect: "warning",
        radius: 6,
        amount: 0,
        duration: 25
      }
    });
  }
}

// src/commands/bolt.ts
class BoltCommand extends Command {
  execute(unitId, params) {
    const x = params.x;
    const y = params.y;
    const strikePos = x !== undefined && y !== undefined ? { x, y } : {
      x: Math.floor(Math.random() * this.sim.fieldWidth),
      y: Math.floor(Math.random() * this.sim.fieldHeight)
    };
    const pixelX = strikePos.x * 8 + 4;
    const pixelY = strikePos.y * 8 + 4;
    for (let i = 0;i < 8; i++) {
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: pixelX + (Math.random() - 0.5) * 3, y: pixelY - i * 4 },
            vel: { x: 0, y: 0 },
            radius: 1 + Math.random() * 2,
            color: i < 2 ? "#FFFFFF" : i < 4 ? "#CCCCFF" : "#8888FF",
            lifetime: 8 + Math.random() * 4,
            type: "lightning"
          }
        }
      });
    }
    for (let branch = 0;branch < 4; branch++) {
      const branchAngle = Math.random() * Math.PI * 2;
      const branchLength = 2 + Math.random() * 3;
      for (let i = 0;i < branchLength; i++) {
        this.sim.queuedCommands.push({
          type: "particle",
          params: {
            particle: {
              pos: {
                x: pixelX + Math.cos(branchAngle) * i * 8,
                y: pixelY + Math.sin(branchAngle) * i * 8
              },
              vel: { x: 0, y: 0 },
              radius: 0.5 + Math.random(),
              color: "#AAAAFF",
              lifetime: 6 + Math.random() * 3,
              type: "lightning_branch"
            }
          }
        });
      }
    }
    for (let i = 0;i < 12; i++) {
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: pixelX, y: pixelY },
            vel: {
              x: (Math.random() - 0.5) * 2,
              y: (Math.random() - 0.5) * 2
            },
            radius: 0.5,
            color: "#CCCCFF",
            lifetime: 15 + Math.random() * 10,
            type: "electric_spark"
          }
        }
      });
    }
    this.sim.queuedEvents.push({
      kind: "aoe",
      source: "lightning",
      target: strikePos,
      meta: {
        aspect: "emp",
        radius: 3,
        stunDuration: 20,
        amount: 0,
        mechanicalImmune: true
      }
    });
    for (let i = 0;i < 16; i++) {
      const angle = i / 16 * Math.PI * 2;
      const radius = 2 + Math.random();
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: pixelX, y: pixelY },
            vel: {
              x: Math.cos(angle) * 0.5,
              y: Math.sin(angle) * 0.5
            },
            radius,
            color: "#444488",
            lifetime: 20 + Math.random() * 15,
            type: "thunder_ring"
          }
        }
      });
    }
  }
}

// src/commands/storm.ts
class StormCommand extends Command {
  execute(unitId, params) {
    const action = params.action;
    if (action === "start") {
      this.sim.lightningActive = true;
      for (let i = 0;i < 8; i++) {
        this.sim.particleArrays.addParticle({
          pos: {
            x: Math.random() * this.sim.fieldWidth * 8,
            y: 100 + Math.random() * (this.sim.fieldHeight * 8 - 200)
          },
          vel: { x: (Math.random() - 0.5) * 0.2, y: 0 },
          radius: 0.5,
          color: "#333366",
          lifetime: 120 + Math.random() * 60,
          type: "storm_cloud"
        });
      }
    } else if (action === "stop") {
      this.sim.lightningActive = false;
    }
  }
}

// src/commands/grapple.ts
class Grapple extends Command {
  name = "grapple";
  description = "Fire grappling hook at target position or enemy";
  usage = "grapple <x> <y> - Fire grappling hook at position (x, y)";
  execute(unitId, params) {
    const targetX = params.x ?? params.targetX;
    const targetY = params.y ?? params.targetY;
    if (targetX === undefined || targetY === undefined) {
      console.error("Grapple command requires x and y coordinates");
      throw new Error("Grapple command requires x and y coordinates");
    }
    const grapplerID = unitId;
    if (typeof targetX !== "number" || typeof targetY !== "number" || isNaN(targetX) || isNaN(targetY)) {
      console.error("Invalid coordinates for grapple command");
      return;
    }
    let grappler = this.sim.units.find((u) => u.id === grapplerID);
    if (!grappler) {
      grappler = this.sim.units.find((u) => u.team === "friendly" && u.tags?.includes("grappler") && u.hp > 0);
    }
    if (!grappler) {
      console.error("No available grappler found for grapple command");
      return;
    }
    if (!grappler.abilities || !grappler.abilities.includes("grapplingHook")) {
      console.error(`${grappler.id} does not have grappling hook ability`);
      return;
    }
    const distance = Math.sqrt(Math.pow(targetX - grappler.pos.x, 2) + Math.pow(targetY - grappler.pos.y, 2));
    const maxRange = 8;
    if (distance > maxRange) {
      return;
    }
    if (unitId !== grapplerID) {
      const lastUsed = grappler.lastAbilityTick?.grapplingHook || 0;
      const cooldown = 30;
      const ticksSinceLastUse = this.sim.ticks - lastUsed;
      if (ticksSinceLastUse < cooldown) {
        const remainingCooldown = cooldown - ticksSinceLastUse;
        console.error(`Grappling hook is on cooldown for ${remainingCooldown} more ticks`);
        return;
      }
    }
    const targetPos = { x: targetX, y: targetY };
    const dx = targetPos.x - grappler.pos.x;
    const dy = targetPos.y - grappler.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 2;
    const vel = {
      x: dx / dist * speed,
      y: dy / dist * speed
    };
    this.sim.projectiles.push({
      id: `grapple_${grappler.id}_${this.sim.ticks}`,
      pos: { ...grappler.pos },
      vel,
      radius: 1.5,
      damage: 0,
      team: grappler.team,
      type: "grapple",
      sourceId: grappler.id,
      target: targetPos
    });
    this.sim.queuedCommands.push({
      type: "meta",
      params: {
        unitId: grappler.id,
        meta: {
          lastAbilityTick: {
            ...grappler.lastAbilityTick,
            grapplingHook: this.sim.ticks
          }
        }
      }
    });
  }
}

// src/commands/pin.ts
class Pin extends Command {
  name = "pin";
  description = "Reinforce grapple to fully pin target";
  usage = "pin <x> <y> - Reinforce grapple at position to create full pin";
  execute(unitId, params) {
    const targetX = params.x ?? params.targetX;
    const targetY = params.y ?? params.targetY;
    if (targetX === undefined || targetY === undefined) {
      return;
    }
    const grapplerID = unitId;
    if (typeof targetX !== "number" || typeof targetY !== "number" || isNaN(targetX) || isNaN(targetY)) {
      return;
    }
    let grappler = this.sim.units.find((u) => u.id === grapplerID);
    if (!grappler) {
      grappler = this.sim.units.find((u) => u.team === "friendly" && u.tags?.includes("grappler") && u.hp > 0);
    }
    if (!grappler) {
      return;
    }
    if (!grappler.abilities || !grappler.abilities.includes("pinTarget")) {
      return;
    }
    const target = this.sim.units.find((u) => u.pos.x === targetX && u.pos.y === targetY && u.team !== grappler.team);
    if (!target) {
      return;
    }
    if (!target.meta.grappled) {
      return;
    }
    if (target.meta.grappledBy !== grappler.id) {
      return;
    }
    const lastUsed = grappler.lastAbilityTick?.pinTarget || 0;
    const cooldown = 30;
    const ticksSinceLastUse = this.sim.ticks - lastUsed;
    if (ticksSinceLastUse < cooldown) {
      return;
    }
    const distance = Math.sqrt(Math.pow(targetX - grappler.pos.x, 2) + Math.pow(targetY - grappler.pos.y, 2));
    const maxRange = 8;
    if (distance > maxRange) {
      return;
    }
    this.sim.queuedCommands.push({
      type: "meta",
      params: {
        unitId: target.id,
        meta: {
          pinned: true,
          pinDuration: 50
        }
      }
    });
    for (let i = 0;i < 8; i++) {
      this.sim.particleArrays.addParticle({
        pos: { x: targetX * 8 + 4, y: targetY * 8 + 4 },
        vel: {
          x: (Simulator.rng.random() - 0.5) * 2,
          y: (Simulator.rng.random() - 0.5) * 2
        },
        radius: 0.5 + Simulator.rng.random() * 0.5,
        lifetime: 20 + Simulator.rng.random() * 10,
        color: "#FF6600",
        type: "pin"
      });
    }
    this.sim.queuedCommands.push({
      type: "meta",
      params: {
        unitId: grappler.id,
        meta: {
          lastAbilityTick: {
            ...grappler.lastAbilityTick,
            pinTarget: this.sim.ticks
          }
        }
      }
    });
  }
}

// src/commands/temperature.ts
class Temperature extends Command {
  name = "temperature";
  description = "Set the temperature across the battlefield";
  usage = "temperature <degrees> - Set temperature in Celsius";
  execute(_unitId, params) {
    const x = params.x;
    const y = params.y;
    const amount = params.amount ?? 20;
    const radius = params.radius ?? 3;
    if (typeof amount !== "number" || isNaN(amount)) {
      console.error("Invalid temperature value");
      return;
    }
    if (x !== undefined && y !== undefined) {
      for (let dx = -radius;dx <= radius; dx++) {
        for (let dy = -radius;dy <= radius; dy++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            const px = Math.round(x + dx);
            const py = Math.round(y + dy);
            if (px >= 0 && px < this.sim.fieldWidth && py >= 0 && py < this.sim.fieldHeight) {
              const falloff = 1 - dist / radius;
              const tempChange = amount * falloff;
              const currentTemp = this.sim.temperatureField.get(px, py);
              this.sim.temperatureField.set(px, py, currentTemp + tempChange);
            }
          }
        }
      }
    } else {
      for (let fx = 0;fx < this.sim.fieldWidth; fx++) {
        for (let fy = 0;fy < this.sim.fieldHeight; fy++) {
          const variation = (Simulator.rng.random() - 0.5) * 4;
          const finalTemp = amount + variation;
          this.sim.temperatureField.set(fx, fy, finalTemp);
        }
      }
    }
  }
}

// src/commands/damage.ts
class Damage extends Command {
  execute(unitId, params) {
    const targetId = params.targetId;
    const amount = params.amount;
    const aspect = params.aspect || "physical";
    const origin = params.origin;
    const target = this.sim.units.find((u) => u.id === targetId);
    if (!target) {
      return;
    }
    if (typeof amount !== "number" || isNaN(amount)) {
      return;
    }
    const transform = this.sim.getTransform();
    let finalDamage = amount;
    const perdurance = target.meta?.perdurance;
    if (perdurance) {
      if (perdurance === "spectral" && aspect === "physical") {
        return;
      }
      if (perdurance === "undead" && aspect === "physical") {
        return;
      }
      if (perdurance === "fiendish" && (aspect === "physical" || aspect === "fire")) {
        finalDamage = Math.floor(finalDamage * 0.5);
      }
      if (perdurance === "sturdiness") {
        finalDamage = 1;
      }
      if (perdurance === "swarm") {
        finalDamage = amount;
      }
    }
    const newHp = Math.max(0, target.hp - finalDamage);
    const damageTaken = target.meta?.segment ? finalDamage : undefined;
    transform.updateUnit(targetId, {
      hp: newHp,
      state: newHp <= 0 ? "dead" : target.state,
      meta: {
        ...target.meta,
        impactFrame: this.sim.ticks,
        damageTaken: damageTaken !== undefined ? damageTaken : target.meta?.damageTaken
      }
    });
    if (params.sourceId) {
      const sourceId = params.sourceId;
      const source = this.sim.units.find((u) => u.id === sourceId);
      if (source) {
        transform.updateUnit(sourceId, {
          meta: {
            ...source.meta,
            impactFrame: this.sim.ticks
          }
        });
      }
    }
  }
}

// src/commands/heal.ts
class Heal extends Command {
  execute(unitId, params) {
    const targetId = params.targetId;
    const amount = params.amount;
    const aspect = params.aspect || "healing";
    const newMaxHp = params.newMaxHp;
    if (typeof amount !== "number" || isNaN(amount)) {
      console.warn(`Heal command: invalid amount ${amount}`);
      return;
    }
    const transform = this.sim.getTransform();
    const target = this.sim.units.find((u) => u.id === targetId);
    if (!target) {
      console.warn(`Heal command: target ${targetId} not found`);
      return;
    }
    if (newMaxHp !== undefined) {
      transform.updateUnit(targetId, {
        maxHp: newMaxHp,
        hp: target.hp + amount
      });
    } else {
      const newHp = Math.min(target.hp + amount, target.maxHp);
      transform.updateUnit(targetId, {
        hp: newHp
      });
    }
  }
}

// src/commands/aoe.ts
class AoE extends Command {
  execute(unitId, params) {
    const x = params.x;
    const y = params.y;
    const radius = params.radius;
    const damage = params.damage;
    const type = params.type || "physical";
    const stunDuration = params.stunDuration;
    const center = { x, y };
    if (typeof radius !== "number" || isNaN(radius) || typeof damage !== "number" || isNaN(damage)) {
      console.warn(`AoE command: invalid radius ${radius} or damage ${damage}`);
      return;
    }
    const meta = {
      aspect: type,
      amount: damage,
      radius,
      origin: center
    };
    if (stunDuration !== undefined) {
      meta.stunDuration = stunDuration;
    }
    this.sim.queuedEvents.push({
      kind: "aoe",
      source: unitId,
      target: center,
      meta
    });
    const effectType = damage > 0 ? "damage" : "healing";
  }
}

// src/commands/projectile.ts
class Projectile extends Command {
  execute(unitId, params) {
    const x = params.x;
    const y = params.y;
    const projectileType = params.projectileType || "bullet";
    const damage = params.damage || 0;
    const targetX = params.targetX;
    const targetY = params.targetY;
    const radius = params.radius || 1;
    const team = params.team;
    const initialZ = params.z;
    const startPos = { x, y };
    const caster = unitId ? this.sim.units.find((u) => u.id === unitId) : null;
    const projectileTeam = team || caster?.team || "neutral";
    const projectile = {
      id: `projectile_${unitId}_${Date.now()}_${Simulator.rng.random().toString(36).substr(2, 9)}`,
      pos: startPos,
      vel: { x: 0, y: 0 },
      radius,
      damage,
      team: projectileTeam,
      type: projectileType,
      sourceId: unitId
    };
    if (targetX !== undefined && targetY !== undefined) {
      const targetPos = { x: targetX, y: targetY };
      if (projectileType === "bomb") {
        projectile.target = targetPos;
        projectile.origin = startPos;
        projectile.progress = 0;
        projectile.duration = 6;
        projectile.z = initialZ !== undefined ? initialZ : 0;
        projectile.aoeRadius = 3;
      } else {
        const dx = targetPos.x - startPos.x;
        const dy = targetPos.y - startPos.y;
        const mag = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 2;
        projectile.vel = { x: dx / mag * speed, y: dy / mag * speed };
      }
    } else {
      projectile.vel = { x: 1, y: 0 };
    }
    this.sim.projectiles.push(projectile);
  }
}

// src/core/transform.ts
class Transform {
  sim;
  constructor(simulator) {
    this.sim = simulator;
  }
  get units() {
    return this.sim.units;
  }
  getWorkingCopy() {
    return this.sim.units;
  }
  commit() {}
  filterUnits(fn) {
    const allUnits = this.sim.units;
    const unitsToRemove = allUnits.filter((u) => !fn(u));
    for (const unit of unitsToRemove) {
      this.sim.removeUnitById(unit.id);
    }
  }
  addUnit(unit) {
    this.sim.addUnit(unit);
  }
  removeUnit(unitId) {
    this.sim.removeUnitById(unitId);
  }
  updateUnit(unitId, changes) {
    const unit = this.sim.units.find((u) => u.id === unitId);
    if (!unit) {
      return;
    }
    this.sim.markDirty(unitId);
    const proxyManager = this.sim.getProxyManager();
    if (changes.pos !== undefined)
      proxyManager.setPosition(unitId, changes.pos);
    if (changes.intendedMove !== undefined)
      proxyManager.setIntendedMove(unitId, changes.intendedMove);
    if (changes.hp !== undefined)
      proxyManager.setHp(unitId, changes.hp);
    if (changes.maxHp !== undefined)
      proxyManager.setMaxHp(unitId, changes.maxHp);
    if (changes.team !== undefined)
      proxyManager.setTeam(unitId, changes.team);
    if (changes.state !== undefined)
      proxyManager.setState(unitId, changes.state);
    if (changes.mass !== undefined)
      proxyManager.setMass(unitId, changes.mass);
    if (changes.dmg !== undefined)
      proxyManager.setDamage(unitId, changes.dmg);
    if (changes.sprite !== undefined)
      proxyManager.setSprite(unitId, changes.sprite);
    if (changes.abilities !== undefined)
      proxyManager.setAbilities(unitId, changes.abilities);
    if (changes.tags !== undefined)
      proxyManager.setTags(unitId, changes.tags);
    if (changes.type !== undefined)
      proxyManager.setType(unitId, changes.type);
    if (changes.posture !== undefined)
      proxyManager.setPosture(unitId, changes.posture);
    if (changes.intendedTarget !== undefined)
      proxyManager.setIntendedTarget(unitId, changes.intendedTarget);
    if (changes.lastAbilityTick !== undefined)
      proxyManager.setLastAbilityTick(unitId, changes.lastAbilityTick);
    if (changes.meta !== undefined) {
      const existingMeta = proxyManager.getMeta(unitId);
      const newMeta = { ...existingMeta };
      for (const [key, value] of Object.entries(changes.meta)) {
        if (value === undefined) {
          delete newMeta[key];
        } else {
          newMeta[key] = value;
        }
      }
      proxyManager.setMeta(unitId, newMeta);
    }
  }
  updateUnits(updates) {
    const units = this.getWorkingCopy();
    for (const unit of units) {
      const changes = updates.get(unit.id);
      if (changes) {
        Object.assign(unit, changes);
      }
    }
  }
  queueEvent(event) {
    this.sim.queuedEvents.push(event);
  }
  addProjectile(projectile) {
    this.sim.projectiles.push(projectile);
  }
  mapProjectiles(fn) {
    this.sim.projectiles = this.sim.projectiles.map(fn);
  }
  filterProjectiles(fn) {
    this.sim.projectiles = this.sim.projectiles.filter(fn);
  }
}

// src/commands/jump.ts
class JumpCommand extends Command {
  execute(unitId, params) {
    if (!unitId)
      return;
    const transform = new Transform(this.sim);
    const units = this.sim.units;
    const unit = units.find((u) => u.id === unitId);
    if (!unit)
      return;
    if (unit.meta?.jumping) {
      unit.meta.jumpBuffered = true;
      unit.meta.jumpBufferTick = this.sim.ticks || 0;
      unit.meta.bufferedJumpParams = params;
      return;
    }
    let targetX = params.targetX;
    let targetY = params.targetY;
    if (targetX === undefined || targetY === undefined) {
      const distance = params.distance || 3;
      const facing = unit.meta?.facing || "right";
      targetX = unit.pos.x + (facing === "right" ? distance : -distance);
      targetY = unit.pos.y;
      targetX = Math.max(0, Math.min(this.sim.width - 1, targetX));
    }
    const height = params.height || 5;
    const damage = params.damage || 0;
    const radius = params.radius || 0;
    transform.updateUnit(unitId, {
      meta: {
        ...unit.meta,
        jumping: true,
        jumpProgress: 0,
        jumpOrigin: { x: unit.pos.x, y: unit.pos.y },
        jumpTarget: { x: targetX, y: targetY },
        jumpHeight: height,
        jumpDamage: damage,
        jumpRadius: radius,
        z: 0
      }
    });
  }
}

// src/commands/plant.ts
class PlantCommand extends Command {
  constructor(sim) {
    super(sim);
  }
  execute(unitId, params) {
    if (!unitId)
      return;
    const unit = this.sim.roster[unitId];
    if (!unit)
      return;
    const bushPosition = {
      x: Math.max(0, Math.min(this.sim.fieldWidth - 1, unit.pos.x + (params.offsetX || 0))),
      y: Math.max(0, Math.min(this.sim.fieldHeight - 1, unit.pos.y + (params.offsetY || 0)))
    };
    const occupied = Object.values(this.sim.roster).some((u) => u.pos.x === bushPosition.x && u.pos.y === bushPosition.y && u.state !== "dead");
    if (occupied)
      return;
    const bushId = `bush_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const bush = {
      id: bushId,
      type: "bush",
      pos: bushPosition,
      intendedMove: { x: 0, y: 0 },
      team: unit.team,
      state: "idle",
      sprite: "bush",
      hp: 1,
      maxHp: 1,
      dmg: 0,
      mass: 1,
      abilities: [],
      tags: ["terrain", "plant", "obstacle"],
      meta: {
        plantedBy: unitId
      }
    };
    this.sim.addUnit(bush);
  }
}

// src/commands/strike.ts
class StrikeCommand extends Command {
  execute(unitId, params) {
    if (!unitId)
      return;
    const attacker = this.sim.units.find((u) => u.id === unitId);
    if (!attacker)
      return;
    const targetId = params.targetId;
    const direction = params.direction;
    const damage = params.damage || attacker.dmg || 10;
    const range = params.range || 1;
    let target = null;
    if (targetId) {
      target = this.sim.units.find((u) => u.id === targetId && u.hp > 0);
    } else {
      const strikeDirection = direction || attacker.meta?.facing || "right";
      target = this.findTargetInDirection(attacker, strikeDirection, range);
    }
    if (target && this.isInRange(attacker, target, range)) {
      this.sim.processedEvents.push({
        kind: "damage",
        source: attacker.id,
        target: target.id,
        meta: {
          amount: damage,
          aspect: "kinetic",
          tick: this.sim.ticks,
          isStrike: true
        }
      });
      const transform = new Transform(this.sim);
      transform.updateUnit(attacker.id, {
        state: "attack",
        meta: {
          ...attacker.meta,
          lastStrike: this.sim.ticks
        }
      });
      transform.updateUnit(target.id, {
        hp: Math.max(0, target.hp - damage)
      });
      if (target.hp - damage <= 0) {
        transform.updateUnit(target.id, {
          state: "dead",
          hp: 0
        });
      }
    }
  }
  findTargetInDirection(attacker, direction, range) {
    const dx = direction === "right" ? 1 : direction === "left" ? -1 : 0;
    const dy = direction === "down" ? 1 : direction === "up" ? -1 : 0;
    for (let r = 1;r <= range; r++) {
      const checkX = attacker.pos.x + dx * r;
      const checkY = attacker.pos.y + dy * r;
      const target = this.sim.units.find((u) => u.hp > 0 && u.team !== attacker.team && Math.abs(u.pos.x - checkX) < 0.5 && Math.abs(u.pos.y - checkY) < 0.5);
      if (target)
        return target;
    }
    return null;
  }
  isInRange(attacker, target, range) {
    const dx = Math.abs(attacker.pos.x - target.pos.x);
    const dy = Math.abs(attacker.pos.y - target.pos.y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= range;
  }
}

// src/commands/cleanup.ts
class CleanupCommand extends Command {
  transform;
  constructor(sim) {
    super(sim);
    this.transform = sim.getTransform();
  }
  execute(unitId, params) {
    if (!params.unitId)
      return;
    this.transform.filterUnits((unit) => unit.id !== params.unitId);
  }
}

// src/commands/remove.ts
class RemoveCommand extends Command {
  transform;
  constructor(sim) {
    super(sim);
    this.transform = sim.getTransform();
  }
  execute(unitId, params) {
    const targetId = params.unitId;
    if (!targetId)
      return;
    this.transform.filterUnits((unit) => unit.id !== targetId);
  }
}

// src/commands/move.ts
class MoveCommand extends Command {
  execute(unitId, params) {
    const targetId = unitId || params.unitId;
    if (!targetId)
      return;
    const transform = this.sim.getTransform();
    const unit = this.sim.units.find((u) => u.id === targetId);
    if (!unit)
      return;
    if (params.x !== undefined && params.y !== undefined) {
      const newX = params.x;
      const newY = params.y;
      const dx = newX - unit.pos.x;
      const dy = newY - unit.pos.y;
      const updates = {
        intendedMove: { x: dx, y: dy }
      };
      if (params.z !== undefined) {
        if (!updates.meta)
          updates.meta = {};
        updates.meta.z = params.z;
      }
      transform.updateUnit(targetId, updates);
    } else {
      const dx = params.dx || 0;
      const dy = params.dy || 0;
      let effectiveDx = dx;
      let effectiveDy = dy;
      if (unit.meta.chilled) {
        const slowFactor = 1 - (unit.meta.chillIntensity || 0.5);
        effectiveDx *= slowFactor;
        effectiveDy *= slowFactor;
      }
      if (unit.meta.stunned) {
        effectiveDx = 0;
        effectiveDy = 0;
      }
      let facing = unit.meta.facing || "right";
      if (!unit.meta.jumping && !unit.meta.tossing && dx !== 0) {
        if (dx > 0) {
          facing = "right";
        } else if (dx < 0) {
          facing = "left";
        }
      }
      let metaUpdates = { ...unit.meta, facing };
      if (params.z !== undefined) {
        metaUpdates.z = params.z;
      }
      transform.updateUnit(targetId, {
        intendedMove: { x: effectiveDx, y: effectiveDy },
        meta: metaUpdates
      });
    }
  }
}

// src/commands/hero_command.ts
class HeroCommand extends Command {
  execute(unitId, params) {
    const action = params.action;
    console.log(`HeroCommand: action=${action}`);
    if (action === "move-to") {
      const targetX = params.x;
      const targetY = params.y;
      const heroes2 = this.sim.units.filter((u) => u.tags?.includes("hero"));
      for (const hero of heroes2) {
        if (!hero.meta)
          hero.meta = {};
        hero.meta.moveTarget = {
          x: targetX,
          y: targetY,
          attackMove: params.attackMove || false,
          setTick: this.sim.ticks
        };
        console.log(`[HeroCommand] Hero ${hero.id} move-to (${targetX}, ${targetY})`);
      }
      return;
    }
    const heroes = this.sim.units.filter((u) => u.tags?.includes("hero"));
    for (const hero of heroes) {
      switch (action) {
        case "jump":
          this.sim.queuedCommands.push({
            type: "jump",
            unitId: hero.id,
            params: {
              distance: params.distance || 3,
              height: params.height || 5
            }
          });
          break;
        case "move":
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
            params: { dx: adjustedDx, dy: adjustedDy }
          });
          break;
        case "left":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: -1, dy: 0 }
          });
          break;
        case "right":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: 1, dy: 0 }
          });
          break;
        case "up":
          console.log(`[HeroCommand] Moving hero up by 2: unit=${hero.id}, pos=${JSON.stringify(hero.pos)}`);
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: 0, dy: -2 }
          });
          break;
        case "down":
          console.log(`[HeroCommand] Moving hero down by 2: unit=${hero.id}, pos=${JSON.stringify(hero.pos)}`);
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: 0, dy: 2 }
          });
          break;
        case "up-left":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: -1, dy: -2 }
          });
          break;
        case "up-right":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: 1, dy: -2 }
          });
          break;
        case "down-left":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: -1, dy: 2 }
          });
          break;
        case "down-right":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: 1, dy: 2 }
          });
          break;
        case "knight-left":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: -1, dy: -2 }
          });
          break;
        case "knight-right":
          this.sim.queuedCommands.push({
            type: "move",
            unitId: hero.id,
            params: { dx: 1, dy: -2 }
          });
          break;
        case "attack":
        case "strike":
          const enemies = this.sim.units.filter((u) => u.team !== hero.team && u.hp > 0 && Math.abs(u.pos.x - hero.pos.x) <= 2 && Math.abs(u.pos.y - hero.pos.y) <= 2);
          if (enemies.length > 0) {
            this.sim.queuedCommands.push({
              type: "strike",
              unitId: hero.id,
              params: {
                targetId: enemies[0].id,
                direction: hero.meta?.facing || "right",
                range: params.range || 2,
                damage: params.damage || hero.dmg || 15
              }
            });
          } else {
            this.sim.queuedCommands.push({
              type: "strike",
              unitId: hero.id,
              params: {
                direction: hero.meta?.facing || "right",
                range: params.range || 2,
                damage: params.damage || hero.dmg || 15
              }
            });
          }
          hero.state = "attack";
          if (!hero.meta)
            hero.meta = {};
          hero.meta.lastStrike = this.sim.ticks;
          hero.meta.attackStartTick = this.sim.ticks;
          hero.meta.attackEndTick = this.sim.ticks + 12;
          break;
        default:
          console.warn(`Unknown hero action: ${action}`);
      }
    }
  }
}

// src/commands/knockback.ts
class KnockbackCommand extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  execute(unitId, params) {
    const targetId = params.targetId;
    if (!targetId)
      return;
    if (params.x !== undefined && params.y !== undefined) {
      const x = params.x;
      const y = params.y;
      this.transform.updateUnit(targetId, {
        pos: { x, y }
      });
    } else if (params.force) {
      const force = params.force;
      const targetUnit = this.sim.units.find((u) => u.id === targetId);
      if (targetUnit) {
        const newPos = {
          x: targetUnit.pos.x + force.x,
          y: targetUnit.pos.y + force.y
        };
        this.transform.updateUnit(targetId, { pos: newPos });
      }
    }
  }
}

// src/commands/status_effect.ts
class ApplyStatusEffectCommand extends Command {
  transform;
  constructor(sim) {
    super(sim);
    this.transform = sim.getTransform();
  }
  execute(unitId, params) {
    const targetId = params.unitId;
    const effect = params.effect;
    if (!targetId || !effect)
      return;
    const targetUnit = this.sim.units.find((u) => u.id === targetId);
    if (targetUnit) {
      const statusEffects = targetUnit.meta.statusEffects || [];
      const existingEffect = statusEffects.find((e) => e.type === effect.type);
      if (existingEffect) {
        existingEffect.duration = Math.max(existingEffect.duration, effect.duration);
      } else {
        targetUnit.meta.statusEffects = [...statusEffects, effect];
      }
    }
  }
}

class UpdateStatusEffectsCommand extends Command {
  transform;
  constructor(sim) {
    super(sim);
    this.transform = sim.getTransform();
  }
  execute(unitId, params) {
    const targetId = params.unitId;
    if (!targetId)
      return;
    const targetUnit = this.sim.units.find((u) => u.id === targetId);
    if (targetUnit) {
      const statusEffects = targetUnit.meta.statusEffects || [];
      const updatedEffects = statusEffects.map((effect) => ({
        ...effect,
        duration: effect.duration - 1
      })).filter((effect) => effect.duration > 0);
      let chilled = false;
      let chillIntensity = 0;
      let stunned = false;
      updatedEffects.forEach((effect) => {
        switch (effect.type) {
          case "chill":
            chilled = true;
            chillIntensity = effect.intensity;
            break;
          case "stun":
            stunned = true;
            break;
          case "burn":
            break;
        }
      });
      targetUnit.meta.statusEffects = updatedEffects;
      targetUnit.meta.chilled = chilled;
      targetUnit.meta.chillIntensity = chilled ? chillIntensity : undefined;
      targetUnit.meta.stunned = stunned;
    }
  }
}

// src/commands/kill.ts
class Kill extends Command {
  transform;
  constructor(sim) {
    super(sim);
    this.transform = sim.getTransform();
  }
  execute(unitId, params) {
    const targetId = params.unitId;
    if (!targetId)
      return;
    this.transform.updateUnit(targetId, { state: "dead" });
  }
}

// src/commands/halt.ts
class HaltCommand extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  execute(unitId, params) {
    const targetId = params.unitId || unitId;
    if (!targetId)
      return;
    this.transform.updateUnit(targetId, {
      intendedMove: { x: 0, y: 0 }
    });
  }
}

// src/commands/meta.ts
class MetaCommand extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  execute(unitId, params) {
    const targetId = params.unitId || unitId;
    if (!targetId)
      return;
    const updates = {};
    if (params.meta) {
      updates.meta = params.meta;
    }
    if (params.state) {
      updates.state = params.state;
    }
    if (Object.keys(updates).length > 0) {
      this.transform.updateUnit(targetId, updates);
    }
  }
}

// src/commands/pull.ts
class PullCommand extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  execute(unitId, params) {
    const grapplerId = params.grapplerId;
    const targetId = params.targetId;
    const force = params.force || 0.3;
    if (!grapplerId || !targetId)
      return;
    const grappler = this.sim.units.find((u) => u.id === grapplerId);
    const target = this.sim.units.find((u) => u.id === targetId);
    if (!grappler || !target)
      return;
    const dx = target.pos.x - grappler.pos.x;
    const dy = target.pos.y - grappler.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0)
      return;
    const unitX = dx / distance;
    const unitY = dy / distance;
    const grapplerMass = grappler.mass || 1;
    const targetMass = target.mass || 1;
    const totalMass = grapplerMass + targetMass;
    const targetIsImmovable = targetMass > 30;
    if (target.meta.pinned || targetIsImmovable) {
      const grapplerPull = force * 2;
      this.transform.updateUnit(grapplerId, {
        pos: {
          x: Math.max(0, Math.min(this.sim.fieldWidth - 1, grappler.pos.x + unitX * grapplerPull)),
          y: Math.max(0, Math.min(this.sim.fieldHeight - 1, grappler.pos.y + unitY * grapplerPull))
        }
      });
    } else {
      const grapplerPull = targetMass / totalMass * force;
      const targetPull = grapplerMass / totalMass * force;
      this.transform.updateUnit(grapplerId, {
        pos: {
          x: Math.max(0, Math.min(this.sim.fieldWidth - 1, grappler.pos.x + unitX * grapplerPull)),
          y: Math.max(0, Math.min(this.sim.fieldHeight - 1, grappler.pos.y + unitY * grapplerPull))
        }
      });
      this.transform.updateUnit(targetId, {
        pos: {
          x: Math.max(0, Math.min(this.sim.fieldWidth - 1, target.pos.x - unitX * targetPull)),
          y: Math.max(0, Math.min(this.sim.fieldHeight - 1, target.pos.y - unitY * targetPull))
        }
      });
    }
  }
}

// src/commands/burrow.ts
class BurrowCommand extends Command {
  execute(unitId, params) {
    if (!unitId)
      return;
    const transform = new Transform(this.sim);
    const units = this.sim.units;
    const unit = units.find((u) => u.id === unitId);
    if (!unit)
      return;
    const duration = params.duration || 15;
    const targetX = params.targetX;
    const targetY = params.targetY;
    transform.updateUnit(unitId, {
      meta: {
        ...unit.meta,
        burrowed: true,
        invisible: true,
        burrowDuration: duration,
        burrowStartTick: this.sim.ticks,
        burrowTargetX: targetX,
        burrowTargetY: targetY
      }
    });
  }
}

// src/commands/charm.ts
class CharmCommand extends Command {
  execute(unitId, params) {
    if (!unitId)
      return;
    const transform = new Transform(this.sim);
    const team = params.team;
    if (!team)
      return;
    transform.updateUnit(unitId, {
      team
    });
  }
}

// src/commands/spawn.ts
class SpawnCommand extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform;
  }
  execute(unitId, params) {
    let unit;
    if (params.unit) {
      unit = params.unit;
    } else if (params.unitType) {
      try {
        const unitData = Encyclopaedia.unit(params.unitType);
        if (!unitData) {
          console.warn(`SpawnCommand: Unknown unit type '${params.unitType}'`);
          return;
        }
        unit = {
          ...unitData,
          id: this.sim.units.length === 0 ? params.unitType : `${params.unitType}${this.sim.units.length}`,
          pos: {
            x: params.x !== undefined ? params.x : Math.floor(Math.random() * this.sim.getTickContext().getFieldWidth()),
            y: params.y !== undefined ? params.y : Math.floor(Math.random() * this.sim.getTickContext().getFieldHeight())
          },
          team: params.team || unitData.team || "neutral"
        };
      } catch (e) {
        console.warn(`SpawnCommand: Failed to create unit of type '${params.unitType}':`, e);
        return;
      }
    } else {
      console.warn("SpawnCommand: No unit or unitType provided", params);
      return;
    }
    if (this.transform) {
      this.transform.addUnit(unit);
    } else {
      this.sim.addUnit(unit);
    }
  }
}

// src/commands/pose.ts
class PoseCommand extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  execute(unitId, params) {
    const id = params.unitId || unitId;
    if (!id)
      return;
    const unit = this.sim.units.find((u) => u.id === id);
    if (!unit)
      return;
    this.transform.updateUnit(id, {
      meta: { ...unit.meta, posture: params.posture }
    });
  }
}

// src/commands/target.ts
class TargetCommand extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  execute(unitId, params) {
    const id = params.unitId || unitId;
    const targetId = params.targetId;
    if (!id)
      return;
    const unit = this.sim.units.find((u) => u.id === id);
    if (!unit)
      return;
    this.transform.updateUnit(id, {
      meta: { ...unit.meta, intendedTarget: targetId }
    });
  }
}

// src/commands/guard.ts
class GuardCommand extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  execute(unitId, params) {
    const id = params.unitId || unitId;
    const protecteeId = params.protecteeId;
    if (!id)
      return;
    const unit = this.sim.units.find((u) => u.id === id);
    if (!unit)
      return;
    this.transform.updateUnit(id, {
      meta: { ...unit.meta, intendedProtectee: protecteeId }
    });
  }
}

// src/commands/face.ts
class FaceCommand extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  execute(unitId, params) {
    const id = params.unitId || unitId;
    const direction = params.direction;
    if (!id || !direction)
      return;
    const unit = this.sim.units.find((u) => u.id === id);
    if (!unit)
      return;
    this.transform.updateUnit(id, {
      meta: { ...unit.meta, facing: direction }
    });
  }
}

// src/commands/forces.ts
class ForcesCommand extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform;
  }
  execute(unitId, params) {
    this.applyAllForces();
  }
  applyAllForces() {
    const arrays = this.sim.proxyManager.arrays;
    const context = this.sim.getTickContext();
    const capacity = arrays.capacity;
    const fieldWidth = context.getFieldWidth();
    const fieldHeight = context.getFieldHeight();
    const posX = arrays.posX;
    const posY = arrays.posY;
    const moveX = arrays.intendedMoveX;
    const moveY = arrays.intendedMoveY;
    for (let i = 0;i < capacity; i++) {
      posX[i] += moveX[i];
      posY[i] += moveY[i];
    }
    for (let i = 0;i < capacity; i++) {
      moveX[i] = 0;
      moveY[i] = 0;
    }
    this.resolveCollisionsSoA(arrays);
  }
  resolveCollisionsSoA(arrays) {
    const grid = new Map;
    const context = this.sim.getTickContext();
    const fieldWidth = context.getFieldWidth();
    for (let i = 0;i < arrays.capacity; i++) {
      if (arrays.active[i] === 0 || arrays.state[i] === 3)
        continue;
      const packedPos = Math.floor(arrays.posY[i]) * fieldWidth + Math.floor(arrays.posX[i]);
      const existing = grid.get(packedPos);
      if (existing !== undefined) {
        const priorityI = arrays.mass[i] * 10 + arrays.hp[i];
        const priorityExisting = arrays.mass[existing] * 10 + arrays.hp[existing];
        const toDisplace = priorityI > priorityExisting ? existing : i;
        const x = Math.floor(arrays.posX[toDisplace]);
        const y = Math.floor(arrays.posY[toDisplace]);
        let displaced = false;
        let newPackedPos = packedPos;
        if (x + 1 < fieldWidth && !grid.has(packedPos + 1)) {
          arrays.posX[toDisplace] = x + 1;
          newPackedPos = packedPos + 1;
          displaced = true;
        } else if (x - 1 >= 0 && !grid.has(packedPos - 1)) {
          arrays.posX[toDisplace] = x - 1;
          newPackedPos = packedPos - 1;
          displaced = true;
        } else if (y + 1 < context.getFieldHeight() && !grid.has(packedPos + fieldWidth)) {
          arrays.posY[toDisplace] = y + 1;
          newPackedPos = packedPos + fieldWidth;
          displaced = true;
        } else if (y - 1 >= 0 && !grid.has(packedPos - fieldWidth)) {
          arrays.posY[toDisplace] = y - 1;
          newPackedPos = packedPos - fieldWidth;
          displaced = true;
        }
        if (toDisplace === existing) {
          grid.set(packedPos, i);
          if (displaced) {
            grid.set(newPackedPos, existing);
          }
        } else {
          if (displaced) {
            grid.set(newPackedPos, i);
          }
        }
      } else {
        grid.set(packedPos, i);
      }
    }
    const fieldHeight = context.getFieldHeight();
    for (let i = 0;i < arrays.capacity; i++) {
      if (arrays.active[i] === 0)
        continue;
      arrays.posX[i] = Math.max(0, Math.min(fieldWidth - 1, arrays.posX[i]));
      arrays.posY[i] = Math.max(0, Math.min(fieldHeight - 1, arrays.posY[i]));
    }
  }
}

// src/commands/ai.ts
class AICommand extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform;
  }
  execute(unitId, params) {
    this.processAllAI();
    this.handleWoodlandSummoning();
  }
  processAllAI() {
    this.processAIBatched();
  }
  processAIBatched() {
    const postures = new Map;
    const context = this.sim.getTickContext();
    for (const unit of context.getAllUnits()) {
      if (unit.state === "dead" || unit.hp <= 0)
        continue;
      if (unit.meta?.jumping)
        continue;
      let posture = unit.posture || unit.meta?.posture;
      if (!posture && unit.tags) {
        if (unit.tags.includes("hunt"))
          posture = "hunt";
        else if (unit.tags.includes("guard"))
          posture = "guard";
        else if (unit.tags.includes("swarm"))
          posture = "swarm";
        else if (unit.tags.includes("wander"))
          posture = "wander";
        else if (unit.tags.includes("aggressive"))
          posture = "bully";
      }
      if (!posture && unit.team === "neutral" && (!unit.tags || unit.tags.length === 0)) {
        continue;
      }
      postures.set(unit.id, posture || "wait");
    }
    const proxyManager = this.sim.getProxyManager();
    const moves = proxyManager.batchProcessAI(postures);
    const nonZeroMoves = new Map;
    for (const [unitId, move] of moves) {
      if (move.dx !== 0 || move.dy !== 0) {
        nonZeroMoves.set(unitId, move);
      }
    }
    if (nonZeroMoves.size > 0) {
      this.sim.queuedCommands.push({
        type: "moves",
        params: { moves: nonZeroMoves }
      });
    }
  }
  handleWoodlandSummoning() {}
}

// src/commands/simulate.ts
class SimulateCommand extends Command {
  execute(unitId, params) {
    if (this.sim.step) {
      this.sim.step();
    }
  }
}

// src/commands/wander.ts
class Wander extends Command {
  constructor(sim, transform) {
    super(sim);
  }
  execute(unitId, params) {
    const team = params.team || "all";
    const chance = parseFloat(params.chance) || 0.1;
    const units = this.sim.units.filter((u) => {
      if (team === "all")
        return true;
      return u.team === team;
    });
    for (const unit of units) {
      if (unit.state === "dead")
        continue;
      const hasNearbyEnemy = this.sim.units.some((other) => other.team !== unit.team && other.state !== "dead" && Math.abs(other.pos.x - unit.pos.x) <= 3 && Math.abs(other.pos.y - unit.pos.y) <= 3);
      if (!hasNearbyEnemy && Simulator.rng.random() < chance) {
        const roll = Simulator.rng.random();
        const dx = roll < 0.5 ? -1 : 1;
        const dy = Simulator.rng.random() < 0.5 ? -1 : 1;
        const newX = unit.pos.x + dx;
        const newY = unit.pos.y + dy;
        const context = this.sim.getTickContext();
        if (newX >= 0 && newX < context.getFieldWidth() && newY >= 0 && newY < context.getFieldHeight()) {
          this.sim.getTransform().updateUnit(unit.id, {
            intendedMove: { x: dx, y: dy }
          });
        }
      }
    }
  }
}

// src/commands/update_projectile.ts
class RemoveProjectileCommand extends Command {
  execute(unitId, params) {
    const { id } = params;
    if (!this.sim.projectiles)
      return;
    const index = this.sim.projectiles.findIndex((p) => p.id === id);
    if (index >= 0) {
      this.sim.projectiles.splice(index, 1);
    }
  }
}

// src/commands/particle.ts
class ParticleCommand extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform;
  }
  execute(unitId, params) {
    const particle = params.particle || params;
    if (!particle) {
      console.warn("ParticleCommand: No particle data provided");
      return;
    }
    const lifetime = particle.lifetime || particle.ttl || 100;
    this.sim.particleArrays.addParticle({
      id: particle.id,
      pos: particle.pos || { x: 0, y: 0 },
      vel: particle.vel || { x: 0, y: 0 },
      lifetime,
      type: particle.type,
      color: particle.color,
      radius: particle.radius || particle.size || 0.5,
      z: particle.z || 0,
      landed: particle.landed || false,
      targetCell: particle.targetCell
    });
  }
}

// src/commands/particles_batch.ts
class ParticlesBatchCommand extends Command {
  transform;
  constructor(sim, transform) {
    super(sim);
    this.transform = transform;
  }
  execute(unitId, params) {
    const particles = params.particles;
    if (!particles || !Array.isArray(particles)) {
      console.warn("ParticlesBatchCommand: No particles array provided");
      return;
    }
    for (const particle of particles) {
      this.sim.particleArrays.addParticle(particle);
    }
  }
}

// src/commands/humidity.ts
class HumidityCommand extends Command {
  execute(unitId, params) {
    const sim = this.sim;
    const { x, y, delta } = params;
    if (sim.humidityField && x !== undefined && y !== undefined) {
      const current = sim.humidityField.get(x, y);
      sim.humidityField.set(x, y, Math.max(0, Math.min(1, current + delta)));
    }
  }
}

// src/commands/moves.ts
class MovesCommand extends Command {
  execute(unitId, params) {
    const moves = params.moves;
    if (!moves || moves.size === 0)
      return;
    const transform = this.sim.getTransform();
    const currentTick = this.sim.ticks;
    const updates = [];
    for (const [id, move] of moves) {
      const unit = this.sim.units.find((u) => u.id === id);
      if (!unit)
        continue;
      const movementRate = unit.meta?.movementRate || (unit.tags?.includes("hero") ? 1 : 2);
      const lastMoveTick = unit.meta?.lastMoveTick || 0;
      if (currentTick - lastMoveTick < movementRate) {
        continue;
      }
      let effectiveDx = move.dx;
      let effectiveDy = move.dy;
      if (unit.meta?.chilled) {
        const slowFactor = 1 - (unit.meta.chillIntensity || 0.5);
        effectiveDx *= slowFactor;
        effectiveDy *= slowFactor;
      }
      if (unit.meta?.stunned) {
        effectiveDx = 0;
        effectiveDy = 0;
      }
      let facing = unit.meta?.facing || "right";
      if (!unit.meta?.jumping && !unit.meta?.tossing && move.dx !== 0) {
        facing = move.dx > 0 ? "right" : "left";
      }
      updates.push({
        id,
        changes: {
          intendedMove: { x: effectiveDx, y: effectiveDy },
          meta: { ...unit.meta, facing, lastMoveTick: currentTick }
        }
      });
    }
    for (const update of updates) {
      transform.updateUnit(update.id, update.changes);
    }
  }
}

// src/commands/effects.ts
class EffectsCommand extends Command {
  execute(unitId, params) {
    const caster = this.sim.units.find((u) => u.id === params.casterId);
    const target = this.sim.units.find((u) => u.id === params.targetId);
    if (!caster || !target)
      return;
    for (const effect of params.effects) {
      this.processEffect(effect, caster, target);
    }
  }
  processEffect(effect, caster, target) {
    switch (effect.type) {
      case "damage":
        this.sim.queuedCommands.push({
          type: "damage",
          params: {
            targetId: target.id,
            amount: effect.amount || 0,
            sourceId: caster.id
          }
        });
        break;
      case "heal":
        this.sim.queuedCommands.push({
          type: "heal",
          params: {
            targetId: target.id,
            amount: effect.amount || 0,
            sourceId: caster.id
          }
        });
        break;
      case "projectile":
        const projectileTarget = target.pos || target;
        this.sim.queuedCommands.push({
          type: "projectile",
          params: {
            origin: caster.pos,
            destination: projectileTarget,
            speed: effect.speed || 1,
            damage: effect.damage || 0,
            casterId: caster.id,
            targetId: target.id,
            effect: effect.effect,
            style: effect.style || "bullet"
          }
        });
        break;
      case "aoe":
        const center = effect.center === "target" ? target.pos : caster.pos;
        this.sim.queuedCommands.push({
          type: "aoe",
          params: {
            center,
            radius: effect.radius || 5,
            damage: effect.damage || 0,
            casterId: caster.id,
            effect: effect.effect
          }
        });
        break;
      case "lightning":
        this.sim.queuedCommands.push({
          type: "bolt",
          params: {
            targetId: target.id,
            damage: effect.damage || 10,
            casterId: caster.id
          }
        });
        break;
      case "weather":
        this.sim.queuedCommands.push({
          type: "weather",
          params: {
            weather: effect.weather || "clear"
          }
        });
        break;
      case "spawn":
        const spawnPos = target.pos || target;
        this.sim.queuedCommands.push({
          type: "spawn",
          params: {
            unitType: effect.unitType || "skeleton",
            pos: spawnPos,
            team: caster.team,
            count: effect.count || 1
          }
        });
        break;
      case "teleport":
        const teleportTarget = target.pos || target;
        this.sim.queuedCommands.push({
          type: "move",
          params: {
            unitId: caster.id,
            pos: teleportTarget
          }
        });
        break;
      case "burrow":
        this.sim.queuedCommands.push({
          type: "burrow",
          params: {
            unitId: caster.id,
            duration: effect.duration || 10
          }
        });
        break;
      case "charm":
        this.sim.queuedCommands.push({
          type: "charm",
          params: {
            targetId: target.id,
            casterId: caster.id,
            duration: effect.duration || 100
          }
        });
        break;
      case "knockback":
        const dx = target.pos.x - caster.pos.x;
        const dy = target.pos.y - caster.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const force = typeof effect.force === "number" ? effect.force : Number(effect.force) || 5;
          this.sim.queuedCommands.push({
            type: "knockback",
            params: {
              targetId: target.id,
              dx: dx / dist * force,
              dy: dy / dist * force
            }
          });
        }
        break;
      case "status":
        this.sim.queuedCommands.push({
          type: "status",
          params: {
            targetId: target.id,
            effect: effect.status || "stun",
            duration: effect.duration || 10
          }
        });
        break;
      default:
        console.warn(`Unknown effect type: ${effect.type}`);
    }
  }
}

// src/commands/ability_effects.ts
class AbilityEffectsCommand extends Command {
  execute(unitId, params) {
    const caster = this.sim.units.find((u) => u.id === params.casterId);
    if (!caster)
      return;
    const target = params.target;
    const targetUnit = target?.id ? this.sim.units.find((u) => u.id === target.id) : target;
    for (const effect of params.effects) {
      this.queueEffect(effect, caster, targetUnit || target);
    }
  }
  queueEffect(effect, caster, target) {
    const targetId = target?.id;
    const targetPos = target?.pos || target;
    switch (effect.type) {
      case "damage":
        if (targetId) {
          this.sim.queuedCommands.push({
            type: "damage",
            params: {
              targetId,
              amount: effect.amount || 0,
              sourceId: caster.id
            }
          });
        }
        break;
      case "heal":
        if (targetId) {
          this.sim.queuedCommands.push({
            type: "heal",
            params: {
              targetId,
              amount: effect.amount || 0,
              sourceId: caster.id
            }
          });
        }
        break;
      case "projectile":
        this.sim.queuedCommands.push({
          type: "projectile",
          params: {
            origin: caster.pos,
            destination: targetPos,
            speed: effect.speed || 1,
            damage: effect.damage || 0,
            casterId: caster.id,
            targetId,
            effect: effect.effect,
            style: effect.style || "bullet"
          }
        });
        break;
      case "aoe":
        const center = effect.center === "target" ? targetPos : caster.pos;
        this.sim.queuedCommands.push({
          type: "aoe",
          params: {
            center,
            radius: effect.radius || 5,
            damage: effect.damage || 0,
            casterId: caster.id,
            effect: effect.effect
          }
        });
        break;
      case "lightning":
        if (targetId) {
          this.sim.queuedCommands.push({
            type: "bolt",
            params: {
              targetId,
              damage: effect.damage || 10,
              casterId: caster.id
            }
          });
        }
        break;
      case "weather":
        this.sim.queuedCommands.push({
          type: "weather",
          params: {
            weather: effect.weather || "clear"
          }
        });
        break;
      case "spawn":
        this.sim.queuedCommands.push({
          type: "spawn",
          params: {
            unitType: effect.unitType || "skeleton",
            pos: targetPos,
            team: caster.team,
            count: effect.count || 1
          }
        });
        break;
      case "teleport":
        this.sim.queuedCommands.push({
          type: "move",
          params: {
            unitId: caster.id,
            pos: targetPos
          }
        });
        break;
      case "burrow":
        this.sim.queuedCommands.push({
          type: "burrow",
          params: {
            unitId: caster.id,
            duration: effect.duration || 10
          }
        });
        break;
      case "charm":
        if (targetId) {
          this.sim.queuedCommands.push({
            type: "charm",
            params: {
              targetId,
              casterId: caster.id,
              duration: effect.duration || 100
            }
          });
        }
        break;
      case "knockback":
        if (targetId && targetPos) {
          const dx = targetPos.x - caster.pos.x;
          const dy = targetPos.y - caster.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            const force = typeof effect.force === "number" ? effect.force : Number(effect.force) || 5;
            this.sim.queuedCommands.push({
              type: "knockback",
              params: {
                targetId,
                dx: dx / dist * force,
                dy: dy / dist * force
              }
            });
          }
        }
        break;
      case "status":
        if (targetId) {
          this.sim.queuedCommands.push({
            type: "status",
            params: {
              targetId,
              effect: effect.status || "stun",
              duration: effect.duration || 10
            }
          });
        }
        break;
      case "storm":
        this.sim.queuedCommands.push({
          type: "storm",
          params: {
            target: targetPos,
            radius: effect.radius || 10,
            damage: effect.damage || 5,
            duration: effect.duration || 10,
            casterId: caster.id
          }
        });
        break;
      case "grapple":
        if (targetId) {
          this.sim.queuedCommands.push({
            type: "grapple",
            params: {
              casterId: caster.id,
              targetId
            }
          });
        }
        break;
      case "jump":
        const impactDamage = effect.damage || 5;
        const impactRadius = effect.radius || 3;
        this.sim.queuedCommands.push({
          type: "jump",
          params: {
            unitId: caster.id,
            targetX: targetPos.x,
            targetY: targetPos.y,
            height: effect.height || 5,
            damage: impactDamage,
            radius: impactRadius,
            speed: effect.speed || 2
          }
        });
        break;
      case "toss":
        if (targetId) {
          this.sim.queuedCommands.push({
            type: "toss",
            params: {
              casterId: caster.id,
              targetId,
              destination: targetPos
            }
          });
        }
        break;
    }
  }
}

// src/commands/move_target.ts
class MoveTargetCommand extends Command {
  execute(unitId, params) {
    if (!unitId)
      return;
    const unit = this.sim.units.find((u) => u.id === unitId);
    if (!unit)
      return;
    const targetX = params.x;
    const targetY = params.y;
    const attackMove = params.attackMove || false;
    if (!unit.meta)
      unit.meta = {};
    unit.meta.moveTarget = {
      x: targetX,
      y: targetY,
      attackMove,
      setTick: this.sim.ticks
    };
    unit.meta.currentPath = null;
    console.log(`[MoveTarget] Unit ${unitId} targeting position (${targetX}, ${targetY}), attackMove: ${attackMove}`);
  }
}

// src/core/command_handler.ts
class CommandHandler {
  commands = new Map;
  transform;
  sim;
  constructor(sim, transform) {
    this.sim = sim;
    this.transform = transform || sim.getTransform();
    this.commands.set("toss", new Toss(sim, this.transform));
    this.commands.set("weather", new ChangeWeather(sim));
    this.commands.set("deploy", new Deploy(sim));
    this.commands.set("spawn", new Deploy(sim, this.transform));
    this.commands.set("airdrop", new Airdrop(sim, this.transform));
    this.commands.set("drop", new Airdrop(sim, this.transform));
    this.commands.set("bolt", new BoltCommand(sim));
    this.commands.set("lightning", new BoltCommand(sim));
    this.commands.set("storm", new StormCommand(sim));
    this.commands.set("grapple", new Grapple(sim, this.transform));
    this.commands.set("hook", new Grapple(sim, this.transform));
    this.commands.set("pin", new Pin(sim, this.transform));
    this.commands.set("temperature", new Temperature(sim, this.transform));
    this.commands.set("temp", new Temperature(sim, this.transform));
    this.commands.set("wander", new Wander(sim, this.transform));
    this.commands.set("damage", new Damage(sim, this.transform));
    this.commands.set("heal", new Heal(sim, this.transform));
    this.commands.set("aoe", new AoE(sim, this.transform));
    this.commands.set("projectile", new Projectile(sim, this.transform));
    this.commands.set("jump", new JumpCommand(sim, this.transform));
    this.commands.set("strike", new StrikeCommand(sim, this.transform));
    this.commands.set("attack", new StrikeCommand(sim, this.transform));
    this.commands.set("plant", new PlantCommand(sim));
    this.commands.set("cleanup", new CleanupCommand(sim));
    this.commands.set("remove", new RemoveCommand(sim));
    this.commands.set("move", new MoveCommand(sim));
    this.commands.set("moves", new MovesCommand(sim));
    this.commands.set("hero", new HeroCommand(sim));
    this.commands.set("move_target", new MoveTargetCommand(sim, this.transform));
    this.commands.set("knockback", new KnockbackCommand(sim));
    this.commands.set("applyStatusEffect", new ApplyStatusEffectCommand(sim));
    this.commands.set("updateStatusEffects", new UpdateStatusEffectsCommand(sim));
    this.commands.set("markDead", new Kill(sim));
    this.commands.set("halt", new HaltCommand(sim, this.transform));
    this.commands.set("meta", new MetaCommand(sim, this.transform));
    this.commands.set("pull", new PullCommand(sim, this.transform));
    this.commands.set("burrow", new BurrowCommand(sim, this.transform));
    this.commands.set("charm", new CharmCommand(sim, this.transform));
    this.commands.set("changeTeam", new CharmCommand(sim, this.transform));
    this.commands.set("spawn", new SpawnCommand(sim, this.transform));
    this.commands.set("add", new SpawnCommand(sim, this.transform));
    this.commands.set("pose", new PoseCommand(sim, this.transform));
    this.commands.set("target", new TargetCommand(sim, this.transform));
    this.commands.set("guard", new GuardCommand(sim, this.transform));
    this.commands.set("face", new FaceCommand(sim, this.transform));
    this.commands.set("forces", new ForcesCommand(sim, this.transform));
    this.commands.set("ai", new AICommand(sim, this.transform));
    this.commands.set("simulate", new SimulateCommand(sim, this.transform));
    this.commands.set("removeProjectile", new RemoveProjectileCommand(sim, this.transform));
    this.commands.set("particle", new ParticleCommand(sim, this.transform));
    this.commands.set("particles", new ParticlesBatchCommand(sim, this.transform));
    this.commands.set("toss", new Toss(sim, this.transform));
    this.commands.set("humidity", new HumidityCommand(sim, this.transform));
    this.commands.set("effects", new EffectsCommand(sim, this.transform));
    this.commands.set("ability_effects", new AbilityEffectsCommand(sim, this.transform));
  }
  executeOne(queuedCommand, context) {
    if (!queuedCommand.type)
      return false;
    const command = this.commands.get(queuedCommand.type);
    if (command) {
      command.execute(queuedCommand.unitId || null, queuedCommand.params);
      return true;
    }
    return false;
  }
  execute(context) {
    let iterations = 0;
    const maxIterations = 10;
    while ((this.sim.queuedCommands?.length > 0 || this.sim.queuedEvents?.length > 0) && iterations < maxIterations) {
      iterations++;
      this.executeOnce(context);
    }
    if (iterations >= maxIterations) {
      console.warn(`Command handler hit max iterations (${maxIterations}) - possible infinite loop`);
    }
    return [];
  }
  executeOnce(context) {
    if (!this.sim.queuedCommands?.length && !this.sim.queuedEvents?.length) {
      return;
    }
    const processedCommandIds = new Set;
    if (this.sim.queuedCommands?.length > 0) {
      const commandsToProcess = [];
      const commandsToKeep = [];
      for (const queuedCommand of this.sim.queuedCommands) {
        if (queuedCommand.tick !== undefined && queuedCommand.tick > this.sim.ticks) {
          commandsToKeep.push(queuedCommand);
        } else {
          if (queuedCommand.id && processedCommandIds.has(queuedCommand.id)) {
            continue;
          }
          if (queuedCommand.id) {
            processedCommandIds.add(queuedCommand.id);
          }
          commandsToProcess.push(queuedCommand);
        }
      }
      const commandCounts = {};
      const metaBatch = {};
      const moveBatch = {};
      const otherCommands = [];
      for (const queuedCommand of commandsToProcess) {
        if (!queuedCommand.type)
          continue;
        commandCounts[queuedCommand.type] = (commandCounts[queuedCommand.type] || 0) + 1;
        if (queuedCommand.type === "meta" && queuedCommand.params?.unitId) {
          const unitId = queuedCommand.params.unitId;
          if (!metaBatch[unitId]) {
            metaBatch[unitId] = { meta: {}, state: null };
          }
          if (queuedCommand.params.meta !== undefined) {
            const cleanMeta = {};
            for (const [key, value] of Object.entries(queuedCommand.params.meta)) {
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
        } else if (queuedCommand.type === "move" && queuedCommand.params?.unitId) {
          const unitId = queuedCommand.params.unitId;
          moveBatch[unitId] = queuedCommand.params;
        } else {
          otherCommands.push(queuedCommand);
        }
      }
      const metaCommand = this.commands.get("meta");
      if (metaCommand) {
        for (const [unitId, updates] of Object.entries(metaBatch)) {
          const params = {
            unitId,
            meta: updates.meta,
            state: updates.state
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
      const commandsByType = new Map;
      for (const queuedCommand of otherCommands) {
        if (!queuedCommand.type)
          continue;
        if (!commandsByType.has(queuedCommand.type)) {
          commandsByType.set(queuedCommand.type, []);
        }
        commandsByType.get(queuedCommand.type).push(queuedCommand);
      }
      for (const [cmdType, cmds] of commandsByType) {
        const command = this.commands.get(cmdType);
        if (command) {
          for (const queuedCommand of cmds) {
            command.execute(queuedCommand.unitId || null, queuedCommand.params);
          }
        }
      }
      const newCommands = [];
      for (const cmd of this.sim.queuedCommands) {
        if (!commandsToProcess.includes(cmd) && !commandsToKeep.includes(cmd)) {
          newCommands.push(cmd);
        }
      }
      if (newCommands.length > 0) {}
      this.sim.queuedCommands = [...commandsToKeep, ...newCommands];
      if (this.transform) {
        this.transform.commit();
      }
    }
    if (this.sim.queuedEvents?.length > 0) {
      const eventsToProcess = [...this.sim.queuedEvents];
      const eventHandler = new EventHandler;
      const eventCommands = eventHandler.execute(context);
      if (eventCommands && eventCommands.length > 0) {
        this.sim.queuedCommands.push(...eventCommands);
      }
      this.sim.recordProcessedEvents(eventsToProcess);
      this.sim.queuedEvents = [];
    }
  }
  convertArgsToParams(commandType, args) {
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
          team: args[7]
        };
      case "toss":
        if (typeof args[0] === "object" && args[0].x !== undefined) {
          return {
            direction: args[0],
            force: args[1] || 5,
            distance: args[2] || 3
          };
        } else {
          return {
            targetId: args[0],
            distance: parseInt(args[1]) || 5
          };
        }
      case "weather":
        return {
          weatherType: args[0],
          duration: args[1] ? parseInt(args[1]) : undefined,
          intensity: args[2] ? parseFloat(args[2]) : undefined
        };
      case "airdrop":
      case "drop":
        return {
          unitType: args[0],
          x: parseFloat(args[1]),
          y: parseFloat(args[2])
        };
      case "deploy":
      case "spawn":
        return {
          unitType: args[0],
          x: args[1] ? parseFloat(args[1]) : undefined,
          y: args[2] ? parseFloat(args[2]) : undefined
        };
      case "temperature":
      case "temp":
        if (args.length === 1) {
          return {
            amount: parseFloat(args[0])
          };
        } else {
          return {
            x: parseFloat(args[0]),
            y: parseFloat(args[1]),
            amount: parseFloat(args[2]),
            radius: args[3] ? parseFloat(args[3]) : 3
          };
        }
      case "lightning":
      case "bolt":
        return {
          x: args[0] ? parseFloat(args[0]) : undefined,
          y: args[1] ? parseFloat(args[1]) : undefined
        };
      case "storm":
        return {
          action: args[0] || "start"
        };
      case "particle":
        if (typeof args === "object" && !Array.isArray(args)) {
          return args;
        }
        return args[0] || {};
      case "jump":
        return {
          targetX: parseFloat(args[0]),
          targetY: parseFloat(args[1]),
          height: args[2] ? parseFloat(args[2]) : 5,
          damage: args[3] ? parseFloat(args[3]) : 5,
          radius: args[4] ? parseFloat(args[4]) : 3
        };
      case "damage":
        return {
          targetId: args[0],
          amount: parseInt(args[1]) || 0,
          aspect: args[2] || "physical"
        };
      case "heal":
        return {
          targetId: args[0],
          amount: parseInt(args[1]) || 0,
          aspect: args[2] || "healing"
        };
      default:
        console.warn(`Unknown command type ${commandType} - cannot convert args to params`);
        return {};
    }
  }
}

// src/rules/huge_units.ts
init_rule();

class HugeUnits extends Rule {
  execute(context) {
    const commands = [];
    const allUnits = context.getAllUnits();
    const hugeUnits = allUnits.filter((unit) => unit.meta.huge && !this.hasPhantoms(allUnits, unit));
    for (const hugeUnit of hugeUnits) {
      this.createPhantoms(context, hugeUnit, commands);
    }
    this.updatePhantomPositions(context, allUnits, commands);
    this.cleanupOrphanedPhantoms(context, allUnits, commands);
    return commands;
  }
  hasPhantoms(allUnits, hugeUnit) {
    return allUnits.some((unit) => unit.meta.phantom && unit.meta.parentId === hugeUnit.id);
  }
  createPhantoms(context, hugeUnit, commands) {
    for (let i = 1;i <= 3; i++) {
      const phantomPos = {
        x: hugeUnit.pos.x,
        y: hugeUnit.pos.y + i
      };
      if (this.isValidPosition(context, phantomPos)) {
        const phantom = {
          id: `${hugeUnit.id}_phantom_${i}`,
          type: "phantom",
          pos: phantomPos,
          intendedMove: { x: 0, y: 0 },
          team: hugeUnit.team,
          sprite: "phantom",
          state: "idle",
          hp: 9999,
          maxHp: 9999,
          mass: Math.max(hugeUnit.mass, 999),
          abilities: [],
          tags: ["phantom", "noncombatant"],
          meta: {
            phantom: true,
            parentId: hugeUnit.id
          }
        };
        commands.push({
          type: "spawn",
          params: { unit: phantom }
        });
      }
    }
  }
  updatePhantomPositions(context, allUnits, commands) {
    const phantomPairs = this.getPhantomPairs(allUnits);
    for (const [parentId, phantoms] of phantomPairs) {
      const parent = context.findUnitById(parentId);
      if (!parent || !parent.meta.huge)
        continue;
      phantoms.forEach((phantom, index) => {
        const expectedPos = {
          x: parent.pos.x,
          y: parent.pos.y + (index + 1)
        };
        if (phantom.pos.x !== expectedPos.x || phantom.pos.y !== expectedPos.y) {
          commands.push({
            type: "move",
            params: {
              unitId: phantom.id,
              dx: expectedPos.x - phantom.pos.x,
              dy: expectedPos.y - phantom.pos.y
            }
          });
        }
      });
    }
  }
  getPhantomPairs(allUnits) {
    const pairs = new Map;
    allUnits.filter((unit) => unit.meta.phantom && unit.meta.parentId).forEach((phantom) => {
      const meta = phantom.meta || {};
      const parentId = meta.parentId;
      if (!pairs.has(parentId)) {
        pairs.set(parentId, []);
      }
      pairs.get(parentId).push(phantom);
    });
    pairs.forEach((phantoms) => {
      phantoms.sort((a, b) => a.pos.y - b.pos.y);
    });
    return pairs;
  }
  cleanupOrphanedPhantoms(context, allUnits, commands) {
    const orphanedPhantoms = allUnits.filter((unit) => {
      const meta = unit.meta || {};
      return meta.phantom && meta.parentId && !context.findUnitById(meta.parentId);
    });
    for (const phantom of orphanedPhantoms) {
      commands.push({
        type: "remove",
        params: { unitId: phantom.id }
      });
    }
  }
  isValidPosition(context, pos) {
    return pos.x >= 0 && pos.x < context.getFieldWidth() && pos.y >= 0 && pos.y < context.getFieldHeight();
  }
  isOccupied(context, pos) {
    return context.getUnitsAt(pos).length > 0;
  }
}

// src/rules/segmented_creatures.ts
init_rule();

class SegmentedCreatures extends Rule {
  pathHistory = new Map;
  constructor() {
    super();
  }
  execute(context) {
    const segmentedCreatures = context.getAllUnits().filter((unit) => {
      const meta = unit.meta || {};
      return meta.segmented && !this.hasSegments(context, unit);
    });
    const commands = [];
    for (let i = 0;i < segmentedCreatures.length; i++) {
      const creature = segmentedCreatures[i];
      if (i > 100) {
        console.error("SegmentedCreatures: Too many creatures, possible infinite loop!");
        throw new Error("SegmentedCreatures infinite loop detected");
      }
      this.createSegments(context, creature, commands);
    }
    this.updateSegmentPositions(context, commands);
    this.handleSegmentDamage(context, commands);
    this.handleSegmentGrappling(context, commands);
    this.cleanupOrphanedSegments(context, commands);
    return commands;
  }
  hasSegments(context, creature) {
    const hasExistingSegments = context.getAllUnits().some((unit) => unit.meta.segment && unit.meta.parentId === creature.id);
    const hasQueuedSegments = false;
    return hasExistingSegments || hasQueuedSegments;
  }
  createSegments(context, creature, commands) {
    const segmentCount = creature.meta.segmentCount || 4;
    if (segmentCount > 50) {
      console.error(`SegmentedCreatures: Segment count too high: ${segmentCount}`);
      throw new Error("Too many segments requested");
    }
    const initialPath = Array(segmentCount + 2).fill(creature.pos);
    this.pathHistory.set(creature.id, initialPath);
    for (let i = 1;i <= segmentCount; i++) {
      if (i > 100) {
        console.error("SegmentedCreatures: Infinite loop in segment creation!");
        throw new Error("Infinite loop in createSegments");
      }
      let segmentPos = null;
      const attempts = [
        { x: creature.pos.x, y: creature.pos.y + i },
        { x: creature.pos.x - i, y: creature.pos.y },
        { x: creature.pos.x + i, y: creature.pos.y },
        { x: creature.pos.x, y: creature.pos.y - i },
        { x: creature.pos.x + 1, y: creature.pos.y + i },
        { x: creature.pos.x - 1, y: creature.pos.y + i }
      ];
      for (const attempt of attempts) {
        if (this.isValidPosition(context, attempt) && !this.isOccupied(context, attempt)) {
          segmentPos = attempt;
          break;
        }
      }
      let segmentType;
      if (i === segmentCount) {
        segmentType = "tail";
      } else {
        segmentType = "body";
      }
      if (segmentPos) {
        let segmentSprite = creature.sprite;
        if (creature.meta.useCustomSegmentSprites) {
          const baseSprite = creature.sprite.replace("-head", "");
          segmentSprite = `${baseSprite}-${segmentType}`;
        }
        const segment = {
          id: `${creature.id}_segment_${i}`,
          pos: segmentPos,
          intendedMove: { x: 0, y: 0 },
          team: creature.team,
          sprite: segmentSprite,
          state: "idle",
          hp: Math.floor(creature.hp * 0.7),
          maxHp: Math.floor(creature.maxHp * 0.7),
          mass: creature.mass,
          abilities: [],
          tags: ["segment", "noncombatant"],
          meta: {
            segment: true,
            segmentType,
            segmentIndex: i,
            parentId: creature.id,
            facing: creature.meta.facing || "right",
            width: creature.meta.width,
            height: creature.meta.height
          }
        };
        commands.push({
          type: "spawn",
          params: { unit: segment }
        });
      }
    }
  }
  getSegmentSprite(segmentType, parentCreature) {
    if (parentCreature?.meta.useCustomSegmentSprites) {
      const baseSprite = parentCreature.sprite.replace("-head", "");
      switch (segmentType) {
        case "head":
          return `${baseSprite}-head`;
        case "body":
          return `${baseSprite}-body`;
        case "tail":
          return `${baseSprite}-tail`;
        default:
          return `${baseSprite}-body`;
      }
    }
    switch (segmentType) {
      case "head":
        return "worm";
      case "body":
        return "worm";
      case "tail":
        return "worm";
      default:
        return "worm";
    }
  }
  updateSegmentPositions(context, commands) {
    const segmentGroups = this.getSegmentGroups(context);
    const units = context.getAllUnits();
    for (const [parentId, segments] of segmentGroups) {
      const parent = units.find((u) => u.id === parentId);
      if (!parent || !parent.meta.segmented)
        continue;
      let pathHistory = this.pathHistory.get(parentId) || [];
      pathHistory.unshift({ ...parent.pos });
      const maxPathLength = (parent.meta.segmentCount || 4) + 5;
      if (pathHistory.length > maxPathLength) {
        pathHistory = pathHistory.slice(0, maxPathLength);
      }
      this.pathHistory.set(parentId, pathHistory);
      segments.forEach((segment, index) => {
        const pathIndex = segment.meta.segmentIndex || index + 1;
        if (pathIndex < pathHistory.length) {
          const targetPos = pathHistory[pathIndex];
          if (segment.pos.x !== targetPos.x || segment.pos.y !== targetPos.y) {
            const dx = targetPos.x - segment.pos.x;
            const dy = targetPos.y - segment.pos.y;
            commands.push({
              type: "move",
              params: {
                unitId: segment.id,
                dx,
                dy
              }
            });
          }
        }
      });
    }
  }
  getSegmentGroups(context) {
    const groups = new Map;
    const units = context.getAllUnits();
    units.filter((unit) => unit.meta.segment && unit.meta.parentId).forEach((segment) => {
      const parentId = segment.meta.parentId;
      if (!groups.has(parentId)) {
        groups.set(parentId, []);
      }
      groups.get(parentId).push(segment);
    });
    groups.forEach((segments) => {
      segments.sort((a, b) => (a.meta.segmentIndex || 0) - (b.meta.segmentIndex || 0));
    });
    return groups;
  }
  cleanupOrphanedSegments(context, commands) {
    const orphanedSegments = context.getAllUnits().filter((unit) => unit.meta.segment && unit.meta.parentId && !context.getAllUnits().some((parent) => parent.id === unit.meta.parentId));
    if (orphanedSegments.length > 0) {
      for (const segment of orphanedSegments) {
        if (segment.meta.parentId) {
          this.pathHistory.delete(segment.meta.parentId);
        }
        commands.push({
          type: "remove",
          params: { unitId: segment.id }
        });
      }
    }
  }
  handleSegmentDamage(context, commands) {
    context.getAllUnits().filter((unit) => unit.meta.segment).forEach((segment) => {
      if (segment.meta.damageTaken && segment.meta.parentId) {
        const parent = context.getAllUnits().find((u) => u.id === segment.meta.parentId);
        if (parent) {
          const transferDamage = Math.floor(segment.meta.damageTaken * 0.5);
          if (transferDamage > 0) {
            commands.push({
              type: "damage",
              params: {
                targetId: parent.id,
                amount: transferDamage,
                aspect: "physical",
                sourceId: "segment_transfer"
              }
            });
            commands.push({
              type: "particle",
              params: {
                particle: {
                  pos: { x: parent.pos.x * 8 + 4, y: parent.pos.y * 8 + 4 },
                  vel: { x: 0, y: -0.5 },
                  radius: 2,
                  color: "#FF0000",
                  lifetime: 15,
                  type: "pain"
                }
              }
            });
          }
          segment.meta.damageTaken = undefined;
        }
      }
      if (segment.hp <= 0 && segment.meta.segmentIndex) {
        const adjacentSegments = context.getAllUnits().filter((u) => u.meta.segment && u.meta.parentId === segment.meta.parentId && Math.abs((u.meta.segmentIndex || 0) - segment.meta.segmentIndex) === 1);
        adjacentSegments.forEach((adj) => {
          if (adj.id) {
            commands.push({
              type: "damage",
              params: {
                unitId: adj.id,
                damage: 5,
                source: "segment_damage"
              }
            });
          }
        });
      }
    });
  }
  handleSegmentGrappling(context, commands) {
    const units = context.getAllUnits();
    units.filter((unit) => unit.meta.segment).forEach((segment) => {
      if (segment.meta.grappled || segment.meta.pinned) {
        const parent = units.find((u) => u.id === segment.meta.parentId);
        if (parent) {
          const grappledSegments = units.filter((u) => u.meta.segment && u.meta.parentId === parent.id && (u.meta.grappled || u.meta.pinned)).length;
          const speedPenalty = Math.min(0.8, grappledSegments * 0.2);
          const originalSpeed = parent.meta.originalSpeed || parent.meta.moveSpeed || 1;
          commands.push({
            type: "meta",
            params: {
              unitId: parent.id,
              meta: {
                segmentSlowdown: speedPenalty,
                originalSpeed,
                moveSpeed: originalSpeed * (1 - speedPenalty)
              }
            }
          });
          if (segment.meta.segmentIndex === 1 && segment.meta.pinned) {
            commands.push({
              type: "meta",
              params: {
                unitId: parent.id,
                meta: {
                  stunned: true
                }
              }
            });
            commands.push({
              type: "halt",
              params: { unitId: parent.id }
            });
          }
        }
      }
    });
    units.filter((unit) => unit.meta.segmented).forEach((creature) => {
      const grappledSegments = units.filter((u) => u.meta.segment && u.meta.parentId === creature.id && (u.meta.grappled || u.meta.pinned)).length;
      if (grappledSegments === 0 && creature.meta.segmentSlowdown) {
        commands.push({
          type: "meta",
          params: {
            unitId: creature.id,
            meta: {
              segmentSlowdown: undefined,
              moveSpeed: creature.meta.originalSpeed || 1,
              originalSpeed: undefined,
              stunned: false
            }
          }
        });
      }
    });
  }
  isValidPosition(context, pos) {
    return pos.x >= 0 && pos.x < context.getFieldWidth() && pos.y >= 0 && pos.y < context.getFieldHeight();
  }
  isOccupied(context, pos) {
    return context.getAllUnits().some((unit) => unit.pos.x === pos.x && unit.pos.y === pos.y);
  }
}

// src/rules/grappling_physics.ts
init_rule();

class GrapplingPhysics extends Rule {
  grappleLines = new Map;
  constructor() {
    super();
  }
  execute(context) {
    const commands = [];
    this.handleGrappleCollisions(context, commands);
    this.updateGrappleLines(context, commands);
    this.applyPinningEffects(context, commands);
    this.cleanupExpiredGrapples(context, commands);
    return commands;
  }
  handleGrappleCollisions(context, commands) {
    const allUnits = context.getAllUnits();
    for (const unit of allUnits) {
      if (unit.meta.grappleHit) {
        this.processGrappleHit(context, unit, commands);
      }
    }
  }
  processGrappleHit(context, hitUnit, commands) {
    if (hitUnit.meta.grappleHit) {
      const grapplerID = hitUnit.meta.grapplerID || "unknown";
      const grappler = context.findUnitById(grapplerID);
      const grapplerPos = grappler?.pos || hitUnit.meta.grappleOrigin || hitUnit.pos;
      if (grapplerPos) {
        const lineID = `${grapplerID}_${hitUnit.id}`;
        const distance = this.calculateDistance(grapplerPos, hitUnit.pos);
        this.grappleLines.set(lineID, {
          grapplerID,
          targetID: hitUnit.id,
          startPos: { ...grapplerPos },
          endPos: { ...hitUnit.pos },
          length: distance,
          taut: true,
          pinned: false,
          duration: hitUnit.meta.pinDuration || 60
        });
        commands.push({
          type: "meta",
          params: {
            unitId: hitUnit.id,
            meta: {
              grappled: true,
              grappledBy: grapplerID,
              grappledDuration: hitUnit.meta.pinDuration || 60,
              tetherPoint: grapplerPos,
              grappleHit: false
            }
          }
        });
        if (grappler) {
          commands.push({
            type: "meta",
            params: {
              unitId: grappler.id,
              meta: {
                grapplingTarget: hitUnit.id
              }
            }
          });
        }
        if (hitUnit.meta.segmented) {
          const firstSegment = context.getAllUnits().find((u) => u.meta.segment && u.meta.parentId === hitUnit.id && u.meta.segmentIndex === 1);
          if (firstSegment && firstSegment.hp > 0) {
            const damage = 5;
            commands.push({
              type: "damage",
              params: {
                targetId: firstSegment.id,
                amount: damage
              }
            });
            commands.push({
              type: "meta",
              params: {
                unitId: firstSegment.id,
                meta: {
                  pinned: true,
                  pinDuration: 30
                }
              }
            });
          }
        }
        const targetMass = hitUnit.mass || 1;
        if (targetMass > 30) {
          commands.push({
            type: "meta",
            params: {
              unitId: hitUnit.id,
              meta: {
                pinned: true,
                movementPenalty: 1
              }
            }
          });
        } else {
          commands.push({
            type: "meta",
            params: {
              unitId: hitUnit.id,
              meta: {
                movementPenalty: 0.5
              }
            }
          });
        }
      }
    }
  }
  updateGrappleLines(context, commands) {
    for (const [lineID, grappleLine] of this.grappleLines.entries()) {
      const grappler = context.findUnitById(grappleLine.grapplerID);
      const target = context.findUnitById(grappleLine.targetID);
      if (!grappler || !target || grappler.hp <= 0 || target.hp <= 0) {
        this.removeGrappleLine(context, lineID);
        continue;
      }
      grappleLine.startPos = { ...grappler.pos };
      grappleLine.endPos = { ...target.pos };
      const currentDistance = this.calculateDistance(grappler.pos, target.pos);
      const maxDistance = grappleLine.length + 2;
      const releaseDistance = 0.5;
      if (currentDistance < releaseDistance) {
        this.grappleLines.delete(lineID);
        commands.push({
          type: "meta",
          params: {
            unitId: target.id,
            meta: {
              grappled: false,
              grappledBy: undefined,
              grappledDuration: 0,
              tetherPoint: undefined,
              movementPenalty: 0,
              pinned: false
            }
          }
        });
        continue;
      }
      grappleLine.taut = currentDistance >= grappleLine.length;
      const targetMass = target.mass || 1;
      if (targetMass > 30) {
        commands.push({
          type: "meta",
          params: {
            unitId: target.id,
            meta: {
              pinned: true,
              movementPenalty: 1
            }
          }
        });
      } else {
        if (!target.meta.movementPenalty) {
          commands.push({
            type: "meta",
            params: {
              unitId: target.id,
              meta: {
                movementPenalty: 0.5
              }
            }
          });
        }
      }
      if (grappleLine.taut && currentDistance > releaseDistance) {
        this.applyTautEffects(context, grappler, target, grappleLine, commands);
      }
      grappleLine.duration--;
      if (target.meta.grappledDuration) {
        commands.push({
          type: "meta",
          params: {
            unitId: target.id,
            meta: {
              grappledDuration: (target.meta.grappledDuration || 1) - 1
            }
          }
        });
      }
    }
    this.renderGrappleLines(context, commands);
  }
  applyTautEffects(context, grappler, target, _grappleLine, commands) {
    commands.push({
      type: "pull",
      params: {
        grapplerId: grappler.id,
        targetId: target.id,
        force: 0.3
      }
    });
    const targetMass = target.mass || 1;
    if (targetMass > 30 && !target.meta.pinned) {
      commands.push({
        type: "meta",
        params: {
          unitId: target.id,
          meta: {
            pinned: true,
            movementPenalty: 1
          }
        }
      });
    }
  }
  applyPinningEffects(context, commands) {
    for (const unit of context.getAllUnits()) {
      if (!unit.meta)
        continue;
      if (unit.meta.grappled && unit.meta.grappledDuration > 0) {
        if (unit.meta.movementPenalty) {
          unit.intendedMove.x *= 1 - unit.meta.movementPenalty;
          unit.intendedMove.y *= 1 - unit.meta.movementPenalty;
        }
      } else if (unit.meta.grappled && unit.meta.grappledDuration <= 0) {
        const wasPinned = unit.meta.pinned;
        this.removeGrappleFromUnit(unit);
        if (wasPinned && (unit.mass || 1) > 30) {
          commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: { pinned: true }
            }
          });
        }
      }
      if (unit.meta.pinned && unit.meta.pinDuration > 0) {
        commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              stunned: true,
              pinDuration: unit.meta.pinDuration - 1
            }
          }
        });
        commands.push({
          type: "halt",
          params: { unitId: unit.id }
        });
      } else if (unit.meta.pinned && !unit.meta.pinDuration) {
        if ((unit.mass || 1) > 30 && unit.meta.grappled) {
          commands.push({
            type: "halt",
            params: { unitId: unit.id }
          });
        } else {
          this.removePinFromUnit(unit);
        }
      }
    }
  }
  cleanupExpiredGrapples(context, commands) {
    const expiredLines = [];
    for (const [lineID, grappleLine] of this.grappleLines.entries()) {
      if (grappleLine.duration <= 0) {
        expiredLines.push(lineID);
        const target = context.findUnitById(grappleLine.targetID);
        if (target) {
          this.removeGrappleFromUnit(target);
        }
      }
    }
    expiredLines.forEach((lineID) => this.grappleLines.delete(lineID));
  }
  renderGrappleLines(context, commands) {
    for (const grappleLine of this.grappleLines.values()) {
      const numSegments = Math.floor(grappleLine.length) + 2;
      for (let i = 1;i < numSegments; i++) {
        const t = i / numSegments;
        const x = grappleLine.startPos.x + (grappleLine.endPos.x - grappleLine.startPos.x) * t;
        const y = grappleLine.startPos.y + (grappleLine.endPos.y - grappleLine.startPos.y) * t;
        const sag = Math.sin(t * Math.PI) * (grappleLine.taut ? 0.1 : 0.3);
        commands.push({
          type: "particle",
          params: {
            particle: {
              pos: { x: x * 8, y: (y + sag) * 8 },
              vel: { x: 0, y: 0 },
              radius: grappleLine.taut ? 0.8 : 0.5,
              color: grappleLine.pinned ? "#DD4400" : "#AA6600",
              lifetime: 100,
              type: "grapple_line"
            }
          }
        });
      }
    }
  }
  removeGrappleLine(context, lineID) {
    const grappleLine = this.grappleLines.get(lineID);
    if (grappleLine) {
      const target = context.findUnitById(grappleLine.targetID);
      if (target) {
        this.removeGrappleFromUnit(target);
      }
      this.grappleLines.delete(lineID);
    }
  }
  removeGrappleFromUnit(unit) {
    if (unit.meta) {
      delete unit.meta.grappled;
      delete unit.meta.grappledBy;
      delete unit.meta.grappledDuration;
      delete unit.meta.movementPenalty;
    }
  }
  removePinFromUnit(unit) {
    if (unit.meta) {
      delete unit.meta.pinned;
      delete unit.meta.pinDuration;
      delete unit.meta.stunned;
    }
  }
  calculateDistance(pos1, pos2) {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  clampToField(context, unit) {
    const newX = Math.max(0, Math.min(context.getFieldWidth() - 1, unit.pos.x));
    const newY = Math.max(0, Math.min(context.getFieldHeight() - 1, unit.pos.y));
    unit.pos.x = newX;
    unit.pos.y = newY;
  }
}

// src/rules/biome_effects.ts
init_rule();

class BiomeEffects extends Rule {
  activeEvents = new Map;
  constructor() {
    super();
  }
  static winterStormCommands() {
    return [
      { type: "weather", params: { weatherType: "winter" } },
      { type: "temperature", params: { value: -5 } }
    ];
  }
  static endWinterCommands() {
    return [
      { type: "weather", params: { weatherType: "clear" } },
      { type: "temperature", params: { value: 20 } }
    ];
  }
  static sandstormCommands(duration = 200, intensity = 0.8) {
    return [
      {
        type: "weather",
        params: { weatherType: "sandstorm", duration, intensity }
      }
    ];
  }
  static createWinterStorm(sim) {
    sim.winterActive = true;
    if (sim.temperatureField) {
      for (let x = 0;x < sim.fieldWidth; x++) {
        for (let y = 0;y < sim.fieldHeight; y++) {
          sim.temperatureField.set(x, y, -5);
        }
      }
    }
  }
  static endWinterStorm(sim) {
    sim.winterActive = false;
    if (sim.temperatureField) {
      for (let x = 0;x < sim.fieldWidth; x++) {
        for (let y = 0;y < sim.fieldHeight; y++) {
          sim.temperatureField.set(x, y, 20);
        }
      }
    }
  }
  static triggerSandstorm(sim, duration = 200, intensity = 0.8) {
    sim.sandstormActive = true;
    sim.sandstormDuration = duration;
    sim.sandstormIntensity = intensity;
  }
  biomes = [
    {
      name: "winter",
      temperatureRange: [-20, 5],
      humidityRange: [0, 1],
      particles: {
        type: "snow",
        color: "#FFFFFF",
        frequency: 5,
        count: 3,
        properties: {
          vel: { x: 0, y: 0.15 },
          radius: 0.25,
          lifetime: 200,
          z: 5
        }
      },
      statusEffects: [
        {
          condition: (temp) => temp < 0,
          effectType: "freeze",
          intensity: 0.8,
          duration: 60
        }
      ]
    },
    {
      name: "desert",
      temperatureRange: [25, 50],
      humidityRange: [0, 0.3],
      particles: {
        type: "heat_shimmer",
        color: "#FFA500",
        frequency: 3,
        count: 8,
        properties: {
          vel: { x: 0, y: -0.1 },
          radius: 0.15,
          lifetime: 150,
          z: 3
        }
      },
      statusEffects: [
        {
          condition: (temp) => temp > 35,
          effectType: "heat_stress",
          intensity: 0.2,
          duration: 40
        }
      ],
      events: [
        {
          type: "sandstorm",
          triggerChance: 0.001,
          duration: [100, 300],
          effects: {
            visibility: 0.5,
            damage: 2,
            particleBoost: 5
          }
        }
      ]
    }
  ];
  commands = [];
  execute(context) {
    this.commands = [];
    const sim = context.sim;
    if (sim && sim.weather && sim.weather.current === "rain") {
      const intensity = sim.weather.intensity || 0.5;
      const humidityIncrease = 0.005 * intensity;
      for (let x = 0;x < context.getFieldWidth(); x++) {
        for (let y = 0;y < context.getFieldHeight(); y++) {
          this.commands.push({
            type: "humidity",
            params: {
              x,
              y,
              delta: humidityIncrease
            }
          });
        }
      }
      const allUnits = context.getAllUnits();
      for (const unit of allUnits) {
        if (unit.meta?.onFire) {
          this.commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                onFire: false,
                burnDuration: undefined,
                burnStartTick: undefined
              }
            }
          });
        }
      }
    }
    if (context.isWinterActive()) {
      if (context.getCurrentTick() % 5 === 0) {
        for (let i = 0;i < 3; i++) {
          this.commands.push({
            type: "particle",
            params: {
              particle: {
                id: `snow_${Date.now()}_${i}`,
                type: "snow",
                pos: {
                  x: Math.floor(context.getRandom() * context.getFieldWidth()) * 8,
                  y: 0
                },
                vel: { x: 0, y: 0.15 },
                radius: 0.25,
                color: "#FFFFFF",
                lifetime: 200,
                z: 5,
                landed: false
              }
            }
          });
        }
      }
    }
    if (context.isSandstormActive()) {
      const duration = context.getSandstormDuration();
      if (duration > 0) {
        if (context.getCurrentTick() % 2 === 0) {
          const intensity = context.getSandstormIntensity() || 0.8;
          for (let i = 0;i < 2 * intensity; i++) {
            this.commands.push({
              type: "particle",
              params: {
                particle: {
                  id: `sand_${Date.now()}_${i}`,
                  type: "sand",
                  pos: {
                    x: -10 + context.getRandom() * 10,
                    y: context.getRandom() * context.getFieldHeight() * 8
                  },
                  vel: {
                    x: 2 + context.getRandom() * 3 * intensity,
                    y: (context.getRandom() - 0.5) * 0.5
                  },
                  radius: 0.5 + context.getRandom() * 0.5,
                  color: "#CCAA66",
                  lifetime: 100 + context.getRandom() * 50
                }
              }
            });
          }
        }
      }
    }
    this.processTemperatureEffects(context);
    if (context.isSandstormActive()) {
      this.processSandstormEffects(context);
    }
    return this.commands;
  }
  updateParticlePhysics(context) {
    const particles = context.getParticles();
    const units = context.getAllUnits();
    particles.forEach((particle) => {
      if (particle.type === "snow" && !particle.landed) {
        for (const unit of units) {
          const dx = unit.pos.x - particle.pos.x;
          const dy = unit.pos.y - particle.pos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 1 && !unit.meta.frozen) {
            this.commands.push({
              type: "meta",
              params: {
                unitId: unit.id,
                meta: {
                  frozen: true,
                  frozenDuration: 40,
                  brittle: true,
                  stunned: true
                }
              }
            });
            break;
          }
        }
        if (particle.pos.y >= context.getFieldHeight() - 1) {
          this.commands.push({
            type: "update_projectile",
            params: {
              id: particle.id,
              updates: {
                landed: true,
                pos: {
                  x: particle.pos.x,
                  y: context.getFieldHeight() - 1
                },
                vel: { x: 0, y: 0 }
              }
            }
          });
        }
      }
    });
  }
  processSandstormEffects(context) {
    if (!context.isSandstormActive())
      return;
    const intensity = context.getSandstormIntensity() || 0.8;
    if (context.getCurrentTick() % 5 !== 0)
      return;
    context.getAllUnits().forEach((unit) => {
      const isDesertAdapted = unit.tags?.includes("desert") || unit.type === "grappler" || unit.type === "waterbearer";
      if (!isDesertAdapted && !unit.meta.sandBlinded) {
        this.commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              sandBlinded: true,
              sandSlowed: true,
              accuracy: 0.3,
              slowAmount: 0.5
            }
          }
        });
        if (context.getCurrentTick() % 10 === 0) {
          this.commands.push({
            type: "damage",
            params: {
              targetId: unit.id,
              amount: Math.floor(2 * intensity),
              aspect: "physical"
            }
          });
        }
      }
    });
  }
  processTemperatureEffects(context) {
    const units = context.getAllUnits();
    if (units.length === 0)
      return;
    if (context.isWinterActive()) {
      if (context.getCurrentTick() % 5 === 0) {
        const particles = [];
        for (let i = 0;i < 3; i++) {
          particles.push({
            id: `snow_${context.getCurrentTick()}_${i}`,
            type: "snow",
            pos: {
              x: context.getRandom() * context.getFieldWidth(),
              y: 0
            },
            vel: { x: 0, y: 0.15 },
            radius: 0.25,
            color: "#FFFFFF",
            lifetime: 200,
            z: 5
          });
        }
        this.commands.push({
          type: "particles",
          params: { particles }
        });
      }
    }
    units.forEach((unit) => {
      const temp = context.getTemperatureAt(Math.floor(unit.pos.x), Math.floor(unit.pos.y));
      if (temp <= 0 && !unit.meta.frozen) {
        const metaUpdate = {
          frozen: true,
          frozenDuration: 40,
          brittle: true,
          stunned: true
        };
        this.commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: metaUpdate
          }
        });
        this.commands.push({
          type: "halt",
          params: { unitId: unit.id }
        });
        for (let i = 0;i < 8; i++) {
          const angle = i / 8 * Math.PI * 2;
          this.commands.push({
            type: "particle",
            params: {
              particle: {
                id: `freeze_${Date.now()}_${i}`,
                type: "freeze_impact",
                pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
                vel: {
                  x: Math.cos(angle) * 0.5,
                  y: Math.sin(angle) * 0.5
                },
                radius: 1,
                color: "#AADDFF",
                lifetime: 20
              }
            }
          });
        }
      } else if (temp > 0 && temp <= 5 && !unit.meta.chilled) {
        this.commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              chilled: true,
              chilledDuration: 20,
              slowAmount: 0.5
            }
          }
        });
      } else if (temp > 0 && unit.meta.frozen) {
        this.commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              frozen: false,
              brittle: false,
              stunned: false
            }
          }
        });
      }
    });
  }
  sampleEnvironmentalConditions(context) {
    const samples = [];
    for (let x = 0;x < context.getFieldWidth(); x += 4) {
      for (let y = 0;y < context.getFieldHeight(); y += 4) {
        const temp = this.getTemperatureAtPosition(context, x, y);
        const humidity = this.getHumidityAtPosition(context, x, y);
        samples.push({ pos: { x, y }, temp, humidity });
      }
    }
    return samples;
  }
  getTemperatureAtPosition(context, x, y) {
    const nearbyUnits = context.getAllUnits().filter((unit) => Math.abs(unit.pos.x - x) <= 2 && Math.abs(unit.pos.y - y) <= 2);
    let baseTemp = 20;
    for (const unit of nearbyUnits) {
      if (unit.meta?.temperature) {
        baseTemp = unit.meta.temperature;
      } else if (unit.meta?.winterActive) {
        baseTemp = -5;
      } else if (unit.meta?.desertActive) {
        baseTemp = 35;
      }
    }
    return baseTemp;
  }
  getHumidityAtPosition(context, x, y) {
    const nearbyUnits = context.getAllUnits().filter((unit) => Math.abs(unit.pos.x - x) <= 2 && Math.abs(unit.pos.y - y) <= 2);
    let baseHumidity = 0.5;
    for (const unit of nearbyUnits) {
      if (unit.meta?.humidity) {
        baseHumidity = unit.meta.humidity;
      } else if (unit.meta?.desertActive) {
        baseHumidity = 0.1;
      }
    }
    return baseHumidity;
  }
  isBiomeActive(biome, conditions) {
    const isActive = conditions.some((sample) => {
      const tempMatch = sample.temp >= biome.temperatureRange[0] && sample.temp <= biome.temperatureRange[1];
      if (!biome.humidityRange)
        return tempMatch;
      const humidityMatch = sample.humidity >= biome.humidityRange[0] && sample.humidity <= biome.humidityRange[1];
      return tempMatch && humidityMatch;
    });
    return isActive;
  }
  processBiomeEffects(context, biome, conditions) {
    if (biome.particles && context.getCurrentTick() % biome.particles.frequency === 0) {
      this.addBiomeParticles(context, biome, conditions);
    }
    if (biome.statusEffects) {
      this.applyBiomeStatusEffects(context, biome, conditions);
    }
    if (biome.events) {
      this.processBiomeEvents(context, biome);
    }
  }
  addBiomeParticles(context, biome, conditions) {
    const { particles } = biome;
    if (!particles)
      return;
    for (let i = 0;i < particles.count; i++) {
      const activeAreas = conditions.filter((c) => c.temp >= biome.temperatureRange[0] && c.temp <= biome.temperatureRange[1]);
      if (activeAreas.length === 0)
        continue;
      const area = activeAreas[Math.floor(context.getRandom() * activeAreas.length)];
      const x = area.pos.x + (context.getRandom() - 0.5) * 8;
      const y = particles.type === "snow" ? 0 : area.pos.y;
      this.commands.push({
        type: "particle",
        params: {
          particle: {
            pos: {
              x: Math.max(0, Math.min(context.getFieldWidth() - 1, x)),
              y
            },
            vel: particles.properties.vel,
            radius: particles.properties.radius,
            lifetime: particles.properties.lifetime,
            color: particles.color,
            z: particles.properties.z,
            type: particles.type,
            ...particles.properties
          }
        }
      });
    }
  }
  applyBiomeStatusEffects(context, biome, conditions) {
    if (context.getCurrentTick() % 20 !== 0)
      return;
    for (const unit of context.getAllUnits()) {
      if (unit.state === "dead")
        continue;
      const temp = this.getTemperatureAtPosition(context, unit.pos.x, unit.pos.y);
      const humidity = this.getHumidityAtPosition(context, unit.pos.x, unit.pos.y);
      for (const effect of biome.statusEffects) {
        if (effect.condition(temp, humidity)) {
          this.applyStatusEffect(context, unit, effect);
        }
      }
    }
  }
  applyStatusEffect(context, unit, effect) {
    switch (effect.effectType) {
      case "freeze":
        if (!unit.meta.frozen && context.getRandom() < effect.intensity) {
          this.commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                frozen: true,
                frozenDuration: effect.duration || 60,
                brittle: true,
                stunned: true
              }
            }
          });
        }
        break;
      case "heat_stress":
        if (context.getCurrentTick() % 8 === 0) {
          this.commands.push({
            type: "applyStatusEffect",
            params: {
              unitId: unit.id,
              effectType: "heat_stress",
              duration: effect.duration || 40,
              intensity: effect.intensity,
              source: "desert_heat"
            }
          });
        }
        break;
    }
  }
  processBiomeEvents(context, biome) {
    for (const event of biome.events) {
      const eventKey = `${biome.name}_${event.type}`;
      if (!this.activeEvents.has(eventKey)) {
        if (context.getRandom() < event.triggerChance) {
          const duration = event.duration[0] + Math.floor(context.getRandom() * (event.duration[1] - event.duration[0]));
          this.activeEvents.set(eventKey, {
            type: event.type,
            duration,
            effects: event.effects,
            startTick: context.getCurrentTick()
          });
        }
      }
    }
  }
  updateEnvironmentalEvents(context) {
    for (const [key, event] of this.activeEvents.entries()) {
      const elapsed = context.getCurrentTick() - event.startTick;
      if (elapsed >= event.duration) {
        this.activeEvents.delete(key);
        continue;
      }
      this.applyEventEffects(context, event);
    }
  }
  applyEventEffects(context, event) {
    if (event.type === "sandstorm") {
      if (context.getCurrentTick() % 2 === 0) {
        for (let i = 0;i < event.effects.particleBoost; i++) {
          this.commands.push({
            type: "particle",
            params: {
              particle: {
                pos: {
                  x: context.getRandom() * context.getFieldWidth(),
                  y: context.getRandom() * context.getFieldHeight()
                },
                vel: { x: (context.getRandom() - 0.5) * 2, y: 0 },
                radius: 0.3,
                lifetime: 60,
                color: "#D2B48C",
                z: 2,
                type: "sand"
              }
            }
          });
        }
      }
      if (context.getCurrentTick() % 40 === 0 && context.getRandom() < 0.2) {
        for (const unit of context.getAllUnits()) {
          if (unit.state !== "dead" && context.getRandom() < 0.3) {
            this.commands.push({
              type: "damage",
              params: {
                targetId: unit.id,
                amount: event.effects.damage,
                sourceId: "sandstorm",
                aspect: "physical"
              }
            });
          }
        }
      }
    }
  }
}

// src/rules/perdurance.ts
init_rule();

class Perdurance extends Rule {
  constructor() {
    super();
  }
  execute(context) {
    const commands = [];
    for (const unit of context.getAllUnits()) {
      if (unit.meta?.pendingDamage) {
        this.processPendingDamage(context, unit, commands);
      }
    }
    return commands;
  }
  processPendingDamage(context, unit, commands) {
    const damage = unit.meta.pendingDamage;
    if (!damage)
      return;
    const damageAmount = damage.amount || 1;
    const damageAspect = damage.aspect || "physical";
    const source = damage.source || "unknown";
    if (this.shouldBlockDamage(context, unit, damageAspect)) {
      commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            pendingDamage: undefined
          }
        }
      });
      return;
    }
    const modifiedAmount = this.modifyDamageAmount(context, unit, damageAmount, damageAspect);
    commands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          pendingDamage: undefined
        }
      }
    });
  }
  modifyDamageAmount(context, target, amount, aspect) {
    const perdurance = target.meta.perdurance;
    let modifiedAmount = amount;
    if (perdurance) {
      switch (perdurance) {
        case "sturdiness":
          if (modifiedAmount > 1) {
            modifiedAmount = 1;
          }
          break;
        case "swarm":
          break;
      }
    }
    if (target.meta.brittle) {
      modifiedAmount *= 2;
    }
    return modifiedAmount;
  }
  shouldBlockDamage(context, unit, damageAspect) {
    const perdurance = unit.meta.perdurance;
    if (!perdurance)
      return false;
    switch (perdurance) {
      case "spectral":
        return !["radiant", "force", "heat", "shock"].includes(damageAspect || "physical");
      case "undead":
        if (damageAspect === "radiant")
          return false;
        if (damageAspect === "physical" || !damageAspect)
          return true;
        return false;
      case "fiendish":
        if (damageAspect === "radiant")
          return false;
        if (damageAspect === "physical" || !damageAspect) {
          return context.getRandom() < 0.5;
        }
        return false;
      case "sturdiness":
        return false;
      case "swarm":
        return false;
      default:
        return false;
    }
  }
}

// src/rules/ambient_behavior.ts
init_rule();

class AmbientBehavior extends Rule {
  execute(context) {
    const commands = [];
    const ambientCreatures = context.getAllUnits().filter((u) => u.meta?.isAmbient && u.hp > 0 && u.team === "neutral");
    for (const creature of ambientCreatures) {
      this.updateAmbientBehavior(context, creature, commands);
    }
    return commands;
  }
  updateAmbientBehavior(context, creature, commands) {
    if (!creature.meta.wanderTarget || this.isNearTarget(creature)) {
      creature.meta.wanderTarget = this.getNewWanderTarget(context, creature);
      creature.meta.lastWanderUpdate = context.getCurrentTick();
    }
    const target = creature.meta.wanderTarget;
    const dx = target.x - creature.pos.x;
    const dy = target.y - creature.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0.5) {
      const speed = 0.3;
      const moveX = dx / distance * speed;
      const moveY = dy / distance * speed;
      commands.push({
        type: "move",
        params: {
          unitId: creature.id,
          x: creature.pos.x + moveX,
          y: creature.pos.y + moveY
        }
      });
    }
    if (context.getRandom() < 0.02) {
      creature.meta.wanderTarget = this.getNewWanderTarget(context, creature);
    }
    if (Math.abs(dx) > 0.1) {
      creature.meta.facing = dx > 0 ? "right" : "left";
    }
    this.handleCuteInteractions(context, creature);
  }
  isNearTarget(creature) {
    if (!creature.meta.wanderTarget)
      return true;
    const target = creature.meta.wanderTarget;
    const dx = target.x - creature.pos.x;
    const dy = target.y - creature.pos.y;
    return Math.sqrt(dx * dx + dy * dy) < 1;
  }
  getNewWanderTarget(context, creature) {
    const margin = 3;
    const maxX = context.getFieldWidth() - margin;
    const maxY = context.getFieldHeight() - margin;
    const centerBias = 0.7;
    const centerX = context.getFieldWidth() / 2;
    const centerY = context.getFieldHeight() / 2;
    let targetX, targetY;
    if (context.getRandom() < centerBias) {
      const radius = Math.min(context.getFieldWidth(), context.getFieldHeight()) * 0.3;
      const angle = context.getRandom() * 2 * Math.PI;
      targetX = centerX + Math.cos(angle) * radius * context.getRandom();
      targetY = centerY + Math.sin(angle) * radius * context.getRandom();
    } else {
      targetX = margin + context.getRandom() * (maxX - margin);
      targetY = margin + context.getRandom() * (maxY - margin);
    }
    return {
      x: Math.max(margin, Math.min(maxX, targetX)),
      y: Math.max(margin, Math.min(maxY, targetY))
    };
  }
  handleCuteInteractions(context, creature) {
    const nearbyAnimals = context.getAllUnits().filter((other) => other.id !== creature.id && other.meta?.isAmbient && other.hp > 0 && this.getDistance(creature.pos, other.pos) < 3);
    if (nearbyAnimals.length > 0 && context.getRandom() < 0.05) {
      const friend = nearbyAnimals[0];
      if (creature.type === friend.type) {
        creature.meta.wanderTarget = {
          x: friend.pos.x + (context.getRandom() - 0.5) * 2,
          y: friend.pos.y + (context.getRandom() - 0.5) * 2
        };
      }
    }
    if (creature.type.includes("squirrel") && context.getRandom() < 0.01) {
      const treeSpot = this.findNearestTreeSpot(context, creature.pos);
      if (treeSpot) {
        creature.meta.wanderTarget = treeSpot;
      }
    }
    if (creature.type === "bird" && context.getRandom() < 0.005) {
      creature.meta.perchTime = context.getCurrentTick() + 50;
      creature.meta.wanderTarget = creature.pos;
    }
    if (creature.meta.perchTime && context.getCurrentTick() > creature.meta.perchTime) {
      delete creature.meta.perchTime;
      creature.meta.wanderTarget = this.getNewWanderTarget(context, creature);
    }
  }
  findNearestTreeSpot(context, pos) {
    const centerX = context.getFieldWidth() / 2;
    const centerY = context.getFieldHeight() / 2;
    return {
      x: centerX + (context.getRandom() - 0.5) * context.getFieldWidth() * 0.5,
      y: centerY + (context.getRandom() - 0.5) * context.getFieldHeight() * 0.5
    };
  }
  getDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// src/rules/ambient_spawning.ts
init_rule();
class AmbientSpawning extends Rule {
  lastSpawnTick = 0;
  spawnInterval = 100;
  execute(context) {
    const commands = [];
    if (context.getCurrentTick() - this.lastSpawnTick < this.spawnInterval)
      return commands;
    const allUnits = context.getAllUnits();
    const teams = new Set(allUnits.filter((u) => u.hp > 0).map((u) => u.team));
    if (teams.has("friendly") && teams.has("hostile")) {
      return commands;
    }
    if (allUnits.length > 20) {
      return commands;
    }
    const biome = this.detectBiome(context);
    const cuteAnimals = this.getCuteAnimalsForBiome(biome);
    if (cuteAnimals.length === 0) {
      return commands;
    }
    const currentCuteCount = context.getAllUnits().filter((u) => cuteAnimals.includes(u.type) && u.hp > 0).length;
    if (currentCuteCount < 10) {
      this.spawnCuteAnimal(context, cuteAnimals, biome, commands);
    }
    this.lastSpawnTick = context.getCurrentTick();
    return commands;
  }
  detectBiome(context) {
    const background = context.getSceneBackground();
    if (background.includes("desert") || background.includes("sand")) {
      return "desert";
    } else if (background.includes("snow") || background.includes("arctic") || background.includes("winter")) {
      return "arctic";
    } else if (background.includes("forest") || background.includes("tree")) {
      return "forest";
    } else if (background.includes("arena") || background.includes("test") || background.includes("battle")) {
      return "none";
    }
    return "forest";
  }
  getCuteAnimalsForBiome(biome) {
    switch (biome) {
      case "forest":
        return ["squirrel", "forest-squirrel", "bird"];
      case "desert":
        return ["sand-ant"];
      case "arctic":
        return ["penguin"];
      case "none":
        return [];
      default:
        return ["squirrel", "bird"];
    }
  }
  spawnCuteAnimal(context, animalTypes, biome, commands) {
    const animalType = animalTypes[Math.floor(context.getRandom() * animalTypes.length)];
    try {
      const animalData = Encyclopaedia.unit(animalType);
      if (!animalData)
        return;
      const spawnPos = this.getEdgeSpawnPosition(context);
      const cuteAnimal = {
        ...animalData,
        id: `${animalType}_${context.getCurrentTick()}_${Math.floor(context.getRandom() * 1000)}`,
        pos: spawnPos,
        team: "neutral",
        meta: {
          ...animalData.meta,
          isAmbient: true,
          spawnTick: context.getCurrentTick(),
          wanderTarget: this.getRandomWanderTarget(context)
        }
      };
      commands.push({
        type: "spawn",
        params: { unit: cuteAnimal }
      });
      commands.push({
        type: "effect",
        params: {
          type: "gentle-spawn",
          x: spawnPos.x,
          y: spawnPos.y,
          color: "#90EE90"
        }
      });
    } catch (e) {}
  }
  getEdgeSpawnPosition(context) {
    const edge = Math.floor(context.getRandom() * 4);
    const margin = 2;
    switch (edge) {
      case 0:
        return { x: context.getRandom() * context.getFieldWidth(), y: margin };
      case 1:
        return {
          x: context.getFieldWidth() - margin,
          y: context.getRandom() * context.getFieldHeight()
        };
      case 2:
        return {
          x: context.getRandom() * context.getFieldWidth(),
          y: context.getFieldHeight() - margin
        };
      case 3:
        return { x: margin, y: context.getRandom() * context.getFieldHeight() };
      default:
        return { x: margin, y: margin };
    }
  }
  getRandomWanderTarget(context) {
    return {
      x: context.getRandom() * context.getFieldWidth(),
      y: context.getRandom() * context.getFieldHeight()
    };
  }
}

// src/rules/status_effects.ts
init_rule();

class StatusEffects extends Rule {
  commands = [];
  constructor() {
    super();
  }
  execute(context) {
    this.commands = [];
    for (const unit of context.getAllUnits()) {
      if (unit.meta.chillTrigger) {
        this.applyChillFromTrigger(context, unit);
      }
      if (unit.meta.statusEffects && unit.meta.statusEffects.length > 0) {
        this.updateStatusEffects(context, unit);
        this.applyStatusEffectMechanics(context, unit);
      } else if (unit.meta.chilled || unit.meta.stunned) {
        this.applyStatusEffectMechanics(context, unit);
      }
    }
    return this.commands;
  }
  applyChillFromTrigger(context, unit) {
    const trigger = unit.meta.chillTrigger;
    const centerPos = trigger.position || unit.pos;
    const radius = trigger.radius || 2;
    const affectedUnits = context.getAllUnits().filter((target) => {
      const distance = Math.sqrt(Math.pow(target.pos.x - centerPos.x, 2) + Math.pow(target.pos.y - centerPos.y, 2));
      return distance <= radius;
    });
    affectedUnits.forEach((target) => {
      this.commands.push({
        type: "applyStatusEffect",
        params: {
          unitId: target.id,
          effect: {
            type: "chill",
            duration: 30,
            intensity: 0.5,
            source: unit.id
          }
        }
      });
    });
    this.commands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          chillTrigger: undefined
        }
      }
    });
  }
  updateStatusEffects(context, unit) {
    const statusEffects = unit.meta.statusEffects || [];
    const updatedEffects = statusEffects.map((effect) => ({
      ...effect,
      duration: effect.duration - 1
    })).filter((effect) => effect.duration > 0);
    this.commands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          statusEffects: updatedEffects.length > 0 ? updatedEffects : undefined
        }
      }
    });
  }
  applyStatusEffectMechanics(context, unit) {
    const statusEffects = unit.meta.statusEffects || [];
    statusEffects.forEach((effect) => {
      switch (effect.type) {
        case "chill":
          this.commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                chilled: true,
                chillIntensity: effect.intensity
              }
            }
          });
          break;
        case "stun":
          this.commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: { stunned: true }
            }
          });
          break;
        case "burn":
          if (context.getCurrentTick() % 8 === 0) {
            this.commands.push({
              type: "damage",
              params: {
                targetId: unit.id,
                amount: effect.intensity,
                aspect: "heat",
                sourceId: effect.source || "burn"
              }
            });
          }
          break;
      }
    });
    if (statusEffects.length === 0 && (unit.meta.chilled || unit.meta.stunned)) {
      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            chilled: undefined,
            chillIntensity: undefined,
            stunned: undefined
          }
        }
      });
    }
  }
}

// src/core/simulator.ts
init_rng();

// src/core/tick_context.ts
class TickContextImpl {
  sim;
  unitCache = null;
  constructor(sim) {
    this.sim = sim;
  }
  clearCache() {
    this.unitCache = null;
  }
  findUnitsInRadius(center, radius) {
    if (this.sim.gridPartition) {
      return this.sim.gridPartition.getNearby(center.x, center.y, radius);
    }
    return this.getAllUnits().filter((u) => {
      const dx = u.pos.x - center.x;
      const dy = u.pos.y - center.y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }
  findUnitById(id) {
    return this.getAllUnits().find((unit) => unit.id === id);
  }
  getAllUnits() {
    if (!this.unitCache) {
      this.unitCache = this.sim.proxyManager.getAllProxies();
    }
    return this.unitCache;
  }
  getUnitsInTeam(team) {
    return this.getAllUnits().filter((unit) => unit.team === team);
  }
  getUnitsWithAbilities() {
    return this.getAllUnits().filter((unit) => unit.abilities && unit.abilities.length > 0);
  }
  getUnitsWithState(state) {
    return this.getAllUnits().filter((unit) => unit.state === state);
  }
  getUnitsAt(pos) {
    return this.getAllUnits().filter((unit) => Math.floor(unit.pos.x) === Math.floor(pos.x) && Math.floor(unit.pos.y) === Math.floor(pos.y));
  }
  getUnitsInRect(x, y, width, height) {
    return this.getAllUnits().filter((unit) => unit.pos.x >= x && unit.pos.x < x + width && unit.pos.y >= y && unit.pos.y < y + height);
  }
  queueCommand(command) {
    if (!this.sim.queuedCommands) {
      this.sim.queuedCommands = [];
    }
    this.sim.queuedCommands.push(command);
  }
  queueEvent(event) {
    if (!this.sim.queuedEvents) {
      this.sim.queuedEvents = [];
    }
    if (!event.meta) {
      event.meta = {};
    }
    if (event.meta.tick === undefined) {
      event.meta.tick = this.sim.ticks;
    }
    this.sim.queuedEvents.push(event);
  }
  getRandom() {
    return this.sim.constructor.rng?.random() || Math.random();
  }
  getCurrentTick() {
    return this.sim.ticks;
  }
  getFieldWidth() {
    return this.sim.fieldWidth;
  }
  getFieldHeight() {
    return this.sim.fieldHeight;
  }
  getProjectiles() {
    return this.sim.projectiles || [];
  }
  getParticles() {
    return this.sim.particles || [];
  }
  getTemperatureAt(x, y) {
    if (this.sim.temperatureField) {
      return this.sim.temperatureField.get(x, y);
    }
    return 20;
  }
  getSceneBackground() {
    return this.sim.sceneBackground || "forest";
  }
  isWinterActive() {
    return this.sim.winterActive || false;
  }
  isSandstormActive() {
    return this.sim.sandstormActive || false;
  }
  getSandstormIntensity() {
    return this.sim.sandstormIntensity || 0;
  }
  getSandstormDuration() {
    return this.sim.sandstormDuration || 0;
  }
  getQueuedEvents() {
    return this.sim.queuedEvents || [];
  }
  getUnitIndex(unitId) {
    return this.sim.proxyManager?.idToIndex?.get(unitId);
  }
  getArrays() {
    const arrays = this.sim.unitArrays;
    return {
      posX: arrays.posX,
      posY: arrays.posY,
      activeIndices: arrays.activeIndices,
      team: arrays.team,
      state: arrays.state,
      unitIds: arrays.unitIds,
      hp: arrays.hp,
      maxHp: arrays.maxHp,
      mass: arrays.mass,
      dmg: arrays.dmg
    };
  }
  getUnitColdData(unitId) {
    return this.sim.unitColdData.get(unitId);
  }
  getUnitColdDataByIndex(index) {
    const arrays = this.sim.unitArrays;
    const unitId = arrays.unitIds[index];
    return this.sim.unitColdData.get(unitId);
  }
  findUnitIndicesInRadius(center, radius) {
    const arrays = this.getArrays();
    const { posX, posY, activeIndices } = arrays;
    const radiusSq = radius * radius;
    const result = [];
    for (const idx of activeIndices) {
      const dx = posX[idx] - center.x;
      const dy = posY[idx] - center.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= radiusSq) {
        result.push(idx);
      }
    }
    return result;
  }
  findUnitIndicesInRect(x, y, width, height) {
    const arrays = this.getArrays();
    const { posX, posY, activeIndices } = arrays;
    const result = [];
    const maxX = x + width;
    const maxY = y + height;
    for (const idx of activeIndices) {
      const px = posX[idx];
      const py = posY[idx];
      if (px >= x && px < maxX && py >= y && py < maxY) {
        result.push(idx);
      }
    }
    return result;
  }
  findUnitIndicesInTeam(team) {
    const arrays = this.getArrays();
    const { team: teamArray, activeIndices } = arrays;
    const result = [];
    const teamCode = team === "friendly" ? 1 : team === "hostile" ? 2 : 0;
    for (const idx of activeIndices) {
      if (teamArray[idx] === teamCode) {
        result.push(idx);
      }
    }
    return result;
  }
  isAbilityForced(unitId, abilityName) {
    const key = `${unitId}:${abilityName}`;
    return this.sim.forcedAbilitiesThisTick?.has(key) || false;
  }
  getActiveUnitIndices() {
    return [...this.getArrays().activeIndices];
  }
  getUnitIndicesWithAbilities() {
    const arrays = this.getArrays();
    const indices = [];
    for (const idx of arrays.activeIndices) {
      const unitId = arrays.unitIds[idx];
      const coldData = this.getUnitColdData(unitId);
      if (coldData?.abilities?.length > 0) {
        indices.push(idx);
      }
    }
    return indices;
  }
  getUnitProxyByIndex(index) {
    return this.sim.proxyManager?.getProxy(index);
  }
}

// src/rules/lightning_storm.ts
init_rule();
class LightningStorm extends Rule {
  commands = [];
  constructor() {
    super();
  }
  execute(context) {
    this.commands = [];
    const sim = context.sim;
    if (!sim?.lightningActive)
      return;
    const currentTick = context.getCurrentTick();
    const strikeInterval = 8;
    if (currentTick % strikeInterval === 0) {
      const seed = currentTick * 31;
      const x = seed % context.getFieldWidth();
      const y = seed * 17 % context.getFieldHeight();
      this.commands.push({
        type: "bolt",
        params: { x, y }
      });
    }
    this.updateLightningEffects(context);
    return this.commands;
  }
  generateLightningStrike(context, targetPos) {
    const strikePos = targetPos || {
      x: Math.floor(context.getRandom() * context.getFieldWidth()),
      y: Math.floor(context.getRandom() * context.getFieldHeight())
    };
    this.createLightningVisuals(context, strikePos);
    this.createEmpBurst(context, strikePos);
    this.boostMechanicalUnits(context, strikePos);
    this.createAtmosphericEffects(context, strikePos);
  }
  createLightningVisuals(context, pos) {
    const pixelX = pos.x * 8 + 4;
    const pixelY = pos.y * 8 + 4;
    for (let i = 0;i < 8; i++) {
      this.commands.push({
        type: "particle",
        params: {
          particle: {
            pos: {
              x: pixelX + (context.getRandom() - 0.5) * 3,
              y: pixelY - i * 4
            },
            vel: { x: 0, y: 0 },
            radius: 1 + context.getRandom() * 2,
            color: i < 2 ? "#FFFFFF" : i < 4 ? "#CCCCFF" : "#8888FF",
            lifetime: 8 + context.getRandom() * 4,
            type: "lightning"
          }
        }
      });
    }
    for (let branch = 0;branch < 4; branch++) {
      const branchAngle = context.getRandom() * Math.PI * 2;
      const branchLength = 2 + context.getRandom() * 3;
      for (let i = 0;i < branchLength; i++) {
        this.commands.push({
          type: "particle",
          params: {
            particle: {
              pos: {
                x: pixelX + Math.cos(branchAngle) * i * 8,
                y: pixelY + Math.sin(branchAngle) * i * 8
              },
              vel: { x: 0, y: 0 },
              radius: 0.5 + context.getRandom(),
              color: "#AAAAFF",
              lifetime: 6 + context.getRandom() * 3,
              type: "lightning_branch"
            }
          }
        });
      }
    }
    for (let i = 0;i < 12; i++) {
      this.commands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: pixelX, y: pixelY },
            vel: {
              x: (context.getRandom() - 0.5) * 2,
              y: (context.getRandom() - 0.5) * 2
            },
            radius: 0.5,
            color: "#CCCCFF",
            lifetime: 15 + context.getRandom() * 10,
            type: "electric_spark"
          }
        }
      });
    }
  }
  createEmpBurst(context, pos) {
    context.queueEvent({
      kind: "aoe",
      source: "lightning",
      target: pos,
      meta: {
        aspect: "emp",
        radius: 3,
        stunDuration: 20,
        amount: 0,
        mechanicalImmune: true
      }
    });
  }
  boostMechanicalUnits(context, pos) {
    const mechanicalUnits = context.getAllUnits().filter((unit) => unit.tags?.includes("mechanical") && Math.abs(unit.pos.x - pos.x) <= 4 && Math.abs(unit.pos.y - pos.y) <= 4 && unit.hp > 0);
    mechanicalUnits.forEach((unit) => {
      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            lightningBoost: true,
            lightningBoostDuration: 60
          }
        }
      });
      if (unit.lastAbilityTick) {
        Object.keys(unit.lastAbilityTick).forEach((abilityName) => {
          let t = context.getCurrentTick();
          const ticksSinceUse = t - (unit.lastAbilityTick[abilityName] || 0);
          const boostAmount = Math.floor(ticksSinceUse * 0.5);
          unit.lastAbilityTick[abilityName] = Math.max(0, (unit.lastAbilityTick[abilityName] || 0) - boostAmount);
        });
      }
      if (unit.tags?.includes("leader") || unit.tags?.includes("engineer")) {
        this.commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: { lightningBoostDuration: 90 }
          }
        });
        this.commands.push({
          type: "particle",
          params: {
            particle: {
              pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
              vel: { x: 0, y: -1 },
              radius: 3,
              color: "#FFFF00",
              lifetime: 30,
              type: "power_surge"
            }
          }
        });
      }
    });
  }
  createAtmosphericEffects(context, pos) {
    const pixelX = pos.x * 8 + 4;
    const pixelY = pos.y * 8 + 4;
    for (let i = 0;i < 16; i++) {
      const angle = i / 16 * Math.PI * 2;
      const radius = 2 + context.getRandom();
      this.commands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: pixelX, y: pixelY },
            vel: {
              x: Math.cos(angle) * 0.5,
              y: Math.sin(angle) * 0.5
            },
            radius,
            color: "#444488",
            lifetime: 20 + context.getRandom() * 15,
            type: "thunder_ring"
          }
        }
      });
    }
    for (let i = 0;i < 6; i++) {
      this.commands.push({
        type: "particle",
        params: {
          particle: {
            pos: {
              x: pixelX + (context.getRandom() - 0.5) * 16,
              y: pixelY + (context.getRandom() - 0.5) * 16
            },
            vel: { x: 0, y: -0.1 },
            radius: 1,
            color: "#6666AA",
            lifetime: 40 + context.getRandom() * 20,
            type: "ozone"
          }
        }
      });
    }
  }
  updateLightningEffects(context) {
    context.getAllUnits().forEach((unit) => {
      if (unit.meta.lightningBoostDuration) {
        this.commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              lightningBoostDuration: unit.meta.lightningBoostDuration - 1
            }
          }
        });
        if (unit.meta.lightningBoostDuration <= 1) {
          this.commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                lightningBoost: undefined,
                lightningBoostDuration: undefined
              }
            }
          });
        }
      }
    });
  }
  static createLightningStorm(sim) {
    sim.lightningActive = true;
    for (let i = 0;i < 8; i++) {
      sim.particles.push({
        pos: {
          x: Simulator.rng.random() * sim.fieldWidth * 8,
          y: Simulator.rng.random() * sim.fieldHeight * 8
        },
        vel: { x: (Simulator.rng.random() - 0.5) * 0.2, y: -0.1 },
        radius: 0.5,
        color: "#333366",
        lifetime: 120 + Simulator.rng.random() * 60,
        type: "storm_cloud"
      });
    }
  }
  static endLightningStorm(sim) {
    sim.lightningActive = false;
  }
}

// src/sim/double_buffer.ts
class SpatialHash {
  cellSize;
  cells = new Map;
  constructor(cellSize = 4) {
    this.cellSize = cellSize;
  }
  clear() {
    this.cells.clear();
  }
  insert(id, x, y) {
    const key = this.getKey(x, y);
    if (!this.cells.has(key)) {
      this.cells.set(key, new Set);
    }
    this.cells.get(key).add(id);
  }
  query(x, y, radius = 1) {
    const results = new Set;
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);
    for (let cx = minX;cx <= maxX; cx++) {
      for (let cy = minY;cy <= maxY; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.cells.get(key);
        if (cell) {
          cell.forEach((id) => results.add(id));
        }
      }
    }
    return Array.from(results);
  }
  getKey(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }
}

// src/core/spatial_queries.ts
class SpatialQueryBatcher {
  radiusQueries = [];
  positionQueries = [];
  collisionQueries = [];
  adjacentQueries = [];
  distanceCache = new Map;
  queryRadius(center, radius, callback, filter) {
    this.radiusQueries.push({
      id: `radius_${this.radiusQueries.length}`,
      center,
      radius,
      filter,
      callback
    });
  }
  queryPosition(pos, callback, excludeUnit) {
    this.positionQueries.push({
      id: `pos_${this.positionQueries.length}`,
      pos,
      excludeUnit,
      callback
    });
  }
  queryCollisions(threshold, callback, filter) {
    this.collisionQueries.push({
      id: `collision_${this.collisionQueries.length}`,
      threshold,
      filter,
      callback
    });
  }
  queryAdjacent(unit, maxDistance, callback, filter) {
    this.adjacentQueries.push({
      id: `adjacent_${this.adjacentQueries.length}`,
      unit,
      maxDistance,
      filter,
      callback
    });
  }
  processQueries(units) {
    this.distanceCache.clear();
    const positionMap = this.buildPositionMap(units);
    for (const query of this.positionQueries) {
      const key = `${Math.round(query.pos.x)},${Math.round(query.pos.y)}`;
      const unitsAtPos = positionMap.get(key) || [];
      const filtered = query.excludeUnit ? unitsAtPos.filter((u) => u !== query.excludeUnit) : unitsAtPos;
      query.callback(filtered.length > 0, filtered);
    }
    for (const query of this.radiusQueries) {
      const unitsInRadius = [];
      const radiusSq = query.radius * query.radius;
      for (const unit of units) {
        const distSq = this.getDistanceSquared(query.center, unit.pos);
        if (distSq <= radiusSq) {
          if (!query.filter || query.filter(unit)) {
            unitsInRadius.push(unit);
          }
        }
      }
      query.callback(unitsInRadius);
    }
    for (const query of this.collisionQueries) {
      const pairs = [];
      const thresholdSq = query.threshold * query.threshold;
      for (let i = 0;i < units.length; i++) {
        for (let j = i + 1;j < units.length; j++) {
          const distSq = this.getDistanceSquaredUnits(units[i], units[j]);
          if (distSq < thresholdSq) {
            if (!query.filter || query.filter(units[i], units[j])) {
              pairs.push([units[i], units[j]]);
            }
          }
        }
      }
      query.callback(pairs);
    }
    for (const query of this.adjacentQueries) {
      const adjacent = [];
      const maxDistSq = query.maxDistance * query.maxDistance;
      for (const other of units) {
        if (other === query.unit)
          continue;
        const distSq = this.getDistanceSquaredUnits(query.unit, other);
        if (distSq <= maxDistSq) {
          if (!query.filter || query.filter(other)) {
            adjacent.push(other);
          }
        }
      }
      query.callback(adjacent);
    }
    this.clearQueries();
  }
  clearQueries() {
    this.radiusQueries = [];
    this.positionQueries = [];
    this.collisionQueries = [];
    this.adjacentQueries = [];
  }
  buildPositionMap(units) {
    const map = new Map;
    for (const unit of units) {
      const positions = this.getUnitPositions(unit);
      for (const pos of positions) {
        const key = `${Math.round(pos.x)},${Math.round(pos.y)}`;
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key).push(unit);
      }
    }
    return map;
  }
  getUnitPositions(unit) {
    if (!unit.meta.huge)
      return [unit.pos];
    return [
      unit.pos,
      { x: unit.pos.x, y: unit.pos.y + 1 },
      { x: unit.pos.x, y: unit.pos.y + 2 },
      { x: unit.pos.x, y: unit.pos.y + 3 }
    ];
  }
  getDistanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }
  getDistanceSquaredUnits(a, b) {
    const key = `${a.id}_${b.id}`;
    const reverseKey = `${b.id}_${a.id}`;
    if (this.distanceCache.has(key)) {
      return this.distanceCache.get(key);
    }
    if (this.distanceCache.has(reverseKey)) {
      return this.distanceCache.get(reverseKey);
    }
    const distSq = this.getDistanceSquared(a.pos, b.pos);
    this.distanceCache.set(key, distSq);
    return distSq;
  }
}

// src/core/target_cache.ts
class TargetCache {
  cache = new Map;
  clear() {
    this.cache.clear();
  }
  initUnit(unitId) {
    this.cache.set(unitId, {
      closestEnemyDist: Infinity,
      closestAllyDist: Infinity,
      nearbyEnemies: [],
      nearbyAllies: []
    });
  }
  updatePair(unitA, unitB, distSq) {
    const dist = Math.sqrt(distSq);
    if (!this.cache.has(unitA.id))
      this.initUnit(unitA.id);
    if (!this.cache.has(unitB.id))
      this.initUnit(unitB.id);
    const dataA = this.cache.get(unitA.id);
    const dataB = this.cache.get(unitB.id);
    if (unitA.state === "dead" || unitB.state === "dead")
      return;
    if (unitA.team !== unitB.team) {
      if (dist < dataA.closestEnemyDist) {
        dataA.closestEnemy = unitB.id;
        dataA.closestEnemyDist = dist;
      }
      if (dist <= 2) {
        dataA.nearbyEnemies.push(unitB.id);
      }
      if (dist < dataB.closestEnemyDist) {
        dataB.closestEnemy = unitA.id;
        dataB.closestEnemyDist = dist;
      }
      if (dist <= 2) {
        dataB.nearbyEnemies.push(unitA.id);
      }
    } else {
      if (dist < dataA.closestAllyDist) {
        dataA.closestAlly = unitB.id;
        dataA.closestAllyDist = dist;
      }
      if (dist <= 5) {
        dataA.nearbyAllies.push(unitB.id);
      }
      if (dist < dataB.closestAllyDist) {
        dataB.closestAlly = unitA.id;
        dataB.closestAllyDist = dist;
      }
      if (dist <= 5) {
        dataB.nearbyAllies.push(unitA.id);
      }
    }
  }
  getTargetData(unitId) {
    return this.cache.get(unitId);
  }
  getClosestEnemy(unitId) {
    return this.cache.get(unitId)?.closestEnemy;
  }
  getClosestAlly(unitId) {
    return this.cache.get(unitId)?.closestAlly;
  }
}

// src/core/spatial_adjacency.ts
class SpatialAdjacency {
  grid = new Map;
  gridWidth;
  gridHeight;
  constructor(fieldWidth, fieldHeight) {
    this.gridWidth = fieldWidth;
    this.gridHeight = fieldHeight;
  }
  buildFromArrays(arrays, activeIndices) {
    this.grid.clear();
    for (const idx of activeIndices) {
      const x = Math.floor(arrays.posX[idx]);
      const y = Math.floor(arrays.posY[idx]);
      const cell = y * this.gridWidth + x;
      if (!this.grid.has(cell)) {
        this.grid.set(cell, []);
      }
      this.grid.get(cell).push(idx);
    }
  }
  processAdjacent(arrays, maxDistSq, callback) {
    for (const [cellKey, indices] of this.grid) {
      const cellY = Math.floor(cellKey / this.gridWidth);
      const cellX = cellKey % this.gridWidth;
      for (let i = 0;i < indices.length; i++) {
        const idxA = indices[i];
        const x1 = arrays.posX[idxA];
        const y1 = arrays.posY[idxA];
        for (let j = i + 1;j < indices.length; j++) {
          const idxB = indices[j];
          const dx = arrays.posX[idxB] - x1;
          const dy = arrays.posY[idxB] - y1;
          const distSq = dx * dx + dy * dy;
          if (distSq <= maxDistSq) {
            callback(idxA, idxB, distSq);
          }
        }
        const neighbors = [
          [cellX + 1, cellY],
          [cellX, cellY + 1],
          [cellX + 1, cellY + 1],
          [cellX - 1, cellY + 1]
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= this.gridWidth || ny >= this.gridHeight)
            continue;
          const neighborCell = ny * this.gridWidth + nx;
          const neighborIndices = this.grid.get(neighborCell);
          if (!neighborIndices)
            continue;
          for (const idxB of neighborIndices) {
            const dx = arrays.posX[idxB] - x1;
            const dy = arrays.posY[idxB] - y1;
            const distSq = dx * dx + dy * dy;
            if (distSq <= maxDistSq) {
              callback(idxA, idxB, distSq);
            }
          }
        }
      }
    }
  }
  getMeleePairs(arrays) {
    const pairs = [];
    const MELEE_RANGE_SQ = 1.5 * 1.5;
    this.processAdjacent(arrays, MELEE_RANGE_SQ, (idxA, idxB, distSq) => {
      if (arrays.team[idxA] !== arrays.team[idxB]) {
        if (arrays.hp[idxA] > 0 && arrays.hp[idxB] > 0) {
          pairs.push([idxA, idxB]);
          pairs.push([idxB, idxA]);
        }
      }
    });
    return pairs;
  }
  getKnockbackPairs(arrays) {
    const pairs = [];
    const KNOCKBACK_RANGE_SQ = 0.75 * 0.75;
    this.processAdjacent(arrays, KNOCKBACK_RANGE_SQ, (idxA, idxB, distSq) => {
      const massA = arrays.mass ? arrays.mass[idxA] : 1;
      const massB = arrays.mass ? arrays.mass[idxB] : 1;
      if (massA > 0 && massB > 0) {
        pairs.push([idxA, idxB]);
      }
    });
    return pairs;
  }
}

// src/core/pairwise_batcher.ts
class PairwiseBatcher {
  intents = [];
  targetCache = new TargetCache;
  spatialAdjacency;
  register(ruleId, callback, maxDistance, filter) {
    this.intents.push({ ruleId, callback, maxDistance, filter });
  }
  process(units, sim) {
    const arrays = sim?.unitArrays;
    if (arrays && sim) {
      this.processVectorized(arrays, sim);
    } else {
      this.processLegacy(units);
    }
  }
  processVectorized(arrays, sim) {
    const capacity = arrays.capacity;
    const activeIndices = [];
    for (let i = 0;i < capacity; i++) {
      if (arrays.active[i] && arrays.state[i] !== 3) {
        activeIndices.push(i);
      }
    }
    const activeCount = activeIndices.length;
    for (let i = 0;i < activeCount; i++) {
      const idxA = activeIndices[i];
      const x1 = arrays.posX[idxA];
      const y1 = arrays.posY[idxA];
      for (let j = i + 1;j < activeCount; j++) {
        const idxB = activeIndices[j];
        const dx = arrays.posX[idxB] - x1;
        const dy = arrays.posY[idxB] - y1;
        const distSq = dx * dx + dy * dy;
        let proxyA = null;
        let proxyB = null;
        let proxiesCreated = false;
        for (const intent of this.intents) {
          if (intent.maxDistance !== undefined) {
            const maxDistSq = intent.maxDistance * intent.maxDistance;
            if (distSq > maxDistSq)
              continue;
          }
          if (!proxiesCreated) {
            proxyA = sim.proxyManager.getProxy(idxA);
            proxyB = sim.proxyManager.getProxy(idxB);
            proxiesCreated = true;
          }
          if (intent.filter && !intent.filter(proxyA, proxyB))
            continue;
          intent.callback(proxyA, proxyB);
          intent.callback(proxyB, proxyA);
        }
      }
    }
    this.intents = [];
  }
  processLegacy(units) {
    this.targetCache.clear();
    for (const unit of units) {
      if (unit.state !== "dead") {
        this.targetCache.initUnit(unit.id);
      }
    }
    for (let i = 0;i < units.length; i++) {
      for (let j = i + 1;j < units.length; j++) {
        const unitA = units[i];
        const unitB = units[j];
        const dx = unitA.pos.x - unitB.pos.x;
        const dy = unitA.pos.y - unitB.pos.y;
        const distSq = dx * dx + dy * dy;
        this.targetCache.updatePair(unitA, unitB, distSq);
        for (const intent of this.intents) {
          if (intent.maxDistance !== undefined) {
            const maxDistSq = intent.maxDistance * intent.maxDistance;
            if (distSq > maxDistSq)
              continue;
          }
          if (intent.filter && !intent.filter(unitA, unitB))
            continue;
          intent.callback(unitA, unitB);
          intent.callback(unitB, unitA);
        }
      }
    }
    this.intents = [];
  }
  getStats() {
    const rules = [...new Set(this.intents.map((i) => i.ruleId))];
    return {
      intentCount: this.intents.length,
      rules
    };
  }
  processSpatialOptimized(arrays, sim, activeIndices) {
    if (!this.spatialAdjacency) {
      this.spatialAdjacency = new SpatialAdjacency(sim.fieldWidth, sim.fieldHeight);
    }
    this.spatialAdjacency.buildFromArrays(arrays, activeIndices);
    for (const intent of this.intents) {
      if (intent.ruleId === "MeleeCombat") {
        const pairs = this.spatialAdjacency.getMeleePairs(arrays);
        for (const [idxA, idxB] of pairs) {
          const proxyA = sim.proxyManager.getProxy(idxA);
          const proxyB = sim.proxyManager.getProxy(idxB);
          if (!intent.filter || intent.filter(proxyA, proxyB)) {
            intent.callback(proxyA, proxyB);
          }
        }
      } else if (intent.ruleId === "Knockback") {
        const pairs = this.spatialAdjacency.getKnockbackPairs(arrays);
        for (const [idxA, idxB] of pairs) {
          const proxyA = sim.proxyManager.getProxy(idxA);
          const proxyB = sim.proxyManager.getProxy(idxB);
          if (!intent.filter || intent.filter(proxyA, proxyB)) {
            intent.callback(proxyA, proxyB);
          }
        }
      } else {
        const maxDistSq = intent.maxDistance ? intent.maxDistance * intent.maxDistance : 100;
        this.spatialAdjacency.processAdjacent(arrays, maxDistSq, (idxA, idxB, distSq) => {
          const proxyA = sim.proxyManager.getProxy(idxA);
          const proxyB = sim.proxyManager.getProxy(idxB);
          if (!intent.filter || intent.filter(proxyA, proxyB)) {
            intent.callback(proxyA, proxyB);
            intent.callback(proxyB, proxyA);
          }
        });
      }
    }
    this.intents = [];
  }
}

// src/sim/unit_arrays.ts
class UnitArrays {
  posX;
  posY;
  intendedMoveX;
  intendedMoveY;
  hp;
  maxHp;
  dmg;
  mass;
  team;
  state;
  active;
  activeCount = 0;
  activeIndices = [];
  unitIds;
  capacity;
  constructor(capacity = 1e4) {
    this.capacity = capacity;
    this.posX = new Float32Array(capacity);
    this.posY = new Float32Array(capacity);
    this.intendedMoveX = new Float32Array(capacity);
    this.intendedMoveY = new Float32Array(capacity);
    this.hp = new Int16Array(capacity);
    this.maxHp = new Int16Array(capacity);
    this.dmg = new Int16Array(capacity);
    this.mass = new Float32Array(capacity);
    this.team = new Int8Array(capacity);
    this.state = new Int8Array(capacity);
    this.active = new Uint8Array(capacity);
    this.unitIds = new Array(capacity);
  }
  addUnit(unit) {
    return this.add(unit);
  }
  add(unit) {
    let index = -1;
    for (let i = 0;i < this.capacity; i++) {
      if (this.active[i] === 0) {
        index = i;
        break;
      }
    }
    if (index === -1) {
      console.error(`UnitArrays: Capacity exceeded! Already have ${this.activeCount} units`);
      const unitCounts = {};
      for (let i = 0;i < this.capacity; i++) {
        if (this.active[i] === 1 && this.unitIds[i]) {
          const type = this.unitIds[i].split("_")[0];
          unitCounts[type] = (unitCounts[type] || 0) + 1;
        }
      }
      console.error("Unit types:", unitCounts);
      return -1;
    }
    this.posX[index] = unit.pos.x;
    this.posY[index] = unit.pos.y;
    this.intendedMoveX[index] = unit.intendedMove?.x || 0;
    this.intendedMoveY[index] = unit.intendedMove?.y || 0;
    this.hp[index] = unit.hp;
    this.maxHp[index] = unit.maxHp;
    this.dmg[index] = unit.dmg || 1;
    this.mass[index] = unit.mass || 1;
    this.team[index] = this.teamToInt(unit.team);
    this.state[index] = this.stateToInt(unit.state);
    this.active[index] = 1;
    this.unitIds[index] = unit.id;
    this.activeCount++;
    this.activeIndices.push(index);
    return index;
  }
  remove(index) {
    if (index < 0 || index >= this.capacity)
      return;
    this.active[index] = 0;
    this.unitIds[index] = "";
    this.activeCount--;
    const idx = this.activeIndices.indexOf(index);
    if (idx !== -1) {
      this.activeIndices.splice(idx, 1);
    }
  }
  teamToInt(team) {
    switch (team) {
      case "neutral":
        return 0;
      case "friendly":
        return 1;
      case "hostile":
        return 2;
      default:
        return 0;
    }
  }
  intToTeam(value) {
    switch (value) {
      case 0:
        return "neutral";
      case 1:
        return "friendly";
      case 2:
        return "hostile";
      default:
        return "neutral";
    }
  }
  stateToInt(state) {
    switch (state) {
      case "idle":
        return 0;
      case "moving":
        return 1;
      case "attacking":
        return 2;
      case "dead":
        return 3;
      default:
        return 0;
    }
  }
  intToState(value) {
    switch (value) {
      case 0:
        return "idle";
      case 1:
        return "moving";
      case 2:
        return "attacking";
      case 3:
        return "dead";
      default:
        return "idle";
    }
  }
  clear() {
    this.active.fill(0);
    this.activeCount = 0;
    this.activeIndices = [];
  }
  rebuildActiveIndices() {
    this.activeIndices = [];
    for (let i = 0;i < this.capacity; i++) {
      if (this.active[i]) {
        this.activeIndices.push(i);
      }
    }
  }
  distanceSquared(i, j) {
    const dx = this.posX[i] - this.posX[j];
    const dy = this.posY[i] - this.posY[j];
    return dx * dx + dy * dy;
  }
  findUnitsWithinRadius(centerX, centerY, radius) {
    const radiusSq = radius * radius;
    const indices = [];
    for (let i = 0;i < this.capacity; i++) {
      if (this.active[i] === 0)
        continue;
      const dx = this.posX[i] - centerX;
      const dy = this.posY[i] - centerY;
      const distSq = dx * dx + dy * dy;
      if (distSq <= radiusSq) {
        indices.push(i);
      }
    }
    return indices;
  }
  detectCollisions(collisionRadius = 1) {
    const collisions = [];
    const radiusSq = collisionRadius * collisionRadius;
    for (let i = 0;i < this.capacity; i++) {
      if (this.active[i] === 0)
        continue;
      for (let j = i + 1;j < this.capacity; j++) {
        if (this.active[j] === 0)
          continue;
        const dx = this.posX[i] - this.posX[j];
        const dy = this.posY[i] - this.posY[j];
        const distSq = dx * dx + dy * dy;
        if (distSq < radiusSq) {
          collisions.push([i, j]);
        }
      }
    }
    return collisions;
  }
}

// src/sim/unit_proxy.ts
class UnitProxy {
  id;
  query;
  _cachedIndex;
  constructor(id, query, index) {
    this.id = id;
    this.query = query;
    this._cachedIndex = index;
  }
  static createLightweight(unitId, index, arrays, metadataStore) {
    const coldData = metadataStore.get(unitId) || {};
    const stateId = arrays.state[index];
    const teamId = arrays.team[index];
    return {
      id: unitId,
      pos: { x: arrays.posX[index], y: arrays.posY[index] },
      intendedMove: {
        x: arrays.intendedMoveX[index],
        y: arrays.intendedMoveY[index]
      },
      hp: arrays.hp[index],
      maxHp: arrays.maxHp[index],
      dmg: arrays.dmg[index],
      team: teamId === 1 ? "friendly" : teamId === 2 ? "hostile" : "neutral",
      state: ["idle", "walk", "attack", "dead"][stateId] || "idle",
      mass: arrays.mass[index],
      sprite: coldData.sprite || "default",
      abilities: coldData.abilities || [],
      tags: coldData.tags,
      meta: coldData.meta || {},
      type: coldData.type,
      posture: coldData.posture,
      intendedTarget: coldData.intendedTarget,
      lastAbilityTick: coldData.lastAbilityTick
    };
  }
  get pos() {
    const manager = this.query;
    return {
      x: manager.arrays.posX[this._cachedIndex],
      y: manager.arrays.posY[this._cachedIndex]
    };
  }
  get intendedMove() {
    const manager = this.query;
    return {
      x: manager.arrays.intendedMoveX[this._cachedIndex],
      y: manager.arrays.intendedMoveY[this._cachedIndex]
    };
  }
  get hp() {
    return this.query.getHpByIndex(this._cachedIndex);
  }
  get maxHp() {
    return this.query.getMaxHpByIndex(this._cachedIndex);
  }
  get dmg() {
    return this.query.getDamageByIndex(this._cachedIndex);
  }
  get team() {
    return this.query.getTeamByIndex(this._cachedIndex);
  }
  get state() {
    return this.query.getStateByIndex(this._cachedIndex);
  }
  get mass() {
    return this.query.getMassByIndex(this._cachedIndex);
  }
  get sprite() {
    return this.query.getSprite(this.id);
  }
  get abilities() {
    return this.query.getAbilities(this.id);
  }
  get tags() {
    return this.query.getTags(this.id);
  }
  get meta() {
    return this.query.getMeta(this.id);
  }
  get intendedTarget() {
    return this.query.getIntendedTarget(this.id);
  }
  get posture() {
    return this.query.getPosture(this.id);
  }
  get type() {
    return this.query.getType(this.id);
  }
  get lastAbilityTick() {
    return this.query.getLastAbilityTick(this.id);
  }
  get isAlive() {
    if (this._cachedIndex !== undefined) {
      return this.query.isAliveByIndex(this._cachedIndex);
    }
    return this.query.isAlive(this.id);
  }
}

class UnitProxyManager {
  arrays;
  metadataStore;
  idToIndex = new Map;
  useLightweightProxies = true;
  constructor(arrays, metadataStore) {
    this.arrays = arrays;
    this.metadataStore = metadataStore;
    this.rebuildIndex();
  }
  rebuildIndex() {
    this.idToIndex.clear();
    this.indexCache = Object.create(null);
    for (const i of this.arrays.activeIndices) {
      if (this.arrays.unitIds[i]) {
        this.idToIndex.set(this.arrays.unitIds[i], i);
        this.indexCache[this.arrays.unitIds[i]] = i;
      }
    }
  }
  indexCache = Object.create(null);
  getIndex(unitId) {
    let index = this.indexCache[unitId];
    if (index !== undefined)
      return index;
    index = this.idToIndex.get(unitId);
    if (index !== undefined) {
      this.indexCache[unitId] = index;
      return index;
    }
    this.rebuildIndex();
    index = this.idToIndex.get(unitId);
    if (index === undefined) {
      throw new Error(`Unit ${unitId} not found`);
    }
    this.indexCache[unitId] = index;
    return index;
  }
  getPositionByIndex(index) {
    return { x: this.arrays.posX[index], y: this.arrays.posY[index] };
  }
  getIntendedMoveByIndex(index) {
    return {
      x: this.arrays.intendedMoveX[index],
      y: this.arrays.intendedMoveY[index]
    };
  }
  getHpByIndex(index) {
    return this.arrays.hp[index];
  }
  getMaxHpByIndex(index) {
    return this.arrays.maxHp[index];
  }
  getTeamByIndex(index) {
    const teamId = this.arrays.team[index];
    return teamId === 1 ? "friendly" : teamId === 2 ? "hostile" : "neutral";
  }
  getStateByIndex(index) {
    const stateId = this.arrays.state[index];
    const stateMap = ["idle", "walk", "attack", "dead"];
    return stateMap[stateId] || "idle";
  }
  getMassByIndex(index) {
    return this.arrays.mass[index];
  }
  getDamageByIndex(index) {
    return this.arrays.dmg[index];
  }
  isAliveByIndex(index) {
    return this.arrays.state[index] !== 3 && this.arrays.hp[index] > 0;
  }
  getCold(unitId) {
    return this.metadataStore.get(unitId) || {};
  }
  setCold(unitId, data) {
    this.metadataStore.set(unitId, data);
  }
  getPosition(unitId) {
    const idx = this.getIndex(unitId);
    return { x: this.arrays.posX[idx], y: this.arrays.posY[idx] };
  }
  setPosition(unitId, pos) {
    const idx = this.getIndex(unitId);
    this.arrays.posX[idx] = pos.x;
    this.arrays.posY[idx] = pos.y;
  }
  getIntendedMove(unitId) {
    const idx = this.getIndex(unitId);
    return {
      x: this.arrays.intendedMoveX[idx],
      y: this.arrays.intendedMoveY[idx]
    };
  }
  setIntendedMove(unitId, move) {
    const idx = this.getIndex(unitId);
    this.arrays.intendedMoveX[idx] = move.x;
    this.arrays.intendedMoveY[idx] = move.y;
  }
  getHp(unitId) {
    const idx = this.getIndex(unitId);
    return this.arrays.hp[idx];
  }
  setHp(unitId, hp) {
    const idx = this.getIndex(unitId);
    this.arrays.hp[idx] = hp;
    if (hp <= 0) {
      this.arrays.state[idx] = 3;
    }
  }
  getMaxHp(unitId) {
    const idx = this.getIndex(unitId);
    return this.arrays.maxHp[idx];
  }
  setMaxHp(unitId, maxHp) {
    const idx = this.getIndex(unitId);
    this.arrays.maxHp[idx] = maxHp;
  }
  getTeam(unitId) {
    const idx = this.getIndex(unitId);
    const teamId = this.arrays.team[idx];
    return teamId === 1 ? "friendly" : teamId === 2 ? "hostile" : "neutral";
  }
  setTeam(unitId, team) {
    const idx = this.getIndex(unitId);
    this.arrays.team[idx] = team === "friendly" ? 1 : team === "hostile" ? 2 : 0;
  }
  getState(unitId) {
    const idx = this.getIndex(unitId);
    const stateId = this.arrays.state[idx];
    const stateMap = ["idle", "walk", "attack", "dead"];
    return stateMap[stateId] || "idle";
  }
  setState(unitId, state) {
    const idx = this.getIndex(unitId);
    const stateMap = {
      idle: 0,
      walk: 1,
      attack: 2,
      dead: 3
    };
    this.arrays.state[idx] = stateMap[state] || 0;
  }
  getMass(unitId) {
    const idx = this.getIndex(unitId);
    return this.arrays.mass[idx];
  }
  setMass(unitId, mass) {
    const idx = this.getIndex(unitId);
    this.arrays.mass[idx] = mass;
  }
  getDamage(unitId) {
    const idx = this.getIndex(unitId);
    return this.arrays.dmg[idx];
  }
  setDamage(unitId, dmg) {
    const idx = this.getIndex(unitId);
    this.arrays.dmg[idx] = dmg;
  }
  getSprite(unitId) {
    const cold = this.getCold(unitId);
    return cold.sprite || "default";
  }
  setSprite(unitId, sprite) {
    const cold = this.getCold(unitId);
    cold.sprite = sprite;
    this.setCold(unitId, cold);
  }
  getAbilities(unitId) {
    const cold = this.getCold(unitId);
    return cold.abilities || [];
  }
  setAbilities(unitId, abilities) {
    const cold = this.getCold(unitId);
    cold.abilities = abilities;
    this.setCold(unitId, cold);
  }
  getTags(unitId) {
    const cold = this.getCold(unitId);
    return cold.tags;
  }
  setTags(unitId, tags) {
    const cold = this.getCold(unitId);
    cold.tags = tags;
    this.setCold(unitId, cold);
  }
  getMeta(unitId) {
    const cold = this.getCold(unitId);
    if (!cold.meta) {
      cold.meta = {};
      this.setCold(unitId, cold);
    }
    return cold.meta;
  }
  setMeta(unitId, meta) {
    const cold = this.getCold(unitId);
    cold.meta = meta;
    this.setCold(unitId, cold);
  }
  getType(unitId) {
    const cold = this.getCold(unitId);
    return cold.type;
  }
  setType(unitId, type) {
    const cold = this.getCold(unitId);
    cold.type = type;
    this.setCold(unitId, cold);
  }
  getPosture(unitId) {
    const cold = this.getCold(unitId);
    return cold.posture;
  }
  setPosture(unitId, posture) {
    const cold = this.getCold(unitId);
    cold.posture = posture;
    this.setCold(unitId, cold);
  }
  getIntendedTarget(unitId) {
    const cold = this.getCold(unitId);
    return cold.intendedTarget;
  }
  setIntendedTarget(unitId, target) {
    const cold = this.getCold(unitId);
    cold.intendedTarget = target;
    this.setCold(unitId, cold);
  }
  getLastAbilityTick(unitId) {
    const cold = this.getCold(unitId);
    return cold.meta?.lastAbilityTick || cold.lastAbilityTick;
  }
  setLastAbilityTick(unitId, tick) {
    const cold = this.getCold(unitId);
    if (!cold.meta)
      cold.meta = {};
    cold.meta.lastAbilityTick = tick;
    this.setCold(unitId, cold);
  }
  isAlive(unitId) {
    const idx = this.getIndex(unitId);
    return this.arrays.state[idx] !== 3 && this.arrays.hp[idx] > 0;
  }
  getProxy(index) {
    const unitId = this.arrays.unitIds[index];
    if (!unitId) {
      throw new Error(`No unit at index ${index}`);
    }
    return new UnitProxy(unitId, this, index);
  }
  getProxyById(id) {
    const index = this.idToIndex.get(id);
    if (index !== undefined) {
      return this.getProxy(index);
    }
    return;
  }
  getAllProxies() {
    if (this.arrays.activeIndices.length === 0 && this.arrays.activeCount > 0) {
      this.arrays.rebuildActiveIndices();
    }
    const proxies = [];
    for (const i of this.arrays.activeIndices) {
      const unitId = this.arrays.unitIds[i];
      const lightweight = UnitProxy.createLightweight(unitId, i, this.arrays, this.metadataStore);
      proxies.push(lightweight);
    }
    return proxies;
  }
  getRealProxies() {
    if (this.arrays.activeIndices.length === 0 && this.arrays.activeCount > 0) {
      this.arrays.rebuildActiveIndices();
    }
    const proxies = [];
    for (const i of this.arrays.activeIndices) {
      const unitId = this.arrays.unitIds[i];
      proxies.push(new UnitProxy(unitId, this, i));
    }
    return proxies;
  }
  clearCache() {
    this.indexCache = Object.create(null);
    this.rebuildIndex();
  }
  notifyUnitAdded(unitId, index) {
    this.idToIndex.set(unitId, index);
    this.indexCache[unitId] = index;
  }
  notifyUnitRemoved(unitId) {
    this.idToIndex.delete(unitId);
    delete this.indexCache[unitId];
  }
  batchMove(moves) {
    for (const [unitId, move] of moves) {
      const idx = this.idToIndex.get(unitId);
      if (idx === undefined)
        continue;
      if (move.x !== undefined && move.y !== undefined) {
        this.arrays.posX[idx] = move.x;
        this.arrays.posY[idx] = move.y;
      } else {
        this.arrays.posX[idx] += move.dx || 0;
        this.arrays.posY[idx] += move.dy || 0;
      }
      this.arrays.intendedMoveX[idx] = 0;
      this.arrays.intendedMoveY[idx] = 0;
    }
  }
  batchFindTargets(searchRadius = 15) {
    const capacity = this.arrays.capacity;
    const enemies = new Map;
    const allies = new Map;
    const radiusSq = searchRadius * searchRadius;
    const activeCount = this.arrays.activeCount;
    if (activeCount <= 75) {
      return this.batchFindTargetsSimple(radiusSq, enemies, allies);
    } else {
      return this.batchFindTargetsGrid(searchRadius, radiusSq, enemies, allies);
    }
  }
  batchFindTargetsSimple(radiusSq, enemies, allies) {
    const capacity = this.arrays.capacity;
    for (const i of this.arrays.activeIndices) {
      if (this.arrays.state[i] === 3)
        continue;
      const unitId = this.arrays.unitIds[i];
      const x1 = this.arrays.posX[i];
      const y1 = this.arrays.posY[i];
      const team1 = this.arrays.team[i];
      let closestEnemy = null;
      let closestAlly = null;
      let minEnemyDistSq = Infinity;
      let minAllyDistSq = Infinity;
      for (const j of this.arrays.activeIndices) {
        if (i === j || this.arrays.state[j] === 3)
          continue;
        const absDx = Math.abs(this.arrays.posX[j] - x1);
        const absDy = Math.abs(this.arrays.posY[j] - y1);
        if (absDx + absDy > 15)
          continue;
        const dx = this.arrays.posX[j] - x1;
        const dy = this.arrays.posY[j] - y1;
        const distSq = dx * dx + dy * dy;
        if (distSq > radiusSq)
          continue;
        const team2 = this.arrays.team[j];
        const targetId = this.arrays.unitIds[j];
        if (team1 !== team2 && distSq < minEnemyDistSq) {
          minEnemyDistSq = distSq;
          closestEnemy = targetId;
        } else if (team1 === team2 && distSq < minAllyDistSq) {
          minAllyDistSq = distSq;
          closestAlly = targetId;
        }
      }
      enemies.set(unitId, closestEnemy);
      allies.set(unitId, closestAlly);
    }
    return { enemies, allies };
  }
  batchFindTargetsGrid(searchRadius, radiusSq, enemies, allies) {
    const capacity = this.arrays.capacity;
    const gridSize = Math.ceil(searchRadius / 2);
    const gridWidth = Math.ceil(100 / gridSize);
    const gridHeight = Math.ceil(100 / gridSize);
    const grid = Array(gridWidth * gridHeight).fill(null).map(() => []);
    for (const i of this.arrays.activeIndices) {
      if (this.arrays.state[i] === 3)
        continue;
      const x = this.arrays.posX[i];
      const y = this.arrays.posY[i];
      const gx = Math.floor(x / gridSize);
      const gy = Math.floor(y / gridSize);
      const gridIdx = gy * gridWidth + gx;
      if (gridIdx >= 0 && gridIdx < grid.length) {
        grid[gridIdx].push(i);
      }
    }
    for (const i of this.arrays.activeIndices) {
      if (this.arrays.state[i] === 3)
        continue;
      const unitId = this.arrays.unitIds[i];
      const x1 = this.arrays.posX[i];
      const y1 = this.arrays.posY[i];
      const team1 = this.arrays.team[i];
      let closestEnemy = null;
      let closestAlly = null;
      let minEnemyDistSq = Infinity;
      let minAllyDistSq = Infinity;
      const gx = Math.floor(x1 / gridSize);
      const gy = Math.floor(y1 / gridSize);
      const cellRadius = Math.ceil(searchRadius / gridSize);
      for (let dy = -cellRadius;dy <= cellRadius; dy++) {
        for (let dx = -cellRadius;dx <= cellRadius; dx++) {
          const checkGx = gx + dx;
          const checkGy = gy + dy;
          if (checkGx < 0 || checkGx >= gridWidth || checkGy < 0 || checkGy >= gridHeight)
            continue;
          const gridIdx = checkGy * gridWidth + checkGx;
          const cellUnits = grid[gridIdx];
          for (const j of cellUnits) {
            if (i === j)
              continue;
            const dx2 = this.arrays.posX[j] - x1;
            const dy2 = this.arrays.posY[j] - y1;
            const distSq = dx2 * dx2 + dy2 * dy2;
            if (distSq > radiusSq)
              continue;
            const team2 = this.arrays.team[j];
            const targetId = this.arrays.unitIds[j];
            if (team1 !== team2 && distSq < minEnemyDistSq) {
              minEnemyDistSq = distSq;
              closestEnemy = targetId;
            } else if (team1 === team2 && distSq < minAllyDistSq) {
              minAllyDistSq = distSq;
              closestAlly = targetId;
            }
          }
        }
      }
      enemies.set(unitId, closestEnemy);
      allies.set(unitId, closestAlly);
    }
    return { enemies, allies };
  }
  batchProcessAI(postures) {
    const targets = this.batchFindTargets();
    const moves = new Map;
    for (const i of this.arrays.activeIndices) {
      if (this.arrays.state[i] === 3)
        continue;
      const unitId = this.arrays.unitIds[i];
      const posture = postures.get(unitId) || "wait";
      let dx = 0, dy = 0;
      if (posture === "wait") {
        moves.set(unitId, { dx: 0, dy: 0 });
        continue;
      }
      const targetId = targets.enemies.get(unitId);
      const allyId = targets.allies.get(unitId);
      if ((posture === "pursue" || posture === "hunt" || posture === "bully") && targetId) {
        const targetIdx = this.idToIndex.get(targetId);
        if (targetIdx !== undefined) {
          const x1 = this.arrays.posX[i];
          const y1 = this.arrays.posY[i];
          const x2 = this.arrays.posX[targetIdx];
          const y2 = this.arrays.posY[targetIdx];
          dx = x2 > x1 ? 1 : x2 < x1 ? -1 : 0;
          dy = y2 > y1 ? 1 : y2 < y1 ? -1 : 0;
        }
      } else if (posture === "guard" && allyId) {
        const allyIdx = this.idToIndex.get(allyId);
        if (allyIdx !== undefined) {
          const x1 = this.arrays.posX[i];
          const y1 = this.arrays.posY[i];
          const x2 = this.arrays.posX[allyIdx];
          const y2 = this.arrays.posY[allyIdx];
          const distSq = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
          if (distSq > 4) {
            dx = x2 > x1 ? 1 : x2 < x1 ? -1 : 0;
            dy = y2 > y1 ? 1 : y2 < y1 ? -1 : 0;
          }
        }
      } else if (posture === "swarm") {
        let avgX = this.arrays.posX[i];
        let avgY = this.arrays.posY[i];
        let count = 1;
        const team = this.arrays.team[i];
        for (let j = 0;j < this.arrays.capacity; j++) {
          if (i === j || !this.arrays.active[j] || this.arrays.state[j] === 3)
            continue;
          if (this.arrays.team[j] !== team)
            continue;
          const distX = this.arrays.posX[j] - this.arrays.posX[i];
          const distY = this.arrays.posY[j] - this.arrays.posY[i];
          const distSq = distX * distX + distY * distY;
          if (distSq < 25) {
            avgX += this.arrays.posX[j];
            avgY += this.arrays.posY[j];
            count++;
          }
        }
        if (count > 1) {
          avgX /= count;
          avgY /= count;
          const diffX = avgX - this.arrays.posX[i];
          const diffY = avgY - this.arrays.posY[i];
          if (Math.abs(diffX) >= 1) {
            dx = diffX > 0 ? 1 : -1;
          }
          if (Math.abs(diffY) >= 1) {
            dy = diffY > 0 ? 1 : -1;
          }
        } else {
          if (Simulator.rng.random() < 0.15) {
            const dirs = [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1]
            ];
            const [wanderDx, wanderDy] = dirs[Math.floor(Simulator.rng.random() * dirs.length)];
            dx = wanderDx;
            dy = wanderDy;
          }
        }
      } else if (posture === "wander") {
        if (Simulator.rng.random() < 0.15) {
          const dirs = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1]
          ];
          const [wanderDx, wanderDy] = dirs[Math.floor(Simulator.rng.random() * dirs.length)];
          dx = wanderDx;
          dy = wanderDy;
        }
      }
      moves.set(unitId, { dx, dy });
    }
    return moves;
  }
  batchApplyForces() {
    const capacity = this.arrays.capacity;
    for (const i of this.arrays.activeIndices) {
      if (this.arrays.state[i] === 3)
        continue;
      if (this.arrays.intendedMoveX[i] !== 0 || this.arrays.intendedMoveY[i] !== 0) {
        this.arrays.posX[i] += this.arrays.intendedMoveX[i];
        this.arrays.posY[i] += this.arrays.intendedMoveY[i];
        this.arrays.intendedMoveX[i] = 0;
        this.arrays.intendedMoveY[i] = 0;
      }
    }
  }
}

// src/core/grid_partition.ts
class GridPartition {
  cellSize;
  gridWidth;
  gridHeight;
  cells;
  constructor(fieldWidth, fieldHeight, cellSize = 4) {
    this.cellSize = cellSize;
    this.gridWidth = Math.ceil(fieldWidth / cellSize);
    this.gridHeight = Math.ceil(fieldHeight / cellSize);
    this.cells = new Map;
  }
  clear() {
    this.cells.clear();
  }
  getCellCoords(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return { cx, cy };
  }
  getCellKey(cx, cy) {
    return `${cx},${cy}`;
  }
  insert(unit) {
    const { cx, cy } = this.getCellCoords(unit.pos.x, unit.pos.y);
    const key = this.getCellKey(cx, cy);
    if (!this.cells.has(key)) {
      this.cells.set(key, new Set);
    }
    this.cells.get(key).add(unit);
  }
  getCell(x, y) {
    const { cx, cy } = this.getCellCoords(x, y);
    const key = this.getCellKey(cx, cy);
    const cell = this.cells.get(key);
    return cell ? Array.from(cell) : [];
  }
  getNearby(x, y, radius) {
    const result = [];
    const radiusSq = radius * radius;
    const { cx, cy } = this.getCellCoords(x, y);
    const cellRadius = Math.ceil(radius / this.cellSize);
    for (let dx = -cellRadius;dx <= cellRadius; dx++) {
      for (let dy = -cellRadius;dy <= cellRadius; dy++) {
        const checkX = cx + dx;
        const checkY = cy + dy;
        if (checkX < 0 || checkX >= this.gridWidth || checkY < 0 || checkY >= this.gridHeight)
          continue;
        const key = this.getCellKey(checkX, checkY);
        const cell = this.cells.get(key);
        if (cell) {
          for (const unit of cell) {
            const dx2 = unit.pos.x - x;
            const dy2 = unit.pos.y - y;
            const distSq = dx2 * dx2 + dy2 * dy2;
            if (distSq <= radiusSq) {
              result.push(unit);
            }
          }
        }
      }
    }
    return result;
  }
  getAt(x, y) {
    const result = [];
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    const { cx, cy } = this.getCellCoords(x, y);
    const key = this.getCellKey(cx, cy);
    const cell = this.cells.get(key);
    if (cell) {
      for (const unit of cell) {
        if (Math.round(unit.pos.x) === roundedX && Math.round(unit.pos.y) === roundedY) {
          result.push(unit);
        }
      }
    }
    return result;
  }
  getStats() {
    let maxUnitsPerCell = 0;
    for (const cell of this.cells.values()) {
      maxUnitsPerCell = Math.max(maxUnitsPerCell, cell.size);
    }
    return {
      totalCells: this.gridWidth * this.gridHeight,
      occupiedCells: this.cells.size,
      maxUnitsPerCell
    };
  }
}

// src/core/ScalarField.ts
class ScalarField {
  data;
  temp;
  width;
  height;
  size;
  constructor(width, height, initialValue = 0) {
    this.width = width;
    this.height = height;
    this.size = width * height;
    this.data = new Float32Array(this.size);
    this.temp = new Float32Array(this.size);
    this.data.fill(initialValue);
  }
  get(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height)
      return 0;
    const idx = Math.floor(y) * this.width + Math.floor(x);
    return this.data[idx];
  }
  set(x, y, value) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height)
      return;
    const idx = Math.floor(y) * this.width + Math.floor(x);
    this.data[idx] = value;
  }
  add(x, y, value) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height)
      return;
    const idx = Math.floor(y) * this.width + Math.floor(x);
    this.data[idx] += value;
  }
  addGradient(centerX, centerY, radius, intensity) {
    const startX = Math.max(0, Math.floor(centerX - radius));
    const endX = Math.min(this.width - 1, Math.ceil(centerX + radius));
    const startY = Math.max(0, Math.floor(centerY - radius));
    const endY = Math.min(this.height - 1, Math.ceil(centerY + radius));
    const radiusSq = radius * radius;
    for (let y = startY;y <= endY; y++) {
      const dy = y - centerY;
      const dySq = dy * dy;
      const rowOffset = y * this.width;
      for (let x = startX;x <= endX; x++) {
        const dx = x - centerX;
        const distSq = dx * dx + dySq;
        if (distSq <= radiusSq) {
          const falloff = 1 - distSq / radiusSq;
          const contribution = intensity * falloff * falloff;
          this.data[rowOffset + x] += contribution;
        }
      }
    }
  }
  diffuse(rate = 0.1) {
    this.temp.set(this.data);
    const w = this.width;
    for (let y = 1;y < this.height - 1; y++) {
      const row = y * w;
      for (let x = 1;x < w - 1; x++) {
        const idx = row + x;
        const neighbors = (this.temp[idx - w] + this.temp[idx + w] + this.temp[idx - 1] + this.temp[idx + 1]) * 0.25;
        this.data[idx] = this.temp[idx] * (1 - rate) + neighbors * rate;
      }
    }
  }
  decay(rate = 0.01) {
    const factor = 1 - rate;
    for (let i = 0;i < this.size; i++) {
      this.data[i] *= factor;
    }
  }
  decayAndDiffuse(decayRate = 0.01, diffuseRate = 0.1) {
    const decayFactor = 1 - decayRate - diffuseRate * 0.5;
    const data = this.data;
    const size = this.size;
    let i = 0;
    const size8 = Math.floor(size / 8) * 8;
    for (;i < size8; i += 8) {
      data[i] *= decayFactor;
      data[i + 1] *= decayFactor;
      data[i + 2] *= decayFactor;
      data[i + 3] *= decayFactor;
      data[i + 4] *= decayFactor;
      data[i + 5] *= decayFactor;
      data[i + 6] *= decayFactor;
      data[i + 7] *= decayFactor;
    }
    for (;i < size; i++) {
      data[i] *= decayFactor;
    }
  }
  getMaxValue() {
    let max = 0;
    for (let i = 0;i < this.size; i++) {
      if (this.data[i] > max)
        max = this.data[i];
    }
    return max;
  }
  getAverageValue() {
    let sum = 0;
    for (let i = 0;i < this.size; i++) {
      sum += this.data[i];
    }
    return sum / this.size;
  }
}

// src/sim/particle_arrays.ts
class ParticleArrays {
  capacity;
  activeCount = 0;
  particleIds;
  posX;
  posY;
  velX;
  velY;
  lifetime;
  active;
  radius;
  z;
  type;
  landed;
  color;
  targetCellX;
  targetCellY;
  freeIndices = [];
  constructor(capacity = 1000) {
    this.capacity = capacity;
    this.particleIds = new Array(capacity).fill("");
    this.posX = new Float32Array(capacity);
    this.posY = new Float32Array(capacity);
    this.velX = new Float32Array(capacity);
    this.velY = new Float32Array(capacity);
    this.lifetime = new Int16Array(capacity);
    this.active = new Uint8Array(capacity);
    this.radius = new Float32Array(capacity);
    this.z = new Float32Array(capacity);
    this.type = new Uint8Array(capacity);
    this.landed = new Uint8Array(capacity);
    this.color = new Array(capacity).fill("#FFFFFF");
    this.targetCellX = new Float32Array(capacity);
    this.targetCellY = new Float32Array(capacity);
    for (let i = capacity - 1;i >= 0; i--) {
      this.freeIndices.push(i);
    }
  }
  addParticle(particle) {
    if (this.freeIndices.length === 0) {
      return -1;
    }
    const index = this.freeIndices.pop();
    this.particleIds[index] = particle.id || `p_${Date.now()}_${index}`;
    this.posX[index] = particle.pos.x;
    this.posY[index] = particle.pos.y;
    this.velX[index] = particle.vel.x;
    this.velY[index] = particle.vel.y;
    this.lifetime[index] = particle.lifetime;
    this.active[index] = 1;
    this.radius[index] = particle.radius || 0.25;
    this.z[index] = particle.z || 0;
    this.type[index] = this.getTypeId(particle.type);
    this.landed[index] = particle.landed ? 1 : 0;
    this.color[index] = particle.color || "#FFFFFF";
    if (particle.targetCell) {
      this.targetCellX[index] = particle.targetCell.x;
      this.targetCellY[index] = particle.targetCell.y;
    }
    this.activeCount++;
    return index;
  }
  removeParticle(index) {
    if (this.active[index] === 0)
      return;
    this.active[index] = 0;
    this.particleIds[index] = "";
    this.freeIndices.push(index);
    this.activeCount--;
  }
  updatePhysics(deltaTime = 1) {
    const count = this.capacity;
    for (let i = 0;i < count; i++) {
      const isActive = this.active[i];
      this.posX[i] += this.velX[i] * isActive * deltaTime;
      this.posY[i] += this.velY[i] * isActive * deltaTime;
      this.lifetime[i] -= isActive;
      this.active[i] *= this.lifetime[i] > 0 ? 1 : 0;
    }
  }
  applyGravity(gravity = 0.1) {
    const count = this.capacity;
    for (let i = 0;i < count; i++) {
      const shouldApply = this.active[i] * (1 - this.landed[i]);
      this.velY[i] += gravity * shouldApply;
    }
  }
  getTypeId(type) {
    const types = {
      leaf: 1,
      rain: 2,
      snow: 3,
      debris: 4,
      lightning: 5,
      sand: 6,
      energy: 7,
      magic: 8,
      grapple_line: 9,
      test_particle: 10,
      test: 11,
      pin: 12,
      storm_cloud: 13,
      lightning_branch: 14,
      electric_spark: 15,
      power_surge: 16,
      ground_burst: 17,
      entangle: 18,
      tame: 19,
      calm: 20,
      heal: 21,
      thunder_ring: 22,
      explosion: 23,
      heal_particle: 24,
      freeze_impact: 25,
      pain: 26
    };
    return types[type || ""] || 0;
  }
  clear() {
    this.active.fill(0);
    this.activeCount = 0;
    this.freeIndices = [];
    for (let i = this.capacity - 1;i >= 0; i--) {
      this.freeIndices.push(i);
    }
  }
}

// src/core/simulator.ts
class Simulator {
  sceneBackground = "winter";
  fieldWidth;
  fieldHeight;
  enableEnvironmentalEffects = false;
  get width() {
    return this.fieldWidth;
  }
  get height() {
    return this.fieldHeight;
  }
  unitArrays;
  unitColdData = new Map;
  spatialHash;
  dirtyUnits = new Set;
  positionMap = new Map;
  spatialQueries;
  pairwiseBatcher;
  targetCache;
  static rng = new RNG(12345);
  static randomProtected = false;
  changedUnits = new Set;
  gridPartition;
  proxyManager;
  get units() {
    return this.proxyManager.getAllProxies();
  }
  get liveUnits() {
    return this.proxyManager.getRealProxies();
  }
  setUnitsFromTransform(units) {
    throw new Error("setUnitsFromTransform is deprecated! Units should be managed through addUnit/removeUnitById only");
  }
  removeUnitById(unitId) {
    for (let i = 0;i < this.unitArrays.capacity; i++) {
      if (this.unitArrays.active[i] === 0)
        continue;
      if (this.unitArrays.unitIds[i] === unitId) {
        this.unitArrays.active[i] = 0;
        this.unitArrays.activeCount--;
        const idx = this.unitArrays.activeIndices.indexOf(i);
        if (idx !== -1) {
          this.unitArrays.activeIndices.splice(idx, 1);
        }
        this.proxyManager.notifyUnitRemoved(unitId);
        this.unitCache.delete(unitId);
        this.unitColdData.delete(unitId);
        return;
      }
    }
  }
  projectiles;
  rulebook;
  commandProcessor;
  queuedEvents = [];
  processedEvents = [];
  queuedCommands = [];
  lastUnitPositions = new Map;
  lastActiveCount = 0;
  hasHugeUnitsRule;
  particleArrays = new ParticleArrays(5000);
  get particles() {
    const result = [];
    const arrays = this.particleArrays;
    for (let i = 0;i < arrays.capacity; i++) {
      if (arrays.active[i] === 0)
        continue;
      const typeId = arrays.type[i];
      result.push({
        id: arrays.particleIds[i] || `particle_${i}`,
        type: this.getParticleTypeName(typeId),
        pos: { x: arrays.posX[i], y: arrays.posY[i] },
        vel: { x: arrays.velX[i], y: arrays.velY[i] },
        radius: arrays.radius[i],
        color: arrays.color[i] || "#FFFFFF",
        lifetime: arrays.lifetime[i],
        z: arrays.z[i],
        landed: arrays.landed[i] === 1
      });
    }
    return result;
  }
  _temperatureField = null;
  _humidityField = null;
  _pressureField = null;
  get temperatureField() {
    if (!this._temperatureField) {
      this._temperatureField = new ScalarField(this.fieldWidth, this.fieldHeight, 20);
    }
    return this._temperatureField;
  }
  get humidityField() {
    if (!this._humidityField) {
      this._humidityField = new ScalarField(this.fieldWidth, this.fieldHeight, 0.3);
    }
    return this._humidityField;
  }
  get pressureField() {
    if (!this._pressureField) {
      this._pressureField = new ScalarField(this.fieldWidth, this.fieldHeight, 1);
    }
    return this._pressureField;
  }
  weather;
  winterActive;
  lightningActive;
  sandstormActive;
  transform;
  createCommandHandler() {
    return new CommandHandler(this, this.transform);
  }
  getTickContext() {
    return new TickContextImpl(this);
  }
  createEventHandler() {
    return new EventHandler;
  }
  getTransform() {
    return this.transform;
  }
  recordProcessedEvents(events) {
    this.processedEvents.push(...events);
  }
  getProxyManager() {
    return this.proxyManager;
  }
  setupDeterministicRandomness() {
    if (Simulator.randomProtected)
      return;
    const originalRandom = Math.random;
    Math.random = () => {
      return Simulator.rng.random();
    };
    Math._originalRandom = originalRandom;
    Simulator.randomProtected = true;
  }
  constructor(fieldWidth = 128, fieldHeight = 128) {
    this.fieldWidth = fieldWidth;
    this.fieldHeight = fieldHeight;
    this.setupDeterministicRandomness();
    this.spatialHash = new SpatialHash(4);
    this.dirtyUnits = new Set;
    this.changedUnits = new Set;
    this.spatialQueries = new SpatialQueryBatcher;
    this.pairwiseBatcher = new PairwiseBatcher;
    this.targetCache = new TargetCache;
    this.gridPartition = new GridPartition(fieldWidth, fieldHeight, 4);
    this.unitArrays = new UnitArrays(1000);
    this.unitColdData = new Map;
    this.proxyManager = new UnitProxyManager(this.unitArrays, this.unitColdData);
    this.transform = new Transform(this);
    this.weather = {
      current: "clear",
      duration: 0,
      intensity: 0
    };
    this.reset();
  }
  tickContext;
  parseCommand(inputString) {
    const parts = inputString.split(" ");
    let type = parts[0];
    const params = {};
    switch (type) {
      case "bg":
        params.type = "bg";
        params.value = parts[1];
        type = "sceneMetadata";
        break;
      case "weather":
        params.weatherType = parts[1];
        if (parts[2])
          params.duration = parseInt(parts[2]);
        if (parts[3])
          params.intensity = parseFloat(parts[3]);
        break;
      case "deploy":
      case "spawn":
        params.unitType = parts[1];
        if (parts[2])
          params.x = parseFloat(parts[2]);
        if (parts[3])
          params.y = parseFloat(parts[3]);
        break;
      case "airdrop":
      case "drop":
        params.unitType = parts[1];
        params.x = parseFloat(parts[2]);
        params.y = parseFloat(parts[3]);
        break;
      case "lightning":
      case "bolt":
        if (parts[1])
          params.x = parseFloat(parts[1]);
        if (parts[2])
          params.y = parseFloat(parts[2]);
        break;
      case "temperature":
      case "temp":
        params.amount = parts[1] ? parseFloat(parts[1]) : 20;
        break;
      case "wander":
        params.team = parts[1] || "all";
        params.chance = parts[2] ? parseFloat(parts[2]) : 0.1;
        break;
    }
    const command = { type, params };
    this.queuedCommands.push(command);
    return command;
  }
  paused = false;
  pause() {
    this.paused = true;
  }
  reset() {
    this.unitArrays.clear();
    this.unitCache.clear();
    this.unitColdData.clear();
    this.proxyManager.clearCache();
    this.projectiles = [];
    this.processedEvents = [];
    this.queuedCommands = [];
    this.commandProcessor = new CommandHandler(this, this.transform);
    const coreRules = [new UnitBehavior, new UnitMovement, new Cleanup];
    const combatRules = [
      new MeleeCombat,
      new RangedCombat,
      new Abilities,
      new Knockback,
      new StatusEffects,
      new Perdurance
    ];
    const specialRules = [
      new HugeUnits,
      new SegmentedCreatures,
      new GrapplingPhysics,
      new AirdropPhysics,
      new BiomeEffects,
      new AmbientSpawning,
      new AmbientBehavior,
      new LightningStorm,
      new AreaOfEffect,
      new ProjectileMotion,
      new Jumping,
      new Tossing
    ];
    this.rulebook = [...coreRules, ...combatRules, ...specialRules];
  }
  addUnit(unit) {
    let baseUnit = unit;
    if (unit.type) {
      const unitData = Encyclopaedia.unit(unit.type);
      if (unitData) {
        baseUnit = { ...unitData, ...unit };
      }
    }
    const hp = baseUnit.hp === undefined ? 100 : baseUnit.hp;
    let u = {
      ...baseUnit,
      id: baseUnit.id || `unit_${Date.now()}`,
      hp,
      team: baseUnit.team || "friendly",
      pos: baseUnit.pos || { x: 1, y: 1 },
      intendedMove: baseUnit.intendedMove || { x: 0, y: 0 },
      maxHp: baseUnit.maxHp || baseUnit.hp || 100,
      sprite: baseUnit.sprite || "default",
      state: baseUnit.state || (hp <= 0 ? "dead" : "idle"),
      mass: baseUnit.mass || 1,
      abilities: baseUnit.abilities || [],
      meta: baseUnit.meta || {}
    };
    const index = this.unitArrays.addUnit(u);
    if (index === -1) {
      return null;
    }
    this.dirtyUnits.add(u.id);
    this.proxyManager.rebuildIndex();
    this.unitColdData.set(u.id, {
      sprite: u.sprite || "default",
      abilities: u.abilities || [],
      tags: u.tags,
      meta: u.meta || {},
      intendedTarget: u.intendedTarget,
      posture: u.posture,
      type: u.type,
      lastAbilityTick: u.lastAbilityTick
    });
    this.proxyManager.notifyUnitAdded(u.id, index);
    const proxy = this.proxyManager.getProxy(index);
    this.unitCache.set(u.id, proxy);
    return proxy;
  }
  create(unit) {
    const newUnit = { ...unit, id: unit.id || `unit_${Date.now()}` };
    const index = this.unitArrays.addUnit(newUnit);
    if (index === -1) {
      return null;
    }
    this.unitColdData.set(newUnit.id, {
      sprite: newUnit.sprite || "default",
      abilities: newUnit.abilities || [],
      tags: newUnit.tags,
      meta: newUnit.meta || {},
      intendedTarget: newUnit.intendedTarget,
      posture: newUnit.posture,
      type: newUnit.type,
      lastAbilityTick: newUnit.lastAbilityTick
    });
    this.proxyManager.notifyUnitAdded(newUnit.id, index);
    this.dirtyUnits.add(newUnit.id);
    const proxy = this.proxyManager.getProxy(index);
    this.unitCache.set(newUnit.id, proxy);
    return proxy;
  }
  markDirty(unitId) {
    this.dirtyUnits.add(unitId);
    this.changedUnits.add(unitId);
  }
  hasDirtyUnits() {
    return this.dirtyUnits.size > 0;
  }
  getDirtyUnits() {
    return new Set(this.dirtyUnits);
  }
  get roster() {
    const sim = this;
    const realProxies = this.proxyManager.getRealProxies();
    return new Proxy({}, {
      get(target, prop) {
        if (typeof prop === "string") {
          return realProxies.find((u) => u.id === prop);
        }
        return;
      },
      has(target, prop) {
        if (typeof prop === "string") {
          return realProxies.some((u) => u.id === prop);
        }
        return false;
      }
    });
  }
  tick() {
    this.step(true);
  }
  ticks = 0;
  lastCall = 0;
  ruleApplicability = new Map;
  stepDepth = 0;
  step(force = false) {
    this.stepDepth++;
    if (this.stepDepth > 1) {
      console.error(`ERROR: Recursive step() call detected! Depth=${this.stepDepth}`);
      console.trace();
    }
    if (this.paused) {
      if (!force) {
        return this;
      } else {
        console.debug(`Forcing simulation step while paused.`);
      }
    }
    let t0 = performance.now();
    this.ticks++;
    this.changedUnits = new Set(this.dirtyUnits);
    this.dirtyUnits.clear();
    let needsSpatialRebuild = this.ticks === 0 || this.unitArrays.activeCount !== this.lastActiveCount;
    if (needsSpatialRebuild) {
      this.gridPartition.clear();
      this.unitCache.clear();
      const arrays = this.unitArrays;
      for (const i of arrays.activeIndices) {
        const id = arrays.unitIds[i];
        let proxy = this.unitCache.get(id);
        if (!proxy) {
          proxy = this.proxyManager.getProxy(i);
          this.unitCache.set(id, proxy);
        }
        this.gridPartition.insert(proxy);
      }
      this.lastActiveCount = arrays.activeCount;
    }
    const context = new TickContextImpl(this);
    context.clearCache();
    for (const rule of this.rulebook) {
      const ruleName = rule.constructor.name;
      const commands = rule.execute(context);
      if (commands && commands.length > 0) {
        for (let i = 0;i < commands.length; i++) {
          this.queuedCommands.push(commands[i]);
        }
      }
    }
    this.commandProcessor.execute(context);
    if (this.pairwiseBatcher) {
      this.pairwiseBatcher.process(this.units, this);
      this.targetCache = this.pairwiseBatcher.targetCache;
    }
    this.updateChangedUnits();
    {
      if (this.projectiles && this.projectiles.length > 0) {
        this.updateProjectilePhysics();
      }
      if (this.particleArrays && this.particleArrays.activeCount > 0) {
        this.updateParticles();
      }
      if (this.enableEnvironmentalEffects) {
        this.updateUnitTemperatureEffects();
        if (this.ticks % 10 === 0) {
          this.updateScalarFields();
          this.updateWeather();
        }
        if (Simulator.rng.random() < 0.002) {
          this.spawnLeafParticle();
        }
      }
    }
    this.lastCall = t0;
    this.stepDepth--;
    return this;
  }
  updateProjectilePhysics() {
    if (!this.projectiles)
      return;
    const toRemove = [];
    for (let i = 0;i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;
      if (p.type === "bomb") {
        p.vel.y += 0.2;
        p.lifetime = (p.lifetime || 0) + 1;
      }
      if (p.pos.x < 0 || p.pos.x >= this.fieldWidth || p.pos.y < 0 || p.pos.y >= this.fieldHeight) {
        toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1;i >= 0; i--) {
      this.projectiles.splice(toRemove[i], 1);
    }
  }
  updateParticles() {
    const arrays = this.particleArrays;
    arrays.updatePhysics();
    arrays.applyGravity(0.1);
    for (let i = 0;i < arrays.capacity; i++) {
      if (arrays.active[i] === 0)
        continue;
      const type = arrays.type[i];
      if (type === 1) {
        arrays.velX[i] += (Math.random() - 0.5) * 0.02;
        arrays.velY[i] = Math.min(arrays.velY[i], 0.5);
      } else if (type === 2) {
        arrays.velY[i] = 1;
      } else if (type === 3) {
        arrays.velX[i] = 0;
        arrays.velY[i] = 0.15;
        const fieldHeightPx = this.fieldHeight * 8;
        if (arrays.posY[i] >= fieldHeightPx - 1) {
          arrays.landed[i] = 1;
          arrays.posY[i] = fieldHeightPx - 1;
          arrays.velX[i] = 0;
          arrays.velY[i] = 0;
        }
      }
      const isStormCloud = type === 13;
      if (arrays.lifetime[i] <= 0 || arrays.landed[i] === 0 && !isStormCloud && (arrays.posX[i] < -50 || arrays.posX[i] > this.fieldWidth * 8 + 50 || arrays.posY[i] < -50 || arrays.posY[i] > this.fieldHeight * 8 + 50)) {
        arrays.removeParticle(i);
      }
    }
  }
  getParticleTypeName(typeId) {
    const types = [
      "",
      "leaf",
      "rain",
      "snow",
      "debris",
      "lightning",
      "sand",
      "energy",
      "magic",
      "grapple_line",
      "test_particle",
      "test",
      "pin",
      "storm_cloud",
      "lightning_branch",
      "electric_spark",
      "power_surge",
      "ground_burst",
      "entangle",
      "tame",
      "calm",
      "heal",
      "thunder_ring",
      "explosion",
      "heal_particle",
      "freeze_impact",
      "pain"
    ];
    return types[typeId] || undefined;
  }
  applyVectorizedMovement() {
    const count = this.unitArrays.capacity;
    const posX = this.unitArrays.posX;
    const posY = this.unitArrays.posY;
    const moveX = this.unitArrays.intendedMoveX;
    const moveY = this.unitArrays.intendedMoveY;
    const active = this.unitArrays.active;
    const state = this.unitArrays.state;
    for (let i = 0;i < count; i++) {
      const shouldMove = active[i] * (1 - (state[i] >> 1 & 1));
      posX[i] += moveX[i] * shouldMove;
      posY[i] += moveY[i] * shouldMove;
      moveX[i] *= 1 - shouldMove;
      moveY[i] *= 1 - shouldMove;
    }
  }
  updateLeafParticle(particle) {
    if (particle.landed) {
      particle.vel.x = 0;
      particle.vel.y = 0;
      particle.lifetime -= 3;
      return;
    }
    const gravity = 0.02;
    const airResistance = 0.98;
    const wind = 0;
    const sway = Math.sin(this.ticks * 0.05 + particle.pos.x * 0.1) * 0.01;
    particle.vel.y += gravity;
    particle.vel.x += wind + sway;
    particle.vel.x *= airResistance;
    particle.vel.y *= airResistance;
    particle.pos.x += particle.vel.x;
    particle.pos.y += particle.vel.y;
    if (particle.z !== undefined) {
      particle.z = Math.max(0, particle.z - Math.abs(particle.vel.y) * 0.5);
    }
    const fieldWidthPixels = this.fieldWidth * 8;
    if (particle.pos.x < 0)
      particle.pos.x = fieldWidthPixels + particle.pos.x;
    if (particle.pos.x > fieldWidthPixels)
      particle.pos.x = particle.pos.x - fieldWidthPixels;
    if (particle.z !== undefined && particle.z <= 0) {
      particle.landed = true;
      particle.z = 0;
      const gridX = Math.floor(particle.pos.x / 8);
      const gridY = Math.floor(particle.pos.y / 8);
      particle.pos.x = gridX * 8 + 4;
      particle.pos.y = gridY * 8 + 4;
      particle.vel.x = 0;
      particle.vel.y = 0;
      particle.lifetime = Math.min(particle.lifetime, 20);
    }
  }
  updateRainParticle(particle) {
    if (particle.landed) {
      particle.vel.x = 0;
      particle.vel.y = 0;
      return;
    }
    const gravity = 0.1;
    const airResistance = 0.99;
    const wind = 0.05;
    particle.vel.y += gravity;
    particle.vel.x += wind;
    particle.vel.x *= airResistance;
    particle.vel.y *= airResistance;
    particle.pos.x += particle.vel.x;
    particle.pos.y += particle.vel.y;
    if (particle.z !== undefined) {
      particle.z = Math.max(0, particle.z - particle.vel.y * 2);
    }
    if (particle.pos.x < 0)
      particle.pos.x = this.fieldWidth;
    if (particle.pos.x > this.fieldWidth)
      particle.pos.x = 0;
    if (particle.z !== undefined && particle.z <= 0) {
      particle.landed = true;
      particle.z = 0;
      const gridX = Math.floor(particle.pos.x / 8);
      const gridY = Math.floor(particle.pos.y / 8);
      particle.pos.x = gridX * 8 + 4;
      particle.pos.y = gridY * 8 + 4;
      particle.vel.x = 0;
      particle.vel.y = 0;
      particle.lifetime = Math.min(particle.lifetime, 30);
      this.humidityField.addGradient(gridX, gridY, 1, 0.05);
    }
  }
  spawnLeafParticle() {
    this.particleArrays.addParticle({
      pos: {
        x: Simulator.rng.random() * this.fieldWidth,
        y: -2
      },
      vel: {
        x: (Simulator.rng.random() - 0.5) * 0.1,
        y: Simulator.rng.random() * 0.05 + 0.02
      },
      radius: Simulator.rng.random() * 1.5 + 0.5,
      lifetime: 1000 + Simulator.rng.random() * 500,
      z: 10 + Simulator.rng.random() * 20,
      type: "leaf",
      landed: false
    });
  }
  updateScalarFields() {
    this.temperatureField.diffuse(0.02);
    this.temperatureField.decay(0.0005);
    this.humidityField.diffuse(0.03);
    this.humidityField.decay(0.001);
    this.pressureField.decayAndDiffuse(0.01, 0.12);
  }
  applyFieldInteractions() {
    if (!this.temperatureField || !this.humidityField)
      return;
    const startY = this.ticks % 10 * Math.floor(this.fieldHeight / 10);
    const endY = Math.min(startY + Math.floor(this.fieldHeight / 10), this.fieldHeight);
    for (let y = startY;y < endY; y++) {
      for (let x = 0;x < this.fieldWidth; x++) {
        const temp = this.temperatureField.get(x, y);
        const humidity = this.humidityField.get(x, y);
        if (temp > 30) {
          const evaporation = (temp - 30) * 0.001;
          this.humidityField.add(x, y, -evaporation);
        }
        if (humidity > 0.8) {
          const condensation = (humidity - 0.8) * 0.01;
          this.humidityField.add(x, y, -condensation);
        }
      }
    }
  }
  updateUnitTemperatureEffects() {
    for (const unit of this.units) {
      if (unit.meta.phantom)
        continue;
      if (unit.state === "dead")
        continue;
      const pos = unit.pos;
      const x = Math.floor(pos.x);
      const y = Math.floor(pos.y);
      if (unit.type === "freezebot") {
        const currentTemp = this.temperatureField.get(x, y);
        if (currentTemp > 0) {
          this.temperatureField.addGradient(x, y, 4, -0.5);
          this.temperatureField.set(x, y, currentTemp * 0.95);
        }
      } else if (unit.tags?.includes("construct")) {
        this.temperatureField.addGradient(x, y, 2, 1);
      } else {
        this.temperatureField.addGradient(x, y, 2, 0.5);
      }
      if (unit.state === "walk" || unit.state === "attack") {
        this.humidityField.addGradient(x, y, 1.5, 0.02);
      }
    }
  }
  get temperature() {
    let total = 0;
    let count = 0;
    for (let x = 0;x < this.fieldWidth; x++) {
      for (let y = 0;y < this.fieldHeight; y++) {
        total += this.temperatureField.get(x, y);
        count++;
      }
    }
    return count > 0 ? Math.round(total / count) : 20;
  }
  getTemperature(x, y) {
    return this.temperatureField.get(x, y);
  }
  getHumidity(x, y) {
    return this.humidityField.get(x, y);
  }
  getPressure(x, y) {
    return this.pressureField.get(x, y);
  }
  addHeat(x, y, intensity, radius = 2) {
    this.temperatureField.addGradient(x, y, radius, intensity);
  }
  addMoisture(x, y, intensity, radius = 3) {
    this.humidityField.addGradient(x, y, radius, intensity);
  }
  adjustPressure(x, y, intensity, radius = 4) {
    this.pressureField.addGradient(x, y, radius, intensity);
  }
  updateWeather() {
    if (this.weather.duration > 0) {
      this.weather.duration--;
      this.applyWeatherEffects();
      if (this.weather.duration <= 0) {
        this.weather.current = "clear";
        this.weather.intensity = 0;
      }
    }
  }
  applyWeatherEffects() {
    switch (this.weather.current) {
      case "rain":
        this.applyRainEffects();
        break;
      case "storm":
        this.applyStormEffects();
        break;
      case "leaves":
        this.applyLeavesEffects();
        break;
    }
  }
  applyRainEffects() {
    const intensity = this.weather.intensity;
    for (let i = 0;i < Math.ceil(intensity * 5); i++) {
      const x = Simulator.rng.random() * this.fieldWidth;
      const y = Simulator.rng.random() * this.fieldHeight;
      this.humidityField.addGradient(x, y, 2, intensity * 0.1);
    }
    for (let i = 0;i < Math.ceil(intensity * 3); i++) {
      const x = Simulator.rng.random() * this.fieldWidth;
      const y = Simulator.rng.random() * this.fieldHeight;
      this.temperatureField.addGradient(x, y, 3, -intensity * 2);
    }
    if (Simulator.rng.random() < intensity * 0.5) {
      this.spawnRainParticle();
    }
    this.extinguishFires();
  }
  applyStormEffects() {
    this.applyRainEffects();
    const intensity = this.weather.intensity;
    for (let i = 0;i < Math.ceil(intensity * 3); i++) {
      const x = Simulator.rng.random() * this.fieldWidth;
      const y = Simulator.rng.random() * this.fieldHeight;
      const pressureChange = (Simulator.rng.random() - 0.5) * intensity * 0.2;
      this.pressureField.addGradient(x, y, 4, pressureChange);
    }
  }
  applyLeavesEffects() {
    const intensity = this.weather.intensity;
    if (Simulator.rng.random() < intensity * 0.3) {
      const leafCount = 1 + Math.floor(Simulator.rng.random() * 3);
      for (let i = 0;i < leafCount; i++) {
        this.particleArrays.addParticle({
          id: `leaf_${Date.now()}_${this.ticks}_${i}`,
          type: "leaf",
          pos: {
            x: Simulator.rng.random() * this.fieldWidth * 8,
            y: -10 - Simulator.rng.random() * 10
          },
          vel: {
            x: Simulator.rng.random() * 0.5 - 0.25,
            y: 0.2 + Simulator.rng.random() * 0.2
          },
          z: 15 + Simulator.rng.random() * 25,
          lifetime: 400 + Simulator.rng.random() * 200,
          radius: 1,
          color: "green"
        });
      }
    }
  }
  setWeather(type, duration = 80, intensity = 0.7) {
    this.weather.current = type;
    this.weather.duration = duration;
    this.weather.intensity = intensity;
    if (type !== "clear" && duration > 0) {
      this.enableEnvironmentalEffects = true;
    }
  }
  spawnRainParticle() {
    this.particleArrays.addParticle({
      pos: {
        x: Simulator.rng.random() * this.fieldWidth,
        y: -1
      },
      vel: {
        x: 0.2 + Simulator.rng.random() * 0.3,
        y: 0.8 + Simulator.rng.random() * 0.4
      },
      radius: 0.5 + Simulator.rng.random() * 0.5,
      lifetime: 50 + Simulator.rng.random() * 30,
      z: 5 + Simulator.rng.random() * 10,
      type: "rain",
      landed: false
    });
  }
  spawnFireParticle(x, y) {
    this.particleArrays.addParticle({
      pos: { x, y },
      vel: {
        x: (Simulator.rng.random() - 0.5) * 0.4,
        y: -0.2 - Simulator.rng.random() * 0.3
      },
      radius: 0.8 + Simulator.rng.random() * 0.7,
      lifetime: 30 + Simulator.rng.random() * 40,
      z: Simulator.rng.random() * 3,
      type: "debris",
      landed: false
    });
  }
  setUnitOnFire(unit) {
    if (unit.meta?.onFire)
      return;
    this.queuedCommands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          ...unit.meta,
          onFire: true,
          fireDuration: 40,
          fireTickDamage: 2
        }
      }
    });
  }
  processFireEffects() {
    for (const unit of this.units) {
      if (unit.meta && unit.meta.onFire && unit.meta.fireDuration > 0) {
        this.queuedCommands.push({
          type: "damage",
          params: {
            targetId: unit.id,
            amount: unit.meta.fireTickDamage || 2,
            aspect: "fire",
            sourceId: "fire"
          }
        });
        this.queuedCommands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              ...unit.meta,
              fireDuration: unit.meta.fireDuration - 1
            }
          }
        });
        if (Simulator.rng.random() < 0.3) {
          const offsetX = (Simulator.rng.random() - 0.5) * 2;
          const offsetY = (Simulator.rng.random() - 0.5) * 2;
          this.spawnFireParticle(unit.pos.x + offsetX, unit.pos.y + offsetY);
        }
        this.addHeat(unit.pos.x, unit.pos.y, 3, 1.5);
        if (unit.meta.fireDuration <= 0) {
          unit.meta.onFire = false;
          delete unit.meta.fireDuration;
          delete unit.meta.fireTickDamage;
        }
      }
    }
  }
  extinguishFires() {
    if (this.weather.current === "rain" || this.weather.current === "storm") {
      for (const unit of this.units) {
        if (unit.meta?.onFire) {
          const humidity = this.getHumidity(unit.pos.x, unit.pos.y);
          const temperature = this.getTemperature(unit.pos.x, unit.pos.y);
          if (humidity > 0.6 && temperature < 30) {
            this.queuedCommands.push({
              type: "meta",
              params: {
                unitId: unit.id,
                meta: {
                  ...unit.meta,
                  onFire: false,
                  fireDuration: undefined,
                  fireTickDamage: undefined
                }
              }
            });
          }
        }
      }
    }
  }
  processWeatherCommand(command, ...args) {
    switch (command) {
      case "rain":
        const duration = parseInt(args[0]) || 80;
        const intensity = parseFloat(args[1]) || 0.7;
        this.setWeather("rain", duration, intensity);
        break;
      case "storm":
        const stormDuration = parseInt(args[0]) || 120;
        const stormIntensity = parseFloat(args[1]) || 0.9;
        this.setWeather("storm", stormDuration, stormIntensity);
        break;
      case "clear":
        this.setWeather("clear", 0, 0);
        break;
      default:
        console.warn(`Unknown weather command: ${command}`);
    }
  }
  accept(input) {
    this.handleInput(input);
    this.step();
    return this;
  }
  activeRules = [];
  selectActiveRules() {
    const tick = this.ticks;
    this.activeRules = [];
    for (const rule of this.rulebook) {
      const name = rule.constructor.name;
      switch (name) {
        case "GrapplingPhysics":
          if (!this.hasGrapplingHooks())
            continue;
          break;
        case "AirdropPhysics":
          if (!this.hasAirdrops())
            continue;
          break;
        case "StatusEffects":
          if (!this.hasStatusEffects())
            continue;
          break;
        case "Jumping":
          if (!this.hasJumpingUnits())
            continue;
          break;
        case "Tossing":
          if (!this.hasTossedUnits())
            continue;
          break;
        case "AreaOfEffect":
          if (!this.hasAreaEffects())
            continue;
          break;
        case "ProjectileMotion":
          if (!this.projectiles || this.projectiles.length === 0)
            continue;
          break;
        case "Particles":
          if (!this.particleArrays || this.particleArrays.activeCount === 0)
            continue;
          break;
        case "LightningStorm":
          if (!this.lightningActive)
            continue;
          break;
        case "BiomeEffects":
          if (!this.enableEnvironmentalEffects && this.weather.current === "clear")
            continue;
          break;
        case "Cleanup":
          if (!this.hasDeadUnits())
            continue;
          break;
        case "Perdurance":
          if (!this.hasUnitsWithTimers())
            continue;
          break;
        case "HugeUnits":
          if (!this.hasHugeUnits())
            continue;
          break;
        case "SegmentedCreatures":
          if (!this.hasSegmentedCreatures())
            continue;
          break;
        case "UnitMovement":
          break;
        case "UnitBehavior":
          if (!this.hasHostileUnits())
            continue;
          break;
        case "MeleeCombat":
          if (!this.hasOpposingTeams())
            continue;
          break;
        case "Abilities":
          if (!this.hasUnitsWithAbilities())
            continue;
          break;
        case "Knockback":
          if (!this.hadRecentCombat)
            continue;
          break;
        case "AmbientSpawning":
        case "AmbientBehavior":
          if (tick % 30 !== 0)
            continue;
          break;
      }
      this.activeRules.push(rule);
    }
  }
  hasGrapplingHooks() {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.grapplingHook)
        return true;
    }
    return false;
  }
  hasAirdrops() {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.tags?.includes("airdrop"))
        return true;
    }
    return false;
  }
  hasStatusEffects() {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.statusEffects && data.meta.statusEffects.length > 0)
        return true;
    }
    return false;
  }
  hasJumpingUnits() {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.jumping)
        return true;
    }
    return false;
  }
  hasTossedUnits() {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.tossed)
        return true;
    }
    return false;
  }
  hasHugeUnits() {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.huge)
        return true;
    }
    return false;
  }
  hasSegmentedCreatures() {
    const arrays = this.unitArrays;
    const coldData = this.unitColdData;
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.isSegment || data?.meta?.isSegmentHead)
        return true;
    }
    return false;
  }
  hadRecentCombat = false;
  hasMovingUnits() {
    const arrays = this.unitArrays;
    for (const i of arrays.activeIndices) {
      if (arrays.intendedMoveX[i] !== 0 || arrays.intendedMoveY[i] !== 0)
        return true;
    }
    return false;
  }
  hasHostileUnits() {
    const arrays = this.unitArrays;
    for (const i of arrays.activeIndices) {
      if (arrays.team[i] === 1)
        return true;
    }
    return false;
  }
  hasOpposingTeams() {
    const arrays = this.unitArrays;
    let hasFriendly = false;
    let hasHostile = false;
    for (const i of arrays.activeIndices) {
      if (arrays.team[i] === 0)
        hasFriendly = true;
      if (arrays.team[i] === 1)
        hasHostile = true;
      if (hasFriendly && hasHostile)
        return true;
    }
    return false;
  }
  hasUnitsWithAbilities() {
    const coldData = this.unitColdData;
    const arrays = this.unitArrays;
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.abilities && data.abilities.length > 0)
        return true;
    }
    return false;
  }
  hasDeadUnits() {
    const arrays = this.unitArrays;
    for (const i of arrays.activeIndices) {
      if (arrays.hp[i] <= 0)
        return true;
    }
    return false;
  }
  hasUnitsWithTimers() {
    const coldData = this.unitColdData;
    const arrays = this.unitArrays;
    for (const i of arrays.activeIndices) {
      const id = arrays.unitIds[i];
      const data = coldData.get(id);
      if (data?.meta?.timers || data?.meta?.lifespan || data?.meta?.ttl)
        return true;
    }
    return false;
  }
  hasAreaEffects() {
    return false;
  }
  hasKnockbackUnits() {
    for (const unit of this.units) {
      if (unit.meta?.knockback)
        return true;
    }
    return false;
  }
  clone() {
    const newSimulator = new Simulator;
    for (let i = 0;i < this.unitArrays.capacity; i++) {
      if (this.unitArrays.active[i] === 0)
        continue;
      const unit = {
        id: this.unitArrays.unitIds[i],
        pos: { x: this.unitArrays.posX[i], y: this.unitArrays.posY[i] },
        intendedMove: {
          x: this.unitArrays.intendedMoveX[i],
          y: this.unitArrays.intendedMoveY[i]
        },
        hp: this.unitArrays.hp[i],
        maxHp: this.unitArrays.maxHp[i],
        team: ["friendly", "hostile", "neutral"][this.unitArrays.team[i]],
        state: ["idle", "walk", "attack", "dead"][this.unitArrays.state[i]],
        mass: this.unitArrays.mass[i],
        dmg: this.unitArrays.dmg[i],
        sprite: this.unitColdData.get(this.unitArrays.unitIds[i])?.sprite || "default",
        abilities: this.unitColdData.get(this.unitArrays.unitIds[i])?.abilities || [],
        meta: this.unitColdData.get(this.unitArrays.unitIds[i])?.meta || {}
      };
      newSimulator.addUnit(unit);
    }
    return newSimulator;
  }
  validMove(unit, dx, dy) {
    if (!unit)
      return false;
    if (unit.meta.huge) {
      const bodyPositions = this.getHugeUnitBodyPositions(unit);
      for (const pos of bodyPositions) {
        const newX2 = pos.x + dx;
        const newY2 = pos.y + dy;
        if (newX2 < 0 || newX2 >= this.fieldWidth || newY2 < 0 || newY2 >= this.fieldHeight) {
          return false;
        }
        if (this.isApparentlyOccupied(newX2, newY2, unit)) {
          return false;
        }
      }
      return true;
    }
    const newX = unit.pos.x + dx;
    const newY = unit.pos.y + dy;
    if (newX < 0 || newX >= this.fieldWidth || newY < 0 || newY >= this.fieldHeight)
      return false;
    return !this.isApparentlyOccupied(newX, newY, unit);
  }
  getHugeUnitBodyPositions(unit) {
    if (!unit.meta.huge)
      return [unit.pos];
    return [
      unit.pos,
      { x: unit.pos.x, y: unit.pos.y + 1 },
      { x: unit.pos.x, y: unit.pos.y + 2 },
      { x: unit.pos.x, y: unit.pos.y + 3 }
    ];
  }
  getRealUnits() {
    return this.units.filter((unit) => !unit.meta.phantom);
  }
  getApparentUnits() {
    return this.units;
  }
  isApparentlyOccupied(x, y, excludeUnit = null) {
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    if (this.positionMap.size > 0) {
      const key = `${roundedX},${roundedY}`;
      const unitsAtPos = this.positionMap.get(key);
      if (!unitsAtPos || unitsAtPos.size === 0) {
        return false;
      }
      for (const unit of unitsAtPos) {
        if (unit === excludeUnit)
          continue;
        if (this.isOwnPhantom(unit, excludeUnit))
          continue;
        return true;
      }
      return false;
    }
    for (const unit of this.units) {
      if (unit === excludeUnit)
        continue;
      if (unit.state === "dead")
        continue;
      const positions = this.getHugeUnitBodyPositions(unit);
      for (const pos of positions) {
        if (Math.round(pos.x) === roundedX && Math.round(pos.y) === roundedY) {
          if (!this.isOwnPhantom(unit, excludeUnit)) {
            return true;
          }
        }
      }
    }
    return false;
  }
  isOwnPhantom(unit, owner) {
    if (!unit)
      return false;
    return unit.meta && unit.meta.phantom && unit.meta.parentId === owner?.id || unit === owner;
  }
  unitCache = new Map;
  creatureById(id) {
    return this.unitCache.get(id);
  }
  objEq(a, b) {
    if (a === b)
      return true;
    if (typeof a !== "object" || typeof b !== "object")
      return false;
    if (Object.keys(a).length !== Object.keys(b).length)
      return false;
    for (const key of Object.keys(a)) {
      if (!b.hasOwnProperty(key) || a[key] !== b[key])
        return false;
    }
    return true;
  }
  delta(before, after) {
    if (before.id !== after.id) {
      throw new Error(`Unit IDs do not match: ${before.id} !== ${after.id}`);
    }
    const changes = {};
    for (const key of Object.keys(before)) {
      if (!this.objEq(before[key], after[key])) {
        changes[key] = after[key];
      }
    }
    return changes;
  }
  prettyPrint(val) {
    return (JSON.stringify(val, null, 2) || "").replace(/\n/g, "").replace(/ /g, "");
  }
  attrEmoji = {
    hp: "❤️",
    mass: "⚖️",
    pos: "\uD83D\uDCCD",
    intendedMove: "➡️",
    intendedTarget: "\uD83C\uDFAF",
    state: "\uD83D\uDEE1️"
  };
  updateChangedUnits() {
    return;
  }
  getChangedUnits() {
    return Array.from(this.changedUnits);
  }
  hasUnitChanged(unitId) {
    return this.changedUnits.has(unitId);
  }
  _debugUnits(unitsBefore, phase) {
    let printedPhase = false;
    for (const u of this.units) {
      if (unitsBefore) {
        const before = unitsBefore.find((b) => b.id === u.id);
        if (before) {
          let delta = this.delta(before, u);
          if (Object.keys(delta).length === 0) {
            continue;
          }
          if (!printedPhase) {
            console.debug(`## ${phase}`);
            printedPhase = true;
          }
          let str = `  ${u.id}`;
          Object.keys(delta).forEach((key) => {
            let icon = this.attrEmoji[key] || "|";
            str += ` | ${icon} ${key}: ${this.prettyPrint(before[key])} → ${this.prettyPrint(u[key])}`;
          });
          console.debug(str);
        }
      } else {
        console.debug(`  ${u.id}: (${u.pos.x},${u.pos.y})`, JSON.stringify(u));
      }
    }
  }
  handleInput(input) {
    for (const unit of this.units) {
      const command = input.commands[unit.id];
      if (command) {
        for (const cmd of command) {
          if (cmd.action === "move") {
            if (cmd.target) {
              this.proxyManager.setIntendedMove(unit.id, cmd.target);
            }
          }
          if (cmd.action === "fire" && cmd.target) {
            const target = this.units.find((u) => u.id === cmd.target);
            if (target) {
              const dx = target.pos.x - unit.pos.x;
              const dy = target.pos.y - unit.pos.y;
              const mag = Math.sqrt(dx * dx + dy * dy) || 1;
              const speed = 1;
              const vel = { x: dx / mag * speed, y: dy / mag * speed };
              const offset = 0.5;
              const projX = unit.pos.x + dx / mag * offset;
              const projY = unit.pos.y + dy / mag * offset;
              this.projectiles.push({
                id: `proj_${unit.id}_${Date.now()}`,
                pos: { x: projX, y: projY },
                vel,
                radius: 1.5,
                damage: 5,
                team: unit.team,
                type: "bullet"
              });
            }
          }
        }
      }
    }
    return this;
  }
  unitAt(x, y) {
    return this.units.find((u) => u.pos.x === x && u.pos.y === y);
  }
  areaDamage(config) {
    for (const unit of this.units) {
      if (unit.team !== config.team) {
        const dx = unit.pos.x - config.pos.x;
        const dy = unit.pos.y - config.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= config.radius) {
          unit.hp -= config.damage;
        }
      }
    }
  }
  forcedAbilitiesThisTick = new Set;
  forceAbility(unitId, abilityName, target) {
    const key = `${unitId}:${abilityName}`;
    this.forcedAbilitiesThisTick.add(key);
    const unit = this.units.find((u) => u.id === unitId);
    if (!unit || !Array.isArray(unit.abilities) || !unit.abilities.includes(abilityName))
      return;
    const abilitiesRule = this.rulebook.find((rule) => rule.constructor.name === "Abilities");
    if (!abilitiesRule) {
      console.warn("Abilities rule not found in rulebook");
      return;
    }
    const jsonAbility = Abilities.all[abilityName];
    if (!jsonAbility) {
      console.warn(`Ability ${abilityName} not found in JSON definitions`);
      return;
    }
    const context = this.getTickContext();
    const primaryTarget = target || unit;
    abilitiesRule.commands = [];
    abilitiesRule.cachedAllUnits = context.getAllUnits();
    for (const effect of jsonAbility.effects) {
      abilitiesRule.processEffectAsCommand(context, effect, unit, primaryTarget);
    }
    const generatedCommands = abilitiesRule.commands || [];
    this.queuedCommands.push(...generatedCommands);
    const proxyManager = this.proxyManager;
    if (proxyManager) {
      const currentTick = {
        ...unit.lastAbilityTick,
        [abilityName]: this.ticks
      };
      proxyManager.setLastAbilityTick(unit.id, currentTick);
    }
    this.queuedCommands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          lastAbilityTick: {
            ...unit.lastAbilityTick,
            [abilityName]: this.ticks
          }
        }
      }
    });
  }
}
if (typeof window !== "undefined") {
  window.Simulator = Simulator;
}

// src/assets/sprites/worm.png
var worm_default = "./worm-92c9gez2.png";

// src/assets/sprites/soldier.png
var soldier_default = "./soldier-0j6c9zsx.png";

// src/assets/sprites/farmer.png
var farmer_default = "./farmer-tm9rq99x.png";

// src/assets/sprites/slinger.png
var slinger_default = "./slinger-tvj5xwfw.png";

// src/assets/sprites/priest.png
var priest_default = "./priest-az5v6xrr.png";

// src/assets/sprites/bombardier.png
var bombardier_default = "./bombardier-5kg3dkb1.png";

// src/assets/sprites/squirrel-tamer.png
var squirrel_tamer_default = "./squirrel-tamer-cnfk4me3.png";

// src/assets/sprites/squirrel.png
var squirrel_default = "./squirrel-gz9w79f1.png";

// src/assets/sprites/megasquirrel.png
var megasquirrel_default = "./megasquirrel-vxqnyztg.png";

// src/assets/sprites/leaf.png
var leaf_default = "./leaf-pjfgv6yb.png";

// src/assets/sprites/rainmaker.png
var rainmaker_default = "./rainmaker-y0v4k2vy.png";

// src/assets/sprites/demon.png
var demon_default = "./demon-2xf3se22.png";

// src/assets/sprites/ghost.png
var ghost_default = "./ghost-s9m5dxts.png";

// src/assets/sprites/mimic-worm.png
var mimic_worm_default = "./mimic-worm-rn0fne7z.png";

// src/assets/sprites/skeleton.png
var skeleton_default = "./skeleton-q22hwgmm.png";

// src/assets/sprites/big-worm.png
var big_worm_default = "./big-worm-9exxdr2d.png";

// src/assets/sprites/skeleton-mage.png
var skeleton_mage_default = "./skeleton-mage-cty5jvgj.png";

// src/assets/sprites/clanker.png
var clanker_default = "./clanker-0c7vgxpa.png";

// src/assets/sprites/freezebot.png
var freezebot_default = "./freezebot-4th9t06k.png";

// src/assets/sprites/spikebot.png
var spikebot_default = "./spikebot-sajdgf8m.png";

// src/assets/sprites/swarmbot.png
var swarmbot_default = "./swarmbot-cfmj7xgj.png";

// src/assets/sprites/jumpbot.png
var jumpbot_default = "./jumpbot-ypx1893t.png";

// src/assets/sprites/zapper.png
var zapper_default = "./zapper-myj8845s.png";

// src/assets/sprites/toymaker.png
var toymaker_default = "./toymaker-enej8t2m.png";

// src/assets/sprites/bear.png
var bear_default = "./bear-hm0bngwz.png";

// src/assets/sprites/owl.png
var owl_default = "./owl-t7e37dw0.png";

// src/assets/sprites/deer.png
var deer_default = "./deer-t8aam5pf.png";

// src/assets/sprites/buck.png
var buck_default = "./buck-nzzsb6b0.png";

// src/assets/sprites/lightning.png
var lightning_default = "./lightning-2pxfn78c.png";

// src/assets/sprites/mechatron.png
var mechatron_default = "./mechatron-d189k72j.png";

// src/assets/sprites/mechatronist.png
var mechatronist_default = "./mechatronist-kc8rv770.png";

// src/assets/sprites/grappler.png
var grappler_default = "./grappler-a8japzw0.png";

// src/assets/sprites/waterpriest.png
var waterpriest_default = "./waterpriest-ahefte1a.png";

// src/assets/sprites/wormrider.png
var wormrider_default = "./wormrider-d0wns79r.png";

// src/assets/sprites/builder.png
var builder_default = "./builder-qn7pw3vp.png";

// src/assets/sprites/fueler.png
var fueler_default = "./fueler-jabczejz.png";

// src/assets/sprites/mechanic.png
var mechanic_default = "./mechanic-k57mac7k.png";

// src/assets/sprites/engineer.png
var engineer_default = "./engineer-z765hv2k.png";

// src/assets/sprites/welder.png
var welder_default = "./welder-zgy0yw1q.png";

// src/assets/sprites/assembler.png
var assembler_default = "./assembler-4gw3mfrz.png";

// src/assets/sprites/champion.png
var champion_default = "./champion-nghwrbjt.png";

// src/assets/sprites/penguin.png
var penguin_default = "./penguin-h853vw3n.png";

// src/assets/sprites/ninja.png
var ninja_default = "./ninja-bxxvyrng.png";

// src/assets/sprites/hero-head.png
var hero_head_default = "./hero-head-xwa3kja7.png";

// src/assets/sprites/hero-torso.png
var hero_torso_default = "./hero-torso-hh9f47pd.png";

// src/assets/sprites/hero-larm.png
var hero_larm_default = "./hero-larm-8cygbfyv.png";

// src/assets/sprites/hero-rarm.png
var hero_rarm_default = "./hero-rarm-m7v87301.png";

// src/assets/sprites/hero-lleg.png
var hero_lleg_default = "./hero-lleg-z3dvyvzy.png";

// src/assets/sprites/hero-rleg.png
var hero_rleg_default = "./hero-rleg-cvty0wgc.png";

// src/assets/sprites/hero-sword.png
var hero_sword_default = "./hero-sword-5j9c5pyt.png";

// src/assets/bg/lake.png
var lake_default = "./lake-9sfzs8hj.png";

// src/assets/bg/mountain.png
var mountain_default = "./mountain-z246yf58.png";

// src/assets/bg/monastery.png
var monastery_default = "./monastery-ekwteah4.png";

// src/assets/bg/burning-city.png
var burning_city_default = "./burning-city-8a8gprgs.png";

// src/assets/bg/winter.png
var winter_default = "./winter-g64hk94s.png";

// src/assets/bg/toyforge.png
var toyforge_default = "./toyforge-89sd3609.png";

// src/assets/bg/desert.png
var desert_default = "./desert-t7dpe1vq.png";

// src/assets/bg/forest.png
var forest_default = "./forest-nx4jxbq0.png";

// src/assets/bg/rooftop.png
var rooftop_default = "./rooftop-ns1n6ecs.png";

// src/assets/bg/cityscape.png
var cityscape_default = "./cityscape-nz4gyskq.png";

// src/assets/bg/castle.png
var castle_default = "./castle-8zfnyra0.png";

// src/assets/bg/tower-gate.png
var tower_gate_default = "./tower-gate-9pdx6a76.png";

// src/assets/cell-effects.png
var cell_effects_default = "./cell-effects-zxt5xmh2.png";

// src/views/view.ts
class View {
  ctx;
  sim;
  width;
  height;
  sprites;
  backgrounds;
  constructor(ctx, sim, width, height, sprites, backgrounds = new Map) {
    this.ctx = ctx;
    this.sim = sim;
    this.width = width;
    this.height = height;
    this.sprites = sprites;
    this.backgrounds = backgrounds;
  }
  show() {
    throw new Error("Method 'show' must be implemented in subclass " + this.constructor.name);
  }
  unitInterpolations = new Map;
  projectileInterpolations = new Map;
  previousPositions = new Map;
  previousProjectilePositions = new Map;
  animationTime = 0;
  updateMovementInterpolations() {
    const deltaTime = 16;
    this.animationTime += deltaTime;
    for (const unit of this.sim.units) {
      const prevPos = this.previousPositions.get(unit.id);
      const currentZ = unit.meta.z || 0;
      if (!prevPos) {
        this.previousPositions.set(unit.id, {
          x: unit.pos.x,
          y: unit.pos.y,
          z: currentZ
        });
        continue;
      }
      if (prevPos.x !== unit.pos.x || prevPos.y !== unit.pos.y) {
        const isAirborne = unit.meta?.jumping || unit.meta?.tossing;
        if (!isAirborne || !this.unitInterpolations.has(unit.id)) {
          this.unitInterpolations.set(unit.id, {
            startX: prevPos.x,
            startY: prevPos.y,
            startZ: prevPos.z,
            targetX: unit.pos.x,
            targetY: unit.pos.y,
            targetZ: currentZ,
            progress: 0,
            duration: isAirborne ? 200 : 66
          });
        }
      }
      this.previousPositions.set(unit.id, {
        x: unit.pos.x,
        y: unit.pos.y,
        z: currentZ
      });
    }
    let entries = Array.from(this.unitInterpolations.entries());
    for (const [unitId, interp] of entries) {
      interp.progress += deltaTime / interp.duration;
      if (interp.progress >= 1) {
        this.unitInterpolations.delete(unitId);
      }
    }
  }
  updateProjectileInterpolations() {
    const deltaTime = 16;
    for (const projectile of this.sim.projectiles) {
      const prevPos = this.previousProjectilePositions.get(projectile.id);
      const currentZ = projectile.z || 0;
      if (!prevPos) {
        this.previousProjectilePositions.set(projectile.id, {
          x: projectile.pos.x,
          y: projectile.pos.y,
          z: currentZ
        });
        continue;
      }
      if (prevPos.x !== projectile.pos.x || prevPos.y !== projectile.pos.y || prevPos.z !== currentZ) {
        const duration = projectile.type === "bomb" ? 400 : 200;
        this.projectileInterpolations.set(projectile.id, {
          startX: prevPos.x,
          startY: prevPos.y,
          startZ: prevPos.z,
          targetX: projectile.pos.x,
          targetY: projectile.pos.y,
          targetZ: currentZ,
          progress: 0,
          duration
        });
        this.previousProjectilePositions.set(projectile.id, {
          x: projectile.pos.x,
          y: projectile.pos.y,
          z: currentZ
        });
      }
    }
    const activeProjectileIds = new Set(this.sim.projectiles.map((p) => p.id));
    const keys = Array.from(this.projectileInterpolations.keys());
    for (const key of keys) {
      if (!activeProjectileIds.has(key)) {
        this.projectileInterpolations.delete(key);
        this.previousProjectilePositions.delete(key);
      }
    }
    const entries = Array.from(this.projectileInterpolations.entries());
    for (const [projectileId, interp] of entries) {
      interp.progress += deltaTime / interp.duration;
      if (interp.progress >= 1) {
        this.projectileInterpolations.delete(projectileId);
      }
    }
  }
}

// src/types/SpriteScale.ts
function getSpriteDimensions(scale) {
  switch (scale) {
    case "pixie" /* PIXIE */:
      return { width: 8, height: 8 };
    case "folk" /* FOLK */:
      return { width: 16, height: 16 };
    case "creature" /* CREATURE */:
      return { width: 24, height: 24 };
    case "hero" /* HERO */:
      return { width: 48, height: 48 };
    case "titan" /* TITAN */:
      return { width: 64, height: 64 };
    case "deity" /* DEITY */:
      return { width: 128, height: 128 };
    default:
      return { width: 16, height: 16 };
  }
}
function getUnitScale(unit) {
  if (unit.meta?.scale) {
    return unit.meta.scale;
  }
  if (unit.tags?.includes("pixie") || unit.tags?.includes("tiny")) {
    return "pixie" /* PIXIE */;
  }
  if (unit.tags?.includes("hero") || unit.tags?.includes("champion")) {
    return "hero" /* HERO */;
  }
  if (unit.tags?.includes("titan") || unit.tags?.includes("colossal")) {
    return "titan" /* TITAN */;
  }
  if (unit.tags?.includes("deity") || unit.tags?.includes("god")) {
    return "deity" /* DEITY */;
  }
  if (unit.meta?.huge) {
    return "titan" /* TITAN */;
  }
  return "folk" /* FOLK */;
}

// src/rendering/unit_renderer.ts
class UnitRenderer {
  sim;
  constructor(sim) {
    this.sim = sim;
  }
  shouldRenderUnit(unit) {
    if (unit.meta.phantom) {
      return false;
    }
    if (unit.state === "dead" && unit.hp <= 0) {
      return true;
    }
    return true;
  }
  shouldBlinkFromDamage(unit, animationTime) {
    const recentDamage = this.sim.processedEvents.find((event) => event.kind === "damage" && event.target === unit.id && event.meta.tick && this.sim.ticks - event.meta.tick < 2);
    return recentDamage && Math.floor(animationTime / 100) % 2 === 0;
  }
  getAnimationFrame(unit, animationTime) {
    if (unit.tags?.includes("hero") || unit.meta?.scale === "hero") {
      if (unit.state === "dead") {
        return 12;
      } else if (unit.state === "attack") {
        return 6;
      } else if (unit.state === "walk" || unit.intendedMove && (unit.intendedMove.x !== 0 || unit.intendedMove.y !== 0)) {
        return 1;
      } else {
        return 0;
      }
    }
    if (unit.state === "dead") {
      return 3;
    } else if (unit.state === "attack") {
      return 2;
    } else if (unit.state === "walk" || unit.intendedMove && (unit.intendedMove.x !== 0 || unit.intendedMove.y !== 0)) {
      return 1;
    } else {
      return 0;
    }
  }
  getSpriteDimensions(unit) {
    const scale = getUnitScale(unit);
    const dimensions = getSpriteDimensions(scale);
    if (unit.meta?.width && unit.meta?.height) {
      return {
        width: unit.meta.width,
        height: unit.meta.height
      };
    }
    return dimensions;
  }
  getRenderPosition(unit, interpolations) {
    let x = unit.pos.x;
    let y = unit.pos.y;
    let z = unit.meta.z || 0;
    const interp = interpolations?.get(unit.id);
    if (interp) {
      const easeProgress = this.easeInOutQuad(interp.progress);
      x = interp.startX + (interp.targetX - interp.startX) * easeProgress;
      y = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      z = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
    }
    return { x, y, z };
  }
  drawShadow(ctx, unit, screenX, screenY, scale = 8) {
    const isHuge = unit.meta.huge;
    const z = unit.meta?.z || 0;
    if (z <= 0)
      return;
    ctx.save();
    ctx.fillStyle = "#00000040";
    ctx.beginPath();
    const shadowWidth = isHuge ? 24 : 6;
    const shadowHeight = isHuge ? 6 : 3;
    ctx.ellipse(screenX, screenY, shadowWidth, shadowHeight, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }
  drawHealthBar(ctx, unit, screenX, screenY) {
    if (unit.hp >= unit.maxHp)
      return;
    const barWidth = 12;
    const barHeight = 2;
    const barY = screenY - 12;
    ctx.fillStyle = "#000000";
    ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);
    const healthPercent = Math.max(0, unit.hp / unit.maxHp);
    const healthColor = healthPercent > 0.5 ? "#00ff00" : healthPercent > 0.25 ? "#ffff00" : "#ff0000";
    ctx.fillStyle = healthColor;
    ctx.fillRect(screenX - barWidth / 2, barY, barWidth * healthPercent, barHeight);
  }
  renderUnit(ctx, unit, sprites, screenX, screenY, options) {
    if (unit.meta?.rig) {
      this.renderRiggedUnit(ctx, unit, sprites, screenX, screenY, options);
      return;
    }
    const sprite = sprites.get(unit.sprite || unit.type);
    if (!sprite || !sprite.complete) {
      ctx.fillStyle = this.getUnitColor(unit);
      ctx.fillRect(screenX - 8, screenY - 8, 16, 16);
      return;
    }
    const dimensions = this.getSpriteDimensions(unit);
    const frameWidth = dimensions.width;
    const frameCount = Math.floor(sprite.width / frameWidth);
    const frame = this.getAnimationFrame(unit, Date.now());
    ctx.save();
    if (options?.flipHorizontal) {
      ctx.scale(-1, 1);
      ctx.translate(-screenX * 2 - frameWidth, 0);
    }
    ctx.drawImage(sprite, frame * frameWidth, 0, frameWidth, dimensions.height, screenX - frameWidth / 2, screenY - dimensions.height / 2, frameWidth, dimensions.height);
    ctx.restore();
  }
  renderRiggedUnit(ctx, unit, sprites, centerX, centerY, options) {
    const parts = unit.meta.rig;
    if (!parts || !Array.isArray(parts))
      return;
    const shouldFlip = options?.flipHorizontal || unit.meta?.facing === "left";
    for (const part of parts) {
      const sprite = sprites.get(part.sprite);
      if (!sprite || !sprite.complete) {
        console.warn(`Missing sprite for ${part.name}: ${part.sprite}`);
        continue;
      }
      const offsetX = shouldFlip ? -part.offset.x : part.offset.x;
      const pixelX = centerX + offsetX;
      const pixelY = centerY + part.offset.y;
      const frameX = part.frame * 16;
      ctx.save();
      if (shouldFlip) {
        ctx.scale(-1, 1);
        ctx.translate(-centerX * 2, 0);
      }
      if (part.rotation) {
        ctx.translate(pixelX, pixelY);
        const rotation = shouldFlip ? -part.rotation : part.rotation;
        ctx.rotate(rotation);
        ctx.translate(-8, -8);
      } else {
        ctx.translate(pixelX - 8, pixelY - 8);
      }
      ctx.drawImage(sprite, frameX, 0, 16, 16, -1, -1, 18, 18);
      ctx.restore();
    }
  }
  getUnitColor(unit) {
    if (unit.team === "hostile")
      return "#ff4444";
    if (unit.team === "friendly")
      return "#4444ff";
    if (unit.sprite === "worm")
      return "#44ff44";
    return "#888888";
  }
  shouldFlipSprite(unit) {
    const facing = unit.meta.facing || "right";
    return facing === "left";
  }
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}

// src/views/orthographic.ts
class Orthographic extends View {
  unitRenderer;
  constructor(ctx, sim, width, height, sprites, backgrounds = new Map) {
    super(ctx, sim, width, height, sprites, backgrounds);
    this.unitRenderer = new UnitRenderer(sim);
  }
  show() {
    this.updateMovementInterpolations();
    this.updateProjectileInterpolations();
    this.ctx.save();
    this.ctx.globalAlpha = 0.2;
    this.grid();
    this.ctx.restore();
    for (const unit of this.sim.units) {
      this.showUnit(unit);
    }
    for (const projectile of this.sim.projectiles) {
      this.showProjectile(projectile);
    }
    this.renderOverlays();
  }
  grid({ dotSize } = { dotSize: 3 }) {
    const cellWidth = 8;
    const cellHeight = 8;
    for (let col = 0;col < Math.ceil(this.width / cellWidth); col++) {
      for (let row = 0;row < Math.ceil(this.height / cellHeight); row++) {
        const x = col * cellWidth;
        const y = row * cellHeight;
        if (x < this.width && y < this.height) {
          this.ctx.beginPath();
          this.ctx.arc(x + cellWidth / 2, y + cellHeight / 2, dotSize, 0, 2 * Math.PI);
          this.ctx.fillStyle = "#888";
          this.ctx.fill();
        }
      }
    }
  }
  showRiggedUnit(unit) {
    const renderPos = this.unitRenderer.getRenderPosition(unit, this.unitInterpolations);
    const parts = unit.meta.rig;
    if (!parts || !Array.isArray(parts))
      return;
    for (const part of parts) {
      const sprite = this.sprites.get(part.sprite);
      if (!sprite || !sprite.complete) {
        console.warn(`Missing sprite for part ${part.name}: ${part.sprite}`, sprite);
        this.ctx.fillStyle = "blue";
        this.ctx.fillRect(renderPos.x * 8 + part.offset.x, renderPos.y * 8 + part.offset.y - renderPos.z * 8, 16, 16);
        continue;
      }
      const pixelX = Math.round(renderPos.x * 8 + part.offset.x);
      const pixelY = Math.round(renderPos.y * 8 + part.offset.y - renderPos.z * 8);
      const frameX = part.frame * 16;
      this.ctx.save();
      if (part.rotation) {
        this.ctx.translate(pixelX + 8, pixelY + 8);
        this.ctx.rotate(part.rotation);
        this.ctx.translate(-8, -8);
      } else {
        this.ctx.translate(pixelX, pixelY);
      }
      this.ctx.drawImage(sprite, frameX, 0, 16, 16, 0, 0, 16, 16);
      this.ctx.restore();
    }
  }
  showUnit(unit) {
    if (!this.unitRenderer.shouldRenderUnit(unit)) {
      return;
    }
    if (this.unitRenderer.shouldBlinkFromDamage(unit, this.animationTime)) {
      return;
    }
    if (unit.meta?.rig) {
      this.showRiggedUnit(unit);
      return;
    }
    const renderPos = this.unitRenderer.getRenderPosition(unit, this.unitInterpolations);
    const renderX = renderPos.x;
    const renderY = renderPos.y;
    const renderZ = renderPos.z;
    const dimensions = this.unitRenderer.getSpriteDimensions(unit);
    const spriteWidth = dimensions.width;
    const spriteHeight = dimensions.height;
    const isHuge = unit.meta.huge;
    const cellWidth = 8;
    const cellHeight = 8;
    const gridCenterX = Math.round(renderX * cellWidth + cellWidth / 2);
    const gridCenterY = Math.round(renderY * cellHeight + cellHeight / 2);
    const pixelX = gridCenterX - spriteWidth / 2;
    const pixelY = gridCenterY - spriteHeight + cellHeight / 2;
    let realPixelY = pixelY;
    const sprite = this.sprites.get(unit.sprite);
    if (sprite && sprite.complete) {
      const frameIndex = this.unitRenderer.getAnimationFrame(unit, this.animationTime);
      const frameX = frameIndex * spriteWidth;
      if (renderZ > 0) {
        realPixelY -= renderZ * 8;
      }
      realPixelY = Math.round(realPixelY);
      this.unitRenderer.drawShadow(this.ctx, unit, gridCenterX, gridCenterY);
      this.ctx.save();
      const shouldFlip = !this.unitRenderer.shouldFlipSprite(unit);
      if (shouldFlip) {
        this.ctx.scale(-1, 1);
        this.ctx.translate(-pixelX * 2 - spriteWidth, 0);
      }
      this.ctx.drawImage(sprite, frameX, 0, spriteWidth, spriteHeight, pixelX, realPixelY, spriteWidth, spriteHeight);
      this.ctx.restore();
    } else {
      const fallbackX = Math.round(renderX * 8);
      const fallbackY = Math.round(renderY * 8);
      this.ctx.fillStyle = this.unitRenderer.getUnitColor(unit);
      this.ctx.fillRect(fallbackX, fallbackY, 8, 8);
      this.ctx.save();
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(fallbackX - 4, fallbackY - 10, 16, 8);
      this.ctx.fillStyle = "#000000";
      this.ctx.font = "6px monospace";
      this.ctx.textAlign = "center";
      const label = unit.type || unit.sprite || unit.id?.split("_")[0] || "???";
      this.ctx.fillText(label.substring(0, 10), fallbackX + 4, fallbackY - 4);
      this.ctx.restore();
    }
    if (typeof unit.hp === "number") {
      const maxHp = unit.maxHp || 100;
      const hpRatio = Math.max(0, Math.min(1, unit.hp / maxHp));
      this.drawBar("hit points", pixelX, realPixelY - 4, 16, 2, hpRatio);
    }
    if (unit.abilities && unit.abilities.includes("jumps") && unit.meta.jumping) {
      const jumpTarget = unit.meta.jumpTarget;
      const jumpOrigin = unit.meta.jumpOrigin;
      let duration = 10;
      if (jumpTarget && jumpOrigin) {
        const dx = jumpTarget.x - jumpOrigin.x;
        const dy = jumpTarget.y - jumpOrigin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        duration = Math.min(20, Math.max(5, Math.round(distance)));
      }
      const progress = unit.meta.jumpProgress || 0;
      const progressRatio = progress / duration || 0;
      if (progressRatio > 0 && progressRatio < 1) {
        this.drawBar("jump progress", pixelX, realPixelY - 6, 16, 2, progressRatio, "#ace");
      }
    }
  }
  drawBar(_label, pixelX, pixelY, width, height, ratio, colorOverride) {
    const barWidth = width;
    const barHeight = height;
    const barX = pixelX;
    const barY = pixelY - 4;
    this.ctx.fillStyle = "#333";
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    this.ctx.fillStyle = ratio > 0.5 ? "#0f0" : ratio > 0.2 ? "#ff0" : "#f00";
    if (colorOverride) {
      this.ctx.fillStyle = colorOverride;
    }
    this.ctx.fillRect(barX, barY, Math.round(barWidth * ratio), barHeight);
  }
  showProjectile(projectile) {
    let renderX = projectile.pos.x;
    let renderY = projectile.pos.y;
    let renderZ = projectile.z || 0;
    const interp = this.projectileInterpolations.get(projectile.id);
    if (interp) {
      const easeProgress = projectile.type === "bomb" ? this.easeInOutQuad(interp.progress) : interp.progress;
      renderX = interp.startX + (interp.targetX - interp.startX) * easeProgress;
      renderY = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      renderZ = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
    }
    const pixelX = Math.round(renderX * 8);
    const pixelY = Math.round(renderY * 8);
    let adjustedPixelY = pixelY;
    if (renderZ > 0) {
      adjustedPixelY -= renderZ * 8;
    }
    this.ctx.save();
    if (projectile.type === "bomb") {
      if (projectile.origin && projectile.target && projectile.progress && projectile.duration) {
        this.drawBombArcTrail(projectile);
      }
      this.ctx.fillStyle = "#000";
      this.ctx.strokeStyle = "#fff";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(pixelX + 4, adjustedPixelY + 4, (projectile.radius || 2) * 1.2, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
      if (renderZ > 0) {
        this.ctx.fillStyle = "#00000040";
        this.ctx.beginPath();
        this.ctx.arc(pixelX + 4, pixelY + 4, (projectile.radius || 2) * 0.8, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    } else {
      this.ctx.fillStyle = "#000";
      this.ctx.beginPath();
      this.ctx.arc(pixelX + 4, adjustedPixelY + 4, projectile.radius || 0.5, 0, 2 * Math.PI);
      this.ctx.fill();
      if (projectile.vel) {
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.3;
        this.ctx.beginPath();
        const trailX = pixelX + 4 - (projectile.vel.x || 0) * 4;
        const trailY = adjustedPixelY + 4 - (projectile.vel.y || 0) * 4;
        this.ctx.moveTo(trailX, trailY);
        this.ctx.lineTo(pixelX + 4, adjustedPixelY + 4);
        this.ctx.stroke();
      }
    }
    this.ctx.restore();
  }
  easeInOutQuad(t) {
    return t < 0.3 ? 4 * t * t : 0.36 + 0.64 * (t - 0.3) / 0.7;
  }
  drawBombArcTrail(projectile) {
    let { origin, target, progress, duration } = projectile;
    if (!origin || !target || progress === undefined || duration === undefined) {
      return;
    }
    const originX = origin.x * 8 + 4;
    const originY = origin.y * 8 + 4;
    const targetX = target.x * 8 + 4;
    const targetY = target.y * 8 + 4;
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const baseHeight = 12;
    const distanceMultiplier = Math.min(2, distance / 5);
    const height = baseHeight * distanceMultiplier;
    this.ctx.save();
    this.ctx.fillStyle = "#666";
    this.ctx.globalAlpha = 0.4;
    const numPoints = Math.max(8, Math.floor(distance * 2));
    for (let i = 0;i <= numPoints; i++) {
      const t = i / numPoints;
      const x = originX + (targetX - originX) * t;
      const y = originY + (targetY - originY) * t;
      const z = height * Math.sin(Math.PI * t);
      const arcY = y - z * 8;
      this.ctx.beginPath();
      this.ctx.arc(x, arcY, 1, 0, 2 * Math.PI);
      this.ctx.fill();
    }
    this.ctx.restore();
  }
  renderOverlays() {
    for (const unit of this.sim.units) {
      if (unit.state === "dead")
        continue;
      this.renderMovementIntention(unit);
      this.renderJumpTarget(unit);
      this.renderTossTarget(unit);
    }
    this.renderAoEEffects();
  }
  renderMovementIntention(unit) {
    if (!unit.intendedMove || unit.intendedMove.x === 0 && unit.intendedMove.y === 0) {
      return;
    }
    const unitCenterX = Math.round(unit.pos.x * 8) + 4;
    const unitCenterY = Math.round(unit.pos.y * 8) + 4;
    const targetX = unitCenterX + unit.intendedMove.x * 8;
    const targetY = unitCenterY + unit.intendedMove.y * 8;
    this.ctx.save();
    this.ctx.strokeStyle = unit.team === "friendly" ? "#00ff00" : "#ff4444";
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.8;
    this.ctx.beginPath();
    this.ctx.moveTo(unitCenterX, unitCenterY);
    this.ctx.lineTo(targetX, targetY);
    this.ctx.stroke();
    const angle = Math.atan2(targetY - unitCenterY, targetX - unitCenterX);
    const headLength = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(targetX, targetY);
    this.ctx.lineTo(targetX - headLength * Math.cos(angle - Math.PI / 6), targetY - headLength * Math.sin(angle - Math.PI / 6));
    this.ctx.moveTo(targetX, targetY);
    this.ctx.lineTo(targetX - headLength * Math.cos(angle + Math.PI / 6), targetY - headLength * Math.sin(angle + Math.PI / 6));
    this.ctx.stroke();
    this.ctx.restore();
  }
  renderJumpTarget(unit) {
    if (!unit.meta.jumping || !unit.meta.jumpTarget) {
      return;
    }
    const targetX = Math.round(unit.meta.jumpTarget.x * 8);
    const targetY = Math.round(unit.meta.jumpTarget.y * 8);
    this.ctx.save();
    const pulseScale = 1 + Math.sin(this.animationTime / 100) * 0.2;
    this.ctx.strokeStyle = "#4444ff";
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.6;
    this.ctx.beginPath();
    this.ctx.arc(targetX + 4, targetY + 4, 6 * pulseScale, 0, 2 * Math.PI);
    this.ctx.stroke();
    this.ctx.fillStyle = "#4444ff";
    this.ctx.globalAlpha = 0.3;
    this.ctx.beginPath();
    this.ctx.arc(targetX + 4, targetY + 4, 4, 0, 2 * Math.PI);
    this.ctx.fill();
    if (unit.meta.jumpRadius && unit.meta.jumpDamage) {
      this.ctx.strokeStyle = "#ff4444";
      this.ctx.lineWidth = 1;
      this.ctx.globalAlpha = 0.2;
      this.ctx.beginPath();
      this.ctx.arc(targetX + 4, targetY + 4, unit.meta.jumpRadius * 8, 0, 2 * Math.PI);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }
  renderTossTarget(unit) {
    if (!unit.meta.tossing || !unit.meta.tossTarget) {
      return;
    }
    const targetX = Math.round(unit.meta.tossTarget.x * 8);
    const targetY = Math.round(unit.meta.tossTarget.y * 8);
    this.ctx.save();
    this.ctx.fillStyle = "#8844ff";
    this.ctx.globalAlpha = 0.5;
    this.ctx.fillRect(targetX, targetY, 8, 8);
    this.ctx.strokeStyle = "#ff44aa";
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.7;
    this.ctx.strokeRect(targetX, targetY, 8, 8);
    this.ctx.restore();
  }
  renderAoEEffects() {
    const recentAoEEvents = this.sim.processedEvents.filter((event) => event.kind === "aoe" && event.meta.tick && this.sim.ticks - event.meta.tick < 10);
    for (const event of recentAoEEvents) {
      if (typeof event.target !== "object" || !("x" in event.target))
        continue;
      const pos = event.target;
      const radius = event.meta.radius || 3;
      const age = event.meta.tick ? this.sim.ticks - event.meta.tick : 0;
      const maxAge = 10;
      const alpha = Math.max(0, 1 - age / maxAge);
      const affectedCells = [];
      const centerGridX = Math.round(pos.x);
      const centerGridY = Math.round(pos.y);
      const checkRadius = Math.ceil(radius);
      for (let dx = -checkRadius;dx <= checkRadius; dx++) {
        for (let dy = -checkRadius;dy <= checkRadius; dy++) {
          const cellX = centerGridX + dx;
          const cellY = centerGridY + dy;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            affectedCells.push({ x: cellX, y: cellY });
          }
        }
      }
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.4;
      this.ctx.fillStyle = "#ffaa00";
      for (const cell of affectedCells) {
        const pixelX = cell.x * 8;
        const pixelY = cell.y * 8;
        this.ctx.fillRect(pixelX, pixelY, 8, 8);
      }
      this.ctx.restore();
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.6;
      this.ctx.strokeStyle = "#ff4400";
      this.ctx.lineWidth = 1;
      const centerPixelX = Math.round(pos.x * 8) + 4;
      const centerPixelY = Math.round(pos.y * 8) + 4;
      const pixelRadius = radius * 8;
      this.ctx.beginPath();
      this.ctx.arc(centerPixelX, centerPixelY, pixelRadius, 0, 2 * Math.PI);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }
}

// src/rendering/particle_renderer.ts
class ParticleRenderer {
  sprites;
  constructor(sprites) {
    this.sprites = sprites;
  }
  renderParticle(ctx, particle, config) {
    const { x, y, alpha, scale = 1 } = config;
    if (alpha < 0.5)
      return;
    ctx.save();
    switch (particle.type) {
      case "leaf":
      case "leaves":
        this.renderLeafParticle(ctx, particle, x, y, scale);
        break;
      case "rain":
        this.renderRainParticle(ctx, particle, x, y, scale);
        break;
      case "snow":
        this.renderSnowParticle(ctx, particle, x, y, scale);
        break;
      case "debris":
      case "fire":
      case "spark":
        this.renderFireParticle(ctx, particle, x, y, scale);
        break;
      case "lightning":
      case "electric_spark":
        this.renderLightningParticle(ctx, particle, x, y, scale);
        break;
      default:
        this.renderGenericParticle(ctx, particle, x, y, scale);
        break;
    }
    ctx.restore();
  }
  renderLeafParticle(ctx, particle, x, y, scale) {
    const leafSprite = this.sprites.get("leaf");
    if (leafSprite) {
      const frame = Math.floor(particle.lifetime / 10 % 8);
      const frameWidth = 8;
      const frameHeight = 8;
      ctx.save();
      ctx.translate(x, y);
      const rotation = (particle.pos.x * 0.1 + particle.lifetime * 0.02) % (Math.PI * 2);
      ctx.rotate(rotation);
      const drawWidth = frameWidth * scale;
      const drawHeight = frameHeight * scale;
      ctx.drawImage(leafSprite, frame * frameWidth, 0, frameWidth, frameHeight, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();
    } else {
      this.renderLeafFallback(ctx, particle, x, y, scale);
    }
  }
  renderLeafFallback(ctx, particle, x, y, scale) {
    ctx.fillStyle = "#000000";
    ctx.save();
    ctx.translate(x, y);
    const rotation = (particle.pos.x * 0.1 + particle.lifetime * 0.02) % (Math.PI * 2);
    ctx.rotate(rotation);
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  renderRainParticle(ctx, particle, x, y, scale) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }
  renderSnowParticle(ctx, particle, x, y, scale) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }
  renderFireParticle(ctx, particle, x, y, scale) {
    const fireSprite = this.sprites.get("fire-particle");
    if (fireSprite) {
      const frame = Math.floor(particle.lifetime / 5 % 4);
      ctx.drawImage(fireSprite, frame * 8, 0, 8, 8, x - 4, y - 4, 8, 8);
    } else {
      if (Math.floor(particle.lifetime / 2) % 2 === 0) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
      }
    }
  }
  renderLightningParticle(ctx, particle, x, y, scale) {
    const lightningSprite = this.sprites.get("lightning");
    if (lightningSprite) {
      const frame = Math.floor(particle.lifetime / 3 % 4);
      const frameWidth = 16;
      const frameHeight = 16;
      const drawWidth = frameWidth * scale;
      const drawHeight = frameHeight * scale;
      ctx.drawImage(lightningSprite, frame * frameWidth, 0, frameWidth, frameHeight, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
    } else {
      ctx.fillStyle = "#000000";
      ctx.fillRect(Math.floor(x) - 1, Math.floor(y) - 1, 3, 3);
    }
  }
  renderGenericParticle(ctx, particle, x, y, scale) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }
}

// src/views/cinematic.ts
class CinematicView extends View {
  unitRenderer;
  particleRenderer;
  constructor(ctx, sim, width, height, sprites, backgrounds = new Map) {
    super(ctx, sim, width, height, sprites, backgrounds);
    this.unitRenderer = new UnitRenderer(sim);
    this.particleRenderer = new ParticleRenderer(sprites);
  }
  show() {
    this.updateMovementInterpolations();
    this.updateProjectileInterpolations();
    this.renderBackground();
    this.renderLandedParticles();
    const sortedUnits = [...this.sim.units].sort((a, b) => b.pos.y - a.pos.y > 0 ? 1 : -1);
    for (const unit of sortedUnits) {
      this.showUnitCinematic(unit);
    }
    for (const projectile of this.sim.projectiles) {
      this.showProjectileCinematic(projectile);
    }
    this.renderFlyingParticles();
    this.renderAoEEffectsCinematic();
  }
  renderBackground() {
    const sceneBackground = this.sim.sceneBackground;
    this.renderSceneBackground(sceneBackground);
  }
  renderSceneBackground(backgroundType) {
    this.ctx.save();
    const backgroundImage = this.backgrounds.get(backgroundType);
    if (backgroundImage) {
      const scaleX = this.ctx.canvas.width / backgroundImage.width;
      const scaleY = this.ctx.canvas.height / backgroundImage.height;
      const scale = Math.max(scaleX, scaleY);
      const scaledWidth = backgroundImage.width * scale;
      const scaledHeight = backgroundImage.height * scale;
      const offsetX = (this.ctx.canvas.width - scaledWidth) / 2;
      const offsetY = (this.ctx.canvas.height - scaledHeight) / 2;
      this.ctx.drawImage(backgroundImage, offsetX, offsetY, scaledWidth, scaledHeight);
    }
    this.ctx.restore();
  }
  showUnitCinematic(unit) {
    if (!this.unitRenderer.shouldRenderUnit(unit)) {
      return;
    }
    if (this.unitRenderer.shouldBlinkFromDamage(unit, this.animationTime)) {
      return;
    }
    const renderPos = this.unitRenderer.getRenderPosition(unit, this.unitInterpolations);
    const renderX = renderPos.x;
    const renderY = renderPos.y;
    const renderZ = renderPos.z;
    const dimensions = this.unitRenderer.getSpriteDimensions(unit);
    const baseWidth = dimensions.width;
    const baseHeight = dimensions.height;
    const isHuge = unit.meta.huge;
    const battleStripY = this.height * 0.8;
    const yRatio = 1 - renderY / this.sim.fieldHeight;
    const depthScale = 1 + yRatio * 1.4;
    const cellWidth = 8;
    const cellHeight = 6;
    const rowOffset = Math.floor(renderY) % 2 === 1 ? cellWidth / 2 : 0;
    const cinematicX = renderX * cellWidth + rowOffset;
    const cinematicY = battleStripY - renderY * cellHeight;
    const pixelWidth = Math.round(baseWidth * depthScale);
    const pixelHeight = Math.round(baseHeight * depthScale);
    let finalY = cinematicY;
    if (renderZ > 0) {
      finalY -= renderZ * 4.8;
    }
    const sprite = this.sprites.get(unit.sprite);
    if (sprite) {
      this.ctx.save();
      this.ctx.fillStyle = "#00000040";
      this.ctx.beginPath();
      const shadowWidth = isHuge ? pixelWidth / 2.5 : pixelWidth / 3;
      const shadowHeight = isHuge ? pixelHeight / 8 : pixelHeight / 6;
      this.ctx.ellipse(cinematicX, cinematicY + pixelHeight / 3, shadowWidth, shadowHeight, 0, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.restore();
      const pixelX = cinematicX;
      const pixelY = Math.round(finalY);
      this.ctx.save();
      const scaleX = pixelWidth / baseWidth;
      const scaleY = pixelHeight / baseHeight;
      this.ctx.translate(pixelX, pixelY);
      this.ctx.scale(scaleX, scaleY);
      this.ctx.translate(-pixelX, -pixelY);
      this.unitRenderer.renderUnit(this.ctx, unit, this.sprites, pixelX, pixelY, {
        flipHorizontal: !this.unitRenderer.shouldFlipSprite(unit)
      });
      this.ctx.restore();
    } else {
      this.ctx.fillStyle = this.unitRenderer.getUnitColor(unit);
      this.ctx.fillRect(Math.round(cinematicX - pixelWidth / 2), Math.round(finalY - pixelHeight / 2), pixelWidth, pixelHeight);
    }
    if (typeof unit.hp === "number") {
      const maxHp = unit.maxHp || 100;
      const hpRatio = Math.max(0, Math.min(1, unit.hp / maxHp));
      if (hpRatio < 0.8) {
        this.drawBar("hit points", Math.round(cinematicX - pixelWidth / 2), Math.round(finalY - pixelHeight / 2) - 4, pixelWidth, 2, hpRatio);
      }
    }
    if (unit.abilities && unit.abilities.includes("jumps") && unit.meta.jumping) {
      const ability = Abilities.all.jumps;
      const duration = ability.config?.jumpDuration || 10;
      const progress = unit.meta.jumpProgress || 0;
      const progressRatio = progress / duration || 0;
      if (progressRatio > 0 && progressRatio < 1) {
        this.drawBar("jump progress", Math.round(cinematicX - pixelWidth / 2), Math.round(finalY - pixelHeight / 2) - 6, pixelWidth, 2, progressRatio, "#ace");
      }
    }
  }
  showProjectileCinematic(projectile) {
    let renderX = projectile.pos.x;
    let renderY = projectile.pos.y;
    let renderZ = projectile.z || 0;
    const interp = this.projectileInterpolations.get(projectile.id);
    if (interp) {
      const easeProgress = projectile.type === "bomb" ? this.easeInOutQuad(interp.progress) : interp.progress;
      renderX = interp.startX + (interp.targetX - interp.startX) * easeProgress;
      renderY = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      renderZ = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
    }
    const battleStripY = this.height * 0.8;
    const cellWidth = 8;
    const cellHeight = 6;
    const rowOffset = Math.floor(renderY) % 2 === 1 ? cellWidth / 2 : 0;
    const cinematicX = renderX * cellWidth + rowOffset;
    const cinematicY = battleStripY - renderY * cellHeight;
    let adjustedCinematicY = cinematicY;
    if (renderZ > 0) {
      adjustedCinematicY -= renderZ * 4.8;
    }
    this.ctx.save();
    if (projectile.type === "bomb") {
      const yRatio = 1 - renderY / this.sim.fieldHeight;
      const scale = 1 + yRatio * 2;
      this.ctx.fillStyle = "#000";
      this.ctx.strokeStyle = "#fff";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(cinematicX, adjustedCinematicY, (projectile.radius || 2) * 2 * scale, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
      if (renderZ > 0) {
        this.ctx.fillStyle = "#00000030";
        this.ctx.beginPath();
        this.ctx.arc(cinematicX, cinematicY, (projectile.radius || 2) * 1.5 * scale, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    } else {
      const yRatio = 1 - renderY / this.sim.fieldHeight;
      const scale = 1 + yRatio * 1.5;
      this.ctx.fillStyle = "#000";
      this.ctx.strokeStyle = "#fff";
      this.ctx.beginPath();
      this.ctx.arc(cinematicX, adjustedCinematicY, (projectile.radius || 2) * 1.2 * scale, 0, 2 * Math.PI);
      this.ctx.fill();
    }
    this.ctx.restore();
  }
  renderLandedParticles() {
    if (!this.sim.particles || this.sim.particles.length === 0)
      return;
    this.ctx.save();
    const landedParticles = this.sim.particles.filter((p) => (p.z || 0) <= 0 || p.landed);
    for (const particle of landedParticles) {
      this.renderParticleCinematic(particle);
    }
    this.ctx.restore();
  }
  renderFlyingParticles() {
    if (!this.sim.particles || this.sim.particles.length === 0)
      return;
    this.ctx.save();
    const flyingParticles = this.sim.particles.filter((p) => (p.z || 0) > 0 && !p.landed).sort((a, b) => (b.z || 0) - (a.z || 0));
    for (const particle of flyingParticles) {
      this.renderParticleCinematic(particle);
    }
    this.ctx.restore();
  }
  renderParticleCinematic(particle) {
    const gridX = particle.pos.x / 8;
    const gridY = particle.pos.y / 8;
    const battleStripY = this.height * 0.8;
    const cellWidth = 8;
    const cellHeight = 6;
    const rowOffset = Math.floor(gridY) % 2 === 1 ? cellWidth / 2 : 0;
    const cinematicX = gridX * cellWidth + rowOffset;
    const cinematicY = battleStripY - gridY * cellHeight;
    const height = particle.z || 0;
    let adjustedY = cinematicY - height * 0.8;
    const ageEffect = particle.lifetime > 100 ? 1 : particle.lifetime / 100;
    const alpha = Math.min(ageEffect, 1);
    const yRatio = 1 - gridY / this.sim.fieldHeight;
    const depthScale = 0.8 + yRatio * 0.6;
    this.particleRenderer.renderParticle(this.ctx, particle, {
      x: cinematicX,
      y: adjustedY,
      alpha,
      scale: depthScale
    });
  }
  renderAoEEffectsCinematic() {
    const recentAoEEvents = this.sim.processedEvents.filter((event) => event.kind === "aoe" && event.meta.tick && this.sim.ticks - event.meta.tick < 10);
    for (const event of recentAoEEvents) {
      if (typeof event.target !== "object" || !("x" in event.target))
        continue;
      const pos = event.target;
      const radius = event.meta.radius || 3;
      const age = event.meta.tick ? this.sim.ticks - event.meta.tick : 0;
      const maxAge = 10;
      const alpha = Math.max(0, 1 - age / maxAge);
      const battleStripY = this.height * 0.8;
      const cellWidth = 8;
      const cellHeight = 6;
      const rowOffset = Math.floor(pos.y) % 2 === 1 ? cellWidth / 2 : 0;
      const cinematicX = pos.x * cellWidth + rowOffset;
      const cinematicY = battleStripY - pos.y * cellHeight;
      const yRatio = 1 - pos.y / this.sim.fieldHeight;
      const scale = 1 + yRatio * 2;
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.6;
      this.ctx.strokeStyle = event.meta.aspect === "heal" ? "#00ff88" : "#ff4400";
      this.ctx.lineWidth = 2 * scale;
      const pixelRadius = radius * cellHeight * scale;
      this.ctx.beginPath();
      this.ctx.arc(cinematicX, cinematicY, pixelRadius, 0, 2 * Math.PI);
      this.ctx.stroke();
      this.ctx.globalAlpha = alpha * 0.2;
      this.ctx.fillStyle = event.meta.aspect === "heal" ? "#00ff8830" : "#ffaa0030";
      this.ctx.fill();
      this.ctx.restore();
    }
  }
  drawBar(_label, pixelX, pixelY, width, height, ratio, colorOverride) {
    const barWidth = width;
    const barHeight = height;
    const barX = pixelX;
    const barY = pixelY - 4;
    this.ctx.fillStyle = "#333";
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    this.ctx.fillStyle = ratio > 0.5 ? "#0f0" : ratio > 0.2 ? "#ff0" : "#f00";
    if (colorOverride) {
      this.ctx.fillStyle = colorOverride;
    }
    this.ctx.fillRect(barX, barY, Math.round(barWidth * ratio), barHeight);
  }
  easeInOutQuad(t) {
    return t < 0.3 ? 4 * t * t : 0.36 + 0.64 * (t - 0.3) / 0.7;
  }
}

// src/views/isometric.ts
class Isometric extends View {
  particleRenderer;
  unitRenderer;
  constructor(ctx, sim, width, height, sprites, backgrounds = new Map) {
    super(ctx, sim, width, height, sprites, backgrounds);
    this.particleRenderer = new ParticleRenderer(sprites);
    this.unitRenderer = new UnitRenderer(sim);
  }
  show() {
    this.updateMovementInterpolations();
    this.updateProjectileInterpolations();
    this.renderBackground();
    this.renderCellEffects();
    this.grid();
    const sortedUnits = [...this.sim.units].sort((a, b) => b.pos.y - a.pos.y > 0 ? 1 : -1);
    for (const unit of sortedUnits) {
      this.showUnit(unit);
    }
    for (const projectile of this.sim.projectiles) {
      this.showProjectile(projectile);
    }
    this.renderGrapplingLines();
    this.renderParticles();
    this.renderOverlays();
  }
  renderBackground() {
    const sceneBackground = this.sim.sceneBackground;
    if (sceneBackground) {
      this.renderSceneBackground(sceneBackground);
    }
  }
  renderSceneBackground(backgroundType) {
    this.ctx.save();
    const backgroundImage = this.backgrounds.get(backgroundType);
    if (backgroundImage) {
      const scaleX = this.ctx.canvas.width / backgroundImage.width;
      const scaleY = this.ctx.canvas.height / backgroundImage.height;
      const scale = Math.max(scaleX, scaleY);
      const scaledWidth = backgroundImage.width * scale;
      const scaledHeight = backgroundImage.height * scale;
      const offsetX = (this.ctx.canvas.width - scaledWidth) / 2;
      const offsetY = (this.ctx.canvas.height - scaledHeight) / 2;
      this.ctx.drawImage(backgroundImage, offsetX, offsetY, scaledWidth, scaledHeight);
    } else {
      console.warn(`No background image found for type: ${backgroundType}`);
    }
    this.ctx.restore();
  }
  baseOffsetX = -20;
  baseOffsetY = 125;
  getBattleStripOffsets() {
    const stripWidth = this.sim.stripWidth;
    if (stripWidth === "wide") {
      return { x: -40, y: 100 };
    } else if (stripWidth === "narrow") {
      return { x: 0, y: 145 };
    }
    const bg = this.sim.sceneBackground || this.sim.background;
    switch (bg) {
      case "mountain":
      case "winter":
        return { x: -20, y: 140 };
      case "desert":
      case "lake":
      case "forest":
        return { x: -20, y: 110 };
      case "toyforge":
      case "monastery":
        return { x: -20, y: 130 };
      case "burning-city":
        return { x: -20, y: 120 };
      default:
        return { x: this.baseOffsetX, y: this.baseOffsetY };
    }
  }
  toIsometric(x, y) {
    const tileWidth = 16;
    const rowOffset = 8;
    const offsets = this.getBattleStripOffsets();
    const battleHeight = this.sim.battleHeight;
    let verticalSpacing = 3;
    if (battleHeight === "compressed") {
      verticalSpacing = 2;
    } else if (battleHeight === "half") {
      verticalSpacing = 1.5;
    }
    const hexOffset = Math.floor(y) % 2 === 1 ? tileWidth / 2 : 0;
    const screenX = x * tileWidth + hexOffset + offsets.x;
    const screenY = y * verticalSpacing + offsets.y;
    return { x: screenX, y: screenY };
  }
  grid() {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(100, 100, 100, 0.3)";
    for (let y = 0;y < this.sim.fieldHeight; y++) {
      for (let x = 0;x < this.sim.fieldWidth; x++) {
        const isoPos = this.toIsometric(x, y);
        this.ctx.fillRect(isoPos.x - 1, isoPos.y - 1, 2, 2);
      }
    }
    this.ctx.restore();
  }
  showUnit(unit) {
    if (unit.meta.phantom) {
      return;
    }
    const recentDamage = this.sim.processedEvents.find((event) => event.kind === "damage" && event.target === unit.id && event.meta.tick && this.sim.ticks - event.meta.tick < 2);
    if (recentDamage && Math.floor(this.animationTime / 100) % 2 === 0) {
      return;
    }
    let renderX = unit.pos.x;
    let renderY = unit.pos.y;
    let renderZ = unit.meta.z || 0;
    const dimensions = this.unitRenderer.getSpriteDimensions(unit);
    const spriteWidth = dimensions.width;
    const spriteHeight = dimensions.height;
    let screenX;
    let screenY;
    const interp = this.unitInterpolations.get(unit.id);
    if (interp) {
      const easeProgress = this.easeInOutQuad(interp.progress);
      renderZ = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
      const startScreen = this.toIsometric(interp.startX, interp.startY);
      const endScreen = this.toIsometric(interp.targetX, interp.targetY);
      screenX = startScreen.x + (endScreen.x - startScreen.x) * easeProgress;
      screenY = startScreen.y + (endScreen.y - startScreen.y) * easeProgress;
    } else {
      const screenPos = this.toIsometric(renderX, renderY);
      screenX = screenPos.x;
      screenY = screenPos.y;
    }
    const pixelX = screenX - spriteWidth / 2;
    const pixelY = screenY - spriteHeight / 2;
    let realPixelY = pixelY;
    if (renderZ > 0) {
      realPixelY -= renderZ * 8;
    }
    const facing = unit.meta?.facing || "right";
    const shouldFlip = facing === "left";
    this.unitRenderer.drawShadow(this.ctx, unit, screenX, screenY);
    const spriteOffset = 8;
    this.unitRenderer.renderUnit(this.ctx, unit, this.sprites, screenX, screenY - spriteOffset - renderZ * 8, {
      flipHorizontal: shouldFlip
    });
    if (typeof unit.hp === "number" && unit.hp < unit.maxHp) {
      const maxHp = unit.maxHp || 100;
      const hpRatio = Math.max(0, Math.min(1, unit.hp / maxHp));
      this.drawBar("hit points", pixelX, realPixelY - 4, spriteWidth, 2, hpRatio);
    }
    if (unit.abilities && unit.abilities.includes("jumps") && unit.meta.jumping) {
      const ability = Abilities.all.jumps;
      const duration = ability.config?.jumpDuration || 10;
      const progress = unit.meta.jumpProgress || 0;
      const progressRatio = progress / duration || 0;
      if (progressRatio > 0 && progressRatio < 1) {
        this.drawBar("jump progress", pixelX, realPixelY - 6, spriteWidth, 2, progressRatio, "#ace");
      }
    }
  }
  drawBar(_label, pixelX, pixelY, width, height, ratio, colorOverride) {
    const barWidth = width;
    const barHeight = height;
    const barX = pixelX;
    const barY = pixelY - 4;
    this.ctx.fillStyle = "#333";
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    this.ctx.fillStyle = ratio > 0.5 ? "#0f0" : ratio > 0.2 ? "#ff0" : "#f00";
    if (colorOverride) {
      this.ctx.fillStyle = colorOverride;
    }
    this.ctx.fillRect(barX, barY, Math.round(barWidth * ratio), barHeight);
  }
  showProjectile(projectile) {
    let renderX = projectile.pos.x;
    let renderY = projectile.pos.y;
    let renderZ = projectile.z || 0;
    const interp = this.projectileInterpolations.get(projectile.id);
    if (interp) {
      const easeProgress = projectile.type === "bomb" ? this.easeInOutQuad(interp.progress) : interp.progress;
      renderX = interp.startX + (interp.targetX - interp.startX) * easeProgress;
      renderY = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      renderZ = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
    }
    const { x: screenX, y: screenY } = this.toIsometric(renderX, renderY);
    let adjustedScreenY = screenY;
    if (renderZ > 0) {
      adjustedScreenY -= renderZ * 8;
    }
    this.ctx.save();
    if (projectile.type === "bomb") {
      if (projectile.origin && projectile.target && projectile.progress && projectile.duration) {
        this.drawBombArcTrail(projectile);
      }
      this.ctx.fillStyle = "#000";
      this.ctx.strokeStyle = "#fff";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(screenX, adjustedScreenY, (projectile.radius || 2) * 1.2, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
      if (renderZ > 0) {
        this.ctx.fillStyle = "#00000040";
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, (projectile.radius || 2) * 0.8, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    } else {
      this.ctx.fillStyle = "#000";
      this.ctx.beginPath();
      this.ctx.arc(screenX, adjustedScreenY, projectile.radius || 0.5, 0, 2 * Math.PI);
      this.ctx.fill();
    }
    this.ctx.restore();
  }
  easeInOutQuad(t) {
    return t < 0.3 ? 4 * t * t : 0.36 + 0.64 * (t - 0.3) / 0.7;
  }
  drawBombArcTrail(projectile) {
    let { origin, target, progress, duration } = projectile;
    if (!origin || !target || progress === undefined || duration === undefined) {
      return;
    }
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const baseHeight = 12;
    const distanceMultiplier = Math.min(2, distance / 5);
    const height = baseHeight * distanceMultiplier;
    this.ctx.save();
    this.ctx.fillStyle = "#666";
    this.ctx.globalAlpha = 0.4;
    const numPoints = Math.max(8, Math.floor(distance * 2));
    for (let i = 0;i <= numPoints; i++) {
      const t = i / numPoints;
      const x = origin.x + (target.x - origin.x) * t;
      const y = origin.y + (target.y - origin.y) * t;
      const z = height * Math.sin(Math.PI * t);
      const isoPos = this.toIsometric(x, y);
      const arcY = isoPos.y - z * 8;
      this.ctx.beginPath();
      this.ctx.arc(isoPos.x, arcY, 1, 0, 2 * Math.PI);
      this.ctx.fill();
    }
    this.ctx.restore();
  }
  renderOverlays() {
    for (const unit of this.sim.units) {
      if (unit.state === "dead")
        continue;
      this.renderMovementIntention(unit);
      this.renderJumpTarget(unit);
      this.renderTossTarget(unit);
    }
    this.renderAoEEffects();
  }
  renderMovementIntention(unit) {
    return;
    if (!unit.intendedMove || unit.intendedMove.x === 0 && unit.intendedMove.y === 0) {
      return;
    }
    const { x: unitScreenX, y: unitScreenY } = this.toIsometric(unit.pos.x, unit.pos.y);
    const targetPos = {
      x: unit.pos.x + unit.intendedMove.x,
      y: unit.pos.y + unit.intendedMove.y
    };
    const { x: targetScreenX, y: targetScreenY } = this.toIsometric(targetPos.x, targetPos.y);
    this.ctx.save();
    this.ctx.strokeStyle = unit.team === "friendly" ? "#00ff00" : "#ff4444";
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.8;
    this.ctx.beginPath();
    this.ctx.moveTo(unitScreenX, unitScreenY - 16);
    this.ctx.lineTo(targetScreenX, targetScreenY - 16);
    this.ctx.stroke();
    const angle = Math.atan2(targetScreenY - unitScreenY, targetScreenX - unitScreenX);
    const headLength = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(targetScreenX, targetScreenY - 16);
    this.ctx.lineTo(targetScreenX - headLength * Math.cos(angle - Math.PI / 6), targetScreenY - 16 - headLength * Math.sin(angle - Math.PI / 6));
    this.ctx.moveTo(targetScreenX, targetScreenY - 16);
    this.ctx.lineTo(targetScreenX - headLength * Math.cos(angle + Math.PI / 6), targetScreenY - 16 - headLength * Math.sin(angle + Math.PI / 6));
    this.ctx.stroke();
    this.ctx.restore();
  }
  renderJumpTarget(unit) {
    if (!unit.meta.jumping || !unit.meta.jumpTarget) {
      return;
    }
    const { x: screenX, y: screenY } = this.toIsometric(unit.meta.jumpTarget.x, unit.meta.jumpTarget.y);
    this.ctx.save();
    this.ctx.fillStyle = "#4444ff";
    this.ctx.globalAlpha = 0.4;
    this.ctx.beginPath();
    this.ctx.ellipse(screenX, screenY, 8, 4, 0, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.restore();
  }
  renderTossTarget(unit) {
    if (!unit.meta.tossing || !unit.meta.tossTarget) {
      return;
    }
    const { x: screenX, y: screenY } = this.toIsometric(unit.meta.tossTarget.x, unit.meta.tossTarget.y);
    this.ctx.save();
    this.ctx.fillStyle = "#8844ff";
    this.ctx.globalAlpha = 0.5;
    this.ctx.beginPath();
    this.ctx.ellipse(screenX, screenY, 8, 4, 0, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.strokeStyle = "#ff44aa";
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.7;
    this.ctx.stroke();
    this.ctx.restore();
  }
  renderAoEEffects() {
    const recentAoEEvents = this.sim.processedEvents.filter((event) => event.kind === "aoe" && event.meta.tick && this.sim.ticks - event.meta.tick < 10);
    for (const event of recentAoEEvents) {
      if (typeof event.target !== "object" || !("x" in event.target))
        continue;
      const pos = event.target;
      const radius = event.meta.radius || 3;
      const age = event.meta.tick ? this.sim.ticks - event.meta.tick : 0;
      const maxAge = 10;
      const alpha = Math.max(0, 1 - age / maxAge);
      const centerScreen = this.toIsometric(pos.x, pos.y);
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.4;
      this.ctx.fillStyle = "#ffaa00";
      const pixelRadiusX = radius * 8;
      const pixelRadiusY = radius * 4;
      this.ctx.beginPath();
      this.ctx.ellipse(centerScreen.x, centerScreen.y, pixelRadiusX, pixelRadiusY, 0, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.restore();
    }
  }
  renderCellEffects() {
    const cellEffectsSprite = this.sprites.get("cell-effects");
    if (!cellEffectsSprite)
      return;
    const cellEffects = new Map;
    const priorities = {
      explosion: 10,
      fire: 9,
      lightning: 8,
      ice: 7,
      snow: 6,
      heat: 5,
      pressed: 4,
      black: 2,
      white: 1
    };
    const setCellEffect = (x, y, type) => {
      const key = `${x},${y}`;
      const current = cellEffects.get(key);
      const priority = priorities[type] || 0;
      if (!current || current.priority < priority) {
        cellEffects.set(key, { type, priority });
      }
    };
    const centerX = Math.floor(this.sim.fieldWidth / 2);
    const centerY = Math.floor(this.sim.fieldHeight / 2);
    const temp = this.sim.getTemperature(centerX, centerY);
    if (temp > 30) {
      for (let x = 0;x < this.sim.fieldWidth; x++) {
        for (let y = this.sim.fieldHeight - 2;y < this.sim.fieldHeight; y++) {
          setCellEffect(x, y, "heat");
        }
      }
    } else if (temp < 0) {
      for (let x = 0;x < this.sim.fieldWidth; x++) {
        for (let y = this.sim.fieldHeight - 2;y < this.sim.fieldHeight; y++) {
          setCellEffect(x, y, "snow");
        }
      }
    }
    for (const unit of this.sim.units) {
      const x = Math.floor(unit.pos.x);
      const y = Math.floor(unit.pos.y);
      if (unit.meta.onFire) {
        setCellEffect(x, y, "fire");
      } else if (unit.meta.frozen) {
        setCellEffect(x, y, "ice");
      } else if (unit.meta.electrified) {
        setCellEffect(x, y, "lightning");
      }
    }
    const recentExplosions = this.sim.processedEvents?.filter((event) => event.kind === "aoe" && event.meta.tick && this.sim.ticks - event.meta.tick < 5) || [];
    for (const explosion of recentExplosions) {
      const pos = explosion.position || explosion.center;
      if (pos) {
        const x = Math.floor(pos.x);
        const y = Math.floor(pos.y);
        setCellEffect(x, y, "explosion");
      }
    }
    this.ctx.save();
    let fx = cellEffects.entries();
    for (let entry = fx.next();!entry.done; entry = fx.next()) {
      const [cellKey, effect] = entry.value;
      const [x, y] = cellKey.split(",").map(Number);
      const { x: screenX, y: screenY } = this.toIsometric(x, y);
      let frameX = -1;
      let animationFrames = 1;
      let frameSpeed = 200;
      switch (effect.type) {
        case "white":
          frameX = 0;
          break;
        case "black":
          frameX = 1;
          break;
        case "pressed":
          frameX = 2;
          break;
        case "fire":
        case "heat":
          animationFrames = 5;
          frameSpeed = 100;
          const fireFrame = Math.floor(this.animationTime / frameSpeed % animationFrames);
          frameX = 5 + fireFrame;
          break;
        case "explosion":
          animationFrames = 9;
          frameSpeed = 80;
          const explFrame = Math.floor(this.animationTime / frameSpeed % animationFrames);
          frameX = 11 + explFrame;
          break;
        case "ice":
        case "snow":
          frameX = 2;
          this.ctx.globalAlpha = 0.5;
          break;
        case "lightning":
          frameX = 4;
          break;
      }
      if (frameX < 0)
        continue;
      const spriteSize = 16;
      this.ctx.drawImage(cellEffectsSprite, frameX * spriteSize, 0, spriteSize, spriteSize, screenX - 8, screenY - 8, spriteSize, spriteSize);
    }
    this.ctx.restore();
  }
  renderGrapplingLines() {
    for (const unit of this.sim.units) {
      if (unit.meta.grappled && unit.meta.tetherPoint) {
        const grappler = this.sim.units.find((u) => u.id === unit.meta.grappledBy);
        if (!grappler)
          continue;
        const startPos = this.toIsometric(grappler.pos.x, grappler.pos.y);
        const endPos = this.toIsometric(unit.pos.x, unit.pos.y);
        this.ctx.save();
        this.ctx.strokeStyle = "#000000";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(startPos.x, startPos.y);
        const midX = (startPos.x + endPos.x) / 2;
        const midY = (startPos.y + endPos.y) / 2 + 3;
        this.ctx.quadraticCurveTo(midX, midY, endPos.x, endPos.y);
        this.ctx.stroke();
        this.ctx.fillStyle = "#000";
        this.ctx.beginPath();
        this.ctx.arc(startPos.x, startPos.y, 1, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(endPos.x, endPos.y, 1, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.restore();
      }
    }
    const grappleProjectiles = this.sim.projectiles.filter((p) => p.type === "grapple");
    for (const grapple of grappleProjectiles) {
      const grapplerID = grapple.grapplerID;
      const grappler = this.sim.units.find((u) => u.id === grapplerID);
      if (!grappler)
        continue;
      const startPos = this.toIsometric(grappler.pos.x, grappler.pos.y);
      const endPos = this.toIsometric(grapple.pos.x, grapple.pos.y);
      this.ctx.save();
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 1;
      this.ctx.globalAlpha = 0.8;
      this.ctx.beginPath();
      this.ctx.moveTo(startPos.x, startPos.y);
      this.ctx.lineTo(endPos.x, endPos.y);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }
  renderParticles() {
    if (!this.sim.particles || this.sim.particles.length === 0)
      return;
    this.ctx.save();
    for (const particle of this.sim.particles) {
      this.renderParticle(particle);
    }
    this.ctx.restore();
  }
  renderParticle(particle) {
    let x, y;
    if (particle.pos) {
      x = particle.pos.x / 8;
      y = particle.pos.y / 8;
    } else if (particle.x !== undefined && particle.y !== undefined) {
      if (particle.x > this.sim.fieldWidth || particle.y > this.sim.fieldHeight) {
        x = particle.x / 8;
        y = particle.y / 8;
      } else {
        x = particle.x;
        y = particle.y;
      }
    } else {
      x = 0;
      y = 0;
    }
    const z = particle.z || 0;
    const isoPos = this.toIsometric(x, y);
    const screenY = isoPos.y - z * 8;
    const alpha = particle.lifetime > 100 ? 1 : particle.lifetime / 100;
    this.particleRenderer.renderParticle(this.ctx, particle, {
      x: isoPos.x,
      y: screenY,
      alpha: Math.min(alpha, 0.8),
      scale: 1
    });
    if (particle.type === "leaf" && z > 0 && z < 5) {
      this.ctx.fillStyle = "#000000";
      this.ctx.fillRect(Math.floor(isoPos.x) - 1, Math.floor(isoPos.y), 2, 1);
    }
  }
}

// src/core/renderer.ts
function createCanvas(width, height) {
  if (typeof document !== "undefined" && document.createElement) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return {
    width,
    height,
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      drawImage: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      arc: () => {},
      fillStyle: "",
      fill: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      globalAlpha: 1,
      imageSmoothingEnabled: false
    })
  };
}

class Display {
  width;
  height;
  ctx;
  rotationAngle = 0;
  constructor(width, height, canvas) {
    this.width = width;
    this.height = height;
    this.ctx = canvas.getContext("2d");
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
  }
  draw() {
    this.clear();
    this.render();
  }
  render() {
    console.warn("[RED TRIANGLE] Display#render() not implemented in", this.constructor.name);
    this.ctx.fillStyle = "#0000ff";
    this.ctx.fillRect(0, 0, this.width, this.height);
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(this.rotationAngle);
    this.ctx.fillStyle = "red";
    this.ctx.beginPath();
    this.ctx.moveTo(0, -20);
    this.ctx.lineTo(-20, 20);
    this.ctx.lineTo(20, 20);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
    this.rotationAngle += 0.02;
  }
  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}

class ScaledDisplay {
  targetWidth;
  targetHeight;
  physicalCanvas;
  virtualCanvas;
  display;
  scale = 1;
  constructor(targetWidth, targetHeight, physicalCanvas) {
    this.targetWidth = targetWidth;
    this.targetHeight = targetHeight;
    this.physicalCanvas = physicalCanvas;
    this.virtualCanvas = createCanvas(targetWidth, targetHeight);
    this.display = new Display(targetWidth, targetHeight, this.virtualCanvas);
    const physicalCtx = this.physicalCanvas.getContext("2d");
    physicalCtx.imageSmoothingEnabled = false;
  }
  handleResize() {
    if (typeof window === "undefined")
      return;
    const scaleX = Math.floor(window.innerWidth / this.targetWidth);
    const scaleY = Math.floor(window.innerHeight / this.targetHeight);
    this.scale = Math.max(1, Math.min(scaleX, scaleY));
    this.physicalCanvas.width = this.targetWidth * this.scale;
    this.physicalCanvas.height = this.targetHeight * this.scale;
    const ctx = this.physicalCanvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
  }
  draw() {
    this.display.draw();
    this.blit();
  }
  blit() {
    const ctx = this.physicalCanvas.getContext("2d");
    ctx.clearRect(0, 0, this.physicalCanvas.width, this.physicalCanvas.height);
    ctx.drawImage(this.virtualCanvas, 0, 0, this.targetWidth, this.targetHeight, 0, 0, this.physicalCanvas.width, this.physicalCanvas.height);
  }
}

class Renderer extends Display {
  sim;
  sprites;
  backgrounds;
  viewMode = "iso";
  battle = null;
  cinematic = null;
  isometric = null;
  constructor(width, height, canvas, sim, sprites, backgrounds = new Map) {
    super(width, height, canvas);
    this.sim = sim;
    this.sprites = sprites;
    this.backgrounds = backgrounds;
    this.battle = new Orthographic(this.ctx, this.sim, this.width, this.height, this.sprites, this.backgrounds);
    this.cinematic = new CinematicView(this.ctx, this.sim, this.width, this.height, this.sprites, this.backgrounds);
    this.isometric = new Isometric(this.ctx, this.sim, this.width, this.height, this.sprites, this.backgrounds);
  }
  setViewMode(mode) {
    this.viewMode = mode;
  }
  get cinematicView() {
    return this.viewMode === "cinematic";
  }
  get isometricView() {
    return this.viewMode === "iso";
  }
  get gridView() {
    return this.viewMode === "grid";
  }
  render() {
    if (this.viewMode === "cinematic") {
      if (this.cinematic) {
        this.cinematic.sim = this.sim;
        this.cinematic.show();
      }
    } else if (this.viewMode === "grid") {
      if (this.battle) {
        this.battle.sim = this.sim;
        this.battle.show();
      }
    } else if (this.viewMode === "iso") {
      if (this.isometric) {
        this.isometric.sim = this.sim;
        this.isometric.show();
      }
    }
  }
}
function createScaledRenderer(targetWidth, targetHeight, physicalCanvas, sim, sprites, backgrounds = new Map) {
  const virtualCanvas = createCanvas(targetWidth, targetHeight);
  const renderer = new Renderer(targetWidth, targetHeight, virtualCanvas, sim, sprites, backgrounds);
  let scale = 1;
  const handleResize = () => {
    if (typeof window === "undefined")
      return;
    const dpr = window.devicePixelRatio || 1;
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;
    const scaleX = Math.floor(availableWidth / targetWidth);
    const scaleY = Math.floor(availableHeight / targetHeight);
    scale = Math.max(1, Math.min(scaleX, scaleY));
    const exactWidth = targetWidth * scale;
    const exactHeight = targetHeight * scale;
    physicalCanvas.width = exactWidth;
    physicalCanvas.height = exactHeight;
    physicalCanvas.style.width = `${exactWidth}px`;
    physicalCanvas.style.height = `${exactHeight}px`;
    physicalCanvas.style.imageRendering = "pixelated";
    physicalCanvas.style.imageRendering = "crisp-edges";
    const ctx = physicalCanvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    console.debug(`Scaled to ${scale}x: virtual(${targetWidth}x${targetHeight}) → physical(${exactWidth}x${exactHeight}), DPR: ${dpr}`);
  };
  const draw = () => {
    renderer.draw();
    const ctx = physicalCanvas.getContext("2d");
    ctx.clearRect(0, 0, physicalCanvas.width, physicalCanvas.height);
    const exactScale = Math.floor(scale);
    ctx.drawImage(virtualCanvas, 0, 0, targetWidth, targetHeight, 0, 0, targetWidth * exactScale, targetHeight * exactScale);
  };
  return { renderer, handleResize, draw };
}
if (typeof window !== "undefined") {
  window.Display = Display;
  window.ScaledDisplay = ScaledDisplay;
  window.Renderer = Renderer;
  window.createScaledRenderer = createScaledRenderer;
}

// src/core/game.ts
class Game {
  sim;
  lastSimTime = 0;
  simTickRate = 30;
  renderer;
  _handleResize;
  draw;
  addInputListener;
  animationFrame;
  constructor(canvas, opts) {
    this.addInputListener = opts?.addInputListener || (typeof window !== "undefined" ? (cb) => window.addEventListener("keydown", cb) : () => {});
    this.animationFrame = opts?.animationFrame || (typeof window !== "undefined" ? (cb) => requestAnimationFrame(cb) : () => {});
    this.loop = this.loop.bind(this);
    this.sim = new Simulator(40, 25);
    if (typeof window !== "undefined") {
      const scaledRenderer = createScaledRenderer(320, 200, canvas, this.sim, Game.loadSprites(), Game.loadBackgrounds());
      this.renderer = scaledRenderer.renderer;
      this._handleResize = scaledRenderer.handleResize;
      this.draw = scaledRenderer.draw;
    } else {
      const mockCanvas = {
        width: 320,
        height: 200,
        getContext: () => ({
          clearRect: () => {},
          fillRect: () => {},
          drawImage: () => {},
          save: () => {},
          restore: () => {},
          imageSmoothingEnabled: false
        })
      };
      this.renderer = new Renderer(320, 200, mockCanvas, this.sim, new Map);
      this._handleResize = () => {};
      this.draw = () => this.renderer.draw();
    }
  }
  bootstrap() {
    this.sim.reset();
    this.setupInput();
    this.animationFrame(this.loop);
  }
  static spriteList = [
    { name: "worm", src: worm_default },
    { name: "soldier", src: soldier_default },
    { name: "farmer", src: farmer_default },
    { name: "slinger", src: slinger_default },
    { name: "priest", src: priest_default },
    { name: "bombardier", src: bombardier_default },
    { name: "tamer", src: squirrel_tamer_default },
    { name: "squirrel", src: squirrel_default },
    { name: "megasquirrel", src: megasquirrel_default },
    { name: "leaf", src: leaf_default },
    { name: "rainmaker", src: rainmaker_default },
    { name: "demon", src: demon_default },
    { name: "ghost", src: ghost_default },
    { name: "mimic-worm", src: mimic_worm_default },
    { name: "skeleton", src: skeleton_default },
    { name: "big-worm", src: big_worm_default },
    { name: "skeleton-mage", src: skeleton_mage_default },
    { name: "clanker", src: clanker_default },
    { name: "freezebot", src: freezebot_default },
    { name: "spikebot", src: spikebot_default },
    { name: "swarmbot", src: swarmbot_default },
    { name: "jumpbot", src: jumpbot_default },
    { name: "toymaker", src: toymaker_default },
    { name: "zapper", src: zapper_default },
    { name: "bear", src: bear_default },
    { name: "owl", src: owl_default },
    { name: "deer", src: deer_default },
    { name: "buck", src: buck_default },
    { name: "mechatron", src: mechatron_default },
    { name: "mechatronist", src: mechatronist_default },
    { name: "lightning", src: lightning_default },
    { name: "grappler", src: grappler_default },
    { name: "waterpriest", src: waterpriest_default },
    { name: "wormrider", src: wormrider_default },
    { name: "builder", src: builder_default },
    { name: "fueler", src: fueler_default },
    { name: "mechanic", src: mechanic_default },
    { name: "engineer", src: engineer_default },
    { name: "welder", src: welder_default },
    { name: "assembler", src: assembler_default },
    { name: "champion", src: champion_default },
    { name: "penguin", src: penguin_default },
    { name: "ninja", src: ninja_default },
    { name: "cell-effects", src: cell_effects_default },
    { name: "hero-head", src: hero_head_default },
    { name: "hero-torso", src: hero_torso_default },
    { name: "hero-larm", src: hero_larm_default },
    { name: "hero-rarm", src: hero_rarm_default },
    { name: "hero-lleg", src: hero_lleg_default },
    { name: "hero-rleg", src: hero_rleg_default },
    { name: "hero-sword", src: hero_sword_default }
  ];
  static backgroundList = [
    { name: "lake", src: lake_default },
    { name: "mountain", src: mountain_default },
    { name: "monastery", src: monastery_default },
    { name: "burning-city", src: burning_city_default },
    { name: "winter", src: winter_default },
    { name: "toyforge", src: toyforge_default },
    { name: "desert", src: desert_default },
    { name: "forest", src: forest_default },
    { name: "rooftop", src: rooftop_default },
    { name: "cityscape", src: cityscape_default },
    { name: "castle", src: castle_default },
    { name: "tower-gate", src: tower_gate_default }
  ];
  static loadBackgrounds() {
    if (typeof Image === "undefined") {
      console.debug("Skipping background loading in headless environment");
      return new Map;
    }
    let backgrounds = new Map;
    Game.backgroundList.forEach(({ name, src }) => {
      const img = new Image;
      backgrounds.set(name, img);
      img.onload = () => {
        console.debug(`Loaded background: ${name}`);
      };
      img.onerror = () => {
        console.error(`Failed to load background: ${src}`);
      };
      img.src = src;
    });
    return backgrounds;
  }
  static loadSprites() {
    if (typeof Image === "undefined") {
      console.debug("Skipping sprite loading in headless environment");
      return new Map;
    }
    let sprites = new Map;
    let master = Game.spriteList;
    master.forEach(({ name, src }) => {
      const img = new Image;
      sprites.set(name, img);
      img.onload = () => {
        console.debug(`Loaded sprite: ${name}`);
      };
      img.onerror = () => {
        console.error(`Failed to load sprite: ${src}`);
      };
      img.src = src;
    });
    return sprites;
  }
  setupInput() {
    this.addInputListener(this.getInputHandler());
  }
  getInputHandler() {
    return (e) => {
      console.debug(`Key pressed: ${e.key} [default handler]`);
    };
  }
  loop() {
    this.update();
    this.animationFrame(this.loop);
  }
  lastStep = 0;
  update() {
    const now = Date.now();
    const simTickInterval = 1000 / this.simTickRate;
    if (now - this.lastSimTime >= simTickInterval) {
      this.sim.step();
      this.lastSimTime = now;
    }
    this.drawFrame();
  }
  drawFrame() {
    let t0 = performance.now();
    this.draw();
    let t1 = performance.now();
    let elapsed = t1 - t0;
    if (elapsed > 10) {
      console.warn(`Frame drawn in ${elapsed.toFixed(2)}ms`);
    }
  }
  handleResize() {
    this._handleResize();
  }
}
if (typeof window !== "undefined") {
  window.Game = Game;
}

// src/rules/hero_animation.ts
init_rule();

// src/rendering/hero_rig.ts
class HeroRig {
  parts;
  anchors;
  animations;
  currentAnimation;
  animationTime = 0;
  currentWeapon = "sword";
  weaponConfigs;
  constructor() {
    this.parts = new Map;
    this.anchors = new Map;
    this.animations = new Map;
    this.weaponConfigs = new Map;
    this.setupDefaultPose();
    this.setupAnchors();
    this.setupWeapons();
    this.setupAnimations();
  }
  setupDefaultPose() {
    this.parts.set("lleg", {
      name: "lleg",
      sprite: "hero-lleg",
      offset: { x: -6, y: 6 },
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 1
    });
    this.parts.set("rleg", {
      name: "rleg",
      sprite: "hero-rleg",
      offset: { x: 6, y: 6 },
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 1
    });
    this.parts.set("larm", {
      name: "larm",
      sprite: "hero-larm",
      offset: { x: -8, y: 0 },
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 2
    });
    this.parts.set("torso", {
      name: "torso",
      sprite: "hero-torso",
      offset: { x: 0, y: 0 },
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 3
    });
    this.parts.set("rarm", {
      name: "rarm",
      sprite: "hero-rarm",
      offset: { x: 8, y: 0 },
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 4
    });
    this.parts.set("head", {
      name: "head",
      sprite: "hero-head",
      offset: { x: 0, y: -8 },
      rotation: 0,
      scale: 1,
      frame: 0,
      zIndex: 5
    });
    this.parts.set("sword", {
      name: "sword",
      sprite: "hero-sword",
      offset: { x: 12, y: 0 },
      rotation: Math.PI / 4,
      scale: 1,
      frame: 0,
      zIndex: 6
    });
  }
  setupAnchors() {
    this.anchors.set("hand_l", {
      name: "hand_l",
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: "larm",
      localOffset: { x: -4, y: 4 }
    });
    this.anchors.set("hand_r", {
      name: "hand_r",
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: "rarm",
      localOffset: { x: 4, y: 4 }
    });
    this.anchors.set("shoulder_l", {
      name: "shoulder_l",
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: "torso",
      localOffset: { x: -6, y: -2 }
    });
    this.anchors.set("shoulder_r", {
      name: "shoulder_r",
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: "torso",
      localOffset: { x: 6, y: -2 }
    });
    this.anchors.set("hip_l", {
      name: "hip_l",
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: "torso",
      localOffset: { x: -3, y: 6 }
    });
    this.anchors.set("hip_r", {
      name: "hip_r",
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: "torso",
      localOffset: { x: 3, y: 6 }
    });
    this.anchors.set("foot_l", {
      name: "foot_l",
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: "lleg",
      localOffset: { x: 0, y: 6 }
    });
    this.anchors.set("foot_r", {
      name: "foot_r",
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: "rleg",
      localOffset: { x: 0, y: 6 }
    });
    this.anchors.set("crown", {
      name: "crown",
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: "head",
      localOffset: { x: 0, y: -6 }
    });
    this.anchors.set("chest", {
      name: "chest",
      position: { x: 0, y: 0 },
      rotation: 0,
      partName: "torso",
      localOffset: { x: 0, y: 0 }
    });
  }
  setupWeapons() {
    this.weaponConfigs.set("sword", {
      type: "sword",
      sprite: "hero-sword",
      offset: { x: 4, y: 0 },
      rotation: Math.PI / 4,
      scale: 1
    });
    this.weaponConfigs.set("spear", {
      type: "spear",
      sprite: "hero-spear",
      offset: { x: 6, y: -2 },
      rotation: Math.PI / 6,
      scale: 1.2
    });
    this.weaponConfigs.set("axe", {
      type: "axe",
      sprite: "hero-axe",
      offset: { x: 3, y: 1 },
      rotation: Math.PI / 3,
      scale: 1
    });
    this.weaponConfigs.set("bow", {
      type: "bow",
      sprite: "hero-bow",
      offset: { x: 0, y: 0 },
      rotation: 0,
      scale: 1,
      twoHanded: true
    });
    this.weaponConfigs.set("shield", {
      type: "shield",
      sprite: "hero-shield",
      offset: { x: -2, y: 0 },
      rotation: 0,
      scale: 1
    });
    this.weaponConfigs.set("staff", {
      type: "staff",
      sprite: "hero-staff",
      offset: { x: 2, y: -4 },
      rotation: Math.PI / 8,
      scale: 1.3,
      twoHanded: true
    });
    this.weaponConfigs.set("none", {
      type: "none",
      sprite: "",
      offset: { x: 0, y: 0 },
      rotation: 0,
      scale: 0
    });
    this.updateWeaponPart();
  }
  setupAnimations() {
    this.animations.set("breathing", {
      name: "breathing",
      loop: true,
      duration: 8,
      frames: [
        {
          tick: 0,
          parts: {
            torso: { offset: { x: 0, y: 0 }, frame: 0 },
            head: { offset: { x: 0, y: -8 }, frame: 0 },
            larm: { offset: { x: -8, y: 0 }, rotation: 0.05, frame: 0 },
            rarm: { offset: { x: 8, y: 0 }, rotation: -0.05, frame: 0 },
            lleg: { offset: { x: -2, y: 8 }, frame: 0 },
            rleg: { offset: { x: 2, y: 8 }, frame: 0 }
          }
        },
        {
          tick: 2,
          parts: {
            torso: { offset: { x: -0.5, y: -2 }, frame: 1 },
            head: { offset: { x: -0.5, y: -10 }, rotation: -0.05, frame: 1 },
            larm: { offset: { x: -8.5, y: -2 }, rotation: 0.1, frame: 1 },
            rarm: { offset: { x: 8.5, y: -2 }, rotation: -0.1, frame: 1 },
            lleg: { offset: { x: -2, y: 8 }, frame: 1 },
            rleg: { offset: { x: 2, y: 8 }, frame: 1 }
          }
        },
        {
          tick: 4,
          parts: {
            torso: { offset: { x: 0.5, y: -1.5 }, frame: 2 },
            head: { offset: { x: 0.5, y: -9.5 }, rotation: 0.02, frame: 2 },
            larm: { offset: { x: -7.5, y: -1.5 }, rotation: 0.08, frame: 2 },
            rarm: { offset: { x: 8.5, y: -1.5 }, rotation: -0.08, frame: 2 },
            lleg: { offset: { x: -2, y: 8 }, frame: 2 },
            rleg: { offset: { x: 2, y: 8 }, frame: 2 }
          }
        },
        {
          tick: 6,
          parts: {
            torso: { offset: { x: 0, y: 0.5 }, frame: 0 },
            head: { offset: { x: 0, y: -7.5 }, rotation: 0.03, frame: 0 },
            larm: { offset: { x: -8, y: 0.5 }, rotation: 0.02, frame: 0 },
            rarm: { offset: { x: 8, y: 0.5 }, rotation: -0.02, frame: 0 },
            lleg: { offset: { x: -2, y: 8 }, frame: 0 },
            rleg: { offset: { x: 2, y: 8 }, frame: 0 }
          }
        }
      ]
    });
    this.animations.set("wind", {
      name: "wind",
      loop: true,
      duration: 90,
      frames: [
        {
          tick: 0,
          parts: {
            head: { rotation: 0, frame: 0 }
          }
        },
        {
          tick: 30,
          parts: {
            head: { rotation: -0.05, offset: { x: -0.5, y: -8 }, frame: 1 }
          }
        },
        {
          tick: 60,
          parts: {
            head: { rotation: 0.05, offset: { x: 0.5, y: -8 }, frame: 2 }
          }
        }
      ]
    });
    this.animations.set("walk", {
      name: "walk",
      loop: true,
      duration: 16,
      frames: [
        {
          tick: 0,
          parts: {
            lleg: { offset: { x: -2, y: 8 }, rotation: -0.1, frame: 0 },
            rleg: { offset: { x: 2, y: 8 }, rotation: 0.1, frame: 0 },
            larm: { rotation: 0.1, frame: 0 },
            rarm: { rotation: -0.1, frame: 0 },
            head: { frame: 0 },
            torso: { frame: 0 }
          }
        },
        {
          tick: 8,
          parts: {
            lleg: { offset: { x: -2, y: 8 }, rotation: 0.1, frame: 1 },
            rleg: { offset: { x: 2, y: 8 }, rotation: -0.1, frame: 1 },
            larm: { rotation: -0.1, frame: 1 },
            rarm: { rotation: 0.1, frame: 1 },
            head: { frame: 1 },
            torso: { frame: 1 }
          }
        }
      ]
    });
    this.animations.set("attack", {
      name: "attack",
      loop: false,
      duration: 12,
      frames: [
        {
          tick: 0,
          parts: {
            torso: { offset: { x: -1, y: 0 }, rotation: -0.1, frame: 1 },
            rarm: { offset: { x: 6, y: -2 }, rotation: -0.4, frame: 1 },
            larm: { offset: { x: -6, y: 0 }, rotation: 0.2, frame: 1 },
            head: { offset: { x: -1, y: -8 }, rotation: -0.05, frame: 1 }
          }
        },
        {
          tick: 4,
          parts: {
            torso: { offset: { x: 0, y: 0 }, rotation: 0, frame: 2 },
            rarm: { offset: { x: 10, y: 0 }, rotation: 0.2, frame: 2 },
            larm: { offset: { x: -8, y: -1 }, rotation: 0.1, frame: 2 },
            head: { offset: { x: 0, y: -8 }, rotation: 0, frame: 2 }
          }
        },
        {
          tick: 8,
          parts: {
            torso: { offset: { x: 1, y: 0 }, rotation: 0.1, frame: 2 },
            rarm: { offset: { x: 12, y: 2 }, rotation: 0.5, frame: 2 },
            larm: { offset: { x: -7, y: 1 }, rotation: -0.1, frame: 2 },
            head: { offset: { x: 1, y: -8 }, rotation: 0.05, frame: 2 }
          }
        }
      ]
    });
  }
  play(animationName) {
    if (this.animations.has(animationName)) {
      this.currentAnimation = animationName;
      this.animationTime = 0;
    }
  }
  update(deltaTime = 1) {
    if (!this.currentAnimation)
      return;
    const anim = this.animations.get(this.currentAnimation);
    if (!anim)
      return;
    this.animationTime += deltaTime;
    if (anim.loop && this.animationTime >= anim.duration) {
      this.animationTime = this.animationTime % anim.duration;
    }
    if (this.currentAnimation === "breathing" || this.currentAnimation === "wind") {
      this.applyBreathingInterpolation();
    } else {
      let currentFrame;
      for (let i = 0;i < anim.frames.length; i++) {
        if (anim.frames[i].tick <= this.animationTime) {
          currentFrame = anim.frames[i];
        }
      }
      if (currentFrame) {
        this.applyFrame(currentFrame);
      } else {}
    }
    this.updateAnchors();
    this.updateWeaponPart();
  }
  applyBreathingInterpolation() {
    const anim = this.animations.get(this.currentAnimation);
    const isWind = this.currentAnimation === "wind";
    const duration = isWind ? 16 : anim?.duration || 8;
    const phase = this.animationTime % duration / duration;
    const breathAmount = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    const torso = this.parts.get("torso");
    if (torso) {
      const oldY = torso.offset.y;
      if (isWind) {
        torso.offset.y = -breathAmount * 1.5;
        torso.offset.x = Math.sin(phase * Math.PI * 2) * 0.5;
      } else {
        torso.offset.y = -breathAmount * 1;
        torso.offset.x = Math.sin(phase * Math.PI * 4) * 0.25;
      }
      torso.frame = Math.floor(phase * 3) % 3;
    }
    const head = this.parts.get("head");
    if (head) {
      if (isWind) {
        head.offset.y = -8 - breathAmount * 3;
        head.offset.x = Math.sin(phase * Math.PI * 2 + 0.3) * 1.5;
        head.rotation = Math.sin(phase * Math.PI * 2) * 0.06;
      } else {
        head.offset.y = -8 - breathAmount * 1.5;
        head.offset.x = Math.sin(phase * Math.PI * 4 + 0.5) * 0.5;
        head.rotation = Math.sin(phase * Math.PI * 2) * 0.03;
      }
      head.frame = Math.floor(phase * 3) % 3;
    }
    const larm = this.parts.get("larm");
    const rarm = this.parts.get("rarm");
    if (larm) {
      if (isWind) {
        larm.offset.y = -breathAmount * 2;
        larm.offset.x = -6 + Math.sin(phase * Math.PI * 2 - 0.5) * 1;
        larm.rotation = Math.sin(phase * Math.PI * 2) * 0.08;
      } else {
        larm.offset.y = -breathAmount * 1.5;
        larm.offset.x = -6;
        larm.rotation = breathAmount * 0.08;
      }
      larm.frame = Math.floor(phase * 3) % 3;
    }
    if (rarm) {
      if (isWind) {
        rarm.offset.y = -breathAmount * 2;
        rarm.offset.x = 6 + Math.sin(phase * Math.PI * 2 + 0.5) * 1;
        rarm.rotation = -Math.sin(phase * Math.PI * 2) * 0.08;
      } else {
        rarm.offset.y = -breathAmount * 1.5;
        rarm.offset.x = 6;
        rarm.rotation = -breathAmount * 0.08;
      }
      rarm.frame = Math.floor(phase * 3) % 3;
    }
    const lleg = this.parts.get("lleg");
    const rleg = this.parts.get("rleg");
    if (lleg) {
      lleg.offset.x = -6 + (isWind ? Math.sin(phase * Math.PI * 2) * 0.4 : Math.sin(phase * Math.PI * 2) * 0.2);
      lleg.offset.y = 6 - breathAmount * 0.5;
      lleg.frame = Math.floor(phase * 3) % 3;
    }
    if (rleg) {
      rleg.offset.x = 6 - (isWind ? Math.sin(phase * Math.PI * 2) * 0.4 : Math.sin(phase * Math.PI * 2) * 0.2);
      rleg.offset.y = 6 - breathAmount * 0.5;
      rleg.frame = Math.floor(phase * 3) % 3;
    }
  }
  applyFrame(frame) {
    for (const [partName, updates] of Object.entries(frame.parts)) {
      const part = this.parts.get(partName);
      if (part) {
        Object.assign(part, updates);
      }
    }
  }
  getParts(facing = "right") {
    const partsArray = Array.from(this.parts.values());
    partsArray.forEach((part) => {
      if (facing === "left") {
        if (part.name === "rarm")
          part.zIndex = 2;
        else if (part.name === "larm")
          part.zIndex = 4;
      } else {
        if (part.name === "larm")
          part.zIndex = 2;
        else if (part.name === "rarm")
          part.zIndex = 4;
      }
    });
    return partsArray.sort((a, b) => a.zIndex - b.zIndex);
  }
  getPartByName(name) {
    return this.parts.get(name);
  }
  getAnimationTime() {
    return this.animationTime;
  }
  updateAnchors() {
    for (const [name, anchor] of this.anchors) {
      const part = this.parts.get(anchor.partName);
      if (part) {
        anchor.position = {
          x: part.offset.x + anchor.localOffset.x,
          y: part.offset.y + anchor.localOffset.y
        };
        anchor.rotation = part.rotation;
      }
    }
  }
  getAnchor(name) {
    return this.anchors.get(name);
  }
  getAnchors() {
    return Array.from(this.anchors.values());
  }
  updateWeaponPart() {
    const config = this.weaponConfigs.get(this.currentWeapon);
    if (!config)
      return;
    const handAnchor = this.anchors.get("hand_r");
    if (!handAnchor)
      return;
    const swordPart = this.parts.get("sword");
    if (swordPart) {
      if (config.type === "none") {
        swordPart.sprite = "";
        swordPart.scale = 0;
      } else {
        swordPart.sprite = config.sprite;
        swordPart.offset = {
          x: handAnchor.position.x + config.offset.x,
          y: handAnchor.position.y + config.offset.y
        };
        swordPart.rotation = handAnchor.rotation + config.rotation;
        swordPart.scale = config.scale;
      }
    }
  }
  switchWeapon(weapon) {
    if (this.weaponConfigs.has(weapon)) {
      this.currentWeapon = weapon;
      this.updateWeaponPart();
    }
  }
  getCurrentWeapon() {
    return this.currentWeapon;
  }
  getAvailableWeapons() {
    return Array.from(this.weaponConfigs.keys());
  }
}

// src/rules/hero_animation.ts
class HeroAnimation extends Rule {
  rigs = new Map;
  currentAnimations = new Map;
  debugCallCount = 0;
  execute(context) {
    const commands = [];
    const allUnits = context.getAllUnits();
    const currentTick = context.getCurrentTick();
    this.debugCallCount = currentTick;
    for (const unit of allUnits) {
      if (unit.meta?.useRig) {
        if (!this.rigs.has(unit.id)) {
          const rig2 = new HeroRig;
          const initialAnim = unit.meta?.onRooftop ? "wind" : "breathing";
          rig2.play(initialAnim);
          this.rigs.set(unit.id, rig2);
          this.currentAnimations.set(unit.id, initialAnim);
        }
        const rig = this.rigs.get(unit.id);
        if (unit.meta?.weapon && unit.meta.weapon !== rig.getCurrentWeapon()) {
          rig.switchWeapon(unit.meta.weapon);
        }
        this.updateAnimation(unit, rig, commands);
        rig.update(1);
        const facing = unit.meta?.facing || "right";
        commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              rig: rig.getParts(facing)
            }
          }
        });
      }
    }
    for (const [unitId, rig] of this.rigs.entries()) {
      const unit = context.findUnitById(unitId);
      if (!unit || unit.hp <= 0) {
        this.rigs.delete(unitId);
        this.currentAnimations.delete(unitId);
      }
    }
    return commands;
  }
  updateAnimation(unit, rig, commands) {
    let desiredAnimation;
    const currentTick = this.debugCallCount;
    const inAttackWindow = unit.meta?.attackStartTick && unit.meta?.attackEndTick && currentTick >= unit.meta.attackStartTick && currentTick < unit.meta.attackEndTick;
    const attackJustEnded = unit.meta?.attackEndTick && currentTick >= unit.meta.attackEndTick && unit.state === "attack";
    if (attackJustEnded) {
      commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            attackStartTick: undefined,
            attackEndTick: undefined
          }
        }
      });
      commands.push({
        type: "state",
        params: {
          unitId: unit.id,
          state: "idle"
        }
      });
    }
    if (inAttackWindow || unit.state === "attack") {
      desiredAnimation = "attack";
    } else if (unit.meta?.jumping) {
      desiredAnimation = "jump";
    } else if (unit.intendedMove?.x !== 0 || unit.intendedMove?.y !== 0) {
      desiredAnimation = "walk";
    } else {
      if (unit.meta?.onRooftop) {
        desiredAnimation = "wind";
      } else {
        desiredAnimation = "breathing";
      }
    }
    const currentAnim = this.currentAnimations.get(unit.id);
    if (currentAnim !== desiredAnimation) {
      if (desiredAnimation === "breathing" || desiredAnimation === "wind" || desiredAnimation === "walk" || desiredAnimation === "attack") {
        rig.play(desiredAnimation);
        this.currentAnimations.set(unit.id, desiredAnimation);
      }
    }
  }
}

// src/rules/player_control.ts
init_rule();

class PlayerControl extends Rule {
  keysHeld = new Set;
  moveCooldowns = new Map;
  jumpCooldowns = new Map;
  commandBuffer = new Map;
  MOVE_COOLDOWN = 3;
  JUMP_COOLDOWN = 8;
  moveTarget = null;
  attackMoveTarget = null;
  constructor() {
    super();
  }
  setKeyState(key, pressed) {
    if (pressed) {
      this.keysHeld.add(key.toLowerCase());
    } else {
      this.keysHeld.delete(key.toLowerCase());
    }
  }
  setMoveTarget(target) {
    this.moveTarget = target;
    this.attackMoveTarget = null;
  }
  setAttackMoveTarget(target) {
    this.attackMoveTarget = target;
    this.moveTarget = null;
  }
  execute(context) {
    const commands = [];
    const allUnits = context.getAllUnits();
    for (const [unitId, cooldown] of this.moveCooldowns.entries()) {
      if (cooldown > 0) {
        this.moveCooldowns.set(unitId, cooldown - 1);
      }
    }
    for (const [unitId, cooldown] of this.jumpCooldowns.entries()) {
      if (cooldown > 0) {
        this.jumpCooldowns.set(unitId, cooldown - 1);
      }
    }
    for (const unit of allUnits) {
      if (unit.meta?.controlled || unit.tags?.includes("hero")) {
        if (this.moveTarget || this.attackMoveTarget) {
          const target = this.moveTarget || this.attackMoveTarget;
          if (target) {
            const dx = target.x - unit.pos.x;
            const dy = target.y - unit.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.5) {
              const cooldown2 = this.moveCooldowns.get(unit.id) || 0;
              if (cooldown2 <= 0) {
                const moveX = Math.sign(dx);
                const moveY = Math.sign(dy);
                if (moveX !== 0) {
                  unit.meta = unit.meta || {};
                  unit.meta.facing = moveX > 0 ? "right" : "left";
                }
                commands.push({
                  type: "hero",
                  params: {
                    action: this.getMoveAction(moveX, moveY)
                  }
                });
                this.moveCooldowns.set(unit.id, this.MOVE_COOLDOWN);
              }
            } else {
              this.moveTarget = null;
              this.attackMoveTarget = null;
            }
            if (this.attackMoveTarget) {
              const enemies = allUnits.filter((u) => u.team !== unit.team && u.hp > 0 && Math.abs(u.pos.x - unit.pos.x) < 2 && Math.abs(u.pos.y - unit.pos.y) < 2);
              if (enemies.length > 0) {
                this.attackMoveTarget = null;
                commands.push({
                  type: "strike",
                  unitId: unit.id,
                  params: {
                    targetId: enemies[0].id
                  }
                });
              }
            }
            continue;
          }
        }
        const cooldown = this.moveCooldowns.get(unit.id) || 0;
        if (cooldown <= 0) {
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
            if (!unit.meta)
              unit.meta = {};
            unit.meta.facing = "left";
          }
          if (this.keysHeld.has("d") || this.keysHeld.has("arrowright")) {
            dx = 1;
            if (!unit.meta)
              unit.meta = {};
            unit.meta.facing = "right";
          }
          let action = "";
          if (dx === -1 && dy === 0)
            action = "left";
          else if (dx === 1 && dy === 0)
            action = "right";
          else if (dx === 0 && dy === -1)
            action = "up";
          else if (dx === 0 && dy === 1)
            action = "down";
          else if (dx === -1 && dy === -1)
            action = "up-left";
          else if (dx === 1 && dy === -1)
            action = "up-right";
          else if (dx === -1 && dy === 1)
            action = "down-left";
          else if (dx === 1 && dy === 1)
            action = "down-right";
          if (action) {
            const bufferedCommands = this.commandBuffer.get(unit.id) || [];
            if (bufferedCommands.length < 2) {
              const command = {
                type: "hero",
                params: { action }
              };
              if (bufferedCommands.length === 0) {
                console.log(`[PlayerControl] Sending hero ${action} command, unit at ${JSON.stringify(unit.pos)}`);
                commands.push(command);
                this.moveCooldowns.set(unit.id, this.MOVE_COOLDOWN);
              } else {
                bufferedCommands.push(command);
                this.commandBuffer.set(unit.id, bufferedCommands);
              }
            }
          }
        } else {
          const bufferedCommands = this.commandBuffer.get(unit.id) || [];
          if (cooldown === 1 && bufferedCommands.length > 0) {
            const nextCommand = bufferedCommands.shift();
            if (nextCommand) {
              commands.push(nextCommand);
              this.commandBuffer.set(unit.id, bufferedCommands);
            }
          }
        }
        const jumpCooldown = this.jumpCooldowns.get(unit.id) || 0;
        if (this.keysHeld.has(" ") && !unit.meta?.jumping && jumpCooldown <= 0) {
          commands.push({
            type: "jump",
            unitId: unit.id,
            params: {
              distance: 3,
              height: 5
            }
          });
          this.jumpCooldowns.set(unit.id, this.JUMP_COOLDOWN);
        }
        if (this.keysHeld.has("e") || this.keysHeld.has("enter")) {
          const strikeCooldown = unit.meta?.lastStrike ? context.getCurrentTick() - unit.meta.lastStrike : 999;
          if (strikeCooldown > 8) {
            commands.push({
              type: "hero",
              params: {
                action: "attack",
                direction: unit.meta?.facing || "right",
                range: 2
              }
            });
            unit.meta = unit.meta || {};
            unit.meta.lastStrike = context.getCurrentTick();
          }
        }
        const weaponTypes = ["sword", "spear", "axe", "bow", "shield", "staff"];
        for (let i = 0;i < weaponTypes.length; i++) {
          const key = (i + 1).toString();
          if (this.keysHeld.has(key)) {
            commands.push({
              type: "meta",
              params: {
                unitId: unit.id,
                meta: {
                  ...unit.meta,
                  weapon: weaponTypes[i]
                }
              }
            });
            console.log(`[PlayerControl] Switching to ${weaponTypes[i]}`);
          }
        }
      }
    }
    return commands;
  }
  getMoveAction(dx, dy) {
    if (dx === -1 && dy === 0)
      return "left";
    if (dx === 1 && dy === 0)
      return "right";
    if (dx === 0 && dy === -1)
      return "up";
    if (dx === 0 && dy === 1)
      return "down";
    if (dx === -1 && dy === -1)
      return "up-left";
    if (dx === 1 && dy === -1)
      return "up-right";
    if (dx === -1 && dy === 1)
      return "down-left";
    if (dx === 1 && dy === 1)
      return "down-right";
    return "left";
  }
}

// src/mwe/hero.ts
class HeroGame extends Game {
  playerControl;
  cursorWorldPos = null;
  constructor(canvas, opts) {
    super(canvas, opts);
    this.simTickRate = 60;
    this.ninjaCount = 0;
    this.waveNumber = 0;
    this.fieldWidth = 15;
    this.fieldHeight = 10;
  }
  ninjaCount;
  waveNumber;
  spawnNinjaWave() {
    const lanes = [4, 5, 6];
    for (const lane of lanes) {
      const ninja = {
        id: `ninja_${this.ninjaCount++}`,
        pos: { x: 14, y: lane },
        team: "hostile",
        hp: 10,
        maxHp: 10,
        dmg: 3,
        sprite: "ninja",
        type: "ninja",
        tags: ["enemy", "ninja"],
        intendedMove: { x: -1, y: 0 },
        meta: {
          speed: 0.5
        }
      };
      console.log(`Spawning ninja: ${ninja.id} at (${ninja.pos.x}, ${ninja.pos.y})`);
      this.sim.addUnit(ninja);
    }
    setTimeout(() => {
      if (this.waveNumber < 10) {
        this.waveNumber++;
        this.spawnNinjaWave();
      }
    }, 3000);
  }
  bootstrap() {
    super.bootstrap();
    this.renderer.setViewMode("iso");
    this.playerControl = new PlayerControl;
    this.sim.rulebook.push(this.playerControl);
    this.sim.rulebook.push(new HeroAnimation);
    this.sim.rulebook.push(new Jumping);
    const MoveToTarget2 = (init_move_to_target(), __toCommonJS(exports_move_to_target)).MoveToTarget;
    this.sim.rulebook.push(new MoveToTarget2);
    this.sim.sceneBackground = "rooftop";
    this.sim.addUnit({
      id: "hero",
      pos: { x: 10, y: 10 },
      team: "friendly",
      hp: 100,
      maxHp: 100,
      dmg: 15,
      sprite: "hero",
      tags: ["hero"],
      meta: {
        controlled: true,
        useRig: true,
        onRooftop: true,
        weapon: "sword",
        facing: "right"
      }
    });
    this.spawnNinjaWave();
  }
  static boot(canvasId = "battlefield") {
    let game = null;
    const canvas = canvasId instanceof HTMLCanvasElement ? canvasId : document.getElementById(canvasId);
    if (canvas) {
      let addInputListener = (cb) => {};
      game = new HeroGame(canvas, {
        addInputListener,
        animationFrame: (cb) => requestAnimationFrame(cb)
      });
      window.addEventListener("resize", () => {
        if (game && game.handleResize) {
          game.handleResize();
        }
      });
      if (game && game.handleResize) {
        game.handleResize();
      }
      game.bootstrap();
      document.addEventListener("keydown", (e) => {
        if (game && game.playerControl) {
          game.playerControl.setKeyState(e.key, true);
        }
      });
      document.addEventListener("keyup", (e) => {
        if (game && game.playerControl) {
          game.playerControl.setKeyState(e.key, false);
        }
      });
      canvas.addEventListener("click", (e) => {
        if (game && game.sim) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;
          const worldX = Math.round((x - canvas.width / 2) / 8 + (y - canvas.height / 2) / 4) + 10;
          const worldY = Math.round((y - canvas.height / 2) / 4 - (x - canvas.width / 2) / 16) + 10;
          game.sim.queuedCommands.push({
            type: "hero",
            params: {
              action: "move-to",
              x: worldX,
              y: worldY,
              attackMove: false
            }
          });
          console.log(`Click to move: hero move-to (${worldX}, ${worldY})`);
        }
      });
      canvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (game && game.sim) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;
          const worldX = Math.round((x - canvas.width / 2) / 8 + (y - canvas.height / 2) / 4);
          const worldY = Math.round((y - canvas.height / 2) / 4 - (x - canvas.width / 2) / 16);
          const hero = game.sim.units.find((u) => u.tags?.includes("hero"));
          if (hero) {
            game.sim.queuedCommands.push({
              type: "move_target",
              unitId: hero.id,
              params: {
                x: worldX + 10,
                y: worldY + 10,
                attackMove: true
              }
            });
            console.log(`Attack-move to: (${worldX + 10}, ${worldY + 10})`);
          }
        }
      });
    } else {
      console.error(`Canvas element ${canvasId} not found!`);
    }
    function gameLoop() {
      if (game) {
        game.update();
      }
      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
  }
}
if (typeof window !== "undefined") {
  window.HeroGame = HeroGame;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => HeroGame.boot());
  } else {
    HeroGame.boot();
  }
}
export {
  HeroGame
};
