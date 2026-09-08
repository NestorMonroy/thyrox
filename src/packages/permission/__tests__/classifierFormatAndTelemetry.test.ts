/**
 * La mitad ROJA del tramo de formato y telemetría del clasificador.
 *
 * Procedencia: `ccnmt: packages/permission/src/{classifierXmlFormat.ts,
 * classifierApprovals.ts, classifierTelemetry.ts}`. Ese árbol declara
 * `"license": "UNLICENSED"`, así que los cuerpos se reimplementan y no se
 * copian.
 *
 * POR QUÉ ESTOS TRES Y NO LOS CINCO DE LA FAMILIA. Medido: de los cinco
 * módulos `classifier*` que faltan, `classifierDecision.ts` importa 22
 * constantes de `tool-registry/tools/**` —el subárbol que la tarea #272
 * declara frontera— y `classifierStallTracking.ts` necesita
 * `agent/sideQuery.js` y `provider/antModels.js`, que no existen en este
 * árbol. Los otros tres resuelven hoy: se portan hoy.
 *
 * Métrica: la conducta de las funciones puras de formato, la clasificación de
 * error por su jerarquía de tipos, y el no-op declarado de las aprobaciones.
 * Ciega a: si el modelo produce de verdad la forma que estos parsers esperan
 * —eso es contrato con el proveedor, no del módulo— y a la conducta de las
 * aprobaciones con las banderas encendidas (ver el bloque que lo declara).
 */
import { describe, expect, test } from 'bun:test'

describe('parseXmlBlock — el veredicto, y sólo fuera del pensamiento', () => {
  test('1. `<block>yes</block>` bloquea; `<block>no</block>` no', async () => {
    const { parseXmlBlock } = await import('../src/classifierXmlFormat.ts')
    expect(parseXmlBlock('<block>yes</block>')).toBe(true)
    expect(parseXmlBlock('<block>no</block>')).toBe(false)
  })

  test('2. sin etiqueta devuelve null — que NO es «no bloquear»', async () => {
    const { parseXmlBlock } = await import('../src/classifierXmlFormat.ts')
    // `null` y `false` se leen distinto aguas arriba: uno es «no se pudo
    // parsear» y el otro «el modelo dijo que no». Colapsarlos convertiría un
    // fallo de formato en un permiso.
    expect(parseXmlBlock('no dijo nada útil')).toBe(null)
  })

  test('3. IGNORA la etiqueta que vive dentro de `<thinking>`', async () => {
    const { parseXmlBlock } = await import('../src/classifierXmlFormat.ts')
    // El modelo razona en voz alta y escribe la etiqueta como hipótesis. Sin
    // recortar el pensamiento, esa hipótesis se leería como el veredicto.
    expect(
      parseXmlBlock('<thinking><block>yes</block></thinking><block>no</block>'),
    ).toBe(false)
  })

  test('4. un `<thinking>` SIN CERRAR se descarta hasta el final', async () => {
    const { parseXmlBlock } = await import('../src/classifierXmlFormat.ts')
    // Una respuesta truncada por límite de salida deja el pensamiento abierto.
    // Si sólo se recortaran los pares cerrados, ese resto contaminaría — y el
    // pensamiento tiene que ir DELANTE para que la aserción lo ejercite: con
    // un veredicto válido antes, `matches[0]` ya sería el bueno y el caso
    // pasaría sin tocar esa rama (medido: la primera redacción no discriminaba).
    expect(parseXmlBlock('<thinking><block>yes')).toBe(null)
    expect(parseXmlBlock('<thinking>dudo<block>yes</block> y sigo')).toBe(null)
  })

  test('5. la etiqueta de cierre es OPCIONAL', async () => {
    const { parseXmlBlock } = await import('../src/classifierXmlFormat.ts')
    expect(parseXmlBlock('<block>yes')).toBe(true)
  })

  test('6. mayúsculas y minúsculas dan igual, y gana la PRIMERA', async () => {
    const { parseXmlBlock } = await import('../src/classifierXmlFormat.ts')
    expect(parseXmlBlock('<BLOCK>YES</BLOCK>')).toBe(true)
    expect(parseXmlBlock('<block>no</block><block>yes</block>')).toBe(false)
  })
})

