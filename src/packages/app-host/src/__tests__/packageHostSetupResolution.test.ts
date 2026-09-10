/**
 * Probe de conducta para TASK-THYROX-0005 — mide RESOLUCIÓN, no manifiesto.
 *
 * Ambos imports son estáticos, a nivel de módulo, físicamente dentro de
 * `app-host`: Bun resuelve un especificador `@thyrox/*` contra el
 * `package.json` que gobierna el directorio del archivo que hace el
 * import, no contra el cwd del proceso. Un probe fuera de este paquete no
 * mediría lo mismo.
 *
 * `installPermissionHostBindings` se importa por la subruta `/host.js`,
 * no por la raíz del paquete: la raíz de `@thyrox/permission` apunta a
 * `permission.ts` (no al barrel) y no reexporta este símbolo — ver el
 * docstring de `../packageHostSetup.ts`. `installMemoryHostBindings` sí
 * se alcanza desde la raíz de `@thyrox/memory`.
 *
 * Este archivo NO importa nada de `declaredDependencies.test.ts` (control
 * hermano): las dos mediciones se mantienen separadas a propósito — es lo
 * que hace discriminante el test de anulación de ese control. Quitar una
 * línea de `dependencies` no desvincula un symlink de `node_modules/`
 * ya creado por una instalación previa, así que este probe puede seguir
 * en verde mientras el control, que sólo lee el manifiesto, se pone en
 * rojo.
 *
 * Métrica: si el runtime de Bun resuelve el especificador y el símbolo
 * importado es, en efecto, una función.
 * Ciega a: si el paquete está DECLARADO en `dependencies` — un símlink de
 * `node_modules/@thyrox/` sobrante de una instalación anterior resolvería
 * igual aunque la línea del manifiesto ya no exista. Eso es intencional:
 * es justo la mitad que el control de manifiesto sí ve.
 */
import { expect, test } from 'bun:test'
import { installMemoryHostBindings } from '@thyrox/memory'
import { installPermissionHostBindings } from '@thyrox/permission/host.js'

test('installMemoryHostBindings resuelve como función desde @thyrox/memory', () => {
  expect(typeof installMemoryHostBindings).toBe('function')
})

test('installPermissionHostBindings resuelve como función desde @thyrox/permission/host.js', () => {
  expect(typeof installPermissionHostBindings).toBe('function')
})
