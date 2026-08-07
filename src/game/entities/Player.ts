/** Entidade do jogador — atributos e recebimento de dano. */

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
