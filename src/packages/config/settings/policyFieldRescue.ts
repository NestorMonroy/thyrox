/**
 * El rescate de política campo a campo: porte de `os` de `chunk-379zyrv7.js`
 * en el ejecutable 2.1.283 (extracción en
 * `.claude/workbench/policy-settings-port-20260927T083804/`, ampliada con
 * `hn`, `Zo`, `ts`, `Ho` y `Ed` del mismo chunk).
 *
 * `SettingsSchema().safeParse(documento)` valida el documento ENTERO de una
 * vez: un solo campo inválido (`maxTurns: "nope"`) tira el documento
 * completo, incluidos los campos válidos que traía al lado. `os` en 2.1.283
 * no hace eso — valida cada campo por separado, y un campo roto no arrastra
 * a los demás. Este módulo es ese mismo criterio, campo a campo sobre
 * `SettingsSchema().shape`:
 *
 * - un campo sin puerta que no valida se DESCARTA (se ignora, con su aviso);
 * - un campo con puerta (`restrictiveGates`, porte de `Zo`) que no valida se
 *   SUSTITUYE por su valor restrictivo, marcado `substituted: true`;
 * - una puerta de tipo `"disable"` (el sustituto de `Ho` para las claves cuyo
 *   único valor legible es "restringir") trata un `false` válido como un
 *   no-op — nadie escribe `false` para no hacer nada — y lo retira con
 *   `removed: true`, sugiriendo borrar la clave en vez de escribirla.
 *
 * `isPolicyNoOp` es el porte reducido de `Ed`: decide si una clave con un
 * valor dado cuenta como intento de escribir política. Su forma completa
 * (`Ed`/`Sn`/`kd`) recorre rutas anidadas con un resolutor de rutas del
 * esquema (`gn`) que esta extracción no incluye, y cubre alias de claves de
 * mercados de plugins (`dt`: `additionalMarketplaces`→`extraKnownMarketplaces`,
 * `allowedMarketplaces`→`strictKnownMarketplaces`) que hoy son *diferidas* en
 * `inventory.ts` — no están en `SettingsSchema`. Por eso esta versión sólo
 * decide sobre claves de nivel superior, con la tabla de puertas de arriba:
 * cualquier ruta anidada cuenta siempre como escritura de política si no es
 * `null`, y los alias de mercados no se reconocen. pendiente: cuando exista
 * `gn`/las claves de mercados dejen de ser diferidas.
 *
 * Símbolos de `symbol-UP-level3.txt` que este pase NO porta, y por qué:
 * - `tm` — `structuredClone` con trazado; utilidad genérica sin relación con
 *   el rescate, y sin infraestructura de trazado en este puerto.
 * - `At` — agrega nueve validadores de entradas de servidor MCP
 *   (`policySource`, `mcpServerEntrySalvageOnly`, mapa de patrones de
 *   mercado); ninguno de esos nueve símbolos está en la extracción, y el
 *   concepto no existe en nuestro `SettingsSchema`.
 * - `Od` — arma el callback `(issue) => void` que este módulo reemplaza por
 *   construir el arreglo de avisos directamente; filtra `MRe` (aviso de
 *   servidores MCP retenidos de una sesión remota) y registra por un logger
 *   `t` que este paquete no tiene — ninguno de los dos existe aquí.
 * - `kt` — aplana `ZodError` con desdoblado especial de la unión
 *   `attribution` y un motor de sugerencias (`sd`) no extraído; el archivo ya
 *   usa `formatZodError` para los errores de documento completo (JSON roto,
 *   no-objeto), y el rescate por campo no necesita desdoblar una unión que
 *   este esquema no declara.
 * - `fz` — cachea por archivo con una variante "pinned"; `readPolicyDocument`
 *   ya cachea por documento y archivo sin esa variante, que no existe en
 *   `PolicyFiles`.
 * - `V2o`, `BUt` — ya portados verbatim como `isFragment`/`unreadable` en
 *   `policySources.ts`.
 * - `le`, `lgn`, `Ka`, `Ta` — la caché de sesión de la capa remota y su
 *   elegibilidad por host; el propio encabezado de `policySources.ts` ya
 *   declara que esa sesión remota no se modela aquí.
 * - `ls`, `Cne`, `fa` — el mapa `policyHelpers` por sistema operativo (2.1.283).
 *   Este paquete sólo porta el `policyHelper` singular de 2.1.136
 *   (`policyHelper.ts`); el mapa por SO es una fase siguiente, no de este ítem.
 * - `Bt` — trunca una cadena para mostrarla; ningún mensaje de este módulo
 *   incrusta texto sin cota del usuario que necesite truncarse hoy.
 */
import { z } from 'zod'
import { RESTRICTIVE_SETTINGS } from './policyMerge.ts'
import { SettingsSchema } from './types.ts'

/** `Zo`: una puerta de nivel superior con su valor restrictivo. */
export type RestrictiveGate = { key: string; restrictive: boolean | string }

/** Un aviso del rescate de un campo. */
export type RescueIssue = { path: string; message: string; substituted?: boolean; removed?: boolean }

export type RescuedField = { value: unknown; issue?: RescueIssue }

export type RescueResult = { settings: Record<string, unknown>; issues: RescueIssue[] }

