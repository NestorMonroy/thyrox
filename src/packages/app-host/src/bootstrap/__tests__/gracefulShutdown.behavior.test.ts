/**
 * Porte de
 * `ccnmt: packages/app-host/src/bootstrap/__tests__/gracefulShutdown.behavior.test.ts`.
 *
 * Son pins A NIVEL DE FUENTE de `gracefulShutdown.ts` — el handler de
 * apagado del proceso. Muchos invariantes aquí son DE VIDA O MUERTE:
 *
 *  - La limpieza en estado terminal debe correr aunque forceExit falle.
 *  - El timer de failsafe debe garantizar la salida (5s mínimo).
 *  - SIGHUP → exit 129 (128+1); SIGTERM → exit 143 (128+15) — convención UNIX.
 *  - Detector de bucle de excepciones no atrapadas: 10 en 5s → apagado.
 *  - El modo print SALTA el handler global de SIGINT (print.ts es su dueño).
 *  - Los hooks de SessionEnd acotados por getSessionEndHookTimeoutMs (settings).
 *  - Pin de signal-exit: un suscriptor no-op evita que un bug de Bun tumbe
 *    los handlers.
 *
 * Descripciones traducidas al español; los patrones `toMatch` (que son el
 * pin sobre el texto literal de la fuente) se conservan carácter por
 * carácter contra el original.
 */
import { describe, expect, test } from 'bun:test'

