/**
 * Las constantes de ruta del arbol documental (#15).
 *
 * Analisis: `analisis-constantes-de-ruta-documental.rst`. Espejo de
 * `ccb: packages/permission/src/filesystem.ts` en su FORMA, no en su
 * contenido — sus cinco propiedades, y las cinco cambian el diseno:
 *
 * 1. **Son funciones**, no literales: se resuelven contra el estado.
 * 2. **Se memoizan segun su estabilidad**: solo `docsRoot`, cuyo valor no
 *    cambia en la vida del proceso.
 * 3. **Se componen**: la hoja se construye desde su raiz, nunca repitiendo el
 *    prefijo.
 * 4. **Documentan su forma**: cada una lleva su `Path format:`.
 * 5. **Traen un predicado hermano** (`isUnderDocs`), que normaliza antes de
 *    comparar. Es lo que convierte esto en gobierno: una constante no es «la
 *    cadena», es la cadena mas la pregunta de si un camino le pertenece.
 *
 * Y la regla que las hace gobierno y no azucar: **un skill no escribe una ruta
 * literal**. Declara que produce y a que iniciativa pertenece; la ruta la
 * construye la constante — que ademas **produce la extension**, porque
 * `source/` no acepta `.md` y una constante de solo-prefijo no cierra esa
 * mitad del defecto.
 *
 * Ese contrato tiene dos mitades. La de «a que iniciativa pertenece -> ruta»
 * son los builders de abajo (`initiativeArtifact`, `submoduleBin`, …). La de
 * «declara QUE produce -> hogar» es el catalogo del final (#53): el vocabulario
 * `Home`, su guard `isHome`, y el despachador `homeFor` que traduce un hogar
 * declarado al builder correcto. Asi un skill nombra `alcance`, `audits` o
 * `backend`, no una ruta.
 */
import { join, relative, resolve, sep } from 'node:path'

import { root as reachRoot } from './reach.ts'

/**
 * Las raices de trabajo que el arbol de docs documenta.
 *
 * Cinco son capas del **producto** kaupamex; `thyrox` es su **proveedor** de
 * metodologia, alojado aqui por ADR-THYROX-001 (decision del ejecutor
 * 2026-09-05). El nombre del tipo conserva `Submodule` porque es el vocabulario
 * del arbol —la clave `submodulos:` de `.claude/CLAUDE.md`— y renombrarlo tiene
 * su propio radio: tarea #169. Ninguna de las seis es un submodulo de git desde
 * que el superproyecto quedo ausente por decision (2026-08-07).
 */
export type Submodule = 'api' | 'db' | 'docs' | 'server' | 'ui' | 'thyrox'

/**
 * Los cuatro cajones que existen en los cinco submodulos, medido.
 *
 * Arreglo `as const` como fuente unica: el tipo se deriva de el
 * (`typeof BINS[number]`), asi que `isHome` puede preguntar por membresia en
 * runtime sin una segunda lista que se desincronice.
 */
export const BINS = ['audits', 'checklists', 'lecciones-aprendidas', 'matrices'] as const
export type Bin = typeof BINS[number]

/**
 * Los artefactos de los que hay **uno por iniciativa**.
 *
 * Medido sobre 270 iniciativas: `alcance` 226/8, `decisiones` 123/5,
 * `progreso` 198/14, `tareas` 132/8 (tema = slug / tema propio). Por eso la
 * constante no toma tema para estos cuatro. `analisis` va aparte: 98 contra
 * **554**, o sea varios por iniciativa — `initiativeAnalysis`.
 *
 * Arreglo `as const` por la misma razon que `BINS`: fuente unica, tipo
 * derivado, membresia verificable en runtime.
 */
export const UNIQUE_ARTIFACTS = ['alcance', 'decisiones', 'tareas', 'progreso'] as const
export type UniqueArtifact = typeof UNIQUE_ARTIFACTS[number]

/** El tramo comun: donde vive el project management dentro del repo de docs. */
const PM = join('source', 'gestion', 'pm')

/** kebab-case estable, sin prefijo numerico de secuencia (`convention-naming.md`). */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Prefijo del ID de hallazgo por raiz — los cinco del producto medidos en el
 * arbol, mas `H-THYROX` que ADR-THYROX-001 declara para la sexta.
 *
 * `check_hallazgo_submodulo.py:37` NO necesita esta tabla: deriva el prefijo
 * del nombre del archivo con `hallazgo-H-(?P<prefijo>[A-Z]+)-`. Aqui existe
 * para que `findingPath` pueda **rechazar** un ID cuyo prefijo no corresponda
 * a la raiz — la coherencia por construccion, antes de que el gate la mida.
 */
