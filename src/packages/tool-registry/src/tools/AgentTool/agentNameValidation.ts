import { z } from 'zod/v4'

// Porte de `sLo`, `Hm`, `PP` y del campo `name` de `co` (2.1.283,
// chunk-q8a07cv0.js / chunk-5mcqvwzx.js / chunk-f48jtvyp.js). TASK-THYROX-0637.

/** `sLo`: letra o digito inicial, luego letras, digitos, `_` o `-`; maximo 64. */
export const TEAMMATE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/

/** `Hm`: SendMessage enruta este nombre a la conversacion principal. */
export const MAIN_AGENT_NAME = 'main'

// `gi`, `wye`, `fYe`: los otros tres nombres reservados.
const TEAM_LEAD_NAME = 'team-lead'
const USER_NAME = 'user'
const SYSTEM_NAME = 'system'

// `ok` (chunk-s1pmhfks.js): forma de un agent id, `a[<prefijo>-]<16 hex>`,
// donde el prefijo es `r` = `[\w-]{1,63}`.
const AGENT_ID_PATTERN = /^a(?:[\w-]{1,63}-)?[0-9a-f]{16}$/

/** `Cr`: normalizacion NFKC, sin caracteres de control/formato, minusculas. */
function normalizeName(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}]/gu, char => (/\s/.test(char) ? char : ''))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

/** `PP`: nombre reservado en cualquier grafia, o con la forma de un agent id. */
export function isReservedAgentName(name: string): boolean {
  const normalized = normalizeName(name)
  return (
    normalized === MAIN_AGENT_NAME ||
    normalized === TEAM_LEAD_NAME ||
    normalized === USER_NAME ||
    normalized === SYSTEM_NAME ||
    AGENT_ID_PATTERN.test(normalized)
  )
}

/** Campo `name` del schema de la herramienta, con los tres mensajes del binario. */
export function agentNameSchema() {
  return z
    .string()
    .regex(TEAMMATE_NAME_PATTERN, {
      message:
        'name must start with a letter or digit and contain only letters, digits, underscores, or hyphens (max 64 chars)',
    })
    .refine(name => name !== MAIN_AGENT_NAME, {
      message: `"${MAIN_AGENT_NAME}" is reserved — SendMessage routes it to the main conversation`,
    })
    .refine(name => !isReservedAgentName(name), {
      message:
        'name must not be a reserved name ("main", "team-lead", "user" or ' +
        '"system", in any spelling) or have the shape of an agent id — ' +
        'those already address an agent directly',
    })
}
