/**
 * El instrumento que mide si un hecho sobrevive a una compactación real.
 *
 * La pregunta la dejó abierta `analisis-que-pasa-si-no-se-comprime-la-sesion`
 * como DESCONOCIDO declarado (tarea #21): el prompt de resumen garantiza nueve
 * secciones y el verbatim de las **directivas**; no garantiza que una cifra
 * medida a mitad de sesión vuelva sin deformarse.
 *
 * Los casos de abajo fijan la conducta del instrumento contra episodios
 * construidos a mano — es lo correcto aquí: un test que midiera el transcript
 * real compararía el instrumento consigo mismo y pasaría igual con cualquier
 * cifra que produjera.
 */
import { describe, expect, test } from 'bun:test'
import {
  analyzeCompactions, distinctiveNumbers, textOfLine, universeNumbers,
} from '../src/context/compactionFidelity.ts'

describe('distinctiveNumbers — qué cuenta como un hecho rastreable', () => {
  test('exige tres dígitos: un número corto reaparece por azar', () => {
    expect([...distinctiveNumbers('van 42 casos y 7 fallos')]).toEqual([])
    expect([...distinctiveNumbers('van 420 casos')]).toEqual(['420'])
  })

  test('normaliza el separador de millar y CONSERVA el punto decimal', () => {
    // `126 029` y `126,029` son la misma cifra escrita de dos maneras; `4.24`
    // es otra distinta. Colapsar las tres perdería la que discrimina.
    expect(distinctiveNumbers('126 029 tokens').has('126029')).toBe(true)
    expect(distinctiveNumbers('126,029 tokens').has('126029')).toBe(true)
    expect(distinctiveNumbers('un factor de 4.24').has('4.24')).toBe(true)
  })

  test('una lista {408,429,500} son cifras separadas, no un número de 18 dígitos (#38)', () => {
    // El separador de millar y el de lista son el mismo carácter. Dentro de una
    // colección, la coma NO agrupa millares. Medido: 1 de 256, la única cifra
    // sin antecedente que quedaba en la corrida 2026-09-02.
    const s = distinctiveNumbers('los códigos {408,429,500,502,503,529}')
    expect(s.has('408429500502503529')).toBe(false)
    expect(s.has('408')).toBe(true)
    expect(s.has('529')).toBe(true)
    // CONTROL: un millar de verdad, fuera de una colección, SÍ se normaliza —
    // el fix no debe romper `126,029`.
    expect(distinctiveNumbers('126,029 tokens').has('126029')).toBe(true)
    expect(distinctiveNumbers('126 029 tokens').has('126029')).toBe(true)
    // una lista en corchetes también
    const c = distinctiveNumbers('errores [400,404,500]')
    expect(c.has('400404500')).toBe(false)
    expect(c.has('404')).toBe(true)
  })

  test('una cifra pegada a un identificador NO es una cifra', () => {
    // Los tres falsos positivos que la primera corrida destapó, cada uno de
    // una forma distinta: el hash de git, el ordinal de un hallazgo y el
    // sufijo de un identificador de modelo. Ninguno es una medición.
    expect(distinctiveNumbers('el commit `366c04b2` cierra').size).toBe(0)
    expect(distinctiveNumbers('registrado como H-DOCS-1005').size).toBe(0)
    expect(distinctiveNumbers('claude-fable-5-1 con 194 turnos').has('1194')).toBe(false)
    expect(distinctiveNumbers('(rewritten, T-008/025/026/027)').size).toBe(0)
    expect(distinctiveNumbers('a las 09:50:48.599 recargó').size).toBe(0)
  })

  test('pero una cifra normal junto a puntuación SÍ lo es', () => {
    // El control del caso anterior: si la guarda fuera demasiado ancha, el
    // instrumento dejaría de ver casi todo y publicaría ceros tranquilizadores.
    expect(distinctiveNumbers('(4683 archivos)').has('4683')).toBe(true)
    expect(distinctiveNumbers('quedó en 5371, verde').has('5371')).toBe(true)
    expect(distinctiveNumbers('980000.').has('980000')).toBe(true)
  })

  test('el mismo número dos veces cuenta una vez', () => {
    expect([...distinctiveNumbers('980000 y otra vez 980000')]).toEqual(['980000'])
  })
})

