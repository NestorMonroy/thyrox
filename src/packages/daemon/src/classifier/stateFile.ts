/**
 * Lectura/escritura del archivo de estado por-worker + append al timeline.
 *
 * UN SOLO state.json — alineado con `ant 2.1.150`. ant mantiene UN solo
 * archivo de estado por job (`state.json`, ant `JJ8`/`xO`/`c7` @ 2514.js):
 * el clasificador, el worker, el daemon y FleetView leen/escriben el mismo
 * archivo. ccb solía partirlo en `state.json` (FleetJobState,
 * worker/FleetView) + un `classifier-state.json` separado (WorkerStateFile,
 * clasificador) — los dos nunca se sincronizaban, así que el `intent` vacío
 * del clasificador no arrasaba nada pero FleetView leía la vista del
 * clasificador de forma inconsistente y la etiqueta de fila "sesión actual"
 * nunca se actualizaba. Ahora el clasificador escribe el MISMO state.json
 * vía un merge que preserva los campos propios del worker
 * (intent/name/worktree/…) y sólo parcha los campos clasificados
 * (state/detail/tempo/needs/output).
 *
 * Layout (por worker `<short>`):
 *   ~/.claude/jobs/<short>/state.json     — la única fuente de verdad
 *   ~/.claude/jobs/<short>/timeline.jsonl — log de cambios de estado, sólo-apéndice
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/classifier/stateFile.ts`.
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  getJobDir,
  readJobStateSync,
  writeJobStateSync,
} from '../internal/pendingCrossPackageDeps.js'
import type {
  FleetJobState,
  FleetJobStatus,
  FleetTempo,
} from '../internal/pendingCrossPackageDeps.js'
import type { WorkerState, WorkerStateFile, WorkerTempo } from './state.js'

function getJobsRoot(): string {
  const root = process.env.CLAUDE_CONFIG_HOME
  return root ? join(root, 'jobs') : join(homedir(), '.claude', 'jobs')
}

function getTimelinePath(short: string): string {
  return join(getJobsRoot(), short, 'timeline.jsonl')
}

/** WorkerState tiene 'idle'/'crashed' que FleetJobStatus no tiene; se mapean. */
function toFleetStatus(s: WorkerState): FleetJobStatus {
  if (s === 'idle') return 'working'
  if (s === 'crashed') return 'failed'
  return s
}

/**
 * Lee el state.json único y lo presenta en la forma WorkerStateFile del
 * clasificador. Devuelve null cuando el state.json todavía no existe.
 */
export function readState(short: string): WorkerStateFile | null {
  const fleet = readJobStateSync(getJobDir(short))
  if (!fleet) return null
  return {
    state: fleet.state as WorkerState,
    detail: fleet.detail,
    tempo: fleet.tempo as WorkerTempo,
    needs: fleet.needs,
    output: fleet.output ?? undefined,
    classifySource:
      fleet.classifySource as WorkerStateFile['classifySource'],
    firstTerminalAt: fleet.firstTerminalAt ?? undefined,
    createdAt: fleet.createdAt,
    updatedAt: fleet.updatedAt,
    sessionId: fleet.sessionId,
    resumeSessionId: fleet.resumeSessionId,
    cliVersion: fleet.cliVersion,
    cwd: fleet.cwd,
    intent: fleet.intent,
    initialPrompt: fleet.initialPrompt,
    name: fleet.name,
    nameSource: fleet.nameSource,
    backend: fleet.backend,
    tokens: fleet.tokens,
  }
}

/**
 * Fusiona la vista del clasificador dentro del state.json único. Preserva
 * todos los campos propios del worker
 * (children/template/respawnFlags/worktree/daemonShort/…) y sólo parcha
 * los campos clasificados. Espeja ant `OEH`→`xO` (4292.js:36 → 2514.js:64):
 * un solo escritor, un solo archivo.
 *
 * `intent` usa `??` (NO `||`) para que un intent de string vacío en el
 * parcial entrante nunca arrase uno existente — coincide con ant `cb3:490`
 * `intent: k?.intent ?? M`.
 */
export function writeState(short: string, next: WorkerStateFile): void {
  const jobDir = getJobDir(short)
  const prev = readJobStateSync(jobDir)
  const now = next.updatedAt || new Date().toISOString()
  const merged: FleetJobState = {
    // campos estructurales propios del worker: se conserva prev, con default sano
    output: next.output ?? prev?.output ?? null,
    children: prev?.children ?? null,
    linkScanOffset: prev?.linkScanOffset ?? 0,
    template: prev?.template ?? 'bg',
    routine: prev?.routine,
    respawnFlags: prev?.respawnFlags ?? [],
    daemonShort: prev?.daemonShort ?? short,
    worktreePath: prev?.worktreePath,
    worktreeBranch: prev?.worktreeBranch,
    worktreeHookBased: prev?.worktreeHookBased,
    originCwd: prev?.originCwd,
    pinned: prev?.pinned,
    block: prev?.block,
    suggestedReply: prev?.suggestedReply,
    inFlight: prev?.inFlight,
    color: prev?.color,
    sortOrder: prev?.sortOrder,
    stateSortOrder: prev?.stateSortOrder,
    // campos clasificados: se parchan desde `next`
    state: toFleetStatus(next.state),
    tempo: next.tempo as FleetTempo,
    detail: next.detail,
    needs: next.needs,
    classifySource: next.classifySource,
    firstTerminalAt: next.firstTerminalAt ?? prev?.firstTerminalAt ?? null,
    // campos de identidad/semilla: nunca arrasan un valor existente no vacío
    intent: prev?.intent ?? next.intent ?? '',
    initialPrompt: prev?.initialPrompt ?? next.initialPrompt,
    name: prev?.name ?? next.name,
    nameSource: prev?.nameSource ?? (next.nameSource as FleetJobState['nameSource']),
    sessionId: next.sessionId ?? prev?.sessionId ?? '',
    resumeSessionId: next.resumeSessionId ?? prev?.resumeSessionId,
    cwd: next.cwd || prev?.cwd || '',
    cliVersion: next.cliVersion ?? prev?.cliVersion,
    tokens: next.tokens ?? prev?.tokens,
    backend: 'daemon',
    createdAt: prev?.createdAt ?? next.createdAt ?? now,
    updatedAt: now,
  }
  writeJobStateSync(jobDir, merged)
}

export function appendTimeline(
  short: string,
  entry: { at: string; state: string; detail: string; text?: string },
): void {
  try {
    mkdirSync(join(getJobsRoot(), short), { recursive: true, mode: 0o700 })
    appendFileSync(getTimelinePath(short), JSON.stringify(entry) + '\n', {
      mode: 0o600,
    })
  } catch {
    // best-effort
  }
}
