/** Entidade do jogador — atributos e recebimento de dano. */

export type ArmSide = "left" | "right";

export type ArmDistribution = {
  leftArms: number;
  rightArms: number;
};

/** Distribui braços de forma assimétrica: maioria na esquerda. */
export function getArmDistribution(totalArms: number): ArmDistribution {
  const n = Math.max(0, Math.floor(totalArms));
  return {
    leftArms: Math.ceil(n / 2),
    rightArms: Math.floor(n / 2),
  };
}

/**
 * O sprite local olha para cima (−Y). Converte ângulo de facing (atan2)
 * para rotação de canvas.
 */
export function facingToCanvasRotation(facingRadians: number): number {
  return facingRadians + Math.PI / 2;
}

/** Rotaciona um offset local pelo ângulo de canvas. */
export function rotateLocalOffset(
  localX: number,
  localY: number,
  canvasRotation: number,
): { x: number; y: number } {
  const c = Math.cos(canvasRotation);
  const s = Math.sin(canvasRotation);
  return {
    x: localX * c - localY * s,
    y: localX * s + localY * c,
  };
}

/**
 * Posição de repouso da luva relativa ao centro do player.
 * `facingRadians` = atan2 para o alvo (0 = direita); default −π/2 = olhar para cima.
 */
export function getArmRestPosition(
  playerX: number,
  playerY: number,
  side: ArmSide,
  armIndex: number,
  armsOnSide: number,
  facingRadians = -Math.PI / 2,
): { x: number; y: number } {
  const spread = 14;
  const offsetY = (armIndex - (armsOnSide - 1) / 2) * spread;
  const localX = side === "left" ? -26 : 26;
  const localY = 2 + offsetY;
  const rotated = rotateLocalOffset(
    localX,
    localY,
    facingToCanvasRotation(facingRadians),
  );
  return { x: playerX + rotated.x, y: playerY + rotated.y };
}

/** Ângulo (radianos) do jogador em direção a um ponto. */
export function angleToward(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): number {
  return Math.atan2(toY - fromY, toX - fromX);
}

/** Ordem de soco: L0, R0, L1, R1, … */
export function getArmPunchOrder(totalArms: number): {
  side: ArmSide;
  armIndex: number;
}[] {
  const { leftArms, rightArms } = getArmDistribution(totalArms);
  const order: { side: ArmSide; armIndex: number }[] = [];
  const max = Math.max(leftArms, rightArms);
  for (let i = 0; i < max; i++) {
    if (i < leftArms) order.push({ side: "left", armIndex: i });
    if (i < rightArms) order.push({ side: "right", armIndex: i });
  }
  return order;
}

/**
 * Alterna o lado do soco a partir do último.
 * Respeita distribuição (ex.: 1 braço = só esquerda).
 */
export function pickNextPunchSide(
  lastPunchSide: ArmSide,
  leftArms: number,
  rightArms: number,
): ArmSide {
  const prefer: ArmSide = lastPunchSide === "right" ? "left" : "right";
  if (prefer === "left" && leftArms > 0) return "left";
  if (prefer === "right" && rightArms > 0) return "right";
  if (leftArms > 0) return "left";
  return "right";
}

export class Player {
  constructor(
    public x: number,
    public y: number,
    public hp: number,
    public maxHp: number,
    public radius: number = 18,
    /** Facing em radianos (atan2); −π/2 = cima. */
    public rotation: number = -Math.PI / 2,
  ) {}

  /** Aplica dano e retorna o HP restante. */
  takeDamage(amount: number): number {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp;
  }

  /** Cura sem ultrapassar maxHp; retorna o HP restante. */
  heal(amount: number): number {
    if (amount <= 0 || this.isDead) return this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp;
  }

  get isDead(): boolean {
    return this.hp <= 0;
  }

  faceToward(targetX: number, targetY: number): void {
    this.rotation = angleToward(this.x, this.y, targetX, targetY);
  }
}
