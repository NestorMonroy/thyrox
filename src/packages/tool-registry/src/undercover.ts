/**
 * Modo encubierto — lo que se retira al contribuir a un repositorio público.
 *
 * Con el modo activo, el harness añade instrucciones a los avisos de commit y
 * de pull request, y retira toda atribución, para no filtrar el identificador
 * del modelo ni nada que identifique a quien opera. Al modelo no se le dice
 * qué modelo es.
 *
 * Activación:
 *
 *   - `THYROX_UNDERCOVER` declarada → ENCENDIDO a la fuerza, aunque el
 *     repositorio conste interno.
 *   - Si no, AUTOMÁTICO: encendido SALVO que el remoto conste en la lista de
 *     permitidos (ver `commitAttribution`). El default seguro es ENCENDIDO,
 *     porque se puede empujar a un remoto público desde un directorio que ni
 *     siquiera es una copia de trabajo de ese repositorio.
 *   - NO hay fuerza-apagado. Un identificador de modelo filtrado a un
 *     repositorio público no se deshace, así que ante la duda se queda
 *     encubierto.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/undercover.ts` (89 líneas,
 * 3 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así que
 * el cuerpo se **reimplementa** y no se copia.
 *
 * DIVERGENCIA DECLARADA (dos, y las dos por la misma razón):
 *
 * 1. La fuente encierra las tres funciones en `process.env.USER_TYPE === 'ant'`,
 *    una bandera de compilación de SU organización que su empaquetador pliega
 *    a constante para eliminar estas ramas de una compilación externa. Aquí
 *    nadie la declara: portarla dejaría el módulo entero muerto, con tres
 *    funciones que devuelven siempre el valor trivial. La condición que sí
 *    gobierna aquí es la clasificación del repositorio, que ya es un
 *    parámetro del despliegue.
 *
 * 2. El texto de instrucciones de la fuente enumera nombres en clave,
 *    repositorios, canales y enlaces cortos internos de esa organización.
 *    Copiarlos no protege nada —ninguno es nuestro— y metería su dominio en
 *    este árbol (tarea #249). El texto de aquí nombra lo que ESTE árbol
 *    prohíbe, y no se inventa: sale de `.claude/rules/git.md` (el remolque de
 *    identidad del agente) y de `model-selection-subagents.md` (el
 *    identificador de modelo en el cuerpo y el título de un pull request).
 */

import { getRepoClassCached } from '@thyrox/agent/commitAttribution.js'
import { getGlobalConfig } from '@thyrox/config/global/config.js'
import { isEnvTruthy, readEnv } from '@thyrox/config/env/utils'

/** La variable que enciende el modo a la fuerza. No existe la contraria. */
export const UNDERCOVER_ENV = 'THYROX_UNDERCOVER'

export function isUndercover(): boolean {
  if (isEnvTruthy(readEnv(UNDERCOVER_ENV))) return true
  // Automático: activo salvo que conste POSITIVAMENTE que el repositorio está
  // en la lista. `external`, `none` y `null` —la comprobación aún no corrió—
  // resuelven las tres a ENCENDIDO; sólo `internal` lo apaga.
  return getRepoClassCached() !== 'internal'
}

export function getUndercoverInstructions(): string {
  return `## MODO ENCUBIERTO

Se está trabajando en un repositorio PÚBLICO. Ni el mensaje de commit, ni el
título, ni el cuerpo de un pull request pueden llevar nada que identifique al
agente ni al modelo que lo sirve.

NUNCA en un mensaje de commit ni en un pull request:

- El identificador del modelo, ni su versión, ni una pista de cuál es.
- Un remolque de atribución del agente: \`Co-Authored-By\` del agente, o
  cualquier línea que declare la sesión que lo produjo.
- La afirmación de que el cambio lo generó una herramienta automática.

El mensaje describe QUÉ cambia y POR QUÉ, como lo escribiría cualquiera:

BIEN:
- "Fix race condition in file watcher initialization"
- "Add support for custom key bindings"

MAL:
- "Generated with <herramienta>"
- "Co-Authored-By: <agente> <…>"
- "1-shotted by <identificador de modelo>"
`
}

/**
 * ¿Toca mostrar, una sola vez, el aviso de que el modo se activó solo?
 *
 * Verdadero cuando el modo está activo por detección AUTOMÁTICA —no por la
 * variable, porque quien la declaró ya lo sabe— y nadie ha visto el aviso
 * todavía. Es puro: quien lo muestra es quien marca la bandera.
 */
export function shouldShowUndercoverAutoNotice(): boolean {
  if (isEnvTruthy(readEnv(UNDERCOVER_ENV))) return false
  if (!isUndercover()) return false
  if (getGlobalConfig().hasSeenUndercoverAutoNotice) return false
  return true
}
