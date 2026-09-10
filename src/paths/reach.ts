/**
 * La contraparte TypeScript de `reach.py`, acotada a sus consumidores reales.
 *
 * PORTE PARCIAL DECLARADO, y su tramo de árbol YA NO lo es. Se portan
 * `readEnvFile`, `envFilePath`, `envValue` y `thyroxRoot`, más `agentsDir`,
 * que la mitad Python no declara porque ningún consumidor suyo emite
 * artefactos de agente; y desde hoy también el tramo del árbol de clones
 * —`cloneName`, `cloneNames`, `envNames`, `treeRoot`, `root`, `roots`,
 * `extraRoots`, `reach`—, que la nota anterior daba por no portado *porque
 * ningún `.ts` lo consultaba*. Ya lo consulta: `paths/docs.ts` resuelve la
 * raíz de `kaupamex-docs`, y hasta hoy lo hacía con su PROPIA cadena
 * (`KAUPAMEX_DOCS_ROOT` + ascenso a `source/gestion/pm/`) — una segunda
 * fuente de verdad para una decisión que este módulo ya tomaba.
 *
 * `consumerRoot` se porta el 2026-09-06 por la misma razón: su docstring lo
 * declaraba sin consumidor en TS, y apareció uno — la resolución del store de
 * sesiones, cuya mitad Python (`store/agent_sessions.py`) excluye la ruta a
 * propósito («la resolución de rutas es del consumidor») mientras la mitad TS
 * la clavaba al clon de docs. Un porte parcial declarado se completa cuando
 * aparece su consumidor, no se deja con la nota —
 * `porte-completo-no-parcial.md`.
 *
 * Lo que sigue SIN portar, y su razón: `paths` y `requireAll` (su consumidor
 * es la familia de gates en Python) y `main` (el CLI).
 *
 * Divergencia respecto de la fuente, declarada: `thyroxRoot` NO tiene el
 * tercer paso —el barrido de hermanos vía `treeRoot`—, que la mitad Python sí
 * hace. Ahora que `treeRoot` está portado el paso es construible; queda fuera
 * de este pase porque cambiaría la resolución de la raíz del PROVEEDOR, que
 * no es lo que el consumidor nuevo necesita, y su control es otro.
 *
 * El defecto que cierra: 12 archivos `.ts` de este árbol resuelven su raíz con
 * aritmética de ruta (`join(dir, '..','..','..','..')`), que es la forma que
 * el docstring de `reach.py` declara que **falla en silencio** al mover el
 * archivo un nivel. Ya falló aquí: el renombre que llevó `.claude/agents/` a
 * `src/agents/definitions/` dejó dos rutas atrás y el control byte a byte
 * apuntó semanas a un directorio que no existe.
 */
import { homedir } from 'node:os'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Dónde buscar el archivo de entorno, si no se declara uno explícito. */
export const ENV_FILE_VAR = 'THYROX_ENV_FILE'
export const ENV_FILE_NAME = '.env'

/** La variable que declara la raíz de THYROX mismo. */
export const THYROX_ROOT_VAR = 'THYROX_ROOT'

/**
 * El marcador por el que se reconoce la raíz de thyrox al ascender. Es un
 * ARCHIVO y no el nombre del directorio a propósito: un clon renombrado o
 * copiado sigue siendo thyrox, y un directorio llamado `thyrox` sin el
 * mecanismo dentro no lo es.
 */
export const THYROX_MARKER = join('src', 'paths', 'reach.py')

/** La variable que declara dónde se emiten los artefactos de agente. */
export const AGENTS_DIR_VAR = 'THYROX_AGENTS_DIR'

/** El hogar propio, relativo a la raíz de thyrox, cuando nadie declara otro. */
export const AGENTS_DIR_DEFAULT = join('src', 'agents', 'definitions')

export class ReachRootError extends Error {}

/**
 * No se pudo determinar el clon consumidor, y no se inventa uno.
 *
 * Contraparte de `ConsumerUnknownError` de `reach.py`. Esta mitad NO la tenia:
 * `consumerRoot` devolvia la raiz del PROVEEDOR en silencio cuando el ascenso
 * aterrizaba en el, y el llamador componia con ella un hogar que
 * `declarations.py` no lista — que es exactamente la via por la que once
 * bancos aterrizaron en el arbol de thyrox (L-028).
 */
