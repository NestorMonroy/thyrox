/**
 * Puntero de recuperación ante crash para sesiones Remote Control.
 *
 * Se escribe justo después de crear una sesión de bridge, se refresca
 * periódicamente durante la sesión, y se limpia en un apagado ordenado.
 * Si el proceso muere sin limpieza (crash, kill -9, terminal cerrada), el
 * puntero persiste. En el próximo arranque, `claude remote-control` lo
 * detecta y ofrece reanudar vía el flujo --session-id de #20460.
 *
 * La obsolescencia se verifica contra el mtime del archivo (no un
 * timestamp embebido), así que una re-escritura periódica con el mismo
 * contenido sirve como refresh — coincide con la semántica rolling de
 * BRIDGE_LAST_POLL_TTL (4h) del backend. Un bridge que lleva 5+ horas
 * haciendo poll y luego crashea aún tiene un puntero fresco mientras el
 * refresh haya corrido dentro de la ventana.
 *
 * Acotado por directorio de trabajo (junto a los archivos JSONL de
 * transcript) para que dos bridges concurrentes en repos distintos no se
 * pisen.
 *
 * Puerto fiel de `ccnmt: packages/bridge/src/bridgePointer.ts`.
 * `logForDebugging`/`isENOENT`/`getWorktreePathsPortable`/`lazySchema`/
 * `getProjectsDir`/`sanitizePath`/`jsonParse`/`jsonStringify` son
 * sustitutos — ver `internal/pendingCrossPackageDeps.ts`.
 */
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { z } from 'zod/v4'
import {
  getProjectsDir,
  getWorktreePathsPortable,
  isENOENT,
  jsonParse,
  jsonStringify,
  lazySchema,
  logForDebugging,
  sanitizePath,
} from './internal/pendingCrossPackageDeps.js'

/**
 * Cota superior del fanout de worktrees. `git worktree list` está
 * naturalmente acotado (50 es MUCHO), pero esto acota la ráfaga paralela
 * de stat() y protege contra setups patológicos. Por encima de esto,
 * --continue cae a solo-directorio-actual.
 */
const MAX_WORKTREE_FANOUT = 50

export const BRIDGE_POINTER_TTL_MS = 4 * 60 * 60 * 1000

const BridgePointerSchema = lazySchema(() =>
  z.object({
    sessionId: z.string(),
    environmentId: z.string(),
    source: z.enum(['standalone', 'repl']),
  }),
)

export type BridgePointer = z.infer<ReturnType<typeof BridgePointerSchema>>

export function getBridgePointerPath(dir: string): string {
  return join(getProjectsDir(), sanitizePath(dir), 'bridge-pointer.json')
}

/**
 * Escribe el puntero. También se usa para refrescar el mtime durante
 * sesiones largas — llamar con los mismos IDs es una escritura barata
 * sin cambio de contenido que adelanta el reloj de obsolescencia.
 * Best-effort — un archivo de recuperación ante crash nunca debe él
 * mismo causar un crash. Registra y traga el error.
 */
export async function writeBridgePointer(
  dir: string,
  pointer: BridgePointer,
): Promise<void> {
  const path = getBridgePointerPath(dir)
  try {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, jsonStringify(pointer), 'utf8')
    logForDebugging(`[bridge:pointer] wrote ${path}`)
  } catch (err: unknown) {
    logForDebugging(`[bridge:pointer] write failed: ${err}`, { level: 'warn' })
  }
}

/**
 * Lee el puntero y su edad (ms desde la última escritura). Opera
 * directo y maneja errores — sin chequeo de existencia (regla TOCTOU de
 * CLAUDE.md). Devuelve null ante cualquier fallo: archivo faltante, JSON
 * corrupto, desajuste de schema, u obsoleto (mtime > 4h). Los punteros
 * obsoletos/inválidos se eliminan para que no sigan re-preguntando
 * después de que el backend ya recolectó el entorno.
 */
export async function readBridgePointer(
  dir: string,
): Promise<(BridgePointer & { ageMs: number }) | null> {
  const path = getBridgePointerPath(dir)
  let raw: string
  let mtimeMs: number
  try {
    // stat para el mtime (ancla de obsolescencia), luego lee. Dos
    // syscalls, pero ambas hacen falta — el mtime ES el dato que
    // devolvemos, no un guard TOCTOU.
    mtimeMs = (await stat(path)).mtimeMs
    raw = await readFile(path, 'utf8')
  } catch {
    return null
  }

  const parsed = BridgePointerSchema().safeParse(safeJsonParse(raw))
  if (!parsed.success) {
    logForDebugging(`[bridge:pointer] invalid schema, clearing: ${path}`)
    await clearBridgePointer(dir)
    return null
  }

  const ageMs = Math.max(0, Date.now() - mtimeMs)
  if (ageMs > BRIDGE_POINTER_TTL_MS) {
    logForDebugging(`[bridge:pointer] stale (>4h mtime), clearing: ${path}`)
    await clearBridgePointer(dir)
    return null
  }

  return { ...parsed.data, ageMs }
}

