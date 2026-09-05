/**
 * El TRIPLE de referencia como código (#79 → procedimiento aprobado).
 *
 * Fuente del porte: `api: scripts/reference_roots.py`, que ya resolvió la mitad
 * de esto para Odoo y dejó escrita su razón —*"cada gate con su copia de la
 * ruta es exactamente la segunda fuente de verdad que
 * calibration-verified-numbers.md prohíbe, y su modo de fallo es silencioso: un
 * gate que apunta a una raíz vacía publica 0 incumplidores y parece sano"*—.
 * Ese cero ya se pagó una vez (h-api-335).
 *
 * Lo que este módulo añade es el otro tercio: el procedimiento se parametriza
 * por un TRIPLE (raíz · extractor · alias de cita), no por una ruta. Con sólo
 * la raíz declarada, «cómo se leen sus símbolos» y «cómo se cita» siguen
 * viviendo en prosa, que es justo lo que no puede quedarse ahí.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  TRIPLES, EXTRACTORS, referenceTriple, resolveRoot, requireRoot,
  declaredAlias, checkPortDeclaration, canonicalAlias, sameCorpus,
} from '../src/reference/triple.ts'

describe('el catálogo de triples', () => {
  test('las tres instancias del árbol están declaradas', () => {
    // El n=3 es lo PRESENTE, no un universo cerrado: es la cifra que el
    // procedimiento declara y su ceguera está escrita ahí.
    const familias = new Set(Object.values(TRIPLES).map(t => t.extractor))
    expect([...familias].sort()).toEqual([...EXTRACTORS].sort())
  })

  test('cada triple trae sus tres componentes, ninguno vacío', () => {
    for (const [alias, t] of Object.entries(TRIPLES)) {
      expect(t.alias).toBe(alias)
      expect(t.root.length).toBeGreaterThan(0)
      expect(t.envVar).toMatch(/^[A-Z0-9_]+$/)
    }
  })

  test('un alias que no existe se rehúsa nombrando los que sí', () => {
    expect(() => referenceTriple('odoo20c')).toThrow(/odoo19c/)
  })

  // El entorno gana sobre el default — la misma costura que reference_roots.py:
  // sin ella, medir contra otra copia del árbol exige editar el módulo.
  test('el entorno sobreescribe la raíz de su alias, y sólo la suya', () => {
    const env = { ODOO19C: '/otra/copia' }
    expect(resolveRoot('odoo19c', env)).toBe('/otra/copia')
    expect(resolveRoot('odoo18c', env)).toBe(TRIPLES.odoo18c!.root)
  })

  // CONTROL — un gate apuntado a una raíz ausente publica 0 y parece sano.
  // requireRoot existe para que ese cero no se pueda emitir en silencio.
  test('requireRoot falla si la raíz no existe, y dice cuál y con qué variable', () => {
    const d = mkdtempSync(join(tmpdir(), 'tri-'))
    expect(() => requireRoot('odoo19c', { ODOO19C: join(d, 'no-esta') }))
      .toThrow(/ODOO19C/)
    mkdirSync(join(d, 'si-esta'))
    expect(requireRoot('odoo19c', { ODOO19C: join(d, 'si-esta') })).toBe(join(d, 'si-esta'))
  })
})

describe('el alias declarado en un puerto', () => {
  test('reconoce el alias de Odoo en la cabecera', () => {
    expect(declaredAlias('/**\n * Adaptación de `odoo19c: addons/sale/models/x.py`.\n */'))
      .toBe('odoo19c')
  })
  test('reconoce la versión del ejecutable como alias del binario', () => {
    expect(declaredAlias('// Fuente: el ejecutable 2.1.258, bloque `aliases`.'))
      .toBe('2.1.258')
  })
  test('reconoce el alias de ui', () => {
    expect(declaredAlias('// Porte nativo de `ui-core-5.25.0`.')).toBe('ui-core-5.25.0')
  })
  // El caso negativo apunta a un texto que SÍ trae números y rutas: así el
  // rechazo lo produce la ausencia de alias y no la de contenido.
  test('un texto sin alias devuelve null aunque traiga cifras y rutas', () => {
    expect(declaredAlias('// mide 19 archivos en src/session/reconcile.ts, 2 fallos')).toBeNull()
  })
})

describe('checkPortDeclaration — el gate del paso 4', () => {
  const conTexto = (t: string) => {
    const d = mkdtempSync(join(tmpdir(), 'port-'))
    const f = join(d, 'puerto.ts')
    writeFileSync(f, t)
    return f
  }
  test('un puerto que declara su triple no reporta nada', () => {
    expect(checkPortDeclaration(conTexto('/** Adaptación de `odoo19c: odoo/orm/x.py`. */\n')))
      .toEqual([])
  })
  test('un puerto sin alias se reporta nombrando el paso', () => {
    const ps = checkPortDeclaration(conTexto('export const x = 1\n'))
    expect(ps).toHaveLength(1)
    expect(ps[0]!.problem).toContain('procedencia')
  })
  test('un archivo que no existe se reporta, no revienta', () => {
    expect(checkPortDeclaration('/no/existe.ts')[0]!.problem).toContain('no existe')
  })
})

describe('dos alias, un árbol (h-docs-1041)', () => {
  // `ccnmt` salió del nombre del DIRECTORIO donde alguien desempacó el corpus;
  // `ccb` es el nombre que el corpus se da a sí mismo (su package.json). Sin
  // esta equivalencia declarada, una frase que cita los dos se lee como
  // corroboración triple siendo doble.
  test('ccnmt canoniza a ccb, y ccb a sí mismo', () => {
    expect(canonicalAlias('ccnmt')).toBe('ccb')
    expect(canonicalAlias('ccb')).toBe('ccb')
  })
  test('sameCorpus los reconoce como uno', () => {
    expect(sameCorpus('ccb', 'ccnmt')).toBe(true)
  })
  // CONTROL — el par que SÍ son dos árboles distintos, y que el propio corpus
  // documentó por ser de nombre casi idéntico. Sin este caso, un `sameCorpus`
  // que devolviera siempre true pasaría el test de arriba.
  test('ccb y hccw NO son el mismo corpus', () => {
    expect(sameCorpus('ccb', 'hccw')).toBe(false)
    expect(TRIPLES.ccb!.root).not.toBe(TRIPLES.hccw!.root)
  })
  test('los dos alias resuelven a la MISMA raíz', () => {
    expect(TRIPLES.ccnmt!.root).toBe(TRIPLES.ccb!.root)
    expect(TRIPLES.ccnmt!.envVar).toBe(TRIPLES.ccb!.envVar)
  })
})

describe('la raíz declarada es la DURABLE, no el clon suelto', () => {
  // Un clon bajo /home/user muere con el contenedor, y con él toda cita que lo
  // use. La raíz por defecto de un corpus versionado es su ruta en el repo; el
  // clon suelto se apunta por entorno cuando se quiere trabajar en caliente.
  test('ccb y binario declaran raíz relativa al repo', () => {
    for (const alias of ['ccb', 'ccnmt', 'binario']) {
      expect(TRIPLES[alias]!.root.startsWith('/')).toBe(false)
    }
  })
  test('el clon suelto sigue siendo apuntable por entorno', () => {
    expect(resolveRoot('ccb', { CCB_ROOT: '/home/user/claude-code-nestor-monroy-tools' }))
      .toBe('/home/user/claude-code-nestor-monroy-tools')
  })
})
