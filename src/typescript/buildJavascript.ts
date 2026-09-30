/**
 * Build JavaScript de un paquete del workspace con `Bun.build`.
 *
 * Emite en `dist/` un `.js` por cada fuente que el manifiesto exporta, junto
 * al `.d.ts` que emite `emit_declarations`, y repunta el `default` de cada
 * entrada de `exports` —y `main`— a ese `.js`. La condición `@thyrox/source`
 * conserva el fuente para quien la pida con `--conditions=@thyrox/source`.
 *
 * Opciones, medidas en Bun 1.3.11:
 * - `splitting`: sin ella cada entrada lleva dentro su copia de los módulos
 *   que importa, y dos entradas que comparten un módulo con estado ven dos
 *   estados. Con ella, un módulo usado por 2+ entradas se extrae a un
 *   `chunk-<hash>.js` COMPARTIDO — y ese chunk aterriza siempre en la RAÍZ
 *   de `outdir`, sin importar cuán anidado estuviera su fuente (medido: el
 *   único source con dos entradas propias en `@thyrox/tools`,
 *   `definitions/rupCoordinator.ts`, sale como `dist/chunk-….js`, no como
 *   `dist/definitions/…`; los otros 30 de la misma carpeta, usados por una
 *   sola entrada, quedan inlineados en `dist/definitions/index.js`).
 * - `packages: 'external'`: los hermanos y las dependencias de npm se
 *   resuelven en tiempo de ejecución por su propio `exports`.
 * - `target: 'bun'`: el runtime de thyrox; conserva `bun:*` como importación.
 * - `root`: el mismo `rootDir` con que se emiten las declaraciones
 *   (`projectShape`), para que `dist/x.js` quede al lado de `dist/x.d.ts`.
 * - `external: ['*.node']`: sin ella, un `.node` opcional que no existe
 *   (`transparent-napi`, pendiente de compilar) hace fallar el build entero
 *   porque el empaquetador intenta resolverlo; y uno que sí existe se copia
 *   a `dist/` duplicando lo que ya vive en `vendor/` (13 MB en
 *   `ripgrep-napi`). Con `external` el `require('../vendor/…')` y el
 *   `require('../native/…')` quedan tal cual en el `.js` emitido, y siguen
 *   resolviendo porque `dist/` y `src/` quedan a la misma profundidad
 *   (`rootDir: "src"` en `tsconfig.build.json` de los ocho `*-napi`).
 *
 * Se invoca por `bin/typescript-build-javascript` (`bin/buildJavascript.ts`).
 *
 * ## Recursos que un módulo resuelve relativos a sí mismo
 *
 * Si un módulo compilado resuelve un recurso relativo a sí mismo
 * (`import.meta.url`, `import.meta.dir`, o un alias local de cualquiera de
 * los dos) ese recurso es parte del artefacto runtime tanto como el propio
 * `.js`: un `readFileSync(join(HERE, 'x.json'))` que hoy lee de al lado del
 * fuente lee, compilado, de al lado de donde `import.meta.url` resuelva EN
 * EL `.js` EMITIDO — y, como muestra el ejemplo de arriba, ese sitio no
 * siempre es la posición del fuente bajo `dist/`: depende de si `Bun.build`
 * decidió inlinear el módulo en su única entrada o extraerlo a un chunk
 * compartido en la raíz de `outdir`.
 *
 * Por eso el paso que resuelve estos recursos (`planModuleResources`) no
 * adivina la posición desde el FUENTE: lee el `.js`/chunk ya emitido —Bun
 * antepone a cada módulo bundleado un comentario `// <ruta del fuente>`, que
 * es la procedencia real, no una convención propia de este build— y resuelve
 * cada referencia literal dos veces con dos raíces distintas: la del FUENTE
 * (para decidir si el dato vive dentro del `rootDir` del paquete y para
 * leerlo) y la del `.js` que lo contiene (para decidir dónde, bajo `dist/`,
 * tiene que aterrizar para que el runtime lo encuentre).
 *
 * Sólo se reconoce el uso DENTRO de `join(…)` (con cualquier prefijo de
 * objeto, `path.join(…)` incluido) o de `new URL('<literal>',
 * import.meta.url)`, con un argumento LITERAL — nunca una plantilla ni una
 * variable. Un paso a otra función (`reachRoot(x, import.meta.dir)`) o una
 * variable derivada por un camino distinto a los dos reconocidos
 * (`join(__filename, '..')` en vez de `dirname(fileURLToPath(…))`) no se
 * resuelve aquí — es una frontera declarada, no un olvido: ninguno de los dos
 * es el patrón que este build necesita cubrir hoy, y forzarlos exigiría un
 * parser de verdad en vez de un reconocimiento léxico de las formas medidas.
 * Un módulo que el build no alcanza —no lo importa ninguna entrada— tampoco
 * se ve: no hay comentario de procedencia para él en ningún `.js` emitido,
 * así que sus referencias, alcanzables o no en otra plataforma, no entran al
 * plan. Es la misma frontera aplicada al mismo criterio: sólo cuenta lo que
 * de verdad es parte del artefacto.
 *
 * `__dirname`/`__filename` NO son una forma reconocida: Bun los hornea como
 * la ruta ABSOLUTA del directorio/archivo fuente en tiempo de build (medido
 * en `bridgeClient.ts`: `var __dirname = "/w/src/packages/…"`), así que el
 * `.js` emitido queda atado a la máquina donde se construyó. `import.meta.url`
 * e `import.meta.dir` no se hornean: resuelven en tiempo de ejecución contra
 * la posición real del `.js`, que es justo la propiedad que este build
 * necesita (H-THYROX-265).
 *
 * ## `dist/` se limpia antes de cada build (H-THYROX-266)
 *
 * `Bun.build` sobrescribe lo que vuelve a emitir, pero no borra lo que dejó
 * de emitir: un chunk con hash de una entrada que ya no existe, o que un
 * cambio de `splitting` movió, sobrevive builds sucesivos. `cleanOutputDir`
 * vacía `dist/` antes de invocar a `Bun.build`, así que lo que queda
 * es exactamente lo que ESTE build produjo.
 */
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join, normalize, relative } from 'node:path'
import {
  exportTargets,
  type Manifest,
  OUTPUT_DIR,
  projectShape,
  readManifest,
  SOURCE_CONDITION,
  stripDotSlash,
} from './packageShape.ts'