describe('parseXmlReason / parseXmlThinking', () => {
  test('7. la razón se recorta y se toma fuera del pensamiento', async () => {
    const { parseXmlReason } = await import('../src/classifierXmlFormat.ts')
    expect(parseXmlReason('<reason>  borra el disco  </reason>')).toBe(
      'borra el disco',
    )
    expect(
      parseXmlReason('<thinking><reason>hipótesis</reason></thinking><reason>real</reason>'),
    ).toBe('real')
    expect(parseXmlReason('sin razón')).toBe(null)
  })

  test('8. el pensamiento SÍ se extrae, recortado', async () => {
    const { parseXmlThinking } = await import('../src/classifierXmlFormat.ts')
    expect(parseXmlThinking('<thinking>\n  a ver\n</thinking>')).toBe('a ver')
    expect(parseXmlThinking('nada')).toBe(null)
  })
})

describe('classifyParseFailure — rechazo de política contra formato ilegible', () => {
  test('9. un rechazo explícito es rechazo, no formato ilegible', async () => {
    const { classifyParseFailure } = await import(
      '../src/classifierXmlFormat.ts'
    )
    expect(classifyParseFailure(false, 'refusal')).toBe('policy_refusal')
  })

  test('10. vacío SIN truncar es rechazo; vacío POR truncar, no', async () => {
    const { classifyParseFailure } = await import(
      '../src/classifierXmlFormat.ts'
    )
    // La distinción decide si reintentar sirve de algo: un rechazo se repite
    // idéntico, una respuesta truncada por longitud puede no repetirse.
    expect(classifyParseFailure(true, 'end_turn')).toBe('policy_refusal')
    expect(classifyParseFailure(true, 'max_tokens')).toBe('unparseable')
    expect(classifyParseFailure(false, 'end_turn')).toBe('unparseable')
  })
})

describe('buildClassifierFailureReason — nada interno llega al usuario', () => {
  test('11. la etapa, la clase y el motivo de parada NO aparecen', async () => {
    const { buildClassifierFailureReason } = await import(
      '../src/classifierXmlFormat.ts'
    )
    const texto = buildClassifierFailureReason(
      'stage 2',
      'policy_refusal',
      'refusal',
    )
    // Los tres argumentos existen por simetría con el sitio de llamada y para
    // la telemetría; el texto que ve una persona es fijo. Filtrar «stage 2» o
    // «policy_refusal» sería enseñarle un interno del clasificador.
    for (const interno of ['stage 2', 'policy_refusal', 'refusal']) {
      expect(texto.includes(interno)).toBe(false)
    }
    expect(texto.length > 0).toBe(true)
    // Y es el MISMO para cualquier combinación: no hay filtración por variante.
    expect(buildClassifierFailureReason('stage 1', 'unparseable', null)).toBe(
      texto,
    )
  })
})

describe('extractUsage / extractRequestId / combineUsage', () => {
  test('12. el consumo ausente de caché cuenta como CERO, no como undefined', async () => {
    const { extractUsage } = await import('../src/classifierXmlFormat.ts')
    const u = extractUsage({
      usage: { input_tokens: 10, output_tokens: 3 },
    } as never)
    // Aguas abajo se suman: un `undefined` propagaría NaN por toda la cuenta.
    expect(u).toEqual({
      inputTokens: 10,
      outputTokens: 3,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
    })
  })

  test('13. el identificador de petición se lee, y un null es ausencia', async () => {
    const { extractRequestId } = await import('../src/classifierXmlFormat.ts')
    expect(extractRequestId({ _request_id: 'req_1' } as never)).toBe('req_1')
    expect(extractRequestId({ _request_id: null } as never)).toBe(undefined)
    expect(extractRequestId({} as never)).toBe(undefined)
  })

  test('14. combinar dos etapas suma los CUATRO campos', async () => {
    const { combineUsage } = await import('../src/classifierXmlFormat.ts')
    expect(
      combineUsage(
        {
          inputTokens: 1,
          outputTokens: 2,
          cacheReadInputTokens: 3,
          cacheCreationInputTokens: 4,
        },
        {
          inputTokens: 10,
          outputTokens: 20,
          cacheReadInputTokens: 30,
          cacheCreationInputTokens: 40,
        },
      ),
    ).toEqual({
      inputTokens: 11,
      outputTokens: 22,
      cacheReadInputTokens: 33,
      cacheCreationInputTokens: 44,
    })
  })
})

