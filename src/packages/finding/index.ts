/**
 * El registro de hallazgos: de la fila del store al `.rst` y a su entrada en
 * el índice de la iniciativa.
 *
 * Vocabulario, porque las tres cosas se confundían bajo «hallazgo»:
 *
 * - **finding** — la conclusión de un análisis: algo que existe o sucedió.
 * - **record** — su fila en `findings_history`: el asiento administrativo.
 * - **entry** — su línea en el `index.rst` de la iniciativa: la fila de la
 *   tabla y el nombre en el toctree.
 *
 * Por qué es un paquete propio: `@thyrox/store` abre la base y
 * `@thyrox/paths` construye la ruta (`findingPath`), y ninguno sabe qué es un
 * hallazgo. Es la misma partición que `@thyrox/task` hace para las tareas.
 *
 * Un hallazgo publicado es evidencia fechada: `writeFinding` no escribe sobre
 * un archivo que ya existe.
 */
import { existsSync, globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { findingPath, type Submodule } from '@thyrox/paths/docs.ts'
import { openLocal } from '@thyrox/store/db.ts'

export type FindingRecord = {
  findingId: string
  submodule: Submodule
  initiative: string
  severity: string | null
  summary: string
  content: string
  sourceRef: string | null
}

const AUTHOR = 'Equipo Kaupamex'

/** El resumen en kebab-case ASCII: sin acentos ni signos. */
export function slugOf(summary: string): string {
  return summary
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** La fila de `findingId`, o `null` si el store no la tiene. Abre en sólo lectura. */
export function readFindingRecord(storeFile: string, findingId: string): FindingRecord | null {
  if (!existsSync(storeFile)) return null
  const db = openLocal(storeFile, { readonly: true })
  try {
    const found = db
      .query(
        'SELECT finding_id, submodule, initiative, severity, summary, content, source_ref ' +
          'FROM findings_history WHERE finding_id = ?',
      )
      .get(findingId) as Record<string, string | null> | null
    if (!found) return null
    // Una capa desconocida la rechaza `findingPath`: su prefijo no casa con el ID.
    return {
      findingId: found.finding_id!,
      submodule: found.submodule as Submodule,
      initiative: found.initiative!,
      severity: found.severity,
      summary: found.summary!,
      content: found.content!,
      sourceRef: found.source_ref,
    }
  } finally {
    db.close()
  }
}

export type RenderOptions = {
  /** `repo@hash` del commit que lo resuelve; sin él, queda documentado. */
  resolvedIn?: string
  /** Cuerpo `.rst` que se copia tal cual tras la ficha. */
  body?: string
  /** Por defecto, el instante UTC al segundo. */
  createdAt?: string
}

function utcNow(): string {
  return new Date().toISOString().slice(0, 19)
}

/** `<alias>: <ruta>` al principio: la ruta ya dice de qué árbol es. */
const DECLARED_ALIAS = /^[a-z0-9][a-z0-9-]*: /

/**
 * La ruta con el alias de su árbol. Si la fila ya lo declara, se respeta: un
 * hallazgo de la capa `thyrox` puede citar un archivo de `kaupamex-docs`.
 */
function qualifiedSource(record: FindingRecord): string {
  const source = record.sourceRef ?? ''
  return DECLARED_ALIAS.test(source) ? source : `${record.submodule}: ${source}`
}

/** El documento con la plantilla B de `hallazgos-documentacion-obligatoria.md`. */
export function renderFinding(record: FindingRecord, options: RenderOptions): string {
  const createdAt = options.createdAt ?? utcNow()
  const title = `${record.findingId} — ${record.summary}`
  const lines = [
    '.. meta::',
    `   :fecha_creacion: ${createdAt}`,
    `   :autor: ${AUTHOR}`,
    `   :estado: ${options.resolvedIn ? 'resuelto' : 'documentado'}`,
    `   :submodulo: ${record.submodule}`,
    `   :iniciativa: ${record.initiative}`,
    '',
    `.. _${record.findingId.toLowerCase()}:`,
    '',
    title,
    '='.repeat(title.length),
    '',
    `- **Severidad:** ${record.severity ?? 'SIN DECLARAR'}`,
    `- **Fecha:** ${createdAt}`,
  ]
  if (record.sourceRef) lines.push(`- **Archivo:** \`\`${qualifiedSource(record)}\`\``)
  lines.push(
    `- **Descripcion:** ${record.content}`,
    `- **Estado:** ${options.resolvedIn ? `RESUELTO en \`\`${options.resolvedIn}\`\`` : 'DOCUMENTADO (sin fix inmediato)'}`,
    '',
  )
  let text = lines.join('\n')
  if (options.body) text += '\n' + options.body.replace(/\n+$/, '') + '\n'
  return text
}

/** Dónde vive el `.rst` de este hallazgo. */
export function findingFile(record: FindingRecord): string {
  return findingPath(record.submodule, record.initiative, record.findingId, slugOf(record.summary))
}

/** Escribe el `.rst`; `null` si ya existía (y entonces no lo toca). */
export function writeFinding(record: FindingRecord, options: RenderOptions): string | null {
  const target = findingFile(record)
  if (existsSync(target)) return null
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, renderFinding(record, options))
  return target
}

const ROW_START = '   * - '
const ROW_CONTINUATION = '     - '

/** El marcador que ya usa este índice para una descripción ausente. */
const MISSING_DESCRIPTION = '—'

/**
 * Cuántas celdas trae la primera fila de la tabla (la de encabezado, bajo
 * `:header-rows: 1`). Determina cuántas columnas hay que rellenar.
 */
function columnCountOf(lines: string[]): number {
  const start = lines.findIndex(line => line.startsWith(ROW_START))
  if (start < 0) return 0
  let count = 1
  for (let i = start + 1; i < lines.length && lines[i]!.startsWith(ROW_CONTINUATION); i++) count++
  return count
}

/**
 * Las celdas de la fila nueva, en las dos formas conocidas del índice de
 * hallazgos. Una forma que no es ninguna de las dos se rehúsa: no hay cómo
 * saber qué va en una columna que ninguna convención declaró.
 */
function cellsForColumns(columnCount: number, ref: string, severity: string, state: string): string[] {
  if (columnCount === 3) return [ref, severity, state]
  if (columnCount === 4) return [ref, severity, state, MISSING_DESCRIPTION]
  throw new Error(`el índice declara ${columnCount} columnas; no hay convención para rellenarlas`)
}

/**
 * La entrada del hallazgo en el índice: su fila tras la última de la tabla y
 * su nombre tras el último del toctree. Si ya estaba, el texto no cambia. La
 * fila nueva lleva tantas celdas como declare la tabla destino.
 */
export function addIndexEntry(index: string, record: FindingRecord, documentName: string, state: string): string {
  const lines = index.split('\n')
  const label = record.findingId.toLowerCase()
  if (!index.includes(`:ref:\`${label}\``)) {
    let lastRowEnd = -1
    lines.forEach((line, i) => {
      // Una fila empieza con `* -`; sus celdas siguen, contiguas, con `-`.
      const startsRow = line.startsWith(ROW_START)
      const continuesRow = lastRowEnd === i - 1 && line.startsWith(ROW_CONTINUATION)
      if (startsRow || continuesRow) lastRowEnd = i
    })
    if (lastRowEnd < 0) throw new Error('el índice no tiene list-table')
    const cells = cellsForColumns(columnCountOf(lines), `:ref:\`${label}\``, record.severity ?? 'SIN DECLARAR', state)
    lines.splice(lastRowEnd + 1, 0, `${ROW_START}${cells[0]}`, ...cells.slice(1).map(cell => `${ROW_CONTINUATION}${cell}`))
  }
  if (!lines.join('\n').includes(`hallazgo-${record.findingId}-`)) {
    const start = lines.findIndex(line => line.startsWith('.. toctree::'))
    if (start < 0) throw new Error('el índice no tiene toctree')
    let lastEntry = start
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i]!
      if (line.startsWith('   ') && !line.startsWith('   :') && line.trim()) lastEntry = i
      else if (line.trim() && !line.startsWith('   ')) break
    }
    lines.splice(lastEntry + 1, 0, `   ${documentName}`)
  }
  return lines.join('\n')
}

