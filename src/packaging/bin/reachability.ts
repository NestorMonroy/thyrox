#!/usr/bin/env bun
/**
 * CLI de la matriz de alcance por entrypoint (ADR-010, P6).
 *
 *   bun src/packaging/bin/reachability.ts           imprime la matriz medida
 *   bun src/packaging/bin/reachability.ts --write   reescribe la matriz versionada
 *   bun src/packaging/bin/reachability.ts --check   0 al día · 1 difiere · 2 no pudo medir
 *
 * Los wrappers TypeScript salen de `generate_bin.py --typescript-entrypoints`:
 * esa es su única definición. Lo que no resuelve se publica por stderr; un
 * fallo de medición sale 2 sin emitir la matriz ni ninguna cifra.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { entrypointsOf, measure, renderMatrix, type Measurement } from '../reachability.ts'

const EXIT_DIFFERS = 1
const EXIT_UNMEASURED = 2
const ROOT = resolve(import.meta.dir, '..', '..', '..')
const MATRIX_FILE = join(ROOT, 'src', 'packaging', 'reachability-matrix.tsv')
const GENERATOR = join(ROOT, 'bin', 'generate_bin')

class MeasurementError extends Error {}

function typescriptWrappers(): Map<string, string> {
  const run = Bun.spawnSync(['bash', GENERATOR, '--typescript-entrypoints'], { cwd: ROOT, stdin: 'ignore' })
  if (run.exitCode !== 0) {
    throw new MeasurementError(`${GENERATOR} salió ${run.exitCode}: ${run.stderr.toString().trim()}`)
  }
  const lines = run.stdout.toString().split('\n').filter(line => line !== '')
  if (lines.length === 0) throw new MeasurementError(`${GENERATOR} no listó ningún entrypoint TypeScript`)
  return new Map(lines.map(line => line.split('\t', 2) as [string, string]))
}

function reportUnresolved(measurement: Measurement): void {
  for (const item of measurement.unresolved) {
    console.error(`sin resolver: ${item.from}: ${item.specifier} (${item.reason})`)
  }
}

function measuredMatrix(): string {
  const measurement = measure(ROOT, entrypointsOf(ROOT, typescriptWrappers()))
  reportUnresolved(measurement)
  return renderMatrix(measurement.rows)
}

function checkMatrix(matrix: string): number {
  const versioned = existsSync(MATRIX_FILE) ? readFileSync(MATRIX_FILE, 'utf8') : ''
  if (versioned === matrix) {
    console.log(`matriz al día: ${MATRIX_FILE}`)
    return 0
  }
  console.error(`matriz DESACTUALIZADA: ${MATRIX_FILE}`)
  console.error('  corre: bash bin/packaging-reachability --write')
  return EXIT_DIFFERS
}

function run(args: readonly string[]): number {
  let matrix: string
  try {
    matrix = measuredMatrix()
  } catch (error) {
    console.error(`no se pudo medir el alcance: ${error instanceof Error ? error.message : String(error)}`)
    return EXIT_UNMEASURED
  }
  if (args.includes('--check')) return checkMatrix(matrix)
  if (args.includes('--write')) {
    writeFileSync(MATRIX_FILE, matrix)
    console.log(`escrita: ${MATRIX_FILE}`)
    return 0
  }
  process.stdout.write(matrix)
  return 0
}

process.exitCode = run(process.argv.slice(2))
