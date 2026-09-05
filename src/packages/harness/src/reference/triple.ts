/**
 * El TRIPLE de referencia, declarado una vez (#79 → el procedimiento aprobado
 * `proc-construccion-guiada-por-referencia`).
 *
 * Fuente del porte: `api: scripts/reference_roots.py`, que resolvió la RAÍZ
 * para Odoo y dejó escrita su razón —*«cada gate con su copia de la ruta es
 * exactamente la segunda fuente de verdad que `calibration-verified-numbers.md`
 * prohíbe, y su modo de fallo es silencioso: un gate que apunta a una raíz
 * vacía publica 0 incumplidores y parece sano»*—. Ese cero ya se pagó una vez
 * (h-api-335).
 *
 * Lo que este módulo añade es lo que allí no cabía: el procedimiento **no se
 * parametriza por una ruta, sino por un triple** — dónde vive la fuente, cómo
 * se leen sus símbolos, y cómo se ancla la cita. Con sólo la raíz en código,
 * los otros dos tercios se quedan en prosa; y lo que vive sólo en prosa es
 * fácil de olvidar o de no considerar, que es la razón por la que este archivo
 * existe.
 *
 * SÓLO LECTURA sobre toda referencia: ni `checkout`, ni `add`, ni edición —
 * `referencia-odoo-gobierna-las-decisiones.md`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Cómo se leen los símbolos de una referencia. Uno por familia de fuente. */
export const EXTRACTORS = ['python-ast', 'strings-regex', 'source-read', 'prose-read'] as const
export type Extractor = typeof EXTRACTORS[number]

export type ReferenceTriple = {
  /** Cómo se ancla la cita — el prefijo que un puerto escribe en su cabecera. */
  alias: string
  /** Dónde vive la fuente. */
  root: string
  /** Cómo se leen sus símbolos. */
  extractor: Extractor
  /** La variable de entorno que sobreescribe la raíz. Una por alias. */
  envVar: string
}

const TOOLS = process.env.ODOO_TOOLS ?? '/home/user/odoo-tools'

// La raíz de `ccb` es la copia VERSIONADA, no el clon suelto de `/home/user/`.
// Los dos son byte a byte el mismo árbol (comprobado con `cmp` sobre
// `bgDaemon.ts`), pero sólo uno sobrevive al contenedor: el clon suelto muere
// con él, y una referencia que muere deja sin resolver toda cita que la use —
// la misma lección que `build-logs.md` fija para un `.log`. El clon sigue
// sirviendo para trabajar en caliente: `CCB_ROOT=/home/user/... ` lo apunta.
//
// OJO: `.claude/references/ccb/` NO es esta raíz. Es un extracto CURADO de una
// entrega ANTERIOR (2026-08-13): un solo archivo, 860 líneas contra 857, con
// otro namespace de paquete (`@claude-code/` contra `@claude-code-how-works/`)
// y una cabecera de procedencia añadida por nosotros. Sirve para leer con su
// PROVENANCE.md al lado; no para medir el corpus.
const CCB_VERSIONADO = join(
  '.claude', 'eventos', 'recibir-nestor-monroy-tools-20260827T191257',
  'extraido', 'claude-code-nestor-monroy-tools',
)
// El árbol de Odoo está TRIPLICADO en odoo-tools — artefacto de empaquetado, no
// diseño, y por tanto candidato a aplanarse. El día que se aplane se corrige
// aquí y en ningún otro sitio; es la misma razón por la que reference_roots.py
// existe en api.
const odoo = (alias: string, ...partes: string[]): ReferenceTriple => ({
  alias, root: join(TOOLS, ...partes), extractor: 'python-ast', envVar: alias.toUpperCase(),
})

/**
 * Las instancias PRESENTES en el árbol. El n no es un universo cerrado: es lo
 * que hay, y una cuarta referencia se añade aquí, no se supone.
 */
export const TRIPLES: Record<string, ReferenceTriple> = {
  odoo19c: odoo('odoo19c', '19.x', 'odoo-19.0', 'odoo-19.0', 'odoo-19.0'),
  odoo19e: odoo('odoo19e', '19.x', 'odoo19-enterprise-main', 'odoo19-enterprise-main', 'odoo19-enterprise-main'),
  odoo18c: odoo('odoo18c', '18.x', 'odoo-18'),
  odoo18e: odoo('odoo18e', '18.x', 'odoo.enterprise'),
  // El binario: su alias de cita es la VERSIÓN del ejecutable, y su raíz es el
  // corpus versionado de esa build. `binaryTriple(version)` construye el suyo.
  binario: {
    alias: 'binario',
    root: join('tools', 'claude-code-bin'),
    extractor: 'strings-regex',
    envVar: 'CLAUDE_CODE_BIN_CORPUS',
  },
  // ccb — el CÓDIGO derivado: 2925 archivos .ts, reconstruidos del sourcemap
  // de la v2.1.88 según su propio ATTRIBUTION.md. No es el binario que corre:
  // es cómo estaba escrito en OTRA versión, así que nombra símbolos que el
  // ejecutable minifica y no prueba conducta de la nuestra.
  ccb: {
    alias: 'ccb',
    root: CCB_VERSIONADO,
    extractor: 'source-read',
    envVar: 'CCB_ROOT',
  },
  // `ccnmt` es el MISMO árbol que `ccb`, con el alias tomado del nombre del
  // directorio en vez del corpus (su package.json declara `name: ccb`). Se
  // declara aquí —con la misma raíz— para que quien resuelva un alias no pueda
  // creer que son dos fuentes: 25 citas `ccb:` y 11 `ccnmt:` sobre un solo
  // corpus leían como corroboración triple siendo doble (h-docs-1041).
  ccnmt: {
    alias: 'ccnmt',
    root: CCB_VERSIONADO,
    extractor: 'source-read',
    envVar: 'CCB_ROOT',
  },
  // hccw — la PROSA de un tercero, en capítulos numerados. Mide la versión que
  // su autor leyó (2.1.202), no la nuestra: su valor es el encuadre, no el
  // hecho. Confundirlo con `ccb` es fácil y está medido — son dos árboles.
  hccw: {
    alias: 'hccw',
    root: '/home/user/scratchpad/hccw/how-claude-code-works-main',
    extractor: 'prose-read',
    envVar: 'HCCW_ROOT',
  },
  // ui: la referencia es el fuente de los componentes, leído tal cual.
  'ui-core': {
    alias: 'ui-core',
    root: '/home/user/-progress',
    extractor: 'source-read',
    envVar: 'PROGRESS_ROOT',
  },
}

