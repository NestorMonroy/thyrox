/**
 * Ensamblado del prompt de sistema desde `.claude/` (T-022).
 *
 * La lección de :ref:`h-docs-99` es que **el piso no se hereda entero**: el
 * contexto siempre-cargado del cliente mide 126 029 tokens, y ése es el motivo
 * por el que `claude-haiku-4-5` no arranca aquí. Un harness propio que copie esa
 * forma repite el defecto; por eso cada sección declara su coste y el
 * presupuesto es un parámetro, no una consecuencia.
 *
 * Dos decisiones que la referencia ya tomó y que aquí se respetan:
 *
 * 1. **Una regla con `paths:` es condicional.** La doc del cliente lo dice al
 *    revés y por eso importa: *"Rules without a `paths` field are loaded
 *    unconditionally"* — declarar `paths:` es lo que la saca del piso.
 * 2. **El orden importa para la caché.** Lo estable va primero (base, CLAUDE.md)
 *    y lo variable después: la clave de caché es un prefijo, así que una sección
 *    que cambia arriba invalida todo lo de abajo.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export type Section = { name: string; text: string; tokens: number; conditional: boolean }

export type AssembleOptions = {
  /** Raíz del proyecto: de ahí cuelgan `CLAUDE.md` y `.claude/`. */
  root: string
  /** El prompt propio del harness. Nunca se descarta. */
  base: string
  /** Ruta del archivo sobre el que se va a trabajar; decide qué reglas condicionales entran. */
  targetPath?: string
  /** Tope de tokens para el prompt entero. Sin él no se descarta nada. */
  budgetTokens?: number
}

export type Assembled = { text: string; sections: Section[]; dropped: Section[]; tokens: number }

/**
 * Estimación de tokens por caracteres.
 *
 * Es una aproximación deliberada — el tokenizador real no está disponible
 * localmente. Su uso legítimo es **decidir un presupuesto**, no publicar una
 * cifra de coste: para eso está la telemetría del transcript, que trae el
 * `usage` que el servicio cobró.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

/** El cuerpo y los `paths:` de un archivo de regla, con las dos formas del árbol. */
export function parseRule(raw: string): { body: string; paths: string[] | null } {
  const fenced = /^```ya?ml\r?\n([\s\S]*?)\r?\n```\r?\n?/.exec(raw)
  const dashed = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  const m = fenced ?? dashed
  if (!m) return { body: raw, paths: null }
  const body = raw.slice(m[0].length)
  const linea = /^\s*paths:\s*(.+)$/m.exec(m[1])
  if (!linea) return { body, paths: null }
  return { body, paths: splitPaths(linea[1]) }
}

/** `paths: a, b` · `paths: ["a", "b"]` · `paths: a` — las tres formas dan la misma lista. */
function splitPaths(valor: string): string[] {
  const limpio = valor.trim().replace(/^\[|\]$/g, '')
  return limpio
    .split(',')
    .map((p) => p.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

/** `**` cruza separadores, `*` no — el mismo criterio que la puerta de permisos. */
export function matchesPath(pattern: string, path: string): boolean {
  const escapar = (s: string) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const cuerpo = pattern
    .split('**')
    .map((tramo) => escapar(tramo).replace(/\*/g, '[^/]*'))
    .join('.*')
  return new RegExp(`^${cuerpo}$`).test(path)
}

function leer(ruta: string): string | null {
  if (!existsSync(ruta)) return null
  const texto = readFileSync(ruta, 'utf8').trim()
  return texto.length ? texto : null
}

function seccion(name: string, text: string, conditional = false): Section {
  return { name, text, tokens: estimateTokens(text), conditional }
}

/** Reúne las secciones candidatas en su orden de caché, y aplica el presupuesto. */
export function assembleSystemPrompt(opts: AssembleOptions): Assembled {
  const candidatas: Section[] = [seccion('base', opts.base)]

  const raiz = leer(join(opts.root, 'CLAUDE.md'))
  if (raiz) candidatas.push(seccion('CLAUDE.md', raiz))

  const nivel2 = leer(join(opts.root, '.claude', 'CLAUDE.md'))
  if (nivel2) candidatas.push(seccion('.claude/CLAUDE.md', nivel2))

  const dirReglas = join(opts.root, '.claude', 'rules')
  if (existsSync(dirReglas)) {
    const archivos = readdirSync(dirReglas).filter((f) => f.endsWith('.md')).sort()
    for (const archivo of archivos) {
      const bruto = leer(join(dirReglas, archivo))
      if (!bruto) continue
      const { body, paths } = parseRule(bruto)
      // Sin `paths:` la regla es del piso; con `paths:` sólo entra si la ruta
      // objetivo casa alguno de sus patrones. Sin ruta objetivo, no entra.
      if (paths) {
        if (!opts.targetPath) continue
        if (!paths.some((p) => matchesPath(p, opts.targetPath as string))) continue
      }
      if (!body.trim()) continue
      candidatas.push(seccion(`.claude/rules/${archivo}`, body.trim(), paths !== null))
    }
  }

  const sections: Section[] = []
  const dropped: Section[] = []
  let tokens = 0
  for (const s of candidatas) {
    const esBase = s.name === 'base'
    if (!esBase && opts.budgetTokens !== undefined && tokens + s.tokens > opts.budgetTokens) {
      dropped.push(s)
      continue
    }
    sections.push(s)
    tokens += s.tokens
  }

  return { text: sections.map((s) => s.text).join('\n\n'), sections, dropped, tokens }
}
