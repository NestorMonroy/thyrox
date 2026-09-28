/**
 * Un número positivo leído de una variable de entorno: ausente, no numérico,
 * cero o negativo cae al valor por defecto.
 */
export function parseEnvNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
