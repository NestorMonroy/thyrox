// Canonical owner is @thyrox/config/product.
export * from '@thyrox/config/product'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { CLAUDE_AI_BASE_URL, CLAUDE_AI_LOCAL_BASE_URL, CLAUDE_AI_STAGING_BASE_URL, getClaudeAiBaseUrl, getRemoteSessionUrl, isRemoteSessionLocal, isRemoteSessionStaging, PRODUCT_NAME, PRODUCT_URL } from '@thyrox/config/product'
