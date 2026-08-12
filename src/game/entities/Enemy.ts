/** Entidade inimigo — atributos, chase, melee, ranged, status e desenho. */

import type { EnemyRewards } from "@/lib/gameConfig";
import { resolveVisualDimension } from "@/src/game/multiverseLoop";
import { drawThemedEnemy } from "@/src/game/entities/EnemyRenderer";
import { useArenaStore } from "@/store/useArenaStore";
import { useGameStore } from "@/store/useGameStore";

const EDGE_MARGIN = 24;
const DEFAULT_HP = 30;
const DEFAULT_SPEED = 55;
/** Dano melee por tick (baixa, periódica). */
export const DEFAULT_ATTACK_DAMAGE = 1.2;
/** Intervalo entre golpes melee (ms de game clock). */
export const DEFAULT_ATTACK_COOLDOWN_MS = 1000;
/** Cooldown de disparo dos ranged (ms). */
export const RANGED_ATTACK_COOLDOWN_MS = 2000;
const FRICTION = 0.85;
/** Velocidade mínima de knockback para interromper o swarm. */
const KNOCKBACK_BREAK_SWARM = 0.4;

export type EnemyType = "normal" | "dasher" | "ranged" | "boss";
export type StatusEffectType = "freeze" | "shock" | "burn" | "quake";

export type StatusEffect = {
  type: StatusEffectType;
  expiresAt: number;
  /** DPS total de queimadura (= base × stacks ativas). */
  burnDps?: number;
  /** Pilhas de queimadura on-hit ativas. */
  burnStacks?: number;
  /** DPS por pilha (base do DoT progressivo). */
  burnDpsPerStack?: number;
  /** Expiração individual de cada pilha de fogo (ms game clock). */
  burnStackExpires?: number[];
  /** Fração de slow 0–1 (shock / stun). */
  slowAmount?: number;
  /** Debuff de gelo: inimigo toma mais dano do jogador. */
  vulnerable?: boolean;
  /** Multiplicador de dano recebido (ex.: 1.3 com gelo). */
  damageTakenMultiplier?: number;
  /** Multiplicador de dano causado (ex.: 0.5 com terremoto). */
  attackDamageMul?: number;
  /** Multiplicador de attack speed (ex.: 0.5 = ataca pela metade). */
  attackSpeedMul?: number;
};

export const ICE_VULNERABILITY_MULTIPLIER = 1.3;
/** Mini-stun do Raio (velocidade 0). */
export const LIGHTNING_STUN_MS = 400;

export const ENEMY_RADIUS: Record<EnemyType, number> = {
  normal: 12,
  dasher: 8,
  ranged: 11,
  boss: 36,
};

/** Intervalo de tick de burn (ms). */
export const BURN_TICK_MS = 500;
export const BURN_DURATION_MS = 3000;
export const SHOCK_SLOW_DURATION_MS = 2000;

export const DEFAULT_ENEMY_REWARDS: EnemyRewards = {
  xpReward: 5,
  goldReward: 1,
  normalDiamondChance: 0.03,
  purpleDiamondChance: 0.001,
};

/**
 * Desenha um polígono regular centrado em (x, y).
 * `sides < 3` → círculo (tier orgânico / prestígio 0).
 */
