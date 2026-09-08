/**
 * Tramo 4 del porte de `@thyrox/tool-registry` (#234) — `Task.ts` e
 * `imageStore.ts`, más dos defectos que su porte destapó en OTROS paquetes.
 *
 * LOS DOS DEFECTOS, y los dos son de esta misma iniciativa:
 *
 *   1. `PastedContent` se portó INCOMPLETO en #260. La fuente declara siete
 *      campos y llegaron cuatro: faltan `mediaType`, `filename` y
 *      `sourcePath`. Lo destapó `imageStore`, que necesita `mediaType` para
 *      decidir la extensión del archivo. Un porte parcial de un TIPO no
 *      falla al portarse — falla cuando alguien lo consume, y es el defecto
 *      que `porte-completo-no-parcial.md` nombra.
 *
 *   2. Dos paquetes declaran un SUSTITUTO de `getClaudeConfigHomeDir`
 *      diciendo que `@thyrox/config/env/utils` no lo exporta. Medido: SÍ lo
 *      exporta, memoizado, desde `env/utils.ts:70`. Los dos bloqueos son
 *      estancados — la tercera vez en esta iniciativa. Y no son inocuos: el
 *      de `provider` DIVERGE del canónico en dos puntos, así que hoy dos
 *      copias del mismo símbolo responden distinto.
 *
 * MITAD ROJA: los casos fallan porque `Task.ts` e `imageStore.ts` no
 * existen, porque `PastedContent` no declara los tres campos, y porque los
 * dos sustitutos siguen en pie.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const arbol = () => mkdtempSync(join(tmpdir(), 'tr-t4-'))

describe('Task — la identidad de un trabajo y su estado inicial', () => {
  test('1. el prefijo del id declara el TIPO de trabajo', async () => {
    // El id se lee en logs, en rutas de archivo y en mensajes al usuario.
    // Sin prefijo habría que consultar el estado para saber si `x9k…` es un
    // shell o un agente.
    const { generateTaskId } = await import('../Task.ts')
    expect(generateTaskId('local_bash')).toMatch(/^b[0-9a-z]{8}$/)
    expect(generateTaskId('local_agent')).toMatch(/^a[0-9a-z]{8}$/)
    expect(generateTaskId('remote_agent')).toMatch(/^r[0-9a-z]{8}$/)
    expect(generateTaskId('in_process_teammate')).toMatch(/^t[0-9a-z]{8}$/)
    expect(generateTaskId('local_workflow')).toMatch(/^w[0-9a-z]{8}$/)
    expect(generateTaskId('monitor_mcp')).toMatch(/^m[0-9a-z]{8}$/)
    expect(generateTaskId('dream')).toMatch(/^d[0-9a-z]{8}$/)
  })

  test('2. un tipo desconocido cae a un prefijo, no a `undefined`', async () => {
    // El id se usa como nombre de archivo. Un `undefined` ahí produciría
    // `undefinedabc…` en disco en vez de fallar, que es peor.
    const { generateTaskId } = await import('../Task.ts')
    expect(generateTaskId('lo-que-nadie-declaro' as never)).toMatch(/^x[0-9a-z]{8}$/)
  })

  test('3. el alfabeto excluye mayúsculas — el id viaja por el sistema de archivos', async () => {
    // En un sistema de archivos que no distingue caja, dos ids que sólo
    // difieran en mayúsculas serían el mismo archivo. Con dígitos y
    // minúsculas, 36^8 combinaciones y ninguna colisión por caja.
    const { generateTaskId } = await import('../Task.ts')
    for (let i = 0; i < 100; i++) {
      expect(generateTaskId('local_bash')).toMatch(/^b[0-9a-z]{8}$/)
    }
  })

  test('4. hay variedad — el id no es adivinable', async () => {
    // Un id de trabajo predecible permite apuntar al archivo de salida de
    // otro trabajo. Con un generador fijo los tres casos de forma
    // anteriores pasarían igual: es el verde que no discrimina.
    const { generateTaskId } = await import('../Task.ts')
    const vistos = new Set<string>()
    for (let i = 0; i < 200; i++) vistos.add(generateTaskId('local_bash'))
    expect(vistos.size).toBe(200)
  })

  test('5. los tres estados terminales, y sólo esos tres', async () => {
    // `paused` NO es terminal: un workflow pausado se reanuda. Tratarlo
    // como terminal desalojaría del estado un trabajo que va a volver.
    const { isTerminalTaskStatus } = await import('../Task.ts')
    expect(isTerminalTaskStatus('completed')).toBe(true)
    expect(isTerminalTaskStatus('failed')).toBe(true)
    expect(isTerminalTaskStatus('killed')).toBe(true)
    expect(isTerminalTaskStatus('pending')).toBe(false)
    expect(isTerminalTaskStatus('running')).toBe(false)
    expect(isTerminalTaskStatus('paused')).toBe(false)
  })

  test('6. el estado inicial nace pendiente, sin notificar y sin fin', async () => {
    const { createTaskStateBase } = await import('../Task.ts')
    const antes = Date.now()
    const s = createTaskStateBase('b12345678', 'local_bash', 'compilar', 'tu-1')
    expect(s.status).toBe('pending')
    expect(s.notified).toBe(false)
    expect(s.endTime).toBeUndefined()
    expect(s.outputOffset).toBe(0)
    expect(s.toolUseId).toBe('tu-1')
    expect(s.startTime).toBeGreaterThanOrEqual(antes)
  })

  test('7. el archivo de salida se deriva del id, no se inventa', async () => {
    // Es el enlace entre el trabajo y su salida en disco. Si esto no
    // coincidiera con lo que el lector consulta, la salida existiría y
    // nadie la encontraría.
    const { createTaskStateBase } = await import('../Task.ts')
    const { getTaskOutputPath } = await import('@thyrox/storage/task/diskOutput.js')
    const s = createTaskStateBase('b99999999', 'local_bash', 'x')
    expect(s.outputFile).toBe(getTaskOutputPath('b99999999'))
  })
})

describe('PastedContent — el tipo que #260 portó incompleto', () => {
  test('8. declara los SIETE campos de la fuente, no cuatro', () => {
    // Un tipo estructural no falla al portarse de menos: falla cuando
    // alguien consume el campo ausente. Aquí el consumidor es `imageStore`,
    // que decide la extensión del archivo por `mediaType`.
    //
    // CÓMO SE MIDE UN TIPO, que se borra al compilar: se lee la
    // DECLARACIÓN del módulo portado. No se inventa una API de tiempo de
    // ejecución para poder medirlo — eso mediría el andamio en vez del
    // puerto. Es la misma técnica que usan los gates de porte.
    const declaracion = readFileSync(
      join(import.meta.dir, '../../../config/global/config.ts'),
      'utf8',
    )
    const bloque = declaracion.slice(declaracion.indexOf('export type PastedContent = {'))
    const campos = bloque
      .slice(0, bloque.indexOf('\n}'))
      .split('\n')
      .map(l => l.trim().match(/^(\w+)\??:/)?.[1])
      .filter(Boolean)
    expect(campos).toEqual([
      'id', 'type', 'content', 'mediaType', 'filename', 'dimensions', 'sourcePath',
    ])
  })
})

describe('getClaudeConfigHomeDir — un símbolo, no tres copias', () => {
  const previo = process.env.CLAUDE_CONFIG_DIR
  afterEach(() => {
    if (previo === undefined) delete process.env.CLAUDE_CONFIG_DIR
    else process.env.CLAUDE_CONFIG_DIR = previo
  })

  test('9. los dos sustitutos se retiran y reexportan el canónico', async () => {
    // La identidad de función es lo que se mide, no el valor: dos copias
    // que hoy devuelven lo mismo pueden divergir mañana, y ya divergen —
    // ver el caso 10.
    const canonico = (await import('@thyrox/config/env/utils')).getClaudeConfigHomeDir
    const enObservabilidad = (
      await import('@thyrox/local-observability/internal/pendingCrossPackageDeps.js')
    ).getClaudeConfigHomeDir
    const enProveedor = (
      await import('@thyrox/provider/internal/pendingCrossPackageDeps.js')
    ).getClaudeConfigHomeDir
    expect(enObservabilidad).toBe(canonico)
    expect(enProveedor).toBe(canonico)
  })

  test('10. el canónico normaliza a NFC — la copia de provider no lo hacía', async () => {
    // Una ruta con acento puede venir descompuesta (NFD) del entorno y
    // compuesta (NFC) del disco. Dos formas de la MISMA ruta que no
    // comparan iguales producen un directorio duplicado que nadie ve.
    const { getClaudeConfigHomeDir } = await import('@thyrox/config/env/utils')
    process.env.CLAUDE_CONFIG_DIR = '/tmp/config-nfd-é'
    expect(getClaudeConfigHomeDir()).toBe('/tmp/config-nfd-é'.normalize('NFC'))
  })
})

describe('imageStore — la imagen pegada, en disco y en el índice', () => {
  let base: string
  const previo = process.env.CLAUDE_CONFIG_DIR

  beforeEach(async () => {
    base = arbol()
    process.env.CLAUDE_CONFIG_DIR = base
    const { clearStoredImagePaths } = await import('../imageStore.ts')
    clearStoredImagePaths()
  })
  afterEach(() => {
    if (previo === undefined) delete process.env.CLAUDE_CONFIG_DIR
    else process.env.CLAUDE_CONFIG_DIR = previo
  })

  test('11. lo que no es imagen no entra al índice', async () => {
    const { cacheImagePath, getStoredImagePath } = await import('../imageStore.ts')
    expect(cacheImagePath({ id: 1, type: 'text', content: 'hola' })).toBeNull()
    expect(getStoredImagePath(1)).toBeNull()
  })

  test('12. la extensión sale del mediaType, y cae a png sin él', async () => {
    // Es el campo que #260 había dejado fuera del tipo. Sin él, un jpeg
    // aterrizaría en disco llamándose `.png`.
    const { cacheImagePath } = await import('../imageStore.ts')
    const jpg = cacheImagePath({ id: 2, type: 'image', content: '', mediaType: 'image/jpeg' })
    expect(jpg?.endsWith('2.jpeg')).toBe(true)
    const sinTipo = cacheImagePath({ id: 3, type: 'image', content: '' })
    expect(sinTipo?.endsWith('3.png')).toBe(true)
  })

  test('13. cachear la ruta NO toca el disco', async () => {
    // La separación existe para que pegar una imagen sea instantáneo: el
    // índice se puebla ya y la escritura va después.
    const { cacheImagePath } = await import('../imageStore.ts')
    const ruta = cacheImagePath({ id: 4, type: 'image', content: '' })!
    expect(existsSync(ruta)).toBe(false)
  })

  test('14. guardar escribe los bytes decodificados de base64', async () => {
    const { storeImage, getStoredImagePath } = await import('../imageStore.ts')
    const contenido = Buffer.from('bytes de prueba').toString('base64')
    const ruta = await storeImage({ id: 5, type: 'image', content: contenido, mediaType: 'image/png' })
    expect(ruta).not.toBeNull()
    expect(readFileSync(ruta!, 'utf8')).toBe('bytes de prueba')
    expect(getStoredImagePath(5)).toBe(ruta)
  })

  test('15. un fallo de escritura devuelve null, no lanza', async () => {
    // Pegar una imagen no puede tumbar el turno. El archivo se abre con
    // permisos 0600 en un directorio de sesión; si algo falla, se pierde la
    // imagen y sigue la conversación.
    const { storeImage } = await import('../imageStore.ts')
    process.env.CLAUDE_CONFIG_DIR = '/proc/no-se-puede-escribir-aqui'
    expect(await storeImage({ id: 6, type: 'image', content: '' })).toBeNull()
  })

  test('16. storeImages devuelve el mapa sólo de las imágenes', async () => {
    const { storeImages } = await import('../imageStore.ts')
    const b64 = Buffer.from('x').toString('base64')
    const mapa = await storeImages({
      7: { id: 7, type: 'image', content: b64 },
      8: { id: 8, type: 'text', content: 'no soy imagen' },
    })
    expect(mapa.size).toBe(1)
    expect(mapa.has(7)).toBe(true)
    expect(mapa.has(8)).toBe(false)
  })

  test('17. el índice tiene TOPE — desaloja el más viejo al llenarse', async () => {
    // Sin tope, una sesión larga que pegue imágenes crece sin límite en
    // memoria. El desalojo es por orden de inserción: `Map` lo conserva.
    const { cacheImagePath, getStoredImagePath } = await import('../imageStore.ts')
    for (let i = 0; i < 205; i++) {
      cacheImagePath({ id: i, type: 'image', content: '' })
    }
    expect(getStoredImagePath(0)).toBeNull()
    expect(getStoredImagePath(204)).not.toBeNull()
  })

  test('18. la limpieza borra las sesiones VIEJAS y respeta la actual', async () => {
    const { storeImage, cleanupOldImageCaches } = await import('../imageStore.ts')
    const b64 = Buffer.from('x').toString('base64')
    const actual = await storeImage({ id: 9, type: 'image', content: b64 })
    const vieja = join(base, 'image-cache', 'sesion-de-ayer')
    mkdirSync(vieja, { recursive: true })
    writeFileSync(join(vieja, '1.png'), 'x')
    await cleanupOldImageCaches()
    expect(existsSync(vieja)).toBe(false)
    expect(existsSync(actual!)).toBe(true)
  })

  test('19. sin directorio base la limpieza no lanza', async () => {
    const { cleanupOldImageCaches } = await import('../imageStore.ts')
    process.env.CLAUDE_CONFIG_DIR = join(arbol(), 'nunca-existio')
    await cleanupOldImageCaches()
  })
})
