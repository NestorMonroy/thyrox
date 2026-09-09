/**
 * A.7.6 — la política de caducidad de memoria y skills.
 *
 * Fuente: `hbooks: book1/appendix-a-checklists.md`, §A.7, verbatim:
 *
 *   «Is there maintenance policy for stale memory, obsolete rules, and
 *    invalid skills?»
 *
 * QUÉ FALTABA. El predicado nombra TRES sujetos y sólo uno tenía política.
 * Medido sobre los 71 gates de `src/verify/`: dos miran caducidad —
 * `check_premise_drift` (premisas que dejaron de ser ciertas, con baseline)
 * y `check_corpus_al_dia` (frescura del corpus vendorizado). Ninguno mira
 * MEMORIA rancia —`getLargeMemoryFiles` nombra las que se pasan de
 * `MAX_MEMORY_CHARACTER_COUNT` y nada las retira ni las declara— ni SKILLS
 * inválidos: los 88 de `.claude/skills` no pasaban por ningún gate de
 * validez (`lint_agents.py` mira agentes, que son otra cosa).
 *
 * MITAD ROJA: los cinco casos se escriben antes de que exista
 * `src/conformance/maintenance.ts`.
 *
 * POR QUÉ CUATRO CASOS SINTÉTICOS Y UNO REAL. Medido antes de escribir
 * nada, el árbol de hoy está limpio en los dos ejes: 0 memorias por encima
 * de la cota y 0 skills inválidos. Un gate que sólo mirara el árbol real
 * publicaría `0` y ese cero no distinguiría «no hay defectos» de «el
 * instrumento no ve ninguno» — el sub-patrón D. Los cuatro primeros casos
 * construyen el defecto a propósito y exigen que lo vea; el quinto publica
 * el estado real, que sólo significa algo porque los otros cuatro
 * demostraron que el instrumento discrimina.
 *
 * CONTROLES DE ANULACIÓN, medidos:
 *
 * - Se retira la comparación contra `MAX_MEMORY_CHARACTER_COUNT`: caen **2
 *   de 6**, los dos de memoria. Los cuatro de skills sobreviven y deben —
 *   son ejes independientes, y un instrumento que los mezclara no diría cuál
 *   se rompió.
 * - Se retira la comparación `name` contra directorio: cae **1 de 6**, sólo
 *   el caso 4. El 3 sobrevive porque mide otra condición (sin `SKILL.md`) y
 *   el 5 también, que es el que prueba que la forma cercada no es defecto.
 */
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  invalidSkills, maintenanceReport, staleMemory, MAX_MEMORY_CHARACTER_COUNT,
} from '../../src/conformance/maintenance.ts'

const RAIZ = join(import.meta.dir, '..', '..')

/** Un árbol con la memoria y los skills que el caso necesita. */
function arbol(memoria: Record<string, string>, skills: Record<string, string | null>): string {
  const d = mkdtempSync(join(tmpdir(), 'mant-'))
  mkdirSync(join(d, '.claude', 'rules'), { recursive: true })
  for (const [ruta, texto] of Object.entries(memoria)) writeFileSync(join(d, ruta), texto)
  for (const [nombre, contenido] of Object.entries(skills)) {
    const dir = join(d, '.claude', 'skills', nombre)
    mkdirSync(dir, { recursive: true })
    // `null` es el skill SIN SKILL.md: el directorio existe y esta vacio.
    if (contenido !== null) writeFileSync(join(dir, 'SKILL.md'), contenido)
  }
  return d
}

const skillValido = (nombre: string) =>
  `---\nname: ${nombre}\ndescription: "Use when ${nombre}."\n---\n\nCuerpo.`

describe('A.7.6 — memoria rancia', () => {
  test('1. nombra la que pasa la cota y NO la que no', () => {
    const d = arbol({
      'CLAUDE.md': 'x'.repeat(MAX_MEMORY_CHARACTER_COUNT + 1),
      '.claude/rules/corta.md': 'y'.repeat(100),
    }, {})
    const rancias = staleMemory(d).map((m) => m.path)
    // Las dos mitades: que vea la larga prueba que mira; que NO vea la corta
    // prueba que mide el tamano y no la mera existencia del archivo.
    expect(rancias).toContain('CLAUDE.md')
    expect(rancias).not.toContain('.claude/rules/corta.md')
  })

  test('2. publica cuanto se pasa, no solo que se pasa', () => {
    const exceso = 500
    const d = arbol({ 'CLAUDE.md': 'x'.repeat(MAX_MEMORY_CHARACTER_COUNT + exceso) }, {})
    // Sin el exceso, «rancia» es un si/no y no dice si sobran 500 caracteres
    // o 40 000. Lo que se hace con una y con otra es distinto.
    expect(staleMemory(d)[0].overBy).toBe(exceso)
  })
})

describe('A.7.6 — skills invalidos', () => {
  test('3. un directorio sin SKILL.md es invalido, y se dice por que', () => {
    const d = arbol({}, { 'huerfano': null, 'bueno': skillValido('bueno') })
    const malos = invalidSkills(d)
    expect(malos.map((s) => s.name)).toEqual(['huerfano'])
    expect(malos[0].reason).toBe('sin SKILL.md')
  })

  test('4. sin description, y con el name cambiado, tambien', () => {
    const d = arbol({}, {
      'sin-desc': '---\nname: sin-desc\n---\nCuerpo.',
      'renombrado': skillValido('otro-nombre'),
      'bueno': skillValido('bueno'),
    })
    const malos = invalidSkills(d)
    // El `name` que no casa con su directorio es el caso que mas cuesta ver
    // a ojo y el que rompe la busqueda por nombre del registro.
    expect(malos.map((s) => s.name).sort()).toEqual(['renombrado', 'sin-desc'])
    expect(malos.find((s) => s.name === 'renombrado')!.reason)
      .toContain('otro-nombre')
  })
})

