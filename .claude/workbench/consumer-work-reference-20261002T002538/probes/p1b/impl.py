from pathlib import Path
def patch(path, pairs):
    p = Path(path); s = p.read_text()
    for old, new in pairs:
        assert s.count(old) == 1, (path, old[:70])
        s = s.replace(old, new)
    p.write_text(s)

A = 'src/packages/podman-execution/executionAuthorization.ts'
patch(A, [
("""const REFERENCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/
""",
"""const REFERENCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/
/** El consumidor que cita su propio trabajo: un nombre corto en minúsculas. */
export const WORK_CONSUMER_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/
/** El id de trabajo del consumidor, tal como él lo versiona; admite `/` para rutas de su ledger. */
export const WORK_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:\\/-]{0,199}$/
"""),
("""/** Lo que autoriza la ejecución: la tarea, el grant de modelo o el recurso de infraestructura. */
export type ExecutionReference =
  | { kind: 'task'; citation: string }""",
"""/**
 * Lo que autoriza la ejecución: la tarea, el trabajo de un consumidor, el
 * grant de modelo o el recurso de infraestructura. `work` es la identidad
 * durable que un consumidor versiona en su propio ledger (un lote, una unidad
 * de traducción): thyrox la cita sin convertirla en una TASK suya.
 */
export type ExecutionReference =
  | { kind: 'task'; citation: string }
  | { kind: 'work'; consumer: string; workId: string }"""),
("""  if (reference.kind === 'task') return `task:${reference.citation}`
""",
"""  if (reference.kind === 'task') return `task:${reference.citation}`
  if (reference.kind === 'work') return `work:${reference.consumer}:${reference.workId}`
"""),
("""  const expected = expectedReferenceKind(kind)
  if (reference.kind !== expected) refuse('reference', `una ejecución ${kind} se autoriza por ${expected}, recibido: ${reference.kind}`)
""",
"""  const expected = expectedReferenceKind(kind)
  const accepted = expected === 'task' && reference.kind === 'work'
  if (reference.kind !== expected && !accepted) refuse('reference', `una ejecución ${kind} se autoriza por ${expected}, recibido: ${reference.kind}`)
  if (reference.kind === 'work') return requireWorkReference(reference)
"""),
("""function requireOwner(owner: ContainerOwner): void {""",
"""/** El consumidor y su id, cada uno en su forma; un segmento `..` no es un id de trabajo. */
function requireWorkReference(reference: { consumer: string; workId: string }): void {
  if (!WORK_CONSUMER_PATTERN.test(reference.consumer)) refuse('reference', `consumidor inválido: ${reference.consumer}`)
  if (!WORK_ID_PATTERN.test(reference.workId) || reference.workId.split('/').includes('..')) {
    refuse('reference', `id de trabajo inválido: ${reference.workId}`)
  }
}

function requireOwner(owner: ContainerOwner): void {"""),
])

C = 'src/packages/podman-execution/executionCommand.ts'
patch(C, [
("""  'uso: podman-execution-execute run --task TASK-<CAPA>-NNNN --kind <tipo> [--image REF] [--network none|host]',""",
"""  'uso: podman-execution-execute run (--task TASK-<CAPA>-NNNN | --work CONSUMIDOR:ID) [--owner pool:ID] --kind <tipo> [--image REF] [--network none|host]',"""),
("""      task: { type: 'string' },
      kind: { type: 'string' },
      image: { type: 'string' },""",
"""      task: { type: 'string' },
      work: { type: 'string' },
      owner: { type: 'string' },
      kind: { type: 'string' },
      image: { type: 'string' },"""),
("""  const task = requireValue(values.task, 'task')
  const kind = requireValue(values.kind, 'kind') as ExecutionKind
  const secretNames""",
"""  const reference = referenceOf(values.task, values.work)
  const kind = requireValue(values.kind, 'kind') as ExecutionKind
  const secretNames"""),
("""    reference: { kind: 'task', citation: task },
    owner: { kind: 'task', id: task.toLowerCase(), pid: deps.pid },""",
"""    reference,
    owner: ownerOf(values.owner, reference, deps.pid),"""),
("""  deps.output.stderr(`execution ${result.containerName} kind=${kind} task=${task} exit=${result.exitCode}\\n`)
  return result.exitCode
}
""",
"""  deps.output.stderr(`execution ${result.containerName} kind=${kind} ${referenceText(reference)} exit=${result.exitCode}\\n`)
  return result.exitCode
}

/** `--task` o `--work CONSUMIDOR:ID`, uno solo: el consumidor cita su trabajo sin volverlo una TASK de thyrox. */
function referenceOf(task: string | undefined, work: string | undefined): ExecutionReference {
  if ((task === undefined) === (work === undefined)) throw new UsageError('declara --task o --work, uno solo')
  if (task !== undefined) return { kind: 'task', citation: task }
  const separator = work!.indexOf(':')
  if (separator <= 0) throw new UsageError(`--work va CONSUMIDOR:ID, recibido: ${work}`)
  return { kind: 'work', consumer: work!.slice(0, separator), workId: work!.slice(separator + 1) }
}

/** El dueño por defecto es la propia referencia; por línea de orden sólo se declara un dueño `pool`. */
function ownerOf(declared: string | undefined, reference: ExecutionReference, pid: number): ContainerOwner {
  if (declared !== undefined) {
    const [kind, id] = [declared.slice(0, declared.indexOf(':')), declared.slice(declared.indexOf(':') + 1)]
    if (kind !== POOL_OWNER_KIND || !id) throw new UsageError(`--owner va pool:ID, recibido: ${declared}`)
    return { kind: POOL_OWNER_KIND, id, pid }
  }
  if (reference.kind === 'task') return { kind: 'task', id: reference.citation.toLowerCase(), pid }
  if (reference.kind === 'work') return { kind: 'task', id: `${reference.consumer}.${reference.workId}`.replace(/[^A-Za-z0-9_.-]/g, '-'), pid }
  throw new UsageError(`una ejecución por línea de orden no se autoriza por ${reference.kind}`)
}

function referenceText(reference: ExecutionReference): string {
  return reference.kind === 'task' ? `task=${reference.citation}` : reference.kind === 'work' ? `work=${reference.consumer}:${reference.workId}` : reference.kind
}
"""),
("""import { runExecution, InvalidExecutionAuthorizationError, type ExecutionAuthorization, type ExecutionKind, type ExecutionSecret } from './executionAuthorization.js'""",
"""import { runExecution, InvalidExecutionAuthorizationError, type ExecutionAuthorization, type ExecutionKind, type ExecutionReference, type ExecutionSecret } from './executionAuthorization.js'"""),
])
s = Path(C).read_text()
if "type ContainerOwner" not in s:
    s = s.replace("import { retireOrphanedWorkerContainers } from './workerContainerLifecycle.js'",
                  "import { retireOrphanedWorkerContainers, type ContainerOwner } from './workerContainerLifecycle.js'", 1)
s = s.replace("const PROXY_CA_KEY = 'GIT_SSL_CAINFO'", "const PROXY_CA_KEY = 'GIT_SSL_CAINFO'\nconst POOL_OWNER_KIND = 'pool'", 1)
Path(C).write_text(s)
print("ok")
