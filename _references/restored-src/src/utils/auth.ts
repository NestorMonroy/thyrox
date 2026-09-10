// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/auth.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 2 · líneas de código: 9
// Mencionado en: appendix/g-auth-subscription.md
// ══════════════════════════════════════════════════════════════════

// ─── appendix/g-auth-subscription.md · líneas 208-212 ───
type ApiKeySource =
  | 'ANTHROPIC_API_KEY'     // Environment variable
  | 'apiKeyHelper'          // Custom command
  | '/login managed key'    // OAuth-generated key
  | 'none'                  // No authentication

// ─── ausente: líneas 213-1661 (1449 líneas sin fragmento en el corpus) ───

// ─── appendix/g-auth-subscription.md · líneas 1662-1711 ───
function getSubscriptionType(): 'max' | 'pro' | 'team' | 'enterprise' | null
function isMaxSubscriber(): boolean
function isTeamPremiumSubscriber(): boolean  // Team with 5x rate limit
function getRateLimitTier(): string  // e.g., 'default_claude_max_20x'
