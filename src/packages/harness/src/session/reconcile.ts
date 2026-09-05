/**
 * Reconciliación de estado tras un reinicio del worker (bloque 21, T-089..T-093).
 *
 * El worker de una sesión puede morir en medio de un turno —medido en esta
 * sesión: época 247, `Exit code 137`, prompt sintético del SDK—. El binario
 * reconcilia doce capas de estado al reanudar
 * (:ref:`analisis-reanudacion-y-reconciliacion-en-el-binario`); nuestro harness
 * reanudaba la conversación con `readTranscript` lineal y nada más. Este módulo
 * porta las capas que un harness propio puede reconstruir sin el mecanismo de
 * proceso del cliente, cada una con la forma de su gemelo en fuente
 * (:ref:`analisis-reanudacion-y-reconciliacion-en-la-referencia`, `ccnmt`).
 *
 * Lo que NO se porta y por qué: el prompt sintético (`Vmt`) lo inyecta el SDK
 * desde fuera en la sesión remota —las tres `CLAUDE_CODE_RESUME_*` están sin
 * asignar y el texto no está en el binario—; los permisos parqueados no aplican
 * sin ejecución multi-proceso.
 */
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import type { Message, ContentBlock } from '../types.ts'
import type { TranscriptLine } from '../transcript.ts'
import { renderAttachment, survivesResume } from '../context/attachments.ts'

export type LastTurn = 'none' | 'interrupted_turn' | 'interrupted_prompt'

/**
 * Herramientas cuyo `tool_result` CIERRA el turno en vez de interrumpirlo.
 *
 * Es el guardia de modo breve de `ccnmt: conversationRecovery.tsx:316`: sin él,
 * una sesión que termina legítimamente en el `tool_result` de una de estas
 * herramientas se clasificaría como interrumpida y se inyectaría un
 * «Continue from where you left off.» fantasma. `TodoWrite` es nuestro
 * equivalente sembrado; el set crece si el harness gana una herramienta que
 * responde al usuario como acto final del turno.
 */
export const TERMINAL_TOOLS = new Set<string>(['SendUserMessage', 'TodoWrite'])

/** Lee las líneas del transcript en crudo (todas las clases), saltando basura. */
export function readTranscriptLines(path: string): TranscriptLine[] {
  if (!existsSync(path)) return []
  const out: TranscriptLine[] = []
  for (const linea of readFileSync(path, 'utf8').split('\n')) {
    if (!linea.trim()) continue
    try {
      out.push(JSON.parse(linea) as TranscriptLine)
    } catch {
      continue
    }
  }
  return out
}

/** Los bloques de contenido de una línea, o `[]` si no es un mensaje. */
function bloquesDe(l: TranscriptLine): ContentBlock[] {
  return Array.isArray(l.message?.content) ? (l.message!.content as ContentBlock[]) : []
}

/**
 * ¿Qué estaba pasando cuando el proceso murió? — el `pSn`/`detectTurnInterruption`
 * de nuestro árbol.
 *
 * Busca hacia atrás el último mensaje que NO sea `system` ni `progress`
 * —registro lateral que no debe enmascarar una interrupción— y decide:
 *
 * - `assistant` → `none`: en el camino de streaming el `stop_reason` siempre
 *   es null en disco, así que un `assistant` como último es un turno que muy
 *   probablemente cerró.
 * - `user` de texto plano → `interrupted_prompt`: el prompt entró y nadie
 *   respondió.
 * - `user` con `tool_result` → `interrupted_turn`, SALVO que el `tool_use` que
 *   lo originó sea de una herramienta terminal (guardia de modo breve).
 * - `attachment` → `interrupted_turn`: contexto sin respuesta.
 */