/**
 * Alias que nombran el MISMO árbol. La clave es el alias histórico; el valor,
 * el canónico. Un análisis que apoye su peso en los dos está contando una
 * fuente dos veces (h-docs-1041).
 */
export const ALIAS_SINONIMOS: Record<string, string> = { ccnmt: 'ccb' }

/** El alias canónico de `alias` — él mismo si no es sinónimo de otro. */
export function canonicalAlias(alias: string): string {
  return ALIAS_SINONIMOS[alias] ?? alias
}

/** ¿Dos alias resuelven al mismo corpus? Lo que impide contar una fuente dos veces. */
export function sameCorpus(a: string, b: string): boolean {
  return canonicalAlias(a) === canonicalAlias(b)
}

/**
 * El triple de una build concreta del ejecutable. Su alias ES la versión — el
 * corpus se archiva por build (`_references/claude-code-bin/<version>/`), así que una
 * cita sin versión no ancla nada: dos builds dan cifras distintas.
 */
export function binaryTriple(version: string, repoRoot = '.'): ReferenceTriple {
  return {
    alias: version,
    root: join(repoRoot, 'tools', 'claude-code-bin', version),
    extractor: 'strings-regex',
    envVar: 'CLAUDE_CODE_BIN_CORPUS',
  }
}

/** El triple del alias. Rehúsa nombrando los que sí existen. */
export function referenceTriple(alias: string): ReferenceTriple {
  const t = TRIPLES[alias]
  if (!t) {
    throw new Error(`alias de referencia desconocido: '${alias}' — declarados: ${Object.keys(TRIPLES).join(' · ')}`)
  }
  return t
}

/** La raíz del alias, con el entorno ganando sobre el default. */
export function resolveRoot(alias: string, env: NodeJS.ProcessEnv = process.env): string {
  const t = referenceTriple(alias)
  return env[t.envVar] ?? t.root
}

/**
 * La raíz, exigiendo que exista. Es el guard que impide el cero silencioso: un
 * gate apuntado a una raíz ausente no encuentra nada y publica «0
 * incumplidores», que se lee como sano.
 */
export function requireRoot(alias: string, env: NodeJS.ProcessEnv = process.env): string {
  const r = resolveRoot(alias, env)
  if (!existsSync(r)) {
    const t = referenceTriple(alias)
    throw new Error(
      `la raíz de '${alias}' no existe: ${r}. NO se emite conteo — un 0 aquí sería ` +
      `un verde falso. Sobreescríbela con ${t.envVar}=<ruta>.`,
    )
  }
  return r
}

// Un alias declarado: los de Odoo, la versión del ejecutable, o el paquete de
// ui. La versión lleva `\d+\.\d+\.\d+` para no confundirse con una cifra suelta.
const ALIAS_RE = /\b(odoo1[89][ce]|ccnmt|ccb|hccw|ui-core-\d+\.\d+\.\d+|@progress\/kno-[a-z-]+|\d+\.\d+\.\d{2,3})\b/

/** El alias de referencia que un texto declara, o `null`. */
export function declaredAlias(text: string): string | null {
  return ALIAS_RE.exec(text)?.[1] ?? null
}

export type PortProblem = { problem: string }

/**
 * Paso 4 del procedimiento hecho gate: **un puerto declara su procedencia**.
 *
 * Mide la presencia del alias, no su verdad: que un archivo diga `odoo19c:` no
 * prueba que porte fielmente ese símbolo — eso es el paso 6 (#81), y son dos
 * mediciones distintas. Éste sólo impide que un puerto llegue sin decir de
 * dónde viene.
 */
export function checkPortDeclaration(file: string): PortProblem[] {
  if (!existsSync(file)) return [{ problem: `el archivo no existe: ${file}` }]
  const alias = declaredAlias(readFileSync(file, 'utf8'))
  if (alias) return []
  return [{
    problem: `sin procedencia declarada: ${file} no cita ningún alias de referencia ` +
      `(${Object.keys(TRIPLES).join(' · ')} o la versión del ejecutable)`,
  }]
}
