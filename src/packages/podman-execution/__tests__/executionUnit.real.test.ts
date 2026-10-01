/**
 * La frontera de ejecución de extremo a extremo (ADR-THYROX-007, enmienda
 * 1.16.0, TASK-THYROX-0745): una tarea completa sobre un repositorio recién
 * creado —crear el banco, escribir archivos, correr una prueba que falla,
 * modificar el código, correrla en verde, dejar evidencia y commitear—, con
 * cada paso materializado por `runExecution`.
 *
 * Mientras trabaja, cada paso muestrea el cgroup de cada proceso que existe
 * en su espacio de PIDs. La prueba exige que todos pertenezcan al contenedor
 * que la primitiva creó para ESE paso: el id que `podman create` imprimió.
 *
 * Su sujeto es Podman, así que corre en el plano de control: dentro de una
 * ExecutionUnit no hay Podman, y darle uno abriría la frontera que prueba.
 *
 * Métrica: el `libpod-<id>` de `/proc/<pid>/cgroup` de cada proceso
 * muestreado contra el id de creación de su paso; los archivos y el commit
 * que quedan en el árbol del anfitrión.
 * Ciega a: un proceso que nazca y muera entre dos muestras consecutivas
 * (el muestreador no duerme ni bifurca), y a Podman rootless.
 */

import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runExecution, type ExecutionAuthorization, type ExecutionKind } from '../executionAuthorization.js'
import { DEFAULT_EXECUTION_IMAGE } from '../executionCommand.js'
import { imageExists } from '../imageStore.js'
import { createPodmanExecutor } from '../podmanExecutor.js'

const TASK = 'TASK-THYROX-0745'
const WORKBENCH = '.claude/workbench/e2e'
const CGROUP_LOG = `${WORKBENCH}/cgroups.tsv`
const REAL_TEST_TIMEOUT_MS = 180_000
/** PF_EXITING (`include/linux/sched.h`): el proceso ya entró en do_exit y su cgroup se desligó. */
const PF_EXITING = 0x4

function isExiting(flags: string | undefined): boolean {
  return (Number(flags) & PF_EXITING) !== 0
}

const podman = createPodmanExecutor()
const image = process.env.THYROX_EXEC_IMAGE ?? DEFAULT_EXECUTION_IMAGE

async function podmanReady(): Promise<boolean> {
  try {
    const version = await podman.run(['version', '--format', '{{.Client.Version}}'])
    return version.exitCode === 0 && (await imageExists(podman, image))
  } catch {
    return false
  }
}

const available = await podmanReady()
if (!available) console.error(`executionUnit.real: sin Podman o sin la imagen ${image}; sin medir.`)

const repository = mkdtempSync(join(tmpdir(), 'thyrox-exec-e2e-'))
afterAll(() => rmSync(repository, { recursive: true, force: true }))

/**
 * Antes del trabajo arranca un muestreador que registra, cada 20 ms, el
 * paso, el comando y el cgroup de cada proceso visible; al terminar el
 * trabajo lo detiene y toma una última muestra.
 */
function sampled(step: string, work: string): string {
  return [
    'set -uo pipefail',
    `mkdir -p ${WORKBENCH}`,
    // Sólo builtins de bash: una muestra no bifurca, así que alcanza a procesos de milisegundos.
    // Un proceso que ya está saliendo (PF_EXITING en el campo 9 de stat) tiene el cgroup
    // desligado por el kernel y se lee `/`: se registran sus banderas para que la prueba
    // lo excluya nombrándolo, no en silencio.
    `sample() { for p in /proc/[0-9]*; do read -r c < "$p/cgroup" 2>/dev/null || continue; read -r n < "$p/comm" 2>/dev/null || continue; read -r -a f < "$p/stat" 2>/dev/null || continue; printf '%s\\t%s\\t%s\\t%s\\n' '${step}' "$n" "\${c##*/}" "\${f[8]}"; done >> ${CGROUP_LOG}; }`,
    '( while :; do sample; done ) & sampler=$!',
    `( ${work} ); status=$?`,
    'kill "$sampler" 2>/dev/null; wait "$sampler" 2>/dev/null',
    'sample',
    'exit "$status"',
  ].join('\n')
}

