/**
 * Puerto de `ccnmt: packages/storage/src/safePatternMatch.ts` (22 líneas
 * fuente). CABLEADO PURO — el cuerpo de las dos funciones exportadas ES la
 * llamada a una dependencia npm ausente de este árbol:
 *
 *   - `safePicomatch` envuelve `picomatch.isMatch()` (paquete `picomatch`).
 *   - `safeIgnoreMatch` envuelve `ignore().add(patterns).ignores(path)`
 *     (paquete `ignore`).
 *
 * Verificado 2026-09-06: ninguno de los dos aparece en
 * `node_modules/`, `bun.lock` ni `package.json` de este árbol (`grep -c`
 * sobre los tres da 0). Por directiva de esta tarea NO se instalan
 * dependencias externas nuevas — instalarlas es una decisión del ejecutor
 * (añadiría dos paquetes al `package.json` de `@thyrox/storage`, archivo
 * fuera de mi propiedad en este pase).
 *
 * Símbolos de la fuente: 2 de 2. Ambos se portan VERBATIM (mismos imports,
 * mismo cuerpo) — no se reimplementa un matcher glob/gitignore reducido a
 * mano: `picomatch` e `ignore` tienen semántica de negación, ámbito de
 * segmento y casos límite (p. ej. `**`, `!patrón`, rutas absolutas vs.
 * relativas) que un sustituto simplificado reproduciría mal, y este árbol
 * no tiene todavía ningún consumidor real de estas dos funciones (el único
 * consumidor en la fuente, `claudemd.ts`, ya está portado aquí y NO las
 * usa — verificado: `grep -c "safePatternMatch\|picomatch\|'ignore'"` sobre
 * ese archivo da 0).
 *
 * Consecuencia práctica: este módulo NO se importa desde ningún otro
 * archivo del árbol ni desde ningún test — así que `bun test` nunca intenta
 * resolver `picomatch`/`ignore` y el árbol sigue construyendo limpio.
 * Cuando el ejecutor decida instalar las dos dependencias, este archivo ya
 * queda listo para correr sin cambios. SIN TEST — no hay lógica propia que
 * ejercitar mientras las dos dependencias sigan ausentes.
 */
import ignore from 'ignore'
import picomatch from 'picomatch'

export function safePicomatch(
  path: string,
  patterns: string[],
  options: { dot: boolean },
): boolean {
  try {
    return picomatch.isMatch(path, patterns, options)
  } catch {
    return false
  }
}

export function safeIgnoreMatch(patterns: string[], path: string): boolean {
  try {
    return ignore().add(patterns).ignores(path)
  } catch {
    return false
  }
}
