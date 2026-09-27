// Canonical owner is @thyrox/provider/oauthConstants.
export * from '@thyrox/provider/oauthConstants'
// Nombres de valor generados por src/verify/expandStarShims.ts — `bun build` no
// los ve a través de un `export *` externo cuando el shim también es entrada.
export { ALL_OAUTH_SCOPES, CLAUDE_AI_INFERENCE_SCOPE, CLAUDE_AI_OAUTH_SCOPES, CLAUDE_AI_PROFILE_SCOPE, CONSOLE_OAUTH_SCOPES, fileSuffixForOauthConfig, getOauthConfig, LONG_LIVED_OAUTH_TOKEN_TTL_SECONDS, MCP_CLIENT_METADATA_URL, OAUTH_BETA_HEADER } from '@thyrox/provider/oauthConstants'