describe('textOfLine — el universo de origen es ANCHO', () => {
  test('lee texto, pensamiento, resultado de herramienta y adjunto', () => {
    // Un hecho puede entrar al contexto por cualquiera de las cuatro vías. Un
    // instrumento que sólo mirara `text` marcaría como fabricado todo lo que
    // vino de una salida de comando — el falso positivo más caro.
    const t = textOfLine({
      type: 'assistant',
      message: { content: [
        { type: 'text', text: 'medido 1111' },
        { type: 'thinking', thinking: 'creo 2222' },
      ] },
      toolUseResult: { stdout: '3333 archivos' },
      attachment: { content: 'adjunto 4444' },
    } as never)
    for (const n of ['1111', '2222', '3333', '4444']) expect(t).toContain(n)
  })
})

describe('analyzeCompactions — supervivencia y fabricación', () => {
  const linea = (texto: string, extra: Record<string, unknown> = {}) =>
    ({ type: 'assistant', message: { content: [{ type: 'text', text: texto }] }, ...extra }) as never
  const frontera = { type: 'system', subtype: 'compact_boundary' } as never
  const resumen = (texto: string) =>
    ({ type: 'user', isCompactSummary: true, message: { content: [{ type: 'text', text: texto }] } }) as never

  test('un resumen sin fuente en el archivo NO se mide — se declara omitido', () => {
    // Es el caso del primer resumen de toda sesión reanudada: su fuente vivió
    // en otro archivo. Contarlo como «0 % de supervivencia» sería leer la
    // ausencia del instrumento como ausencia del fenómeno.
    const r = analyzeCompactions([frontera, resumen('nada 1234')])
    expect(r.episodes).toHaveLength(0)
    expect(r.skipped).toBe(1)
  })

  test('una cifra del origen que reaparece en el resumen SOBREVIVE', () => {
    const r = analyzeCompactions([
      linea('el gate mide 4683 archivos'), frontera, resumen('mide 4683 archivos'),
    ])
    expect(r.episodes[0]!.survived).toEqual(['4683'])
    expect(r.episodes[0]!.fabricated).toEqual([])
  })

  test('una cifra que el resumen inventa NO tiene antecedente y se marca', () => {
    const r = analyzeCompactions([
      linea('el gate mide 4683 archivos'), frontera, resumen('mide 9999 archivos'),
    ])
    expect(r.episodes[0]!.fabricated).toEqual(['9999'])
  })

  test('la fabricación se mide contra TODO lo anterior, no contra el tramo', () => {
    // Un resumen encadena: arrastra hechos de resúmenes previos, que ya no
    // están en el tramo entre las dos últimas fronteras. Medir por tramo
    // marcaría esos arrastres como fabricados — y serían falsos positivos.
    const r = analyzeCompactions([
      linea('primer tramo: 5555'), frontera, resumen('5555'),
      linea('segundo tramo: 7777'), frontera, resumen('5555 y 7777'),
    ])
    expect(r.episodes).toHaveLength(2)
    expect(r.episodes[1]!.fabricated).toEqual([])
  })

  test('cada cifra fabricada trae su contexto para poder juzgarla', () => {
    const r = analyzeCompactions([
      linea('origen 4683'), frontera,
      resumen('la suite quedó en 9999 casos verdes tras el barrido'),
    ])
    expect(r.episodes[0]!.context['9999']).toContain('9999')
    expect(r.episodes[0]!.context['9999']!.length).toBeLessThanOrEqual(90)
  })

  test('CONTROL — el instrumento distingue los dos sentidos, no sólo uno', () => {
    // Sin este control, un instrumento que devolviera siempre `[]` en
    // `fabricated` pasaría todos los casos de supervivencia de arriba.
    const r = analyzeCompactions([
      linea('origen 1234 y 5678'), frontera, resumen('1234 y 4321'),
    ])
    expect(r.episodes[0]!.survived).toEqual(['1234'])
    expect(r.episodes[0]!.fabricated).toEqual(['4321'])
    expect(r.episodes[0]!.dropped).toEqual(['5678'])
  })
})

