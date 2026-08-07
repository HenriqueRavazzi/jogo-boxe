/** Entidade inimigo — atributos, chase, melee, status e desenho. */

const EDGE_MARGIN = 24;
const DEFAULT_HP = 30;
const DEFAULT_SPEED = 55;
/** Dano melee por tick (baixa, periódica). */
export const DEFAULT_ATTACK_DAMAGE = 1.2;
/** Intervalo entre golpes melee (ms de game clock). */
export const DEFAULT_ATTACK_COOLDOWN_MS = 1000;
const FRICTION = 0.8;

export type EnemyType = "normal" | "dasher" | "boss";
export type StatusEffectType = "freeze" | "shock";

export type StatusEffect = {
  type: StatusEffectType;
  expiresAt: number;
};

export const ENEMY_RADIUS: Record<EnemyType, number> = {
  normal: 12,
  dasher: 8,
  boss: 36,
};

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
  /** Cooldown entre golpes melee (ms). */
  attackCooldown: number;
  /** Último golpe melee (ms do game clock). */
  lastAttackTime: number;
  /** Encoded no jogador e atacando. */
  isAttacking: boolean;
  type: EnemyType;
  radius: number;
  statusEffects: StatusEffect[];
};

export type EnemySpawnStats = {
  hp: number;
  speed: number;
  attackDamage: number;
  attackCooldown?: number;
  type?: EnemyType;
};

/** Aplica modificadores de tipo sobre stats base (snapshot do spawn). */
export function applyEnemyTypeModifiers(
  type: EnemyType,
  base: { hp: number; speed: number; attackDamage: number },
): { hp: number; speed: number; attackDamage: number; radius: number } {
  switch (type) {
    case "dasher":
      return {
        hp: Math.max(1, Math.round(base.hp * 0.5)),
        speed: base.speed * 2,
        attackDamage: base.attackDamage,
        radius: ENEMY_RADIUS.dasher,
      };
    case "boss":
      return {
        hp: Math.round(base.hp * 20),
        speed: base.speed * 0.5,
        attackDamage: Number((base.attackDamage * 2).toFixed(2)),
        radius: ENEMY_RADIUS.boss,
      };
    default:
      return {
        hp: base.hp,
        speed: base.speed,
        attackDamage: base.attackDamage,
        radius: ENEMY_RADIUS.normal,
      };
  }
}

