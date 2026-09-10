/**
 * Porte de `ccnmt: packages/agent/__tests__/messagesPureHelpers.test.ts`.
 *
 * Fija el contrato de un grupo grande de ayudantes puros de `messages.ts`:
 * derivadores deterministas de identificador (`deriveShortMessageId`,
 * `deriveUUID`), el formateador de la miga de comando, los mensajes de
 * denegacion del clasificador de auto-modo (con su round-trip
 * `isClassifierDenial(buildYoloRejectionMessage(...))`), los guardas de tipo
 * `isToolUseRequestMessage`/`isToolUseResultMessage`, `extractTag` —incluidas
 * sus LIMITACIONES documentadas, no arregladas— e `isNotEmptyMessage`, cuya
 * deriva (2026-04-29 en la fuente) trato como si el centinela `NO_CONTENT_MESSAGE`
 * cambiara de redaccion y dejara de coincidir con la comparacion.
 */
import { beforeAll, describe, expect, test } from 'bun:test'
import type { UUID } from 'crypto'
import {
  deriveShortMessageId,
  deriveUUID,
  extractTag,
} from '../messages.ts'

describe('deriveShortMessageId — de UUID a ID corto', () => {
  test('produce una cadena de hasta 6 caracteres', () => {
    const id = deriveShortMessageId('550e8400-e29b-41d4-a716-446655440000')
    expect(id.length).toBeGreaterThan(0)
    expect(id.length).toBeLessThanOrEqual(6)
  })

  test('determinista — el mismo UUID siempre produce el mismo ID', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(deriveShortMessageId(uuid)).toBe(deriveShortMessageId(uuid))
  })

  test('UUIDs distintos tipicamente producen IDs distintos', () => {
    const a = deriveShortMessageId('550e8400-e29b-41d4-a716-446655440000')
    const b = deriveShortMessageId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
    // No es una garantia (base36 recortado a 6 caracteres tiene ~2.18 mil
    // millones de variantes), pero para estos dos UUIDs concretos los
    // prefijos difieren lo suficiente para que la colision sea
    // astronomicamente improbable.
    expect(a).not.toBe(b)
  })

  test('un UUID sin guiones tambien se maneja (el reemplazo no encuentra nada que quitar)', () => {
    // El replace(/-/g, '') es un no-op si no hay guiones. La funcion toma
    // los primeros 10 hex sin importar donde caigan los guiones.
    const id = deriveShortMessageId('550e8400e29b41d4a716446655440000')
    expect(id.length).toBeGreaterThan(0)
  })

  test('primeros-10-hex distintos con el mismo sufijo → IDs distintos', () => {
    // Ancla que la funcion usa SOLO los primeros 10 caracteres hex.
    const a = deriveShortMessageId('00000000-0000-0000-0000-000000000000')
    const b = deriveShortMessageId('11111111-0000-0000-0000-000000000000')
    expect(a).not.toBe(b)
  })

  test('mismos primeros-10-hex, distinto sufijo → el MISMO ID (solo importa el prefijo)', () => {
    // Documenta el contrato de recorte: todo lo posterior al hex 10 se
    // ignora. Dos UUIDs que comparten los primeros 10 hex colisionan.
    const a = deriveShortMessageId('00000000-0000-1111-1111-111111111111')
    const b = deriveShortMessageId('00000000-0000-2222-2222-222222222222')
    expect(a).toBe(b)
  })

  test('el ID usa base36 (minusculas a-z + 0-9)', () => {
    const id = deriveShortMessageId('ffffffff-ffff-ffff-ffff-ffffffffffff')
    expect(id).toMatch(/^[0-9a-z]+$/)
  })

  test('UUID cero → "0" en base36', () => {
    expect(deriveShortMessageId('00000000-0000-0000-0000-000000000000')).toBe(
      '0',
    )
  })
})