const FINDING_PREFIX: Record<Submodule, string> = {
  api: 'H-API', db: 'H-DB', docs: 'H-DOCS', server: 'H-SERVER', ui: 'H-UI',
  thyrox: 'H-THYROX',
}

let memoizedRoot: string | null = null

/**
 * La grafia HEREDADA de la raiz de docs, con sus consumidores vivos.
 *
 * No es una de las dos canonicas que `envNames('docs')` deriva
 * (`THYROX_REACH_DOCS`, `KAUPAMEX_DOCS`): es un tercer nombre, acunado aqui
 * antes de que el alcance existiera, y en el se filtro al identificador del
 * mecanismo el parametro que gobierna (tarea #142). Se conserva de PRIMERA por
 * el mismo criterio con que `reach` conserva `KAUPAMEX_ROOT`: tiene sitios
 * vivos que la declaran, y retirarla los rompe. Su retiro es la #142, no este
 * pase.
 */
export const DOCS_ROOT_LEGACY_VAR = 'KAUPAMEX_DOCS_ROOT'

/**
 * Raiz del repo de docs. Memoizada: no cambia en la vida del proceso.
 *
 * Path format: el directorio que contiene `source/gestion/pm/`.
 *
 * **La decision no vive aqui: la toma `reach.root('docs')`.** Hasta hoy este
 * modulo tenia su propia cadena —una variable con grafia propia mas un ascenso
 * a `source/gestion/pm/`—, o sea una segunda fuente de verdad para la misma
 * pregunta que el alcance ya respondia. Un consumidor que declarara
 * `THYROX_REACH_DOCS` movia todos los gates en Python y no movia esto.
 *
 * Quedan dos pasos, en orden:
 *
 * 1. `KAUPAMEX_DOCS_ROOT`, la grafia heredada — ver arriba por que sigue.
 * 2. `reach.root('docs')`: las dos grafias canonicas por raiz, y si ninguna,
 *    el clon `kaupamex-docs` compuesto sobre el arbol (declarado o ascendido).
 *
 * Si ninguna resuelve, `reach` **lanza**: devolver una raiz inventada haria
 * que toda ruta derivada apuntara a un arbol que no existe, y el fallo
 * aparecerian turnos despues como un archivo escrito en el sitio equivocado.
 */
export function docsRoot(): string {
  if (memoizedRoot !== null) return memoizedRoot
  const declared = process.env[DOCS_ROOT_LEGACY_VAR]
  if (declared) return (memoizedRoot = resolve(declared))
  return (memoizedRoot = reachRoot('docs', import.meta.dir))
}

/** Olvida la raiz memoizada. Para pruebas y para un cambio de raiz explicito. */
export function resetDocsRootCache(): void {
  memoizedRoot = null
}

function assertSlug(value: string, field: string): void {
  if (!SLUG.test(value)) {
    throw new Error(
      `${field} invalido: ${JSON.stringify(value)}. Se espera kebab-case ` +
      '(minusculas, digitos y guion medio) — sin separador de ruta, sin extension.',
    )
  }
}

/** Path format: `<docsRoot>/source/gestion/pm/<sub>/iniciativas/<slug>/` */
export function initiativeDir(sub: Submodule, slug: string): string {
  assertSlug(slug, 'slug de iniciativa')
  return join(docsRoot(), PM, sub, 'iniciativas', slug)
}

/**
 * Path format: `<initiativeDir>/index.rst`
 *
 * La irregularidad del conjunto, explicita: es el unico artefacto que no lleva
 * el slug en su nombre.
 */
export function initiativeIndex(sub: Submodule, slug: string): string {
  return join(initiativeDir(sub, slug), 'index.rst')
}

/** Path format: `<initiativeDir>/<kind>-<slug>.rst` — uno por iniciativa. */
export function initiativeArtifact(sub: Submodule, slug: string, kind: UniqueArtifact): string {
  return join(initiativeDir(sub, slug), `${kind}-${slug}.rst`)
}

/**
 * Path format: `<initiativeDir>/analisis-<topic>.rst`
 *
 * Varios por iniciativa; el tema por defecto es el slug.
 */