export class Enemy {
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
  ) {}

  static fromData(data: EnemyData): Enemy {
    const type = data.type ?? "normal";
    const attackDamage =
      data.attackDamage ??
      (data as { contactDamage?: number }).contactDamage ??
      DEFAULT_ATTACK_DAMAGE;
    return new Enemy(
      data.id,
      data.x,
      data.y,
      data.hp,
      data.maxHp,
      data.speed,
      data.vx ?? 0,
      data.vy ?? 0,
      attackDamage,
      data.attackCooldown ?? DEFAULT_ATTACK_COOLDOWN_MS,
      data.lastAttackTime ?? 0,
      data.isAttacking ?? false,
      type,
      data.radius ?? ENEMY_RADIUS[type],
      data.statusEffects ?? [],
    );
  }

  pruneStatusEffects(now: number): void {
    this.statusEffects = this.statusEffects.filter((s) => s.expiresAt > now);
  }

  hasStatus(type: StatusEffectType, now: number): boolean {
    return this.statusEffects.some(
      (s) => s.type === type && s.expiresAt > now,
    );
  }

  /** Aplica ou renova um status (mantém a expiração mais longa). */
  applyStatus(type: StatusEffectType, expiresAt: number): void {
    const existing = this.statusEffects.find((s) => s.type === type);
    if (existing) {
      existing.expiresAt = Math.max(existing.expiresAt, expiresAt);
      return;
    }
    this.statusEffects.push({ type, expiresAt });
  }

  /**
   * Chase + knockback. Congelado ou em melee (encostado): não avança.
   */
  moveToward(
    playerX: number,
    playerY: number,
    dt: number,
    now: number,
    playerRadius = 18,
  ): void {
    this.pruneStatusEffects(now);

    if (this.hasStatus("freeze", now)) {
      this.vx = 0;
      this.vy = 0;
      this.isAttacking = false;
      return;
    }

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const touchDist = this.radius + playerRadius;

    // Encostou: para e marca melee (dano é processado no CombatSystem)
    if (dist <= touchDist) {
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

    const step = this.speed * dt;
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;

    this.x += this.vx;
    this.y += this.vy;
    this.vx *= FRICTION;
    this.vy *= FRICTION;

    if (Math.abs(this.vx) < 0.05) this.vx = 0;
    if (Math.abs(this.vy) < 0.05) this.vy = 0;
  }

  applyKnockback(dirX: number, dirY: number, impulse: number): void {
    const len = Math.hypot(dirX, dirY) || 1;
    const scale = this.type === "boss" ? 0.35 : this.type === "dasher" ? 1.2 : 1;
    this.vx += (dirX / len) * impulse * scale;
    this.vy += (dirY / len) * impulse * scale;
    this.isAttacking = false;
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
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
      type: this.type,
      radius: this.radius,
      statusEffects: this.statusEffects.map((s) => ({ ...s })),
    };
  }

  /**
   * Desenha o inimigo + overlays de status (gelo / raio / melee).
   */
  draw(ctx: CanvasRenderingContext2D, now: number): void {
    this.pruneStatusEffects(now);
    const hpPercent = Math.max(0, Math.min(1, this.hp / this.maxHp));
    const frozen = this.hasStatus("freeze", now);
    const shocked = this.hasStatus("shock", now);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

    if (this.type === "boss") {
      ctx.fillStyle = frozen ? "#5b21b6" : "#7e22ce";
      ctx.fill();
      ctx.strokeStyle = frozen ? "#bae6fd" : "#e9d5ff";
      ctx.lineWidth = 4;
      ctx.stroke();
    } else if (this.type === "dasher") {
      if (frozen) {
        ctx.fillStyle = `rgb(${Math.floor(100 + 80 * hpPercent)}, ${Math.floor(160 + 60 * hpPercent)}, ${Math.floor(220 + 35 * hpPercent)})`;
      } else {
        const orange = Math.floor(180 + 75 * hpPercent);
        ctx.fillStyle = `rgb(${orange}, ${Math.floor(90 * hpPercent)}, 20)`;
      }
      ctx.fill();
    } else if (frozen) {
      const blue = Math.floor(160 + 95 * hpPercent);
      ctx.fillStyle = `rgb(${Math.floor(60 * hpPercent)}, ${Math.floor(140 + 80 * hpPercent)}, ${blue})`;
      ctx.fill();
    } else {
      const red = Math.floor(255 * hpPercent);
      ctx.fillStyle = `rgb(${red}, 0, 0)`;
      ctx.fill();
    }

    if (this.isAttacking && !frozen) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(248, 113, 113, 0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (frozen) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(186, 230, 253, 0.95)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    if (shocked) {
      ctx.save();
      ctx.strokeStyle = "rgba(250, 204, 21, 0.9)";
      ctx.lineWidth = 1.5;
      const sparks = 5;
      for (let i = 0; i < sparks; i++) {
        const angle = (Math.PI * 2 * i) / sparks + now * 0.012;
        const inner = this.radius * 0.55;
        const outer = this.radius + 6 + (i % 2) * 3;
        ctx.beginPath();
        ctx.moveTo(
          this.x + Math.cos(angle) * inner,
          this.y + Math.sin(angle) * inner,
        );
        ctx.lineTo(
          this.x + Math.cos(angle + 0.25) * outer,
          this.y + Math.sin(angle + 0.25) * outer,
        );
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(253, 224, 71, 0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();
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
    const modified = applyEnemyTypeModifiers(type, {
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
      stats?.attackCooldown ?? DEFAULT_ATTACK_COOLDOWN_MS,
      0,
      false,
      type,
      modified.radius,
      [],
    );
  }
}
