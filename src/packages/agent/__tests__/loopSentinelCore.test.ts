/**
 * Tests para el resolutor de sentinel del loop autónomo — porte de
 * `ccnmt: packages/agent/__tests__/loopSentinelCore.test.ts` (port-
 * correctness contra ant v2.1.136, módulo `xFH`, 2924.js + 2925.js).
 *
 * La ruta de fire-resolution es de integración (depende de env vars,
 * feature flags y config global que no sobreviven al mocking de
 * bun:test) — la propia fuente lo declara y estos tests unitarios fijan
 * los invariantes estructurales: los preámbulos difieren de las formas
 * documentadas, la detección de sentinel hace match con el conjunto
 * angosto de ant, y `resetAutonomousLoopDelivered()` de verdad resetea
 * el estado del módulo.
 *
 * PORTE COMPLETO desde que `internal/loopSentinelCore.ts` cerró sus 17
 * símbolos: el bloque `readLoopFile` de la fuente importa
 * `getCwdState`/`setCwdState` de `@thyrox/app-host/bootstrap/state.js`,
 * que hoy resuelve —medido con `Bun.resolveSync`— a
 * `src/packages/app-host/src/bootstrap/state.ts`. Sus cinco casos, que
 * mientras duró el recorte eran pines de PROSA sobre el docstring del
 * módulo, vuelven a medir CONDUCTA: un pin de prosa no discrimina «el
 * mecanismo funciona» de «el mecanismo no existe».
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  AUTONOMOUS_LOOP_DYNAMIC_SENTINEL,
  AUTONOMOUS_LOOP_PREAMBLE,
  AUTONOMOUS_LOOP_SENTINEL,
  getAutonomousLoopPreamble,
  isAutonomousLoopSentinel,
  isLoopDefaultSentinel,
  isLoopFileSentinel,
  LOOP_FILE_DYNAMIC_SENTINEL,
  LOOP_FILE_SENTINEL,
  resetAutonomousLoopDelivered,
} from '../internal/loopSentinelCore.js'

afterEach(() => {
  resetAutonomousLoopDelivered()
  delete process.env.CLAUDE_CODE_LOOP_PERSISTENT
})

describe('constantes de sentinel (ant zBH / KzH / z67 / rz_)', () => {
  test('sentinel de cron del loop autónomo = "<<autonomous-loop>>"', () => {
    expect(AUTONOMOUS_LOOP_SENTINEL).toBe('<<autonomous-loop>>')
  })
  test('sentinel dinámico del loop autónomo = "<<autonomous-loop-dynamic>>"', () => {
    expect(AUTONOMOUS_LOOP_DYNAMIC_SENTINEL).toBe('<<autonomous-loop-dynamic>>')
  })
  test('sentinel de loop.md = "<<loop.md>>"', () => {
    expect(LOOP_FILE_SENTINEL).toBe('<<loop.md>>')
  })
  test('sentinel dinámico de loop.md = "<<loop.md-dynamic>>"', () => {
    expect(LOOP_FILE_DYNAMIC_SENTINEL).toBe('<<loop.md-dynamic>>')
  })
})

describe('isAutonomousLoopSentinel / isLoopFileSentinel / isLoopDefaultSentinel', () => {
  test('las variantes autónomas hacen match', () => {
    expect(isAutonomousLoopSentinel(AUTONOMOUS_LOOP_SENTINEL)).toBe(true)
    expect(isAutonomousLoopSentinel(AUTONOMOUS_LOOP_DYNAMIC_SENTINEL)).toBe(true)
  })
  test('lo autónomo NO hace match con las variantes de loop.md', () => {
    expect(isAutonomousLoopSentinel(LOOP_FILE_SENTINEL)).toBe(false)
    expect(isAutonomousLoopSentinel(LOOP_FILE_DYNAMIC_SENTINEL)).toBe(false)
  })
  test('lo autónomo NO hace match con strings sin relación', () => {
    expect(isAutonomousLoopSentinel('hello world')).toBe(false)
    expect(isAutonomousLoopSentinel('<<autonomous-loop-x>>')).toBe(false)
    expect(isAutonomousLoopSentinel('')).toBe(false)
  })
  test('las variantes de loop.md hacen match', () => {
    expect(isLoopFileSentinel(LOOP_FILE_SENTINEL)).toBe(true)
    expect(isLoopFileSentinel(LOOP_FILE_DYNAMIC_SENTINEL)).toBe(true)
  })
  test('loop.md NO hace match con las variantes autónomas', () => {
    expect(isLoopFileSentinel(AUTONOMOUS_LOOP_SENTINEL)).toBe(false)
    expect(isLoopFileSentinel(AUTONOMOUS_LOOP_DYNAMIC_SENTINEL)).toBe(false)
  })
  test('isLoopDefaultSentinel es la unión de ambos', () => {
    expect(isLoopDefaultSentinel(AUTONOMOUS_LOOP_SENTINEL)).toBe(true)
    expect(isLoopDefaultSentinel(AUTONOMOUS_LOOP_DYNAMIC_SENTINEL)).toBe(true)
    expect(isLoopDefaultSentinel(LOOP_FILE_SENTINEL)).toBe(true)
    expect(isLoopDefaultSentinel(LOOP_FILE_DYNAMIC_SENTINEL)).toBe(true)
    expect(isLoopDefaultSentinel('whatever')).toBe(false)
  })
})

describe('AUTONOMOUS_LOOP_PREAMBLE (ant EY8 — default / steward)', () => {
  test('empieza con la cabecera canónica "# Autonomous loop check"', () => {
    // La variante persistente de ant usa LA MISMA cabecera — afirmar
    // que la distinción vive en el cuerpo, no en la cabecera.
    expect(AUTONOMOUS_LOOP_PREAMBLE.startsWith('# Autonomous loop check\n')).toBe(true)
  })
  test('contiene la frase de modo steward "lean toward the former only"', () => {
    expect(AUTONOMOUS_LOOP_PREAMBLE).toContain('lean toward the former only')
  })
  test('contiene "say so in one sentence and stop" (rama quieta de steward)', () => {
    expect(AUTONOMOUS_LOOP_PREAMBLE).toContain(
      'say so in one sentence and stop',
    )
  })
  test('contiene "do one quick CI/threads check and stop" (rama de repetición de steward)', () => {
    expect(AUTONOMOUS_LOOP_PREAMBLE).toContain(
      'do one quick CI/threads check and stop',
    )
  })
  test('contiene los encabezados de sección "## What to act on" + "## Repeated invocations"', () => {
    expect(AUTONOMOUS_LOOP_PREAMBLE).toContain('## What to act on')
    expect(AUTONOMOUS_LOOP_PREAMBLE).toContain('## Repeated invocations')
  })
})

describe('preámbulo persistente (ant q67)', () => {
  test('se selecciona vía la env CLAUDE_CODE_LOOP_PERSISTENT=1', () => {
    process.env.CLAUDE_CODE_LOOP_PERSISTENT = '1'
    const got = getAutonomousLoopPreamble()
    expect(got).not.toBe(AUTONOMOUS_LOOP_PREAMBLE)
  })
  test('el preámbulo persistente tiene la misma cabecera "# Autonomous loop check"', () => {
    process.env.CLAUDE_CODE_LOOP_PERSISTENT = '1'
    const got = getAutonomousLoopPreamble()
    expect(got.startsWith('# Autonomous loop check\n')).toBe(true)
  })
  test('la variante persistente contiene "following through on the *spirit*"', () => {
    process.env.CLAUDE_CODE_LOOP_PERSISTENT = '1'
    const got = getAutonomousLoopPreamble()
    expect(got).toContain('following through on the *spirit*')
  })
  test('la variante persistente contiene el framing de reversibilidad', () => {
    process.env.CLAUDE_CODE_LOOP_PERSISTENT = '1'
    const got = getAutonomousLoopPreamble()
    expect(got).toContain('For irreversible actions (push, delete, send)')
    expect(got).toContain('For reversible actions (edits, tests, drafts, exploration)')
  })
  test('la variante persistente dice "keep the loop alive" y no "stop" en la rama quieta', () => {
    process.env.CLAUDE_CODE_LOOP_PERSISTENT = '1'
    const got = getAutonomousLoopPreamble()
    expect(got).toContain('keep the loop alive')
    expect(got).toContain('Persistence is the point of autonomous mode')
  })
  test('la variante persistente dice "broaden scope once before considering stopping"', () => {
    process.env.CLAUDE_CODE_LOOP_PERSISTENT = '1'
    const got = getAutonomousLoopPreamble()
    expect(got).toContain('broaden scope once before considering stopping')
  })
  test('env="0" fuerza el default aunque otras compuertas activarían', () => {
    process.env.CLAUDE_CODE_LOOP_PERSISTENT = '0'
    expect(getAutonomousLoopPreamble()).toBe(AUTONOMOUS_LOOP_PREAMBLE)
  })
  test('env="false" también fuerza el default', () => {
    process.env.CLAUDE_CODE_LOOP_PERSISTENT = 'false'
    expect(getAutonomousLoopPreamble()).toBe(AUTONOMOUS_LOOP_PREAMBLE)
  })
  test('sin env devuelve el preámbulo default (con la bandera apagada)', () => {
    expect(getAutonomousLoopPreamble()).toBe(AUTONOMOUS_LOOP_PREAMBLE)
  })
})

describe('resetAutonomousLoopDelivered', () => {
  test('limpia el estado a nivel de módulo', () => {
    // No podemos observar `loopPreambleDelivered` directamente, pero el
    // reset no debe reventar y debe dejar el módulo invocable.
    expect(() => resetAutonomousLoopDelivered()).not.toThrow()
    expect(() => resetAutonomousLoopDelivered()).not.toThrow()
  })
})

// ─── readLoopFile (ant $67) — el fallback al config home de Claude ────────
//
// Fijan el fix CRITICO: el segundo candidato de ant es `~/.claude/loop.md`
// (via `getClaudeConfigHomeDir()`), NO `~/loop.md` (via `homedir()`). La
// implementacion previa de ccb tenia la base equivocada y perdia el archivo
// en silencio cuando `CLAUDE_CONFIG_DIR` estaba sobreescrito.
//
// Hasta el porte completo del modulo estos cinco casos eran pines de FUENTE
// —verificaban que el recorte estuviera declarado en el docstring— porque
// `readLoopFile` no se habia portado. Hoy el mecanismo esta, asi que miden
// conducta: los pines de prosa no discriminaban «el mecanismo funciona» de
// «el mecanismo no existe».

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { getCwdState, setCwdState } from '@thyrox/app-host/bootstrap/state.js'
import { readLoopFile } from '../internal/loopSentinelCore.js'

describe('readLoopFile (ant $67) — fallback al config home de Claude', () => {
  let homeDir: string
  let cwdBackup: string
  let projectCwd: string

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), 'thyrox-loop-home-'))
    process.env.CLAUDE_CONFIG_DIR = homeDir
    // `readLoopFile` resuelve el cwd con el `getCwd` de app-host, que lee
    // STATE.cwd y no `process.cwd`. Se guarda el cwd del estado y se
    // sobreescribe con el directorio temporal de la prueba.
    cwdBackup = getCwdState()
    projectCwd = mkdtempSync(join(tmpdir(), 'thyrox-loop-project-'))
    setCwdState(projectCwd)
  })

  afterEach(() => {
    setCwdState(cwdBackup)
    rmSync(projectCwd, { recursive: true, force: true })
    rmSync(homeDir, { recursive: true, force: true })
    delete process.env.CLAUDE_CONFIG_DIR
  })

  test('devuelve null cuando no existe ninguno de los dos candidatos', () => {
    expect(readLoopFile()).toBeNull()
  })

  test('lee primero el .claude/loop.md del proyecto', () => {
    mkdirSync(join(projectCwd, '.claude'), { recursive: true })
    writeFileSync(
      join(projectCwd, '.claude', 'loop.md'),
      'task 1\ntask 2',
      'utf8',
    )
    const got = readLoopFile()
    expect(got).not.toBeNull()
    expect(got!.content).toBe('task 1\ntask 2')
    expect(got!.path.endsWith('/.claude/loop.md')).toBe(true)
  })

  test('cae a ~/.claude/loop.md (NO a ~/loop.md)', () => {
    // El pin del fix critico: la base del segundo candidato es el config
    // home de Claude —que `CLAUDE_CONFIG_DIR` sobreescribe al temporal de
    // la prueba—, no `os.homedir()`.
    writeFileSync(join(homeDir, 'loop.md'), 'fallback content', 'utf8')
    const got = readLoopFile()
    expect(got).not.toBeNull()
    expect(got!.content).toBe('fallback content')
    expect(got!.path).toBe(join(homeDir, 'loop.md'))
  })

  test('un archivo vacio tras el trim salta al siguiente candidato', () => {
    mkdirSync(join(projectCwd, '.claude'), { recursive: true })
    writeFileSync(
      join(projectCwd, '.claude', 'loop.md'),
      '   \n\t\n   ',
      'utf8',
    )
    writeFileSync(join(homeDir, 'loop.md'), 'real content', 'utf8')
    const got = readLoopFile()
    expect(got!.content).toBe('real content')
  })

  test('trunca un loop.md de mas de 25000 bytes con el footer WARNING', () => {
    const big = ('a'.repeat(100) + '\n').repeat(300) // ~30 KB
    mkdirSync(join(projectCwd, '.claude'), { recursive: true })
    writeFileSync(join(projectCwd, '.claude', 'loop.md'), big, 'utf8')
    const got = readLoopFile()
    expect(got).not.toBeNull()
    expect(got!.content.length).toBeLessThan(big.length)
    expect(got!.content).toContain('WARNING: loop.md was truncated')
  })
})