export class ConsumerUnknownError extends Error {}

/**
 * Analiza un `.env` y devuelve sus pares, sin librería de terceros.
 *
 * Cubre lo mismo que la mitad Python: comentarios, líneas en blanco, el
 * prefijo `export` y comillas alrededor del valor. Una línea sin `=` se
 * descarta en silencio — rehusar el archivo entero por una línea suelta
 * dejaría al consumidor sin ninguna de las buenas. No expande `${OTRA}`: la
 * interpolación es una segunda gramática y no hay consumidor que la pida.
 */
export function readEnvFile(path: string): Record<string, string> {
  const values: Record<string, string> = {}
  if (!existsSync(path) || !statSync(path).isFile()) return values
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    let line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('export ')) line = line.slice('export '.length).trimStart()
    const cut = line.indexOf('=')
    if (cut === -1) continue
    const key = line.slice(0, cut).trim()
    if (!key) continue
    let value = line.slice(cut + 1).trim()
    if (value.length >= 2 && value[0] === value[value.length - 1] && (value[0] === '"' || value[0] === "'")) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

/** El directorio desde el que arranca un ascenso cuando nadie declara otro. */
function defaultStart(): string {
  return dirname(fileURLToPath(import.meta.url))
}

/** Cada nivel desde `from` hasta la raíz del sistema de archivos, incluido. */
function levelsUpward(from: string): string[] {
  const levels: string[] = []
  let level = resolve(from)
  for (;;) {
    levels.push(level)
    const parent = dirname(level)
    if (parent === level) return levels
    level = parent
  }
}

/**
 * El `.env` que gobierna: el declarado por `THYROX_ENV_FILE`, si no el primero
 * que aparezca ascendiendo desde `start`. El ascenso es el mismo criterio que
 * el de `thyroxRoot` y por la misma razón: no depende de la profundidad a la
 * que viva el consumidor.
 */
