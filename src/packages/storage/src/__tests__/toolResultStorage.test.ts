/**
 * `toolResultStorage.ts` — el mecanismo que impide que un turno reviente el
 * contexto con la salida de sus herramientas.
 *
 * QUÉ CIERRA. `toolLimits.ts` de `@thyrox/tool-registry` declara los topes
 * (50 K por resultado, 200 K agregados por mensaje) y nadie los APLICABA:
 * el módulo que lo hace no estaba portado. Su ausencia además bloqueaba
 * `pdf.ts`, que persiste páginas extraídas por esta misma vía.
 *
 * DOS PRESUPUESTOS DISTINTOS, y confundirlos es el error fácil:
 *
 *   POR RESULTADO — un resultado que excede su umbral se escribe a disco y
 *   el modelo recibe una vista previa con la ruta. El umbral es del propio
 *   tool, acotado por el default global.
 *
 *   POR MENSAJE — el agregado de los `tool_result` de UN mensaje de
 *   usuario. Existe porque el tope por resultado no acota la suma: diez
 *   herramientas en paralelo, cada una debajo del suyo, producen 400 K en
 *   un turno.
 *
 * LO QUE GOBIERNA TODO EL PRESUPUESTO POR MENSAJE es la CACHÉ DE PROMPT.
 * Una decisión tomada se congela: un resultado ya reemplazado recibe el
 * MISMO reemplazo cada turno —de un mapa, sin tocar disco— y uno ya visto
 * sin reemplazar no se reemplaza nunca. Cambiar una decisión pasada
 * cambiaría el prefijo que el servidor ya cacheó, y el ahorro del
 * presupuesto se pagaría con una recompra del contexto entero.
 *
 * MITAD ROJA: los casos fallan porque el módulo no existe.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  clearGrowthBookConfigOverrides,
  setGrowthBookConfigOverride,
} from '@thyrox/config/feature-flags'
import { setOriginalCwd } from '@thyrox/app-host/bootstrap/state.js'

const previo = process.env.CLAUDE_CONFIG_DIR

beforeEach(() => {
  process.env.CLAUDE_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'trs-'))
  setOriginalCwd(mkdtempSync(join(tmpdir(), 'trs-cwd-')))
  clearGrowthBookConfigOverrides()
})
afterEach(() => {
  clearGrowthBookConfigOverrides()
  if (previo === undefined) delete process.env.CLAUDE_CONFIG_DIR
  else process.env.CLAUDE_CONFIG_DIR = previo
})

/** Un mensaje de usuario con N bloques `tool_result`. */
function mensajeConResultados(
  bloques: Array<{ id: string; content: string }>,
): unknown {
  return {
    type: 'user',
    message: {
      role: 'user',
      content: bloques.map(b => ({
        type: 'tool_result',
        tool_use_id: b.id,
        content: b.content,
      })),
    },
  }
}

/** Un mensaje del asistente: es lo ÚNICO que corta un grupo de mensajes. */
function mensajeAsistente(id: string, usos: Array<{ id: string; name: string }> = []): unknown {
  return {
    type: 'assistant',
    message: {
      id,
      role: 'assistant',
      content: usos.map(u => ({ type: 'tool_use', id: u.id, name: u.name, input: {} })),
    },
  }
}

