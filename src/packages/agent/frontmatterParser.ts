/**
 * Puerto de `ccnmt: packages/agent/frontmatterParser.ts` (16 líneas) —
 * forward shim: la fuente movió la implementación real (370 líneas) a
 * `config/frontmatterParser.ts` para romper el ciclo de imports
 * agent → config → agent que forzaba fallbacks lazy-require en
 * `config/plugin/_deps.ts`. Reexportado por compatibilidad hacia atrás con
 * callers existentes; el código nuevo debería importar de
 * `@claude-code-how-works/config/frontmatterParser`.
 *
 * DIVERGENCIA DE ALCANCE, declarada: `@thyrox/config` existe como paquete en
 * este árbol, pero no expone `frontmatterParser.ts` — medido:
 * `find src/packages/config -iname "*frontmatter*"` → vacío
 * (`Bun.resolveSync('@thyrox/config/frontmatterParser.js', …)` falla).
 * Portar ese módulo es tarea de quien porte `config` (fuera de mis rutas:
 * `src/packages/config/**`). `memory: src/internal/pendingCrossPackageDeps.ts`
 * ya trae un recorte fiel independiente para SU propio uso interno
 * (`frontmatter.description`/`frontmatter.type`); este archivo es el
 * forward shim real, no ese recorte — no se importa de `memory` (sería
 * dependencia invertida).
 *
 * Los tres TIPOS se reexportan tal cual: un `export type … from` se borra
 * en runtime (no intenta resolver el especificador), así que no importa
 * que el módulo de destino no exista todavía — típecheck es lo único que
 * queda pendiente para ellos, igual que el resto del árbol con este mismo
 * patrón (`agent/internal/macroFallback.ts`).
 *
 * Los siete símbolos de VALOR se difieren con `require()` — mismo criterio
 * que `agent/yaml.ts` y que `app-host: src/runtime/installPluginBindings.ts`
 * aplica a sus 95 slots de `config/plugin/_deps` — para que ESTE archivo
 * siga siendo importable; la resolución real sólo falla cuando alguien
 * invoca la función, no al cargar el módulo. `FRONTMATTER_REGEX` es la
 * única excepción de forma: no es invocable, así que se expone como
 * `RegExp | undefined` (en vez del `RegExp` de la fuente) — `undefined`
 * mientras `config/frontmatterParser.ts` no exista.
 */
export type {
  FrontmatterData,
  ParsedMarkdown,
  FrontmatterShell,
} from '@thyrox/config/frontmatterParser.js'

type RealFrontmatterParser = {
  FRONTMATTER_REGEX: RegExp
  parseFrontmatter: (...args: unknown[]) => unknown
  splitPathInFrontmatter: (...args: unknown[]) => unknown
  parsePositiveIntFromFrontmatter: (...args: unknown[]) => unknown
  coerceDescriptionToString: (...args: unknown[]) => unknown
  parseBooleanFrontmatter: (...args: unknown[]) => unknown
  parseShellFrontmatter: (...args: unknown[]) => unknown
}

function loadReal(): RealFrontmatterParser | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@thyrox/config/frontmatterParser.js') as RealFrontmatterParser
  } catch {
    return undefined
  }
}

export const FRONTMATTER_REGEX: RegExp | undefined = loadReal()?.FRONTMATTER_REGEX

export function parseFrontmatter(...args: unknown[]): unknown {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/config/frontmatterParser.js') as RealFrontmatterParser
  return mod.parseFrontmatter(...args)
}

export function splitPathInFrontmatter(...args: unknown[]): unknown {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/config/frontmatterParser.js') as RealFrontmatterParser
  return mod.splitPathInFrontmatter(...args)
}

export function parsePositiveIntFromFrontmatter(...args: unknown[]): unknown {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/config/frontmatterParser.js') as RealFrontmatterParser
  return mod.parsePositiveIntFromFrontmatter(...args)
}

export function coerceDescriptionToString(...args: unknown[]): unknown {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/config/frontmatterParser.js') as RealFrontmatterParser
  return mod.coerceDescriptionToString(...args)
}

export function parseBooleanFrontmatter(...args: unknown[]): unknown {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/config/frontmatterParser.js') as RealFrontmatterParser
  return mod.parseBooleanFrontmatter(...args)
}

export function parseShellFrontmatter(...args: unknown[]): unknown {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@thyrox/config/frontmatterParser.js') as RealFrontmatterParser
  return mod.parseShellFrontmatter(...args)
}
