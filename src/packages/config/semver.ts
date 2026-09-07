/**
 * Puerto de `ccnmt: packages/config/semver.ts` (121 líneas fuente).
 * Reimplementación fiel VERBATIM.
 *
 * Utilidades de comparación semver que usan `Bun.semver` cuando está
 * disponible y caen al paquete npm `semver` en entornos Node. `Bun.semver.order()`
 * es ~20x más rápido que las comparaciones semver de npm. El fallback de
 * npm semver siempre usa `{ loose: true }`.
 *
 * `semver` (npm) no está declarado en `package.json` de este paquete — el
 * `require()` diferido de `getNpmSemver()` sólo se ejecuta bajo Node (nunca
 * bajo Bun, que es el runtime de este árbol), así que no bloquea la carga
 * del módulo aquí.
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
 * Compara dos cadenas de versión usando semver cuando ambas son semver
 * válidas; si no, cae a comparación lexicográfica. Diseñada para el formato
 * de tag "1.carus.000" de ccb — `Bun.semver.order` lanza ante algo no-semver,
 * así que `update.ts` y el instalador nativo pasan por este envoltorio en
 * vez de llamar a `gt`/`gte` directamente.
 *
 * Devuelve verdadero si y sólo si `latest` representa una versión MÁS NUEVA
 * que `current`. Para tags de sufijo numérico monótono
 * ("1.carus.000" → "1.carus.001"), la comparación lexicográfica da la
 * respuesta correcta.
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
 * Parseo best-effort → cadena `.version` canónica. Espeja el `uX8.parse(v)?.version`
 * de ant (3480.js): devuelve la cadena de versión depurada (p. ej. "1.2.3" /
 * "1.2.3-rc.1") cuando la entrada es parseable, `undefined` si no. Útil para
 * sanear cadenas de versión que llegan del servidor antes de usarlas en
 * comparaciones o logs.
 */
export function parseVersion(value: string): string | undefined {
  if (!value) return undefined
  // Recorta espacios + quita el prefijo `v` ANTES de la sonda de parseo, para
  // que ni el espacio en blanco ni la convención npm hagan tropezar la ruta
  // estricta de semver. `uX8.parse(v)?.version` de ant hace la misma
  // normalización vía la librería semver subyacente antes de devolver
  // `.version`.
  const cleaned = value.trim().replace(/^v/, '')
  if (!cleaned) return undefined
  if (typeof Bun !== 'undefined') {
    try {
      // `Bun.semver.order` lanza ante una entrada no parseable; se usa como
      // sonda de "¿es parseable?". Si no lanza, la cadena tiene al menos la
      // forma de semver suficiente para comparar.
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