describe('getPersistenceThreshold — cuánto aguanta un resultado antes de ir a disco', () => {
  test('1. el tope del tool se ACOTA por el default global', async () => {
    // Un tool que declare medio mega no puede saltarse el techo del
    // sistema. El mínimo es lo que hace que el techo sea un techo.
    const { getPersistenceThreshold } = await import('../toolResultStorage.ts')
    expect(getPersistenceThreshold('Bash', 500_000)).toBe(50_000)
    expect(getPersistenceThreshold('Bash', 1_000)).toBe(1_000)
  })

  test('2. `Infinity` es una renuncia DURA, y gana a la bandera', async () => {
    // `Read` se acota por su propio `maxTokens`: persistir su salida a un
    // archivo que el modelo vuelve a leer con `Read` es circular. La
    // comprobación va ANTES del override para que ninguna bandera lo
    // reactive.
    const { getPersistenceThreshold } = await import('../toolResultStorage.ts')
    setGrowthBookConfigOverride('tengu_satin_quoll', { Read: 1_000 } as never)
    expect(getPersistenceThreshold('Read', Infinity)).toBe(Infinity)
  })

  test('3. el override de la bandera se usa TAL CUAL, sin acotar', async () => {
    // Es su razón de ser: poder subir un tool por encima del default sin
    // recompilar. Acotarlo lo dejaría inerte justo para lo que sirve.
    const { getPersistenceThreshold } = await import('../toolResultStorage.ts')
    setGrowthBookConfigOverride('tengu_satin_quoll', { Bash: 120_000 } as never)
    expect(getPersistenceThreshold('Bash', 10_000)).toBe(120_000)
    // Un tool ausente del mapa cae al camino normal.
    expect(getPersistenceThreshold('Grep', 10_000)).toBe(10_000)
  })

  test('4. una bandera servida con basura NO tumba la resolución', async () => {
    // La caché de banderas devuelve lo cacheado si existe, así que un
    // `null` o una cadena se cuelan. Sin la guarda, indexar sobre ellos
    // lanza o devuelve 0 — y un umbral de 0 persistiría TODO resultado.
    const { getPersistenceThreshold } = await import('../toolResultStorage.ts')
    for (const basura of [null, 'no soy un mapa', 42]) {
      setGrowthBookConfigOverride('tengu_satin_quoll', basura as never)
      expect(getPersistenceThreshold('Bash', 10_000)).toBe(10_000)
    }
    // Y un valor no positivo dentro del mapa tampoco pasa.
    setGrowthBookConfigOverride('tengu_satin_quoll', { Bash: 0 } as never)
    expect(getPersistenceThreshold('Bash', 10_000)).toBe(10_000)
  })
})

describe('generatePreview — cortar sin partir una línea', () => {
  test('5. lo que cabe entero no se toca', async () => {
    const { generatePreview } = await import('../toolResultStorage.ts')
    expect(generatePreview('corto', 100)).toEqual({ preview: 'corto', hasMore: false })
  })

  test('6. corta en el último salto de línea, no a mitad de renglón', async () => {
    const { generatePreview } = await import('../toolResultStorage.ts')
    const r = generatePreview('a'.repeat(60) + '\n' + 'b'.repeat(60), 100)
    expect(r.preview).toBe('a'.repeat(60))
    expect(r.hasMore).toBe(true)
  })

  test('7. si el salto está DEMASIADO atrás, corta en el límite exacto', async () => {
    // Sin el umbral del 50 %, un archivo con una primera línea corta y
    // luego un bloque enorme sin saltos daría una vista previa de tres
    // caracteres — inútil para que el modelo decida si abre el archivo.
    const { generatePreview } = await import('../toolResultStorage.ts')
    const r = generatePreview('ab\n' + 'c'.repeat(200), 100)
    expect(r.preview.length).toBe(100)
    expect(r.hasMore).toBe(true)
  })
})

describe('isToolResultContentEmpty — las cinco formas de «no dijo nada»', () => {
  test('8. vacío, blanco, arreglo vacío y bloques de texto en blanco', async () => {
    const { isToolResultContentEmpty } = await import('../toolResultStorage.ts')
    expect(isToolResultContentEmpty(undefined)).toBe(true)
    expect(isToolResultContentEmpty('')).toBe(true)
    expect(isToolResultContentEmpty('   \n ')).toBe(true)
    expect(isToolResultContentEmpty([])).toBe(true)
    expect(isToolResultContentEmpty([{ type: 'text', text: '  ' }] as never)).toBe(true)
  })

  test('9. una imagen NO es vacío, aunque no traiga texto', async () => {
    // Es el caso que un chequeo por longitud de texto daría por vacío, y
    // sustituir una imagen por «(completado sin salida)» le quitaría al
    // modelo lo único que le mandaron.
    const { isToolResultContentEmpty } = await import('../toolResultStorage.ts')
    expect(isToolResultContentEmpty([{ type: 'image', source: {} }] as never)).toBe(false)
    expect(isToolResultContentEmpty('hay texto')).toBe(false)
  })
})