/**
 * `Zo`: filtra `RESTRICTIVE_SETTINGS` (el porte ya existente de `Qe`, en
 * `policyMerge.ts`) igual que el binario — sólo rutas de un solo nivel, sin
 * las dos claves que 2.1.283 gestiona aparte (`strictPluginOnlyCustomization`,
 * `disableAllHooks`), y sólo las presentes en `SettingsSchema`. Se deriva de
 * `RESTRICTIVE_SETTINGS` en vez de declarar una segunda tabla: dos tablas de
 * la misma información divergen solas.
 */
const SEPARATELY_HANDLED = new Set(['strictPluginOnlyCustomization', 'disableAllHooks'])

export function restrictiveGates(): readonly RestrictiveGate[] {
  const shape = SettingsSchema().shape as Record<string, unknown>
  return RESTRICTIVE_SETTINGS
    .filter(entry => entry.path.length === 1
      && !SEPARATELY_HANDLED.has(entry.path[0]!)
      && (typeof entry.restrictive === 'boolean' || typeof entry.restrictive === 'string')
      && shape[entry.path[0]!] !== undefined)
    .map(entry => ({ key: entry.path[0]!, restrictive: entry.restrictive as boolean | string }))
}

const DEFAULT_GATES = restrictiveGates()

function gateFor(key: string, gates: readonly RestrictiveGate[]): RestrictiveGate | undefined {
  return gates.find(gate => gate.key === key)
}

/**
 * El valor que sustituye a una puerta inválida. Una puerta `"disable"` no
 * tiene tercer estado en nuestro esquema (los campos son `z.boolean()`
 * llanos): se sustituye con `true`, el booleano más restrictivo — no con la
 * cadena `"disable"` que el binario asigna, que violaría el tipo de la
 * propia clave.
 */
function restrictiveSubstitute(gate: RestrictiveGate): boolean | string {
  return gate.restrictive === 'disable' ? true : gate.restrictive
}

/** `ta`: un `false` exacto. */
function isFalse(value: unknown): value is false {
  return value === false
}

/**
 * `Ho`, reducida a lo que aplica sin la coerción de cadena a booleano
 * (`Bx`, no extraída): una puerta `"disable"` con un `false` válido es un
 * no-op — su único valor legible es la restricción — y se lee como ausente.
 */
function rescueDisableNoOp(key: string, rawValue: unknown, gate: RestrictiveGate | undefined): RescuedField | undefined {
  if (gate?.restrictive !== 'disable' || !isFalse(rawValue)) return undefined
  return {
    value: undefined,
    issue: {
      path: key,
      message: `"${key}" was set to false; reading it as absent (the key's only value is "disable"). Remove the key instead.`,
      removed: true,
    },
  }
}

/**
 * `os` (un campo): valida `rawValue` con su propio esquema; si no valida y
 * la clave tiene puerta, sustituye por el valor restrictivo (`substituted:
 * true`); si no tiene puerta, la descarta con su aviso.
 */
export function rescueField(
  key: string,
  rawValue: unknown,
  schema: z.ZodType,
  gates: readonly RestrictiveGate[] = DEFAULT_GATES,
): RescuedField {
  const gate = gateFor(key, gates)
  const noOp = rescueDisableNoOp(key, rawValue, gate)
  if (noOp) return noOp

  const parsed = schema.safeParse(rawValue)
  if (parsed.success) return { value: parsed.data }

  if (gate !== undefined) {
    const substitute = restrictiveSubstitute(gate)
    return {
      value: substitute,
      issue: {
        path: key,
        message: `"${key}" was present but invalid; treating it as ${String(substitute)} (its restrictive value) until it is fixed.`,
        substituted: true,
      },
    }
  }

  const firstIssue = parsed.error.issues[0]?.message ?? 'Failed schema validation'
  return { value: undefined, issue: { path: key, message: `${firstIssue}. This field was ignored.` } }
}

/**
 * `os` (el documento): rescata cada clave declarada en `SettingsSchema` por
 * separado; una clave que el esquema no declara pasa sin tocar, como el
 * `.passthrough()` de la propia validación en un solo paso ya hacía.
 */
export function rescuePolicyDocument(
  document: Record<string, unknown>,
  gates: readonly RestrictiveGate[] = DEFAULT_GATES,
): RescueResult {
  const shape = SettingsSchema().shape as Record<string, z.ZodType>
  const issues: RescueIssue[] = []
  const settings: Record<string, unknown> = {}
  for (const [key, rawValue] of Object.entries(document)) {
    const fieldSchema = shape[key]
    if (fieldSchema === undefined) {
      settings[key] = rawValue
      continue
    }
    const { value, issue } = rescueField(key, rawValue, fieldSchema, gates)
    if (issue) issues.push(issue)
    if (value !== undefined) settings[key] = value
  }
  return { settings, issues }
}

/**
 * `Ed`, reducida a claves de nivel superior (ver el pendiente en el
 * encabezado): decide si `key`/`value` cuenta como un intento de escribir
 * política. `null` nunca cuenta — es limpiar la clave, no fijarla — y un
 * `false` en una puerta `"disable"` tampoco, por la misma razón de no-op que
 * `rescueDisableNoOp` aplica al rescatar el campo.
 */
export function isPolicyNoOp(key: string, value: unknown, gates: readonly RestrictiveGate[] = DEFAULT_GATES): boolean {
  if (value === null) return true
  const gate = gateFor(key, gates)
  return gate?.restrictive === 'disable' && isFalse(value)
}