const SOURCE_SUFFIX = /\.(ts|tsx|mts)$/
const TEST_MARKERS = ['/__tests__/', '.test.', '.spec.']
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'])

/** La ruta del `.js` emitido para un fuente, relativa al paquete. */
export function distEntry(source: string, rootDir = '.'): string {
  let rel = normalize(source.startsWith('./') ? stripDotSlash(source) : source)
  if (rootDir !== '' && rootDir !== '.') rel = relative(rootDir, rel)
  return `./${OUTPUT_DIR}/${rel.slice(0, rel.length - extname(rel).length)}.js`
}

/** Los fuentes que el manifiesto exporta, sin repetir y nunca bajo `dist/`. */
export function sourceEntries(manifest: Manifest): string[] {
  return [...new Set(exportTargets(manifest).filter(t => SOURCE_SUFFIX.test(t)))].sort()
}

/**
 * Un destino con comodín se expande a sus archivos. El `*` de `exports` casa
 * cualquier subcadena, barras incluidas, y por eso se expande recursivo; pero
 * `dist/` es salida, un `.d.ts` es una declaración, `node_modules/` no es del
 * paquete y las pruebas no se publican.
 */
export function expandEntries(packageDir: string, entries: string[]): string[] {
  const out: string[] = []
  for (const entry of entries) {
    if (!entry.includes('*')) {
      out.push(entry)
      continue
    }
    const pattern = entry.includes('/*') && SOURCE_SUFFIX.test(entry)
      ? stripDotSlash(entry).replace('*', '**/*')
      : stripDotSlash(entry)
    for (const path of new Bun.Glob(pattern).scanSync({ cwd: packageDir })) {
      const rel = `./${path}`
      if (SOURCE_SUFFIX.test(rel) && !rel.endsWith('.d.ts')
        && !rel.startsWith(`./${OUTPUT_DIR}/`) && !rel.startsWith('./node_modules/')
        && !TEST_MARKERS.some(m => `/${rel}`.includes(m))) out.push(rel)
    }
  }
  return [...new Set(out)].sort()
}

/** El contenido entre el `(` que sigue a cada match de `head` y su `)` balanceado. */
function matchCalls(text: string, head: RegExp): { args: string }[] {
  const out: { args: string }[] = []
  head.lastIndex = 0
  while (head.exec(text)) {
    const start = head.lastIndex
    let depth = 1
    let i = start
    while (i < text.length && depth > 0) {
      if (text[i] === '(') depth++
      else if (text[i] === ')') depth--
      i++
    }
    out.push({ args: text.slice(start, i - 1) })
    head.lastIndex = i
  }
  return out
}

