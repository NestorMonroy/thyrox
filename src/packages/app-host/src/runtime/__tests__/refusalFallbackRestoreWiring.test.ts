/**
 * `bootstrap.ts` e `installCliBindings.ts` tienen que LLAMAR a sus
 * funciones de cableado (`wireRefusalFallbackRestoreForInteractiveStore`,
 * `wireRefusalFallbackRestoreForHeadlessStore`) dentro del propio factory de
 * store, no sólo exportarlas: exportarlas sin invocarlas deja el mismo hueco
 * que este ítem (R-2d) vino a cerrar ("ya portada pero sin llamador").
 *
 * Ejecutar la cadena entera de `installRuntimeSkeletonBindings`/
 * `installCliBindings` para probar esto exigiría un `AppState` real
 * completo y el orden de arranque de `@thyrox/config` (medido: la fuente
 * real de `getDefaultAppState()` exige "Config accessed before allowed"
 * incluso con `bootstrap.ts` ya importado) — fuera del alcance de este
 * ítem. Se mide el texto fuente, como ya hace `sessionStoreOnChangeWiring.
 * test.ts` para el mismo tipo de hueco (un creador de store invocado sin su
 * argumento obligatorio).
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = (file: string) => readFileSync(join(import.meta.dir, '..', file), 'utf8')

test('bootstrap.ts invoca wireRefusalFallbackRestoreForInteractiveStore dentro de createInteractiveStore', () => {
  const text = source('bootstrap.ts')
  const start = text.indexOf('createInteractiveStore: initialState =>')
  const factory = text.slice(start, text.indexOf('getConfigHomeDir: () =>', start))
  expect(factory).toMatch(/wireRefusalFallbackRestoreForInteractiveStore\(store\)/)
})

test('installCliBindings.ts invoca wireRefusalFallbackRestoreForHeadlessStore dentro de createHeadlessStore', () => {
  const text = source('installCliBindings.ts')
  const factory = text.slice(text.indexOf('createHeadlessStore: params =>'), text.indexOf('runHeadless: (...args) =>'))
  expect(factory).toMatch(/wireRefusalFallbackRestoreForHeadlessStore\(store\)/)
})
