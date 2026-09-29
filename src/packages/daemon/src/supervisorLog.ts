/**
 * Log persistente del supervisor del daemon (`daemon.log`): escritura en
 * modo append con rotación a `<path>.1` al superar el umbral de tamaño, eco
 * a stdout cuando hay TTY, y buffer de reintento mientras la rotación está
 * en curso.
 *
 * Porte de `chunk-92tvramn.js` (referencia 2.1.283), resuelto con
 * `bin/binary symbol`: `Le` (createSupervisorLog), `st`
 * (openSupervisorLogAppendStream), `dt` (closeSupervisorLogStream), `lt`
 * (rotateSupervisorLog), `at` (SUPERVISOR_LOG_ROTATION_THRESHOLD_BYTES) y
 * `ln` (tailSupervisorLog, sólo su rama alcanzable: el resto del cuerpo de
 * `ln` es código inalcanzable tras el `return` incondicional del primer
 * bloque — lectura manual sin `tail` y el desvío a Windows `cn` — y no se
 * porta).
 *
 * Clasificación de fallos (medida contra la referencia, no supuesta):
 * `Le` engulle en silencio cualquier error del ciclo de rotación (1
 * `catch{}`), `lt` hace lo mismo con sus tres intentos de
 * renombrar/borrar (1 `catch(o)` + 2 `.catch(()=>{})` encadenados) y `st`
 * silencia los errores del propio stream (1 `.on('error',()=>{})`). Los
 * tres son silencio intencional en la referencia — no `logError` ni
 * `logEvent` — porque el propio log es el canal de error, y hacerlo fallar
 * al escribir un error de escritura sería recursivo. `ln` no envuelve su
 * rama alcanzable en ningún `catch`: el fallo de spawn llega por
 * `w.on('error', ...)`.
 *
 * pendiente: `Vo(k)` aplica `Z.redact` (`chunk-zkn0228z.js`, clase `nt`) al
 * mensaje antes de escribirlo — un motor de reglas de escaneo de secretos
 * con caché de resultados, fuera de alcance de esta pieza (D6, sólo el log
 * rotado). El mensaje se escribe sin redactar.
 *
 * pendiente: `main.ts::bgDaemonTailLog` (invocada desde `daemonMain` en
 * `daemon bg log`) hoy tailea un archivo de telemetría fijo, no el
 * `daemon.log` real. El cableado a `tailSupervisorLog` con la ruta real
 * (`join(getConfigHomeDir(), 'daemon', 'daemon.log')`, ya usada por
 * `daemonLaunchAgentVerb`) es de otra ola — no se toca `main.ts` aquí.
 */
import { type ChildProcess, spawn } from 'node:child_process'
import { type WriteStream, createWriteStream } from 'node:fs'
import { rename, stat, unlink } from 'node:fs/promises'

/** `at` — umbral de bytes acumulados que dispara la rotación. */
export const SUPERVISOR_LOG_ROTATION_THRESHOLD_BYTES = 10_485_760

export interface SupervisorLogWriter {
  write(label: string, message: string): void
  close(): Promise<void>
}

export interface CreateSupervisorLogOptions {
  /** Por defecto `SUPERVISOR_LOG_ROTATION_THRESHOLD_BYTES` (`at`). */
  thresholdBytes?: number
  /** Por defecto `process.stdout.isTTY` (`e` en la referencia). */
  isTty?: boolean
  /** Por defecto `process.stdout.write`. Inyectable para pruebas. */
  echo?: (chunk: string) => void
}

/** `st` — abre el log en modo append y silencia los errores del stream. */
export function openSupervisorLogAppendStream(path: string): WriteStream {
  const stream = createWriteStream(path, { flags: 'a' })
  stream.on('error', () => {})
  return stream
}

/**
 * `dt` — cierra el stream de forma ordenada: si ya está cerrado resuelve
 * enseguida, si no espera el evento `close` tras llamar a `end()`.
 */
export function closeSupervisorLogStream(stream: WriteStream): Promise<void> {
  return new Promise(resolve => {
    if (stream.closed) {
      resolve()
      return
    }
    stream.once('close', () => resolve())
    stream.end()
  })
}

export interface RotateSupervisorLogDeps {
  renameFn?: (oldPath: string, newPath: string) => Promise<void>
  unlinkFn?: (target: string) => Promise<void>
}

/**
 * `lt` — rota el log renombrando `<path>` a `<path>.1`. Si el renombrado
 * falla por otra causa que no exista el archivo, borra el `.1` anterior y
 * reintenta; si eso también falla, borra el original. Las tres ramas de
 * fallo son silenciosas en la referencia.
 */
