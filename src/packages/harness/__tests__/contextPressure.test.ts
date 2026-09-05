/**
 * El bucle actúa por PRESIÓN de contexto, no por conteo de resultados.
 *
 * Porte de la conducta que el ejecutable 2.1.258 instrumenta como
 * `tengu_time_based_microcompact` con `trigger: S("context_hint")` y la traza
 * `[KEEP-RECENT MC] context_hint trigger, cleared N tool results`, más el
 * nivel `blocked` de `fZe` (`chunk-vw215j9f.js`).
 *
 * Cada aserción cita el símbolo o la cadena del ejecutable de la que sale.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'
import { THRASHING_MESSAGE } from '../src/context/contextLevel.ts'
import { CLEARED_TABLE } from '../src/observability/clearedResults.ts'
import { transcriptShapeOf } from '../src/observability/transcriptShape.ts'
import { runLoop, streamLoop } from '../src/loop.ts'
import { Transcript } from '../src/transcript.ts'
import { RecordedProvider } from '../src/provider/recorded.ts'
import { CORE_TOOLS } from '../src/tools/registry.ts'
import type { AssistantTurn, HarnessEvent, Message } from '../src/types.ts'

const dir = () => mkdtempSync(join(tmpdir(), 'presion-'))
const uso = { input_tokens: 10, output_tokens: 5, cache_creation_input_tokens: 0, cache_read_input_tokens: 100 }
const texto = (t: string): AssistantTurn => ({
  id: `m${Math.random()}`, model: 'claude-opus-5', stop_reason: 'end_turn',
  content: [{ type: 'text', text: t }], usage: uso,
})
const base = (d: string) => ({
  cwd: d, model: 'claude-opus-5', system: 'eres un harness', tools: CORE_TOOLS, transcriptDir: d,
})

/** Un mensaje cuyo texto ocupa aproximadamente `tokens` del estimador. */
const relleno = (tokens: number): Message => ({
  role: 'user', content: [{ type: 'text', text: 'x'.repeat(tokens * 4) }],
})

/**
 * Siembra un historial por el camino REAL del harness: un transcript que se
 * reanuda. Inventar una opción `messages` sólo para el test daría una vía que
 * producción no tiene, y entonces el test mediría otra cosa.
 */
function sembrar(d: string, mensajes: Message[]): string {
  const id = `s-${Math.random().toString(36).slice(2)}`
  const tr = new Transcript(join(d, `${id}.jsonl`), id)
  for (const m of mensajes) {
    if (m.role === 'user') tr.appendUser(m.content)
    else tr.appendAssistant({ id: `m-${id}`, model: 'claude-opus-5', content: m.content })
  }
  return id
}

afterEach(() => {
  delete process.env.DISABLE_COMPACT
  delete process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE
})

describe('el nivel blocked para el bucle ANTES de llamar al API', () => {
  test('no se emite la petición y el bucle lo dice', async () => {
    const d = dir()
    // El modelo de ventana chica es el que hace medible el tope: `blocked`
    // NO lo mueve el override de porcentaje —`x = o-3000` se calcula sobre la
    // ventana efectiva, no sobre el umbral—, así que bajarlo no acerca el muro.
    // `claude-haiku-4-5` da 180 000 efectivos y bloquea desde 177 000.
    const p = new RecordedProvider([texto('no deberia llegar')])
    const r = await runLoop({
      ...base(d), model: 'claude-haiku-4-5', prompt: 'hola', provider: p,
      resume: sembrar(d, [relleno(178_000)]),
    })
    // El API rechazaria con `input length and \`max_tokens\` exceed context
    // limit`; el nivel existe para llegar antes que el servidor.
    expect(r.stop).toBe('context_blocked')
    expect(p.requests.length).toBe(0)
  })

  test('sin el nivel blocked el bucle llama igual — el control', async () => {
    const d = dir()
    const p = new RecordedProvider([texto('llega')])
    const r = await runLoop({ ...base(d), prompt: 'hola', provider: p })
    expect(r.stop).toBe('end_turn')
    expect(p.requests.length).toBe(1)
  })
})