export function drawPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sides: number,
  color: string,
  options?: {
    strokeStyle?: string;
    lineWidth?: number;
    rotation?: number;
  },
): void {
  ctx.beginPath();
  if (sides < 3) {
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  } else {
    const rot = options?.rotation ?? -Math.PI / 2;
    for (let i = 0; i < sides; i++) {
      const angle = rot + (i * Math.PI * 2) / sides;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  ctx.fillStyle = color;
  ctx.fill();
  if (options?.strokeStyle) {
    ctx.strokeStyle = options.strokeStyle;
    ctx.lineWidth = options.lineWidth ?? 2;
    ctx.stroke();
  }
}

/** Estrela pontiaguda (tiers poligonais superiores). */
export function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  points: number,
  color: string,
  options?: {
    strokeStyle?: string;
    lineWidth?: number;
    innerRatio?: number;
  },
): void {
  const spikes = Math.max(3, points);
  const inner = radius * (options?.innerRatio ?? 0.45);
  const rot = -Math.PI / 2;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? radius : inner;
    const angle = rot + (i * Math.PI) / spikes;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (options?.strokeStyle) {
    ctx.strokeStyle = options.strokeStyle;
    ctx.lineWidth = options.lineWidth ?? 2;
    ctx.stroke();
  }
}

/**
 * Forma do inimigo pelo nível de Ascensão:
 * 0 círculo, 1 quadrado, 2 triângulo, 3 hexágono, 4 octógono, 5+ estrela.
 */
export function getPrestigeEnemySides(prestigeLevel: number): number {
  const p = Math.max(0, Math.floor(prestigeLevel));
  if (p <= 0) return 0;
  if (p === 1) return 4;
  if (p === 2) return 3;
  if (p === 3) return 6;
  if (p === 4) return 8;
  return -1; // estrela
}

export type EnemyData = {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  vx: number;
  vy: number;
  /** Dano melee por golpe no jogador. */
  attackDamage: number;
  /** Cooldown entre golpes / disparos (ms). */
  attackCooldown: number;
  /** Último golpe ou disparo (ms do game clock). */
  lastAttackTime: number;
  /** Encoded no jogador (melee) ou mirando (ranged). */
  isAttacking: boolean;
  /** Dano do projétil (ranged); 0 nos demais. */
  projectileDamage: number;
  type: EnemyType;
  radius: number;
  /** Cor do canvas (vindo de enemy_types). */
  color?: string;
  statusEffects: StatusEffect[];
  /** Recompensas por kill (vindo de enemy_types). */
  rewards?: EnemyRewards;
};

export type EnemySpawnStats = {
  hp: number;
  speed: number;
  attackDamage: number;
  attackCooldown?: number;
  projectileDamage?: number;
  type?: EnemyType;
  radius?: number;
  color?: string;
  rewards?: EnemyRewards;
  /** Se true, não aplica modifiers legacy (stats já vêm do DB). */
  skipTypeModifiers?: boolean;
};

/** Aplica modificadores de tipo sobre stats base (snapshot do spawn). */
export function applyEnemyTypeModifiers(
  type: EnemyType,
  base: { hp: number; speed: number; attackDamage: number },
): {
  hp: number;
  speed: number;
  attackDamage: number;
  projectileDamage: number;
  radius: number;
  attackCooldown: number;
} {
  switch (type) {
    case "dasher":
      return {
        hp: Math.max(1, Math.round(base.hp * 0.5)),
        speed: base.speed * 2,
        attackDamage: base.attackDamage,
        projectileDamage: 0,
        radius: ENEMY_RADIUS.dasher,
        attackCooldown: DEFAULT_ATTACK_COOLDOWN_MS,
      };
    case "ranged":
      return {
        hp: Math.max(1, Math.round(base.hp * 0.85)),
        speed: base.speed * 0.85,
        attackDamage: base.attackDamage,
        projectileDamage: Number((base.attackDamage * 1.5).toFixed(2)),
        radius: ENEMY_RADIUS.ranged,
        attackCooldown: RANGED_ATTACK_COOLDOWN_MS,
      };
    case "boss":
      return {
        hp: Math.round(base.hp * 20),
        speed: base.speed * 0.5,
        attackDamage: Number((base.attackDamage * 2).toFixed(2)),
        projectileDamage: 0,
        radius: ENEMY_RADIUS.boss,
        attackCooldown: DEFAULT_ATTACK_COOLDOWN_MS,
      };
    default:
      return {
        hp: base.hp,
        speed: base.speed,
        attackDamage: base.attackDamage,
        projectileDamage: 0,
        radius: ENEMY_RADIUS.normal,
        attackCooldown: DEFAULT_ATTACK_COOLDOWN_MS,
      };
  }
}

export class Enemy {
  public burnDamage = 0;
  public isBurning = false;
  public slowAmount = 0;
  private burnAccumulatorMs = 0;
  /** Vendaval / vácuo: até quando o puxão permanece ativo. */
  vacuumUntil = 0;
  vacuumTx = 0;
  vacuumTy = 0;
  vacuumStrength = 0;

  constructor(
    public id: string,
    public x: number,
    public y: number,
    public hp: number,
    public maxHp: number,
    public speed: number,
    public vx: number = 0,
    public vy: number = 0,
    public attackDamage: number = DEFAULT_ATTACK_DAMAGE,
    public attackCooldown: number = DEFAULT_ATTACK_COOLDOWN_MS,
    public lastAttackTime: number = 0,
    public isAttacking: boolean = false,
    public type: EnemyType = "normal",
    public radius: number = ENEMY_RADIUS.normal,
    public statusEffects: StatusEffect[] = [],
    public projectileDamage: number = 0,
    public color: string = "",
    public rewards: EnemyRewards = { ...DEFAULT_ENEMY_REWARDS },
  ) {}

  static fromData(data: EnemyData): Enemy {
    const type = data.type ?? "normal";
    const attackDamage =
      data.attackDamage ??
      (data as { contactDamage?: number }).contactDamage ??
      DEFAULT_ATTACK_DAMAGE;
    const enemy = new Enemy(
      data.id,
      data.x,
      data.y,
      data.hp,
      data.maxHp,
      data.speed,
      data.vx ?? 0,
      data.vy ?? 0,
      attackDamage,
      data.attackCooldown ??
        (type === "ranged"
          ? RANGED_ATTACK_COOLDOWN_MS
          : DEFAULT_ATTACK_COOLDOWN_MS),
      data.lastAttackTime ?? 0,
      data.isAttacking ?? false,
      type,
      data.radius ?? ENEMY_RADIUS[type],
      (data.statusEffects ?? []).map((s) => ({
        ...s,
        burnStackExpires: s.burnStackExpires
          ? [...s.burnStackExpires]
          : undefined,
      })),
      data.projectileDamage ?? (type === "ranged" ? attackDamage * 1.5 : 0),
      data.color ?? "",
      data.rewards ? { ...data.rewards } : { ...DEFAULT_ENEMY_REWARDS },
    );
    return enemy;
  }

  pruneStatusEffects(now: number): void {
    this.statusEffects = this.statusEffects
      .map((s) => {
        if (s.type !== "burn") return s;
        const active = (s.burnStackExpires ?? []).filter((t) => t > now);
        if (active.length === 0) {
          // Fallback legado: um único expiresAt
          if ((s.burnStackExpires?.length ?? 0) === 0 && s.expiresAt > now) {
            return s;
          }
          return null;
        }
        const dpsPerStack = s.burnDpsPerStack ?? 0;
        return {
          ...s,
          burnStackExpires: active,
          burnStacks: active.length,
          burnDps: active.length * dpsPerStack,
          expiresAt: Math.max(...active),
        };
      })
      .filter((s): s is StatusEffect => s != null && s.expiresAt > now);
  }

  hasStatus(type: StatusEffectType, now: number): boolean {
    return this.statusEffects.some(
      (s) => s.type === type && s.expiresAt > now,
    );
  }

  get isBoss(): boolean {
    return this.type === "boss";
  }

  /**
   * Aplica ou renova um status (mantém a expiração mais longa).
   * Meta opcional: burn / slow / vulnerability.
   */
  applyStatus(
    type: StatusEffectType,
    expiresAt: number,
    meta?: {
      burnDps?: number;
      burnStacks?: number;
      burnDpsPerStack?: number;
      slowAmount?: number;
      vulnerable?: boolean;
      damageTakenMultiplier?: number;
      attackDamageMul?: number;
      attackSpeedMul?: number;
    },
  ): void {
    const existing = this.statusEffects.find((s) => s.type === type);
    if (existing) {
      existing.expiresAt = Math.max(existing.expiresAt, expiresAt);
      if (meta?.burnDps != null) {
        existing.burnDps = Math.max(existing.burnDps ?? 0, meta.burnDps);
      }
      if (meta?.burnStacks != null) {
        existing.burnStacks = Math.max(
          existing.burnStacks ?? 0,
          meta.burnStacks,
        );
      }
      if (meta?.burnDpsPerStack != null) {
        existing.burnDpsPerStack = meta.burnDpsPerStack;
      }
      if (meta?.slowAmount != null) {
        existing.slowAmount = Math.max(
          existing.slowAmount ?? 0,
          meta.slowAmount,
        );
      }
      if (meta?.vulnerable != null) {
        existing.vulnerable = meta.vulnerable || existing.vulnerable;
      }
      if (meta?.damageTakenMultiplier != null) {
        existing.damageTakenMultiplier = Math.max(
          existing.damageTakenMultiplier ?? 1,
          meta.damageTakenMultiplier,
        );
      }
      if (meta?.attackDamageMul != null) {
        existing.attackDamageMul = Math.min(
          existing.attackDamageMul ?? 1,
          meta.attackDamageMul,
        );
      }
      if (meta?.attackSpeedMul != null) {
        existing.attackSpeedMul = Math.min(
          existing.attackSpeedMul ?? 1,
          meta.attackSpeedMul,
        );
      }
      return;
    }
    this.statusEffects.push({
      type,
      expiresAt,
      burnDps: meta?.burnDps,
      burnStacks: meta?.burnStacks,
      burnDpsPerStack: meta?.burnDpsPerStack,
      slowAmount: meta?.slowAmount,
      vulnerable: meta?.vulnerable,
      damageTakenMultiplier: meta?.damageTakenMultiplier,
      attackDamageMul: meta?.attackDamageMul,
      attackSpeedMul: meta?.attackSpeedMul,
    });
  }

  applyBurn(burnDps: number, now: number, durationMs = BURN_DURATION_MS): void {
    if (burnDps <= 0) return;
    this.applyBurnStack(burnDps, 1, now, durationMs);
  }

  /**
   * On-hit: +1 pilha de burn (teto = maxStacks).
   * DoT total = baseBurnDamage × burnStacks; cada pilha expira individualmente.
   */
  applyBurnStack(
    baseBurnDamage: number,
    maxStacks: number,
    now: number,
    durationMs = BURN_DURATION_MS,
  ): number {
    if (baseBurnDamage <= 0 || maxStacks <= 0) return 0;
    const cap = Math.max(1, Math.floor(maxStacks));
    const stackExpiresAt = now + durationMs;

    let existing = this.statusEffects.find((s) => s.type === "burn");
    if (!existing) {
      existing = {
        type: "burn",
        expiresAt: stackExpiresAt,
        burnStackExpires: [],
        burnDpsPerStack: baseBurnDamage,
        burnStacks: 0,
        burnDps: 0,
      };
      this.statusEffects.push(existing);
    }

    existing.burnDpsPerStack = baseBurnDamage;
    const active = (existing.burnStackExpires ?? []).filter((t) => t > now);
    active.push(stackExpiresAt);
    while (active.length > cap) {
      active.shift(); // remove a pilha mais antiga
    }

    existing.burnStackExpires = active;
    existing.burnStacks = active.length;
    // totalBurnDamagePerSecond = baseBurnDamage * enemy.burnStacks
    existing.burnDps = baseBurnDamage * active.length;
    existing.expiresAt = Math.max(...active);
    return existing.burnStacks;
  }

  getBurnStacks(now: number): number {
    const burn = this.statusEffects.find(
      (s) => s.type === "burn" && s.expiresAt > now,
    );
    if (!burn) return 0;
    if (burn.burnStackExpires && burn.burnStackExpires.length > 0) {
      return burn.burnStackExpires.filter((t) => t > now).length;
    }
    return burn.burnStacks ?? 0;
  }

  /** True enquanto congelado com debuff de vulnerabilidade do gelo. */
  isVulnerable(now: number): boolean {
    const freeze = this.statusEffects.find(
      (s) => s.type === "freeze" && s.expiresAt > now,
    );
    return Boolean(freeze?.vulnerable);
  }

  /** Multiplicador de dano recebido (gelo vulnerável → 1.3×). */
  getDamageTakenMultiplier(now: number): number {
    const freeze = this.statusEffects.find(
      (s) => s.type === "freeze" && s.expiresAt > now,
    );
    if (!freeze) return 1;
    if (freeze.damageTakenMultiplier != null) {
      return freeze.damageTakenMultiplier;
    }
    return freeze.vulnerable ? ICE_VULNERABILITY_MULTIPLIER : 1;
  }

  /** Mini-stun: velocidade 0 por durationMs (Raio). */
  applyStun(now: number, durationMs = LIGHTNING_STUN_MS): void {
    this.applyShockSlow(1, now, durationMs);
  }

  applyShockSlow(
    slowAmount: number,
    now: number,
    durationMs = SHOCK_SLOW_DURATION_MS,
  ): void {
    this.applyStatus("shock", now + durationMs, {
      slowAmount: Math.min(1, Math.max(0, slowAmount)),
    });
  }

  /** Debuff de Pedra: −50% dano e attack speed. */
  applyQuake(
    now: number,
    durationMs: number,
    attackDamageMul = 0.5,
    attackSpeedMul = 0.5,
  ): void {
    this.applyStatus("quake", now + durationMs, {
      attackDamageMul: Math.min(1, Math.max(0.05, attackDamageMul)),
      attackSpeedMul: Math.min(1, Math.max(0.05, attackSpeedMul)),
      slowAmount: Math.max(0, 1 - attackSpeedMul) * 0.35,
    });
  }

  /** Multiplicador de dano que o inimigo causa (1 = normal). */
  getOutgoingDamageMultiplier(now: number): number {
    const quake = this.statusEffects.find(
      (s) => s.type === "quake" && s.expiresAt > now,
    );
    return quake?.attackDamageMul ?? 1;
  }

  /** Multiplicador de attack speed (0.5 = ataca 2× mais lento). */
  getAttackSpeedMultiplier(now: number): number {
    const quake = this.statusEffects.find(
      (s) => s.type === "quake" && s.expiresAt > now,
    );
    return Math.max(0.05, quake?.attackSpeedMul ?? 1);
  }

  /**
   * Tick de status: burn DPS, sync isBurning/slowAmount.
   * Chamar todo frame (dt em segundos).
   */
  tickStatuses(dt: number, now: number): void {
    this.pruneStatusEffects(now);

    const burn = this.statusEffects.find(
      (s) => s.type === "burn" && s.expiresAt > now,
    );
    this.isBurning = Boolean(burn);
    this.burnDamage = burn?.burnDps ?? 0;

    const shock = this.statusEffects.find(
      (s) => s.type === "shock" && s.expiresAt > now,
    );
    const quake = this.statusEffects.find(
      (s) => s.type === "quake" && s.expiresAt > now,
    );
    this.slowAmount = Math.max(
      shock ? Math.min(1, Math.max(0, shock.slowAmount ?? 0.2)) : 0,
      quake ? Math.min(1, Math.max(0, quake.slowAmount ?? 0.15)) : 0,
    );

    if (this.isBurning && this.burnDamage > 0) {
      this.burnAccumulatorMs += dt * 1000;
      while (this.burnAccumulatorMs >= BURN_TICK_MS) {
        this.burnAccumulatorMs -= BURN_TICK_MS;
        // burnDamage = DPS → tick de 500ms aplica metade (+ vuln do gelo)
        const tick =
          this.burnDamage *
          (BURN_TICK_MS / 1000) *
          this.getDamageTakenMultiplier(now);
        this.hp -= tick;
      }
    } else {
      this.burnAccumulatorMs = 0;
    }
  }

  /** Velocidade efetiva após freeze/slow. */
  getEffectiveSpeed(now: number): number {
    if (this.hasStatus("freeze", now)) return 0;
    return this.speed * (1 - this.slowAmount);
  }

  /**
   * Chase + knockback. Ranged para no alcance de ataque do jogador.
   * Congelado ou em melee (encostado): não avança.
   */
  moveToward(
    playerX: number,
    playerY: number,
    dt: number,
    now: number,
    playerRadius = 18,
    playerAttackRange = 120,
  ): void {
    this.tickStatuses(dt, now);

    if (this.hasStatus("freeze", now)) {
      this.vx = 0;
      this.vy = 0;
      this.isAttacking = false;
      return;
    }

    if (this.tickVacuumPull(dt, now, playerRadius)) {
      return;
    }

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const touchDist = this.radius + playerRadius;
    const knockbackSpeed = Math.hypot(this.vx, this.vy);
    const moveSpeed = this.getEffectiveSpeed(now);

    const applyFrictionStep = () => {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= FRICTION;
      this.vy *= FRICTION;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
      if (Math.abs(this.vy) < 0.05) this.vy = 0;
    };

    // Ranged: para no range do jogador e mantém distância de tiro
    if (this.type === "ranged") {
      if (knockbackSpeed > KNOCKBACK_BREAK_SWARM) {
        this.isAttacking = false;
        applyFrictionStep();
        return;
      }

      if (dist <= playerAttackRange) {
        this.isAttacking = true;
        applyFrictionStep();
        return;
      }

      this.isAttacking = false;
      const step = moveSpeed * dt;
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      applyFrictionStep();
      return;
    }

    // Encostou: swarm — mas knockback empurra para fora e cancela ataque
    if (dist <= touchDist) {
      if (knockbackSpeed > KNOCKBACK_BREAK_SWARM) {
        this.isAttacking = false;
        applyFrictionStep();
        return;
      }

      this.isAttacking = true;
      this.vx = 0;
      this.vy = 0;
      // Mantém na borda do jogador para formar a horda
      if (dist > 0.001 && dist < touchDist) {
        const push = (touchDist - dist) * 0.35;
        this.x -= (dx / dist) * push;
        this.y -= (dy / dist) * push;
      }
      return;
    }

    this.isAttacking = false;

    const step = moveSpeed * dt;
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;

    applyFrictionStep();
  }

  /** Impulso de repulsão; bosses são imunes. Cancela swarm nos demais. */
  applyKnockback(dirX: number, dirY: number, impulse: number): void {
    if (this.isBoss) {
      this.vx = 0;
      this.vy = 0;
      return;
    }
    const len = Math.hypot(dirX, dirY) || 1;
    const scale = this.type === "dasher" ? 1.2 : 1;
    const power = impulse * scale;
    this.vx = (dirX / len) * power;
    this.vy = (dirY / len) * power;
    this.isAttacking = false;
  }

  /**
   * Puxão de vácuo (Vendaval): interpola em direção ao alvo por `durationMs`.
   * Bosses sofrem puxão reduzido (~35%).
   */
  applyVacuumPull(
    targetX: number,
    targetY: number,
    now: number,
    durationMs = 500,
    strength = 1,
  ): void {
    const power = this.isBoss
      ? Math.max(0, strength) * 0.35
      : Math.max(0, strength);
    if (power <= 0) return;
    this.vacuumUntil = Math.max(this.vacuumUntil, now + durationMs);
    this.vacuumTx = targetX;
    this.vacuumTy = targetY;
    this.vacuumStrength = Math.max(this.vacuumStrength, power);
    this.vx = 0;
    this.vy = 0;
    this.isAttacking = false;
  }

  /** Aplica um passo de puxão suave; retorna true se o movimento chase deve ser pulado. */
  tickVacuumPull(dt: number, now: number, playerRadius = 18): boolean {
    if (now >= this.vacuumUntil || this.vacuumStrength <= 0) {
      if (now >= this.vacuumUntil) this.vacuumStrength = 0;
      return false;
    }
    const dx = this.vacuumTx - this.x;
    const dy = this.vacuumTy - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const minDist = this.radius + playerRadius * 0.85;
    if (dist <= minDist) {
      this.vx = 0;
      this.vy = 0;
      this.isAttacking = false;
      return true;
    }
    const rate = 7.5 * this.vacuumStrength;
    const t = 1 - Math.exp(-rate * Math.max(0, dt));
    const move = Math.min(dist - minDist, dist * t);
    this.x += (dx / dist) * move;
    this.y += (dy / dist) * move;
    this.vx = 0;
    this.vy = 0;
    this.isAttacking = false;
    return true;
  }

  takeDamage(amount: number, now?: number): boolean {
    const mult =
      now != null ? this.getDamageTakenMultiplier(now) : 1;
    this.hp -= amount * mult;
    return this.hp <= 0;
  }

  get isDead(): boolean {
    return this.hp <= 0;
  }

  toData(): EnemyData {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      hp: this.hp,
      maxHp: this.maxHp,
      speed: this.speed,
      vx: this.vx,
      vy: this.vy,
      attackDamage: this.attackDamage,
      attackCooldown: this.attackCooldown,
      lastAttackTime: this.lastAttackTime,
      isAttacking: this.isAttacking,
      projectileDamage: this.projectileDamage,
      type: this.type,
      radius: this.radius,
      color: this.color || undefined,
      statusEffects: this.statusEffects.map((s) => ({
        ...s,
        burnStackExpires: s.burnStackExpires
          ? [...s.burnStackExpires]
          : undefined,
      })),
      rewards: { ...this.rewards },
    };
  }

  /**
   * Desenha o inimigo temático (prestígio) + overlays de status.
   * Hitbox de colisão permanece o círculo `this.radius` — só o visual muda.
   */
  draw(ctx: CanvasRenderingContext2D, now: number): void {
    this.pruneStatusEffects(now);
    const hpPercent = Math.max(0, Math.min(1, this.hp / this.maxHp));
    const frozen = this.hasStatus("freeze", now);
    const shocked = this.hasStatus("shock", now);
    const burning = this.hasStatus("burn", now);
    const quaked = this.hasStatus("quake", now);
    const vulnerable = this.isVulnerable(now);
    const prestige = useGameStore.getState().prestigeLevel ?? 0;
    const arena = useArenaStore.getState();
    const visualDimension = resolveVisualDimension({
      runMode: arena.runMode,
      timeAliveMs: arena.timeAlive * 1000,
      runStageNumber: arena.runStageNumber,
      prestigeLevel: prestige,
    });

    drawThemedEnemy(ctx, {
      x: this.x,
      y: this.y,
      radius: this.radius,
      type: this.type,
      hpPercent,
      visualDimension,
      now,
      isAttacking: this.isAttacking,
      frozen,
      burning,
      catalogColor: this.color || undefined,
    });

    if (frozen) {
      ctx.save();
      // Aura gelada
      const frost = ctx.createRadialGradient(
        this.x,
        this.y,
        this.radius * 0.3,
        this.x,
        this.y,
        this.radius + 10,
      );
      frost.addColorStop(0, "rgba(186, 230, 253, 0.35)");
      frost.addColorStop(0.6, "rgba(125, 211, 252, 0.18)");
      frost.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
      ctx.fillStyle = frost;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = vulnerable
        ? "rgba(165, 180, 252, 0.95)"
        : "rgba(186, 230, 253, 0.95)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      if (vulnerable) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(129, 140, 248, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Cristais de gelo ao redor
      const shards = 6;
      for (let i = 0; i < shards; i++) {
        const ang = (Math.PI * 2 * i) / shards + now * 0.0015;
        const d = this.radius + 4;
        const sx = this.x + Math.cos(ang) * d;
        const sy = this.y + Math.sin(ang) * d;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 4);
        ctx.lineTo(sx + 2.5, sy);
        ctx.lineTo(sx, sy + 4);
        ctx.lineTo(sx - 2.5, sy);
        ctx.closePath();
        ctx.fillStyle = "rgba(240, 249, 255, 0.9)";
        ctx.fill();
      }
      ctx.restore();
    }

    if (shocked) {
      ctx.save();
      // Aura azul elétrica
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.65)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#3b82f6";
      ctx.shadowBlur = 14;
      ctx.stroke();

      ctx.strokeStyle = "rgba(125, 211, 252, 0.95)";
      ctx.lineWidth = 1.6;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 8;
      const sparks = 7;
      for (let i = 0; i < sparks; i++) {
        const angle = (Math.PI * 2 * i) / sparks + now * 0.018;
        const inner = this.radius * 0.4;
        const mid = this.radius * 0.85;
        const outer = this.radius + 7 + (i % 2) * 4;
        const a2 = angle + 0.35;
        ctx.beginPath();
        ctx.moveTo(
          this.x + Math.cos(angle) * inner,
          this.y + Math.sin(angle) * inner,
        );
        ctx.lineTo(
          this.x + Math.cos(a2) * mid,
          this.y + Math.sin(a2) * mid,
        );
        ctx.lineTo(
          this.x + Math.cos(angle + 0.15) * outer,
          this.y + Math.sin(angle + 0.15) * outer,
        );
        ctx.stroke();
      }

      // Núcleo branco elétrico
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(219, 234, 254, ${0.35 + 0.25 * Math.sin(now * 0.03)})`;
      ctx.fill();
      ctx.restore();
    }

    if (quaked) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(168, 162, 158, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#a8a29e";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(120, 113, 108, 0.25)";
      ctx.fill();
      ctx.restore();
    }

    if (burning) {
      ctx.save();
      const stacks = Math.max(1, this.getBurnStacks(now));
      const intensity = Math.min(1, 0.35 + stacks * 0.12);

      // Halo vermelho flamejante
      const fireGlow = ctx.createRadialGradient(
        this.x,
        this.y,
        this.radius * 0.2,
        this.x,
        this.y,
        this.radius + 8 + stacks,
      );
      fireGlow.addColorStop(0, `rgba(254, 240, 138, ${0.25 + intensity * 0.2})`);
      fireGlow.addColorStop(0.45, `rgba(249, 115, 22, ${0.3 + intensity * 0.25})`);
      fireGlow.addColorStop(1, "rgba(127, 29, 29, 0)");
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8 + stacks, 0, Math.PI * 2);
      ctx.fillStyle = fireGlow;
      ctx.fill();

      const fireSparks = Math.min(30, 6 + stacks * 3);
      for (let i = 0; i < fireSparks; i++) {
        const phase = (now * 0.004 + i * 0.9) % 1;
        const spread = 0.45 + stacks * 0.08;
        const ox = Math.sin(now * 0.01 + i * 1.7) * this.radius * spread;
        const oy = -phase * (this.radius + 12 + stacks * 2.5);
        const r = 1.3 + (1 - phase) * (2.2 + stacks * 0.4);
        // Chama alongada
        ctx.beginPath();
        ctx.moveTo(this.x + ox, this.y + oy + r);
        ctx.quadraticCurveTo(
          this.x + ox + r * 0.8,
          this.y + oy,
          this.x + ox,
          this.y + oy - r * 1.6,
        );
        ctx.quadraticCurveTo(
          this.x + ox - r * 0.8,
          this.y + oy,
          this.x + ox,
          this.y + oy + r,
        );
        const alpha = 0.6 + intensity * 0.35 - phase * 0.55;
        ctx.fillStyle =
          i % 3 === 0
            ? `rgba(253, 224, 71, ${alpha})`
            : i % 2 === 0
              ? `rgba(249, 115, 22, ${alpha})`
              : `rgba(220, 38, 38, ${alpha})`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 2 + stacks * 0.4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.6 + intensity * 0.35})`;
      ctx.lineWidth = 1.6 + stacks * 0.25;
      ctx.stroke();
      if (stacks >= 3) {
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 8 + stacks * 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 146, 60, ${0.14 + stacks * 0.03})`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }
  }

  /** Spawna em uma borda aleatória, com stats e tipo. */
  static spawnAtEdge(
    canvasWidth: number,
    canvasHeight: number,
    stats?: Partial<EnemySpawnStats>,
  ): Enemy {
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;

    switch (edge) {
      case 0:
        x = Math.random() * canvasWidth;
        y = -EDGE_MARGIN;
        break;
      case 1:
        x = canvasWidth + EDGE_MARGIN;
        y = Math.random() * canvasHeight;
        break;
      case 2:
        x = Math.random() * canvasWidth;
        y = canvasHeight + EDGE_MARGIN;
        break;
      default:
        x = -EDGE_MARGIN;
        y = Math.random() * canvasHeight;
        break;
    }

    const type: EnemyType = stats?.type ?? "normal";
    const modified = stats?.skipTypeModifiers
      ? {
          hp: stats.hp ?? DEFAULT_HP,
          speed: stats.speed ?? DEFAULT_SPEED,
          attackDamage: stats.attackDamage ?? DEFAULT_ATTACK_DAMAGE,
          projectileDamage: stats.projectileDamage ?? 0,
          radius: stats.radius ?? ENEMY_RADIUS[type],
          attackCooldown:
            stats.attackCooldown ??
            (type === "ranged"
              ? RANGED_ATTACK_COOLDOWN_MS
              : DEFAULT_ATTACK_COOLDOWN_MS),
        }
      : applyEnemyTypeModifiers(type, {
          hp: stats?.hp ?? DEFAULT_HP,
          speed: stats?.speed ?? DEFAULT_SPEED,
          attackDamage: stats?.attackDamage ?? DEFAULT_ATTACK_DAMAGE,
        });

    return new Enemy(
      crypto.randomUUID(),
      x,
      y,
      modified.hp,
      modified.hp,
      modified.speed,
      0,
      0,
      modified.attackDamage,
      stats?.attackCooldown ?? modified.attackCooldown,
      0,
      false,
      type,
      stats?.radius ?? modified.radius,
      [],
      stats?.projectileDamage ?? modified.projectileDamage,
      stats?.color ?? "",
      stats?.rewards ? { ...stats.rewards } : { ...DEFAULT_ENEMY_REWARDS },
    );
  }
}
