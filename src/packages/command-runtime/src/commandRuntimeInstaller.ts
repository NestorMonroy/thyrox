/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/commandRuntimeInstaller.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO: la única función exportada,
 * `ensureCommandRuntimeInstalled`, con la misma lógica (memoiza en
 * `commandRuntimeInstalled`, revisa primero si el binding ya está
 * instalado, y si no lo está, dispara el `require()` que lo instala).
 *
 * Divergencia declarada: la fuente hace
 * `require(`${process.cwd()}/packages/app-host/src/runtime/installCommandRuntimeBindings.js`)`
 * — una ruta absoluta armada desde `process.cwd()`, propia del layout de
 * `ccnmt` (paquetes bajo `packages/` desde la raíz del repo). En este
 * árbol el mismo require se hace vía especificador de paquete
 * (`@thyrox/app-host/runtime/…`), que es lo que `pendingCrossPackageDeps.ts`
 * envuelve como `require()` diferido — command-runtime no tiene todavía
 * `node_modules/@thyrox/*`, así que este require falla en tiempo de
 * llamada (no de carga del módulo) hasta que el orquestador declare la
 * dependencia y corra `bun install`.
 */
import { hasCommandRegistryHostBindings } from './host.js'
import { requireAppHostInstallCommandRuntimeBindings } from './internal/pendingCrossPackageDeps.js'

let commandRuntimeInstalled = false

export function ensureCommandRuntimeInstalled(): void {
  if (commandRuntimeInstalled || hasCommandRegistryHostBindings()) {
    commandRuntimeInstalled = true
    return
  }

  requireAppHostInstallCommandRuntimeBindings()
  commandRuntimeInstalled = true
}
