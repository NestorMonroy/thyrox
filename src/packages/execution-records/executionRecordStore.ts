/**
 * La API del registro de ejecución (ADR-007 1.17.0, X1a): migrar, escribir y
 * leer la fila de una ejecución gestionada. La conexión la abre el llamador
 * (`openByUrl` de `@thyrox/store`): este módulo no decide en qué base vive.
 *
 * Escribir es idempotente por `executionId` y no destructivo: el finalizador y
 * el barrido de recuperación pueden escribir la misma ejecución, y un campo que
 * el segundo no midió no borra el que el primero sí.
 */
import type { SQL } from 'bun'

import { runMigrations } from '@thyrox/store/migrations.ts'
import { jsonParam, readJson, readTimestamp, type Dialect } from '@thyrox/store/sql.ts'

import {
  EXECUTION_RECORD_COLUMNS,
  EXECUTION_RECORD_MIGRATIONS,
  EXECUTION_RECORDS_MIGRATIONS_TABLE,
  SELECT_EXECUTION_RECORD_QUERY,
  upsertExecutionRecordQuery,
} from './executionRecordSql.ts'

/** Lo que una fuente puede declarar de una ejecución; sólo los tres primeros campos son obligatorios. */
export interface ExecutionRecord {
  readonly executionId: string
  /** `task:TASK-THYROX-NNNN` o `work:CONSUMIDOR:ID`, la misma forma que la atestación del primitivo. */
  readonly reference: string
  readonly kind: string
  readonly taskId?: string
  readonly batchId?: string
  readonly itemId?: string
  readonly unitId?: string
  readonly containerId?: string
  readonly containerName?: string
  readonly imageRef?: string
  readonly artifactId?: string
  readonly modelId?: string
  readonly runtime?: string
  readonly provider?: string
  readonly startedAt?: string
  readonly finishedAt?: string
  readonly exitCode?: number
  readonly terminationReason?: string
  readonly wallMs?: number
  readonly cpuMs?: number
  readonly maxRssBytes?: number
  readonly vramPeakMib?: number
  readonly diskBytes?: number
  readonly networkBytes?: number
  readonly qualificationId?: string
  readonly verdict?: string
  readonly attestation?: Readonly<Record<string, unknown>>
}

export interface StoredExecutionRecord extends ExecutionRecord {
  readonly recordedAt: string
}

export class InvalidExecutionRecordError extends Error {
  constructor(readonly field: string, reason: string) {
    super(`registro de ejecución inválido en ${field}: ${reason}`)
    this.name = 'InvalidExecutionRecordError'
  }
}

const REQUIRED_FIELDS = ['executionId', 'reference', 'kind'] as const
const COUNT_FIELDS = ['exitCode', 'wallMs', 'cpuMs', 'maxRssBytes', 'vramPeakMib', 'diskBytes', 'networkBytes'] as const

/** Rehúsa antes de escribir: una fila sin identidad o con una medida negativa no es evidencia. */
export function assertValidExecutionRecord(record: ExecutionRecord): void {
  for (const field of REQUIRED_FIELDS) {
    if (typeof record[field] !== 'string' || record[field].trim() === '') throw new InvalidExecutionRecordError(field, 'se espera una cadena no vacía')
  }
  for (const field of COUNT_FIELDS) {
    const value = record[field]
    if (value === undefined) continue
    if (!Number.isInteger(value) || (field !== 'exitCode' && value < 0)) throw new InvalidExecutionRecordError(field, `se espera un entero${field === 'exitCode' ? '' : ' no negativo'}, llegó ${value}`)
  }
  for (const field of ['startedAt', 'finishedAt'] as const) {
    const value = record[field]
    if (value !== undefined && Number.isNaN(Date.parse(value))) throw new InvalidExecutionRecordError(field, `se espera una fecha ISO 8601, llegó ${value}`)
  }
}

const FIELD_OF_COLUMN: Readonly<Record<(typeof EXECUTION_RECORD_COLUMNS)[number], keyof ExecutionRecord>> = {
  execution_id: 'executionId',
  reference: 'reference',
  kind: 'kind',
  task_id: 'taskId',
  batch_id: 'batchId',
  item_id: 'itemId',
  unit_id: 'unitId',
  container_id: 'containerId',
  container_name: 'containerName',
  image_ref: 'imageRef',
  artifact_id: 'artifactId',
  model_id: 'modelId',
  runtime: 'runtime',
  provider: 'provider',
  started_at: 'startedAt',
  finished_at: 'finishedAt',
  exit_code: 'exitCode',
  termination_reason: 'terminationReason',
  wall_ms: 'wallMs',
  cpu_ms: 'cpuMs',
  max_rss_bytes: 'maxRssBytes',
  vram_peak_mib: 'vramPeakMib',
  disk_bytes: 'diskBytes',
  network_bytes: 'networkBytes',
  qualification_id: 'qualificationId',
  verdict: 'verdict',
  attestation: 'attestation',
}

const TIMESTAMP_COLUMNS = new Set(['started_at', 'finished_at'])
const NUMERIC_COLUMNS = new Set(['exit_code', 'wall_ms', 'cpu_ms', 'max_rss_bytes', 'vram_peak_mib', 'disk_bytes', 'network_bytes'])

function parametersOf(dialect: Dialect, record: ExecutionRecord): unknown[] {
  return EXECUTION_RECORD_COLUMNS.map(column => {
    const value = record[FIELD_OF_COLUMN[column]]
    if (value === undefined) return null
    return column === 'attestation' ? jsonParam(dialect, value) : value
  })
}

function recordOf(row: Record<string, unknown>): StoredExecutionRecord {
  const fields: Record<string, unknown> = { recordedAt: readTimestamp(row.recorded_at) }
  for (const column of EXECUTION_RECORD_COLUMNS) {
    const value = row[column]
    if (value === null || value === undefined) continue
    const field = FIELD_OF_COLUMN[column]
    if (column === 'attestation') fields[field] = readJson(value)
    else if (TIMESTAMP_COLUMNS.has(column)) fields[field] = readTimestamp(value)
    else if (NUMERIC_COLUMNS.has(column)) fields[field] = Number(value)
    else fields[field] = value
  }
  return fields as unknown as StoredExecutionRecord
}

export interface ExecutionRecordStore {
  /** Aplica las migraciones pendientes; devuelve las versiones aplicadas. */
  migrate(): Promise<number[]>
  /** Escribe o completa la fila de una ejecución. */
  record(record: ExecutionRecord): Promise<void>
  /** La fila leída de vuelta, o `undefined` si la ejecución no está registrada. */
  get(executionId: string): Promise<StoredExecutionRecord | undefined>
}

export function executionRecordStore(sql: SQL, dialect: Dialect): ExecutionRecordStore {
  const upsert = upsertExecutionRecordQuery(dialect)
  return {
    migrate: () => runMigrations(sql, dialect, { table: EXECUTION_RECORDS_MIGRATIONS_TABLE, migrations: EXECUTION_RECORD_MIGRATIONS }),
    async record(record) {
      assertValidExecutionRecord(record)
      await sql.unsafe(upsert, parametersOf(dialect, record))
    },
    async get(executionId) {
      const rows = (await sql.unsafe(SELECT_EXECUTION_RECORD_QUERY, [executionId])) as Record<string, unknown>[]
      return rows[0] === undefined ? undefined : recordOf(rows[0])
    },
  }
}
