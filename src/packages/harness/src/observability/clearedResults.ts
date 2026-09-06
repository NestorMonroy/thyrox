/**
 * El registro de lo que la microcompactación vacía.
 *
 * `microcompact.ts` sustituye el contenido de un resultado viejo por un
 * marcador. El ejecutable 2.1.258 hace lo mismo y **antes lo persiste**:
 *
 * ```js
 * let F = x.content ? await r.persist?.(x.content, x.tool_use_id) : null;
 * k.set(x.tool_use_id, F ?? iUe)      //  iUe = "[Old tool result content cleared]"
 * ```
 *
 * Su handle sustituye al marcador cuando la persistencia funcionó, y el
 * marcador pelado es el respaldo. Nosotros **divergimos en un punto, y es
 * deliberado**: si la persistencia falla, el resultado NO se limpia. Vaciarlo
 * igual es la pérdida silenciosa del nivel 4 de `niveles-de-retencion.md` —
 * nadie la nota hasta que necesita el detalle— y el coste de no limpiarlo es
 * sólo contexto, que el turno siguiente vuelve a evaluar.
 *
 * **Qué se guarda, y por qué no es «todo el caché».** El contenido NO entra
 * aquí: `agent_store.sqlite3` está versionado, así que guardar cada resultado
 * purgado lo haría crecer sin cota. Se guarda **la llamada que lo produjo**
 * —que es lo que permite volver a pedirlo, y la lista de compactables ya es
 * cerrada a lo reproducible— más el digest y el tamaño, que es lo que permite
 * saber si lo que vuelve es lo mismo que había. Un contenido que sea
 * *evidencia* tiene otro hogar y ya está fijado: `.claude/eventos/**` o un
 * `.rst`, por `build-logs.md`.
 */
import { Database } from 'bun:sqlite'
import { openStore } from '../../../../store/db.ts'
import { createHash } from 'node:crypto'
import type { Message } from '../types.ts'
import { CLEARED_MARKER } from '../context/microcompact.ts'

export const CLEARED_TABLE = 'cleared_tool_results'

/** La llamada que produjo un resultado: lo que hace falta para volver a pedirlo. */
export type ToolCall = { tool: string; input: Record<string, unknown> }

/**
 * El índice `tool_use_id -> llamada`, del lado asistente.
 *
 * Mismo criterio que `collectCompactableToolIds`: un bloque con forma de
 * `tool_use` dentro de un mensaje de usuario no es una llamada del modelo, y
 * registrarlo produciría una fila que no corresponde a nada.
 */
export function toolCallIndex(messages: Message[]): Map<string, ToolCall> {
  const idx = new Map<string, ToolCall>()
  for (const m of messages) {
    if (m.role !== 'assistant') continue
    for (const b of m.content) {
      if (b.type === 'tool_use') idx.set(b.id, { tool: b.name, input: b.input ?? {} })
    }
  }
  return idx
}

export function ensureClearedTable(db: Database): void {
  db.run(`CREATE TABLE IF NOT EXISTS ${CLEARED_TABLE} (
    session_id     TEXT NOT NULL,
    tool_use_id    TEXT NOT NULL,
    tool           TEXT NOT NULL,
    input_json     TEXT NOT NULL,
    content_sha256 TEXT NOT NULL,
    content_chars  INTEGER NOT NULL,
    cleared_at     TEXT NOT NULL,
    PRIMARY KEY (session_id, tool_use_id)
  )`)
}

/** El argumento que identifica la llamada, con el mismo criterio que la CLI. */
function argumento(input: Record<string, unknown>): string {
  for (const clave of ['command', 'file_path', 'path', 'pattern', 'url']) {
    const v = input[clave]
    if (typeof v === 'string') return v.length > 80 ? `${v.slice(0, 80)}…` : v
  }
  return ''
}

export type ClearedPersisterOptions = {
  dbPath: string
  sessionId: string
  calls: Map<string, ToolCall>
}

/**
 * Por qué NO se pudo registrar. Las tres son distintas y ninguna es «falló»:
 * un `null` que no discrimina deja el defecto sin diagnosticar, que es el
 * sub-patrón D de `metrica-decide-la-conclusion.md` aplicado al diagnóstico.
 *
 * - `sin-store` — la base no abrió. Causa a mirar: ruta, permisos, o el
 *   `agent_store.sqlite3` bloqueado por otro escritor.
 * - `llamada-desconocida` — no hay `tool_use` para ese id en el historial
 *   vivo. **Es la que más dice**: significa que la llamada quedó detrás de una
 *   frontera de compactación, así que el índice se está construyendo sobre los
 *   mensajes y no sobre el transcript. Mejora concreta, no ruido.
 * - `insert-fallo` — la base rechazó la fila: esquema, disco o bloqueo.
 */
export type UnpersistedReason = 'sin-store' | 'llamada-desconocida' | 'insert-fallo'

export type ClearedPersister = {
  persist: (content: string, toolUseId: string) => string | null
  /** Los fallos, con su causa. Se lee DESPUÉS de microcompactar. */
  failures: Map<string, { reason: UnpersistedReason; detail?: string }>
}

/**
 * El persistidor que `microcompact` consulta antes de vaciar cada candidato.
 *
 * Devuelve el marcador **con su procedencia** —lo que el modelo va a leer en
 * lugar del contenido— o `null` si no se pudo registrar. Ese `null` es el
 * guard: quien lo recibe no limpia.
 *
 * Es síncrono porque `bun:sqlite` lo es. Volverlo asíncrono obligaría a
 * `microcompact` entera a serlo, y no compraría nada: no hay E/S que esperar.
 */
export function makeClearedPersister(opts: ClearedPersisterOptions): ClearedPersister {
  const failures = new Map<string, { reason: UnpersistedReason; detail?: string }>()
  let db: Database
  try {
    db = openStore(opts.dbPath)
    ensureClearedTable(db)
  } catch (e) {
    // Sin store no hay registro, y sin registro no se limpia: devolver un
    // marcador aquí seria afirmar que se guardó algo que no se guardó.
    const detail = e instanceof Error ? e.message : String(e)
    return {
      persist: (_c, id) => { failures.set(id, { reason: 'sin-store', detail }); return null },
      failures,
    }
  }
  const persist = (content: string, toolUseId: string): string | null => {
    const llamada = opts.calls.get(toolUseId)
    // Un resultado sin llamada conocida no se puede volver a pedir: registrar
    // su digest no lo haría recuperable, así que no se limpia.
    if (!llamada) {
      failures.set(toolUseId, { reason: 'llamada-desconocida' })
      return null
    }
    const sha = createHash('sha256').update(content).digest('hex')
    try {
      db.run(
        `INSERT INTO ${CLEARED_TABLE} (session_id, tool_use_id, tool, input_json,
           content_sha256, content_chars, cleared_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(session_id, tool_use_id) DO UPDATE SET
           content_sha256 = excluded.content_sha256,
           content_chars = excluded.content_chars,
           cleared_at = excluded.cleared_at`,
        [opts.sessionId, toolUseId, llamada.tool, JSON.stringify(llamada.input),
          sha, content.length, new Date().toISOString()],
      )
    } catch (e) {
      failures.set(toolUseId, { reason: 'insert-fallo', detail: e instanceof Error ? e.message : String(e) })
      return null
    }
    const arg = argumento(llamada.input)
    return `${CLEARED_MARKER} · ${llamada.tool}${arg ? `(${arg})` : ''} · sha256:${sha.slice(0, 12)} · ${content.length} car`
  }
  return { persist, failures }
}