describe('deriveUUID — derivacion determinista de clave', () => {
  test('produce una cadena con forma de UUID que preserva el prefijo del padre', () => {
    const parent = '550e8400-e29b-41d4-a716-446655440000' as UUID
    const r = deriveUUID(parent, 0)
    expect(r.startsWith('550e8400-e29b-41d4-a716')).toBe(true)
  })

  test('determinista — el mismo padre + indice produce el mismo UUID', () => {
    const parent = '550e8400-e29b-41d4-a716-446655440000' as UUID
    expect(deriveUUID(parent, 0)).toBe(deriveUUID(parent, 0))
    expect(deriveUUID(parent, 5)).toBe(deriveUUID(parent, 5))
  })

  test('indices distintos → UUIDs distintos (el sufijo se deriva del indice)', () => {
    const parent = '550e8400-e29b-41d4-a716-446655440000' as UUID
    expect(deriveUUID(parent, 0)).not.toBe(deriveUUID(parent, 1))
    expect(deriveUUID(parent, 1)).not.toBe(deriveUUID(parent, 2))
  })

  test('el indice 0 produce un sufijo relleno de ceros', () => {
    const parent = '00000000-0000-0000-0000-000000000000' as UUID
    expect(deriveUUID(parent, 0)).toBe(
      '00000000-0000-0000-0000-000000000000' as UUID,
    )
  })

  test('el indice 1 produce el sufijo "...000000000001"', () => {
    const parent = '00000000-0000-0000-0000-000000000000' as UUID
    expect(deriveUUID(parent, 1)).toBe(
      '00000000-0000-0000-0000-000000000001' as UUID,
    )
  })

  test('el indice 255 produce el sufijo "...0000000000ff" (relleno hexadecimal)', () => {
    const parent = '00000000-0000-0000-0000-000000000000' as UUID
    expect(deriveUUID(parent, 255)).toBe(
      '00000000-0000-0000-0000-0000000000ff' as UUID,
    )
  })

  test('un indice grande hasta el limite de 12 caracteres hex', () => {
    const parent = '00000000-0000-0000-0000-000000000000' as UUID
    const max = 0xffffffffffff // 2^48 - 1
    expect(deriveUUID(parent, max)).toBe(
      '00000000-0000-0000-0000-ffffffffffff' as UUID,
    )
  })

  test('padres distintos producen UUIDs distintos', () => {
    const p1 = '550e8400-e29b-41d4-a716-446655440000' as UUID
    const p2 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as UUID
    expect(deriveUUID(p1, 0)).not.toBe(deriveUUID(p2, 0))
  })
})

describe('formatCommandInputTags — miga del comando slash', () => {
  let formatCommandInputTags: typeof import('../messages.ts').formatCommandInputTags
  beforeAll(async () => {
    ;({ formatCommandInputTags } = await import('../messages.ts'))
  })

  test('la salida contiene las tres etiquetas', () => {
    const result = formatCommandInputTags('review', 'fix tests')
    expect(result).toContain('<command-name>')
    expect(result).toContain('</command-name>')
    expect(result).toContain('<command-message>')
    expect(result).toContain('<command-args>')
  })

  test('el nombre del comando lleva la barra inicial en la etiqueta command-name', () => {
    // Formato documentado: command-name lleva la barra, command-message
    // no. La barra distingue comandos escritos por el usuario de texto
    // no relacionado.
    const result = formatCommandInputTags('review', 'x')
    expect(result).toContain('<command-name>/review</command-name>')
  })

  test('command-message lleva el nombre desnudo (sin barra)', () => {
    const result = formatCommandInputTags('review', 'x')
    expect(result).toContain('<command-message>review</command-message>')
  })

  test('los argumentos aparecen dentro de la etiqueta command-args', () => {
    const result = formatCommandInputTags('greet', 'hello world')
    expect(result).toContain('<command-args>hello world</command-args>')
  })

  test('argumentos vacios producen contenido vacio en command-args', () => {
    const result = formatCommandInputTags('clear', '')
    expect(result).toContain('<command-args></command-args>')
  })

  test('los caracteres especiales en los argumentos NO se escapan (documentado)', () => {
    // La funcion NO escapa HTML — los argumentos fluyen verbatim. Fija el
    // comportamiento para que un futuro parche "deberiamos escapar" sea
    // intencional (consumidores rio abajo pueden depender del passthrough).
    const result = formatCommandInputTags('cmd', 'a<b>c & d')
    expect(result).toContain('a<b>c & d')
  })
})