describe('persistToolResult — el resultado en disco', () => {
  test('10. escribe el contenido y devuelve su vista previa', async () => {
    const { persistToolResult, isPersistError } = await import('../toolResultStorage.ts')
    const r = await persistToolResult('x'.repeat(5000), 'tu-1')
    expect(isPersistError(r)).toBe(false)
    if (isPersistError(r)) return
    expect(readFileSync(r.filepath, 'utf8').length).toBe(5000)
    expect(r.originalSize).toBe(5000)
    expect(r.hasMore).toBe(true)
    expect(r.isJson).toBe(false)
    expect(r.filepath.endsWith('tu-1.txt')).toBe(true)
  })

  test('11. un contenido en bloques se guarda como JSON, con otra extensión', async () => {
    const { persistToolResult, isPersistError } = await import('../toolResultStorage.ts')
    const r = await persistToolResult([{ type: 'text', text: 'hola' }] as never, 'tu-2')
    if (isPersistError(r)) throw new Error('no debía fallar')
    expect(r.isJson).toBe(true)
    expect(r.filepath.endsWith('tu-2.json')).toBe(true)
    expect(JSON.parse(readFileSync(r.filepath, 'utf8'))[0].text).toBe('hola')
  })

  test('12. un contenido con imagen NO se persiste: se declara el error', async () => {
    const { persistToolResult, isPersistError } = await import('../toolResultStorage.ts')
    const r = await persistToolResult([{ type: 'image', source: {} }] as never, 'tu-3')
    expect(isPersistError(r)).toBe(true)
  })

  test('13. re-persistir el MISMO id no reescribe el archivo', async () => {
    // El id de uso es único por invocación y el contenido determinista,
    // así que el archivo ya está. Reescribirlo en cada turno —la
    // microcompactación reproduce los mensajes originales— sería trabajo
    // de disco por turno y por resultado. La bandera `wx` lo evita sin
    // una carrera entre `stat` y escritura.
    const { persistToolResult, isPersistError } = await import('../toolResultStorage.ts')
    const primero = await persistToolResult('original', 'tu-4')
    if (isPersistError(primero)) throw new Error('no debía fallar')
    writeFileSync(primero.filepath, 'lo que otro escribió')
    const segundo = await persistToolResult('original', 'tu-4')
    if (isPersistError(segundo)) throw new Error('no debía fallar')
    expect(readFileSync(primero.filepath, 'utf8')).toBe('lo que otro escribió')
    // Y aun así devuelve su vista previa: EEXIST no es un fallo.
    expect(segundo.preview).toBe('original')
  })

  test('14. el mensaje que ve el modelo lleva sus dos etiquetas y la ruta', async () => {
    // Las etiquetas son contrato: el presupuesto por mensaje reconoce por
    // ellas lo que ya reemplazó, para no reemplazarlo dos veces.
    const { persistToolResult, buildLargeToolResultMessage, isPersistError } =
      await import('../toolResultStorage.ts')
    const r = await persistToolResult('y'.repeat(3000), 'tu-5')
    if (isPersistError(r)) throw new Error('no debía fallar')
    const m = buildLargeToolResultMessage(r)
    expect(m.startsWith('<persisted-output>')).toBe(true)
    expect(m.endsWith('</persisted-output>')).toBe(true)
    expect(m).toContain(r.filepath)
    expect(m.length).toBeLessThan(3000)
  })
})

