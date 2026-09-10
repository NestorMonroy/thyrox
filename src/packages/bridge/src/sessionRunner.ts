/**
 * Puerto fiel de `ccnmt: packages/bridge/src/sessionRunner.ts` (550 líneas
 * fuente, 100% portado — `safeFilenameId`, `PermissionRequest`, y
 * `createSessionSpawner` con su `_extractActivitiesForTesting`).
 *
 * Genera el proceso hijo `claude --print --sdk-url ...` que corre una
 * sesión de bridge, parsea su NDJSON de stdout para detectar actividad
 * (tool_use, texto, resultado), control_requests de permiso, y el primer
 * mensaje de usuario replayado.
 *
 * `jsonParse`/`jsonStringify` son PUNTOS DE INYECCIÓN ya existentes en
 * `./internal/pendingCrossPackageDeps.ts`. `debugTruncate` es un hermano
 * DENTRO del mismo paquete (`./debugUtils.ts`), ya portado.
 *
 * ADVERTENCIA (del encargo): este módulo genera procesos hijo reales y
 * escribe archivos de transcript reales. NO se ejecutan sus efectos de
 * proceso/socket/pidfile en tests — se prueba `_extractActivitiesForTesting`
 * (lógica pura de parseo) contra fixtures NDJSON, nunca `createSessionSpawner`
 * contra un proceso real.
 */

import { type ChildProcess, spawn } from 'node:child_process'
import { createWriteStream, type WriteStream } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { jsonParse, jsonStringify } from './internal/pendingCrossPackageDeps.js'
import { debugTruncate } from './debugUtils.js'
import type {
  SessionActivity,
  SessionDoneStatus,
  SessionHandle,
  SessionSpawner,
  SessionSpawnOpts,
} from './types.js'

const MAX_ACTIVITIES = 10
const MAX_STDERR_LINES = 10

/**
 * Sanitiza un ID de sesión para usarlo en nombres de archivo. Quita
 * cualquier carácter que pudiera causar path traversal (p. ej. `../`, `/`)
 * u otros problemas de filesystem, reemplazándolos con guiones bajos.
 */
export function safeFilenameId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_')
}

/**
 * Un control_request emitido por el CLI hijo cuando necesita permiso para
 * ejecutar una invocación de herramienta **específica** (no un chequeo de
 * capacidad general). El bridge lo reenvía al servidor para que el usuario
 * apruebe/deniegue.
 */
export type PermissionRequest = {
  type: 'control_request'
  request_id: string
  request: {
    /** Chequeo de permiso por invocación — "¿puedo correr esta herramienta con estos inputs?" */
    subtype: 'can_use_tool'
    tool_name: string
    input: Record<string, unknown>
    tool_use_id: string
  }
}

type SessionSpawnerDeps = {
  execPath: string
  /**
   * Argumentos que deben preceder a los flags del CLI al generar el
   * proceso. Vacío para binarios compilados (donde execPath es el propio
   * binario de claude); contiene la ruta del script (process.argv[1]) para
   * instalaciones npm donde execPath es el runtime de node. Sin esto, node
   * ve --sdk-url como una opción de node y sale con "bad option:
   * --sdk-url" (ver anthropics/claude-code-how-works-how-works#28334).
   */
  scriptArgs: string[]
  env: NodeJS.ProcessEnv
  verbose: boolean
  sandbox: boolean
  debugFile?: string
  permissionMode?: string
  onDebug: (msg: string) => void
  onActivity?: (sessionId: string, activity: SessionActivity) => void
  onPermissionRequest?: (
    sessionId: string,
    request: PermissionRequest,
    accessToken: string,
  ) => void
}

