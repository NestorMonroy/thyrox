/**
 * T001 RED/GREEN de deriva: corre el `ensureResource` de la primitiva contra el
 * estado OBSERVADO de thyrox-postgres (capturado por el plano de control) con
 * un Podman de repetición. Las lecturas responden desde la captura; cualquier
 * mutación sólo se registra, no hay Podman dentro de la unidad. Nada durable se
 * puede tocar. Corre dentro de una unidad, con la contraseña como secreto.
 *
 * Uso: bun drift_replay.ts <desired.json> <container.json> <secret-digest> <correct|wrong-volume>
 */
import { readFileSync } from 'node:fs'
import type { DesiredResource } from '../../../../src/packages/podman-execution/resourceMaterialization'
import { bootstrapInfrastructure, parseInfrastructureDeclarations } from '../../../../src/packages/infrastructure/infrastructureBootstrap'

const [desiredFile, containerFile, secretDigest, mode] = process.argv.slice(2)
const [desired] = parseInfrastructureDeclarations(`[${readFileSync(desiredFile, 'utf8')}]`) as unknown as DesiredResource[]
const containerJson = readFileSync(containerFile, 'utf8')
const [observed] = JSON.parse(containerJson) as { State: { Running: boolean }; Mounts: { Type: string; Name: string }[] }[]
const existingVolumes = new Set(observed.Mounts.filter(m => m.Type === 'volume').map(m => m.Name))
const declared: DesiredResource = mode === 'wrong-volume'
  ? { ...desired, namedVolumes: (desired.namedVolumes ?? []).map(v => ({ ...v, volume: `${v.volume}-drift-control` })) }
  : desired
const mutations: string[] = []
const ok = (stdout = '') => ({ exitCode: 0, stdout, stderr: '' })
const podman = {
  async run(args: readonly string[]) {
    const [verb, sub] = args
    if (verb === 'container' && sub === 'inspect') return ok(containerJson)
    if (verb === 'network' && sub === 'exists') return ok()
    if (verb === 'volume' && sub === 'exists') return existingVolumes.has(args[2]) ? ok() : { exitCode: 1, stdout: '', stderr: '' }
    if (verb === 'secret' && sub === 'inspect') return ok(`${secretDigest}\n`)
    mutations.push(args.slice(0, 2).join(' '))
    return ok()
  },
}
const report = await bootstrapInfrastructure({ podman: podman as never, isProcessAlive: () => observed.State.Running, sleep: async () => {} },
  [declared as never], process.env, process.pid)
const [outcome] = report.outcomes
if (!outcome) { console.error(report.problems.join('\n')); process.exit(2) }
const destructive = mutations.filter(m => /^(rm|create|volume create|start)\b/.test(m))
console.log(JSON.stringify({ mode, action: outcome.action, drift: outcome.drift, destructiveWouldRun: destructive,
  mutationsRecordedNotExecuted: mutations }))