export function envFilePath(start?: string): string | null {
  const declared = process.env[ENV_FILE_VAR]
  if (declared) {
    return existsSync(declared) && statSync(declared).isFile() ? declared : null
  }
  for (const level of levelsUpward(start ?? defaultStart())) {
    const candidate = join(level, ENV_FILE_NAME)
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

/**
 * Puerto CONDUCIDO: de dónde sale el valor de una variable declarada.
 *
 * Contraparte de `ForReadingDeclarations` de `reach.py`, y el mismo nombre a
 * propósito: un puerto se nombra por **lo que el otro lado hace por ti**
 * —`ForGettingTaxRates`, `ForCalculatingTaxes`—, no por quién lo implementa.
 * Así sobrevive al adaptador: hoy el proceso y un `.env`, mañana un almacén de
 * secretos, y la firma no se entera.
 *
 * TypeScript tipa estructuralmente, igual que el `Protocol` de la otra mitad:
 * un adaptador no implementa esta interfaz declarándolo — le basta con tener
 * `declared`.
 */
export interface ForReadingDeclarations {
  declared(name: string): string | null
}

/** Adaptador conducido: el entorno del proceso. */
export class ProcessEnvironment implements ForReadingDeclarations {
  declared(name: string): string | null {
    return process.env[name] || null
  }
}

/** Adaptador conducido: el archivo `.env` que localice `start`. */
export class EnvFileDeclarations implements ForReadingDeclarations {
  constructor(private readonly start?: string) {}

  declared(name: string): string | null {
    const path = envFilePath(this.start)
    if (path === null) return null
    return readEnvFile(path)[name] || null
  }
}

/**
 * Adaptador conducido que compone otros en orden de precedencia.
 *
 * Es un adaptador y no un caso especial del puerto: cumple la misma firma, así
 * que quien lo recibe no distingue una fuente de una cadena de fuentes.
 */
export class FirstOfDeclarations implements ForReadingDeclarations {
  private readonly sources: ForReadingDeclarations[]

  constructor(...sources: ForReadingDeclarations[]) {
    this.sources = sources
  }

  declared(name: string): string | null {
    for (const source of this.sources) {
      const value = source.declared(name)
      if (value) return value
    }
    return null
  }
}

/**
 * El CONFIGURADOR: qué adaptadores se usan y en qué orden.
 *
 * Único sitio del módulo que decide cuáles son los adaptadores reales — el
 * papel que en la fuente cumple `Main`. Aquí no hay constructor donde
 * inyectarlo, así que el cableado por defecto vive en este configurador y el
 * llamador lo sustituye pasando `source`.
 */
export function productionDeclarations(start?: string): ForReadingDeclarations {
  return new FirstOfDeclarations(new ProcessEnvironment(), new EnvFileDeclarations(start))
}

/**
 * El valor de una variable: primero el proceso, después el `.env`.
 *
 * El proceso gana porque es la declaración más inmediata: quien exporta una
 * variable para UNA invocación está corrigiendo, a propósito, lo que el
 * archivo dice para todas.
 *
 * `source` es el puerto conducido. Sin él se arma la cadena de producción, así
 * que ningún llamador existente cambia. Con él, **ÉL es la fuente**: no se cae
 * al proceso por detrás, porque si lo hiciera un test no podría medir la
 * ausencia —el entorno real decidiría por él— y ésa es la costura que este
 * puerto abre.
 */
export function envValue(
  name: string,
  start?: string,
  source?: ForReadingDeclarations,
): string | null {
  return (source ?? productionDeclarations(start)).declared(name)
}

/**
 * La raíz de THYROX mismo, por variable declarada o por ascenso al marcador.
 *
 * `start` es un parámetro y no `import.meta.url` por la misma razón que en la
 * mitad Python: un mecanismo comprobable a cualquier profundidad, no uno que
 * sólo acierta desde donde su autor lo escribió.
 */
export function thyroxRoot(start?: string): string {
  const declared = envValue(THYROX_ROOT_VAR, start)
  if (declared) return declared
  const here = resolve(start ?? defaultStart())
  for (const level of levelsUpward(here)) {
    const marker = join(level, THYROX_MARKER)
    if (existsSync(marker) && statSync(marker).isFile()) return level
  }
  throw new ReachRootError(
    `no se pudo derivar la raíz de thyrox desde ${here}: ni la variable ` +
      `${THYROX_ROOT_VAR}, ni el ascenso por ${THYROX_MARKER}. Declara ` +
      `${THYROX_ROOT_VAR}.`,
  )
}

/**
 * El hogar de los artefactos de agente — un PARÁMETRO, no un literal.
 *
 * Dos entradas, ambas de entorno, en el orden que `envValue` fija: la variable
 * del proceso y la del `.env`. Y un tercer camino que no es de entorno: el
 * hogar propio de thyrox, para que el producto sea usable **sin configurar
 * nada**. Declarar el hogar por usuario es una decisión del consumidor, no un
 * requisito del emisor: es lo que hace que el multi-repo funcione sin que
 * thyrox tenga que saber dónde vive cada clon.
 *
 * NO se verifica que el directorio exista. Un hogar declarado y ausente es un
 * hecho del consumidor que su llamador tiene que poder ver; inventarlo o
 * crearlo aquí escondería la divergencia que este mecanismo existe para
 * exponer.
 */
export function agentsDir(start?: string): string {
  const declared = envValue(AGENTS_DIR_VAR, start)
  if (declared) return declared
  return join(thyroxRoot(start), AGENTS_DIR_DEFAULT)
}

/**
 * Una ruta declarada, resuelta contra la raíz que la ancla — tres vías.
 *
 * Es la contraparte de `resolve_home` en `reach.py`, y la regla que el
 * ejecutable 2.1.263 declara verbatim para sus rutas de configuración:
 * absoluta tal cual, `~` expandida, o relativa a la raíz NOMBRADA.
 *
 * **Por qué la tercera vía es la que importa.** Sin ella una clave de familia
 * sólo puede llevar una ruta absoluta, y una absoluta no puede decir dos
 * verdades: declararla le da a los cinco clones el hogar de uno. Como
 * SEGMENTO relativo la misma clave dice lo correcto para todos —«en cada clon,
 * este subdirectorio»— y deja de haber colisión que resolver.
 *
 * La raíz es un parámetro obligatorio: una ruta relativa nunca es relativa a
 * nada. Sin él la resolución caería al `cwd`, que es una raíz que nadie
 * declaró.
 *
 * Ciega a: si la ruta resultante EXISTE — no se comprueba, igual que en
 * `agentsDir`.
 */
export function resolveHome(declared: string, root: string): string {
  const expanded = declared.startsWith('~/') || declared === '~'
    ? join(homedir(), declared.slice(1))
    : declared
  if (isAbsolute(expanded)) return expanded
  return join(root, expanded)
}

/** Los nombres de los `.md` de agente presentes en un hogar dado. */
export function agentArtifacts(dir: string = agentsDir()): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return []
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
}

/**
 * Las raíces DECLARADAS del alcance, en el orden de `reach.py`.
 *
 * `thyrox` no está aquí a propósito: es el PROVEEDOR, y su raíz la resuelve
 * `thyroxRoot()` por su propio marcador. Estas cinco son los consumidores.
 */
export const REACH_ROOTS = ['api', 'db', 'docs', 'server', 'ui'] as const
export type ReachRoot = typeof REACH_ROOTS[number]

/**
 * El prefijo del nombre de clon. Vive aquí y no repetido en cada consumidor
 * porque el rename `e-comerce-*` -> `kaupamex-*` (DEC-KX-06) ya demostró que
 * cambia.
 */
export const CLONE_PREFIX = 'kaupamex-'

/**
 * Las grafías del árbol, EN ORDEN. Gana la primera declarada.
 *
 * `KAUPAMEX_ROOT` queda de segunda y no por cortesía: tiene consumidores vivos
 * que se romperían al retirarla. Mismo criterio que la mitad Python.
 */
export const TREE_ROOT_VARS = ['THYROX_REACH_ROOT', 'KAUPAMEX_ROOT'] as const

/** Las grafías del tramo extensible, EN ORDEN. Separadas por `:`, como `PATH`. */
export const EXTRA_ROOTS_VARS = ['THYROX_EXTRA_REACH_ROOTS', 'KAUPAMEX_EXTRA_ROOTS'] as const

/** El nombre largo del clon: `api` -> `kaupamex-api`. */
export function cloneName(repo: string): string {
  if (!(REACH_ROOTS as readonly string[]).includes(repo)) {
    throw new ReachRootError(
      `raíz desconocida: ${JSON.stringify(repo)}. Las declaradas son ${REACH_ROOTS.join(', ')}.`,
    )
  }
  return `${CLONE_PREFIX}${repo}`
}

/** Los nombres largos de las raíces declaradas, en su orden. */
export function cloneNames(): string[] {
  return REACH_ROOTS.map(cloneName)
}

/**
 * Las constantes por raíz, EN ORDEN: `docs` -> `THYROX_REACH_DOCS`, `KAUPAMEX_DOCS`.
 *
 * Públicas porque las LEE `root()`: forman parte del contrato, y quien quiera
 * declarar una raíz necesita saber cómo se llama su variable sin reconstruir
 * la regla.
 */
export function envNames(repo: string): string[] {
  const suffix = repo.toUpperCase().replace(/-/g, '_')
  return ['THYROX_REACH_ROOT', 'KAUPAMEX'].map((v) =>
    v.endsWith('_ROOT') ? `${v.slice(0, -'_ROOT'.length)}_${suffix}` : `${v}_${suffix}`,
  )
}

/**
 * El padre de los clones, por variable declarada o por ascenso.
 *
 * `start` es un parámetro y no `import.meta.url` por la misma razón que en la
 * mitad Python: un mecanismo comprobable a cualquier profundidad, no uno que
 * sólo acierta desde donde su autor lo escribió.
 */
export function treeRoot(start?: string): string {
  for (const v of TREE_ROOT_VARS) {
    const declared = envValue(v, start)
    if (declared) return declared
  }
  const here = resolve(start ?? defaultStart())
  const names = cloneNames()
  for (const level of levelsUpward(here)) {
    if (names.some((n) => existsSync(join(level, n)) && statSync(join(level, n)).isDirectory())) {
      return level
    }
  }
  throw new ReachRootError(
    `no se pudo derivar el padre de los clones ascendiendo desde ${here}. Ninguno de ` +
      `${names.join(', ')} apareció en ningún nivel. Declara ${TREE_ROOT_VARS[0]} o ` +
      'invoca desde dentro del árbol.',
  )
}

/**
 * La ruta absoluta de una raíz declarada, por la cadena de precedencia.
 *
 * NO comprueba que exista: un consumidor que sólo necesita componer una ruta
 * no debe pagar una llamada al sistema de archivos por cada raíz.
 */
export function root(repo: string, start?: string): string {
  const name = cloneName(repo)          // valida el repo antes de mirar el entorno
  for (const v of envNames(repo)) {
    const declared = envValue(v, start)
    if (declared) return declared
  }
  return join(treeRoot(start), name)
}

/** Sólo las DECLARADAS, sin el tramo extra — la vista hermana de `reach()`. */
export function roots(start?: string): Record<string, string> {
  return Object.fromEntries(REACH_ROOTS.map((r) => [r, root(r, start)]))
}

/**
 * El tramo extensible, leído del entorno.
 *
 * Cada ruta debe ser **absoluta**: sin esa verificación, el tramo extra sería
 * la vía por la que una relativa entra al conjunto, y cada consumidor la
 * resolvería contra su propio directorio de trabajo.
 */
export function extraRoots(): Record<string, string> {
  const raw = EXTRA_ROOTS_VARS.map((v) => process.env[v]).find(Boolean) ?? ''
  const result: Record<string, string> = {}
  for (const piece of raw.split(':').filter(Boolean)) {
    if (!piece.startsWith('/')) {
      throw new ReachRootError(
        `la raíz extra ${JSON.stringify(piece)} no es absoluta. ${EXTRA_ROOTS_VARS[0]} las ` +
          'exige absolutas: una relativa se resolvería contra el directorio de trabajo de ' +
          'cada consumidor, que es distinto.',
      )
    }
    result[piece.split('/').filter(Boolean).pop() as string] = piece
  }
  return result
}

/** El conjunto RESUELTO: las declaradas más el tramo extra. */
export function reach(start?: string): Record<string, string> {
  return { ...roots(start), ...extraRoots() }
}

/**
 * El nombre corto del clon al que corresponde una raíz, o `null`.
 *
 * Se resuelve contra el mapa que `reach()` ya declara, no recomponiendo el
 * prefijo del clon: ese prefijo es una decisión del consumidor y su derivación
 * vive aquí, así que rehacerla en el llamador sería su segunda fuente de
 * verdad.
 *
 * Vive junto a `reach()` y no en el módulo que primero lo necesitó porque lo
 * necesitan VARIOS: cada familia de hogar por clon —reglas, skills— hace la
 * misma pregunta. Copiarlo en cada una es cómo dos copias divergen.
 *
 * *Métrica:* igualdad de la ruta resuelta contra cada entrada de `reach()`.
 * *Ciega a:* una raíz que NO sea uno de los clones declarados —devuelve
 * `null`, y el llamador cae a la clave de familia, que es la conducta correcta:
 * un árbol que el alcance no declara no tiene clave por clon que leer—; y a un
 * SUBDIRECTORIO de un clon, que la mitad Python sí resuelve (`repo_of`
 * asciende). Esa asimetría es real y está declarada, no supuesta.
 */
export function repoOfRoot(root: string, start?: string): string | null {
  const target = resolve(root)
  for (const [repo, path] of Object.entries(reach(start))) {
    if (resolve(path) === target) return repo
  }
  return null
}

/**
 * La grafía que declara la raíz del árbol MEDIDO — el consumidor, no thyrox.
 *
 * Es hermana de `THYROX_ROOT_VAR` y no se mezcla con ella: aquélla nombra al
 * PROVEEDOR (dónde vive el mecanismo), ésta al árbol sobre el que el mecanismo
 * opera. Confundirlas es el defecto que el corredor de gates destapó: siete
 * gates componían su corpus con aritmética de ruta calibrada para
 * `kaupamex-docs/.claude/scripts/gates/`, y desde `thyrox/src/verify/` medían
 * `/home/user/source`, que no existe.
 */
export const CONSUMER_ROOT_VAR = 'THYROX_CONSUMER'

/**
 * El marcador por el que se reconoce un consumidor al ascender.
 *
 * Es el directorio de configuración, no el nombre del clon: un árbol que lo
 * tenga es un consumidor aunque se llame de otra forma, y uno llamado
 * `kaupamex-x` sin él no lo es. Mismo criterio que `THYROX_MARKER`, con la
 * evidencia dentro en vez del rótulo fuera.
 */
export const CONSUMER_MARKER = '.claude'

/**
 * La raíz del árbol MEDIDO, que no es la del proveedor.
 *
 * Contraparte de `consumer_root` de `reach.py`, con su misma precedencia de
 * tres tramos: valor directo → variable declarada (`envValue`, que ya mira el
 * proceso y después el `.env`) → ascenso hasta el marcador. Sólo si el ascenso
 * no encuentra nada se devuelve el punto de partida tal cual.
 *
 * El ascenso no es adorno: un gate lo invoca el pre-commit desde cualquier
 * subdirectorio del consumidor, y el cwd literal apuntaría a media rama.
 *
 * *Métrica:* presencia del directorio `.claude` subiendo desde el punto de
 * partida.
 * *Ciega a:* CUÁL de los consumidores es el correcto cuando hay varios en la
 * cadena. Medido en este árbol el 2026-09-06: `/home/user/.claude`,
 * `/home/user/thyrox/.claude` y `/home/user/kaupamex-docs/.claude` existen los
 * tres. El caso del PROVEEDOR dejó de ser ceguera el 2026-09-09: ahora rehúsa
 * con `ConsumerUnknownError` en vez de devolver su raíz. Sigue ciega al otro —
 * un ascenso desde `/home/user` devuelve un directorio que no es clon de
 * nadie, porque ese sí lleva el marcador y no es el proveedor. Por eso quien
 * resuelve un artefacto del consumidor no se apoya en el ascenso: exige el
 * valor declarado y, sin él, cae a una raíz nombrada. El ascenso sirve al caso
 * para el que se portó — un proceso que YA corre dentro del consumidor.
 */
export function consumerRoot(declared?: string, start?: string): string {
  if (declared) return resolve(declared)
  const value = envValue(CONSUMER_ROOT_VAR, start)
  if (value) return resolve(value)
  const here = resolve(start ?? defaultStart())
  // `thyroxRoot()` SIN `start`: se resuelve desde el propio modulo, igual que
  // la mitad Python lo hace desde `__file__`. Pasarle el punto de partida del
  // ascenso lo haria fallar en cualquier arbol que no sea thyrox — que es
  // justo el caso que este guard tiene que poder medir.
  const provider = resolve(thyroxRoot())
  for (const level of levelsUpward(here)) {
    if (existsSync(join(level, CONSUMER_MARKER))) {
      // El proveedor tambien lleva `.claude/`, asi que el marcador no lo
      // distingue de un consumidor. Devolverlo seria peor que rehusar: el
      // llamador compone un hogar dentro de thyrox y nada falla.
      if (level === provider) {
        throw new ConsumerUnknownError(
          `El ascenso desde ${here} aterriza en el PROVEEDOR (${provider}), ` +
          `no en un consumidor. El proveedor tambien lleva ${CONSUMER_MARKER}/, ` +
          `asi que el marcador no lo distingue. Declara ${CONSUMER_ROOT_VAR} ` +
          `con la raiz del clon, pasa \`declared\`, o invoca desde dentro de ` +
          `el. NO se devuelve la raiz de thyrox: el llamador compondria un ` +
          `hogar dentro del proveedor que declarations.py no lista.`,
        )
      }
      return level
    }
  }
  return here
}