describe('AUTO_REJECT_MESSAGE / DONT_ASK_REJECT_MESSAGE — formateadores', () => {
  let AUTO_REJECT_MESSAGE: typeof import('../messages.ts').AUTO_REJECT_MESSAGE
  let DONT_ASK_REJECT_MESSAGE: typeof import('../messages.ts').DONT_ASK_REJECT_MESSAGE
  beforeAll(async () => {
    ;({ AUTO_REJECT_MESSAGE, DONT_ASK_REJECT_MESSAGE } = await import(
      '../messages.ts'
    ))
  })

  test('AUTO_REJECT_MESSAGE incluye el nombre de la herramienta', () => {
    expect(AUTO_REJECT_MESSAGE('Bash')).toContain('Bash')
    expect(AUTO_REJECT_MESSAGE('Bash')).toContain('denied')
  })

  test('AUTO_REJECT_MESSAGE incluye la guia de rodeo ante la denegacion', () => {
    // Se apenda la DENIAL_WORKAROUND_GUIDANCE compartida.
    const msg = AUTO_REJECT_MESSAGE('FileEdit')
    expect(msg.length).toBeGreaterThan(50)
  })

  test('DONT_ASK_REJECT_MESSAGE tiene un texto distinto de AUTO_REJECT_MESSAGE', () => {
    // Mensajes distintos — el modelo recibe contexto distinto por cada via.
    const a = AUTO_REJECT_MESSAGE('X')
    const b = DONT_ASK_REJECT_MESSAGE('X')
    expect(a).not.toBe(b)
  })

  test('DONT_ASK_REJECT_MESSAGE menciona "don\'t ask mode"', () => {
    expect(DONT_ASK_REJECT_MESSAGE('Edit')).toContain("don't ask mode")
  })

  test('ambos mensajes incluyen el nombre de la herramienta verbatim', () => {
    const tool = 'CustomTool'
    expect(AUTO_REJECT_MESSAGE(tool)).toContain(tool)
    expect(DONT_ASK_REJECT_MESSAGE(tool)).toContain(tool)
  })
})

describe('isClassifierDenial — deteccion para el resumen de interfaz', () => {
  let isClassifierDenial: typeof import('../messages.ts').isClassifierDenial
  beforeAll(async () => {
    ;({ isClassifierDenial } = await import('../messages.ts'))
  })

  test('contenido que empieza con el prefijo de rechazo de auto-modo → true', () => {
    expect(
      isClassifierDenial(
        'Permission for this action has been denied. Reason: not safe',
      ),
    ).toBe(true)
  })

  test('texto de rechazo llano → false', () => {
    expect(
      isClassifierDenial('Permission to use Bash has been denied.'),
    ).toBe(false)
  })

  test('cadena vacia → false', () => {
    expect(isClassifierDenial('')).toBe(false)
  })

  test('espacio antes del prefijo → false (startsWith estricto)', () => {
    expect(
      isClassifierDenial(
        ' Permission for this action has been denied. Reason: x',
      ),
    ).toBe(false)
  })

  test('discrepancia de caja → false', () => {
    expect(
      isClassifierDenial('PERMISSION FOR THIS ACTION HAS BEEN DENIED.'),
    ).toBe(false)
  })
})