/**
 * Añade la entrada al `index.rst` de la iniciativa. El estado sale del
 * `.rst` ya escrito; sin él, `DOCUMENTADO`. `true` si el índice cambió.
 */
export function addToInitiativeIndex(record: FindingRecord): boolean {
  const target = findingFile(record)
  const folder = dirname(target)
  const indexFile = join(folder, 'index.rst')
  const existing = globSync(`hallazgo-${record.findingId}-*.rst`, { cwd: folder }).sort()[0]
  const document = existing ? join(folder, existing) : target
  const state = existsSync(document) && /^\s*:estado:\s*resuelto\b/im.test(readFileSync(document, 'utf8'))
    ? 'RESUELTO'
    : 'DOCUMENTADO'
  const before = readFileSync(indexFile, 'utf8')
  const after = addIndexEntry(before, record, basename(document, '.rst'), state)
  if (after === before) return false
  writeFileSync(indexFile, after)
  return true
}

export type PublishEntry = { id: string; resolvedIn?: string; body?: string }
export type PublishPlan = { jobs: string[]; steps: string[][] }

/**
 * Publicar N hallazgos con los instrumentos del proveedor:
 *
 * 1. cada render es un trabajo independiente de `run-task-pool`, lanzado con
 *    `thyrox-bg` para que el primer plano quede libre;
 * 2. el índice tiene un solo escritor, y espera a que los renders asienten
 *    con la arista `--after-ok` de `wait-jobs`;
 * 3. `wait-jobs dispatch` mueve la cadena sin bloquear. Quien publica recoge
 *    con `wait-jobs wait` en segundo plano.
 *
 * El registro de las filas NO entra aquí: el store tiene un solo escritor, y
 * la fila existe antes de que haya nada que renderizar.
 */
export function buildPublishPlan(entries: PublishEntry[], options: { runDir: string; name: string }): PublishPlan {
  const jobs = entries.map(entry =>
    ['bash bin/finding rst', entry.id,
      ...(entry.resolvedIn ? ['--resolved-in', entry.resolvedIn] : []),
      ...(entry.body ? ['--body', entry.body] : [])].join(' '))
  const render = `${options.name}-render`
  const index = `${options.name}-index`
  const steps = [
    ['bash', 'bin/thyrox-bg', 'start', render, '--grace', '0', '--', 'bash', 'bin/run-task-pool', join(options.runDir, 'render.jobs')],
    ['bash', 'bin/thyrox-bg', 'register', render],
    ['bash', 'bin/wait-jobs', 'register', index, join(options.runDir, 'index.log'),
      '--after-ok', render, '--run', `bash bin/finding index ${entries.map(e => e.id).join(' ')}`],
    ['bash', 'bin/wait-jobs', 'dispatch'],
  ]
  return { jobs, steps }
}
