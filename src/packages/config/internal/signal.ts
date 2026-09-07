/**
 * Puerto de `ccnmt: packages/config/internal/signal.ts` (24 líneas fuente).
 * Reimplementación fiel VERBATIM. Sin dependencias.
 *
 * La fuente lo declara duplicado a propósito de `src/utils/signal.ts` (la
 * versión completa, portada aquí como `../signal.ts`) para no arrastrar
 * dependencias de `src/` a `config`. Esa razón no aplica dentro de este
 * árbol —ambos archivos ya viven en el mismo paquete— pero se preserva la
 * duplicación porque es lo que la fuente hace, y `changeDetector.ts` (hoy
 * bloqueado por falta de `chokidar`, ver `porte-completo-no-parcial.md`)
 * importa esta ruta concreta cuando se porte.
 */
type Signal<Args extends unknown[] = []> = {
  subscribe(listener: (...args: Args) => void): () => void
  emit(...args: Args): void
  clear(): void
}

export function createSignal<Args extends unknown[] = []>(): Signal<Args> {
  const listeners = new Set<(...args: Args) => void>()
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    emit(...args) {
      for (const listener of listeners) listener(...args)
    },
    clear() {
      listeners.clear()
    },
  }
}