describe('A.7.6 — las DOS formas de frontmatter del arbol', () => {
  test('5. la cerca ```yml vale igual que los guiones: no es un defecto', () => {
    // Control de un falso positivo REAL, no fabricado. Con el instrumento
    // mirando solo `---`, el arbol daba 3 skills «sin name» teniendolos:
    // `cosmic`, `python-mcp` y `thyrox`, los tres de forma cercada. El
    // arreglo habria sido reescribir tres skills sanos.
    const d = arbol({}, {
      'cercado': '```yml\nname: cercado\ndescription: "Use when cercado."\n```\n\nCuerpo.',
    })
    expect(invalidSkills(d)).toEqual([])
  })
})

describe('A.7.6 — el estado del arbol real', () => {
  test('6. hoy no hay ninguna de las dos, y el conteo dice sobre que se midio', () => {
    const r = maintenanceReport(RAIZ)
    // El cero solo significa algo porque los cuatro casos de arriba
    // demostraron que el instrumento ve el defecto cuando lo hay.
    expect(r.staleMemory).toEqual([])
    expect(r.invalidSkills).toEqual([])
    // El denominador va junto al conteo: un `0 rancias` sin decir sobre
    // cuantas memorias se midio no distingue un arbol limpio de un
    // instrumento que no encontro ninguna que mirar.
    expect(r.memoryFilesChecked).toBeGreaterThan(0)
    expect(r.skillsChecked).toBeGreaterThan(0)
  })
})

describe('A.7.6 — el hogar NO se cablea: lo declara el gobernador', () => {
  /**
   * QUE FALTABA. Los cinco casos de arriba pasan con `.claude` codificado en
   * cinco sitios de `maintenance.ts`, porque su arbol sintetico usa ese mismo
   * segmento. El instrumento nunca preguntaba por el consumidor: media un
   * literal y concluia sobre «la memoria del arbol».
   *
   * Es el sub-patron D — un verde que no discrimina. Los casos 1-6 no podian
   * fallar por esta causa, asi que su verde no distinguia «lee el hogar
   * declarado» de «acierta porque el default coincide».
   *
   * MITAD ROJA, medida antes del arreglo: con `.claude` codificado los tres
   * casos de este bloque fallan —0 memorias rancias, 0 skills invalidos, 0 de
   * denominador— porque el arbol declara su estado en `.harness`.
   *
   * CONTROL DE ANULACION, medido despues del arreglo: se re-codifican los
   * cuatro sitios a `.claude` y caen **3 de 9** — exactamente los tres de este
   * bloque. Los seis de arriba sobreviven, y deben: miden el defecto de forma,
   * no el del hogar. Si al quitarle la causa cayera alguno de ellos, el bloque
   * nuevo no estaria midiendo lo que dice.
   */

  /** Un consumidor que declara su segmento de estado en su propio `.env`. */
  function consumer(state: string, extra = ''): string {
    const d = mkdtempSync(join(tmpdir(), 'mant-consumer-'))
    writeFileSync(join(d, '.env'), `THYROX_STATE_DIR=${state}\n${extra}`)
    mkdirSync(join(d, state, 'rules'), { recursive: true })
    mkdirSync(join(d, state, 'skills', 'huerfano'), { recursive: true })
    writeFileSync(join(d, state, 'CLAUDE.md'), 'x'.repeat(MAX_MEMORY_CHARACTER_COUNT + 1))
    return d
  }

  test('7. la memoria se busca en el segmento que el consumidor declara', () => {
    const d = consumer('.harness')
    // Con `.claude` codificado esto da `[]`: el archivo existe y el
    // instrumento mira otro directorio.
    expect(staleMemory(d).map((m) => m.path)).toContain(join('.harness', 'CLAUDE.md'))
  })

  test('8. los skills tambien, y el denominador lo dice', () => {
    const d = consumer('.harness')
    expect(invalidSkills(d).map((s) => s.name)).toEqual(['huerfano'])
    // El denominador es la mitad que convierte el conteo en resultado: un
    // `0 invalidos` sobre 0 skills medidos no dice nada del arbol.
    expect(maintenanceReport(d).skillsChecked).toBe(1)
  })

  test('9. THYROX_RULES_DIR reapunta el hogar de las reglas, y se cita relativo', () => {
    // El hogar de las reglas tiene gobernador PROPIO —`consumerRulesDir`— que
    // gana sobre el segmento de estado. Un consumidor puede tener su estado en
    // `.harness` y sus reglas en otro sitio; son dos decisiones, no una.
    const d = consumer('.harness', 'THYROX_RULES_DIR=politicas\n')
    mkdirSync(join(d, 'politicas'), { recursive: true })
    writeFileSync(join(d, 'politicas', 'larga.md'), 'y'.repeat(MAX_MEMORY_CHARACTER_COUNT + 1))
    const stale = staleMemory(d).map((m) => m.path)
    // La ruta se cita RELATIVA a la raiz — es el contrato de `StaleMemory.path`,
    // y lo que hace que `join(root, ruta)` siga resolviendo.
    expect(stale).toContain(join('politicas', 'larga.md'))
    expect(stale.every((p) => !p.startsWith('/'))).toBe(true)
  })
})
