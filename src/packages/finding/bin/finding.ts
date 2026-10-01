#!/usr/bin/env bun
/**
 * `bin/finding` — el registro de hallazgos desde la línea de comando.
 *
 *   finding rst <ID> [--resolved-in repo@hash] [--body archivo] [--store S]
 *   finding index <ID>... [--store S]
 *   finding publish <plan.tsv> --run-dir D [--name N] [--dry-run] [--store S]
 *
 * `rst` escribe el documento desde su fila (exit 1 si ya existe). `index`
 * añade las entradas al índice de la iniciativa; es el único escritor de ese
 * archivo. `publish` lee un plan —una línea por hallazgo:
 * `ID<TAB>repo@hash|-<TAB>cuerpo`— y lanza los renders en `run-task-pool` bajo
 * `thyrox-bg`, con el índice como trabajo dependiente (`--after-ok`) de
 * `wait-jobs`. No bloquea: se recoge con `wait-jobs wait` en segundo plano.
 *
 * Un identificador que el store no tiene sale 2 sin escribir nada, también en
 * `publish`, que comprueba todas las filas antes de lanzar ninguno.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { storePath } from '@thyrox/observability/store'
import {
  addToInitiativeIndex,
  buildPublishPlan,
  type PublishEntry,
  readFindingRecord,
  writeFinding,
} from '../index.ts'

const THYROX_ROOT = process.env.THYROX_ROOT ?? resolve(import.meta.dir, '..', '..', '..', '..')

function option(args: string[], name: string): string | undefined {
  const at = args.indexOf(name)
  if (at < 0) return undefined
  const value = args[at + 1]
  args.splice(at, 2)
  return value
}

function flag(args: string[], name: string): boolean {
  const at = args.indexOf(name)
  if (at >= 0) args.splice(at, 1)
  return at >= 0
}

function fail(message: string, code: number): never {
  process.stderr.write(`finding: ${message}\n`)
  process.exit(code)
}

const [command, ...args] = process.argv.slice(2)
const store = option(args, '--store') ?? storePath()

function recordOrFail(id: string) {
  return readFindingRecord(store, id) ?? fail(`${id} no está en el store (${store}); nada escrito.`, 2)
}

switch (command) {
  case 'rst': {
    const resolvedIn = option(args, '--resolved-in')
    const bodyFile = option(args, '--body')
    const [id] = args
    if (!id) fail('rst <ID>', 2)
    const record = recordOrFail(id)
    const written = writeFinding(record, { resolvedIn, body: bodyFile ? readFileSync(bodyFile, 'utf8') : undefined })
    if (written === null) fail(`${id}: el documento ya existe; no se regenera encima.`, 1)
    console.log(written)
    break
  }
  case 'index': {
    if (args.length === 0) fail('index <ID>...', 2)
    const records = args.map(recordOrFail)
    for (const record of records) {
      console.log(`${record.findingId}: ${addToInitiativeIndex(record) ? 'entrada añadida' : 'ya estaba'}`)
    }
    break
  }
  case 'publish': {
    const runDir = option(args, '--run-dir')
    const name = option(args, '--name') ?? 'findings'
    const dryRun = flag(args, '--dry-run')
    const [planFile] = args
    if (!planFile || !runDir) fail('publish <plan.tsv> --run-dir D', 2)
    const entries: PublishEntry[] = readFileSync(planFile, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [id, resolvedIn, body] = line.split('\t')
        return { id: id!, resolvedIn: resolvedIn && resolvedIn !== '-' ? resolvedIn : undefined, body: body || undefined }
      })
    for (const entry of entries) recordOrFail(entry.id)
    const plan = buildPublishPlan(entries, { runDir: resolve(runDir), name })
    mkdirSync(resolve(runDir), { recursive: true })
    writeFileSync(join(resolve(runDir), 'render.jobs'), plan.jobs.map(job => `${job}\n`).join(''))
    for (const step of plan.steps) {
      console.log(step.join(' '))
      if (dryRun) continue
      const result = Bun.spawnSync(step, { cwd: THYROX_ROOT, stdout: 'inherit', stderr: 'inherit' })
      if (result.exitCode !== 0) fail(`el paso salió ${result.exitCode}: ${step.join(' ')}`, 1)
    }
    break
  }
  default:
    fail('uso: finding rst|index|publish …', 2)
}
