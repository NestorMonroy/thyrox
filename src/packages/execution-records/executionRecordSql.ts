/**
 * El esquema del registro de ejecución (ADR-007 1.17.0, X1a): una fila por
 * ejecución gestionada, con lo que la fuente produzca. Sólo la identidad, la
 * referencia y la clase son obligatorias; el resto es nullable porque no toda
 * fuente mide CPU, VRAM o red, y un campo inventado sería peor que uno vacío.
 *
 * Vive en la misma base que el corpus semántico, por las migraciones de
 * `@thyrox/store`: no es un segundo store, es otra tabla bajo el mismo runner.
 */
import type { Migration } from '@thyrox/store/migrations.ts'

export const EXECUTION_RECORDS_MIGRATIONS_TABLE = 'execution_records_migrations'
export const EXECUTION_RECORDS_TABLE = 'execution_records'

/** Columnas en el orden en que se escriben; `execution_id` es la clave. */
export const EXECUTION_RECORD_COLUMNS = [
  'execution_id',
  'reference',
  'kind',
  'task_id',
  'batch_id',
  'item_id',
  'unit_id',
  'container_id',
  'container_name',
  'image_ref',
  'artifact_id',
  'model_id',
  'runtime',
  'provider',
  'started_at',
  'finished_at',
  'exit_code',
  'termination_reason',
  'wall_ms',
  'cpu_ms',
  'max_rss_bytes',
  'vram_peak_mib',
  'disk_bytes',
  'network_bytes',
  'qualification_id',
  'verdict',
  'attestation',
] as const

const CREATE_POSTGRES = `CREATE TABLE IF NOT EXISTS ${EXECUTION_RECORDS_TABLE} (
  execution_id TEXT PRIMARY KEY,
  reference TEXT NOT NULL,
  kind TEXT NOT NULL,
  task_id TEXT,
  batch_id TEXT,
  item_id TEXT,
  unit_id TEXT,
  container_id TEXT,
  container_name TEXT,
  image_ref TEXT,
  artifact_id TEXT,
  model_id TEXT,
  runtime TEXT,
  provider TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  exit_code INTEGER,
  termination_reason TEXT,
  wall_ms BIGINT,
  cpu_ms BIGINT,
  max_rss_bytes BIGINT,
  vram_peak_mib BIGINT,
  disk_bytes BIGINT,
  network_bytes BIGINT,
  qualification_id TEXT,
  verdict TEXT,
  attestation JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`

const CREATE_SQLITE = `CREATE TABLE IF NOT EXISTS ${EXECUTION_RECORDS_TABLE} (
  execution_id TEXT PRIMARY KEY,
  reference TEXT NOT NULL,
  kind TEXT NOT NULL,
  task_id TEXT,
  batch_id TEXT,
  item_id TEXT,
  unit_id TEXT,
  container_id TEXT,
  container_name TEXT,
  image_ref TEXT,
  artifact_id TEXT,
  model_id TEXT,
  runtime TEXT,
  provider TEXT,
  started_at TEXT,
  finished_at TEXT,
  exit_code INTEGER,
  termination_reason TEXT,
  wall_ms INTEGER,
  cpu_ms INTEGER,
  max_rss_bytes INTEGER,
  vram_peak_mib INTEGER,
  disk_bytes INTEGER,
  network_bytes INTEGER,
  qualification_id TEXT,
  verdict TEXT,
  attestation TEXT,
  recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)`

const TASK_INDEX = `CREATE INDEX IF NOT EXISTS execution_records_task_idx ON ${EXECUTION_RECORDS_TABLE} (task_id)`

export const EXECUTION_RECORD_MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'create_execution_records',
    statements: { postgres: [CREATE_POSTGRES, TASK_INDEX], sqlite: [CREATE_SQLITE, TASK_INDEX] },
  },
]

const UPDATABLE = EXECUTION_RECORD_COLUMNS.filter(column => column !== 'execution_id')

/**
 * Escribir dos veces la misma ejecución (el finalizador y después el barrido
 * de recuperación) completa la fila sin borrar lo que ya estaba: un valor
 * nuevo nulo no pisa uno medido.
 */
export function upsertExecutionRecordQuery(dialect: 'postgres' | 'sqlite'): string {
  const placeholders = EXECUTION_RECORD_COLUMNS.map((column, index) => {
    const parameter = `$${index + 1}`
    return column === 'attestation' && dialect === 'postgres' ? `${parameter}::jsonb` : parameter
  })
  const updates = UPDATABLE.map(column => `${column} = COALESCE(excluded.${column}, ${EXECUTION_RECORDS_TABLE}.${column})`)
  return `INSERT INTO ${EXECUTION_RECORDS_TABLE} (${EXECUTION_RECORD_COLUMNS.join(', ')})
VALUES (${placeholders.join(', ')})
ON CONFLICT (execution_id) DO UPDATE SET ${updates.join(', ')}`
}

export const SELECT_EXECUTION_RECORD_QUERY = `SELECT ${EXECUTION_RECORD_COLUMNS.join(', ')}, recorded_at FROM ${EXECUTION_RECORDS_TABLE} WHERE execution_id = $1`