/**
 * Lectura consciente de worktrees para `--continue`. El bridge del REPL
 * escribe su puntero en `getOriginalCwd()`, que EnterWorktreeTool /
 * activeWorktreeSession pueden mutar a una ruta de worktree — pero
 * `claude remote-control --continue` corre con `resolve('.')` = CWD del
 * shell. Esto abre en abanico entre los worktrees hermanos de git para
 * encontrar el puntero más fresco, igualando la semántica de /resume.
 *
 * Vía rápida: revisa `dir` primero. Sólo shell-ea a `git worktree list`
 * si eso falla — el caso común (puntero en el dir de lanzamiento) es un
 * stat, cero exec. Las lecturas en abanico corren en paralelo; acotadas
 * a MAX_WORKTREE_FANOUT.
 *
 * Devuelve el puntero Y el dir donde se encontró, para que el llamador
 * pueda limpiar el archivo correcto si el resume falla.
 */
export async function readBridgePointerAcrossWorktrees(
  dir: string,
): Promise<{ pointer: BridgePointer & { ageMs: number }; dir: string } | null> {
  // Vía rápida: dir actual. Cubre el bridge standalone (siempre coincide)
  // y el bridge del REPL cuando no hubo mutación de worktree.
  const here = await readBridgePointer(dir)
  if (here) {
    return { pointer: here, dir }
  }

  // Abanico: escanea worktrees hermanos. getWorktreePathsPortable tiene
  // un timeout de 5s y devuelve [] ante cualquier error (no es un repo
  // git, git no está instalado).
  const worktrees = await getWorktreePathsPortable(dir)
  if (worktrees.length <= 1) return null
  if (worktrees.length > MAX_WORKTREE_FANOUT) {
    logForDebugging(
      `[bridge:pointer] ${worktrees.length} worktrees exceeds fanout cap ${MAX_WORKTREE_FANOUT}, skipping`,
    )
    return null
  }

  // Dedupe contra `dir` para no re-statearlo. sanitizePath normaliza
  // caja/separadores para que la salida de worktree-list coincida con
  // nuestra clave de vía rápida incluso en Windows, donde git puede
  // emitir C:/ vs c:/ almacenado.
  const dirKey = sanitizePath(dir)
  const candidates = worktrees.filter(wt => sanitizePath(wt) !== dirKey)

  // stat+read en paralelo. Cada readBridgePointer es un stat() que da
  // ENOENT para worktrees sin puntero (barato) más una lectura de ~100
  // bytes para los raros que sí tienen uno. Promise.all → latencia ≈ el
  // stat individual más lento.
  const results = await Promise.all(
    candidates.map(async wt => {
      const p = await readBridgePointer(wt)
      return p ? { pointer: p, dir: wt } : null
    }),
  )

  // Elige el más fresco (menor ageMs). El puntero guarda environmentId
  // para que el resume reconecte al entorno correcto sin importar desde
  // qué worktree se invocó --continue.
  let freshest: {
    pointer: BridgePointer & { ageMs: number }
    dir: string
  } | null = null
  for (const r of results) {
    if (r && (!freshest || r.pointer.ageMs < freshest.pointer.ageMs)) {
      freshest = r
    }
  }
  if (freshest) {
    logForDebugging(
      `[bridge:pointer] fanout found pointer in worktree ${freshest.dir} (ageMs=${freshest.pointer.ageMs})`,
    )
  }
  return freshest
}

/**
 * Elimina el puntero. Idempotente — ENOENT es esperado cuando el
 * proceso se apagó ordenadamente antes.
 */
export async function clearBridgePointer(dir: string): Promise<void> {
  const path = getBridgePointerPath(dir)
  try {
    await unlink(path)
    logForDebugging(`[bridge:pointer] cleared ${path}`)
  } catch (err: unknown) {
    if (!isENOENT(err)) {
      logForDebugging(`[bridge:pointer] clear failed: ${err}`, {
        level: 'warn',
      })
    }
  }
}

function safeJsonParse(raw: string): unknown {
  try {
    return jsonParse(raw)
  } catch {
    return null
  }
}
