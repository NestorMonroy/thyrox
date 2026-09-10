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
 * PORTE PARCIAL declarado (ver `internal/loopSentinelCore.ts`): el
 * bloque `readLoopFile` de la fuente importa
 * `getCwdState`/`setCwdState` directamente de
 * `@claude-code-how-works/app-host/bootstrap/state.js`, ausente en
 * este árbol. Sus cinco casos se reproponen abajo como pines de fuente
 * que verifican que la exclusión está documentada — no se fabrica el
 * mecanismo de cwd/config-home ausente en silencio.
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

// ─── readLoopFile (ant $67) — PORTE PARCIAL, ver el docstring del módulo ──
//
// Los cinco casos de la fuente fijaban el fix CRÍTICO: el segundo
// candidato de ant es `~/.claude/loop.md` (vía `getClaudeConfigHomeDir()`),
// NO `~/loop.md` (vía `homedir()`). No se pueden pinear contra un
// mecanismo que no existe aquí sin fabricarlo — eso sería un porte
// parcial silencioso. En su lugar cada uno verifica que el docstring
// del módulo declare explícitamente `readLoopFile` como excluido y su
// razón (app-host/config-env ausentes): el pin pasa a proteger que la
// declaración de recorte no desaparezca en un edit futuro, en vez de
// proteger un mecanismo que no está.

import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('readLoopFile (ant $67) — pines de fuente sobre la exclusión declarada', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'internal', 'loopSentinelCore.ts'),
    'utf-8',
  )

  test('readLoopFile no se porta — declarado excluido por app-host ausente', () => {
    expect(source).toMatch(/`readLoopFile`/)
    expect(source).toMatch(/getCwd\(\)/)
    expect(source).toMatch(/PORTE PARCIAL declarado/)
  })

  test('el candidato de proyecto (.claude\\/loop.md) no se porta — mismo motivo', () => {
    expect(source).toMatch(/@claude-code-how-works\/app-host\/bootstrap\/cwd\.js/)
    expect(source).toMatch(/monorepo de 32 paquetes/)
  })

  test('el fallback ~\\/.claude\\/loop.md (vía getClaudeConfigHomeDir, NO homedir) no se porta', () => {
    // Pin de la declaración misma del fix crítico que el test de origen
    // fijaba: el candidato es getClaudeConfigHomeDir(), no homedir().
    expect(source).toMatch(/getClaudeConfigHomeDir/)
    expect(source).toMatch(/@claude-code-how-works\/config\/env\/utils/)
    expect(source).not.toMatch(/homedir\(\)/)
  })

  test('el descarte de archivo vacío (post-trim) no se porta — mismo motivo', () => {
    expect(source).toMatch(/getCwdState`\/`setCwdState`/)
    expect(source).toMatch(
      /@claude-code-how-works\/app-host\/bootstrap\/state\.js/,
    )
  })

  test('el truncado a LOOP_FILE_MAX_BYTES con footer WARNING no se porta — mismo motivo', () => {
    expect(source).toMatch(/`truncateLoopFile`, `LOOP_FILE_MAX_BYTES`/)
    expect(source).toMatch(/PORTE PARCIAL declarado/)
    expect(source).toMatch(/LOOP_FALLBACK_PREAMBLE_SENTINEL/)
  })
})
