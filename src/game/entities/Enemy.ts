/** Entidade inimigo — atributos, chase, knockback e dano. */

const EDGE_MARGIN = 24;
const DEFAULT_HP = 30;
const DEFAULT_SPEED = 55;
const DEFAULT_CONTACT_DAMAGE = 20;
const FRICTION = 0.8;

export type EnemyData = {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  vx: number;
  vy: number;
  /** Dano causado ao encostar no jogador. */
  contactDamage: number;
};

export type EnemySpawnStats = {
  hp: number;
  speed: number;
  contactDamage: number;
};

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
    public contactDamage: number = DEFAULT_CONTACT_DAMAGE,
    public radius: number = 12,
  ) {}

  static fromData(data: EnemyData, radius = 12): Enemy {
    return new Enemy(
      data.id,
      data.x,
      data.y,
      data.hp,
      data.maxHp,
      data.speed,
      data.vx ?? 0,
      data.vy ?? 0,
      data.contactDamage ?? DEFAULT_CONTACT_DAMAGE,
      radius,
    );
  }

  /**
   * Chase + knockback: soma impulso (vx/vy), depois atrito 0.8.
   */
  moveToward(playerX: number, playerY: number, dt: number): void {
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
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
    this.vx += (dirX / len) * impulse;
    this.vy += (dirY / len) * impulse;
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
      contactDamage: this.contactDamage,
    };
  }

  /** Spawna em uma borda aleatória, com stats opcionais (scaling). */
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

    const hp = stats?.hp ?? DEFAULT_HP;
    const speed = stats?.speed ?? DEFAULT_SPEED;
    const contactDamage = stats?.contactDamage ?? DEFAULT_CONTACT_DAMAGE;

    return new Enemy(
      crypto.randomUUID(),
      x,
      y,
      hp,
      hp,
      speed,
      0,
      0,
      contactDamage,
    );
  }
}
