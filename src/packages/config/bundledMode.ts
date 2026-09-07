/**
 * Puerto de `ccnmt: packages/config/bundledMode.ts` (54 líneas fuente).
 * Reimplementación fiel VERBATIM. Sin dependencias.
 */

/**
 * Detecta si el runtime actual es Bun.
 * Devuelve verdadero cuando:
 * - Se ejecuta un archivo JS vía el comando `bun`.
 * - Se ejecuta un ejecutable standalone compilado con Bun.
 */
export function isRunningWithBun(): boolean {
  // https://bun.com/guides/util/detect-bun
  return process.versions.bun !== undefined
}

/**
 * Detecta si se ejecuta como un ejecutable standalone compilado con Bun.
 *
 * `Bun.embeddedFiles` sólo se puebla cuando el build pasa
 * `--embed-file=…` — aquí no se pasa, así que queda un array vacío incluso
 * en un binario `bun build --compile`, lo que hacía devolver falso en cada
 * binario de release. Eso se propagaba a
 * `getCurrentInstallationType()` devolviendo 'unknown'/'npm-global' y a
 * `AutoUpdaterWrapper` renderizando el actualizador legado basado en npm en
 * vez de `NativeAutoUpdater` — el auto-update nunca corría.
 *
 * La señal confiable: en un binario compilado con Bun, `Bun.main` (y
 * `import.meta.url`) apuntan dentro de un sistema de archivos sintético que
 * el runtime monta para alojar el bundle JS embebido. Al ejecutar vía
 * `bun script.ts`, son rutas reales en disco en vez de eso.
 *
 * Según `StandaloneModuleGraph.zig` de Bun, el prefijo sintético difiere
 * por plataforma:
 *   - macOS/Linux: `/$bunfs/`
 *   - Windows:     `B:\~BUN\` (canónico) — las URLs de archivo de Windows
 *                  requieren una letra de unidad, así que un `/$bunfs/`
 *                  estilo POSIX es inválido. La normalización de ruta
 *                  también puede producir la forma con slash `B:/~BUN/`,
 *                  así que se aceptan ambas.
 *
 * La variante de Windows faltaba antes de este comentario, lo que rompía
 * el auto-updater nativo en cada binario de release de Windows.
 */
const BUNFS_PREFIXES = ['/$bunfs/', 'B:\\~BUN\\', 'B:/~BUN/'] as const

/** Helper puro para testing — ¿esta cadena de `Bun.main` parece un entrypoint en modo bundled? */
export function isBundledMainPath(main: string): boolean {
  for (const prefix of BUNFS_PREFIXES) {
    if (main.startsWith(prefix)) return true
  }
  return false
}

export function isInBundledMode(): boolean {
  if (typeof Bun === 'undefined' || typeof Bun.main !== 'string') {
    return false
  }
  return isBundledMainPath(Bun.main)
}