/** Mapea nombres de herramienta a verbos legibles para el display de estado. */
const TOOL_VERBS: Record<string, string> = {
  Read: 'Reading',
  Write: 'Writing',
  Edit: 'Editing',
  MultiEdit: 'Editing',
  Bash: 'Running',
  Glob: 'Searching',
  Grep: 'Searching',
  WebFetch: 'Fetching',
  WebSearch: 'Searching',
  Task: 'Running task',
  FileReadTool: 'Reading',
  FileWriteTool: 'Writing',
  FileEditTool: 'Editing',
  GlobTool: 'Searching',
  GrepTool: 'Searching',
  BashTool: 'Running',
  NotebookEditTool: 'Editing notebook',
  LSP: 'LSP',
}

function toolSummary(name: string, input: Record<string, unknown>): string {
  const verb = TOOL_VERBS[name] ?? name
  const target =
    (input.file_path as string) ??
    (input.filePath as string) ??
    (input.pattern as string) ??
    (input.command as string | undefined)?.slice(0, 60) ??
    (input.url as string) ??
    (input.query as string) ??
    ''
  if (target) {
    return `${verb} ${target}`
  }
  return verb
}

function extractActivities(
  line: string,
  sessionId: string,
  onDebug: (msg: string) => void,
): SessionActivity[] {
  let parsed: unknown
  try {
    parsed = jsonParse(line)
  } catch {
    return []
  }

  if (!parsed || typeof parsed !== 'object') {
    return []
  }

  const msg = parsed as Record<string, unknown>
  const activities: SessionActivity[] = []
  const now = Date.now()

  switch (msg.type) {
    case 'assistant': {
      const message = msg.message as Record<string, unknown> | undefined
      if (!message) break
      const content = message.content
      if (!Array.isArray(content)) break

      for (const block of content) {
        if (!block || typeof block !== 'object') continue
        const b = block as Record<string, unknown>

        if (b.type === 'tool_use') {
          const name = (b.name as string) ?? 'Tool'
          const input = (b.input as Record<string, unknown>) ?? {}
          const summary = toolSummary(name, input)
          activities.push({
            type: 'tool_start',
            summary,
            timestamp: now,
          })
          onDebug(
            `[bridge:activity] sessionId=${sessionId} tool_use name=${name} ${inputPreview(input)}`,
          )
        } else if (b.type === 'text') {
          const text = (b.text as string) ?? ''
          if (text.length > 0) {
            activities.push({
              type: 'text',
              summary: text.slice(0, 80),
              timestamp: now,
            })
            onDebug(
              `[bridge:activity] sessionId=${sessionId} text "${text.slice(0, 100)}"`,
            )
          }
        }
      }
      break
    }
    case 'result': {
      const subtype = msg.subtype as string | undefined
      if (subtype === 'success') {
        activities.push({
          type: 'result',
          summary: 'Session completed',
          timestamp: now,
        })
        onDebug(
          `[bridge:activity] sessionId=${sessionId} result subtype=success`,
        )
      } else if (subtype) {
        const errors = msg.errors as string[] | undefined
        const errorSummary = errors?.[0] ?? `Error: ${subtype}`
        activities.push({
          type: 'error',
          summary: errorSummary,
          timestamp: now,
        })
        onDebug(
          `[bridge:activity] sessionId=${sessionId} result subtype=${subtype} error="${errorSummary}"`,
        )
      } else {
        onDebug(
          `[bridge:activity] sessionId=${sessionId} result subtype=undefined`,
        )
      }
      break
    }
    default:
      break
  }

  return activities
}

/**
 * Extrae texto plano de una línea NDJSON de SDKUserMessage replayada.
 * Devuelve el texto recortado si esto parece un mensaje autorado por un
 * humano de verdad, si no undefined para que el caller siga esperando el
 * primer mensaje real.
 */
