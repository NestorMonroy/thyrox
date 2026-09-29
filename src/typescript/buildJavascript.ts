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
 *   estados.
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
 */
import { existsSync, writeFileSync } from 'node:fs'
import { basename, extname, join, normalize, relative } from 'node:path'
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

export async function buildPackage(packageDir: string): Promise<Bun.BuildOutput> {
  const [rootDir] = projectShape(packageDir)
  const entries = expandEntries(packageDir, sourceEntries(readManifest(packageDir)))
  return Bun.build({
    entrypoints: entries.map(e => join(packageDir, e)),
    root: join(packageDir, rootDir || '.'),
    outdir: join(packageDir, OUTPUT_DIR),
    target: 'bun',
    packages: 'external',
    external: ['*.node'],
    splitting: true,
    throw: false,
  })
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
      console.log(`${basename(pkg)}: Bun.build falló\n${result.logs.map(String).join('\n').slice(-2000)}`)
      continue
    }
    if (!repointDefault(pkg)) failed++
  }
  console.log(`buildJavascript: ${failed} paquete(s) con fallo (alcance medido: ${packages.length} paquete(s))`)
  return failed ? 1 : 0
}

