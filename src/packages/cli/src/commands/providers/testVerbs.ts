/**
 * Los verbos de prueba de `thyrox providers`: `test` prueba una conexión,
 * `test-all` todas las activas y `validate` revisa las filas sin red. Un
 * veredicto real se guarda en la fila; uno saltado no, para no pisar un estado
 * bueno. `test-all` falla sólo si alguna prueba real falló.
 *
 * Porte de `runTestCommand`, `runTestAllCommand` y `runValidateCommand` en
 * `omniroute: bin/cli/commands/providers.mjs` (MIT), sin el encabezado ni el
 * color de su salida de texto.
 */
import { testConnection, testResultUpdate, validateConnection, type ConnectionTestDeps, type ConnectionTestOutcome } from '@thyrox/provider/accounts/connectionTest'

import { hasFlag } from '../../entry/flags.ts'
import { EXIT_FAIL, EXIT_OK } from '../../exitCodes.ts'
import { resolveConnection } from './connectionSelector.ts'
import { publicConnection } from './publicConnection.ts'

type Row = Record<string, unknown>

export interface TestVerbDeps {
  store: { list(): Row[]; update(id: string, fields: Row): unknown }
  testDeps: ConnectionTestDeps
  now: () => string
  write: (text: string) => void
}

type TestReport = { connection: Row; valid: boolean; error: string | null; statusCode?: number | null; skipped: boolean }

async function testAndRecord(row: Row, deps: TestVerbDeps): Promise<TestReport> {
  const { persist, ...outcome }: ConnectionTestOutcome = await testConnection(row, deps.testDeps)
  if (persist) deps.store.update(String(row.id), testResultUpdate(outcome, deps.now()))
  return { connection: publicConnection(row), ...outcome }
}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

export async function runTestVerb(args: string[], deps: TestVerbDeps): Promise<number> {
  const selector = args.find(arg => !arg.startsWith('--'))
  if (!selector) {
    deps.write('Provider id or name is required.\n')
    return EXIT_FAIL
  }
  let row: Row | null
  try {
    row = resolveConnection(deps.store.list(), selector)
  } catch (error) {
    deps.write(`${error instanceof Error ? error.message : String(error)}\n`)
    return EXIT_FAIL
  }
  if (!row) {
    deps.write(`Provider connection not found: ${selector}\n`)
    return EXIT_FAIL
  }
  const report = await testAndRecord(row, deps)
  deps.write(hasFlag(args, 'json') ? json(report) : report.valid ? `OK ${String(row.name)}: provider test passed\n` : `FAIL ${String(row.name)}: ${report.error}\n`)
  return report.valid ? EXIT_OK : EXIT_FAIL
}

export async function runTestAllVerb(args: string[], deps: TestVerbDeps): Promise<number> {
  const results: TestReport[] = []
  for (const row of deps.store.list()) {
    if (row.isActive === false) results.push({ connection: publicConnection(row), valid: false, error: 'Connection is inactive', skipped: true })
    else results.push(await testAndRecord(row, deps))
  }
  if (hasFlag(args, 'json')) deps.write(json({ results }))
  else {
    for (const result of results) {
      const label = result.valid ? 'OK' : result.skipped ? 'SKIP' : 'FAIL'
      deps.write(`${label} ${String(result.connection.name)}: ${result.valid ? 'provider test passed' : result.error}\n`)
    }
  }
  return results.some(result => !result.valid && !result.skipped) ? EXIT_FAIL : EXIT_OK
}

export function runValidateVerb(args: string[], deps: Pick<TestVerbDeps, 'store' | 'write'>): number {
  const results = deps.store.list().map(row => ({ connection: publicConnection(row), ...validateConnection(row) }))
  if (hasFlag(args, 'json')) deps.write(json({ results }))
  else if (results.length === 0) deps.write('No providers configured.\n')
  else {
    for (const result of results) {
      const messages = [...result.issues, ...result.warnings].join('; ')
      deps.write(`${result.valid ? 'OK' : 'FAIL'} ${String(result.connection.name)}${messages ? `: ${messages}` : ''}\n`)
    }
  }
  return results.some(result => !result.valid) ? EXIT_FAIL : EXIT_OK
}