describe('buildYoloRejectionMessage — formato', () => {
  let buildYoloRejectionMessage: typeof import('../messages.ts').buildYoloRejectionMessage
  let isClassifierDenial: typeof import('../messages.ts').isClassifierDenial
  beforeAll(async () => {
    ;({ buildYoloRejectionMessage, isClassifierDenial } = await import(
      '../messages.ts'
    ))
  })

  test('la salida empieza con el prefijo de rechazo de auto-modo', () => {
    const msg = buildYoloRejectionMessage('command modifies system')
    // CRITICO: isClassifierDenial(buildYoloRejectionMessage(...)) tiene
    // que dar la vuelta completa a true.
    expect(isClassifierDenial(msg)).toBe(true)
  })

  test('la razon se incluye verbatim', () => {
    const msg = buildYoloRejectionMessage('writes outside workspace')
    expect(msg).toContain('writes outside workspace')
  })

  test('menciona la guia de reglas de permiso', () => {
    const msg = buildYoloRejectionMessage('test')
    expect(msg.toLowerCase()).toMatch(/permission rule|bash/i)
  })
})

describe('buildClassifierUnavailableMessage', () => {
  let buildClassifierUnavailableMessage: typeof import('../messages.ts').buildClassifierUnavailableMessage
  beforeAll(async () => {
    ;({ buildClassifierUnavailableMessage } = await import('../messages.ts'))
  })

  test('menciona el nombre de la herramienta y el modelo del clasificador', () => {
    const msg = buildClassifierUnavailableMessage('Bash', 'haiku-4-5')
    expect(msg).toContain('Bash')
    expect(msg).toContain('haiku-4-5')
  })

  test('menciona que las operaciones de solo lectura siguen disponibles', () => {
    const msg = buildClassifierUnavailableMessage('Bash', 'haiku-4-5')
    expect(msg).toMatch(/read-only|reading files|search/i)
  })
})

describe('isToolUseRequestMessage / isToolUseResultMessage — guardas de tipo', () => {
  let isToolUseRequestMessage: typeof import('../messages.ts').isToolUseRequestMessage
  let isToolUseResultMessage: typeof import('../messages.ts').isToolUseResultMessage
  beforeAll(async () => {
    ;({ isToolUseRequestMessage, isToolUseResultMessage } = await import(
      '../messages.ts'
    ))
  })

  test('asistente con bloque tool_use → peticion', () => {
    expect(
      isToolUseRequestMessage({
        type: 'assistant',
        uuid: 'u1' as never,
        message: {
          content: [{ type: 'tool_use', id: 't1', name: 'X', input: {} }],
        },
      } as never),
    ).toBe(true)
  })

  test('asistente solo con texto → NO es peticion', () => {
    expect(
      isToolUseRequestMessage({
        type: 'assistant',
        uuid: 'u1' as never,
        message: { content: [{ type: 'text', text: 'hi' }] },
      } as never),
    ).toBe(false)
  })

  test('asistente con contenido no-arreglo → NO es peticion', () => {
    expect(
      isToolUseRequestMessage({
        type: 'assistant',
        uuid: 'u1' as never,
        message: { content: 'plain' },
      } as never),
    ).toBe(false)
  })

  test('usuario con tool_use → NO es peticion (solo asistentes)', () => {
    expect(
      isToolUseRequestMessage({
        type: 'user',
        uuid: 'u1' as never,
        message: {
          content: [{ type: 'tool_use', id: 't1', name: 'X', input: {} }],
        },
      } as never),
    ).toBe(false)
  })

  test('usuario con bloque tool_result (primero) → resultado', () => {
    expect(
      isToolUseResultMessage({
        type: 'user',
        uuid: 'u1' as never,
        message: {
          content: [
            { type: 'tool_result', tool_use_id: 'tu', content: 'ok' },
          ],
        },
      } as never),
    ).toBe(true)
  })

  test('usuario con campo toolUseResult → resultado (forma alterna)', () => {
    // La funcion acepta CUALQUIERA de las dos vias: content[0]=tool_result
    // o .toolUseResult siendo verdadero. Fija ambas.
    expect(
      isToolUseResultMessage({
        type: 'user',
        uuid: 'u1' as never,
        message: { content: 'plain' },
        toolUseResult: { stdout: 'output' },
      } as never),
    ).toBe(true)
  })

  test('usuario solo con texto y sin toolUseResult → NO es resultado', () => {
    expect(
      isToolUseResultMessage({
        type: 'user',
        uuid: 'u1' as never,
        message: { content: [{ type: 'text', text: 'hi' }] },
      } as never),
    ).toBe(false)
  })

  test('mensaje de asistente → NO es resultado', () => {
    expect(
      isToolUseResultMessage({
        type: 'assistant',
        uuid: 'u1' as never,
        message: { content: 'reply' },
      } as never),
    ).toBe(false)
  })

  test('usuario con tool_result que NO esta en el indice 0 → NO es resultado (solo se revisa el primero)', () => {
    // Comportamiento documentado: content[0]?.type === 'tool_result' —
    // solo el primer bloque importa para el guarda de tipo. Fija esto
    // para que un refactor que recorra todos los bloques no cambie la
    // clasificacion.
    expect(
      isToolUseResultMessage({
        type: 'user',
        uuid: 'u1' as never,
        message: {
          content: [
            { type: 'text', text: 'before' },
            { type: 'tool_result', tool_use_id: 'tu', content: 'ok' },
          ],
        },
      } as never),
    ).toBe(false)
  })
})