/**
 * Los dos defectos que la medición de #21 destapó — y por qué importan.
 *
 * Corrida del 2026-09-02T20:06:33 sobre 9420 líneas: **6 cifras del resumen
 * sin antecedente**, presentadas como fabricadas. Verificadas una a una
 * contra la fuente, **las seis existían**. Un instrumento que dice
 * «fabricada» sobre algo que la fuente contiene mide el fenómeno equivocado:
 * es el sub-patrón D de `metrica-decide-la-conclusion.md` con el signo
 * invertido — no un verde que no discrimina, un rojo que no discrimina.
 */
describe('#21 — los falsos positivos medidos contra la fuente', () => {
  const linea = (texto: string) =>
    ({ type: 'assistant', message: { content: [{ type: 'text', text: texto }] } }) as never
  const frontera = { type: 'system', subtype: 'compact_boundary' } as never
  const resumen = (texto: string) =>
    ({ type: 'user', isCompactSummary: true, message: { content: [{ type: 'text', text: texto }] } }) as never

  test('D1 — el REDONDEO no es fabricación: 15.6008 en la fuente, 15.60 en el resumen', () => {
    // Medido: la fuente dice `usd_fable_1h: 15.6008` y el resumen escribe
    // «15.60 USD». Cadenas distintas, misma cifra. Un resumen que redondea
    // está haciendo su trabajo, no inventando.
    const r = analyzeCompactions([
      linea('el turno costo usd_fable_1h: 15.6008 y usd_si_opus_reescribe: 7.7907'),
      frontera,
      resumen('el turno costo 15.60 USD, y con opus habrian sido 7.79 USD'),
    ])
    expect(r.episodes[0]!.fabricated).toEqual([])
  })

  test('D1 — pero un dígito DISTINTO sí es fabricación: el control', () => {
    // Sin este caso el arreglo anterior no probaría nada: aceptar cualquier
    // prefijo dejaría pasar toda cifra que empiece igual.
    const r = analyzeCompactions([
      linea('el turno costo 15.6008'), frontera, resumen('el turno costo 15.71 y ademas 99.99'),
    ])
    expect([...r.episodes[0]!.fabricated].sort()).toEqual(['15.71', '99.99'])
  })

  test('D2 — la guarda es ASIMÉTRICA: `H-DOCS-1004` en la fuente, `1004` suelto en el resumen', () => {
    // La misma guarda que evita el falso positivo en el resumen lo CREA en el
    // universo: excluye `1004` de la fuente por ir pegado a un identificador,
    // y luego no lo encuentra cuando el resumen lo cita suelto.
    const r = analyzeCompactions([
      linea('se registro el hallazgo H-DOCS-1004 y la tarea T-019'),
      frontera,
      resumen('Max H-DOCS id now 1004. La 019 quedo sobre-declarada.'),
    ])
    expect(r.episodes[0]!.fabricated).toEqual([])
  })

  test('D2-bis — la asimetría es de los DOS lados: `1127:` de un `grep -n`', () => {
    // Medido en la corrida: el resumen cita «lines 1127–1140» y la fuente trae
    // `1127:{"timestamp"…` — la salida de un `grep -n`. El literal existe; la
    // guarda derecha lo excluía del universo por los dos puntos.
    const r = analyzeCompactions([
      linea('1127:{"timestamp":"2026-09-02"} settings_load_started'),
      frontera,
      resumen('lines 1127-1140 show settings_load_started'),
    ])
    expect(r.episodes[0]!.fabricated).toEqual([])
  })

  test('D2-bis — pero la hora sigue fuera: el `:` a la IZQUIERDA no se relaja', () => {
    // El control que separa las dos guardas: relajar la derecha admite el
    // prefijo de linea; relajar la izquierda admitiria `09:50:48` como tres
    // cifras, que es ruido puro.
    expect(distinctiveNumbers('a las 09:50:48.599 recargó').size).toBe(0)
    expect(universeNumbers('a las 09:50:48.599 recargó').size).toBe(0)
  })

  test('D2 — el filtro estricto sigue aplicándose al RESUMEN: el control', () => {
    // El universo se ensancha; lo que se PREGUNTA no. Un hash del resumen
    // sigue sin contar como cifra, o el instrumento se llenaría de ruido.
    const r = analyzeCompactions([
      linea('el gate midio 4683 archivos'),
      frontera,
      resumen('el commit 366c04b2 y el hallazgo H-DOCS-1005 y la hora 09:50:48.599'),
    ])
    expect(r.episodes[0]!.fabricated).toEqual([])
  })
})
