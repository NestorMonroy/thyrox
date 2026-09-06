/**
 * Porte de
 * `ccnmt: packages/agent/__tests__/internalLoopDynamicCore.behavior.test.ts`.
 *
 * Pines a nivel de fuente para `internal/loopDynamicCore.ts` — el
 * algoritmo detrás de ScheduleWakeupTool. Porte de ant v2.1.123
 * (resplit/2551.js, `VS1`).
 *
 * Invariantes centrales que vale la pena fijar byte a byte:
 *   1. Ventana de acotado del retraso: [60, 3600] segundos.
 *   2. NaN → MIN_LOOP_DELAY_SECONDS (60), Infinity → MAX (3600),
 *      -Infinity → MIN (60). Estos tres caminos de NaN/Infinity son
 *      comportamiento real de ant — un refactor que default-ee NaN a 0
 *      reventaría el generador de cron.
 *   3. Formato de cadena cron: 5 campos `${min} ${hour} * * *` (NO 6
 *      campos con segundos; NO 7 campos con año).
 *   4. Tareas de cron etiquetadas con `kind: 'loop'` (las distingue de
 *      /dream y crons de usuario).
 *   5. Re-agendar cancela los loops existentes con el mismo prompt (sin
 *      duplicados).
 *   6. Tope de recurringMaxAgeMs (default 7 días): se rehúsa con
 *      telemetría `tengu_loop_dynamic_wakeup_aged_out` y devuelve null.
 *   7. Detección de cadena obsoleta: la cadena se considera fresca si
 *      estuvo en silencio más allá de MAX_LOOP_DELAY_SECONDS. Resetea
 *      startedAt cuando está obsoleta.
 *   8. Corrección de adelanto de caché: retrocede el objetivo un
 *      minuto a la vez mientras sigue dentro de la ventana de 5 min Y
 *      por encima del piso MIN. Evita que el despertar caiga en la
 *      expiración de caché.
 *   9. isLoopDynamicEnabled usa un require PEREZOSO (evita cargar la
 *      bandera de feature de forma eager).
 */
import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

import {
  MAX_LOOP_DELAY_SECONDS,
  MIN_LOOP_DELAY_SECONDS,
} from '../internal/loopDynamicCore.js'

describe('internal/loopDynamicCore — constantes públicas', () => {
  test('MIN_LOOP_DELAY_SECONDS = 60', () => {
    expect(MIN_LOOP_DELAY_SECONDS).toBe(60)
  })

  test('MAX_LOOP_DELAY_SECONDS = 3600 (tope de 1 hora)', () => {
    expect(MAX_LOOP_DELAY_SECONDS).toBe(3600)
  })
})

