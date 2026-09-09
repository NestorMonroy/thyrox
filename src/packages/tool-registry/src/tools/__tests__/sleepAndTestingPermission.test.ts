/**
 * La mitad ROJA de las DOS últimas unidades libres de tool-registry.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/tools/{SleepTool/prompt.ts,
 * testing/TestingPermissionTool.tsx}`. Ese árbol no declara licencia; el
 * cuerpo se reimplementa, salvo el texto del prompt de Sleep, que ES la
 * instrucción que el útil emite y por tanto se conserva verbatim.
 *
 * POR QUÉ SÓLO DOS, Y POR QUÉ ESTO CIERRA LA FRONTERA. El instrumento de
 * frontera midió 12 útiles libres a nivel de símbolo. Medido después contra
 * el CONTENIDO de la fuente, **9 de esos 12 son stubs de la propia `ccnmt`**
 * —llevan `// Auto-generated stub — replace with real implementation` y un
 * cuerpo vacío— y un décimo (`SuggestBackgroundPRTool`) no tiene ni un `.ts`.
 * Un stub resuelve todos sus imports porque no importa nada: para el
 * instrumento era libre, y no había nada que portar. Es el sub-patrón C otra
 * vez, ahora sobre el propio medidor: se midió la resolución de importaciones
 * y se concluyó sobre la existencia de código.
 *
 * `TestingPermissionTool` es `.tsx` y NO usa react (medido: 0 hits). La
 * extensión es costumbre de la fuente, no una dependencia — así que el
 * bloqueo transversal de react no le aplica.
 *
 * Métrica: qué texto emite el prompt de Sleep, y qué decide el útil de
 * permiso en cada uno de sus siete puntos de conducta.
 * Ciega a: si el bucle los despacha, y a la espera real de Sleep — la fuente
 * sólo tiene su prompt, no el útil que duerme.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { TICK_TAG } from '@thyrox/command-runtime/xml.js'
import {
  DESCRIPTION,
  SLEEP_TOOL_NAME,
  SLEEP_TOOL_PROMPT,
} from '../SleepTool/prompt.ts'
import { TestingPermissionTool } from '../testing/TestingPermissionTool.tsx'

let entornoPrevio: string | undefined

beforeEach(() => {
  entornoPrevio = process.env.NODE_ENV
})

afterEach(() => {
  if (entornoPrevio === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = entornoPrevio
})

/** El contexto que `call` recibe; el útil no lo mira. */
const CTX = {} as never

describe('SleepTool/prompt — 5 casos', () => {
  test('1. se nombra Sleep y describe su acto en una línea', () => {
    expect(SLEEP_TOOL_NAME).toBe('Sleep')
    expect(DESCRIPTION).toBe('Wait for a specified duration')
  })

  test('2. la etiqueta del aviso periódico NO se escribe a mano', () => {
    // Es la decisión del archivo: interpola `TICK_TAG` en vez de teclear
    // «tick». Si el runtime renombra la etiqueta, el prompt sigue nombrando
    // la real; con el literal quedaría instruyendo sobre una que no llega.
    expect(SLEEP_TOOL_PROMPT).toContain(`<${TICK_TAG}>`)
    expect(TICK_TAG).toBe('tick')
  })

  test('3. dice que se puede llamar a la vez que otros útiles', () => {
    expect(SLEEP_TOOL_PROMPT).toContain('concurrently')
  })

  test('4. lo prefiere sobre el sleep de shell, y dice por qué', () => {
    // La razón es la que importa: `Bash(sleep …)` retiene un proceso de
    // shell durante toda la espera; éste no.
    expect(SLEEP_TOOL_PROMPT).toContain('Bash(sleep ...)')
    expect(SLEEP_TOOL_PROMPT).toContain("doesn't hold a shell process")
  })

  test('5. advierte del costo de despertar, con su plazo', () => {
    // Cada despertar es una llamada al proveedor, y la caché de prompt
    // caduca a los 5 minutos de inactividad: dormir de más no es gratis.
    expect(SLEEP_TOOL_PROMPT).toContain('API call')
    expect(SLEEP_TOOL_PROMPT).toContain('5 minutes')
  })
})

describe('TestingPermissionTool — 7 casos', () => {
  test('6. se nombra igual en el protocolo y ante la persona', () => {
    expect(TestingPermissionTool.name).toBe('TestingPermission')
    expect(TestingPermissionTool.userFacingName()).toBe('TestingPermission')
  })

  test('7. SÓLO se habilita bajo NODE_ENV=test', () => {
    // Es la guarda que impide que un útil cuyo único acto es abrir un
    // diálogo de permiso aparezca en una sesión real.
    process.env.NODE_ENV = 'test'
    expect(TestingPermissionTool.isEnabled()).toBe(true)
    process.env.NODE_ENV = 'production'
    expect(TestingPermissionTool.isEnabled()).toBe(false)
    delete process.env.NODE_ENV
    expect(TestingPermissionTool.isEnabled()).toBe(false)
  })

  test('8. es de sólo lectura y seguro ante concurrencia', () => {
    expect(TestingPermissionTool.isReadOnly()).toBe(true)
    expect(TestingPermissionTool.isConcurrencySafe()).toBe(true)
  })

  test('9. SIEMPRE pide permiso — es su razón de existir', () => {
    // No hay rama de `allow`: el útil existe para que la suite de extremo a
    // extremo tenga un diálogo de permiso que ejercitar.
    expect(TestingPermissionTool.checkPermissions({} as never, CTX)).resolves.toEqual({
      behavior: 'ask',
      message: 'Run test?',
    })
  })

  test('10. su esquema de entrada es estricto y vacío', () => {
    const r = TestingPermissionTool.inputSchema.safeParse({})
    expect(r.success).toBe(true)
    // Estricto: una clave de más se rechaza, no se ignora.
    expect(TestingPermissionTool.inputSchema.safeParse({ x: 1 }).success).toBe(false)
  })

  test('11. no dibuja nada en ninguna de sus seis superficies', async () => {
    // Las seis devuelven `null` a propósito: el útil no tiene nada que
    // mostrar, y un render vacío ensuciaría el transcript de la suite.
    for (const render of [
      TestingPermissionTool.renderToolUseMessage,
      TestingPermissionTool.renderToolUseProgressMessage,
      TestingPermissionTool.renderToolUseQueuedMessage,
      TestingPermissionTool.renderToolUseRejectedMessage,
      TestingPermissionTool.renderToolResultMessage,
      TestingPermissionTool.renderToolUseErrorMessage,
    ]) {
      expect(render({} as never, {} as never)).toBeNull()
    }
  })

  test('12. al ejecutarse dice que se ejecutó, y el bloque lo repite', async () => {
    const { data } = await TestingPermissionTool.call({} as never, CTX)
    expect(data).toBe('TestingPermission executed successfully')
    const bloque = TestingPermissionTool.mapToolResultToToolResultBlockParam(
      data,
      'uso-1',
    )
    expect(bloque).toEqual({
      type: 'tool_result',
      content: 'TestingPermission executed successfully',
      tool_use_id: 'uso-1',
    })
  })
})
