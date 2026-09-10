/**
 * Puerto local de `ccnmt: packages/config/semver.ts` (121 líneas
 * fuente, 100% portado). La fuente lo importa de
 * `@claude-code-how-works/config/semver` — `@thyrox/config` no lo
 * expone (medido: `find src/packages/config -iname 'semver*'` da 0
 * archivos). Se porta aquí, dentro de las rutas de este agente, como
 * módulo interno propio del updater; se retira en cuanto
 * `@thyrox/config/semver.ts` exista, sustituyendo el import por el
 * real.
 *
 * Utilidades de comparación semver que usan `Bun.semver` cuando está
 * disponible y caen al paquete npm `semver` en entornos Node.js.
 *
 * `Bun.semver.order()` es ~20x más rápido que las comparaciones de
 * semver de npm. El fallback de npm semver siempre usa `{ loose: true }`.
 */

let _npmSemver: typeof import('semver') | undefined

function getNpmSemver(): typeof import('semver') {
  if (!_npmSemver) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _npmSemver = require('semver') as typeof import('semver')
  }
  return _npmSemver
}

export function gt(a: string, b: string): boolean {
  if (typeof Bun !== 'undefined') {
    return Bun.semver.order(a, b) === 1
  }
  return getNpmSemver().gt(a, b, { loose: true })
}

export function gte(a: string, b: string): boolean {
  if (typeof Bun !== 'undefined') {
    return Bun.semver.order(a, b) >= 0
  }
  return getNpmSemver().gte(a, b, { loose: true })
}

/**
 * Compara dos strings de version usando semver cuando ambos son semver
 * validos, si no cae a comparacion lexicografica. Diseñado para el
 * formato de tag "1.carus.000" de ccb — Bun.semver.order lanza sobre
 * input no-semver, asi que update.ts y el instalador nativo pasan por
 * este wrapper en vez de llamar gt/gte directamente.
 *
 * Devuelve true sii `latest` representa una version MAS NUEVA que
 * `current`. Para tags de sufijo numerico monotono ("1.carus.000" →
 * "1.carus.001"), la comparacion lexicografica da la respuesta correcta.
 */
export function isVersionNewer(latest: string, current: string): boolean {
  if (typeof Bun !== 'undefined') {
    try {
      return Bun.semver.order(latest, current) === 1
    } catch {
      /* sigue abajo */
    }
  } else {
    try {
      return getNpmSemver().gt(latest, current, { loose: true })
    } catch {
      /* sigue abajo */
    }
  }
  return latest > current
}

export function lt(a: string, b: string): boolean {
  if (typeof Bun !== 'undefined') {
    return Bun.semver.order(a, b) === -1
  }
  return getNpmSemver().lt(a, b, { loose: true })
}

export function lte(a: string, b: string): boolean {
  if (typeof Bun !== 'undefined') {
    return Bun.semver.order(a, b) <= 0
  }
  return getNpmSemver().lte(a, b, { loose: true })
}

export function satisfies(version: string, range: string): boolean {
  if (typeof Bun !== 'undefined') {
    return Bun.semver.satisfies(version, range)
  }
  return getNpmSemver().satisfies(version, range, { loose: true })
}

export function order(a: string, b: string): -1 | 0 | 1 {
  if (typeof Bun !== 'undefined') {
    return Bun.semver.order(a, b)
  }
  return getNpmSemver().compare(a, b, { loose: true })
}

/**
 * Parseo best-effort → string `.version` canonico. Espeja el
 * `uX8.parse(v)?.version` de ant (3480.js): devuelve el string de
 * version limpio (p.ej. "1.2.3" / "1.2.3-rc.1") cuando el input es
 * parseable, `undefined` en otro caso. Util para sanitizar strings de
 * version provistos por el servidor antes de usarlos en
 * comparaciones/logs.
 */
export function parseVersion(value: string): string | undefined {
  if (!value) return undefined
  // Recorta + descarta la "v" inicial ANTES de la sonda de parseo para
  // que el whitespace y el prefijo convencion-npm no rompan la ruta
  // semver estricta. El `uX8.parse(v)?.version` de ant hace la misma
  // normalizacion via la libreria semver subyacente antes de devolver
  // `.version`.
  const cleaned = value.trim().replace(/^v/, '')
  if (!cleaned) return undefined
  if (typeof Bun !== 'undefined') {
    try {
      // Bun.semver.order lanza en input no-parseable; se usa como
      // sonda "¿es parseable?". Si no lanza, el string es al menos lo
      // bastante semver-shaped como para compararse.
      Bun.semver.order(cleaned, '0.0.0')
      return cleaned
    } catch {
      return undefined
    }
  }
  try {
    const parsed = getNpmSemver().parse(cleaned, { loose: true })
    return parsed ? parsed.version : undefined
  } catch {
    return undefined
  }
}
