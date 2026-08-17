/** Formatação compacta de números grandes (ex.: 6,93×10⁸⁹). */

const SUPER_DIGITS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
};

function toSuperscript(n: number): string {
  return String(n)
    .split("")
    .map((ch) => SUPER_DIGITS[ch] ?? ch)
    .join("");
}

/** Abaixo disso, mostra o número normal em pt-BR. */
export const SCI_NOTATION_THRESHOLD = 10_000_000;

/**
 * Números grandes em notação científica pt-BR: `6,93×10⁸⁹`.
 * Valores menores que 10.000.000 continuam com separador de milhar.
 */
export function formatSciNumber(
  value: number,
  threshold = SCI_NOTATION_THRESHOLD,
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs < threshold) {
    return `${sign}${Math.round(abs).toLocaleString("pt-BR")}`;
  }
  const [rawMant, rawExp] = abs.toExponential(2).split("e");
  const mantissa = Number(rawMant);
  const exp = Number(rawExp);
  const mantStr = mantissa.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${mantStr}×10${toSuperscript(exp)}`;
}
