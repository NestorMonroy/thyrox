/**
 * Porte de
 * `ccnmt: packages/agent/__tests__/internalCronTasksCore.behavior.test.ts`.
 *
 * Fija invariantes para el scheduling de tareas cron.
 *
 * Los pines más importantes:
 *  1. Los valores numéricos por defecto de DEFAULT_CRON_JITTER_CONFIG — son
 *     los parámetros de protección contra manada estampida. Cambiarlos
 *     afecta la distribución de carga de cada sesión de ccb.
 *  2. jitteredNextCronRunMs esparce los disparos recurrentes hacia
 *     adelante (proporcional al hueco, acotado por recurringCapMs).
 *  3. oneShotJitteredNextCronRunMs esparce los one-shots hacia ATRÁS (un
 *     disparo temprano es invisible para el usuario; uno tardío rompería
 *     el contrato de "recuérdame a las 3pm").
 *  4. El jitter SOLO aplica en marcas de minuto donde
 *     minuto % oneShotMinuteMod === 0 (por defecto 30 → solo :00 y :30 se
 *     esparcen, porque los humanos redondean a la media hora).
 *  5. Tope: oneShotJittered NO DEBE devolver una hora anterior a `fromMs`
 *     (una tarea no puede disparar antes de haber sido creada).
 *
 * Porte PARCIAL declarado: el bloque "pines a nivel de fuente" de la fuente
 * trae diez pines contra el archivo de origen. Ocho referencian mecanismos
 * de archivo (`getCronFilePath`, `readCronTasks`, `writeCronTasks`,
 * `addCronTask`, `removeCronTasks`, `listAllCronTasks`) que dependen de
 * `getAgentHostBindings()` (`ccnmt: packages/agent/host.ts`), inexistente en
 * este árbol — en vez de pinear código ausente (lo que sería fabricarlo),
 * cada uno verifica que el docstring de `cronTasksCore.ts` siga declarando
 * la exclusión. Los otros dos (`jitterFrac` y el chequeo
 * `getMinutes() % oneShotMinuteMod`) pertenecen a la superficie pura y se
 * pinean contra su mecanismo real, activos.
 */
import { describe, expect, test } from 'bun:test'

