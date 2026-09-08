/**
 * A.4.2 — la separación entre archivo de ENTRADA y archivo de CUERPO llega
 * al prompt que la CLI envía de verdad.
 *
 * Fuente: `hbooks: book1/appendix-a-checklists.md`, §A.4, verbatim:
 *
 *   «Is there explicit separation between entrypoint files and body files
 *    to prevent index bloat?»
 *
 * QUÉ ESTABA MAL, Y CÓMO SE DESCUBRIÓ. El manifiesto de conformidad puntuó
 * este predicado `unmet` citando `config/frontmatterParser.ts` —cuyo
 * `splitPathInFrontmatter` no tiene consumidor vivo— y concluyendo que
 * «nadie filtra». La cita era correcta y la conclusión falsa: hay una
 * SEGUNDA implementación, `agent/loop/context/systemPrompt.ts`, con
 * `parseRule`, `matchesPath` y el filtro por `targetPath` ya escrito y
 * probado. Medir un significante y concluir sobre el mecanismo es el
 * sub-patrón C, cometido dentro del propio instrumento que existe para
 * evitarlo.
 *
 * EL HUECO REAL, medido después: `assembleSystemPrompt` tiene **cero**
 * consumidores fuera de su propia suite, y la CLI arma su prompt en
 * `entry/runLoop.ts:145` con `flag(argv,'system') ?? '<una frase fija>'`.
 * O sea: el mecanismo está construido y probado, y el punto de entrada real
 * no lo llama. Un `CLAUDE.md` del proyecto no llegaba nunca al modelo, y una
 * regla con `paths:` tampoco — ni la que casa ni la que no. La separación
 * existía en un módulo que nadie usaba.
 *
 * MITAD ROJA: los cuatro casos se escriben antes de tocar la CLI.
 *
 * POR QUÉ EL OBSERVABLE ES EL TRANSCRIPT. El prompt de sistema no se
 * registraba en ninguna parte, así que no había forma de auditar con qué
 * instrucciones trabajó el agente — y A.7.5 pide el transcript «as replay
 * evidence»: un replay sin las instrucciones no reproduce nada. Se registra
 * una vez por sesión como línea `system` de subtipo `system_prompt`, y eso
 * es a la vez el cierre de ese hueco y el observable de este caso.
 *
 * CONTROL DE ANULACIÓN, medido: se devuelve a la CLI su prompt crudo (la
 * frase fija en vez de `systemPromptFor`) y caen **3 de 4** — los casos 1, 2
 * y 4. El 3 sobrevive, y esa es la conducta correcta: mide la AUSENCIA de
 * condicionales sin `--target-path`, y desconectar el ensamblador no las
 * hace aparecer. Un caso que cayera ahí estaría midiendo «el prompt tiene
 * capas» en vez de «la capa condicional se filtra».
 */
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ENTRADA = join(import.meta.dir, '..', 'src', 'entry', 'main.ts')
const uso = {
  input_tokens: 1, output_tokens: 1,
  cache_creation_input_tokens: 0, cache_read_input_tokens: 0,
}

/**
 * Un árbol con su CLAUDE.md y dos reglas: una del piso y dos condicionales
 * que se excluyen entre sí. Las dos condicionales son lo que discrimina —
 * con una sola, «se cargó» y «se cargan todas» dan el mismo resultado.
 */
function arbol(): string {
  const d = mkdtempSync(join(tmpdir(), 'capas-'))
  writeFileSync(join(d, 'CLAUDE.md'), 'MARCA-DEL-PROYECTO: este arbol se gobierna asi.')
  const reglas = join(d, '.claude', 'rules')
  mkdirSync(reglas, { recursive: true })
  writeFileSync(join(reglas, 'piso.md'), 'MARCA-DEL-PISO: aplica a todo.')
  writeFileSync(join(reglas, 'solo-ts.md'), '---\npaths: "**/*.ts"\n---\nMARCA-DE-TS: solo al tocar TypeScript.')
  writeFileSync(join(reglas, 'solo-py.md'), '---\npaths: "**/*.py"\n---\nMARCA-DE-PY: solo al tocar Python.')
  writeFileSync(join(d, 'turnos.json'), JSON.stringify([
    { id: 'm1', model: 'claude-opus-5', stop_reason: 'end_turn', usage: uso,
      content: [{ type: 'text', text: 'visto' }] },
  ]))
  return d
}

/** El prompt de sistema que la sesión registró, leído del transcript. */
function promptRegistrado(dirTranscript: string): string {
  const archivos = readdirSync(dirTranscript).filter((f) => f.endsWith('.jsonl'))
  expect(archivos.length).toBeGreaterThanOrEqual(1)
  const lineas = readFileSync(join(dirTranscript, archivos[0]), 'utf8').trim().split('\n')
  const linea = lineas
    .map((l) => JSON.parse(l) as { type?: string; subtype?: string; content?: string })
    .find((l) => l.type === 'system' && l.subtype === 'system_prompt')
  if (!linea) throw new Error('el transcript no registró el prompt de sistema')
  return linea.content ?? ''
}

/** Corre la CLI de punta a punta y devuelve el prompt que registró. */
function correr(d: string, extra: string[] = []): string {
  const tr = join(d, `tr-${Math.random().toString(36).slice(2)}`)
  const p = Bun.spawnSync(['bun', 'run', ENTRADA, '--prompt', 'hola',
    '--provider', 'recorded', '--grabacion', join(d, 'turnos.json'),
    '--cwd', d, '--transcript-dir', tr, '--json', ...extra])
  expect(p.exitCode).toBe(0)
  return promptRegistrado(tr)
}

describe('A.4.2 — el prompt de la CLI se arma por capas', () => {
  test('1. el CLAUDE.md del proyecto llega al modelo', () => {
    expect(correr(arbol())).toContain('MARCA-DEL-PROYECTO')
  })

  test('2. una regla SIN paths es del piso: entra siempre', () => {
    expect(correr(arbol())).toContain('MARCA-DEL-PISO')
  })

  test('3. sin ruta objetivo, NINGUNA condicional entra', () => {
    const t = correr(arbol())
    expect(t).not.toContain('MARCA-DE-TS')
    expect(t).not.toContain('MARCA-DE-PY')
  })

  test('4. con ruta objetivo entra la que casa, y SOLO ella', () => {
    // Las dos mitades importan. Que entre la que casa prueba que el filtro
    // no lo excluye todo; que NO entre la otra prueba que filtra de verdad.
    // Con una sola condicional, «carga la correcta» y «carga todas» darían
    // el mismo veredicto.
    const t = correr(arbol(), ['--target-path', 'src/algo.ts'])
    expect(t).toContain('MARCA-DE-TS')
    expect(t).not.toContain('MARCA-DE-PY')
  })
})
