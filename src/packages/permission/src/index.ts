/**
 * El barrel del paquete: lo que un consumidor alcanza sin conocer la
 * distribución interna de archivos.
 *
 * Procedencia: `ccnmt: packages/permission/src/index.ts` (18 líneas, 14
 * módulos reexportados). Ese árbol declara `"license": "UNLICENSED"`, así
 * que se reimplementa y no se copia.
 *
 * PORTE COMPLETO en su forma: los 14 módulos que la fuente reexporta están
 * los 14 aquí. Lo que cada uno trae depende de su propio porte —varios son
 * parciales declarados, y su docstring dice qué falta y por qué.
 *
 * POR QUÉ NO LLEGÓ ANTES. `permissionSetup.js` es uno de los catorce, y
 * hasta el tramo anterior no existía en este árbol. Un barrel que reexporta
 * un módulo ausente no falla al escribirse: falla al importarse, y arrastra
 * a todo consumidor. Por eso esperó.
 *
 * DIVERGENCIA DECLARADA: ninguna en el contenido. En la DISTRIBUCIÓN sí:
 * este barrel se alcanza en `./index.js`, no en la raíz `.`, que sigue
 * apuntando a `permission.ts`. La razón está medida, no es inercia: el
 * barrel importa `permissionSetup`, que importa `@thyrox/config/settings`,
 * así que ponerlo en la raíz haría que los tres consumidores del specifier
 * raíz —que entre los tres quieren dos símbolos y un tipo— arrastraran la
 * cadena de settings sólo por importar.
 *
 * Un aviso sobre `export *`, que no es cosmético: un nombre exportado por
 * dos de los doce módulos se cae del barrel EN SILENCIO —ESM lo omite en
 * vez de reportarlo—. Medido al portar: 102 símbolos distintos, 0
 * colisiones. La suite lo vuelve a medir en cada corrida, porque es la
 * clase de defecto que sólo aparece al añadir el símbolo número 103.
 */
export type { PermissionHostBindings } from './contracts.js'
export {
  getPermissionHostBindings,
  installPermissionHostBindings,
} from './host.js'

export * from './permissions.js'
export * from './permissionSetup.js'
export * from './PermissionMode.js'
export * from './PermissionResult.js'
export * from './PermissionRule.js'
export * from './PermissionUpdate.js'
export * from './PermissionUpdateSchema.js'
export * from './PermissionPromptToolResultSchema.js'
export * from './filesystem.js'
export * from './denialTracking.js'
export * from './permissionRuleParser.js'
export * from './errors.js'
