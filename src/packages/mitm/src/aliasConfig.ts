/**
 * Normalización de los alias del MITM: por alias, un modelo al que remapear
 * y, opcionalmente, un esfuerzo de razonamiento que imponer.
 *
 * Una entrada guardada es una cadena heredada —`"proveedor/modelo"`, sólo
 * remapeo— o un objeto `{ model?, reasoningEffort? }`. `normalizeAliasMappings`
 * convierte la forma heredada al leer, así que no hace falta migrar lo
 * guardado.
 *
 * El vocabulario del esfuerzo es el de sesión de `@thyrox/agent/effort.js`
 * (none, low, medium, high, xhigh, max), no uno propio. OmniRoute añade el
 * sinónimo `extra` de su interfaz, que equivale a `xhigh`.
 *
 * Porte de `omniroute: src/mitm/aliasConfig.ts` (MIT).
 */
import { type EffortLevel, isEffortLevel } from '@thyrox/agent/effort.js'

export interface MitmAliasEntry {
  model?: string
  reasoningEffort?: EffortLevel
}

export type MitmAliasMappings = Record<string, MitmAliasEntry>

const EFFORT_SYNONYMS: Record<string, EffortLevel> = { extra: 'xhigh' }

/** El nivel de esfuerzo que nombra `value`, sin distinguir mayúsculas, o `undefined`. */
export function normalizeReasoningEffort(value: unknown): EffortLevel | undefined {
  if (typeof value !== 'string') return undefined
  const lowered = value.trim().toLowerCase()
  if (!lowered) return undefined
  const synonym = EFFORT_SYNONYMS[lowered]
  if (synonym) return synonym
  return isEffortLevel(lowered) ? lowered : undefined
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Una entrada guardada en su forma canónica, o `null` si no aporta ni modelo
 * ni un esfuerzo válido y debe descartarse.
 */
export function normalizeAliasEntry(value: unknown): MitmAliasEntry | null {
  if (typeof value === 'string') {
    const model = value.trim()
    return model ? { model } : null
  }
  if (!isPlainObject(value)) return null
  const model = typeof value.model === 'string' ? value.model.trim() : ''
  const reasoningEffort = normalizeReasoningEffort(value.reasoningEffort)
  if (!model && !reasoningEffort) return null
  return {
    ...(model ? { model } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
  }
}

/** Todo el registro alias → entrada, normalizado; siempre un objeto, aunque la entrada esté mal formada. */
export function normalizeAliasMappings(mappings: unknown): MitmAliasMappings {
  if (!isPlainObject(mappings)) return {}
  const normalized: MitmAliasMappings = {}
  for (const [alias, value] of Object.entries(mappings)) {
    if (!alias) continue
    const entry = normalizeAliasEntry(value)
    if (entry) normalized[alias] = entry
  }
  return normalized
}

/**
 * Verdadero si alguna entrada trae un `reasoningEffort` que no se normaliza:
 * quien guarda los alias lo rechaza en vez de descartar el esfuerzo en
 * silencio.
 */
export function hasInvalidReasoningEffort(mappings: unknown): boolean {
  if (!isPlainObject(mappings)) return false
  return Object.values(mappings).some(value => {
    if (!isPlainObject(value)) return false
    const raw = value.reasoningEffort
    if (raw == null || raw === '') return false
    return normalizeReasoningEffort(raw) === undefined
  })
}

/**
 * Aplica un alias al cuerpo crudo (todavía en forma cloudcode) que el
 * servidor reenvía: cambia `model` si el alias lo trae y fija
 * `reasoningEffortOverride` al mismo nivel que `model`, que es donde lo lee
 * el traductor antigravity→openai. Devuelve una copia superficial.
 *
 * Porte de `applyAntigravityOverride` de
 * `omniroute: src/mitm/_internal/aliasConfig.cjs` (MIT).
 */
export function applyAntigravityOverride<T extends Record<string, unknown>>(
  body: T,
  override: MitmAliasEntry | null | undefined,
): T & { model?: unknown; reasoningEffortOverride?: EffortLevel } {
  const result: T & { model?: unknown; reasoningEffortOverride?: EffortLevel } = { ...body }
  if (override?.model) result.model = override.model
  if (override?.reasoningEffort) result.reasoningEffortOverride = override.reasoningEffort
  return result
}
