/**
 * Adaptación de @claude-code-how-works/app-host: src/runtime/installNativeStdinReader.ts.
 * Capa 1 tramo B — porte FIEL de la estructura; instalación de las
 * dependencias EXTERNAS declarada como decisión pendiente del ejecutor,
 * NO instalada en este pase.
 *
 * La fuente conecta un lector de stdin NATIVO (`stdin-napi`, un binding
 * `.node` en Rust) al callback `nativeStdinReader` de `@anthropic/ink`,
 * para sortear un bug de Bun standalone (el poll de libuv sobre stdin
 * queda mudo tras un ciclo mount→unmount→remount de Ink). Dos
 * dependencias son EXTERNAS y ninguna está instalada en este árbol:
 *
 *   - `stdin-napi` — un binario nativo (`.node`), no un paquete puro TS.
 *     Instalar un binding nativo es decisión del ejecutor, no de este
 *     pase (regla del proyecto: "NO instales dependencias externas").
 *   - `@anthropic/ink` — la librería de UI en React que renderiza la
 *     sesión interactiva; tampoco está en `node_modules` de este árbol
 *     (`find . -maxdepth 6 -iname ink -type d` → 0 resultados). Es la
 *     misma ausencia que `app-host/src/index.ts` ya documenta para los
 *     dos `.tsx` de este paquete (`context/QueuedMessageContext.tsx`,
 *     `context/notifications.tsx`), que quedaron fuera de porte por la
 *     misma razón.
 *
 * Además, `logForDebugging` de `@claude-code-how-works/local-observability/debug.js`
 * es un paquete hermano ausente por completo en este árbol.
 *
 * Los tres imports se conservan literales, sin traducir y sin stub —
 * mismo criterio que `installCliBindings.ts` (hermano en este
 * directorio) y `agent/internal/macroFallback.ts`. El resto del archivo
 * —el guard `installed`, el escape hatch `CLAUDE_CODE_NATIVE_STDIN=0`,
 * el registro de callbacks y el auto-run final— se porta verbatim: es
 * la única parte con lógica propia, y no depende de QUÉ hace
 * `setAppCallbacks`/`isReaderSupported`/`startReader` — sólo de que
 * existan.
 *
 * Sin test: los tres imports de valor agotan la resolución de módulos
 * antes de correr cualquier código, y el auto-run final ejecutaría el
 * wiring de inmediato aunque se lograra importar. Bloqueo declarado, no
 * fabricado — no hay stub local para un binario nativo ni para una
 * librería de UI ausente.
 */
import { setAppCallbacks } from '@anthropic/ink'
import { isReaderSupported, startReader } from 'stdin-napi'
import { logForDebugging } from '@claude-code-how-works/local-observability/debug.js'

let installed = false

export function installNativeStdinReader(): void {
  if (installed) return
  installed = true

  // Escape hatch: si el lector nativo llega a portarse mal en la
  // terminal de un usuario, CLAUDE_CODE_NATIVE_STDIN=0 fuerza la ruta
  // estándar de process.stdin.
  if (process.env.CLAUDE_CODE_NATIVE_STDIN === '0') {
    logForDebugging(
      '[stdin] native reader disabled via CLAUDE_CODE_NATIVE_STDIN=0',
    )
    return
  }

  setAppCallbacks({
    nativeStdinReader: {
      isSupported: () => {
        try {
          return isReaderSupported()
        } catch {
          return false
        }
      },
      // redirect_fd0=false: leer fd 0 directo. App.tsx destruye el stdin
      // de Bun (cerrando su tty handle interno) ANTES de que esto corra,
      // así que el reader de Rust es el único dueño de fd 0 — sin
      // necesitar un redirect dup2.
      start: onChunk => startReader(false, onChunk),
    },
  })
  logForDebugging('[stdin] native reader callbacks installed')
}

installNativeStdinReader()