export async function rotateSupervisorLog(
  path: string,
  deps: RotateSupervisorLogDeps = {},
): Promise<void> {
  const { renameFn = rename, unlinkFn = unlink } = deps
  const rotated = `${path}.1`
  try {
    await renameFn(path, rotated)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    await unlinkFn(rotated).catch(() => {})
    await renameFn(path, rotated).catch(() => unlinkFn(path).catch(() => {}))
  }
}

/**
 * `Le` — crea el escritor del log persistente del supervisor: rota al
 * arrancar si ya supera el umbral, abre el stream de append, y por cada
 * línea escrita ecoa a stdout si hay TTY, acumula bytes y dispara una
 * rotación en segundo plano cuando el acumulado supera el umbral,
 * almacenando en un buffer lo que se escriba mientras la rotación está en
 * curso para volcarlo sobre el stream nuevo al terminar.
 */
export async function createSupervisorLog(
  path: string,
  options: CreateSupervisorLogOptions = {},
): Promise<SupervisorLogWriter> {
  const threshold = options.thresholdBytes ?? SUPERVISOR_LOG_ROTATION_THRESHOLD_BYTES
  const isTty = options.isTty ?? Boolean(process.stdout.isTTY)
  const echo = options.echo ?? ((chunk: string) => { process.stdout.write(chunk) })

  let accumulatedBytes = await stat(path).then(info => info.size).catch(() => 0)
  if (accumulatedBytes > threshold) {
    await rotateSupervisorLog(path)
    accumulatedBytes = 0
  }
  let stream = openSupervisorLogAppendStream(path)
  let pendingRotation: Promise<void> | null = null
  let rotationBuffer: string[] | null = null
  let closed = false

  return {
    write(label, message) {
      const line = `[${new Date().toISOString()}] [${label}] ${message}\n`
      if (isTty) echo(line)
      if (closed) return
      accumulatedBytes += Buffer.byteLength(line)
      if (rotationBuffer) rotationBuffer.push(line)
      else stream.write(line)
      if (accumulatedBytes > threshold && !pendingRotation) {
        const previousStream = stream
        const buffer: string[] = []
        rotationBuffer = buffer
        pendingRotation = (async () => {
          try {
            await closeSupervisorLogStream(previousStream)
            await rotateSupervisorLog(path)
            stream = openSupervisorLogAppendStream(path)
            accumulatedBytes = 0
            for (const pending of buffer) {
              accumulatedBytes += Buffer.byteLength(pending)
              stream.write(pending)
            }
          } catch {
            // silencio intencional — `Le` engulle cualquier error del
            // ciclo de rotación (ver clasificación de fallos arriba).
          } finally {
            rotationBuffer = null
            pendingRotation = null
          }
        })()
      }
    },
    async close() {
      closed = true
      await pendingRotation
      await closeSupervisorLogStream(stream)
    },
  }
}

export interface TailSupervisorLogDeps {
  /** Por defecto `spawn('tail', ['-f', path], {stdio: 'inherit'})`. */
  spawnFn?: (path: string) => ChildProcess
  /** Por defecto `process.exit`. Inyectable para no matar el proceso de pruebas. */
  exitFn?: (code: number) => void
  /** Por defecto `console.error`. */
  logErrorFn?: (message: string) => void
}

/**
 * `ln` (rama alcanzable) — hace `tail -f` del log como subproceso con
 * stdio heredado y propaga su código de salida. El resto del cuerpo de la
 * referencia es inalcanzable tras el `return` incondicional del primer
 * bloque y no se porta.
 */
export async function tailSupervisorLog(
  path: string,
  deps: TailSupervisorLogDeps = {},
): Promise<void> {
  const spawnFn = deps.spawnFn ?? ((target: string): ChildProcess => spawn('tail', ['-f', target], { stdio: 'inherit' }))
  const exitFn = deps.exitFn ?? process.exit.bind(process)
  const logErrorFn = deps.logErrorFn ?? ((message: string) => { console.error(message) })
  const tail = spawnFn(path)
  await new Promise<void>(resolve => {
    tail.on('exit', code => {
      if (code) process.exitCode = code
      resolve()
    })
    tail.on('error', error => {
      logErrorFn(`tail failed: ${error.message}`)
      exitFn(1)
      // `process.exit` real es inmediato y no vuelve; resolvemos igual para
      // que un `exitFn` inyectado (pruebas) no deje la promesa colgada.
      resolve()
    })
  })
}
