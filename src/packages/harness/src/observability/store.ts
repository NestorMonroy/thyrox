/**
 * Integración con `agent_store.sqlite3` (T-033).
 *
 * La regla `agent-results-to-docs.md` mide por qué esto existe: los hooks
 * `SubagentStart`/`SubagentStop` sólo cargan cuando el repo es el cwd de la
 * sesión, y el harness remoto arranca en `/home/user`. Trece subagentes de un
 * día quedaron sin fila. **Un harness propio escribe su fila él mismo**, no la
 * delega a un hook cuyo disparo depende del cwd.
 *
 * Dos decisiones que la escritura respeta:
 *
 * - `usage_source = 'transcript'` — la procedencia del dato, no el dato. Es lo
 *   que permite que el censo excluya del denominador lo que nadie midió, en vez
 *   de sumarlo como cero (`calibration-verified-numbers.md`).
 * - `retention_level = 3` — persistencia **declarada**, sin verificar. El 2 lo
 *   escribe quien verifica de forma independiente; el productor no puede
 *   promoverse a sí mismo (`niveles-de-retencion.md`).
 */
import { Database } from 'bun:sqlite'
import { openStore } from './db.ts'
import { join } from 'node:path'
import { docsRoot } from '../paths/docs.ts'
import type { Usage } from '../types.ts'
import type { TranscriptShape } from './transcriptShape.ts'
import { verifyAdoption, readProcStart, type Adoption } from '../session/reconcile.ts'

/**
 * El store vive en el repo de docs, junto al resto de la telemetría local.
 *
 * Era aritmética de ruta y resolvía a `<thyrox>/src/agent-results/`, un
 * directorio que no existe — el comentario decía docs y el cálculo apuntaba
 * a otro sitio. El resolutor `docsRoot()` ya existía; lo que faltaba era
 * usarlo. Mismo defecto que las rutas codificadas de `emit`, medido el mismo
 * día en tres subsistemas distintos.
 */
export const STORE_PATH = join(docsRoot(), '.claude', 'agent-results', 'agent_store.sqlite3')

export type HarnessSessionRow = {
  sessionId: string
  model: string
  turns: number
  usage: Usage
  status: 'running' | 'completed' | 'failed'
  startedAt: string
  /**
   * El `subagent_type` de la fila. Por defecto `'harness'` —la sesión propia
   * del harness—; un subagente despachado por `agentTool` pasa su tipo real
   * (`general-purpose`, `migration-porter`, …). Ése es justo el campo que la
   * reconciliación desde disco no puede reconstruir —vive en el `input` del
   * `Agent` del padre, no en el transcript del hijo (:ref:`h-docs-1024`)—, así
   * que capturarlo aquí es la mitad que la vía del hook muerto perdía. Se fija
   * al INSERT; el ON CONFLICT no lo toca: el tipo no cambia entre `running` y
   * `completed`.
   */
  subagentType?: string
  /** El identificador de la fila. Por defecto, la propia sesión. */
  agentId?: string
  description?: string
  equivCost?: number
  /**
   * La forma del transcript de la sesión.
   *
   * Va en `metadata_json` y **no** en una columna por tipo: el conjunto de
   * tipos no está cerrado —la referencia nombra `progress`,
   * `file-history-snapshot` y `attribution-snapshot`, y el corpus medido no
   * produjo ninguno— así que una columna por tipo congelaría un universo que
   * la propia medición declara abierto. Se agrega con `json_extract`, que es
   * lo que sostiene la decisión: sin consulta, `metadata_json` sería un blob.
   *
   * Sus dos agregados sí van a columna, porque la columna **ya existe**:
   * `compactions` y `dropped_tokens` estaban declaradas en el esquema y
   * pobladas en 3 de 842 filas. Ésta es la vía por la que se llenan.
   */
  shape?: TranscriptShape
  /**
   * El pid del proceso dueño de esta sesión y su hora de arranque. Van a
   * `metadata_json`, no a columnas: `agent_sessions` es una tabla compartida
   * por tres escritores (hooks, `reconciliar_store.py`, harness) y un
   * `ALTER TABLE` sobre 847 filas es riesgo que el blob evita. Es lo que
   * `reconcileStaleRunningRows` lee para decidir si una fila `running`
   * corresponde a un proceso vivo. Por defecto, el proceso que escribe.
   */
  pid?: number
  procStart?: number
}

/**
 * Escribe (o actualiza) la fila de una sesión del harness.
 *
 * La clave es `agent_id`: reescribir la misma sesión **actualiza**, porque el
 * harness la registra al arrancar y la cierra al terminar. Duplicar filas
 * inflaría cualquier agregado del store con la misma sesión contada dos veces.
 */