describe('la microcompactación dispara por presión, no por conteo', () => {
  test('en nivel warn se microcompacta sin declarar microcompactAfter', async () => {
    const d = dir()
    // `warn` empieza en `umbral - 20000`. Con el override al 4 % de 980 000 el
    // umbral queda en 39 200, así que ~25 000 tokens caen en warn.
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '4'
    const historial: Message[] = [
      { role: 'assistant', content: [{ type: 'tool_use', id: 'tu_v', name: 'Read', input: { file_path: '/x' } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu_v', content: 'y'.repeat(100_000) }] },
      relleno(1_000),
    ]
    const eventos: string[] = []
    for await (const e of streamLoop({
      ...base(d), prompt: 'sigue', provider: new RecordedProvider([texto('ok')]),
      resume: sembrar(d, historial), context: { keepToolResults: 0 },
    })) {
      if (e.type === 'compaction') eventos.push(`${e.kind}:${e.trigger ?? ''}`)
    }
    expect(eventos).toContain('micro:context_hint')
  })

  test('en nivel ok NO se microcompacta aunque haya resultados viejos', async () => {
    const d = dir()
    const historial: Message[] = [
      { role: 'assistant', content: [{ type: 'tool_use', id: 'tu_a', name: 'Read', input: { file_path: '/x' } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu_a', content: 'corto' }] },
    ]
    const eventos: unknown[] = []
    for await (const e of streamLoop({
      ...base(d), prompt: 'sigue', provider: new RecordedProvider([texto('ok')]),
      resume: sembrar(d, historial), context: { keepToolResults: 0 },
    })) {
      if (e.type === 'compaction') eventos.push(e)
    }
    // Dos resultados pequeños no mueven la aguja del `cache_read`: el conteo
    // es ciego al tamaño, que es lo unico que cuesta.
    expect(eventos.length).toBe(0)
  })

  test('microcompactAfter sigue funcionando como override explícito', async () => {
    const d = dir()
    const historial: Message[] = [
      { role: 'assistant', content: [{ type: 'tool_use', id: 'tu_b', name: 'Read', input: { file_path: '/x' } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu_b', content: 'corto' }] },
    ]
    const eventos: string[] = []
    for await (const e of streamLoop({
      ...base(d), prompt: 'sigue', provider: new RecordedProvider([texto('ok')]),
      resume: sembrar(d, historial),
      // El piso se declara en 0: este caso mide que el override por CONTEO
      // sigue existiendo, no si liberar poco vale la pena.
      context: { microcompactAfter: 0, keepToolResults: 0, minFreedTokens: 0 },
    })) {
      if (e.type === 'compaction') eventos.push(`${e.kind}:${e.trigger ?? ''}`)
    }
    expect(eventos).toContain('micro:count')
  })
})

describe('el guard antithrashing corta el bucle a la tercera recarga rápida', () => {
  test('tres compactaciones dentro de la ventana y el bucle para', async () => {
    const d = dir()
    // Umbral al 1 % de 980 000 → 9 800: cualquier historial por encima queda
    // en `compact` turno tras turno, que es la condición del guard.
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '1'
    // El bucle sólo llega al cuarto turno si el modelo pide herramienta: un
    // `end_turn` lo cierra antes y el guard no se llega a consultar.
    const pide = (i: number): AssistantTurn => ({
      id: `m${i}`, model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
      content: [{ type: 'tool_use', id: `tu${i}`, name: 'Bash', input: { command: 'echo sigue' } }],
    })
    const p = new RecordedProvider([pide(1), pide(2), pide(3), pide(4), texto('fin')])
    // Un resumen que no reduce nada reproduce exactamente la condición que el
    // ejecutable diagnostica: el contexto vuelve al límite enseguida.
    const r = await runLoop({
      ...base(d), prompt: 'hola', provider: p,
      resume: sembrar(d, [relleno(20_000)]),
      context: { summarize: async () => 'z'.repeat(80_000), keepMessages: 1 },
      maxTurns: 8,
    })
    expect(r.stop).toBe('compaction_thrashing')
    // El mensaje se porta verbatim porque nombra la causa —una lectura
    // demasiado grande—, no el síntoma.
    expect(r.lastText).toBe(THRASHING_MESSAGE)
  })

  test('una compactación cada muchos turnos NO dispara el guard — el control', async () => {
    const d = dir()
    const pide = (i: number): AssistantTurn => ({
      id: `m${i}`, model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
      content: [{ type: 'tool_use', id: `tu${i}`, name: 'Bash', input: { command: 'echo sigue' } }],
    })
    // Sin override el umbral queda en 967 000: ninguna compactación ocurre, y
    // el bucle recorre sus turnos sin que el guard tenga nada que contar.
    const p = new RecordedProvider([pide(1), pide(2), pide(3), pide(4), texto('fin')])
    const r = await runLoop({
      ...base(d), prompt: 'hola', provider: p,
      resume: sembrar(d, [relleno(20_000)]),
      context: { summarize: async () => 'z'.repeat(80_000), keepMessages: 1 },
      maxTurns: 8,
    })
    expect(r.stop).toBe('end_turn')
  })
})

describe('el piso de la microcompactación — `Sdn=20000`', () => {
  /** Un par tool_use/tool_result cuyo resultado ocupa `tokens` del estimador. */
  const par = (id: string, tokens: number): Message[] => ([
    { role: 'assistant', content: [{ type: 'tool_use', id, name: 'Read', input: { file_path: '/x' } }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: 'y'.repeat(tokens * 4) }] },
  ])

  const purgas = async (d: string, historial: Message[], ctx: Record<string, unknown>) => {
    const out: string[] = []
    for await (const e of streamLoop({
      ...base(d), prompt: 'sigue', provider: new RecordedProvider([texto('ok')]),
      resume: sembrar(d, historial), context: ctx,
    })) {
      if (e.type === 'compaction') out.push(`${e.kind}:${e.trigger ?? ''}`)
    }
    return out
  }

  test('bajo presión, un resultado que libera POCO no se purga', async () => {
    const d = dir()
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '4'
    // Nivel `warn` con 25 000 tokens de relleno, pero el resultado purgable
    // libera 500: por debajo del piso. Purgar aquí rompe la caché de prompt
    // —el 98 % del consumo— para no liberar nada.
    const historial = [...par('tu_poco', 500), relleno(25_000)]
    expect(await purgas(d, historial, { keepToolResults: 0 })).toEqual([])
  })

  test('bajo la MISMA presión, un resultado que libera mucho SÍ se purga', async () => {
    const d = dir()
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '4'
    // El control que discrimina: si el piso vetara siempre, este caso caería
    // y el de arriba pasaría igual — y los dos juntos no dirían nada.
    const historial = [...par('tu_mucho', 25_000), relleno(1_000)]
    expect(await purgas(d, historial, { keepToolResults: 0 })).toContain('micro:context_hint')
  })

  test('`minFreedTokens: 0` es la ausencia de piso, y se declara', async () => {
    const d = dir()
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '4'
    const historial = [...par('tu_decl', 500), relleno(25_000)]
    const r = await purgas(d, historial, { keepToolResults: 0, minFreedTokens: 0 })
    expect(r).toContain('micro:context_hint')
  })

  test('el piso rige también el disparador por CONTEO, no sólo la presión', async () => {
    const d = dir()
    // Sin override: nivel `ok`, así que la única vía es `microcompactAfter`.
    // El daño de purgar es el mismo venga de donde venga el disparo.
    const historial = [...par('tu_conteo', 500)]
    expect(await purgas(d, historial, { microcompactAfter: 0, keepToolResults: 0 })).toEqual([])
  })
})

describe('lo que no se pudo registrar NO se limpia — y se dice por qué', () => {
  const conResultado = (id: string, tokens: number): Message[] => ([
    { role: 'assistant', content: [{ type: 'tool_use', id, name: 'Read', input: { file_path: '/x' } }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: 'y'.repeat(tokens * 4) }] },
  ])

  const correr = async (d: string, historial: Message[], ctx: Record<string, unknown>) => {
    const out: HarnessEvent[] = []
    for await (const e of streamLoop({
      ...base(d), prompt: 'sigue', provider: new RecordedProvider([texto('ok')]),
      resume: sembrar(d, historial), context: ctx,
    })) {
      if (e.type === 'compaction' || e.type === 'cleared_unpersisted') out.push(e)
    }
    return out
  }

  test('sin store, el bloque se conserva y el fallo se emite con su causa', async () => {
    const d = dir()
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '4'
    // Un directorio como ruta de base: `bun:sqlite` no puede abrirlo. Es un
    // fallo REAL del store, no un doble que finge fallar.
    const eventos = await correr(d, [...conResultado('tu_sin', 25_000), relleno(1_000)],
      { keepToolResults: 0, persistCleared: d })
    const fallo = eventos.find((e) => e.type === 'cleared_unpersisted')
    expect(fallo).toBeDefined()
    expect((fallo as { reason: string }).reason).toBe('sin-store')
    // Y la compactación reporta CERO limpiados: el contenido sigue ahí.
    const purga = eventos.find((e) => e.type === 'compaction')
    expect(purga === undefined || (purga as { cleared: number }).cleared === 0).toBe(true)
  })

  test('con store, el mismo caso SÍ se limpia — el control que discrimina', async () => {
    const d = dir()
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '4'
    const eventos = await correr(d, [...conResultado('tu_con', 25_000), relleno(1_000)],
      { keepToolResults: 0, persistCleared: join(d, 'store.sqlite3') })
    expect(eventos.some((e) => e.type === 'cleared_unpersisted')).toBe(false)
    const purga = eventos.find((e) => e.type === 'compaction')
    expect((purga as { cleared: number }).cleared).toBe(1)
  })

  test('la fila registrada permite volver a pedir la llamada y verificar el digest', async () => {
    const d = dir()
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '4'
    const db = join(d, 'store.sqlite3')
    await correr(d, [...conResultado('tu_fila', 25_000), relleno(1_000)],
      { keepToolResults: 0, persistCleared: db })
    const filas = new Database(db).query(
      `SELECT tool, input_json, content_sha256, content_chars FROM ${CLEARED_TABLE}`).all() as Record<string, unknown>[]
    expect(filas.length).toBe(1)
    // La LLAMADA, no el contenido: es lo que permite volver a pedirlo, y es lo
    // que cabe en un store versionado sin hacerlo crecer sin cota.
    expect(filas[0]?.tool).toBe('Read')
    expect(JSON.parse(String(filas[0]?.input_json)).file_path).toBe('/x')
    expect(String(filas[0]?.content_sha256)).toHaveLength(64)
    expect(filas[0]?.content_chars).toBe(100_000)
  })

  test('`persistCleared: false` limpia con el marcador pelado — declarado', async () => {
    const d = dir()
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '4'
    const eventos = await correr(d, [...conResultado('tu_off', 25_000), relleno(1_000)],
      { keepToolResults: 0, persistCleared: false })
    expect(eventos.some((e) => e.type === 'cleared_unpersisted')).toBe(false)
    expect((eventos.find((e) => e.type === 'compaction') as { cleared: number }).cleared).toBe(1)
  })
})

/**
 * T-083 (#34) — la compactación deja rastro en el transcript.
 *
 * Antes de esto el harness compactaba **sin escribir marcador**: la sesión
 * perdía cientos de miles de tokens de contexto y su propio transcript decía
 * `compactions: 0`, `droppedTokens: null`. El cliente sí lo escribe, y su
 * `compactMetadata` es lo que hace derivable el acumulado.
 */
describe('la frontera compact_boundary la escribe el bucle (T-083)', () => {
  afterEach(() => { delete process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE })

  const pide = (i: number): AssistantTurn => ({
    id: `m${i}`, model: 'claude-opus-5', stop_reason: 'tool_use', usage: uso,
    content: [{ type: 'tool_use', id: `tu${i}`, name: 'Bash', input: { command: 'echo sigue' } }],
  })

  test('la compactación auto escribe la frontera con pre y post honestos', async () => {
    const d = dir()
    process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '1'
    const p = new RecordedProvider([pide(1), texto('fin')])
    const r = await runLoop({
      ...base(d), prompt: 'hola', provider: p,
      resume: sembrar(d, [relleno(20_000)]),
      // Un resumen que SÍ reduce: así no se dispara el guard antithrashing y
      // lo que se mide es la frontera, no la parada.
      context: { summarize: async () => 'el resumen', keepMessages: 1 },
      maxTurns: 4,
    })
    const forma = transcriptShapeOf(r.transcriptPath)!
    expect(forma.compactions).toBeGreaterThanOrEqual(1)
    expect(forma.droppedTokens).not.toBeNull()
    expect(forma.droppedTokens!).toBeGreaterThan(0)

    const frontera = readFileSync(r.transcriptPath, 'utf8').trim().split('\n')
      .map((l) => JSON.parse(l))
      .find((l) => l.subtype === 'compact_boundary')
    expect(frontera.compactMetadata.trigger).toBe('auto')
    // `postTokens` es el contexto DESPUÉS, no lo liberado: es la divergencia
    // declarada con `ccnmt: snipCompactCore.ts:83`, y es lo que hace que
    // `pre - post` valga como delta del acumulado.
    expect(frontera.compactMetadata.postTokens).toBeLessThan(frontera.compactMetadata.preTokens)
    expect(frontera.compactMetadata.cumulativeDroppedTokens)
      .toBe(frontera.compactMetadata.preTokens - frontera.compactMetadata.postTokens)
  })

  test('CONTROL — sin compactación no hay frontera: 0 y null, no 0 y 0', async () => {
    const d = dir()
    const p = new RecordedProvider([texto('fin')])
    const r = await runLoop({
      ...base(d), prompt: 'hola', provider: p,
      context: { summarize: async () => 'el resumen', keepMessages: 1 },
      maxTurns: 4,
    })
    const forma = transcriptShapeOf(r.transcriptPath)!
    expect(forma.compactions).toBe(0)
    expect(forma.droppedTokens).toBeNull()
  })
})
