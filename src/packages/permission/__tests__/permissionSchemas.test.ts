/**
 * La mitad ROJA de la capa de esquemas de `permission`.
 *
 * Procedencia: `ccnmt: packages/permission/{internal/lazySchema.ts,
 * src/PermissionRule.ts, src/PermissionMode.ts, src/PermissionUpdateSchema.ts}`.
 * Ese árbol declara `"license": "UNLICENSED"`, así que los cuerpos se
 * reimplementan y no se copian.
 *
 * POR QUÉ ESTE TRAMO. Tres portes del paquete son PARCIALES DE TIPOS: el
 * archivo existe, así que `test -e` lo da por presente, pero los esquemas zod
 * que la fuente exporta no llegaron. Nada lo delataba — es la ceguera que la
 * tarea #272 declara, aquí realizada. Y el bloqueo que el porte parcial
 * declaraba —«zod no está linkeado; otros dos agentes tienen el lockfile en
 * vuelo»— nombra su propia caducidad y hoy no se sostiene: medido,
 * `import {z} from 'zod/v4'` resuelve desde este paquete.
 *
 * Métrica: los esquemas construidos y ejercitados contra entradas válidas e
 * inválidas, y la memoización de la fábrica perezosa.
 * Ciega a: si el esquema describe lo que el host realmente envía — eso es
 * contrato con terceros, no del módulo.
 */
import { describe, expect, test } from 'bun:test'

describe('lazySchema — construir tarde, y una sola vez', () => {
  test('1. no construye hasta la primera llamada', async () => {
    const { lazySchema } = await import('../internal/lazySchema.ts')
    let veces = 0
    const perezoso = lazySchema(() => {
      veces++
      return { marca: veces }
    })
    // Construir al importar el módulo movería el coste de todos los esquemas
    // al arranque, se usen o no.
    expect(veces).toBe(0)
    perezoso()
    expect(veces).toBe(1)
  })

  test('2. memoiza: la segunda llamada NO reconstruye', async () => {
    const { lazySchema } = await import('../internal/lazySchema.ts')
    let veces = 0
    const perezoso = lazySchema(() => ({ marca: ++veces }))
    const uno = perezoso()
    const dos = perezoso()
    expect(dos).toBe(uno)
    expect(veces).toBe(1)
  })

  test('3. un valor FALSY se memoiza igual, no se reconstruye', async () => {
    const { lazySchema } = await import('../internal/lazySchema.ts')
    let veces = 0
    const perezoso = lazySchema(() => {
      veces++
      return 0
    })
    perezoso()
    perezoso()
    // Con `cached ||= ...` un 0 se reconstruiría en cada llamada. El
    // operador tiene que ser el que sólo mira `undefined`.
    expect(veces).toBe(1)
  })
})

describe('permissionBehaviorSchema — la lista es cerrada', () => {
  test('4. acepta los tres comportamientos declarados', async () => {
    const { permissionBehaviorSchema } = await import('../src/PermissionRule.ts')
    for (const valor of ['allow', 'deny', 'ask']) {
      expect(permissionBehaviorSchema().safeParse(valor).success).toBe(true)
    }
  })

  test('5. RECHAZA cualquier otro', async () => {
    const { permissionBehaviorSchema } = await import('../src/PermissionRule.ts')
    // Un comportamiento desconocido que pasara se leería como «no denegar»
    // aguas abajo: la lista cerrada es lo que lo impide.
    for (const malo of ['permitir', 'ALLOW', '', 'bypass', null, 1]) {
      expect(permissionBehaviorSchema().safeParse(malo).success).toBe(false)
    }
  })
})

describe('permissionRuleValueSchema — el nombre obliga, el contenido no', () => {
  test('6. sólo con nombre de herramienta ya es válida', async () => {
    const { permissionRuleValueSchema } = await import(
      '../src/PermissionRule.ts'
    )
    const r = permissionRuleValueSchema().safeParse({ toolName: 'Bash' })
    expect(r.success).toBe(true)
  })

  test('7. con contenido también, y lo conserva', async () => {
    const { permissionRuleValueSchema } = await import(
      '../src/PermissionRule.ts'
    )
    const r = permissionRuleValueSchema().safeParse({
      toolName: 'Bash',
      ruleContent: 'git status:*',
    })
    expect(r.success && r.data.ruleContent).toBe('git status:*')
  })

  test('8. SIN nombre de herramienta se rechaza', async () => {
    const { permissionRuleValueSchema } = await import(
      '../src/PermissionRule.ts'
    )
    // Una regla sin sujeto no acota nada: aceptarla sería una regla que
    // aplica a todo.
    expect(
      permissionRuleValueSchema().safeParse({ ruleContent: 'x' }).success,
    ).toBe(false)
  })
})