describe('extractTag — extraccion de contenido de etiqueta XML/HTML', () => {
  test('extraccion simple de etiqueta', () => {
    expect(extractTag('<foo>hello</foo>', 'foo')).toBe('hello')
  })

  test('etiqueta con atributos', () => {
    expect(extractTag('<foo bar="baz">content</foo>', 'foo')).toBe('content')
  })

  test('multiples atributos', () => {
    expect(extractTag('<foo a="1" b="2">x</foo>', 'foo')).toBe('x')
  })

  test('contenido multilinea preservado', () => {
    expect(extractTag('<foo>line1\nline2\nline3</foo>', 'foo')).toBe(
      'line1\nline2\nline3',
    )
  })

  test('coincidencia de etiqueta insensible a caja', () => {
    // El regex se construye con la bandera 'gi'.
    expect(extractTag('<FOO>hi</FOO>', 'foo')).toBe('hi')
    expect(extractTag('<foo>hi</foo>', 'FOO')).toBe('hi')
  })

  test('etiqueta ausente → null', () => {
    expect(extractTag('<bar>hi</bar>', 'foo')).toBeNull()
  })

  test('contenido vacio → null (la funcion devuelve null ante vacio)', () => {
    // El regex captura el contenido; el contenido vacio falla el chequeo
    // de profundidad (`if (depth === 0 && content)`) porque '' es falsy.
    expect(extractTag('<foo></foo>', 'foo')).toBeNull()
  })

  test('html vacio → null', () => {
    expect(extractTag('', 'foo')).toBeNull()
  })

  test('html solo con espacios → null', () => {
    expect(extractTag('   ', 'foo')).toBeNull()
  })

  test('tagName vacio → null', () => {
    expect(extractTag('<foo>x</foo>', '')).toBeNull()
  })

  test('tagName solo con espacios → null', () => {
    expect(extractTag('<foo>x</foo>', '   ')).toBeNull()
  })

  test('devuelve la PRIMERA coincidencia cuando hay varias instancias', () => {
    expect(extractTag('<foo>first</foo><foo>second</foo>', 'foo')).toBe(
      'first',
    )
  })

  test('caracteres especiales de regex en tagName se escapan', () => {
    // La funcion usa escapeRegExp sobre tagName. Nombres de etiqueta con
    // puntos, etc. (poco comun pero teoricamente posible en XML propio)
    // deberian seguir funcionando.
    expect(extractTag('<foo.bar>x</foo.bar>', 'foo.bar')).toBe('x')
  })

  test('etiquetas anidadas — se captura el contenido de la etiqueta externa (coincidencia no-codiciosa dentro de profundidad=0)', () => {
    // La funcion rastrea profundidad — solo se devuelven las coincidencias
    // en profundidad 0. La coincidencia no-codiciosa toma la PRIMERA
    // etiqueta de cierre.
    const r = extractTag('<a><b>inner</b></a>', 'a')
    // «inner» se captura porque el contenido de la externa INCLUYE las
    // etiquetas anidadas.
    expect(r).toBe('<b>inner</b>')
  })

  test('el contenido con entidades HTML se preserva (sin decodificar)', () => {
    expect(extractTag('<foo>&amp;hello</foo>', 'foo')).toBe('&amp;hello')
  })

  test('etiquetas de estilo autocerrado (sin contenido) → null', () => {
    // <foo/> no tiene contenido. La funcion busca <foo>...</foo>, asi que
    // una etiqueta autocerrada no coincide con el patron en absoluto.
    expect(extractTag('<foo/>', 'foo')).toBeNull()
  })
})