describe('processToolResultBlock — el presupuesto POR RESULTADO', () => {
  const tool = {
    name: 'Bash',
    maxResultSizeChars: 1_000,
    mapToolResultToToolResultBlockParam: (r: string, id: string) => ({
      type: 'tool_result' as const,
      tool_use_id: id,
      content: r,
    }),
  }

  test('15. lo pequeño pasa intacto', async () => {
    const { processToolResultBlock } = await import('../toolResultStorage.ts')
    const b = await processToolResultBlock(tool, 'poca cosa', 'tu-6')
    expect(b.content).toBe('poca cosa')
  })

  test('16. lo grande se sustituye por su referencia', async () => {
    const { processToolResultBlock } = await import('../toolResultStorage.ts')
    const b = await processToolResultBlock(tool, 'z'.repeat(5000), 'tu-7')
    expect(String(b.content).startsWith('<persisted-output>')).toBe(true)
  })

  test('17. un resultado VACÍO recibe un marcador, no se manda vacío', async () => {
    // Un `tool_result` vacío al final del prompt hace que algunos modelos
    // lean el hueco como final de turno y respondan con nada. Varias
    // herramientas producen salida vacía legítimamente.
    const { processToolResultBlock } = await import('../toolResultStorage.ts')
    const b = await processToolResultBlock(tool, '   ', 'tu-8')
    expect(b.content).toBe('(Bash completed with no output)')
  })

  test('18. una imagen NO se persiste: viaja tal cual', async () => {
    const { processPreMappedToolResultBlock } = await import('../toolResultStorage.ts')
    const bloque = {
      type: 'tool_result' as const,
      tool_use_id: 'tu-9',
      content: [{ type: 'image', source: { data: 'x'.repeat(9000) } }],
    }
    const b = await processPreMappedToolResultBlock(bloque as never, 'Read', 100)
    expect(Array.isArray(b.content)).toBe(true)
  })
})

