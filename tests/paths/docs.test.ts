/**
 * T-087 (#15) — las constantes de ruta documental.
 *
 * Analisis: `analisis-constantes-de-ruta-documental.rst`. Espejo de
 * `ccb: packages/permission/src/filesystem.ts` en su FORMA: funciones en vez de
 * literales, memoizadas solo donde el valor debe ser estable, compuestas desde
 * su raiz, y con el predicado hermano que decide si una ruta cae dentro.
 *
 * Los casos de abajo fijan las tres cosas que una constante de solo-prefijo NO
 * cierra: la extension (`source/` no acepta `.md`), la coherencia del submodulo
 * (el prefijo del ID de un hallazgo tiene que ser el de su ruta), y el escape
 * del arbol.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  BINS, DOCS_LAYERS, UNIQUE_ARTIFACTS,
  docsLayer, docsRoot, findingPath, homeFor, initiativeAnalysis, initiativeArtifact,
  initiativeDir, initiativeIndex, isHome, isUnderDocs, resetDocsRootCache, submoduleBin,
  type Home,
} from '../../src/paths/docs.ts'

const conRaiz = (raiz: string, f: () => void) => {
  const previo = process.env.KAUPAMEX_DOCS_ROOT
  process.env.KAUPAMEX_DOCS_ROOT = raiz
  resetDocsRootCache()
  try { f() } finally {
    if (previo === undefined) delete process.env.KAUPAMEX_DOCS_ROOT
    else process.env.KAUPAMEX_DOCS_ROOT = previo
    resetDocsRootCache()
  }
}

afterEach(() => resetDocsRootCache())

describe('docsRoot — la raiz se descubre, no se escribe', () => {
  test('sin variable, resuelve al repo que contiene source/gestion/pm', () => {
    resetDocsRootCache()
    expect(existsSync(join(docsRoot(), 'source', 'gestion', 'pm'))).toBe(true)
  })

  test('la variable de entorno tiene precedencia', () => {
    conRaiz('/tmp/otro-docs', () => expect(docsRoot()).toBe('/tmp/otro-docs'))
  })

  test('honra las grafias canonicas del alcance, no solo la heredada', () => {
    const previo = { ...process.env }
    try {
      delete process.env.KAUPAMEX_DOCS_ROOT
      process.env.THYROX_REACH_DOCS = '/canonica/docs'
      resetDocsRootCache()
      expect(docsRoot()).toBe('/canonica/docs')

      delete process.env.THYROX_REACH_DOCS
      process.env.KAUPAMEX_DOCS = '/heredada/docs'
      resetDocsRootCache()
      expect(docsRoot()).toBe('/heredada/docs')
    } finally {
      for (const k of Object.keys(process.env)) if (!(k in previo)) delete process.env[k]
      Object.assign(process.env, previo)
      resetDocsRootCache()
    }
  })

  test('el arbol declarado compone la raiz del clon', () => {
    const previo = { ...process.env }
    try {
      delete process.env.KAUPAMEX_DOCS_ROOT
      process.env.THYROX_REACH_ROOT = '/arbol'
      resetDocsRootCache()
      expect(docsRoot()).toBe('/arbol/kaupamex-docs')
    } finally {
      for (const k of Object.keys(process.env)) if (!(k in previo)) delete process.env[k]
      Object.assign(process.env, previo)
      resetDocsRootCache()
    }
  })

  test('memoiza: la segunda llamada no vuelve a leer el entorno', () => {
    conRaiz('/tmp/raiz-uno', () => {
      expect(docsRoot()).toBe('/tmp/raiz-uno')
      process.env.KAUPAMEX_DOCS_ROOT = '/tmp/raiz-dos'   // sin reset
      expect(docsRoot()).toBe('/tmp/raiz-uno')
    })
  })
})

describe('las rutas de la iniciativa se componen desde su raiz', () => {
  const base = '/tmp/d/source/gestion/pm/api/iniciativas/portar-stock'

  test('initiativeDir', () => {
    conRaiz('/tmp/d', () => expect(initiativeDir('api', 'portar-stock')).toBe(base))
  })

  test('initiativeIndex es la irregularidad: index.rst sin slug', () => {
    conRaiz('/tmp/d', () => expect(initiativeIndex('api', 'portar-stock')).toBe(`${base}/index.rst`))
  })

  test('los cuatro artefactos unicos toman el slug como tema', () => {
    conRaiz('/tmp/d', () => {
      for (const tipo of ['alcance', 'decisiones', 'tareas', 'progreso'] as const) {
        expect(initiativeArtifact('api', 'portar-stock', tipo)).toBe(`${base}/${tipo}-portar-stock.rst`)
      }
    })
  })

  test('initiativeAnalysis sin tema usa el slug; con tema, el tema', () => {
    // Medido sobre 270 iniciativas: `analisis` es 98 con tema=slug contra 554
    // con tema propio — es el unico artefacto que admite varios por iniciativa.
    conRaiz('/tmp/d', () => {
      expect(initiativeAnalysis('api', 'portar-stock')).toBe(`${base}/analisis-portar-stock.rst`)
      expect(initiativeAnalysis('api', 'portar-stock', 'ciclo-de-vida')).toBe(`${base}/analisis-ciclo-de-vida.rst`)
    })
  })

  test('submoduleBin — los cuatro cajones, medidos en los cinco submodulos', () => {
    conRaiz('/tmp/d', () => {
      expect(submoduleBin('ui', 'lecciones-aprendidas')).toBe('/tmp/d/source/gestion/pm/ui/lecciones-aprendidas')
    })
  })

  test('thyrox es la sexta raiz — ADR-THYROX-001, decision del ejecutor 2026-09-05', () => {
    // `thyrox` NO es una capa del producto: es su proveedor de metodologia. Se
    // aloja en el mismo arbol de PM porque el aparato del repo descubre las
    // raices en vez de enumerarlas (`check-artefactos-minimos.sh:42` globea
    // `pm/*/iniciativas/*/`). Este modulo era el unico consumidor que SI las
    // enumeraba, y por eso el porte no era gratis. Ver h-docs-1097.
    conRaiz('/tmp/d', () => {
      expect(submoduleBin('thyrox', 'audits')).toBe('/tmp/d/source/gestion/pm/thyrox/audits')
      expect(initiativeIndex('thyrox', 'construir-harness-propio'))
        .toBe('/tmp/d/source/gestion/pm/thyrox/iniciativas/construir-harness-propio/index.rst')
      expect(findingPath('thyrox', 'construir-harness-propio', 'H-THYROX-001', 'algo'))
        .toBe('/tmp/d/source/gestion/pm/thyrox/iniciativas/construir-harness-propio/hallazgos/hallazgo-H-THYROX-001-algo.rst')
    })
  })

  test('CONTROL — el prefijo de thyrox discrimina: H-DOCS no se puede construir bajo thyrox', () => {
    // Sin esta mitad el caso de arriba pasaria con FINDING_PREFIX ausente para
    // `thyrox` si `findingPath` no validara — el verde no distinguiria
    // «el prefijo es correcto» de «nadie lo comprueba».
    conRaiz('/tmp/d', () => {
      expect(() => findingPath('thyrox', 'x', 'H-DOCS-1', 'y')).toThrow()
    })
  })
})

describe('findingPath — la coherencia del submodulo, por construccion', () => {
  test('compone hallazgos/hallazgo-<ID>-<corto>.rst', () => {
    conRaiz('/tmp/d', () => {
      expect(findingPath('api', 'portar-stock', 'H-API-259', 'row-scoping'))
        .toBe('/tmp/d/source/gestion/pm/api/iniciativas/portar-stock/hallazgos/hallazgo-H-API-259-row-scoping.rst')
    })
  })

  test('CONTROL — un ID cuyo prefijo no es el del submodulo NO se puede construir', () => {
    // Es el defecto que `check_hallazgo_submodulo.py` persigue despues de que el
    // archivo ya existe: prefijo del ID, `:submodulo:` y ruta tienen que
    // coincidir. La funcion no sabe fabricar la ruta incoherente.
    conRaiz('/tmp/d', () => {
      expect(() => findingPath('api', 'portar-stock', 'H-DOCS-1016', 'algo')).toThrow(/submodulo/i)
    })
  })

  test('un ID con prefijo desconocido tampoco', () => {
    conRaiz('/tmp/d', () => {
      expect(() => findingPath('api', 'portar-stock', 'H-CORE-1', 'algo')).toThrow()
    })
  })
})

describe('la constante produce la extension; el llamador no la elige', () => {
  test('un tema que trae .md se rechaza', () => {
    // La mitad del defecto que una constante de solo-prefijo no cierra: la ruta
    // resolveria y `source/` seguiria sin aceptar `.md`.
    conRaiz('/tmp/d', () => {
      expect(() => initiativeAnalysis('api', 'x', 'tema.md')).toThrow(/\.rst|extension/i)
    })
  })

  test('un slug con separador de ruta se rechaza — no hay escape del arbol', () => {
    conRaiz('/tmp/d', () => {
      expect(() => initiativeDir('api', '../../etc')).toThrow()
      expect(() => initiativeDir('api', 'con/barra')).toThrow()
    })
  })

  test('un slug que no es kebab-case se rechaza', () => {
    conRaiz('/tmp/d', () => {
      expect(() => initiativeDir('api', 'Portar_Stock')).toThrow()
    })
  })
})

describe('isUnderDocs — el predicado hermano', () => {
  test('dentro es true; fuera es false', () => {
    conRaiz('/tmp/d', () => {
      expect(isUnderDocs('/tmp/d/source/gestion/pm/api/index.rst')).toBe(true)
      expect(isUnderDocs('/etc/passwd')).toBe(false)
    })
  })

  test('normaliza antes de comparar: un `..` que sale del arbol es false', () => {
    conRaiz('/tmp/d', () => {
      expect(isUnderDocs('/tmp/d/source/../../etc/passwd')).toBe(false)
    })
  })

  test('CONTROL — no le basta el prefijo de cadena', () => {
    // `/tmp/d-otro` empieza con `/tmp/d` y NO esta dentro. Sin este caso, una
    // implementacion con `startsWith` pelado pasaria los dos de arriba.
    conRaiz('/tmp/d', () => {
      expect(isUnderDocs('/tmp/d-otro/source/x.rst')).toBe(false)
    })
  })

  test('la propia raiz cuenta como dentro', () => {
    conRaiz('/tmp/d', () => expect(isUnderDocs('/tmp/d')).toBe(true))
  })
})

describe('el catalogo flow -> hogar (#53) — declara que produce, la ruta la construye', () => {
  // Los cuatro UNIQUE_ARTIFACTS despachan a initiativeArtifact, con sub Y slug.
  test('un artefacto unico se resuelve como initiativeArtifact(sub, slug, kind)', () => {
    conRaiz('/tmp/d', () => {
      for (const k of UNIQUE_ARTIFACTS) {
        expect(homeFor(k, 'api', 'portar-stock')).toBe(initiativeArtifact('api', 'portar-stock', k))
      }
    })
  })

  test("'analisis' se resuelve como initiativeAnalysis(sub, slug)", () => {
    conRaiz('/tmp/d', () => {
      expect(homeFor('analisis', 'api', 'portar-stock')).toBe(initiativeAnalysis('api', 'portar-stock'))
    })
  })

  // Los cuatro BINS despachan a submoduleBin, con sub y SIN slug.
  test('un cajon del submodulo se resuelve como submoduleBin(sub, bin)', () => {
    conRaiz('/tmp/d', () => {
      for (const b of BINS) {
        expect(homeFor(b, 'api')).toBe(submoduleBin('api', b))
      }
    })
  })

  // Las 15 capas despachan a docsLayer, sin sub ni slug — y existen en disco.
  test('cada capa se resuelve como docsLayer(l) y su directorio existe', () => {
    resetDocsRootCache()
    for (const l of DOCS_LAYERS) {
      expect(homeFor(l)).toBe(docsLayer(l))
      expect(existsSync(docsLayer(l))).toBe(true)
    }
  })

  // El control que hace honesto al hardcode: DOCS_LAYERS <-> disco, en los DOS
  // sentidos. Sin el inverso, la lista podria coincidir hoy por casualidad.
  test('CONTROL bidireccional — DOCS_LAYERS es exactamente el disco (sin `_`)', () => {
    resetDocsRootCache()
    const enDisco = readdirSync(join(docsRoot(), 'source'), { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
      .map((d) => d.name)
      .sort()
    expect(enDisco).toEqual([...DOCS_LAYERS].sort())
  })

  // La aridad no es binaria: cuatro controles distintos de argumento faltante.
  test('la aridad tiene cuatro throws, no uno', () => {
    conRaiz('/tmp/d', () => {
      // Artefacto unico: necesita sub Y slug.
      expect(() => homeFor('alcance')).toThrow()
      expect(() => homeFor('alcance', 'api')).toThrow()
      // 'analisis': necesita sub Y slug.
      expect(() => homeFor('analisis', 'api')).toThrow()
      // Cajon: necesita sub (aunque no slug).
      expect(() => homeFor('audits')).toThrow()
      // …pero con sub NO lanza.
      expect(() => homeFor('audits', 'api')).not.toThrow()
    })
  })

  test('los dos ignores: el cajon ignora slug, la capa ignora sub y slug', () => {
    conRaiz('/tmp/d', () => {
      // Bin ignora el slug sobrante.
      expect(homeFor('audits', 'api', 'slug-de-mas')).toBe(submoduleBin('api', 'audits'))
    })
    // DocsLayer ignora sub y slug (raiz real: docsLayer compone sin verificar).
    conRaiz('/tmp/d', () => {
      expect(homeFor('backend', 'api', 'slug-de-mas')).toBe(docsLayer('backend'))
    })
  })

  test('isHome reconoce cada miembro de los tres arreglos y `analisis`', () => {
    for (const m of [...UNIQUE_ARTIFACTS, ...BINS, ...DOCS_LAYERS, 'analisis']) {
      expect(isHome(m)).toBe(true)
    }
    // Falsos: derivado de un hogar, una ruta (no un segmento), y el vacio.
    expect(isHome('analisis-foo')).toBe(false)
    expect(isHome('gestion/pm')).toBe(false)
    expect(isHome('')).toBe(false)
  })

  test('el guard runtime no confia en el tipo: un `as Home` invalido lanza', () => {
    conRaiz('/tmp/d', () => {
      expect(() => homeFor('analisis-foo' as Home, 'api', 'portar-stock')).toThrow()
    })
  })
})