describe('replaceOutputFormatWithXml', () => {
  test('15. sustituye la instrucción de herramienta por la de XML', async () => {
    const { replaceOutputFormatWithXml } = await import(
      '../src/classifierXmlFormat.ts'
    )
    const prompt =
      'Reglas.\nUse the classify_result tool to report your classification.'
    const salida = replaceOutputFormatWithXml(prompt)
    expect(salida.includes('classify_result')).toBe(false)
    expect(salida.includes('<block>yes</block>')).toBe(true)
    expect(salida.startsWith('Reglas.\n')).toBe(true)
  })

  test('16. un prompt SIN esa línea sale intacto', async () => {
    const { replaceOutputFormatWithXml } = await import(
      '../src/classifierXmlFormat.ts'
    )
    expect(replaceOutputFormatWithXml('otra cosa')).toBe('otra cosa')
  })
})

describe('classifyClassifierErrorKind — el orden de la jerarquía decide', () => {
  test('17. el timeout de conexión gana al error de conexión', async () => {
    const { classifyClassifierErrorKind } = await import(
      '../src/classifierTelemetry.ts'
    )
    const { APIConnectionError, APIConnectionTimeoutError } = await import(
      '@anthropic-ai/sdk'
    )
    // `APIConnectionTimeoutError` EXTIENDE `APIConnectionError`: comprobado en
    // el orden inverso, todo timeout se contaría como error de conexión y la
    // telemetría perdería la distinción sin que nada fallara.
    expect(
      classifyClassifierErrorKind(new APIConnectionTimeoutError({})),
    ).toBe('connection_timeout')
    expect(
      classifyClassifierErrorKind(new APIConnectionError({ message: 'x' })),
    ).toBe('connection_error')
  })

  test('18. una interrupción es tiempo de reloj, y precede a todo', async () => {
    const { classifyClassifierErrorKind } = await import(
      '../src/classifierTelemetry.ts'
    )
    const abortado = new Error('abortado')
    abortado.name = 'AbortError'
    expect(classifyClassifierErrorKind(abortado)).toBe('wall_clock_timeout')
  })

  test('19. un estado HTTP viaja en el nombre de la clase de error', async () => {
    const { classifyClassifierErrorKind } = await import(
      '../src/classifierTelemetry.ts'
    )
    const { APIError } = await import('@anthropic-ai/sdk')
    // El SDK exige un `Headers` real: construye el error leyendo
    // `request-id` de la cabecera, y un objeto pelado no tiene `.get`.
    const e = new APIError(429, {}, 'demasiadas', new Headers())
    expect(classifyClassifierErrorKind(e)).toBe('http_429')
  })

  test('20. un código errno baja a minúsculas; lo demás es «other»', async () => {
    const { classifyClassifierErrorKind } = await import(
      '../src/classifierTelemetry.ts'
    )
    const dns = Object.assign(new Error('dns'), { code: 'ENOTFOUND' })
    expect(classifyClassifierErrorKind(dns)).toBe('enotfound')
    expect(classifyClassifierErrorKind(new Error('cualquiera'))).toBe('other')
    expect(classifyClassifierErrorKind('ni siquiera un error')).toBe('other')
  })
})