describe('isNotEmptyMessage — chequeo de vacuidad de contenido', () => {
  // Se reimporta dentro del describe para no perturbar el bloque de
  // import ya existente del archivo. El ayudante tiene que coincidir con
  // la constante canonica NO_CONTENT_MESSAGE — una deriva del 2026-04-29
  // en la fuente hizo que mensajes vacios de fabrica se trataran como
  // no-vacios.
  let isNotEmptyMessage: typeof import('../messages.ts').isNotEmptyMessage
  let NO_CONTENT_MESSAGE: string
  beforeAll(async () => {
    ;({ isNotEmptyMessage } = await import('../messages.ts'))
    ;({ NO_CONTENT_MESSAGE } = await import('../constants/messages.ts'))
  })

  test('los mensajes progress / attachment / system siempre se consideran no-vacios', () => {
    expect(
      isNotEmptyMessage({ type: 'progress', uuid: 'u1' as never } as never),
    ).toBe(true)
    expect(
      isNotEmptyMessage({ type: 'attachment', uuid: 'u1' as never } as never),
    ).toBe(true)
    expect(
      isNotEmptyMessage({ type: 'system', uuid: 'u1' as never } as never),
    ).toBe(true)
  })

  test('usuario con contenido de cadena no-vacia es no-vacio', () => {
    expect(
      isNotEmptyMessage({
        type: 'user',
        uuid: 'u1' as never,
        message: { content: 'hello' },
      } as never),
    ).toBe(true)
  })

  test('usuario con contenido de cadena vacia es vacio', () => {
    expect(
      isNotEmptyMessage({
        type: 'user',
        uuid: 'u1' as never,
        message: { content: '' },
      } as never),
    ).toBe(false)
  })

  test('usuario con contenido solo de espacios es vacio', () => {
    expect(
      isNotEmptyMessage({
        type: 'user',
        uuid: 'u1' as never,
        message: { content: '   \n\t  ' },
      } as never),
    ).toBe(false)
  })

  test('usuario con arreglo de contenido vacio es vacio', () => {
    expect(
      isNotEmptyMessage({
        type: 'user',
        uuid: 'u1' as never,
        message: { content: [] },
      } as never),
    ).toBe(false)
  })

  test('usuario con un solo bloque de texto que coincide con NO_CONTENT_MESSAGE es vacio', () => {
    // CRITICO: esto fija la concordancia entre la constante canonica y la
    // comparacion. Una deriva causo que el "[Sin contenido]" fabricado
    // por la factoria se tratara como no-vacio (hallazgo del 2026-04-29).
    expect(
      isNotEmptyMessage({
        type: 'user',
        uuid: 'u1' as never,
        message: {
          content: [{ type: 'text', text: NO_CONTENT_MESSAGE }],
        },
      } as never),
    ).toBe(false)
  })

  test('usuario con un solo bloque de texto vacio es vacio', () => {
    expect(
      isNotEmptyMessage({
        type: 'user',
        uuid: 'u1' as never,
        message: { content: [{ type: 'text', text: '' }] },
      } as never),
    ).toBe(false)
  })

  test('usuario con un solo bloque no-texto (imagen/tool_result) es no-vacio', () => {
    expect(
      isNotEmptyMessage({
        type: 'user',
        uuid: 'u1' as never,
        message: {
          content: [{ type: 'image', source: {} }],
        },
      } as never),
    ).toBe(true)
  })

  test('usuario con varios bloques es no-vacio (guarda de multi-bloque)', () => {
    // Documentado: la funcion explicitamente omite el contenido
    // multi-bloque. Dos bloques de texto, ambos vacios → aun asi se
    // considera no-vacio.
    expect(
      isNotEmptyMessage({
        type: 'user',
        uuid: 'u1' as never,
        message: {
          content: [
            { type: 'text', text: '' },
            { type: 'text', text: '' },
          ],
        },
      } as never),
    ).toBe(true)
  })
})

