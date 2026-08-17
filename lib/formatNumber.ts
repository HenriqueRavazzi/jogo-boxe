/** Formatação compacta para HUD: 1k, 10M, 1B, 1aa, 1ab… Cálculos continuam com o número bruto. */

const NAMED_SUFFIXES = ["", "k", "M", "B", "T"] as const;

function letterSuffix(index: number): string {
  if (index < 676) {
    const first = Math.floor(index / 26);
    const second = index % 26;
    return String.fromCharCode(97 + first) + String.fromCharCode(97 + second);
  }
  const i = index - 676;
  const first = Math.floor(i / 676);
  const second = Math.floor((i % 676) / 26);
  const third = i % 26;
  return (
    String.fromCharCode(97 + first) +
    String.fromCharCode(97 + second) +
    String.fromCharCode(97 + third)
  );
}

function suffixForTier(tier: number): string {
  if (tier < NAMED_SUFFIXES.length) return NAMED_SUFFIXES[tier];
  return letterSuffix(tier - NAMED_SUFFIXES.length);
}

function formatMantissa(mantissa: number, decimals: number): string {
  return mantissa.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Exibe magnitudes em degraus de 1 / 10 / 100 com sufixo:
 * 1k, 10k, 100k, 1M … 1T, 1aa, 10aa, 100aa, 1ab…
 */
export function formatSciNumber(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs < 1000) {
    return `${sign}${Math.round(abs).toLocaleString("pt-BR")}`;
  }

  const [coeff, expStr] = abs.toExponential(10).split("e");
  const exp = Number(expStr);
  let tier = Math.floor(exp / 3);
  let mantissa = Number(coeff) * 10 ** (exp - tier * 3);

  let decimals = mantissa < 10 ? 2 : mantissa < 100 ? 1 : 0;
  let rounded = Number(mantissa.toFixed(decimals));
  if (rounded >= 1000) {
    tier += 1;
    mantissa = rounded / 1000;
    decimals = mantissa < 10 ? 2 : mantissa < 100 ? 1 : 0;
    rounded = Number(mantissa.toFixed(decimals));
  }

  return `${sign}${formatMantissa(rounded, decimals)}${suffixForTier(tier)}`;
}