function authorization(step: string, kind: ExecutionKind, work: string): ExecutionAuthorization {
  return {
    executionId: `e2e-${step}-${process.pid}-${Date.now().toString(36)}`,
    task: TASK,
    owner: { kind: 'task', id: TASK.toLowerCase(), pid: process.pid },
    kind,
    image,
    command: ['bash', '-c', sampled(step, work)],
    workdir: repository,
    mounts: [{ source: repository, destination: repository, mode: 'rw' }],
    resources: { cpus: 2, memoryMib: 2048, pidsLimit: 1024 },
    network: 'none',
    environment: {
      GIT_AUTHOR_NAME: 'e2e',
      GIT_AUTHOR_EMAIL: 'e2e@example.invalid',
      GIT_COMMITTER_NAME: 'e2e',
      GIT_COMMITTER_EMAIL: 'e2e@example.invalid',
    },
  }
}

type Step = { name: string; kind: ExecutionKind; work: string; expectedExit: number }

const STEPS: Step[] = [
  {
    name: 'workbench',
    kind: 'workbench',
    work: `git init -q -b main && printf '# e2e\\n' > ${WORKBENCH}/spec.md`,
    expectedExit: 0,
  },
  {
    name: 'write',
    kind: 'workbench',
    work: [
      'mkdir -p src',
      "printf 'export function sum(a: number, b: number): number {\\n  return a - b\\n}\\n' > src/sum.ts",
      "printf \"import { expect, test } from 'bun:test'\\nimport { sum } from './sum.ts'\\ntest('sum', () => expect(sum(2, 3)).toBe(5))\\n\" > src/sum.test.ts",
    ].join(' && '),
    expectedExit: 0,
  },
  { name: 'red', kind: 'test', work: 'bun test src/sum.test.ts', expectedExit: 1 },
  { name: 'modify', kind: 'workbench', work: "sed -i 's/a - b/a + b/' src/sum.ts", expectedExit: 0 },
  { name: 'green', kind: 'test', work: 'bun test src/sum.test.ts', expectedExit: 0 },
  { name: 'evidence', kind: 'workbench', work: `printf 'red then green\\n' > ${WORKBENCH}/evidence.md`, expectedExit: 0 },
  { name: 'finalize', kind: 'maintenance', work: 'git add -A && git commit -q -m "Finish the e2e task" && git log -1 --format=%s', expectedExit: 0 },
]

function cgroupRows(): string[][] {
  return readFileSync(join(repository, CGROUP_LOG), 'utf8').trim().split('\n').map(line => line.split('\t'))
}

describe.skipIf(!available)('una tarea completa corre dentro de unidades de la primitiva', () => {
  const identities = new Map<string, string>()
  const exits = new Map<string, number>()
  let finalizeOutput = ''

  test(
    'cada paso se materializa y termina con su veredicto',
    async () => {
      for (const step of STEPS) {
        const result = await runExecution(podman, authorization(step.name, step.kind, step.work))
        identities.set(step.name, result.containerId)
        exits.set(step.name, result.exitCode)
        if (step.name === 'finalize') finalizeOutput = result.stdout
      }
      for (const step of STEPS) expect(`${step.name}=${exits.get(step.name)}`).toBe(`${step.name}=${step.expectedExit}`)
      expect(new Set(identities.values()).size).toBe(STEPS.length)
    },
    REAL_TEST_TIMEOUT_MS,
  )

  test('cada proceso muestreado vive en el cgroup del contenedor de su paso', () => {
    const rows = cgroupRows()
    for (const step of STEPS) {
      const own = rows.filter(row => row[0] === step.name && !isExiting(row[3]))
      expect(own.length).toBeGreaterThan(0)
      const foreign = own.filter(row => !(row[2] ?? '').startsWith(`libpod-${identities.get(step.name)}`))
      expect(foreign).toEqual([])
    }
  })

  test('el trabajo de cada paso se observó dentro de su unidad', () => {
    const commands = (step: string) => new Set(cgroupRows().filter(row => row[0] === step).map(row => row[1]))
    expect(commands('red').has('bun')).toBe(true)
    expect(commands('green').has('bun')).toBe(true)
    expect(commands('finalize').has('git')).toBe(true)
  })

  test('las mutaciones llegaron al árbol del anfitrión y el commit lo cierra', () => {
    expect(readFileSync(join(repository, 'src/sum.ts'), 'utf8')).toContain('a + b')
    expect(readFileSync(join(repository, WORKBENCH, 'evidence.md'), 'utf8')).toBe('red then green\n')
    expect(finalizeOutput.trim()).toBe('Finish the e2e task')
  })
})
