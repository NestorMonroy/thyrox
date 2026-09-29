/**
 * Spawn a PTY-mode bg job. Phase C variant of `spawnBgJob`:
 * instead of detaching with stdio→file, we fork ourselves with
 * `--bg-pty-host <sock> <cols> <rows> -- <ccb-cmd>`. The host process
 * opens a Bun.Terminal, runs the inner ccb in it, and exposes the
 * PTY over a Unix socket. `ccb attach <short>` later connects to
 * that socket via the adopter for true bidirectional UX.
 *
 * Extracted from bg.ts to keep that file under the LOC budget.
 *
 * Porte adicional de chunk-ygx717jg.js 2.1.283:
 *   - `R9n` [11493,11579) — `describeCwdGone`: mensaje exacto cuando el
 *     cwd del worker ya no existe. En la referencia lo usa un probe async
 *     previo al spawn, dentro del bucle de disparo del daemon (`ue` en
 *     `Dt`), que thyrox no tiene; aquí se usa como guarda SÍNCRONA justo
 *     antes de construir el comando — mismo mensaje, disparo más simple.
 *   - `x9n` [11772,12633) — el `Bun.spawn` con stderr redirigido a un
 *     archivo breadcrumb (`<sock>.err`, misma convención que
 *     `ptyHost.ts:breadcrumbPath`) y reintento clasificado por errno si
 *     abrirlo falla. Portado como `resolveSpawnStdio` +
 *     `classifyBreadcrumbOpenErrno`. // pendiente: el reintento de la
 *     referencia también quita la colocación de cgroup
 *     (`{cgroup:S,...k}=o`) — `node:child_process` no tiene esa opción,
 *     así que no hay nada que retirar del lado de thyrox; el reintento
 *     aquí es sólo de stdio.
 *
 * @dynamicRequire
 */

import { spawn } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import chalk from 'chalk'

import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { getDefaultLauncher } from '@thyrox/repl/relaunch.js'

import { buildPtyHostChildEnv } from './childEnv.js'

/** `R9n` — mensaje cuando el cwd del worker ya no existe o no es accesible. */
export function describeCwdGone(cwd: string): string {
  return `working directory no longer exists or is not accessible: ${cwd}`
}

/** Los cuatro errno que `x9n` clasifica con un aviso en vez de relanzar. */
const CLASSIFIED_BREADCRUMB_ERRNO_CODES = new Set(['ENOENT', 'ENOSPC', 'EACCES', 'EROFS'])

/** Parte de `x9n`: qué errno de abrir el breadcrumb se degrada a aviso. */
export function classifyBreadcrumbOpenErrno(error: unknown): string | undefined {
  const code = (error as NodeJS.ErrnoException | undefined)?.code
  return code !== undefined && CLASSIFIED_BREADCRUMB_ERRNO_CODES.has(code) ? code : undefined
}

/**
 * `x9n`: intenta abrir el breadcrumb de stderr para el pty host; si falla
 * con un errno clasificado, degrada a stdio completamente ignorado con un
 * aviso — igual que la referencia degrada a `stdio:["ignore","ignore","ignore"]`
 * sin cgroup. Un errno NO clasificado se relanza (`throw g` en la referencia).
 */
export function resolveSpawnStdio(breadcrumbPath: string): {
  stdio: ['ignore', 'ignore', 'ignore' | number]
  warning?: string
} {
  try {
    const fd = openSync(breadcrumbPath, 'a')
    return { stdio: ['ignore', 'ignore', fd] }
  } catch (error) {
    const code = classifyBreadcrumbOpenErrno(error)
    if (code === undefined) throw error
    const detail = error instanceof Error ? error.message : String(error)
    return {
      stdio: ['ignore', 'ignore', 'ignore'],
      warning: `bg: ptyHost stderr breadcrumb open failed (${code}) at ${breadcrumbPath} — spawning with stderr discarded (crash diagnostics degraded): ${detail}`,
    }
  }
}

export interface SpawnPtyResult {
  short: string
  pid: number
  cmd: readonly string[]
  cwd: string
  startedAt: number
  socketPath: string
  /** Rendezvous (control) socket path — `<jobDir>/rv.sock`. The inner REPL
   *  binds it; the daemon supervisor's rv client connects to it. Persisted
   *  into meta.json so the adopt path can reconnect after a daemon restart. */
  rendezvousSocketPath: string
  /** Always 'pty'. Set as meta.mode by the caller. */
  mode: 'pty'
  /** procStart timestamp; defeats PID recycle. Read sync at spawn time. */
  procStart?: number
  /** ccb version that spawned the worker. */
  cliVersion?: string
}

/**
 * Build the spawn command + env, fork the PTY-host child, and return
 * the metadata the caller persists into meta.json. Caller owns the
 * meta.json write to avoid leaking JobMeta type into this file.
 */