describe('extractTag — LIMITACIONES documentadas (no son bugs, son contrato)', () => {
  // Estos casos fijan las limitaciones conocidas de la funcion para que un
  // futuro refactor no CAMBIE el comportamiento sin que nadie lo note. No
  // son bugs porque:
  //   1. extractTag se usa para extraer etiquetas controladas por el
  //      usuario como <bash-input>, <command-name> — las entradas que le
  //      damos nunca llevan valores de atributo con `>` o `</` crudos.
  //   2. Las etiquetas anidadas del mismo nombre no aparecen en nuestros
  //      casos de uso (no hay
  //      `<command-name>foo<command-name>bar</command-name></command-name>`).
  // Se documenta la limitacion para que quien tope con una de estas en un
  // caso de uso nuevo vea la restriccion de inmediato.

  test('etiquetas anidadas del mismo nombre: devuelve el contenido hasta el PRIMER cierre', () => {
    // <a>outer<a>inner</a>more</a> — el contenido "real" de la externa es
    // "outer<a>inner</a>more". El regex no-codicioso captura hasta el
    // primer `</a>`. Limitacion: el anidamiento del mismo nombre no se
    // maneja.
    expect(extractTag('<a>outer<a>inner</a>more</a>', 'a')).toBe(
      'outer<a>inner',
    )
  })

  test('el anidamiento profundo del mismo nombre colapsa al primer cierre', () => {
    // <a><a><a>deep</a></a></a> — captura hasta el primer </a>.
    expect(extractTag('<a><a><a>deep</a></a></a>', 'a')).toBe('<a><a>deep')
  })

  test('un valor de atributo con un > crudo rompe el analizador', () => {
    // <a foo="x>y">content</a> — el `>` dentro del atributo cierra la
    // etiqueta de apertura antes de tiempo. Limitacion preexistente —
    // ninguno de nuestros llamadores alimenta cadenas con esta forma.
    const r = extractTag('<a foo="x>y">content</a>', 'a')
    expect(r).not.toBe('content') // resultado incorrecto, pero documentado
  })

  test('un valor de atributo con </tag> rompe el analizador', () => {
    // <a foo="</a>">content</a> — el "</a>" incrustado dentro del
    // atributo entre comillas coincide con el patron de cierre.
    // Limitacion preexistente; <bash-input>/<command-name>, controladas
    // por el usuario, nunca llevan atributos.
    const r = extractTag('<a foo="</a>">content</a>', 'a')
    expect(r).not.toBe('content')
  })

  test('etiquetas hermanas disjuntas: devuelve la PRIMERA ocurrencia', () => {
    // Documentado en otro lugar ("devuelve la primera coincidencia");
    // fijado aqui como contrato para el caso sin anidamiento, para que un
    // parche "arregla el anidamiento" no elija por accidente la etiqueta
    // equivocada.
    expect(extractTag('<x><a>1</a></x><x><a>2</a></x>', 'x')).toBe(
      '<a>1</a>',
    )
  })

  test('etiqueta sin cerrar → null (sin respaldo codicioso)', () => {
    // <a>nunca cierra — el regex exige una etiqueta de cierre que
    // coincida. Sin ella, no hay coincidencia. Importante: evita que
    // extractTag devuelva todo-lo-posterior-a-la-apertura, que seria un
    // problema de seguridad si la entrada del usuario puede llevar un
    // <bash-input> perdido.
    expect(extractTag('<a>never closes', 'a')).toBeNull()
  })
})