export function classifyLastTurn(lines: TranscriptLine[]): LastTurn {
  let idx = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i]!.type
    if (t !== 'system' && t !== 'progress') { idx = i; break }
  }
  if (idx === -1) return 'none'
  const l = lines[idx]!
  if (l.type === 'assistant') return 'none'
  if (l.type === 'attachment') return 'interrupted_turn'
  if (l.type === 'user') {
    const bloques = bloquesDe(l)
    const result = bloques.find((b) => b.type === 'tool_result') as Extract<ContentBlock, { type: 'tool_result' }> | undefined
    if (result) {
      // El guardia: ¿la herramienta que originó este resultado es terminal?
      // Se busca el `tool_use` con el mismo id hacia atrás.
      for (let j = idx - 1; j >= 0; j--) {
        const uso = bloquesDe(lines[j]!).find(
          (b) => b.type === 'tool_use' && (b as Extract<ContentBlock, { type: 'tool_use' }>).id === result.tool_use_id,
        ) as Extract<ContentBlock, { type: 'tool_use' }> | undefined
        if (uso) return TERMINAL_TOOLS.has(uso.name) ? 'none' : 'interrupted_turn'
      }
      return 'interrupted_turn'
    }
    return 'interrupted_prompt'
  }
  return 'none'
}

/**
 * Retira los `tool_use` sin su `tool_result` — el `gEe` de nuestro árbol.
 *
 * Un `assistant` que pidió una herramienta y murió antes del resultado deja un
 * `tool_use` sin par, y el API rechaza esa forma. Se recorre el contenido
 * directamente y se quitan esos bloques; un `assistant` que queda sin bloques
 * se elimina. **No se re-normaliza nada**: `Message` no lleva uuid, que es
 * exactamente lo que evita el bug de crecimiento exponencial del transcript
 * que `ccnmt: agent/messages.ts:2873` documenta.
 */
export function filterUnresolvedToolUses(messages: Message[]): Message[] {
  const resueltos = new Set<string>()
  for (const m of messages) {
    for (const b of m.content) {
      if (b.type === 'tool_result') resueltos.add(b.tool_use_id)
    }
  }
  const out: Message[] = []
  for (const m of messages) {
    const content = m.content.filter(
      (b) => !(b.type === 'tool_use' && !resueltos.has(b.id)),
    )
    if (content.length > 0) out.push({ role: m.role, content })
  }
  return out
}

/**
 * Los mensajes reanudables: sólo los turnos DESPUÉS de la última
 * `compact_boundary` (T-091).
 *
 * `readTranscript` devuelve hoy todas las líneas `user`/`assistant`, incluidas
 * las anteriores a una compactación: reanudar así reintroduce el contexto que
 * se compactó. El binario reanuda desde la última frontera (`CEt`+`Pts`); esto
 * es esa lectura.
 */
export function resumableMessages(lines: TranscriptLine[]): Message[] {
  let desde = 0
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i]!.type === 'system' && lines[i]!.subtype === 'compact_boundary') { desde = i + 1; break }
  }
  const out: Message[] = []
  for (let i = desde; i < lines.length; i++) {
    const l = lines[i]!
    if ((l.type === 'user' || l.type === 'assistant') && Array.isArray(l.message?.content)) {
      out.push({ role: l.type, content: l.message!.content })
      continue
    }
    // #37: un `attachment` de contexto de hook de turnos pasados vuelve como
    // payload, en su posición. El andamiaje de sesión NO —lo re-renderiza la
    // sesión nueva (`survivesResume`)—.
    if (l.type === 'attachment' && l.attachment && survivesResume(l.attachment)) {
      for (const m of renderAttachment(l.attachment)) out.push({ role: m.role, content: m.content })
    }
  }
  return out
}

export type EpochInfo = { epoch: number; priorWorkerProcess: boolean }

/**
 * La época del worker — el `Gs()` de nuestro árbol (T-092).
 *
 * `CLAUDE_CODE_WORKER_EPOCH` es «un número nuevo cada vez que el worker de la
 * sesión arranca». Ausente vale 1; mal formada o no ≥1 vale MAX_SAFE_INTEGER,
 * que es «hubo worker anterior, seguro». El único predicado derivado es
 * `priorWorkerProcess: epoch > 1`. Es el único dato del reinicio que llega a la
 * sesión remota, y hasta ahora nadie lo leía.
 */
export function sessionEpoch(env: NodeJS.ProcessEnv = process.env): EpochInfo {
  const raw = env.CLAUDE_CODE_WORKER_EPOCH
  let epoch: number
  if (raw === undefined) epoch = 1
  else {
    const n = Number.parseInt(raw, 10)
    epoch = Number.isInteger(n) && n >= 1 ? n : Number.MAX_SAFE_INTEGER
  }
  return { epoch, priorWorkerProcess: epoch > 1 }
}