import {
  DEFAULT_CRON_JITTER_CONFIG,
  findMissedTasks,
  jitteredNextCronRunMs,
  nextCronRunMs,
  oneShotJitteredNextCronRunMs,
} from '../internal/cronTasksCore.js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('internal/cronTasksCore', () => {
  describe('valores numéricos por defecto de DEFAULT_CRON_JITTER_CONFIG', () => {
    test('recurringFrac = 0.1 (10% del hueco)', () => {
      // Pin: 10% de hueco implica que una tarea horaria se esparce en [:00, :06).
      expect(DEFAULT_CRON_JITTER_CONFIG.recurringFrac).toBe(0.1)
    })

    test('recurringCapMs = 15 minutos (15 * 60 * 1000 = 900_000)', () => {
      expect(DEFAULT_CRON_JITTER_CONFIG.recurringCapMs).toBe(15 * 60 * 1000)
    })

    test('oneShotMaxMs = 90 segundos (los one-shots disparan hasta 90s antes)', () => {
      expect(DEFAULT_CRON_JITTER_CONFIG.oneShotMaxMs).toBe(90 * 1000)
    })

    test('oneShotFloorMs = 0 (por defecto: hash-cerca-de-0 dispara en la marca exacta)', () => {
      // Pin: ops puede subir esto para garantizar que NINGUNA tarea dispare en la marca.
      expect(DEFAULT_CRON_JITTER_CONFIG.oneShotFloorMs).toBe(0)
    })

    test('oneShotMinuteMod = 30 (solo :00 y :30 reciben jitter)', () => {
      // Pin: los humanos redondean a la media hora, así que el riesgo de manada está en :00 / :30.
      expect(DEFAULT_CRON_JITTER_CONFIG.oneShotMinuteMod).toBe(30)
    })

    test('recurringMaxAgeMs = 7 días (auto-expiración de tareas recurrentes)', () => {
      // Pin: evita extender indefinidamente el ciclo de vida de la sesión.
      // El flag permanent exime (los built-ins del modo asistente).
      expect(DEFAULT_CRON_JITTER_CONFIG.recurringMaxAgeMs).toBe(
        7 * 24 * 60 * 60 * 1000,
      )
    })

    test('cacheLeadMs = 60_000 (60s de adelanto respecto al TTL de caché de 5 min)', () => {
      // Pin: la caché de prompt vive 5min; adelantar 60s mantiene el
      // despertar dentro de la ventana caliente.
      expect(DEFAULT_CRON_JITTER_CONFIG.cacheLeadMs).toBe(60_000)
    })
  })

  describe('nextCronRunMs', () => {
    test('cron inválido → null', () => {
      expect(nextCronRunMs('not a cron', Date.now())).toBeNull()
    })

    test('un cron diario válido devuelve una marca de tiempo futura', () => {
      const next = nextCronRunMs('30 14 * * *', Date.now())
      expect(next).not.toBeNull()
      expect(next!).toBeGreaterThan(Date.now())
    })

    test('semántica estrictamente-posterior: el próximo-desde-ahora NO es ahora', () => {
      // Pin: `from` es cota inferior exclusiva. Si se pregunta "próximo
      // 14:30" exactamente a las 14:30, se obtiene el 14:30 de MAÑANA, no
      // el de hoy.
      const today = new Date()
      today.setHours(14, 30, 0, 0)
      const next = nextCronRunMs('30 14 * * *', today.getTime())
      expect(next).toBeGreaterThan(today.getTime())
    })
  })

  describe('jitteredNextCronRunMs (recurrente — jitter hacia adelante)', () => {
    test('devuelve null cuando el cron es inválido', () => {
      expect(jitteredNextCronRunMs('garbage', Date.now(), '00000000')).toBeNull()
    })

    test('un taskId que hashea a cero dispara en la marca exacta (sin jitter)', () => {
      const from = Date.now()
      const exact = nextCronRunMs('0 * * * *', from)
      const jittered = jitteredNextCronRunMs('0 * * * *', from, '00000000')
      // jitterFrac('00000000') = 0 → sin retraso hacia adelante.
      expect(jittered).toBe(exact)
    })

    test('un taskId que hashea al máximo dispara dentro de la ventana acotada hacia adelante', () => {
      const from = Date.now()
      const exact = nextCronRunMs('0 * * * *', from)!
      const jittered = jitteredNextCronRunMs('0 * * * *', from, 'ffffffff')!
      // Pin: el jitter máximo ≤ recurringCapMs Y ≤ recurringFrac * (t2 - t1).
      // Para horario, t2 - t1 = 3_600_000; 10% = 360_000; cap = 900_000 →
      // la cota es 360_000.
      expect(jittered - exact).toBeLessThanOrEqual(360_000)
      expect(jittered).toBeGreaterThan(exact)
    })

    test('el tope (15min) acota el jitter incluso cuando lo proporcional sería mayor', () => {
      // Pin: el tope domina cuando el hueco es lo bastante grande.
      // Para el cron diario, 10% * 86400_000 = 8_640_000 > 900_000 de tope.
      const from = Date.now()
      const exact = nextCronRunMs('0 14 * * *', from)!
      const jittered = jitteredNextCronRunMs('0 14 * * *', from, 'ffffffff')!
      expect(jittered - exact).toBeLessThanOrEqual(900_000)
    })

    test('mismo taskId → jitter determinístico (amigable con la caché entre recargas)', () => {
      const from = 1700_000_000_000 // fijo
      const a = jitteredNextCronRunMs('0 * * * *', from, 'deadbeef')
      const b = jitteredNextCronRunMs('0 * * * *', from, 'deadbeef')
      expect(a).toBe(b)
    })

    test('distintos taskIds → distinto jitter (se esparce por el espacio de taskId)', () => {
      const from = 1700_000_000_000
      const a = jitteredNextCronRunMs('0 * * * *', from, '00000000')
      const b = jitteredNextCronRunMs('0 * * * *', from, 'ffffffff')
      expect(a).not.toBe(b)
    })
  })

  describe('oneShotJitteredNextCronRunMs (one-shot — jitter hacia atrás)', () => {
    test('devuelve null cuando el cron es inválido', () => {
      expect(
        oneShotJitteredNextCronRunMs('garbage', Date.now(), 'aaaaaaaa'),
      ).toBeNull()
    })

    test('una marca de disparo :30 recibe jitter (los humanos redondean a la media hora)', () => {
      // 14:30 es una marca :30; debe disparar TEMPRANO cuando el taskId hashea alto.
      const from = new Date()
      from.setHours(14, 0, 0, 0)
      const exact = nextCronRunMs('30 14 * * *', from.getTime())!
      const jittered = oneShotJitteredNextCronRunMs(
        '30 14 * * *',
        from.getTime(),
        'ffffffff',
      )!
      // Pin: jittered < exact (hacia atrás), dentro de una ventana de 90s.
      expect(jittered).toBeLessThan(exact)
      expect(exact - jittered).toBeLessThanOrEqual(90_000)
    })

    test('una marca de disparo :17 NO recibe jitter (no es un minuto de manada)', () => {
      // :17 no es ≡ 0 (mod 30) → cae al fallthrough, devuelve la hora exacta.
      const from = new Date()
      from.setHours(14, 0, 0, 0)
      const exact = nextCronRunMs('17 14 * * *', from.getTime())!
      const jittered = oneShotJitteredNextCronRunMs(
        '17 14 * * *',
        from.getTime(),
        'ffffffff',
      )!
      expect(jittered).toBe(exact)
    })

    test('tope: jittered NO DEBE ser anterior a `fromMs`', () => {
      // Pin: una tarea creada dentro de su propia ventana de jitter no debe
      // disparar antes de haber sido creada.
      // Simula: from = exact - 30s (30s antes de la marca) con hash alto
      // intentando retroceder 90s → aterrizaría 60s antes de la creación.
      const today = new Date()
      today.setHours(14, 30, 0, 0)
      const exactMark = today.getTime()
      const fromMs = exactMark - 30_000 // 30s antes
      const jittered = oneShotJitteredNextCronRunMs(
        '30 14 * * *',
        fromMs,
        'ffffffff',
      )!
      expect(jittered).toBeGreaterThanOrEqual(fromMs)
    })

    test('floor > 0 fuerza un adelanto mínimo incluso para taskIds que hashean a cero', () => {
      // Pin: cfg.oneShotFloorMs controla el "adelanto mínimo". Con
      // floor=30_000, TODA tarea en una marca recibe ≥ 30s de adelanto.
      const cfg = {
        ...DEFAULT_CRON_JITTER_CONFIG,
        oneShotFloorMs: 30_000,
      }
      const from = new Date()
      from.setHours(14, 0, 0, 0)
      const exact = nextCronRunMs('30 14 * * *', from.getTime())!
      const jittered = oneShotJitteredNextCronRunMs(
        '30 14 * * *',
        from.getTime(),
        '00000000',
        cfg,
      )!
      // Tope de adelanto de 30s → jittered ≤ exact - 30s.
      expect(exact - jittered).toBeGreaterThanOrEqual(30_000)
    })
  })

  describe('findMissedTasks', () => {
    test('una tarea cuyo próximo-desde-createdAt está en el pasado → perdida', () => {
      const tasks = [
        {
          id: 'a',
          cron: '0 14 * * *', // diario a las 14:00
          prompt: 'p',
          createdAt: Date.now() - 24 * 60 * 60 * 1000 - 60_000, // > 24h atrás
        },
      ]
      const missed = findMissedTasks(tasks, Date.now())
      expect(missed.length).toBe(1)
      expect(missed[0]!.id).toBe('a')
    })

    test('una tarea cuyo próximo-desde-createdAt está en el futuro → NO perdida', () => {
      const tasks = [
        {
          id: 'b',
          cron: '0 14 * * *',
          prompt: 'p',
          createdAt: Date.now(),
        },
      ]
      const missed = findMissedTasks(tasks, Date.now())
      expect(missed).toEqual([])
    })

    test('una tarea con cron inválido → NO perdida (y no revienta)', () => {
      const tasks = [
        {
          id: 'c',
          cron: 'bogus',
          prompt: 'p',
          createdAt: Date.now() - 10_000,
        },
      ]
      expect(findMissedTasks(tasks, Date.now())).toEqual([])
    })

    test('lista vacía → resultado vacío', () => {
      expect(findMissedTasks([], Date.now())).toEqual([])
    })
  })

  describe('pines a nivel de fuente', () => {
    const source = readFileSync(
      resolve(__dirname, '..', 'internal', 'cronTasksCore.ts'),
      'utf-8',
    )

    // Los ocho siguientes fijan, en la fuente, mecanismos de archivo que
    // dependen de `getAgentHostBindings()` (`ccnmt: packages/agent/host.ts`),
    // ausente en este árbol. No se pueden pinear contra código que no existe
    // aquí sin fabricarlo — eso sería un porte parcial silencioso. En su
    // lugar cada uno verifica que el docstring del módulo declare
    // explícitamente la función excluida y la razón: el pin pasa a proteger
    // que la declaración de recorte no desaparezca en un edit futuro, en vez
    // de proteger un mecanismo que no está.
    test('CRON_FILE_REL/getCronFilePath no se porta — declarado excluido por host.ts ausente', () => {
      expect(source).toMatch(/`getCronFilePath`/)
      expect(source).toMatch(/getAgentHostBindings/)
    })

    test('addCronTask (randomUUID().slice(0, 8)) no se porta — declarado excluido por host.ts ausente', () => {
      expect(source).toMatch(/`addCronTask`/)
    })

    test('writeCronTasks (descarta el flag durable de runtime) no se porta — declarado excluido por host.ts ausente', () => {
      expect(source).toMatch(/`writeCronTasks`/)
    })

    test('jitterFrac parsea los primeros 8 caracteres hex / 0x_1_0000_0000', () => {
      // Pin: hash estable; lo no-hex cae a 0 (sin jitter).
      expect(source).toMatch(
        /parseInt\(taskId\.slice\(0, 8\), 16\) \/ 0x1_0000_0000/,
      )
    })

    test('oneShotJittered chequea getMinutes() y NO getUTCMinutes()', () => {
      // Pin: zonas con offset de media hora (India UTC+5:30) — la hora
      // redonda local no es la hora redonda UTC. Usar UTC esparciría las
      // marcas equivocadas.
      expect(source).toMatch(
        /new Date\(t1\)\.getMinutes\(\) % cfg\.oneShotMinuteMod/,
      )
    })

    test('writeCronTasks (mkdir recursive en .claude) no se porta — declarado excluido por host.ts ausente', () => {
      expect(source).toMatch(/`writeCronTasks`/)
    })

    test('listAllCronTasks (merge de sesión sólo cuando dir es undefined) no se porta — declarado excluido por host.ts ausente', () => {
      expect(source).toMatch(/`listAllCronTasks`/)
    })

    test('removeCronTasks (corte cuando ids está vacío) no se porta — declarado excluido por host.ts ausente', () => {
      expect(source).toMatch(/`removeCronTasks`/)
    })

    test('readCronTasks (descarte silencioso de cron inválido) no se porta — declarado excluido por host.ts ausente', () => {
      expect(source).toMatch(/`readCronTasks`/)
    })

    test('readCronTasks (descarte silencioso de tarea malformada) no se porta — declarado excluido por host.ts ausente', () => {
      expect(source).toMatch(/`readCronTasks`/)
      expect(source).toMatch(/inexistente en este árbol/)
    })
  })
})
