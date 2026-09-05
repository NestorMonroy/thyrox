// ══════════════════════════════════════════════════════════════════
// restored-src/src/utils/plugins/schemas.ts
//
// NO es el archivo completo: es el conjunto de fragmentos que el libro
// `heng` cita de él, en orden de línea, con los huecos marcados.
// Reconstruido por .claude/eventos/restored-src-20260822T232740/
//   sondas/extraer_restored_src.py — no editar a mano.
//
// Fragmentos: 7 · líneas de código: 49
// Mencionado en: part6/ch22b.md
// ══════════════════════════════════════════════════════════════════

// ─── part6/ch22b.md · líneas 7-13 ───
// This validation blocks direct impersonation attempts like "anthropic-official",
// "claude-marketplace", etc. Indirect variations (e.g., "my-claude-marketplace")
// are not blocked intentionally to avoid false positives on legitimate names.

// ─── ausente: líneas 14-18 (5 líneas sin fragmento en el corpus) ───

// ─── part6/ch22b.md · líneas 19-28 ───
export const ALLOWED_OFFICIAL_MARKETPLACE_NAMES = new Set([
  'claude-code-marketplace',
  'claude-code-plugins',
  'claude-plugins-official',
  'anthropic-marketplace',
  'anthropic-plugins',
  'agent-skills',
  'life-sciences',
  'knowledge-work-plugins',
])

// ─── ausente: líneas 29-34 (6 líneas sin fragmento en el corpus) ───

// ─── part6/ch22b.md · líneas 35 ───
const NO_AUTO_UPDATE_OFFICIAL_MARKETPLACES = new Set(['knowledge-work-plugins'])

// ─── ausente: líneas 36-312 (277 líneas sin fragmento en el corpus) ───

// ─── part6/ch22b.md · líneas 313-318 ───
dependencies: z
  .array(DependencyRefSchema())
  .optional()
  .describe(
    'Plugins that must be enabled for this plugin to function. Bare names (no "@marketplace") are resolved against the declaring plugin\'s own marketplace.',
  ),

// ─── ausente: líneas 319-384 (66 líneas sin fragmento en el corpus) ───

// ─── part6/ch22b.md · líneas 385-416 ───
export const CommandMetadataSchema = lazySchema(() =>
  z.object({
      source: RelativeCommandPath().optional(),
      content: z.string().optional(),
      description: z.string().optional(),
      argumentHint: z.string().optional(),
      // ...
  }),
)

// ─── ausente: líneas 417-883 (467 líneas sin fragmento en el corpus) ───

// ─── part6/ch22b.md · líneas 884-898 ───
export const PluginManifestSchema = lazySchema(() =>
  z.object({
    ...PluginManifestMetadataSchema().shape,
    ...PluginManifestHooksSchema().partial().shape,
    ...PluginManifestCommandsSchema().partial().shape,
    ...PluginManifestAgentsSchema().partial().shape,
    ...PluginManifestSkillsSchema().partial().shape,
    ...PluginManifestOutputStylesSchema().partial().shape,
    ...PluginManifestChannelsSchema().partial().shape,
    ...PluginManifestMcpServerSchema().partial().shape,
    ...PluginManifestLspServerSchema().partial().shape,
    ...PluginManifestSettingsSchema().partial().shape,
    ...PluginManifestUserConfigSchema().partial().shape,
  }),
)

// ─── ausente: líneas 899-905 (7 líneas sin fragmento en el corpus) ───

// ─── part6/ch22b.md · líneas 906-907 ───
export const MarketplaceSourceSchema = lazySchema(() =>
  z.discriminatedUnion('source', [
    // url, github, git, npm, file, directory, hostPattern, pathPattern, settings
  ]),
)