import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('gracefulShutdown — pins de fuente', () => {
  const source = readFileSync(
    resolve(__dirname, '..', 'gracefulShutdown.ts'),
    'utf-8',
  )

  describe('Convenciones de código de salida (UNIX 128+señal)', () => {
    test('SIGTERM → exit 143 (128 + 15)', () => {
      // Pin: convención UNIX estándar. Los init systems / supervisores
      // leen esto. Cambiarlo rompe herramientas que vigilan códigos de salida.
      expect(source).toMatch(
        /process\.on\('SIGTERM'[\s\S]+?gracefulShutdown\(143\)/,
      )
    })

    test('SIGHUP → exit 129 (128 + 1)', () => {
      expect(source).toMatch(
        /process\.on\('SIGHUP'[\s\S]+?gracefulShutdown\(129\)/,
      )
    })

    test('SIGINT → exit 0 (iniciado por el usuario, se trata como limpio)', () => {
      // Pin: ctrl+c es una salida limpia. Una regresión a 130 (128+2)
      // haría que scripts de CI que distinguen "terminó normal" de
      // "el usuario canceló" lean todo Ctrl+C como fallo.
      expect(source).toMatch(
        /process\.on\('SIGINT'[\s\S]+?gracefulShutdown\(0\)/,
      )
    })
  })

  describe('SIGINT — salto en modo print', () => {
    test('SIGINT retorna temprano cuando -p o --print está en argv', () => {
      // Pin: print.ts registra su propio handler de SIGINT. El global
      // debe saltarse en modo print para no competir con él.
      expect(source).toMatch(
        /SIGINT[\s\S]+?if \(process\.argv\.includes\('-p'\) \|\| process\.argv\.includes\('--print'\)\) \{\s*\n?\s*return/,
      )
    })
  })

  describe('Timer de salida de failsafe', () => {
    test('presupuesto de failsafe = max(5000, sessionEndTimeoutMs + 3500)', () => {
      // Pin: un presupuesto de hooks configurado por el usuario en 10s
      // recibe un failsafe de 13.5s — NO se trunca por el mínimo de 5s.
      // Riesgo de regresión inversa: harcodear 5000 truncaría en silencio
      // los presupuestos de hook fijados por el usuario.
      expect(source).toMatch(
        /Math\.max\(5000, sessionEndTimeoutMs \+ 3500\)/,
      )
    })

    test('failsafeTimer.unref() — no mantiene vivo el event loop', () => {
      expect(source).toMatch(/failsafeTimer\.unref\(\)/)
    })

    test('acción de failsafe: cleanupTerminalModes + printResumeHint + forceExit', () => {
      // Pin: los tres pasos en este orden exacto. Terminal primero
      // (si no, el resume hint cae en la alt screen), forceExit al final.
      expect(source).toMatch(
        /setTimeout\(\s*\n?\s*code => \{\s*\n?\s*cleanupTerminalModes\(\)\s*\n?\s*printResumeHint\(\)\s*\n?\s*forceExit\(code\)/,
      )
    })
  })

  describe('Timeout de limpieza (2000ms)', () => {
    test('runCleanupFunctions corre en carrera contra un timeout de 2 segundos', () => {
      // Pin: tope de 2s en la limpieza. Una limpieza más larga cuelga
      // la salida; una más corta trunca trabajo legítimo.
      expect(source).toMatch(
        /setTimeout\([\s\S]{0,200}?CleanupTimeoutError[\s\S]{0,100}?2000/,
      )
    })

    test('la clase CleanupTimeoutError está declarada (NO un string inline)', () => {
      // Pin: error tipado para que el test pueda distinguir timeout de
      // otros errores.
      expect(source).toMatch(/class CleanupTimeoutError extends Error/)
    })
  })

  describe('Detector de bucle de excepciones no atrapadas', () => {
    test('EXCEPTION_LOOP_WINDOW_MS = 5_000 (ventana deslizante de 5 segundos)', () => {
      // Pin: alineado con ant v2.1.131 (2821.js H38=5000).
      expect(source).toMatch(/EXCEPTION_LOOP_WINDOW_MS = 5_000/)
    })

    test('EXCEPTION_LOOP_THRESHOLD = 10 (10 excepciones en la ventana)', () => {
      // Pin: alineado con ant v2.1.131 fo1=10.
      expect(source).toMatch(/EXCEPTION_LOOP_THRESHOLD = 10/)
    })

    test('telemetría tengu_uncaught_exception (por excepción)', () => {
      expect(source).toMatch(/'tengu_uncaught_exception'/)
    })

    test('telemetría tengu_uncaught_exception_loop (cuando se dispara el umbral)', () => {
      expect(source).toMatch(/'tengu_uncaught_exception_loop'/)
    })

    test('errorMessageHash = sha256.slice(0, 16) (coincide con al_(H).error_message_hash de ant)', () => {
      // Pin: formato del hash. El dashboard agrupa exactamente por esta forma.
      expect(source).toMatch(
        /createHash\('sha256'\)\s*\n?\s*\.update\(error\.message \|\| ''\)\s*\n?\s*\.digest\('hex'\)\s*\n?\s*\.slice\(0, 16\)/,
      )
    })

    test('el apagado por bucle dispara gracefulShutdown(1, "fatal")', () => {
      expect(source).toMatch(/gracefulShutdown\(1, 'fatal'\)/)
    })

    test('la bandera loopShutdownFired evita llamadas repetidas de apagado', () => {
      // Pin: bandera monótona — el segundo disparo es un no-op.
      expect(source).toMatch(
        /if \([\s\S]{0,80}?exceptionTimestamps\.length >= EXCEPTION_LOOP_THRESHOLD &&[\s\S]{0,80}?!loopShutdownFired\s*\n?\s*\) \{\s*\n?\s*loopShutdownFired = true/,
      )
    })
  })

  describe('Workaround del bug de Bun en signal-exit v4', () => {
    test('se registra un suscriptor no-op de onExit (fija el conteo de emisores de v4 > 0)', () => {
      // Pin: bug documentado de Bun. Quitar onExit(() => {}) deja que
      // v4 se descargue, lo que llama removeListener y tumba el
      // sigaction del kernel.
      expect(source).toMatch(/onExit\(\(\) => \{\}\)/)
    })
  })

  describe('Limpieza de modos de terminal', () => {
    test('cleanupTerminalModes retorna temprano cuando stdout no es una TTY', () => {
      // Pin: evitar escribir secuencias de escape a un pipe.
      expect(source).toMatch(
        /cleanupTerminalModes\(\): void \{\s*\n?\s*if \(!process\.stdout\.isTTY\) \{\s*\n?\s*return/,
      )
    })

    test('DISABLE_MOUSE_TRACKING se dispara PRIMERO (antes de salir de la alt-screen)', () => {
      const fn = source.match(
        /function cleanupTerminalModes[\s\S]+?\n\}/,
      )?.[0]
      expect(fn).toBeTruthy()
      const mouseIdx = fn!.indexOf('DISABLE_MOUSE_TRACKING')
      const altIdx = fn!.indexOf('EXIT_ALT_SCREEN')
      // el mouse tracking va primero
      expect(mouseIdx).toBeLessThan(altIdx)
    })

    test('CLAUDE_CODE_DISABLE_TERMINAL_TITLE → salta la limpieza del título', () => {
      // Pin: si el usuario deshabilitó los cambios de título, no
      // limpiar su título existente al salir tampoco.
      expect(source).toMatch(
        /if \(!isEnvTruthy\(process\.env\.CLAUDE_CODE_DISABLE_TERMINAL_TITLE\)\)/,
      )
    })

    test('camino Windows: process.title = "" (sin secuencia de escape)', () => {
      // Pin: Windows no respeta el escape CLEAR_TERMINAL_TITLE; se usa
      // el setter process.title de Node.js en su lugar.
      expect(source).toMatch(
        /if \(process\.platform === 'win32'\) \{\s*\n?\s*process\.title = ''/,
      )
    })
  })

  describe('Comportamiento del hint de reanudación', () => {
    test('la bandera resumeHintPrinted evita la doble impresión', () => {
      // Pin: el timer de failsafe puede llamar printResumeHint una
      // segunda vez tras un apagado normal. Una sola vez.
      expect(source).toMatch(
        /if \(resumeHintPrinted\) \{\s*\n?\s*return\s*\n?\s*\}/,
      )
    })

    test('se muestra SOLO cuando isTTY && interactive && !persistenceDisabled', () => {
      // Pin: compuerta de 3 vías. Una regresión que quite cualquiera de
      // las tres imprimiría el hint de reanudación en sesiones no
      // interactivas / con salida redirigida.
      expect(source).toMatch(
        /process\.stdout\.isTTY &&[\s\S]+?getIsInteractive\(\) &&[\s\S]+?!isSessionPersistenceDisabled\(\)/,
      )
    })

    test('verificación de existencia del session ID (se salta en sesiones transitorias)', () => {
      // Pin: subcomandos como `claude update` no tienen archivo de
      // sesión. El hint de reanudación debe saltarlos.
      expect(source).toMatch(
        /if \(!sessionIdExists\(sessionId\)\) \{\s*\n?\s*return\s*\n?\s*\}/,
      )
    })
  })

  describe('Fallback de salida forzada', () => {
    test('fallback a SIGKILL cuando process.exit() lanza EIO', () => {
      // Pin: TTY muerta → process.exit lanza → SIGKILL.
      expect(source).toMatch(/process\.kill\(process\.pid, 'SIGKILL'\)/)
    })

    test('el modo test re-lanza (NO SIGKILL) para que el test pueda detectar el mock', () => {
      // Pin: camino NODE_ENV==='test'. Si no, los tests no podrían
      // interceptar el mock de process.exit.
      expect(source).toMatch(
        /if \(\(process\.env\.NODE_ENV as string\) === 'test'\) \{\s*\n?\s*throw e/,
      )
    })
  })

  describe('Idempotencia del apagado', () => {
    test('la bandera shutdownInProgress evita llamadas recursivas', () => {
      // Pin: crítico. Sin esto, un SIGINT durante la limpieza dispararía
      // dos veces y podría causar un deadlock.
      expect(source).toMatch(
        /if \(shutdownInProgress\) \{\s*\n?\s*return\s*\n?\s*\}\s*\n?\s*shutdownInProgress = true/,
      )
    })
  })

  describe('Detección de huérfanos (revocación de TTY en macOS)', () => {
    test('verificación por intervalo de 30 segundos vía process.stdout.writable', () => {
      // Pin: macOS revoca la TTY sin SIGHUP — se sondea en su lugar.
      expect(source).toMatch(/30_000/) // intervalo de 30 segundos
      // stdout.writable es la señal siempre confiable. stdin.readable solo
      // es confiable FUERA del modo de lector nativo: cuando el lector de
      // stdin en rust posee el fd0 (camino FleetView), App destruye
      // process.stdin así que readable===false aunque el proceso esté vivo
      // — activarse con eso ahí dispararía en falso y mataría a FleetView
      // a los 30s. Ver el gate CCB_FLEET_INPROCESS_REMOUNT.
      expect(source).toMatch(/!process\.stdout\.writable \|\| stdinDead/)
      expect(source).toMatch(/CCB_FLEET_INPROCESS_REMOUNT/)
    })

    test('la detección de huérfanos solo corre en stdin TTY (no redirigida)', () => {
      expect(source).toMatch(
        /if \(process\.stdin\.isTTY\) \{\s*\n?\s*orphanCheckInterval = setInterval/,
      )
    })

    test("la detección de huérfanos usa unref (no mantiene vivo el event loop)", () => {
      expect(source).toMatch(/orphanCheckInterval\.unref\(\)/)
    })

    test('la salida por huérfano usa el código 129 (equivalente a SIGHUP)', () => {
      // Pin: huérfano == terminal perdida == semántica de SIGHUP.
      expect(source).toMatch(
        /orphan_detected[\s\S]+?gracefulShutdown\(129\)/,
      )
    })
  })

  describe('Telemetría de pista de desalojo de caché', () => {
    test('emite tengu_cache_eviction_hint con el último request ID', () => {
      // Pin: señala la invalidación de la caché de inferencia. Una
      // regresión que quite el evento dejaría la caché envejecer.
      expect(source).toMatch(/'tengu_cache_eviction_hint'/)
      expect(source).toMatch(/last_request_id:/)
    })

    test('se salta cuando no hay lastRequestId (p. ej. un subagente que nunca hizo una petición)', () => {
      // Pin: compuerta con `if (lastRequestId)`.
      expect(source).toMatch(/if \(lastRequestId\) \{[\s\S]+?logEvent\('tengu_cache_eviction_hint'/)
    })
  })
})
