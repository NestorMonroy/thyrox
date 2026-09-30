/**
 * Constantes que Bun inyecta al construir (`bunfig.toml` [define] en
 * desarrollo, `Bun.build({ define })` en producción).
 *
 * Viven aquí y no en un paquete porque las usan varios: `storage`,
 * `permission`, `bridge`, `mcp-runtime`, `config`, `app-host`,
 * `local-observability`, `provider`… Antes estaban sólo en
 * `cli/src/types/global.d.ts`, así que cada paquete compilaba en la raíz
 * por estar en el mismo programa que `cli`, y fallaba solo. El proyecto por
 * paquete de `src/typescript/emit_declarations.py` incluye este archivo.
 */
declare namespace MACRO {
  export const VERSION: string
  export const BUILD_TIME: string
  export const FEEDBACK_CHANNEL: string
  export const ISSUES_EXPLAINER: string
  export const NATIVE_PACKAGE_URL: string
  export const PACKAGE_URL: string
  export const VERSION_CHANGELOG: string
}

// Cargadores de texto de Bun: importar un recurso no-TS como cadena. Los usan
// `cli` y `command-runtime` (sus skills en .md).
declare module '*.md' {
  const content: string
  export default content
}
declare module '*.txt' {
  const content: string
  export default content
}
declare module '*.html' {
  const content: string
  export default content
}
declare module '*.css' {
  const content: string
  export default content
}
