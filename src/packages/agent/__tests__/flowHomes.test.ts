import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  FLOW_HOMES,
  allDeclaredHomes,
  declaredHomes,
  definitionsWithMissingHomes,
  homesMissingFromTree,
  renderFlowHomes,
  type Flow,
} from '../flowHomes.ts'
import { rupCoordinator } from '../definitions/rupCoordinator.ts'
import { AGENTS } from '../index.ts'
import { toMarkdown } from '../emit/markdown.ts'

// Los flows canónicos de DEC-R-01 con hogar declarado (``ninguno`` no produce
// artefactos, así que no lleva hogar).
const CANONICAL: Flow[] = [
  'rup', 'babok', 'rm', 'bpa', 'sp', 'cp', 'dmaic', 'lean',
  'pdca', 'pps', 'pm', 'scrum', 'kanban', 'tdd',
]

describe('FLOW_HOMES — el mapa flow → hogar como dato tipado (no prosa)', () => {
  test('cubre los 14 flows canónicos, cada uno con al menos un hogar', () => {
    for (const f of CANONICAL) {
      expect(FLOW_HOMES[f], `falta el flow ${f}`).toBeDefined()
      expect(FLOW_HOMES[f].length, `${f} sin hogar`).toBeGreaterThan(0)
    }
  })

  test('todo hogar declarado es una ruta source/… (no docs/source, no glob)', () => {
    for (const h of allDeclaredHomes()) {
      expect(h.startsWith('source/'), `hogar no repo-relativo: ${h}`).toBe(true)
      expect(/[*<>{}]/.test(h), `hogar con glob/placeholder: ${h}`).toBe(false)
    }
  })

  // El control que discrimina (sub-patrón D): un hogar declarado que el árbol
  // no tiene lo detecta este test. Falla hoy contra source/implementacion/.
  test('ningún hogar declarado apunta a un directorio inexistente', () => {
    expect(homesMissingFromTree()).toEqual([])
  })
})

describe('renderFlowHomes — el bloque que el coordinador CONSUME del primitivo', () => {
  test('lleva el marcador de procedencia una sola vez y cada hogar del flow', () => {
    const bloque = renderFlowHomes('rup')
    const marcador = '<!-- generado desde FLOW_HOMES.rup — no editar a mano -->'
    expect(bloque.split(marcador).length - 1, 'el marcador no aparece exactamente una vez').toBe(1)
    for (const h of FLOW_HOMES.rup) {
      expect(bloque.includes(h), `el bloque no cita el hogar ${h}`).toBe(true)
    }
  })
})

describe('el coordinador de RUP consume el primitivo, no una tabla en prosa', () => {
  test('rupCoordinator declara flow: rup (indexa FLOW_HOMES, no puede driftear)', () => {
    expect(rupCoordinator.flow).toBe('rup')
  })

  test('la emisión .md contiene el bloque generado desde FLOW_HOMES.rup', () => {
    const md = toMarkdown(rupCoordinator, '2026-01-01 00:00:00')
    const marcador = '<!-- generado desde FLOW_HOMES.rup — no editar a mano -->'
    expect(md.split(marcador).length - 1, 'el marcador no aparece exactamente una vez').toBe(1)
    for (const h of FLOW_HOMES.rup) {
      expect(md.includes(h), `la emisión no cita el hogar ${h}`).toBe(true)
    }
  })
})

describe('los prompts de coordinador ya no llevan el hogar en prosa muerta', () => {
  test('ningún *Coordinator.prompt.md cita source/implementacion (H-DOCS-1021)', () => {
    const dir = join(import.meta.dir, '..', 'definitions')
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith('Coordinator.prompt.md'))
      .filter((f) => readFileSync(join(dir, f), 'utf8').includes('source/implementacion'))
    expect(offenders).toEqual([])
  })
})


// ---------------------------------------------------------------------------
// T-006 (board #54): el gate DMAIC-control. Valida a los CONSUMIDORES (las
// definiciones de agente) contra el arbol, no el `.md` emitido. La causa de
// :ref:`h-docs-1021` fue una definicion de coordinador que citaba una raiz
// `source/…` inexistente; el `.md` es su proyeccion.
//
// Alcance declarado (no oculto): hoy solo `rupCoordinator` declara `flow`, asi
// que T-006 solo valida su hogar. Los diez coordinadores en prosa
// (ba/bpa/cp/dmaic/lean/pdca/pm/pps/rm/sp) todavia no declaran `flow` — su
// adopcion es T-007 / board #51 — y hasta entonces su hogar citado en prosa lo
// guarda unicamente el literal `source/implementacion` del ultimo describe.
// ---------------------------------------------------------------------------
describe('definitionsWithMissingHomes — el gate DMAIC-control de T-006 (#54)', () => {
  test('ninguna definicion del registro real declara un hogar inexistente', () => {
    expect(definitionsWithMissingHomes(AGENTS)).toEqual([])
  })

  // El control que PUEDE fallar (`metrica-decide-la-conclusion.md` sub-patron
  // D): contra una raiz que SOLO tiene parte de los hogares de rup, la
  // definicion real de rup devuelve los ausentes, con su nombre. Un control que
  // no puede fallar no distingue «el hogar existe» de «el instrumento no mira».
  test('nombra los hogares ausentes de una definicion real contra una raiz recortada', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'flow-homes-'))
    try {
      // Solo 3 de los 5 hogares de rup; faltan frontend/adr y quality.
      const presentes = FLOW_HOMES.rup.slice(0, 3)
      const ausentesEsperados = FLOW_HOMES.rup.slice(3)
      for (const h of presentes) mkdirSync(join(raiz, h), { recursive: true })

      const problemas = definitionsWithMissingHomes([rupCoordinator], raiz)
      expect(problemas.length).toBe(1)
      expect(problemas[0].name).toBe(rupCoordinator.name)
      expect(problemas[0].missing.sort()).toEqual([...ausentesEsperados].sort())
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  })

  // La otra mitad del control D: contra el arbol real, la misma definicion no
  // devuelve nada. Sin este caso el rojo de arriba no probaria que el verde del
  // registro real signifique algo.
  test('la misma definicion contra el arbol real no reporta ausentes', () => {
    expect(definitionsWithMissingHomes([rupCoordinator])).toEqual([])
  })
})

describe('declaredHomes — la mitad consumidora: flow -> hogares', () => {
  test('rupCoordinator declara exactamente los hogares de FLOW_HOMES.rup', () => {
    expect(declaredHomes(rupCoordinator)).toEqual(FLOW_HOMES.rup)
  })

  test('una definicion sin flow no declara hogar de diseno (devuelve [])', () => {
    expect(declaredHomes({})).toEqual([])
  })
})
