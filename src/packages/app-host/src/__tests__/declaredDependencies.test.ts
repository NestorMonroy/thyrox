/**
 * Control de regresión para TASK-THYROX-0005: todo `@thyrox/<x>` que el
 * código fuente de este paquete referencia por valor (import estático,
 * `import()` dinámico o `require()`) tiene que estar declarado en las
 * `dependencies` de `package.json`, o figurar en el `FROZEN_BASELINE`
 * congelado de deuda heredada de abajo — nunca ninguna de las dos cosas.
 *
 * Este archivo mide SÓLO el manifiesto (`package.json` `dependencies`). NO
 * llama a `Bun.resolveSync` ni resuelve ningún módulo — esa es tarea del
 * probe de conducta (`packageHostSetupResolution.test.ts`, hermano en este
 * mismo directorio). Mantener las dos mediciones separadas es lo que hace
 * discriminante el test de anulación: quitar una línea de `dependencies` no
 * desvincula un symlink de `node_modules/@thyrox/` ya creado por una
 * instalación previa, así que el probe de conducta seguiría en verde
 * mientras este control, que sólo lee el manifiesto, sí se pondría en rojo
 * exactamente en el caso quitado.
 *
 * Métrica: nombres `@thyrox/<x>` alcanzados por `from '...'`, `import(...)`
 * o `require(...)`, sobre el contenido COMPLETO de cada archivo (no línea a
 * línea) tras despojar los imports/exports type-only con llaves
 * (`import type { … } from '...'` / `export type { … } from '...'`, de una
 * o varias líneas — `[^}]*` cruza saltos de línea sin la bandera `s`; sólo
 * el metacarácter `.` la exige). Por eso un `import(\n  '@thyrox/swarm'\n)`
 * partido en varias líneas sí se captura (`\s*` también cruza saltos de
 * línea).
 *
 * Ciega a (redactado a propósito sin escribir un literal ejecutable de la
 * forma peligrosa aquí mismo — hacerlo contaminaría el propio árbol que este
 * archivo mide; el primer borrador de este docstring cometió exactamente
 * ese error y quedó como demostración viva del punto 1, hasta corregirse):
 *   1. Un especificador de paquete que aparezca dentro de un comentario o de
 *      un string literal —no de un import real— se contaría igual que una
 *      referencia genuina. Verificado 2026-09-09: cero falsos positivos en
 *      este árbol hoy, pero el riesgo es estructural del regex.
 *   2. La construcción de TypeScript «tomar el tipo de un import dinámico»
 *      (posición de TIPO, no de valor) cae en la misma rama que un import
 *      dinámico de valor real — dos casos hoy, ambos sobre el paquete
 *      `provider`, en `init.ts` (líneas 201-202 y 251-252). Ese paquete ya
 *      está en el baseline congelado por imports de valor genuinos en
 *      `providerHostSetup.ts`, así que el sobre-conteo no cambia ningún
 *      veredicto hoy.
 *   3. La forma de `import type` SIN llaves (identificador suelto, sin
 *      `{ }`) no se despoja — verificado 2026-09-09 con un grep sobre el
 *      patrón `import type` seguido de un identificador: 0 hits en este
 *      paquete. Si apareciera, se contaría de más (un import type-only no
 *      genera dependencia real en runtime).
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC_ROOT = join(import.meta.dir, '..')
const PACKAGE_ROOT = join(SRC_ROOT, '..')

function collectSourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const info = statSync(fullPath)
    if (info.isDirectory()) {
      found.push(...collectSourceFiles(fullPath))
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      found.push(fullPath)
    }
  }
  return found
}

const TYPE_ONLY_IMPORT_RE =
  /^\s*(?:import|export)\s+type\s*\{[^}]*\}\s*from\s*['"][^'"]+['"]\s*;?\s*$/gm

const THYROX_REFERENCE_RE =
  /(?:\bfrom\s*|\bimport\(\s*|\brequire\(\s*)['"]@thyrox\/([a-zA-Z0-9_-]+)/g

type DerivedHit = {
  packageName: string
  filePath: string
  lineNumber: number
}

function deriveThyroxReferences(): DerivedHit[] {
  const hits: DerivedHit[] = []
  for (const filePath of collectSourceFiles(SRC_ROOT)) {
    const text = readFileSync(filePath, 'utf8')
    const stripped = text.replace(TYPE_ONLY_IMPORT_RE, '')
    for (const match of stripped.matchAll(THYROX_REFERENCE_RE)) {
      const packageName = match[1]
      const upToMatch = stripped.slice(0, match.index ?? 0)
      const lineNumber = upToMatch.split('\n').length
      hits.push({
        packageName,
        filePath: relative(SRC_ROOT, filePath),
        lineNumber,
      })
    }
  }
  return hits
}

const derivedHits = deriveThyroxReferences()
const derivedNames = [...new Set(derivedHits.map((h) => h.packageName))].sort()

// eslint-disable-next-line no-console
console.log('=== @thyrox/<name> derivados de app-host/src ===')
for (const name of derivedNames) {
  // eslint-disable-next-line no-console
  console.log(` - ${name}`)
}
// eslint-disable-next-line no-console
console.log(`size: ${derivedNames.length}`)

function firstSiteFor(packageName: string): DerivedHit {
  const site = derivedHits.find((h) => h.packageName === packageName)
  if (!site) {
    throw new Error(
      `invariante roto: ${packageName} está en derivedNames pero no en derivedHits`,
    )
  }
  return site
}

const manifest = JSON.parse(
  readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8'),
) as { dependencies?: Record<string, string> }

const declaredNames = new Set(
  Object.keys(manifest.dependencies ?? {})
    .filter((key) => key.startsWith('@thyrox/'))
    .map((key) => key.slice('@thyrox/'.length)),
)

// Deuda heredada CONGELADA — deliberadamente NO se re-deriva en cada corrida:
// un baseline dinámico absorbería en silencio cualquier import futuro sin
// declarar, que es exactamente el defecto que este control existe para
// atrapar. TASK-THYROX-0007 va a tocar los 28 manifiestos del árbol; hasta
// entonces estos seis quedan como `test.todo`.
//
// Medido en vivo 2026-09-09 (ls -d + ls .../package.json por directorio,
// NO leyendo los docstrings que los citan): 5 de 6 —voice, mcp-runtime, cli,
// provider, swarm— YA tienen `package.json` en este árbol, pese a que los
// docstrings que los mencionan (installCliBindings.ts,
// installPluginBindings.ts, providerHostSetup.ts) siguen afirmando que esos
// paquetes «no existen en absoluto». Esa prosa está obsoleta — no se usa
// como razón de los `test.todo` de abajo, que citan sólo lo que este control
// mismo mide. Sólo `repl` no existe como directorio en absoluto todavía.
const FROZEN_BASELINE: ReadonlySet<string> = new Set([
  'cli',
  'mcp-runtime',
  'provider',
  'repl',
  'swarm',
  'voice',
])

describe('dependencias declaradas de @thyrox/app-host', () => {
  for (const packageName of derivedNames) {
    const isDeclared = declaredNames.has(packageName)
    const isFrozenDebt = !isDeclared && FROZEN_BASELINE.has(packageName)

    if (isDeclared) {
      test(`@thyrox/${packageName} está declarado en dependencies`, () => {
        expect(isDeclared).toBe(true)
      })
    } else if (isFrozenDebt) {
      const site = firstSiteFor(packageName)
      const voiceNote =
        packageName === 'voice'
          ? ' — bajo feature("VOICE_MODE"), verificado en falso en este entorno'
          : ''
      test.todo(
        `@thyrox/${packageName}: no declarado en dependencies de app-host ` +
          `— deuda heredada, fuera de TASK-THYROX-0005; sitio: ` +
          `${site.filePath}:${site.lineNumber}${voiceNote}`,
      )
    } else {
      test(`@thyrox/${packageName} está declarado en dependencies`, () => {
        const site = firstSiteFor(packageName)
        throw new Error(
          `@thyrox/${packageName} se usa en ${site.filePath}:${site.lineNumber} ` +
            `y no está declarado en dependencies, ni está en FROZEN_BASELINE. ` +
            `Agrégalo a dependencies (si es dependencia real de este pase) o ` +
            `al baseline congelado (si es deuda heredada legítima).`,
        )
      })
    }
  }

  describe('honestidad del baseline congelado', () => {
    for (const entry of FROZEN_BASELINE) {
      test(`@thyrox/${entry} sigue apareciendo en el árbol derivado`, () => {
        expect(derivedNames).toContain(entry)
      })
    }
  })
})