export function initiativeAnalysis(sub: Submodule, slug: string, topic?: string): string {
  const name = topic ?? slug
  assertSlug(name, 'tema de analisis')
  return join(initiativeDir(sub, slug), `analisis-${name}.rst`)
}

/**
 * Path format: `<initiativeDir>/hallazgos/hallazgo-<ID>-<short>.rst`
 *
 * El ID declara la capa tres veces —prefijo, `:submodulo:` y ruta— y las tres
 * tienen que coincidir (`hallazgos-documentacion-obligatoria.md`). Aqui la
 * coherencia es **por construccion**: la funcion no sabe fabricar la ruta
 * incoherente, asi que el gate que la persigue despues no tiene que verla.
 */
export function findingPath(sub: Submodule, slug: string, id: string, short: string): string {
  const expected = FINDING_PREFIX[sub]
  if (!new RegExp(`^${expected}-\\d+$`).test(id)) {
    throw new Error(
      `ID de hallazgo ${JSON.stringify(id)} no corresponde al submodulo ${sub}: ` +
      `se espera ${expected}-<N>.`,
    )
  }
  assertSlug(short, 'slug corto del hallazgo')
  return join(initiativeDir(sub, slug), 'hallazgos', `hallazgo-${id}-${short}.rst`)
}

/** Path format: `<docsRoot>/source/gestion/pm/<sub>/<bin>/` */
export function submoduleBin(sub: Submodule, bin: Bin): string {
  return join(docsRoot(), PM, sub, bin)
}

/**
 * El predicado hermano: ¿esta ruta pertenece al arbol documental?
 *
 * Normaliza antes de comparar, y compara **por segmento**: un `startsWith`
 * pelado daria `true` para `<docsRoot>-otro/x`, que esta fuera.
 */
export function isUnderDocs(p: string): boolean {
  const rel = relative(docsRoot(), resolve(p))
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith(`${sep}`) && !resolve(p).startsWith('..'))
}

/**
 * Las capas de primer nivel bajo `source/` — el hogar de un artefacto que
 * NO vive en una iniciativa (un ADR de backend, un caso de uso, una norma).
 *
 * El conteo **no se transcribe a esta prosa**: es propiedad de un arreglo que
 * crece (`calibration-verified-numbers.md`). `DOCS_LAYERS.length` lo publica.
 *
 * **Es el disco entero, no una seleccion curada, y a proposito.** Curar exige
 * un criterio (p. ej. «solo las capas citadas por algun coordinador»), y ese
 * criterio es la segunda fuente de verdad que driftea en cuanto una capa nueva
 * aparece sin que nadie toque esta lista. El disco es la unica fuente que no
 * puede desincronizarse de si misma; el test bidireccional `DOCS_LAYERS <->
 * disco` lo hace cumplir en los dos sentidos, filtrando las entradas `_`
 * (`_static`, `__pycache__` — artefactos de Sphinx/Python, no capas).
 *
 * `docs` y `thyrox` coinciden con nombres de `Submodule`, pero `Submodule` NO
 * es miembro de `Home` — no hay ambiguedad de tipo. En los dos casos la
 * coincidencia es real y no accidental: `source/docs/` documenta el stack de
 * documentacion y `source/thyrox/` la implementacion de THYROX, mientras
 * `pm/docs/` y `pm/thyrox/` llevan su gestion. Y `gestion` entra: es una
 * capa real (`plantilla-adr.rst`, `decisiones/` viven ahi), aunque su subarbol
 * `pm/` lo gobiernen los builders de iniciativa.
 *
 * Métrica: los directorios de primer nivel bajo `source/` sin prefijo `_`,
 * medidos con `ls -d source/<capa>/`.
 * Ciega a: la cita de cada capa por un coordinador. Al fijar el catalogo,
 * medido `grep` sobre `.claude/agents/*-coordinator.md`: 15 en disco, 12
 * citadas, 3 sin cita (`docs`, `negocio`, `operaciones`); la capa `gestion`
 * aparece 34 veces bajo `source/gestion/pm/` y 2 bajo `source/gestion/<otro>`.
 * Esa cobertura NO se usa para curar la lista — ver arriba por que.
 */
export const DOCS_LAYERS = [
  'arquitectura-tecnica', 'backend', 'base-cognitiva', 'databases', 'devops',
  'docs', 'frontend', 'gestion', 'negocio', 'normativa', 'onboarding',
  'operaciones', 'quality', 'requisitos', 'risks-technical-debt', 'thyrox',
] as const
export type DocsLayer = typeof DOCS_LAYERS[number]