export type RepoRef = { path: string; branch?: string }
export type TreeReport = {
  path: string
  dirty: boolean
  porcelain: string[]
  /** Commits locales sin push, si se dio `branch`. */
  aheadOfRemote: string[]
  error?: string
}

/**
 * Reconcilia el working tree — el equivalente estructurado del bloque manual
 * que el ejecutor citó (T-093).
 *
 * Por cada repo: `git status --porcelain` y, si se da la rama, los commits
 * locales por delante del remoto. Es un **reporte**, no una acción: qué quedó
 * sin commitear tras el reinicio es información para quien decide, no algo que
 * este módulo resuelva por su cuenta. Un path que no es repo se reporta como
 * error y no tumba la barrida.
 */
export function reconcileWorkingTree(repos: RepoRef[]): TreeReport[] {
  return repos.map((r) => {
    try {
      const porcelain = execFileSync('git', ['-C', r.path, 'status', '--porcelain'], { encoding: 'utf8' })
        .split('\n').filter((l) => l.trim())
      let aheadOfRemote: string[] = []
      if (r.branch) {
        try {
          aheadOfRemote = execFileSync('git', ['-C', r.path, 'log', '--oneline', `origin/${r.branch}..HEAD`], { encoding: 'utf8' })
            .split('\n').filter((l) => l.trim())
        } catch {
          aheadOfRemote = []
        }
      }
      return { path: r.path, dirty: porcelain.length > 0, porcelain, aheadOfRemote }
    } catch (e) {
      return { path: r.path, dirty: false, porcelain: [], aheadOfRemote: [], error: String((e as Error).message ?? e) }
    }
  })
}


// --- T-094: la primitiva de "¿sigue vivo el proceso de esta fila?" ------------

/**
 * La hora de arranque del proceso `pid`, leída de ``/proc/<pid>/stat`` (campo
 * 22, `starttime` en ticks desde el arranque del sistema). `0` = no se pudo
 * leer. Es el discriminador que distingue un pid **reciclado** de uno vivo: un
 * pid puede volver a existir siendo otro proceso, y su `procStart` no coincide.
 */
export function readProcStart(pid: number): number {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8')
    // El nombre del ejecutable va entre paréntesis y puede traer espacios; se
    // corta por el último `)` para que los campos numéricos queden alineados.
    const tras = stat.slice(stat.lastIndexOf(')') + 2).split(' ')
    // Campo 22 global = índice 19 tras el `)` (campos 1 y 2 quedaron antes).
    const st = Number.parseInt(tras[19] ?? '', 10)
    return Number.isFinite(st) ? st : 0
  } catch {
    return 0
  }
}

/** ¿El pid está vivo? `kill(pid, 0)` no señala, sólo pregunta. */
export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    // EPERM = existe pero es de otro usuario → vivo.
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

export type Adoption = 'verified' | 'recycled' | 'dead' | 'unverified'

/**
 * ¿La fila de una sesión `running` corresponde a un proceso todavía vivo? — el
 * ``verifyAdoption`` de ``ccnmt: daemon/src/bgWorkerRegistry.ts:176``, con sus
 * cuatro veredictos, que el binario colapsa:
 *
 * - ``verified``   — pid vivo y ``procStart`` coincide → sigue siendo el suyo.
 * - ``recycled``   — pid vivo pero ``procStart`` distinto → el pid se reusó.
 * - ``dead``       — pid no vivo → el proceso murió.
 * - ``unverified`` — no se puede leer ``procStart`` → adoptar con reserva.
 *
 * ``recordedProcStart`` sin definir devuelve ``verified`` (nunca se registró:
 * se confía en el pid vivo y se capturará en la próxima pasada), igual que la
 * referencia. Una fila ``dead`` o ``recycled`` es la que hay que cerrar como
 * ``failed`` — el cableado al store (T-094) queda pendiente porque toca el
 * esquema compartido de ``agent_sessions``.
 */
export function verifyAdoption(pid: number, recordedProcStart?: number): Adoption {
  if (!isPidAlive(pid)) return 'dead'
  const current = readProcStart(pid)
  if (current === 0) return 'unverified'
  if (recordedProcStart === undefined) return 'verified'
  return current === recordedProcStart ? 'verified' : 'recycled'
}