/** Los argumentos de una lista, separados por sus comas de nivel superior. */
function splitArgs(args: string): string[] {
  const out: string[] = []
  let depth = 0
  let quote: string | null = null
  let cur = ''
  for (let i = 0; i < args.length; i++) {
    const c = args[i]!
    if (quote) {
      cur += c
      if (c === quote && args[i - 1] !== '\\') quote = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue }
    if (c === '(' || c === '[' || c === '{') depth++
    if (c === ')' || c === ']' || c === '}') depth--
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue }
    cur += c
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

/** El texto de una cadena literal `'…'`/`"…"`, o `null` si no lo es. */
function literalString(arg: string): string | null {
  const m = /^(['"])((?:[^\\]|\\.)*)\1$/.exec(arg)
  return m ? m[2]!.replace(/\\(.)/g, '$1') : null
}

/**
 * `dirname(fileURLToPath(import.meta.url))` o `import.meta.dir`. La forma
 * estructural —dos llamadas anidadas de un solo argumento sobre
 * `import.meta.url`— y no el nombre literal de las funciones, porque
 * `Bun.build` renombra `dirname`/`fileURLToPath` con un sufijo (`dirname4`,
 * `fileURLToPath4`) cuando dos módulos bundleados importan el mismo nombre;
 * el texto compilado que este paso lee ya pasó por ese renombre.
 */
const HERE_FORM_RE = /^[\w$]+\(\s*[\w$]+\(\s*import\.meta\.url\s*\)\s*\)$|^import\.meta\.dir$/

/**
 * Los nombres locales asignados a `dirname(fileURLToPath(import.meta.url))` o
 * `import.meta.dir` — declaración (`var HERE = …`) o asignación simple
 * (`HERE = …`): un módulo con inicialización perezosa (`__esm`, que
 * `Bun.build` usa para un módulo con dependencias circulares o efectos de
 * carga) declara `var HERE` sin inicializador y lo asigna después, dentro de
 * la función de init.
 */
function hereAliases(text: string): Set<string> {
  const aliases = new Set<string>()
  const re = /\b(?:(?:const|let|var)\s+)?(\w+)\s*(?::\s*string)?\s*=\s*([^\n;=][^\n;]*?)\s*(?:[;\n]|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (HERE_FORM_RE.test(m[2]!.replace(/\s+/g, ''))) aliases.add(m[1]!)
  }
  return aliases
}

type ModuleRef = { literals: string[] | null }

/** Cada `join(<dir>, …)`/`path.join(<dir>, …)`/`new URL('<lit>', import.meta.url)` cuyo `<dir>` es el módulo. */
function findModuleReferences(text: string): ModuleRef[] {
  const aliases = hereAliases(text)
  const refs: ModuleRef[] = []
  // `\d*`: `Bun.build` sufija `join`/`dirname`/`fileURLToPath` importados con un
  // número (`join4`) cuando dos módulos bundleados importan el mismo nombre.
  for (const call of matchCalls(text, /\b(?:[\w$]+\.)?join\d*\(/g)) {
    const args = splitArgs(call.args)
    if (args.length < 2) continue
    const [dirArg, ...rest] = args
    const isHere = HERE_FORM_RE.test(dirArg!.replace(/\s+/g, '')) || aliases.has(dirArg!)
    if (!isHere) continue
    const literals = rest.map(literalString)
    refs.push({ literals: literals.some(l => l === null) ? null : (literals as string[]) })
  }
  for (const call of matchCalls(text, /\bnew\s+URL\(/g)) {
    const args = splitArgs(call.args)
    if (args.length !== 2 || args[1]!.replace(/\s+/g, '') !== 'import.meta.url') continue
    const lit = literalString(args[0]!)
    refs.push({ literals: lit === null ? null : [lit] })
  }
  return refs
}

/** Cada bloque `// <fuente>` que `Bun.build` antepone a un módulo bundleado, con su texto hasta el próximo. */
function sourceBlocks(text: string): { sourceRel: string; text: string }[] {
  const marker = /^\/\/ (\S+\.tsx?)$/gm
  const positions: { sourceRel: string; index: number }[] = []
  let m: RegExpExecArray | null
  while ((m = marker.exec(text))) positions.push({ sourceRel: m[1]!, index: m.index })
  return positions.map((p, i) => ({
    sourceRel: p.sourceRel,
    text: text.slice(p.index, i + 1 < positions.length ? positions[i + 1]!.index : text.length),
  }))
}

export type ResourcePlan = {
  emit: { source: string; literal: string; sourceAbs: string; targetAbs: string }[]
  declared: { source: string; literal: string; reason: string }[]
  missing: { source: string; literal: string }[]
}

/**
 * El plan de recursos runtime del paquete, leído de los `.js` que `Bun.build`
 * ya emitió (`outputs`): qué se copia a `dist/`, qué queda declarado sin
 * copiar y con qué motivo, y qué referencia literal no resuelve a nada —eso
 * último es un fallo del build, no una entrada más de la lista.
 */
export async function planModuleResources(
  packageDir: string,
  rootDir: string,
  outputs: readonly Bun.BuildArtifact[],
): Promise<ResourcePlan> {
  const rootAbs = join(packageDir, rootDir)
  const plan: ResourcePlan = { emit: [], declared: [], missing: [] }
  const seen = new Set<string>()
  for (const artifact of outputs) {
    if (artifact.kind !== 'entry-point' && artifact.kind !== 'chunk') continue
    if (!artifact.path.endsWith('.js')) continue
    const outDirAbs = dirname(artifact.path)
    const text = await artifact.text()
    for (const block of sourceBlocks(text)) {
      const sourceDirAbs = dirname(join(process.cwd(), block.sourceRel))
      const source = `./${relative(packageDir, join(process.cwd(), block.sourceRel))}`
      for (const ref of findModuleReferences(block.text)) {
        if (ref.literals === null) {
          plan.declared.push({ source, literal: '(no literal)', reason: 'argumento no literal' })
          continue
        }
        const literal = ref.literals.join('/')
        const dataAbs = join(sourceDirAbs, ...ref.literals)
        const relFromRoot = relative(rootAbs, dataAbs)
        if (relFromRoot.startsWith('..') || isAbsolute(relFromRoot)) {
          plan.declared.push({ source, literal, reason: 'fuera del rootDir del paquete' })
          continue
        }
        if (CODE_EXTENSIONS.has(extname(dataAbs))) {
          plan.declared.push({ source, literal, reason: 'referencia a otro módulo de código' })
          continue
        }
        if (!existsSync(dataAbs)) {
          plan.missing.push({ source, literal })
          continue
        }
        if (!statSync(dataAbs).isFile()) {
          plan.declared.push({ source, literal, reason: 'es un directorio, no un archivo' })
          continue
        }
        const targetAbs = join(outDirAbs, ...ref.literals)
        const key = `${dataAbs}->${targetAbs}`
        if (seen.has(key)) continue
        seen.add(key)
        plan.emit.push({ source, literal, sourceAbs: dataAbs, targetAbs })
      }
    }
  }
  return plan
}

/** Copia cada recurso del plan a su posición bajo `dist/`. `copy: false` es sólo para pruebas. */
export function emitModuleResources(plan: ResourcePlan, options: { copy?: boolean } = {}): void {
  if (options.copy === false) return
  for (const item of plan.emit) {
    mkdirSync(dirname(item.targetAbs), { recursive: true })
    copyFileSync(item.sourceAbs, item.targetAbs)
  }
}

/** Vacía `dist/` del paquete. Un build limpio parte siempre de cero (H-THYROX-266). */
export function cleanOutputDir(packageDir: string): void {
  rmSync(join(packageDir, OUTPUT_DIR), { recursive: true, force: true })
}

export async function buildPackage(
  packageDir: string,
  options: { emitResources?: boolean } = {},
): Promise<Bun.BuildOutput & { resources: ResourcePlan }> {
  const [rootDir] = projectShape(packageDir)
  const entries = expandEntries(packageDir, sourceEntries(readManifest(packageDir)))
  cleanOutputDir(packageDir)
  const result = await Bun.build({
    entrypoints: entries.map(e => join(packageDir, e)),
    root: join(packageDir, rootDir || '.'),
    outdir: join(packageDir, OUTPUT_DIR),
    target: 'bun',
    packages: 'external',
    external: ['*.node'],
    splitting: true,
    throw: false,
  })
  const empty: ResourcePlan = { emit: [], declared: [], missing: [] }
  if (!result.success) return { ...result, resources: empty }
  const plan = await planModuleResources(packageDir, rootDir || '.', result.outputs)
  if (options.emitResources !== false) emitModuleResources(plan)
  if (plan.missing.length > 0) return { ...result, success: false, resources: plan }
  return { ...result, resources: plan }
}

function jsExists(packageDir: string, target: string): boolean {
  if (!target.includes('*')) return existsSync(join(packageDir, stripDotSlash(target)))
  const pattern = stripDotSlash(target).replace('*', '**/*')
  return new Bun.Glob(pattern).scanSync({ cwd: packageDir }).next().done === false
}

function jsTarget(source: string, rootDir: string, packageDir: string, absent: string[]): string {
  const target = distEntry(source, rootDir)
  if (!jsExists(packageDir, target)) absent.push(target)
  return target
}

function repointValue(value: unknown, rootDir: string, packageDir: string, absent: string[]): unknown {
  if (typeof value === 'string') {
    if (!SOURCE_SUFFIX.test(value)) return value
    return { [SOURCE_CONDITION]: value, default: jsTarget(value, rootDir, packageDir, absent) }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const source = record[SOURCE_CONDITION] ?? record.default
    if (typeof source !== 'string' || !SOURCE_SUFFIX.test(source)) return value
    const repointed: Record<string, unknown> = { [SOURCE_CONDITION]: source }
    for (const [key, nested] of Object.entries(record)) {
      if (key !== SOURCE_CONDITION && key !== 'default') repointed[key] = nested
    }
    repointed.default = jsTarget(source, rootDir, packageDir, absent)
    return repointed
  }
  return value
}

/** Repunta `default` y `main` al `.js`; rehúsa entero si falta alguno. */
export function repointDefault(packageDir: string): boolean {
  const manifest = readManifest(packageDir)
  const [rootDir] = projectShape(packageDir)
  const absent: string[] = []
  const exports = manifest.exports
  const repointed = exports && typeof exports === 'object' && !Array.isArray(exports)
    ? Object.fromEntries(Object.entries(exports).map(([k, v]) => [k, repointValue(v, rootDir, packageDir, absent)]))
    : exports
  let mainSource = manifest.main
  if (typeof mainSource === 'string' && mainSource.startsWith(`./${OUTPUT_DIR}/`)) {
    const root = (repointed as Record<string, unknown> | undefined)?.['.']
    mainSource = root && typeof root === 'object' ? (root as Record<string, unknown>)[SOURCE_CONDITION] : undefined
  }
  const newMain = typeof mainSource === 'string' && SOURCE_SUFFIX.test(mainSource)
    ? jsTarget(mainSource, rootDir, packageDir, absent)
    : manifest.main
  if (absent.length > 0) {
    console.error(`${basename(packageDir)}: repunte INERTE — ${absent.length} .js no emitido(s):`)
    for (const target of absent) console.error(`  ${target}`)
    console.error('  Corre antes: typescript-build-javascript <paquete>')
    return false
  }
  manifest.exports = repointed
  if (newMain !== undefined) manifest.main = newMain
  writeFileSync(join(packageDir, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  return true
}

/** Los `default` de `exports` que no son un `.js` existente. */
export function checkPackage(packageDir: string): string[] {
  const exports = readManifest(packageDir).exports
  const missing: string[] = []
  const visit = (value: unknown): void => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>
      if ('default' in record) visit(record.default)
      return
    }
    if (typeof value === 'string'
      && (!value.endsWith('.js') || (!value.includes('*') && !existsSync(join(packageDir, stripDotSlash(value)))))) {
      missing.push(value)
    }
  }
  const values = exports && typeof exports === 'object' && !Array.isArray(exports)
    ? Object.values(exports) : [exports]
  values.forEach(visit)
  return missing
}

export async function main(argv: string[]): Promise<number> {
  const check = argv.includes('--check')
  const packages = argv.filter(a => !a.startsWith('--'))
  if (packages.length === 0) {
    console.error('uso: buildJavascript.ts [--check] <paquete>...')
    return 2
  }
  let failed = 0
  for (const pkg of packages) {
    if (check) {
      const missing = checkPackage(pkg)
      if (missing.length > 0) {
        failed++
        console.log(`${basename(pkg)}: ${missing.length} default(s) sin .js: ${missing.slice(0, 3).join(', ')}`)
      }
      continue
    }
    const result = await buildPackage(pkg)
    if (!result.success) {
      failed++
      if (result.resources.missing.length > 0) {
        console.log(`${basename(pkg)}: recurso(s) de módulo sin resolver:`)
        for (const m of result.resources.missing) console.log(`  ${m.source}: '${m.literal}' no existe`)
      } else {
        console.log(`${basename(pkg)}: Bun.build falló\n${result.logs.map(String).join('\n').slice(-2000)}`)
      }
      continue
    }
    if (result.resources.declared.length > 0) {
      console.log(`${basename(pkg)}: ${result.resources.declared.length} referencia(s) de módulo declarada(s), no emitida(s):`)
      for (const d of result.resources.declared) console.log(`  ${d.source}: '${d.literal}' — ${d.reason}`)
    }
    if (!repointDefault(pkg)) failed++
  }
  console.log(`buildJavascript: ${failed} paquete(s) con fallo (alcance medido: ${packages.length} paquete(s))`)
  return failed ? 1 : 0
}
