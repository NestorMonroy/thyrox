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
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  TRIPLES, EXTRACTORS, referenceTriple, resolveRoot, requireRoot,
  declaredAlias, checkPortDeclaration, canonicalAlias, sameCorpus,
} from '../../src/reference/triple.ts'

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
  /**
   * CORREGIDO (#294) — la intencion se conserva, el instrumento no.
   *
   * Este bloque exigia que `ccb`, `ccnmt` y `binario` declararan raiz
   * RELATIVA, con este razonamiento: «un clon bajo /home/user muere con el
   * contenedor; la raiz por defecto de un corpus versionado es su ruta en el
   * repo». La intencion era la DURABILIDAD y es correcta. Lo que estaba mal
   * era el proxy: una ruta relativa no hace durable nada — hace que resuelva
   * contra el cwd, que es otra cosa y ademas variable.
   *
   * Medido: las tres relativas no resolvian a ningun directorio desde este
   * arbol. `.claude/eventos/recibir-…` nombraba un banco de `kaupamex-docs`
   * —que SI existe y SI esta versionado, 3895 archivos— y vino con el modulo
   * al portarlo; `tools/claude-code-bin` nombraba una raiz que el corpus ya
   * no ocupa. El control pasaba en verde sobre las dos.
   *
   * La durabilidad se afirma ahora por lo que de verdad la produce: la raiz se
   * DERIVA de un ancla declarada —`thyroxRoot()` para lo vendorizado,
   * `treeRoot()` para un hermano— y el bloque #294 comprueba que existe.
   */
  test('ccb y binario derivan su raiz de un ancla, no de un literal', () => {
    // `_references/` es el hogar del material vendorizado; el corpus de ccb
    // sigue fuera hasta que #207 decida su postura de licencia.
    expect(TRIPLES.binario!.root).toContain('_references')
    for (const alias of ['ccb', 'ccnmt', 'binario']) {
      expect(TRIPLES[alias]!.root.startsWith('/')).toBe(true)
    }
  })
  test('la copia versionada sigue siendo apuntable por entorno', () => {
    expect(resolveRoot('ccb', { CCB_ROOT: '/home/user/claude-code-nestor-monroy-tools' }))
      .toBe('/home/user/claude-code-nestor-monroy-tools')
  })
})

describe('la raiz declarada tiene que existir y ser absoluta (#294)', () => {
  /**
   * QUE FALTABA. Los tests de arriba miden la FORMA del catalogo —que cada
   * triple traiga sus tres componentes, que el entorno gane, que un alias
   * desconocido se rehuse— y ninguno pregunta si la raiz **resuelve a algo**.
   * Es el sub-patron C: se mide el significante (hay una cadena no vacia) y se
   * concluye sobre el significado (hay un arbol que leer).
   *
   * MITAD ROJA, medida antes del arreglo: 3 de las 9 raices no existen.
   *
   *   AUSENTE  binario   tools/claude-code-bin
   *   AUSENTE  ccb       .claude/eventos/recibir-nestor-monroy-tools-.../extraido/...
   *   AUSENTE  hccw      /home/user/scratchpad/hccw/how-claude-code-works-main
   *
   * Y dos de las tres son ademas RELATIVAS, que es la misma clase que la
   * aritmetica `parents[N]` que este arbol ya prohibio (#228): describen el
   * directorio desde el que alguien las escribio, no un sitio del arbol. Con
   * otro cwd resuelven a otra cosa sin fallar.
   *
   * `requireRoot` rehusa ante una raiz ausente —esa mitad ya estaba— pero
   * rehusar no es lo mismo que apuntar bien: un corpus vendorizado que EXISTE
   * y al que el catalogo no llega es capacidad muerta, no una precondicion que
   * el consumidor deba declarar.
   */
  test('ninguna raiz del catalogo es relativa', () => {
    const relativas = Object.entries(TRIPLES)
      .filter(([, t]) => !t.root.startsWith('/'))
      .map(([alias]) => alias)
    expect(relativas).toEqual([])
  })

  test('toda raiz declarada resuelve a un directorio que existe', () => {
    // El denominador va junto al conteo: un `0 ausentes` sin decir sobre
    // cuantas raices se midio no distingue un catalogo sano de uno vacio.
    const ausentes = Object.keys(TRIPLES).filter((a) => !existsSync(resolveRoot(a)))
    expect({ ausentes, medidas: Object.keys(TRIPLES).length })
      .toEqual({ ausentes: [], medidas: 9 })
  })
})
