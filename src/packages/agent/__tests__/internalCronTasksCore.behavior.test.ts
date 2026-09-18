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
 * PORTE COMPLETO desde que `internal/cronTasksCore.ts` cerró sus ocho
 * funciones de E/S. El bloque "pines a nivel de fuente" trae los diez pines
 * de la fuente, todos contra su mecanismo real.
 *
 * Mientras el porte fue parcial, ocho de esos diez estaban INVERTIDOS:
 * afirmaban que el docstring del módulo siguiera declarando la exclusión,
 * porque su premisa era que `getAgentHostBindings()` no existía aquí. Medido,
 * es falsa —`host.ts:266` lo exporta— y los cuatro miembros de cron que esas
 * funciones consultan los declara `contracts.ts:56,68,69,70`, no `host.ts`.
 * Un pin sobre prosa no separa «el mecanismo funciona» de «el mecanismo no
 * existe»; los diez vuelven a medir conducta del archivo.
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

    // Los diez fijan invariantes REALES del módulo, que es lo que la fuente
    // pinea. Mientras el porte fue parcial estaban invertidos —afirmaban que
    // el docstring declarara la exclusión— y eso es un verde que no separa
    // «el mecanismo funciona» de «el mecanismo no existe». Con las ocho
    // funciones de E/S portadas vuelven a su forma.
    test('CRON_FILE_REL fijo a .claude/scheduled_tasks.json', () => {
      // Pin: la ruta de disco crítica. Si derivara, cada sesión en curso
      // perdería sus tareas en la siguiente lectura.
      expect(source).toMatch(
        /CRON_FILE_REL = join\('\.claude', 'scheduled_tasks\.json'\)/,
      )
    })

    test('addCronTask usa randomUUID().slice(0, 8) — id corto de 8 caracteres', () => {
      // Pin: el id corto es compartido entre la interfaz y el disco. La capa
      // de herramienta se lo muestra al usuario; una forma más larga no cabe.
      expect(source).toMatch(/randomUUID\(\)\.slice\(0, 8\)/)
    })

    test('writeCronTasks retira el flag `durable`, que sólo vive en runtime', () => {
      // Pin: el formato en disco es { id, cron, prompt, createdAt, … }.
      // `durable: false` significa sólo-sesión y NUNCA debe llegar al disco.
      expect(source).toMatch(/\{ durable: _durable, \.\.\.rest \}/)
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

    test('writeCronTasks crea .claude con recursive: true', () => {
      // Pin: creación idempotente del directorio; no revienta en la segunda
      // llamada.
      expect(source).toMatch(
        /mkdir\(join\(root, '\.claude'\), \{ recursive: true \}\)/,
      )
    })

    test('listAllCronTasks SÓLO mezcla las de sesión cuando dir es undefined', () => {
      // Pin: quien llama desde el daemon pasa `dir` explícito y no tiene
      // almacén de sesión. La guarda impide que el estado de bootstrap se
      // filtre por ese camino.
      expect(source).toMatch(/if \(dir !== undefined\) return fileTasks/)
    })

    test('removeCronTasks corta cuando ids está vacío', () => {
      expect(source).toMatch(
        /removeCronTasks[\s\S]+?if \(ids\.length === 0\) return/,
      )
    })

    test('readCronTasks descarta en silencio las cadenas cron inválidas', () => {
      // Pin: una sola tarea mala no puede bloquear el archivo entero.
      expect(source).toMatch(
        /\[ScheduledTasks\] skipping task \$\{t\.id\} with invalid cron/,
      )
    })

    test('readCronTasks registra a nivel debug las entradas malformadas', () => {
      expect(source).toMatch(/\[ScheduledTasks\] skipping malformed task/)
    })
  })
})