describe('detectPromptTooLong — el único que no vale reintentar', () => {
  test('21. reconoce el mensaje y devuelve las dos cuentas', async () => {
    const { detectPromptTooLong } = await import(
      '../src/classifierTelemetry.ts'
    )
    const r = detectPromptTooLong(
      new Error('prompt is too long: 250000 tokens > 200000 maximum'),
    )
    expect(r).toEqual({ actualTokens: 250000, limitTokens: 200000 })
  })

  test('22. cualquier otro error, y lo que no es error, dan undefined', async () => {
    const { detectPromptTooLong } = await import(
      '../src/classifierTelemetry.ts'
    )
    expect(detectPromptTooLong(new Error('429 rate limited'))).toBe(undefined)
    expect(detectPromptTooLong('prompt is too long: 1 > 2')).toBe(undefined)
  })
})

describe('logAutoModeOutcome — el evento sale con su forma', () => {
  test('23. emite el nombre del evento con desenlace y modelo', async () => {
    const { installLocalObservability } = await import(
      '@thyrox/local-observability'
    )
    const visto: Array<{ name: string; metadata: Record<string, unknown> }> = []
    installLocalObservability({
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        event: (name, metadata) => {
          visto.push({ name, metadata: metadata as Record<string, unknown> })
        },
      },
    })
    const { logAutoModeOutcome } = await import('../src/classifierTelemetry.ts')
    logAutoModeOutcome('parse_failure', 'un-modelo', {
      failureKind: 'unparseable',
      durationMs: 12,
    })
    expect(visto.length).toBe(1)
    expect(visto[0]!.name).toBe('tengu_auto_mode_outcome')
    expect(visto[0]!.metadata.outcome).toBe('parse_failure')
    expect(visto[0]!.metadata.classifierModel).toBe('un-modelo')
    expect(visto[0]!.metadata.failureKind).toBe('unparseable')
    expect(visto[0]!.metadata.durationMs).toBe(12)
  })

  test('24. una clave OMITIDA no viaja como undefined', async () => {
    const { installLocalObservability } = await import(
      '@thyrox/local-observability'
    )
    const visto: Array<Record<string, unknown>> = []
    installLocalObservability({
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        event: (_n, metadata) => {
          visto.push(metadata as Record<string, unknown>)
        },
      },
    })
    const { logAutoModeOutcome } = await import('../src/classifierTelemetry.ts')
    logAutoModeOutcome('success', 'm')
    // Una clave presente con valor `undefined` no es lo mismo que ausente:
    // el sumidero de telemetría la serializaría como columna vacía.
    expect('failureKind' in visto[0]!).toBe(false)
    expect('classifierType' in visto[0]!).toBe(false)
  })
})

describe('classifierApprovals — no-op DECLARADO con las banderas apagadas', () => {
  test('25. con las banderas apagadas, guardar una aprobación no guarda nada', async () => {
    const m = await import('../src/classifierApprovals.ts')
    // Medido en este árbol: `feature('BASH_CLASSIFIER')` y
    // `feature('TRANSCRIPT_CLASSIFIER')` son AMBAS falsas, así que este par
    // de aserciones mide el no-op, no el almacenamiento. Retirar los dos
    // guardas de `set`/`get` a la vez lo hace caer — es un control acoplado
    // y se declara como tal.
    m.setClassifierApproval('id-1', 'una regla')
    expect(m.getClassifierApproval('id-1')).toBe(undefined)
    m.setYoloClassifierApproval('id-2', 'una razón')
    expect(m.getYoloClassifierApproval('id-2')).toBe(undefined)
  })

  test('26. marcar «comprobando» tampoco marca nada', async () => {
    const m = await import('../src/classifierApprovals.ts')
    m.setClassifierChecking('id-3')
    expect(m.isClassifierChecking('id-3')).toBe(false)
  })

  test('27. limpiar SÍ avisa a quien escucha — no está tras la bandera', async () => {
    const m = await import('../src/classifierApprovals.ts')
    let avisos = 0
    const desuscribir = m.subscribeClassifierChecking(() => {
      avisos++
    })
    m.clearClassifierApprovals()
    // Esta sí discrimina con las banderas apagadas: la limpieza emite
    // incondicionalmente, porque un consumidor que dibuja el estado tiene que
    // enterarse de que ya no hay nada que dibujar.
    expect(avisos).toBe(1)
    desuscribir()
    m.clearClassifierApprovals()
    expect(avisos).toBe(1)
  })
})
