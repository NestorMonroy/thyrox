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
import type { Duty } from './basePrompt.ts'
import { join } from 'node:path'
import { dedupSections } from '@thyrox/context-compression'

export type Section = { name: string; text: string; tokens: number; conditional: boolean }

export type AssembleOptions = {
  /** Raíz del proyecto: de ahí cuelgan `CLAUDE.md` y `.claude/`. */
  root: string
  /**
   * El prompt propio del harness. Nunca se descarta.
   *
   * Una cadena entra como una sección `base`. Una LISTA de deberes entra
   * como una sección por deber, nombrada `base:<deber>` — es la separación
   * por DEBER que A.2.1 pide, y la que hace que retirar uno sea una
   * operación medible. Las dos formas conviven a propósito: obligar a los
   * llamadores a la lista rompería a todos para ganar una separación que se
   * puede tener sin romper a nadie.
   */
  base: string | readonly Duty[]
  /** Ruta del archivo sobre el que se va a trabajar; decide qué reglas condicionales entran. */
  targetPath?: string
  /** Tope de tokens para el prompt entero. Sin él no se descarta nada. */
  budgetTokens?: number
}

export type Assembled = {
  text: string
  sections: Section[]
  dropped: Section[]
  /**
   * Secciones que se retiraron por traer EXACTAMENTE el mismo texto (recorte
   * de espacios aparte) que una anterior. Es el patrón "cheat-sheet
   * (canónico en docs)" de los repos consumidores: varias reglas comparten
   * un preámbulo idéntico, y `dedupSections` lo detecta por texto completo
   * -- no por un prefijo, que produciría falsos positivos entre secciones
   * largas que sólo COMPARTEN el preámbulo (ver `dedupSections` en
   * `@thyrox/context-compression`).
   */
  duplicates: Section[]
  tokens: number
}

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
  const match = fenced ?? dashed
  if (!match) return { body: raw, paths: null }
  const body = raw.slice(match[0].length)
  const line = /^\s*paths:\s*(.+)$/m.exec(match[1])
  if (!line) return { body, paths: null }
  return { body, paths: splitPaths(line[1]) }
}

/** `paths: a, b` · `paths: ["a", "b"]` · `paths: a` — las tres formas dan la misma lista. */
function splitPaths(value: string): string[] {
  const trimmed = value.trim().replace(/^\[|\]$/g, '')
  return trimmed
    .split(',')
    .map((p) => p.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

/** `**` cruza separadores, `*` no — el mismo criterio que la puerta de permisos. */
export function matchesPath(pattern: string, path: string): boolean {
  const escape = (s: string) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const body = pattern
    .split('**')
    .map((segment) => escape(segment).replace(/\*/g, '[^/]*'))
    .join('.*')
  return new RegExp(`^${body}$`).test(path)
}

function readTrimmed(path: string): string | null {
  if (!existsSync(path)) return null
  const text = readFileSync(path, 'utf8').trim()
  return text.length ? text : null
}

function section(name: string, text: string, conditional = false): Section {
  return { name, text, tokens: estimateTokens(text), conditional }
}

/** Reúne las secciones candidatas en su orden de caché, y aplica el presupuesto. */
export function assembleSystemPrompt(opts: AssembleOptions): Assembled {
  const rawCandidates: Section[] = typeof opts.base === 'string'
    ? [section('base', opts.base)]
    : opts.base.map((d) => section(`base:${d.name}`, d.text))

  const root = readTrimmed(join(opts.root, 'CLAUDE.md'))
  if (root) rawCandidates.push(section('CLAUDE.md', root))

  const level2 = readTrimmed(join(opts.root, '.claude', 'CLAUDE.md'))
  if (level2) rawCandidates.push(section('.claude/CLAUDE.md', level2))

  const rulesDir = join(opts.root, '.claude', 'rules')
  if (existsSync(rulesDir)) {
    const files = readdirSync(rulesDir).filter((f) => f.endsWith('.md')).sort()
    for (const file of files) {
      const raw = readTrimmed(join(rulesDir, file))
      if (!raw) continue
      const { body, paths } = parseRule(raw)
      // Sin `paths:` la regla es del piso; con `paths:` sólo entra si la ruta
      // objetivo casa alguno de sus patrones. Sin ruta objetivo, no entra.
      if (paths) {
        if (!opts.targetPath) continue
        if (!paths.some((p) => matchesPath(p, opts.targetPath as string))) continue
      }
      if (!body.trim()) continue
      rawCandidates.push(section(`.claude/rules/${file}`, body.trim(), paths !== null))
    }
  }

  // El dedupe corre ANTES del presupuesto: una sección duplicada no debe
  // competir por espacio con las que sí aportan texto nuevo.
  const { sections: candidates, duplicates } = dedupSections(rawCandidates)

  const sections: Section[] = []
  const dropped: Section[] = []
  let tokens = 0
  for (const s of candidates) {
    // `base` y `base:<deber>` son el PISO: un presupuesto que pudiera dejar
    // al agente sin identidad o sin restricciones de herramienta estaría
    // decidiendo la conducta, y el tope existe para acotar el contexto, no
    // para eso.
    const isBase = s.name === 'base' || s.name.startsWith('base:')
    if (!isBase && opts.budgetTokens !== undefined && tokens + s.tokens > opts.budgetTokens) {
      dropped.push(s)
      continue
    }
    sections.push(s)
    tokens += s.tokens
  }

  return { text: sections.map((s) => s.text).join('\n\n'), sections, dropped, duplicates, tokens }
}
