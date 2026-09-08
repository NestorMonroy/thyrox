/**
 * Tramo 3 del porte de `@thyrox/tool-registry` (#234) — los tres módulos de
 * raíz con MECANISMO, no con datos: el formateo de errores de herramienta,
 * el escáner de contexto de edición, y el generador de slug.
 *
 * POR QUÉ ESTOS TRES Y NO LOS OTROS CINCO que la re-medición del tramo 2
 * declaró portables. El criterio no es el tamaño sino qué compra el porte,
 * y aquí se declara módulo a módulo en vez de omitirlo en silencio
 * (`porte-completo-no-parcial.md`):
 *
 *   toolErrors ......... SÍ. Es lo que el modelo LEE cuando una herramienta
 *                        falla; un formateo pobre gasta contexto y no dice
 *                        qué arreglar.
 *   readEditContext .... SÍ. El escáner por trozos con solape, que es la
 *                        única forma de encontrar una coincidencia a
 *                        caballo entre dos lecturas sin cargar el archivo.
 *   words .............. SÍ, y cierra un sustituto DECLARADO: `plans.ts`
 *                        de `@thyrox/storage` reimplementó `generateWordSlug`
 *                        localmente con `Math.random()`. Portarlo aquí le
 *                        devuelve su hogar y su aleatoriedad criptográfica.
 *   undercover ......... NO, y no es olvido. Sus cuatro funciones están
 *                        cerradas tras `USER_TYPE === 'ant'`, una bandera
 *                        de compilación de la fuente que aquí NUNCA es
 *                        cierta: el módulo entero se reduce a `return false`
 *                        y `return ''`. Y su bloque de instrucciones es
 *                        política interna de otra organización, que no
 *                        gobierna este árbol.
 *   embeddedRgExtractor  NO por ahora. Depende de `globalThis.__CCB_SANDBOX_
 *                        RG_PATH__`, que el empaquetador de la fuente
 *                        inyecta con `with { type: "file" }`. Sin ese paso
 *                        de compilación el módulo carga y devuelve `null`
 *                        siempre — inerte, no roto. Se porta el día que
 *                        haya empaquetado propio.
 *   claudeCodeHints .... NO por ahora: mide señales del producto de la
 *                        fuente, no del nuestro.
 *   Task / imageStore .. NO en este tramo: los dos cruzan a `@thyrox/storage`
 *                        y a `app-host`, y merecen su propia medición.
 *
 * MITAD ROJA: los casos fallan porque los tres módulos no existen.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import { AbortError, ShellError } from '@thyrox/local-observability/errorHelpers.js'
import { INTERRUPT_MESSAGE_FOR_TOOL_USE } from '@thyrox/agent/messages.js'

const arbol = () => mkdtempSync(join(tmpdir(), 'tr-scan-'))

function escribir(contenido: string): string {
  const ruta = join(arbol(), 'archivo.txt')
  writeFileSync(ruta, contenido)
  return ruta
}

describe('toolErrors — lo que el modelo lee cuando una herramienta falla', () => {
  test('1. un abort sin mensaje cae al centinela de interrupción', async () => {
    // La distinción importa: «te interrumpieron» y «falló» piden conductas
    // opuestas del modelo. Un abort vacío formateado como cadena vacía se
    // leería como fallo mudo.
    const { formatError } = await import('../toolErrors.ts')
    expect(formatError(new AbortError())).toBe(INTERRUPT_MESSAGE_FOR_TOOL_USE)
    expect(formatError(new AbortError('cancelado por el usuario'))).toBe(
      'cancelado por el usuario',
    )
  })

  test('2. lo que no es Error se convierte, no se traga', async () => {
    const { formatError } = await import('../toolErrors.ts')
    expect(formatError('texto suelto')).toBe('texto suelto')
    expect(formatError(42)).toBe('42')
  })

  test('3. un ShellError publica su código, su stderr y su stdout', async () => {
    // Los tres, y en ese orden. Con sólo el mensaje —«Shell command
    // failed»— el modelo no tiene con qué corregir el comando.
    const { formatError } = await import('../toolErrors.ts')
    const salida = formatError(new ShellError('la salida', 'el error', 127, false))
    expect(salida).toContain('Exit code 127')
    expect(salida).toContain('el error')
    expect(salida).toContain('la salida')
  })

  test('4. un ShellError interrumpido lo declara; uno que falló, no', async () => {
    const { formatError } = await import('../toolErrors.ts')
    expect(formatError(new ShellError('', '', 130, true))).toContain(
      INTERRUPT_MESSAGE_FOR_TOOL_USE,
    )
    expect(formatError(new ShellError('x', '', 1, false))).not.toContain(
      INTERRUPT_MESSAGE_FOR_TOOL_USE,
    )
  })

  test('5. un error sin nada que decir NO devuelve la cadena vacía', async () => {
    // Una cadena vacía en el resultado de herramienta es indistinguible de
    // «funcionó y no imprimió nada». Ese es el fallo silencioso que esta
    // rama cierra.
    const { formatError } = await import('../toolErrors.ts')
    expect(formatError(new ShellError('', '', 0, false))).toContain('Exit code 0')
    expect(formatError(new Error(''))).toBe('Command failed with no output')
  })

  test('6. un error gigante se trunca por LOS DOS EXTREMOS', async () => {
    // Truncar sólo el final perdería el resumen del fallo, que muchas
    // herramientas imprimen al terminar; truncar sólo el principio
    // perdería la causa. Se conservan 5000 de cada lado y se declara
    // cuántos caracteres se fueron.
    const { formatError } = await import('../toolErrors.ts')
    const largo = 'A'.repeat(4000) + 'MEDIO' + 'B'.repeat(9000)
    const salida = formatError(new Error(largo))
    expect(salida.startsWith('A'.repeat(100))).toBe(true)
    expect(salida.endsWith('B'.repeat(100))).toBe(true)
    expect(salida).toContain('characters truncated')
    expect(salida).not.toContain('MEDIO')
    expect(salida.length).toBeLessThan(largo.length)
  })

  test('7. justo en el umbral NO se trunca', async () => {
    const { formatError } = await import('../toolErrors.ts')
    const justo = 'x'.repeat(10_000)
    expect(formatError(new Error(justo))).toBe(justo)
  })

  test('8. `stderr`/`stdout` colgados de un Error corriente también viajan', async () => {
    // Es la forma que deja `child_process`: un `Error` con dos campos
    // extra. Leer sólo `.message` perdería toda la salida del proceso.
    const { formatError } = await import('../toolErrors.ts')
    const e = Object.assign(new Error('falló'), { stderr: 'en stderr', stdout: 'en stdout' })
    const salida = formatError(e)
    expect(salida).toContain('falló')
    expect(salida).toContain('en stderr')
    expect(salida).toContain('en stdout')
  })
})

describe('formatZodValidationError — el error de esquema, dicho para que se pueda corregir', () => {
  const esquema = z.strictObject({
    file_path: z.string(),
    limit: z.number().optional(),
    todos: z.array(z.object({ activeForm: z.string() })).optional(),
  })

  function fallo(entrada: unknown) {
    const r = esquema.safeParse(entrada)
    if (r.success) throw new Error('el esquema debería haber fallado')
    return r.error
  }

  test('9. un parámetro AUSENTE se nombra como ausente', async () => {
    const { formatZodValidationError } = await import('../toolErrors.ts')
    const m = formatZodValidationError('Read', fallo({}))
    expect(m).toContain('Read failed')
    expect(m).toContain('`file_path`')
    expect(m).toContain('is missing')
  })

  test('10. un parámetro INVENTADO se nombra como inesperado', async () => {
    // Es la corrección más barata que el modelo puede hacer y la que más
    // se repite: quitó o inventó una clave. Sin nombrarla, reintenta a
    // ciegas.
    const { formatZodValidationError } = await import('../toolErrors.ts')
    const m = formatZodValidationError('Read', fallo({ file_path: '/a', ruta: '/b' }))
    expect(m).toContain('`ruta`')
    expect(m).toContain('unexpected parameter')
  })

  test('11. un tipo equivocado dice el esperado Y el recibido', async () => {
    const { formatZodValidationError } = await import('../toolErrors.ts')
    const m = formatZodValidationError('Read', fallo({ file_path: '/a', limit: 'diez' }))
    expect(m).toContain('`limit`')
    expect(m).toContain('number')
    expect(m).toContain('string')
  })

  test('12. la ruta anidada se escribe como se ESCRIBIRÍA en el JSON', async () => {
    // `todos[0].activeForm`, no `todos,0,activeForm`. El modelo tiene que
    // poder copiar la ruta al reintento.
    const { formatZodValidationError } = await import('../toolErrors.ts')
    const m = formatZodValidationError('TodoWrite', fallo({ file_path: '/a', todos: [{}] }))
    expect(m).toContain('todos[0].activeForm')
  })

  test('13. varios problemas se dicen todos, y el plural concuerda', async () => {
    const { formatZodValidationError } = await import('../toolErrors.ts')
    const varios = formatZodValidationError('Read', fallo({ limit: 'diez', ruta: 1 }))
    expect(varios).toContain('issues')
    const uno = formatZodValidationError('Read', fallo({}))
    expect(uno).toContain('issue')
    expect(uno).not.toContain('issues')
  })

  test('14. sin ninguna forma reconocida se devuelve el mensaje de zod, no una vacía', async () => {
    // El respaldo es lo que impide que un problema de esquema que la
    // fuente no clasifica llegue al modelo como cadena vacía.
    const { formatZodValidationError } = await import('../toolErrors.ts')
    const r = z.string().min(5).safeParse('ab')
    if (r.success) throw new Error('debería fallar')
    expect(formatZodValidationError('X', r.error).length).toBeGreaterThan(0)
  })
})

describe('readEditContext — encontrar una aguja sin cargar el pajar', () => {
  test('15. devuelve el trozo con su número de línea 1-basado', async () => {
    const { readEditContext } = await import('../readEditContext.ts')
    const ruta = escribir('l1\nl2\nl3\nAGUJA\nl5\nl6\nl7\n')
    const r = await readEditContext(ruta, 'AGUJA', 1)
    expect(r?.content).toContain('AGUJA')
    expect(r?.content).toContain('l3')
    expect(r?.content).toContain('l5')
    expect(r?.content).not.toContain('l1')
    expect(r?.lineOffset).toBe(3)
    expect(r?.truncated).toBe(false)
  })

  test('16. un archivo ausente devuelve null, no lanza', async () => {
    const { readEditContext } = await import('../readEditContext.ts')
    expect(await readEditContext(join(arbol(), 'no-existe'), 'x')).toBeNull()
  })

  test('17. una aguja que NO está devuelve contenido vacío sin truncar', async () => {
    // `truncated` distingue «no está» de «no cabía»: con un solo booleano
    // de fallo, el llamador no sabría si reintentar con más presupuesto.
    const { readEditContext } = await import('../readEditContext.ts')
    const r = await readEditContext(escribir('sólo esto\n'), 'AGUJA')
    expect(r?.content).toBe('')
    expect(r?.truncated).toBe(false)
  })

  test('18. la aguja A CABALLO entre dos trozos SÍ se encuentra', async () => {
    // Es la razón de ser del solape, y el caso que un escáner ingenuo
    // pierde EN SILENCIO: devolvería «no está» sobre un archivo donde sí
    // está.
    const { readEditContext, CHUNK_SIZE } = await import('../readEditContext.ts')
    const relleno = 'z'.repeat(CHUNK_SIZE - 4)
    const ruta = escribir(relleno + 'AGUJA-LARGA\ncola\n')
    const r = await readEditContext(ruta, 'AGUJA-LARGA', 1)
    expect(r?.content).toContain('AGUJA-LARGA')
    expect(r?.truncated).toBe(false)
  })

  test('19. una aguja en LF encuentra un archivo en CRLF', async () => {
    // El modelo escribe LF; el archivo del usuario puede venir en CRLF.
    // Sin la segunda pasada, toda edición multilínea sobre un archivo de
    // Windows fallaría por «no encontrado».
    const { readEditContext } = await import('../readEditContext.ts')
    const ruta = escribir('a\r\nprimera\r\nsegunda\r\nb\r\n')
    const r = await readEditContext(ruta, 'primera\nsegunda', 1)
    expect(r?.content).toContain('primera')
    expect(r?.content).toContain('segunda')
    // Y lo devuelto ya viene normalizado a LF: el llamador compara contra
    // lo que el modelo escribió, no contra lo que el disco guarda.
    expect(r?.content.includes('\r')).toBe(false)
  })

  test('20. una aguja vacía no escanea nada', async () => {
    const { readEditContext } = await import('../readEditContext.ts')
    const r = await readEditContext(escribir('lo que sea\n'), '')
    expect(r).toEqual({ content: '', lineOffset: 1, truncated: false })
  })

  test('21. readCapped devuelve el archivo entero, normalizado', async () => {
    const { readCapped, openForScan } = await import('../readEditContext.ts')
    const h = await openForScan(escribir('uno\r\ndos\r\n'))
    try {
      expect(await readCapped(h!)).toBe('uno\ndos\n')
    } finally {
      await h!.close()
    }
  })

  test('22. openForScan devuelve null sólo ante un archivo ausente', async () => {
    const { openForScan } = await import('../readEditContext.ts')
    expect(await openForScan(join(arbol(), 'nada'))).toBeNull()
    const h = await openForScan(escribir('x'))
    expect(h).not.toBeNull()
    await h!.close()
  })

  test('23. lineOffset cuenta las líneas DESCARTADAS, no sólo las del búfer', async () => {
    // El contador tiene que sobrevivir al desplazamiento del solape: si se
    // reiniciara con cada trozo, el número de línea de una coincidencia
    // tardía sería el del trozo, no el del archivo. Un error así no rompe
    // nada — devuelve un número plausible y equivocado.
    const { readEditContext, CHUNK_SIZE } = await import('../readEditContext.ts')
    const lineas = Math.ceil(CHUNK_SIZE / 4) + 10
    const ruta = escribir('abc\n'.repeat(lineas) + 'AGUJA\n')
    const r = await readEditContext(ruta, 'AGUJA', 0)
    expect(r?.lineOffset).toBe(lineas + 1)
  })
})

describe('words — el slug de plan, con aleatoriedad criptográfica', () => {
  test('24. la forma larga es adjetivo-verbo-sustantivo', async () => {
    const { generateWordSlug } = await import('../words.ts')
    for (let i = 0; i < 50; i++) {
      expect(generateWordSlug()).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/)
    }
  })

  test('25. la forma corta es adjetivo-sustantivo, sin verbo', async () => {
    const { generateShortWordSlug } = await import('../words.ts')
    for (let i = 0; i < 50; i++) {
      expect(generateShortWordSlug()).toMatch(/^[a-z]+-[a-z]+$/)
    }
  })

  test('26. hay variedad de verdad — no devuelve siempre lo mismo', async () => {
    // Un `pickRandom` roto que devolviera el índice 0 pasaría los dos
    // casos de forma anteriores sin que nada lo delatara: es el verde que
    // no discrimina.
    const { generateWordSlug } = await import('../words.ts')
    const vistos = new Set<string>()
    for (let i = 0; i < 200; i++) vistos.add(generateWordSlug())
    expect(vistos.size).toBeGreaterThan(150)
  })

  test('27. las tres listas aportan, no sólo una', async () => {
    // Se mide cada posición por separado: si sólo el adjetivo variara, el
    // conteo global de arriba seguiría siendo alto y el defecto pasaría.
    const { generateWordSlug } = await import('../words.ts')
    const porPosicion: Set<string>[] = [new Set(), new Set(), new Set()]
    for (let i = 0; i < 300; i++) {
      generateWordSlug().split('-').forEach((p, i) => porPosicion[i]!.add(p))
    }
    for (const s of porPosicion) expect(s.size).toBeGreaterThan(5)
  })

  test('28. ninguna lista está vacía ni tiene duplicados', async () => {
    // Un duplicado no rompe nada visible: sólo sesga la distribución, y
    // ninguna de las aserciones anteriores lo vería.
    const { ADJECTIVES, NOUNS, VERBS } = await import('../words.ts')
    for (const lista of [ADJECTIVES, NOUNS, VERBS]) {
      expect(lista.length).toBeGreaterThan(0)
      expect(new Set(lista).size).toBe(lista.length)
      for (const palabra of lista) expect(palabra).toMatch(/^[a-z]+$/)
    }
  })
})
