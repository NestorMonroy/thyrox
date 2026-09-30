/**
 * El informe del perfilador de arranque se cierra al TERMINAR el proceso,
 * sin importar el camino que lo cierre — hoy sólo el REPL invocaba
 * `profileReport` explícitamente (`gracefulShutdown.ts`, `run-program.ts`);
 * `--version`, los modos ligeros (`providers`, `mitm`) y `-p` en modo de
 * impresión nunca lo llamaban, así que `THYROX_CODE_PROFILE_STARTUP` no
 * dejaba ningún informe fuera de ese camino (TASK-THYROX-0438, #130-7).
 *
 * Se prueba con un proceso aparte, no con `resetProfilerStateForTests`: el
 * gancho de cierre se registra una sola vez al cargar el módulo
 * (`process.once('exit', …)`), y su comportamiento frente a un
 * `process.exit()` explícito —que salta cualquier `finally` de la pila— sólo
 * se puede observar dejando morir un proceso real.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const STARTUP_PROFILER_MODULE = join(import.meta.dir, '..', 'startupProfiler.ts')

function reportFileNames(configDir: string): string[] {
  try {
    return readdirSync(join(configDir, 'startup-perf'))
  } catch {
    return []
  }
}

function runProbe(script: string, configDir: string): number | null {
  const done = Bun.spawnSync(['bun', '-e', script], {
    env: {
      ...process.env,
      THYROX_CODE_PROFILE_STARTUP: '1',
      THYROX_CONFIG_DIR: configDir,
      STARTUP_PROFILER_MODULE_PATH: STARTUP_PROFILER_MODULE,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return done.exitCode
}

describe('profileReport al cierre del proceso, sin llamarlo explícitamente', () => {
  test('un camino que llama a process.exit() directo deja exactamente un informe', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'startup-profiler-report-exit-'))
    try {
      const exitCode = runProbe(
        `const { profileCheckpoint } = await import(process.env.STARTUP_PROFILER_MODULE_PATH)
profileCheckpoint('cli_entry')
process.exit(0)`,
        configDir,
      )
      expect(exitCode).toBe(0)
      expect(reportFileNames(configDir).length).toBe(1)
    } finally {
      rmSync(configDir, { recursive: true, force: true })
    }
  })

  test('un camino que retorna sin llamar a process.exit() también deja un informe', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'startup-profiler-report-return-'))
    try {
      const exitCode = runProbe(
        `const { profileCheckpoint } = await import(process.env.STARTUP_PROFILER_MODULE_PATH)
profileCheckpoint('cli_entry')`,
        configDir,
      )
      expect(exitCode).toBe(0)
      expect(reportFileNames(configDir).length).toBe(1)
    } finally {
      rmSync(configDir, { recursive: true, force: true })
    }
  })

  test('si el camino ya reportó con su propia sesión, el cierre no agrega un segundo informe', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'startup-profiler-report-dedupe-'))
    try {
      const exitCode = runProbe(
        `const { profileCheckpoint, profileReport } = await import(process.env.STARTUP_PROFILER_MODULE_PATH)
profileCheckpoint('cli_entry')
profileReport({ sessionId: 'sesion-real' })
process.exit(0)`,
        configDir,
      )
      expect(exitCode).toBe(0)
      const files = reportFileNames(configDir)
      expect(files.length).toBe(1)
      expect(files[0]).toBe('sesion-real.txt')
    } finally {
      rmSync(configDir, { recursive: true, force: true })
    }
  })

  test('sin THYROX_CODE_PROFILE_STARTUP, el cierre no escribe ningún archivo', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'startup-profiler-report-off-'))
    try {
      const done = Bun.spawnSync(['bun', '-e',
        `const { profileCheckpoint } = await import(process.env.STARTUP_PROFILER_MODULE_PATH)
profileCheckpoint('cli_entry')
process.exit(0)`,
      ], {
        env: {
          ...process.env,
          THYROX_CODE_PROFILE_STARTUP: '',
          THYROX_CONFIG_DIR: configDir,
          STARTUP_PROFILER_MODULE_PATH: STARTUP_PROFILER_MODULE,
        },
        stdout: 'pipe',
        stderr: 'pipe',
      })
      expect(done.exitCode).toBe(0)
      expect(reportFileNames(configDir).length).toBe(0)
    } finally {
      rmSync(configDir, { recursive: true, force: true })
    }
  })
})