export function spawnPtyHost(opts: {
  short: string
  jobDir: string
  flags: readonly string[]
  directive: string
  cwd: string
  /** Suppress the "backgrounded (pty)" stdout banner. Used by FleetView
   *  dispatch — the new job is surfaced via state.json polling, not
   *  by writing to the terminal (which would corrupt the TUI). */
  quiet?: boolean
  /**
   * Mark this worker as a spare-pool member (sets CCB_SPARE=1 so the inner
   * REPL writes spare-ready.flag and skips its own state.json sync). Mirrors
   * ant's `i1O` mode param (`q === "spare"`) — an EXPLICIT mode, NOT inferred
   * from an empty directive. The left-arrow resume path also spawns with an
   * empty directive (it inherits the transcript via --resume + --fork-session
   * and must NOT re-run a prompt) yet is a real REPL, not a spare; conflating
   * the two on `directive === ''` mislabeled it as a spare. Default false.
   */
  spare?: boolean
}): SpawnPtyResult {
  mkdirSync(opts.jobDir, { recursive: true })
  // `R9n`/guarda de cwd: en la referencia esto es un probe ASÍNCRONO previo
  // al spawn dentro del bucle de disparo del daemon; aquí, sin ese bucle,
  // basta una comprobación síncrona — mismo mensaje, mismo desenlace (no
  // spawnea, limpia el jobDir, sale con 1).
  if (!existsSync(opts.cwd)) {
    rmSync(opts.jobDir, { recursive: true, force: true })
    process.stderr.write(`${describeCwdGone(opts.cwd)}\n`)
    process.exit(1)
  }
  const socketPath = join(opts.jobDir, 'pty.sock')
  // Rendezvous (control) socket — the out-of-band channel the inner REPL
  // binds to push authoritative state/done/heartbeat to the daemon
  // supervisor (ant 4291.js server ← 5016.js naK client). Sits alongside
  // pty.sock in the flat per-job dir; the inner REPL reads
  // THYROX_BG_RENDEZVOUS_SOCK to know where to bind. See
  // daemon/socketPaths.ts getRendezvousSocketPath.
  const rendezvousSocketPath = join(opts.jobDir, 'rv.sock')

  // Outer: ccb --bg-pty-host <sock> <cols> <rows> -- <inner ccb>
  // Inner: ccb [user flags] "<directive>"  (full REPL, directive as
  // positional → Commander parses it as [prompt] which the REPL
  // pre-seeds into PromptInput on launch). Mirrors ant's behaviour:
  // the user can attach mid-conversation and continue interactively.
  //
  // Spare-pool path: caller passes directive="" to spawn a worker that
  // idles at empty prompt (waiting for a CTRL `claim` frame to inject
  // the real intent later). For that case we omit the directive arg
  // entirely so Commander doesn't see a literal "" positional (which
  // would auto-submit an empty turn). Source: ant `m_H` "spare" mode.
  const innerArgs =
    opts.directive === ''
      ? [...opts.flags]
      : [...opts.flags, opts.directive]
  // Source: ant 5286.js uKO() — `return D$() ? [process.execPath] :
  // [process.execPath, process.argv[1]]`. D$ = isBunStandalone. Both
  // `bun cli.js` and the compiled standalone binary go through one
  // codepath that prepends `[process.argv[1]]` only when NOT standalone.
  //
  // ccb previously used `process.argv0.endsWith('bun')` for this branch,
  // which BREAKS in compiled standalone binaries because Bun's compile
  // mode sets argv0='bun' (so the embedded runtime can find itself). The
  // heuristic mis-classified standalone as bun-script mode, then prepended
  // process.argv[1] (= the first user CLI flag, e.g. "who am i") in
  // front of --bg-pty-host. The spawn line ended up looking like
  // `bun --bg-pty-host …` which, when resolved through PATH, found the
  // user's local bun and tried to load "--bg-pty-host" as a script — exit
  // immediately, pty.sock never appears, fleetAttach polls 10s, and the
  // user's right-arrow keystrokes leak into the terminal as ^[[C because
  // stdin raw mode was already released during ink unmount.
  //
  // getDefaultLauncher({pinToCurrentBinary:true}) is ccb's `Pb` —
  // mirrors ant 5286.js uKO + 4835.js `Pb({pinToCurrentBinary:!0})`.
  // pinToCurrentBinary skips the auto-update symlink redirect: the bg
  // worker must boot the SAME binary that spawned it, otherwise an
  // auto-update mid-spawn would race the worker against a different
  // version's wire protocol.
  const launcher = getDefaultLauncher({ pinToCurrentBinary: true })
  const cmd = launcher.cmd
  const prefixArgs = launcher.prefixArgs
  const cols = String(process.stdout.columns || 200)
  const rows = String(process.stdout.rows || 50)
  const hostArgs = [
    ...prefixArgs,
    '--bg-pty-host',
    socketPath,
    cols,
    rows,
    '--',
    cmd,
    ...prefixArgs,
    ...innerArgs,
  ]
  const fullCmd = [cmd, ...hostArgs]

  // `qe`/`Vt`: parte del entorno heredado, retira el
  // ENV_FORWARD_ALLOWLIST salvo lo reenviado explícito abajo, y si
  // THYROX_CODE_PROVIDER_MANAGED_BY_HOST está activo retira además las
  // credenciales (`childEnv.ts:buildPtyHostChildEnv`).
  const env: NodeJS.ProcessEnv = buildPtyHostChildEnv(process.env, {
    THYROX_CODE_SESSION_KIND: 'bg',
    THYROX_CODE_BG_JOB_SHORT: opts.short,
    FORCE_COLOR: '3',
    COLORTERM: 'truecolor',
    BROWSER: 'true',
    THYROX_JOB_DIR: opts.jobDir,
    THYROX_BG_BACKEND: 'pty',
    // Rendezvous control socket the inner REPL binds (ant eaK sets the same
    // THYROX_BG_RENDEZVOUS_SOCK env). The bg REPL's useBgRendezvousServer
    // hook reads this to start the out-of-band control channel; absent it,
    // the worker degrades to the legacy disk-poll path.
    THYROX_BG_RENDEZVOUS_SOCK: rendezvousSocketPath,
    THYROX_BG_SOURCE: 'cli',
    CLAUDE_ENABLE_STREAM_WATCHDOG: '1',
    THYROX_CODE_SESSION_NAME: opts.short,
    // Spare-pool marker: an EXPLICIT spare flag (ant `i1O` mode "spare"),
    // not inferred from an empty directive. Read by useSpareReadyMarker
    // (writes spare-ready.flag) + useBgFleetStateSync (skips its own
    // state.json sync — we don't want the worker writing `state: 'working'`
    // while it's actually idle waiting). Source: ant 4774.js spare workers
    // run with `m_H(..., "spare", ...)`. The left-arrow resume path also
    // spawns directive='' but is a real REPL, so it must stay UNmarked.
    ...(opts.spare === true ? { CCB_SPARE: '1' } : {}),
  })

  // Strip the FleetView-subsystem reader marker so it NEVER leaks into a
  // dispatched worker. `CCB_FLEET_INPROCESS_REMOUNT=1` activates the rust
  // stdin reader (App.useNativeReader) + the orphan-check stdin bypass — both
  // are correct ONLY for the foreground process driving FleetView. The
  // standalone `ccb agents` handler sets it PROCESS-GLOBALLY before dispatching
  // workers (unlike the left-arrow bridge, which dispatches before setting it),
  // so without this delete every bg worker would inherit it and wrongly run the
  // reader against its OWN pty slave fd 0 + skip its orphan check. spawnPtyHost
  // is the single chokepoint for all PTY spawns (spawnBgPty / respawnJob /
  // bgDaemon all funnel here), so deleting once here covers every path.
  delete env.CCB_FLEET_INPROCESS_REMOUNT

  // `x9n`: stderr del pty host a un breadcrumb junto al socket
  // (`<sock>.err`, misma convención que ptyHost.ts:breadcrumbPath — el
  // host escribe ahí su propio crash best-effort; esto captura además lo
  // que el host nunca llega a manejar en JS). Si abrirlo falla con un
  // errno clasificado, se degrada a stdio ignorado con aviso; si no, se
  // relanza.
  const { stdio, warning } = resolveSpawnStdio(`${socketPath}.err`)
  if (warning !== undefined) logForDebugging(warning, { level: 'warn' })

  const child = spawn(cmd, hostArgs, {
    cwd: opts.cwd,
    env,
    detached: true,
    stdio,
  })
  if (typeof stdio[2] === 'number') {
    try {
      closeSync(stdio[2])
    } catch {
      // best-effort — el hijo ya tiene su propio dup del fd
    }
  }
  child.unref()

  if (child.pid === undefined) {
    rmSync(opts.jobDir, { recursive: true, force: true })
    process.stderr.write(`Failed to spawn pty-host: ${fullCmd.join(' ')}\n`)
    process.exit(1)
  }

  // Pretty hint output: cyan short, dim hints (ant 4649.js tw6).
  // Suppressed when called from FleetView (TUI owns the screen).
  if (opts.quiet !== true) {
    const d = (l: string, r: string) => chalk.dim(`  ${l.padEnd(26)}${r}`)
    process.stdout.write(
      [
        `backgrounded (pty) · ${chalk.cyan(opts.short)}`,
        d(`ccb attach ${opts.short}`, 'open in this terminal (bidirectional)'),
        d(`ccb stop ${opts.short}`, 'stop this session (SIGTERM)'),
        d(`ccb rm   ${opts.short}`, 'remove the job directory'),
        '',
      ].join('\n'),
    )
  }

  // readProcStart is sync (reads /proc or runs ps); cheap enough at spawn time.
  // Imported lazily to avoid pulling daemon package into a path this file
  // could be called from without daemon present.
  const { readProcStart } = require('@thyrox/daemon/bgWorkerRegistry.js') as typeof import('@thyrox/daemon/bgWorkerRegistry.js')
  return {
    short: opts.short,
    pid: child.pid,
    cmd: fullCmd,
    cwd: opts.cwd,
    startedAt: Date.now(),
    socketPath,
    rendezvousSocketPath,
    mode: 'pty',
    procStart: readProcStart(child.pid) || undefined,
    cliVersion: MACRO.VERSION,
  }
}