describe('internal/loopDynamicCore — pines de fuente', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'internal', 'loopDynamicCore.ts'),
    'utf-8',
  )

  describe('Acotado del retraso (manejo de NaN / Infinity)', () => {
    test('NaN(delay) → MIN_LOOP_DELAY_SECONDS (60s)', () => {
      // Pin: una regresión que default-ee NaN a 0 generaría una
      // cadena cron inválida (Math.round(NaN) → NaN).
      expect(source).toMatch(
        /if \(Number\.isNaN\(delaySeconds\)\) \{\s*\n?\s*raw = MIN_LOOP_DELAY_SECONDS/,
      )
    })

    test('Infinity → MAX_LOOP_DELAY_SECONDS (3600s)', () => {
      expect(source).toMatch(
        /else if \(delaySeconds === Infinity\) \{\s*\n?\s*raw = MAX_LOOP_DELAY_SECONDS/,
      )
    })

    test('-Infinity → MIN_LOOP_DELAY_SECONDS (60s)', () => {
      expect(source).toMatch(
        /else if \(delaySeconds === -Infinity\) \{\s*\n?\s*raw = MIN_LOOP_DELAY_SECONDS/,
      )
    })

    test('finito → Math.round (NO floor ni ceil)', () => {
      // Pin: ant usa Math.round, así que 60.4 → 60, 60.5 → 61. floor/ceil
      // sesgarían sistemáticamente el agendado en medio segundo a lo
      // largo de muchas llamadas.
      expect(source).toMatch(/raw = Math\.round\(delaySeconds\)/)
    })

    test('el acotado usa Math.max + Math.min anidados (NO un helper de clamp a medida)', () => {
      expect(source).toMatch(
        /const clamped = Math\.max\(\s*\n?\s*MIN_LOOP_DELAY_SECONDS,\s*\n?\s*Math\.min\(MAX_LOOP_DELAY_SECONDS, raw\),\s*\n?\s*\)/,
      )
    })

    test('bandera wasClamped: !isFinite O raw !== clamped', () => {
      // Pin: lo no-finito SIEMPRE se marca como acotado. Un refactor
      // que quite !isFinite dejaría pasar Infinity con wasClamped=false.
      expect(source).toMatch(
        /wasClamped = !Number\.isFinite\(delaySeconds\) \|\| raw !== clamped/,
      )
    })
  })

  describe('Formato de la cadena cron', () => {
    test('cadena cron de 5 campos: `${min} ${hour} * * *`', () => {
      // Pin: 5 campos. El parser de cron de ant no toma 6 ni 7 campos
      // aquí.
      expect(source).toMatch(
        /const cron = `\$\{target\.getMinutes\(\)\} \$\{target\.getHours\(\)\} \* \* \*`/,
      )
    })

    test('las tareas de cron se etiquetan con kind: "loop"', () => {
      // Pin: distingue los crons de loop de /dream y los crons puestos
      // por el usuario. Filtra por `t.kind === 'loop'` en las rutas de
      // cancelación.
      expect(source).toMatch(/kind: 'loop',/)
    })
  })

  describe('Alineación de tiempo', () => {
    test('alignToNextMinute salta al próximo minuto cuando sec/ms > 0', () => {
      expect(source).toMatch(
        /if \(d\.getSeconds\(\) > 0 \|\| d\.getMilliseconds\(\) > 0\) \{\s*\n?\s*d\.setMinutes\(d\.getMinutes\(\) \+ 1\)\s*\n?\s*\}/,
      )
    })

    test('alignToNextMinute pone en cero segundos Y ms vía setSeconds(0, 0)', () => {
      // Pin: la forma de dos argumentos (0, 0). setSeconds(0) solo deja
      // los ms.
      expect(source).toMatch(/d\.setSeconds\(0, 0\)/)
    })

    test('FIVE_MINUTES_MS = 5 * 60 * 1000 (ventana de adelanto de caché)', () => {
      expect(source).toMatch(/FIVE_MINUTES_MS = 5 \* 60 \* 1000/)
    })

    test('la corrección de adelanto de caché retrocede en 60_000 ms (1 minuto)', () => {
      expect(source).toMatch(/alignedMs -= 60_000/)
    })

    test('piso del loop de adelanto de caché: alignedMs - 60_000 >= now + piso MIN', () => {
      // Pin: nunca retrocede el objetivo por debajo del piso de 60
      // segundos.
      expect(source).toMatch(
        /alignedMs - 60_000 >= now \+ MIN_LOOP_DELAY_SECONDS \* 1000/,
      )
    })
  })

  describe('Tope de edad de la cadena (recurringMaxAgeMs)', () => {
    test('devuelve null cuando la edad >= recurringMaxAgeMs', () => {
      expect(source).toMatch(
        /now - startedAt >= recurringMaxAgeMs[\s\S]+?return null/,
      )
    })

    test('emite telemetría tengu_loop_dynamic_wakeup_aged_out al llegar al tope', () => {
      // Pin: este nombre de evento exacto vive en la telemetría de ant
      // upstream; un rename dejaría huérfanos los dashboards.
      expect(source).toMatch(/'tengu_loop_dynamic_wakeup_aged_out'/)
    })

    test('aged-out fija agedOut: true UNA SOLA VEZ (idempotente)', () => {
      // Pin: guard `if (!existing?.agedOut)` — una regresión dispararía
      // la telemetría en cada chequeo, contaminando los dashboards.
      expect(source).toMatch(
        /if \(!existing\?\.agedOut\) \{[\s\S]+?agedOut: true,/,
      )
    })

    test('cadena obsoleta (en silencio más allá de MAX_LOOP_DELAY) resetea startedAt', () => {
      expect(source).toMatch(
        /isStaleChain =\s*\n?\s*existing !== undefined &&\s*\n?\s*now > existing\.lastScheduledFor \+ MAX_LOOP_DELAY_SECONDS \* 1000/,
      )
    })
  })

  describe('Deduplicación de prompt al re-agendar', () => {
    test('cancelLoopCronsForPrompt filtra por kind="loop" Y coincidencia de prompt', () => {
      // Pin: hace match con AMBOS campos. Filtrar sólo por prompt
      // tumbaría por accidente crons de /dream que comparten prompt.
      expect(source).toMatch(
        /\.filter\(t => t\.kind === 'loop' && t\.prompt === prompt\)/,
      )
    })

    test('scheduleLoopWakeup llama a cancelLoopCronsForPrompt PRIMERO', () => {
      // Pin: cancela antes de re-agregar. Invertirlo dejaría brevemente
      // AMBOS crons activos, disparando doble.
      const fnStart = source.indexOf('export function scheduleLoopWakeup')
      const body = source.slice(fnStart, fnStart + 500)
      // La primera sentencia no-firma en el cuerpo debe ser la
      // cancelación.
      expect(body).toMatch(
        /\): ScheduleResult \| null \{\s*\n\s*cancelLoopCronsForPrompt\(prompt\)/,
      )
    })
  })

  describe('Ruta de cancelar-todo', () => {
    test('cancelAllPendingLoopSessionCrons devuelve el conteo de crons cancelados', () => {
      expect(source).toMatch(
        /export function cancelAllPendingLoopSessionCrons\(\): number/,
      )
      expect(source).toMatch(/return loopCrons\.length/)
    })

    test('cancelar-todo limpia las entradas de loopChainStartedAt (para que el re-armado sea fresco)', () => {
      // Pin: deleteLoopChainStartedAt se llama por cada cron cancelado.
      // Olvidarlo dejaría corriendo un `startedAt` obsoleto, envejeciendo
      // prematuramente el próximo loop re-armado.
      expect(source).toMatch(
        /for \(const t of loopCrons\) deleteLoopChainStartedAt\(t\.prompt\)/,
      )
    })

    test('retorno temprano de 0 cuando no hay crons de loop (sin telemetría, sin trabajo)', () => {
      expect(source).toMatch(
        /if \(loopCrons\.length === 0\) return 0/,
      )
    })
  })

  describe('Payload de telemetría', () => {
    test('emite tengu_loop_dynamic_wakeup_scheduled con reason acotado a 200 caracteres', () => {
      // Pin: el tope de 200 caracteres protege la telemetría de prompts
      // sobredimensionados.
      expect(source).toMatch(/reason\.slice\(0, 200\)/)
    })

    test('chosen_delay_seconds: 0 cuando el input no es finito', () => {
      // Pin: la telemetría no puede serializar Infinity/NaN; ant
      // sustituye 0.
      expect(source).toMatch(
        /chosen_delay_seconds: Number\.isFinite\(delaySeconds\) \? delaySeconds : 0/,
      )
    })
  })

  describe('Bandera de feature (import perezoso)', () => {
    test('isLoopDynamicEnabled usa require perezoso (NO import top-level)', () => {
      // Pin: feature-flags trae growthbook + zod. Un import top-level
      // cargaría eager en cada import del paquete `agent`.
      expect(source).toMatch(
        /isLoopDynamicEnabled[\s\S]+?require\(\s*\n?\s*'@claude-code-how-works\/config\/feature-flags',?\s*\n?\s*\)/,
      )
    })

    test('el nombre de la bandera es "tengu_kairos_loop_dynamic" con default false', () => {
      // Pin: nombre de bandera de ant. Renombrarla desactivaría la
      // feature en silencio.
      expect(source).toMatch(
        /getFeatureValue_CACHED_MAY_BE_STALE\(\s*\n?\s*'tengu_kairos_loop_dynamic',\s*\n?\s*false,?\s*\n?\s*\)/,
      )
    })
  })

  describe('Generación del id corto del loop', () => {
    test('makeLoopShortId es hex de 8 caracteres con zero-padding desde un uint32 random', () => {
      // Pin: 8 caracteres hace match con el formato de id de ant. Un
      // rewrite a randomUUID cambiaría el formato (con guiones) y
      // rompería el filtrado.
      expect(source).toMatch(
        /Math\.floor\(Math\.random\(\) \* 0xffffffff\)\s*\n?\s*\.toString\(16\)\s*\n?\s*\.padStart\(8, '0'\)/,
      )
    })
  })

  describe('Efectos colaterales de estado del scheduler', () => {
    test('el agendado fija scheduledTasksEnabled = true (para que corra el loop de cron)', () => {
      // Pin: sin esto, el cron nuevo se queda ahí para siempre. ant
      // invierte este flag en cada agendado (fijado de estado
      // idempotente).
      expect(source).toMatch(/setScheduledTasksEnabled\(true\)/)
    })

    test('setLoopChainStartedAt se llama con el nuevo lastScheduledFor', () => {
      expect(source).toMatch(
        /setLoopChainStartedAt\(prompt, \{ startedAt, lastScheduledFor: targetMs \}\)/,
      )
    })
  })
})
