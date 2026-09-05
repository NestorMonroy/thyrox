/**
 * Puerta de permisos (T-008, T-025, T-026, T-027).
 *
 * Tres capas, y el orden entre ellas es lo que decide:
 *
 * 1. **Confinamiento de rutas** — una ruta fuera de los directorios
 *    declarados se deniega antes de mirar nada más. Va primera porque una
 *    regla `allow` no debe poder sacar al agente del árbol.
 * 2. **Reglas por patrón** — `Bash(git push:*)`, `Read(src/**)`. `deny` gana
 *    sobre `allow` aunque las dos casen: en una puerta, la negativa manda.
 * 3. **Capacidad** — `read`/`write`/`execute`, con el modo por encima.
 *
 * Y siempre se devuelve **qué regla decidió**. Un `deny` sin regla nombrada es
 * inexplicable para quien lo recibe, y lo recibe un modelo que no puede
 * preguntar.
 */
import { isAbsolute, relative, resolve } from 'node:path'

export type Decision = 'allow' | 'ask' | 'deny'
export type Capability = 'read' | 'write' | 'execute'
export type Mode = 'default' | 'acceptEdits' | 'bypass'

export type PermissionPolicy = {
  defaultMode?: Mode
  read?: Decision
  write?: Decision
  execute?: Decision
  default?: Decision
  allow?: string[]
  deny?: string[]
  additionalDirectories?: string[]
}

export type Verdict = { decision: Decision; rule?: string; reason?: string }

/**
 * La decisión por capacidad, con el modo por encima.
 *
 * `acceptEdits` sólo alcanza a la escritura — es su sentido: aceptar ediciones
 * sin preguntar, no ejecutar comandos sin preguntar. `bypass` alcanza a todo,
 * incluso a lo denegado, porque para eso existe.
 */
export function decide(policy: PermissionPolicy | undefined, capability: Capability, interactive = false): Decision {
  const modo = policy?.defaultMode ?? 'default'
  if (modo === 'bypass') return 'allow'
  const p = policy?.[capability] ?? policy?.default ?? 'allow'
  if (modo === 'acceptEdits' && capability === 'write') return 'allow'
  if (p === 'ask' && !interactive) return 'deny'
  return p
}

/** `Bash(git push:*)` da herramienta `Bash` y patrón `git push:*`. */
function partirRegla(rule: string): { tool: string; pattern?: string } {
  const m = /^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/.exec(rule)
  return m ? { tool: m[1], pattern: m[2] } : { tool: rule }
}

/** El argumento sobre el que casa el patrón: el comando o la ruta, según la herramienta. */
function objetivo(input: Record<string, unknown>): string {
  for (const clave of ['command', 'file_path', 'path', 'pattern', 'url']) {
    const v = input[clave]
    if (typeof v === 'string') return v
  }
  return ''
}

function globARegExp(patron: string): RegExp {
  // `**` cruza separadores; `*` no. Se traduce partiendo por `**` en vez de
  // usar un marcador intermedio: un marcador que aparezca en el patrón —o que
  // sea un byte de control, como ocurrió aquí— produce una regla que no casa
  // nada y no lo dice.
  const escapar = (s: string) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const cuerpo = patron
    .split('**')
    .map((tramo) => escapar(tramo).replace(/\*/g, '[^/]*'))
    .join('.*')
  return new RegExp(`^${cuerpo}$`)
}

/**
 * ¿Esta regla casa esta llamada?
 *
 * `git push:*` es la forma del cliente para «el comando empieza por `git
 * push`»; los dos puntos separan el prefijo del comodín. Un patrón sin esa
 * forma se trata como glob, que es lo que sirve para rutas.
 */
export function matchesRule(rule: string, toolName: string, input: Record<string, unknown>): boolean {
  const { tool, pattern } = partirRegla(rule)
  if (tool !== toolName) return false
  if (pattern === undefined || pattern === '*') return true
  const valor = objetivo(input)
  const prefijo = /^(.*):\*$/.exec(pattern)
  if (prefijo) return valor === prefijo[1] || valor.startsWith(prefijo[1])
  return globARegExp(pattern).test(valor)
}

/** ¿La ruta cae dentro de alguno de los directorios declarados? Se resuelve antes de comparar. */
export function confinedTo(path: string, directories: string[]): boolean {
  if (directories.length === 0) return true
  const absoluta = resolve(path)
  return directories.some((d) => {
    const raiz = resolve(d)
    const rel = relative(raiz, absoluta)
    // fuera si sube (`..`) o si es otra rama absoluta; `repo-otro` no está en `repo`
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
  })
}

/** Las tres capas, en su orden, con la regla que decidió. */
export function evaluate(
  policy: PermissionPolicy | undefined,
  toolName: string,
  capability: Capability,
  input: Record<string, unknown>,
  interactive = false,
): Verdict {
  const dirs = policy?.additionalDirectories ?? []
  const ruta = typeof input.file_path === 'string' ? input.file_path : typeof input.path === 'string' ? input.path : undefined
  if (ruta && !confinedTo(ruta, dirs)) {
    return { decision: 'deny', reason: `la ruta ${ruta} queda fuera de los directorios declarados` }
  }
  const negada = (policy?.deny ?? []).find((r) => matchesRule(r, toolName, input))
  if (negada) return { decision: 'deny', rule: negada, reason: `denegado por la regla ${negada}` }
  const permitida = (policy?.allow ?? []).find((r) => matchesRule(r, toolName, input))
  if (permitida) return { decision: 'allow', rule: permitida }
  return { decision: decide(policy, capability, interactive), reason: `por capacidad ${capability}` }
}