describe('el presupuesto POR MENSAJE, y su contrato con la caché de prompt', () => {
  test('19. el límite sale de la bandera cuando es un número positivo', async () => {
    const { getPerMessageBudgetLimit } = await import('../toolResultStorage.ts')
    expect(getPerMessageBudgetLimit()).toBe(200_000)
    setGrowthBookConfigOverride('tengu_hawthorn_window', 5_000 as never)
    expect(getPerMessageBudgetLimit()).toBe(5_000)
    for (const basura of [null, 'cinco', -1, 0]) {
      setGrowthBookConfigOverride('tengu_hawthorn_window', basura as never)
      expect(getPerMessageBudgetLimit()).toBe(200_000)
    }
  })

  test('20. por debajo del límite NO toca nada, y devuelve el MISMO arreglo', async () => {
    // La identidad del arreglo importa: devolver una copia en el camino
    // común obligaría a los llamadores a re-derivar todo cada turno.
    const { enforceToolResultBudget, createContentReplacementState } =
      await import('../toolResultStorage.ts')
    setGrowthBookConfigOverride('tengu_hawthorn_window', 100_000 as never)
    const mensajes = [mensajeConResultados([{ id: 'a', content: 'x'.repeat(10) }])] as never
    const r = await enforceToolResultBudget(mensajes, createContentReplacementState())
    expect(r.messages).toBe(mensajes)
    expect(r.newlyReplaced).toEqual([])
  })

  test('21. por encima del límite reemplaza los MÁS GRANDES primero', async () => {
    // Reemplazar el pequeño primero exigiría reemplazar más bloques para
    // el mismo ahorro, y cada reemplazo le quita contexto al modelo.
    const { enforceToolResultBudget, createContentReplacementState } =
      await import('../toolResultStorage.ts')
    setGrowthBookConfigOverride('tengu_hawthorn_window', 5_000 as never)
    const mensajes = [
      mensajeConResultados([
        { id: 'chico', content: 'a'.repeat(1_000) },
        { id: 'grande', content: 'b'.repeat(9_000) },
      ]),
    ] as never
    const estado = createContentReplacementState()
    const r = await enforceToolResultBudget(mensajes, estado)
    expect(r.newlyReplaced.map(x => x.toolUseId)).toEqual(['grande'])
    const bloques = (r.messages[0] as never as { message: { content: Array<{ tool_use_id: string; content: string }> } }).message.content
    expect(bloques.find(b => b.tool_use_id === 'chico')!.content).toBe('a'.repeat(1_000))
    expect(bloques.find(b => b.tool_use_id === 'grande')!.content.startsWith('<persisted-output>')).toBe(true)
  })

  test('22. la decisión se CONGELA: el segundo turno reaplica sin tocar disco', async () => {
    // Es el contrato entero. Si el segundo turno decidiera otra vez,
    // podría decidir distinto —o escribir de nuevo— y el prefijo dejaría
    // de coincidir con el que el servidor cacheó.
    const { enforceToolResultBudget, createContentReplacementState } =
      await import('../toolResultStorage.ts')
    setGrowthBookConfigOverride('tengu_hawthorn_window', 5_000 as never)
    const mensajes = [
      mensajeConResultados([{ id: 'g', content: 'b'.repeat(9_000) }]),
    ] as never
    const estado = createContentReplacementState()
    const primero = await enforceToolResultBudget(mensajes, estado)
    const reemplazo = String((primero.messages[0] as never as { message: { content: Array<{ content: string }> } }).message.content[0]!.content)
    const segundo = await enforceToolResultBudget(mensajes, estado)
    // Idéntico byte a byte, y esta vez NO es un reemplazo nuevo.
    expect(String((segundo.messages[0] as never as { message: { content: Array<{ content: string }> } }).message.content[0]!.content)).toBe(reemplazo)
    expect(segundo.newlyReplaced).toEqual([])
  })

  test('23. lo ya visto SIN reemplazar no se reemplaza después', async () => {
    // El caso inverso, y el que un «reemplaza lo que exceda» ingenuo
    // rompería: un resultado que el modelo ya vio entero no puede
    // encogerse en un turno posterior.
    const { enforceToolResultBudget, createContentReplacementState } =
      await import('../toolResultStorage.ts')
    const estado = createContentReplacementState()
    setGrowthBookConfigOverride('tengu_hawthorn_window', 100_000 as never)
    const mensajes = [
      mensajeConResultados([{ id: 'v', content: 'c'.repeat(9_000) }]),
    ] as never
    await enforceToolResultBudget(mensajes, estado)   // pasa: cabe
    setGrowthBookConfigOverride('tengu_hawthorn_window', 1_000 as never)
    const segundo = await enforceToolResultBudget(mensajes, estado)
    expect(segundo.newlyReplaced).toEqual([])
    expect(segundo.messages).toBe(mensajes)
  })

  test('24. dos mensajes SEPARADOS por el asistente se evalúan por separado', async () => {
    // Cada uno cabe; juntos no. Es la garantía declarada: un resultado en
    // un turno y otro en el siguiente no se suman.
    const { enforceToolResultBudget, createContentReplacementState } =
      await import('../toolResultStorage.ts')
    setGrowthBookConfigOverride('tengu_hawthorn_window', 5_000 as never)
    const mensajes = [
      mensajeConResultados([{ id: 'p', content: 'a'.repeat(4_000) }]),
      mensajeAsistente('asst-1'),
      mensajeConResultados([{ id: 'q', content: 'b'.repeat(4_000) }]),
    ] as never
    const r = await enforceToolResultBudget(mensajes, createContentReplacementState())
    expect(r.newlyReplaced).toEqual([])
  })

  test('25. dos mensajes SIN asistente en medio son UN grupo', async () => {
    // Es lo que la normalización hace en el cable: mensajes de usuario
    // consecutivos se funden en uno. Sin agrupar igual, el presupuesto
    // vería dos mensajes que caben y dejaría pasar uno que no cabe —
    // fallando justo cuando más importa.
    const { enforceToolResultBudget, createContentReplacementState } =
      await import('../toolResultStorage.ts')
    setGrowthBookConfigOverride('tengu_hawthorn_window', 5_000 as never)
    const mensajes = [
      mensajeConResultados([{ id: 'p', content: 'a'.repeat(4_000) }]),
      mensajeConResultados([{ id: 'q', content: 'b'.repeat(4_000) }]),
    ] as never
    const r = await enforceToolResultBudget(mensajes, createContentReplacementState())
    expect(r.newlyReplaced.length).toBeGreaterThan(0)
  })

  test('26. un asistente REPETIDO no corta el grupo', async () => {
    // La normalización funde los fragmentos del mismo identificador en un
    // solo mensaje de cable, así que sus resultados también se funden.
    // Cortar ahí volvería a partir un grupo que en el cable es uno.
    const { enforceToolResultBudget, createContentReplacementState } =
      await import('../toolResultStorage.ts')
    setGrowthBookConfigOverride('tengu_hawthorn_window', 5_000 as never)
    const mensajes = [
      mensajeAsistente('asst-X'),
      mensajeConResultados([{ id: 'p', content: 'a'.repeat(4_000) }]),
      mensajeAsistente('asst-X'),
      mensajeConResultados([{ id: 'q', content: 'b'.repeat(4_000) }]),
    ] as never
    const r = await enforceToolResultBudget(mensajes, createContentReplacementState())
    expect(r.newlyReplaced.length).toBeGreaterThan(0)
  })

  test('27. un tool en la lista de exentos se congela sin reemplazar', async () => {
    const { enforceToolResultBudget, createContentReplacementState } =
      await import('../toolResultStorage.ts')
    setGrowthBookConfigOverride('tengu_hawthorn_window', 1_000 as never)
    const mensajes = [
      mensajeAsistente('asst-1', [{ id: 'r', name: 'Read' }]),
      mensajeConResultados([{ id: 'r', content: 'a'.repeat(9_000) }]),
    ] as never
    const estado = createContentReplacementState()
    const r = await enforceToolResultBudget(mensajes, estado, new Set(['Read']))
    expect(r.newlyReplaced).toEqual([])
    expect(estado.seenIds.has('r')).toBe(true)
  })

  test('28. lo ya compactado no se vuelve a compactar', async () => {
    const { enforceToolResultBudget, createContentReplacementState } =
      await import('../toolResultStorage.ts')
    setGrowthBookConfigOverride('tengu_hawthorn_window', 100 as never)
    const mensajes = [
      mensajeConResultados([
        { id: 'ya', content: '<persisted-output>\nlo de antes\n</persisted-output>' },
      ]),
    ] as never
    const r = await enforceToolResultBudget(mensajes, createContentReplacementState())
    expect(r.newlyReplaced).toEqual([])
  })
})

