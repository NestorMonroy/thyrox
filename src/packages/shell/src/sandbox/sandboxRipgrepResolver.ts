/**
 * Porte fiel de
 * `ccnmt: packages/shell/src/sandbox/sandboxRipgrepResolver.ts`.
 *
 * Resuelve una ruta de ripgrep que sandbox-runtime pueda lanzar.
 *
 * sandbox-runtime recibe `rg` como binario externo porque es un proceso
 * aparte — NAPI no ayuda aquí. Tres caminos:
 *
 *   - Linux + binario standalone: extraer el `rg` embebido a `tmp` en la
 *     primera llamada (sandbox-runtime necesita un archivo real en disco
 *     para lanzarlo)
 *   - Linux + modo desarrollo: usar el `rg` vendorizado en disco de este
 *     checkout
 *   - macOS / Windows: cualquier ruta sirve — el sandbox de macOS usa
 *     globs de perfil nativos y nunca hace shell-out; Windows no soporta
 *     sandboxing en absoluto
 *
 * Se sacó de `sandbox-adapter.ts` para mantener honesto su presupuesto de
 * líneas. El caso borde de sandbox-rg es chico pero inevitable mientras
 * `@anthropic-ai/sandbox-runtime` reciba `rg` como valor de config.
 *
 * Porte COMPLETO: el único símbolo exportado de la fuente está presente.
 *
 * Divergencia medida: `isInBundledMode` y
 * `ensureExtractedRipgrepForSandbox` se resuelven vía los envoltorios
 * `requireConfigBundledMode()`/`requireToolRegistryEmbeddedRgExtractor()`
 * de `../internal/pendingCrossPackageDeps.js` — BLOQUEADOS, ver el
 * docstring de ese módulo. Este archivo carga sin error; el camino Linux
 * lanza si de verdad se invoca, antes de que exista la pieza real.
 *
 * @module
 */
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  requireConfigBundledMode,
  requireToolRegistryEmbeddedRgExtractor,
} from '../internal/pendingCrossPackageDeps.js'

export function getSandboxRipgrep(): { rgPath: string; rgArgs: string[] } {
  if (process.platform === 'linux') {
    const extracted =
      requireToolRegistryEmbeddedRgExtractor().ensureExtractedRipgrepForSandbox()
    if (extracted) {
      return { rgPath: extracted, rgArgs: [] }
    }
    // Respaldo de modo desarrollo: rg vendorizado junto al árbol fuente de este módulo.
    if (!requireConfigBundledMode().isInBundledMode()) {
      const here = fileURLToPath(import.meta.url)
      const vendorDir = join(
        here,
        '..',
        '..',
        '..',
        'vendor',
        'ripgrep',
        `${process.arch}-linux`,
      )
      return { rgPath: join(vendorDir, 'rg'), rgArgs: [] }
    }
  }
  return { rgPath: 'rg', rgArgs: [] }
}