export function recordHarnessSession(dbPath: string, row: HarnessSessionRow): void {
  const db = openStore(dbPath)
  try {
    const ahora = new Date().toISOString()
    db.run(
      `INSERT INTO agent_sessions (
         agent_id, subagent_type, session_id, status, started_at, updated_at,
         model, description, turns,
         input_tokens, cache_creation_tokens, cache_read_tokens, output_tokens,
         equiv_cost, retention_level, usage_source, source,
         metadata_json, compactions, dropped_tokens
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 3, 'transcript', 'harness', ?, ?, ?)
       ON CONFLICT(agent_id) DO UPDATE SET
         -- session_id se actualiza porque el harness escribe en DOS fases: la
         -- fila 'running' del despacho no conoce aún el id de sesion del bucle
         -- (lo crea runLoop), asi que llega en la fase 'completed'. Solo afecta
         -- a nuestras propias reescrituras por agent_id.
         session_id = excluded.session_id,
         status = excluded.status, updated_at = excluded.updated_at, turns = excluded.turns,
         input_tokens = excluded.input_tokens, cache_creation_tokens = excluded.cache_creation_tokens,
         cache_read_tokens = excluded.cache_read_tokens, output_tokens = excluded.output_tokens,
         equiv_cost = excluded.equiv_cost, model = excluded.model,
         metadata_json = excluded.metadata_json, compactions = excluded.compactions,
         dropped_tokens = excluded.dropped_tokens`,
      [
        row.agentId ?? row.sessionId, row.subagentType ?? 'harness', row.sessionId, row.status, row.startedAt, ahora,
        row.model, row.description ?? null, row.turns,
        row.usage.input_tokens, row.usage.cache_creation_input_tokens,
        row.usage.cache_read_input_tokens, row.usage.output_tokens,
        row.equivCost ?? null,
        // Sin forma medida, las tres quedan NULL. `NULL` es «nadie midió» y no
        // es 0: colapsarlos haría que un promedio del store repartiera el gasto
        // entre filas que no aportaron dato.
        buildMetadata(row),
        row.shape?.compactions ?? null,
        row.shape?.droppedTokens ?? null,
      ],
    )
  } finally {
    db.close()
  }
}


/**
 * El `metadata_json` de una fila: la forma del transcript (si se midió) más el
 * pid y la hora de arranque del proceso dueño. `null` sólo si no hay nada que
 * guardar. El pid se captura del proceso que escribe cuando no se da uno.
 */
function buildMetadata(row: HarnessSessionRow): string | null {
  const pid = row.pid ?? process.pid
  const procStart = row.procStart ?? readProcStart(pid)
  const meta: Record<string, unknown> = { pid }
  if (procStart > 0) meta.procStart = procStart
  if (row.shape) meta.transcriptShape = row.shape
  return JSON.stringify(meta)
}

export type StaleRow = { agentId: string; verdict: Adoption }

/**
 * Cierra las filas `running` cuyo proceso ya no está (T-094).
 *
 * La muerte de un proceso es un **no-evento**: nadie escribe en la DB cuando el
 * worker muere, así que un trigger nunca la vería —dispara con escrituras, y no
 * hay ninguna—. Esto es un **barrido**: por cada fila `running` con `pid` en su
 * metadata, corre ``verifyAdoption``; ``dead`` o ``recycled`` la marca
 * ``failed``. Una fila sin `pid` se **deja como está**: no se puede decidir, y
 * adivinar sería peor que no tocarla.
 *
 * Devuelve las filas cerradas con su veredicto. Corre en el arranque del
 * harness, que es un momento conocido; no necesita disparo.
 */
export function reconcileStaleRunningRows(dbPath: string): StaleRow[] {
  const db = openStore(dbPath)
  try {
    ensureUpdatedAtTrigger(db)
    const rows = db.query(
      `SELECT agent_id, metadata_json FROM agent_sessions WHERE status = 'running'`,
    ).all() as { agent_id: string; metadata_json: string | null }[]
    const cerradas: StaleRow[] = []
    for (const r of rows) {
      if (!r.metadata_json) continue
      let meta: { pid?: unknown; procStart?: unknown }
      try {
        meta = JSON.parse(r.metadata_json)
      } catch {
        continue
      }
      if (typeof meta.pid !== 'number') continue
      const procStart = typeof meta.procStart === 'number' ? meta.procStart : undefined
      const verdict = verifyAdoption(meta.pid, procStart)
      if (verdict === 'dead' || verdict === 'recycled') {
        db.run(`UPDATE agent_sessions SET status = 'failed' WHERE agent_id = ?`, [r.agent_id])
        cerradas.push({ agentId: r.agent_id, verdict })
      }
    }
    return cerradas
  } finally {
    db.close()
  }
}

/**
 * El trigger de contabilidad: estampa `updated_at` cuando cambia el `status`.
 *
 * NO decide nada —esa es la diferencia con el barrido—: sólo garantiza que
 * `updated_at` refleje la última transición, venga del escritor que venga. Es
 * seguro sobre la tabla compartida: `recursive_triggers` está apagado por
 * defecto, así que el `UPDATE` de adentro no vuelve a disparar el trigger. El
 * patrón ya existe en esta DB (los tres triggers de `findings_history`).
 */
export function ensureUpdatedAtTrigger(db: Database): void {
  db.run(`CREATE TRIGGER IF NOT EXISTS agent_sessions_stamp_updated
    AFTER UPDATE OF status ON agent_sessions
    WHEN NEW.status <> OLD.status
    BEGIN
      UPDATE agent_sessions
      SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE rowid = NEW.rowid;
    END`)
}