describe('reconstruir el estado al reanudar', () => {
  test('29. todo candidato del transcript queda CONGELADO', async () => {
    // Estar en el transcript significa que el modelo ya lo vio. Sin
    // congelarlo, la sesión reanudada podría reemplazar contenido que la
    // original mandó entero y perder la caché de golpe.
    const { reconstructContentReplacementState } = await import('../toolResultStorage.ts')
    const mensajes = [
      mensajeConResultados([{ id: 'a', content: 'x' }, { id: 'b', content: 'y' }]),
    ] as never
    const estado = reconstructContentReplacementState(mensajes, [])
    expect([...estado.seenIds].sort()).toEqual(['a', 'b'])
    expect(estado.replacements.size).toBe(0)
  })

  test('30. los registros repueblan el reemplazo EXACTO, no uno derivado', async () => {
    // Se guarda la cadena que el modelo vio, no cómo se construyó: un
    // cambio en la plantilla de la vista previa rompería la caché en
    // silencio si se re-derivara.
    const { reconstructContentReplacementState } = await import('../toolResultStorage.ts')
    const mensajes = [mensajeConResultados([{ id: 'a', content: 'x' }])] as never
    const estado = reconstructContentReplacementState(mensajes, [
      { kind: 'tool-result', toolUseId: 'a', replacement: 'LO QUE VIO' },
      { kind: 'tool-result', toolUseId: 'fantasma', replacement: 'no está en los mensajes' },
    ])
    expect(estado.replacements.get('a')).toBe('LO QUE VIO')
    expect(estado.replacements.has('fantasma')).toBe(false)
  })

  test('31. el mapa heredado rellena huecos, sin pisar un registro', async () => {
    // Una bifurcación aplica los reemplazos del padre sin persistirlos, así
    // que al reanudar no hay registro de ellos y quedarían como congelados.
    const { reconstructContentReplacementState } = await import('../toolResultStorage.ts')
    const mensajes = [
      mensajeConResultados([{ id: 'a', content: 'x' }, { id: 'b', content: 'y' }]),
    ] as never
    const estado = reconstructContentReplacementState(
      mensajes,
      [{ kind: 'tool-result', toolUseId: 'a', replacement: 'DEL REGISTRO' }],
      new Map([['a', 'DEL PADRE'], ['b', 'DEL PADRE']]),
    )
    expect(estado.replacements.get('a')).toBe('DEL REGISTRO')
    expect(estado.replacements.get('b')).toBe('DEL PADRE')
  })

  test('32. sin estado del padre, la reanudación de subagente devuelve undefined', async () => {
    const { reconstructForSubagentResume, createContentReplacementState } =
      await import('../toolResultStorage.ts')
    expect(reconstructForSubagentResume(undefined, [] as never, [])).toBeUndefined()
    expect(reconstructForSubagentResume(createContentReplacementState(), [] as never, []))
      .not.toBeUndefined()
  })

  test('33. clonar aísla: mutar la copia no toca al origen', async () => {
    const { createContentReplacementState, cloneContentReplacementState } =
      await import('../toolResultStorage.ts')
    const origen = createContentReplacementState()
    origen.seenIds.add('a')
    origen.replacements.set('a', 'r')
    const copia = cloneContentReplacementState(origen)
    copia.seenIds.add('b')
    copia.replacements.set('b', 's')
    expect(origen.seenIds.has('b')).toBe(false)
    expect(origen.replacements.has('b')).toBe(false)
    expect(copia.replacements.get('a')).toBe('r')
  })

  test('34. la provisión respeta la bandera, y elige fresco o reconstruido', async () => {
    const { provisionContentReplacementState } = await import('../toolResultStorage.ts')
    expect(provisionContentReplacementState()).toBeUndefined()
    setGrowthBookConfigOverride('tengu_hawthorn_steeple', true as never)
    expect(provisionContentReplacementState()?.seenIds.size).toBe(0)
    const mensajes = [mensajeConResultados([{ id: 'a', content: 'x' }])] as never
    expect(provisionContentReplacementState(mensajes)?.seenIds.has('a')).toBe(true)
  })

  test('35. applyToolResultBudget es un no-op sin estado, y avisa al persistir', async () => {
    const { applyToolResultBudget, createContentReplacementState } =
      await import('../toolResultStorage.ts')
    setGrowthBookConfigOverride('tengu_hawthorn_window', 1_000 as never)
    const mensajes = [
      mensajeConResultados([{ id: 'a', content: 'x'.repeat(9_000) }]),
    ] as never
    expect(await applyToolResultBudget(mensajes, undefined)).toBe(mensajes)
    const escritos: unknown[] = []
    await applyToolResultBudget(mensajes, createContentReplacementState(), r => {
      escritos.push(...r)
    })
    expect(escritos).toHaveLength(1)
  })
})

describe('las rutas', () => {
  test('36. el directorio cuelga de la sesión, no del proyecto entero', async () => {
    // Dos sesiones en el mismo proyecto no comparten resultados: sus ids
    // de uso son únicos, pero el barrido y la limpieza son por sesión.
    const { getToolResultsDir, getToolResultPath, ensureToolResultsDir } =
      await import('../toolResultStorage.ts')
    // El asiento del identificador de sesión en ESTE paquete es
    // `sessionPaths.ts`, no `app-host` — ver la divergencia 1 del puerto.
    const { getSessionId } = await import('../sessionPaths.ts')
    expect(getToolResultsDir()).toContain(getSessionId())
    expect(getToolResultsDir().endsWith('tool-results')).toBe(true)
    expect(getToolResultPath('id', true).endsWith('id.json')).toBe(true)
    expect(getToolResultPath('id', false).endsWith('id.txt')).toBe(true)
    await ensureToolResultsDir()
    expect(existsSync(getToolResultsDir())).toBe(true)
  })
})