/**
 * El vocabulario de hogares que un skill puede declarar. Cuatro clases:
 * los cuatro artefactos unicos de iniciativa, `analisis` (varios por
 * iniciativa), los cuatro cajones de la raiz, y las capas de `source/`.
 */
export type Home = UniqueArtifact | 'analisis' | Bin | DocsLayer

/**
 * Guard de runtime. No confia en el tipo: un `as Home` invalido (o cualquier
 * cadena venida de datos) se rechaza aqui, no en el despacho. Pregunta por
 * membresia en los tres arreglos `as const` —que son la fuente unica— mas el
 * literal `analisis`.
 */
export function isHome(s: string): s is Home {
  return (UNIQUE_ARTIFACTS as readonly string[]).includes(s)
    || s === 'analisis'
    || (BINS as readonly string[]).includes(s)
    || (DOCS_LAYERS as readonly string[]).includes(s)
}

/**
 * Path format: `<docsRoot>/source/<layer>/`
 *
 * **No verifica que el directorio exista** — compone la ruta y ya. La
 * existencia de las 15 capas la guarda el CONTROL bidireccional
 * `DOCS_LAYERS` <-> disco de `__tests__/paths.test.ts`: falla si una capa
 * declarada no tiene directorio, o si un directorio de `source/` no esta
 * declarado. Ese es el gate DMAIC-control del hardcode de este builder, no un
 * control en el sitio de llamada.
 *
 * El gate del hogar `source/…` que una DEFINICION de agente cita por su `flow`
 * —la clase de :ref:`h-docs-1021`— vive en el otro paquete:
 * `definitionsWithMissingHomes` de `@thyrox/agent`, que valida la definicion
 * (la causa), no el `.md` emitido (el sintoma).
 */
export function docsLayer(layer: DocsLayer): string {
  return join(docsRoot(), 'source', layer)
}

/**
 * Traduce un hogar declarado a su ruta, despachando al builder correcto.
 *
 * La aridad **no es binaria**: hay cuatro controles distintos de argumento
 * faltante, no uno.
 *
 * - **Artefacto unico** (`alcance`, `decisiones`, `tareas`, `progreso`):
 *   necesita `sub` **y** `slug` — es un archivo dentro de una iniciativa.
 * - **`analisis`**: igual, `sub` **y** `slug`.
 * - **Cajon** (`audits`, …): necesita solo `sub`; `submoduleBin` no toma slug,
 *   asi que un `slug` pasado se **ignora**.
 * - **Capa** (`backend`, …): no necesita nada; `sub` y `slug` se **ignoran**.
 *
 * `homeFor` NO valida `sub` en runtime (los cinco submodulos son un tipo, no un
 * arreglo `as const`); ese refuerzo, si se decide, es de la migracion #50. Y no
 * expone el `topic` opcional de `initiativeAnalysis`: un skill que necesite un
 * tema propio llama al builder directo.
 */
export function homeFor(home: Home, sub?: Submodule, slug?: string): string {
  if (!isHome(home)) {
    throw new Error(
      `hogar desconocido: ${JSON.stringify(home)}. Debe ser un artefacto unico ` +
      `(${UNIQUE_ARTIFACTS.join(', ')}), 'analisis', un cajon (${BINS.join(', ')}) ` +
      'o una capa de source/.',
    )
  }

  // Capa: no necesita sub ni slug.
  if ((DOCS_LAYERS as readonly string[]).includes(home)) {
    return docsLayer(home as DocsLayer)
  }

  // Cajon: necesita sub; ignora slug.
  if ((BINS as readonly string[]).includes(home)) {
    if (sub === undefined) {
      throw new Error(`el cajon '${home}' necesita un submodulo: homeFor('${home}', <sub>).`)
    }
    return submoduleBin(sub, home as Bin)
  }

  // 'analisis': necesita sub Y slug.
  if (home === 'analisis') {
    if (sub === undefined || slug === undefined) {
      throw new Error("'analisis' necesita submodulo y slug: homeFor('analisis', <sub>, <slug>).")
    }
    return initiativeAnalysis(sub, slug)
  }

  // Artefacto unico: necesita sub Y slug.
  if (sub === undefined || slug === undefined) {
    throw new Error(`el artefacto '${home}' necesita submodulo y slug: homeFor('${home}', <sub>, <slug>).`)
  }
  return initiativeArtifact(sub, slug, home as UniqueArtifact)
}