describe('externalPermissionModeSchema — sólo los modos EXTERNOS', () => {
  test('9. acepta los modos que la lista externa declara', async () => {
    const { externalPermissionModeSchema } = await import(
      '../src/PermissionMode.ts'
    )
    const { EXTERNAL_PERMISSION_MODES } = await import(
      '../src/PermissionMode.ts'
    )
    for (const modo of EXTERNAL_PERMISSION_MODES) {
      expect(externalPermissionModeSchema().safeParse(modo).success).toBe(true)
    }
  })

  test('10. rechaza un modo interno o inventado', async () => {
    const { externalPermissionModeSchema, PERMISSION_MODES } = await import(
      '../src/PermissionMode.ts'
    )
    const { EXTERNAL_PERMISSION_MODES } = await import(
      '../src/PermissionMode.ts'
    )
    // El esquema es de la superficie EXTERNA: un modo que sólo existe puertas
    // adentro no debe poder declararse desde fuera.
    const soloInternos = PERMISSION_MODES.filter(
      m => !(EXTERNAL_PERMISSION_MODES as readonly string[]).includes(m),
    )
    for (const modo of soloInternos) {
      expect(externalPermissionModeSchema().safeParse(modo).success).toBe(false)
    }
    expect(externalPermissionModeSchema().safeParse('inventado').success).toBe(
      false,
    )
  })
})

describe('permissionUpdateSchema — las seis formas de actualizar', () => {
  test('11. las tres de reglas exigen reglas, comportamiento y destino', async () => {
    const { permissionUpdateSchema } = await import(
      '../src/PermissionUpdateSchema.ts'
    )
    for (const type of ['addRules', 'replaceRules', 'removeRules']) {
      const r = permissionUpdateSchema().safeParse({
        type,
        rules: [{ toolName: 'Bash' }],
        behavior: 'allow',
        destination: 'session',
      })
      expect(r.success).toBe(true)
    }
  })

  test('12. `setMode` lleva modo, no reglas', async () => {
    const { permissionUpdateSchema } = await import(
      '../src/PermissionUpdateSchema.ts'
    )
    expect(
      permissionUpdateSchema().safeParse({
        type: 'setMode',
        mode: 'default',
        destination: 'session',
      }).success,
    ).toBe(true)
  })

  test('13. las dos de directorios llevan una lista de cadenas', async () => {
    const { permissionUpdateSchema } = await import(
      '../src/PermissionUpdateSchema.ts'
    )
    for (const type of ['addDirectories', 'removeDirectories']) {
      expect(
        permissionUpdateSchema().safeParse({
          type,
          directories: ['/a', '/b'],
          destination: 'localSettings',
        }).success,
      ).toBe(true)
    }
  })

  test('14. un `type` desconocido se rechaza, no cae a una rama', async () => {
    const { permissionUpdateSchema } = await import(
      '../src/PermissionUpdateSchema.ts'
    )
    // Es una unión DISCRIMINADA: sin el discriminador, una carga con campos
    // de varias formas podría colarse por la primera que encaje.
    expect(
      permissionUpdateSchema().safeParse({
        type: 'inventado',
        destination: 'session',
      }).success,
    ).toBe(false)
  })

  test('15. un destino fuera de los cinco se rechaza', async () => {
    const { permissionUpdateSchema, permissionUpdateDestinationSchema } =
      await import('../src/PermissionUpdateSchema.ts')
    for (const d of [
      'userSettings',
      'projectSettings',
      'localSettings',
      'session',
      'cliArg',
    ]) {
      expect(permissionUpdateDestinationSchema().safeParse(d).success).toBe(true)
    }
    expect(
      permissionUpdateSchema().safeParse({
        type: 'setMode',
        mode: 'default',
        destination: 'inventado',
      }).success,
    ).toBe(false)
  })

  test('16. una regla MAL FORMADA dentro de la lista invalida la carga', async () => {
    const { permissionUpdateSchema } = await import(
      '../src/PermissionUpdateSchema.ts'
    )
    expect(
      permissionUpdateSchema().safeParse({
        type: 'addRules',
        rules: [{ ruleContent: 'sin nombre' }],
        behavior: 'allow',
        destination: 'session',
      }).success,
    ).toBe(false)
  })
})
