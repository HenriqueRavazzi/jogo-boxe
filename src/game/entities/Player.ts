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
 * Posição de repouso da luva relativa ao centro do player.
 * Vários braços no mesmo lado empilham verticalmente.
 */
export function getArmRestPosition(
  playerX: number,
  playerY: number,
  side: ArmSide,
  armIndex: number,
  armsOnSide: number,
): { x: number; y: number } {
  const baseX = side === "left" ? playerX - 26 : playerX + 26;
  const baseY = playerY + 2;
  const spread = 14;
  const offsetY = (armIndex - (armsOnSide - 1) / 2) * spread;
  return { x: baseX, y: baseY + offsetY };
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
  ) {}

  /** Aplica dano e retorna o HP restante. */
  takeDamage(amount: number): number {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp;
  }

  get isDead(): boolean {
    return this.hp <= 0;
  }
}