function extractUserMessageText(
  msg: Record<string, unknown>,
): string | undefined {
  // Salta mensajes de usuario de resultado de herramienta (resultados de
  // subagente envueltos) y mensajes sintéticos de caveat — ninguno es
  // autorado por un humano.
  if (msg.parent_tool_use_id != null || msg.isSynthetic || msg.isReplay)
    return undefined

  const message = msg.message as Record<string, unknown> | undefined
  const content = message?.content
  let text: string | undefined
  if (typeof content === 'string') {
    text = content
  } else if (Array.isArray(content)) {
    for (const block of content) {
      if (
        block &&
        typeof block === 'object' &&
        (block as Record<string, unknown>).type === 'text'
      ) {
        text = (block as Record<string, unknown>).text as string | undefined
        break
      }
    }
  }
  text = text?.trim()
  return text ? text : undefined
}

/** Construye una vista previa corta del input de la herramienta para debug logging. */
function inputPreview(input: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, val] of Object.entries(input)) {
    if (typeof val === 'string') {
      parts.push(`${key}="${val.slice(0, 100)}"`)
    }
    if (parts.length >= 3) break
  }
  return parts.join(' ')
}

export function createSessionSpawner(deps: SessionSpawnerDeps): SessionSpawner {
  return {
    spawn(opts: SessionSpawnOpts, dir: string): SessionHandle {
      // Resolución del archivo de debug:
      // 1. Si deps.debugFile está dado, se usa con sufijo del ID de sesión
      //    para unicidad.
      // 2. Si verbose o build ant, se auto-genera una ruta de archivo temporal.
      // 3. Si no, sin archivo de debug.
      const safeId = safeFilenameId(opts.sessionId)
      let debugFile: string | undefined
      if (deps.debugFile) {
        const ext = deps.debugFile.lastIndexOf('.')
        if (ext > 0) {
          debugFile = `${deps.debugFile.slice(0, ext)}-${safeId}${deps.debugFile.slice(ext)}`
        } else {
          debugFile = `${deps.debugFile}-${safeId}`
        }
      } else if (deps.verbose || process.env.USER_TYPE === 'ant') {
        debugFile = join(tmpdir(), 'claude', `bridge-session-${safeId}.log`)
      }

      // Archivo de transcript: escribe líneas NDJSON crudas para análisis
      // posterior. Se ubica junto al archivo de debug cuando hay uno
      // configurado.
      let transcriptStream: WriteStream | null = null
      let transcriptPath: string | undefined
      if (deps.debugFile) {
        transcriptPath = join(
          dirname(deps.debugFile),
          `bridge-transcript-${safeId}.jsonl`,
        )
        transcriptStream = createWriteStream(transcriptPath, { flags: 'a' })
        transcriptStream.on('error', err => {
          deps.onDebug(
            `[bridge:session] Transcript write error: ${err.message}`,
          )
          transcriptStream = null
        })
        deps.onDebug(`[bridge:session] Transcript log: ${transcriptPath}`)
      }

      const args = [
        ...deps.scriptArgs,
        '--print',
        '--sdk-url',
        opts.sdkUrl,
        '--session-id',
        opts.sessionId,
        '--input-format',
        'stream-json',
        '--output-format',
        'stream-json',
        '--replay-user-messages',
        ...(deps.verbose ? ['--verbose'] : []),
        ...(debugFile ? ['--debug-file', debugFile] : []),
        ...(deps.permissionMode
          ? ['--permission-mode', deps.permissionMode]
          : []),
      ]

      const env: NodeJS.ProcessEnv = {
        ...deps.env,
        // Quita el token OAuth del bridge para que el proceso CC hijo use
        // el token de acceso de la sesión para inferencia en su lugar.
        CLAUDE_CODE_OAUTH_TOKEN: undefined,
        CLAUDE_CODE_ENVIRONMENT_KIND: 'bridge',
        ...(deps.sandbox && { CLAUDE_CODE_FORCE_SANDBOX: '1' }),
        CLAUDE_CODE_SESSION_ACCESS_TOKEN: opts.accessToken,
        // v1: HybridTransport (lecturas WS + escrituras POST) a
        // Session-Ingress. Inocuo en modo v2 — transportUtils chequea
        // CLAUDE_CODE_USE_CCR_V2 primero.
        CLAUDE_CODE_POST_FOR_SESSION_INGRESS_V2: '1',
        // v2: SSETransport + CCRClient a los endpoints /v1/code/sessions/*
        // de CCR. Las mismas env vars que environment-manager fija en el
        // camino de contenedor.
        ...(opts.useCcrV2 && {
          CLAUDE_CODE_USE_CCR_V2: '1',
          CLAUDE_CODE_WORKER_EPOCH: String(opts.workerEpoch),
        }),
      }

      deps.onDebug(
        `[bridge:session] Spawning sessionId=${opts.sessionId} sdkUrl=${opts.sdkUrl} accessToken=${opts.accessToken ? 'present' : 'MISSING'}`,
      )
      deps.onDebug(`[bridge:session] Child args: ${args.join(' ')}`)
      if (debugFile) {
        deps.onDebug(`[bridge:session] Debug log: ${debugFile}`)
      }

      // Conecta los tres streams: stdin para control, stdout para parseo
      // NDJSON, stderr para captura de errores y diagnóstico.
      const child: ChildProcess = spawn(deps.execPath, args, {
        cwd: dir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
        windowsHide: true,
      })

      deps.onDebug(
        `[bridge:session] sessionId=${opts.sessionId} pid=${child.pid}`,
      )

      const activities: SessionActivity[] = []
      let currentActivity: SessionActivity | null = null
      const lastStderr: string[] = []
      let sigkillSent = false
      let firstUserMessageSeen = false

      // Bufferea stderr para diagnóstico de errores.
      if (child.stderr) {
        const stderrRl = createInterface({ input: child.stderr })
        stderrRl.on('line', line => {
          // Reenvía stderr al stderr del bridge en modo verbose.
          if (deps.verbose) {
            process.stderr.write(line + '\n')
          }
          // Ring buffer de las últimas N líneas.
          if (lastStderr.length >= MAX_STDERR_LINES) {
            lastStderr.shift()
          }
          lastStderr.push(line)
        })
      }

      // Parsea NDJSON del stdout del hijo.
      if (child.stdout) {
        const rl = createInterface({ input: child.stdout })
        rl.on('line', line => {
          // Escribe el NDJSON crudo al archivo de transcript.
          if (transcriptStream) {
            transcriptStream.write(line + '\n')
          }

          // Registra todos los mensajes que fluyen del CLI hijo al bridge.
          deps.onDebug(
            `[bridge:ws] sessionId=${opts.sessionId} <<< ${debugTruncate(line)}`,
          )

          // En modo verbose, reenvía la salida cruda a stderr.
          if (deps.verbose) {
            process.stderr.write(line + '\n')
          }

          const extracted = extractActivities(
            line,
            opts.sessionId,
            deps.onDebug,
          )
          for (const activity of extracted) {
            // Mantiene el ring buffer.
            if (activities.length >= MAX_ACTIVITIES) {
              activities.shift()
            }
            activities.push(activity)
            currentActivity = activity

            deps.onActivity?.(opts.sessionId, activity)
          }

          // Detecta control_request y mensajes de usuario replayados.
          // extractActivities parsea la misma línea pero traga errores de
          // parseo y salta el tipo 'user' — re-parsear aquí es barato
          // (las líneas NDJSON son chicas) y mantiene cada camino
          // autocontenido.
          {
            let parsed: unknown
            try {
              parsed = jsonParse(line)
            } catch {
              // Línea no-JSON, salta la detección.
            }
            if (parsed && typeof parsed === 'object') {
              const msg = parsed as Record<string, unknown>

              if (msg.type === 'control_request') {
                const request = msg.request as
                  | Record<string, unknown>
                  | undefined
                if (
                  request?.subtype === 'can_use_tool' &&
                  deps.onPermissionRequest
                ) {
                  deps.onPermissionRequest(
                    opts.sessionId,
                    parsed as PermissionRequest,
                    opts.accessToken,
                  )
                }
                // interrupt es a nivel de turno; el hijo lo maneja
                // internamente (print.ts).
              } else if (
                msg.type === 'user' &&
                !firstUserMessageSeen &&
                opts.onFirstUserMessage
              ) {
                const text = extractUserMessageText(msg)
                if (text) {
                  firstUserMessageSeen = true
                  opts.onFirstUserMessage(text)
                }
              }
            }
          }
        })
      }

      const done = new Promise<SessionDoneStatus>(resolve => {
        child.on('close', (code, signal) => {
          // Cierra el stream de transcript al salir.
          if (transcriptStream) {
            transcriptStream.end()
            transcriptStream = null
          }

          if (signal === 'SIGTERM' || signal === 'SIGINT') {
            deps.onDebug(
              `[bridge:session] sessionId=${opts.sessionId} interrupted signal=${signal} pid=${child.pid}`,
            )
            resolve('interrupted')
          } else if (code === 0) {
            deps.onDebug(
              `[bridge:session] sessionId=${opts.sessionId} completed exit_code=0 pid=${child.pid}`,
            )
            resolve('completed')
          } else {
            deps.onDebug(
              `[bridge:session] sessionId=${opts.sessionId} failed exit_code=${code} pid=${child.pid}`,
            )
            resolve('failed')
          }
        })

        child.on('error', err => {
          deps.onDebug(
            `[bridge:session] sessionId=${opts.sessionId} spawn error: ${err.message}`,
          )
          resolve('failed')
        })
      })

      const handle: SessionHandle = {
        sessionId: opts.sessionId,
        done,
        activities,
        accessToken: opts.accessToken,
        lastStderr,
        get currentActivity(): SessionActivity | null {
          return currentActivity
        },
        kill(): void {
          if (!child.killed) {
            deps.onDebug(
              `[bridge:session] Sending SIGTERM to sessionId=${opts.sessionId} pid=${child.pid}`,
            )
            // En Windows, child.kill('SIGTERM') lanza; usa la señal por defecto.
            if (process.platform === 'win32') {
              child.kill()
            } else {
              child.kill('SIGTERM')
            }
          }
        },
        forceKill(): void {
          // Usa una bandera separada porque child.killed se fija cuando se
          // llama a kill(), no cuando el proceso sale. Hace falta mandar
          // SIGKILL incluso después de SIGTERM.
          if (!sigkillSent && child.pid) {
            sigkillSent = true
            deps.onDebug(
              `[bridge:session] Sending SIGKILL to sessionId=${opts.sessionId} pid=${child.pid}`,
            )
            if (process.platform === 'win32') {
              child.kill()
            } else {
              child.kill('SIGKILL')
            }
          }
        },
        writeStdin(data: string): void {
          if (child.stdin && !child.stdin.destroyed) {
            deps.onDebug(
              `[bridge:ws] sessionId=${opts.sessionId} >>> ${debugTruncate(data)}`,
            )
            child.stdin.write(data)
          }
        },
        updateAccessToken(token: string): void {
          handle.accessToken = token
          // Manda el token fresco al proceso hijo vía stdin. El
          // StructuredIO del hijo maneja los mensajes
          // update_environment_variables fijando process.env
          // directamente, así que getSessionIngressAuthToken() recoge el
          // token nuevo en la próxima llamada a refreshHeaders.
          handle.writeStdin(
            jsonStringify({
              type: 'update_environment_variables',
              variables: { CLAUDE_CODE_SESSION_ACCESS_TOKEN: token },
            }) + '\n',
          )
          deps.onDebug(
            `[bridge:session] Sent token refresh via stdin for sessionId=${opts.sessionId}`,
          )
        },
      }

      return handle
    },
  }
}

export { extractActivities as _extractActivitiesForTesting }
