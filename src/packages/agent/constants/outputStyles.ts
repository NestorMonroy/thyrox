// Canonical owner is @thyrox/config/outputStyles.
export type * from '@thyrox/config/outputStyles.js'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { clearAllOutputStylesCache, clearOutputStyleCaches, DEFAULT_OUTPUT_STYLE_NAME, getAllOutputStyles, getOutputStyleConfig, getOutputStyleDirStyles, hasCustomOutputStyle, OUTPUT_STYLE_CONFIG } from '@thyrox/config/outputStyles.js'
