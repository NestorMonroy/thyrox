/**
 * El esquema de settings — el nuestro, no el del cliente.
 *
 * Se adapta la **forma** de `ccb: settings/types.ts` (zod, `passthrough`,
 * bloques `permissions`/`hooks`/`env`) y se declara sólo lo que este proyecto
 * usa. El cliente declara **80 claves de primer nivel** —medidas, no
 * estimadas, en `ccb: packages/config/settings/types.ts:264-1152`; el comando
 * y la clasificación de las 80 están en
 * `analisis-inventario-de-settings-del-cliente`—. Copiarlas todas sería
 * paridad sin consumidor, y una clave sin consumidor es una promesa que nadie
 * cumple.
 *
 * Dos exigencias son nuestras y no del cliente, y ambas vienen de medir:
 *
 * - **el modelo va por identificador completo, nunca por alias** — el alias
 *   resuelve distinto según el proveedor (:ref:`h-docs-220`), así que un
 *   `"opus"` guardado en un archivo no determina ni la ventana ni el precio;
 * - **`cacheTtl` sólo admite `5m` y `1h`** — son los dos que el servicio
 *   tiene, y escribir otro no lo crea.
 */
import { z } from 'zod'

/** Los eventos de hook que nuestro harness emite hoy. Los 33 del cliente están en su lista; aquí van los que tienen emisor. */
export const HOOK_EVENTS = [
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'Stop',
  'SubagentStart',
  'SubagentStop',
  'PreModelSwitch',
  'PostModelSwitch',
  'PreCompact',
  'PostCompact',
] as const

const IDENTIFICADOR_DE_MODELO = z
  .string()
  .regex(/^claude-[a-z0-9-]+$/, 'el modelo se declara por identificador completo, nunca por alias')

export const HookCommandSchema = z.object({
  type: z.literal('command'),
  command: z.string().min(1),
  timeout: z.number().positive().optional(),
})

export const HookMatcherSchema = z.object({
  matcher: z.string().optional(),
  hooks: z.array(HookCommandSchema).min(1),
})

/**
 * Estricto a propósito, al contrario que el resto del esquema: un evento mal
 * escrito produce un hook que **nunca dispara**, y un fallo silencioso en la
 * capa que existe para no depender de la memoria es el peor sitio donde
 * tenerlo. La clave desconocida se rechaza nombrándola.
 */
export const HooksSchema = z.object(
  Object.fromEntries(HOOK_EVENTS.map((e) => [e, z.array(HookMatcherSchema).optional()])) as Record<
    (typeof HOOK_EVENTS)[number],
    z.ZodOptional<z.ZodArray<typeof HookMatcherSchema>>
  >,
).strict()

export const DecisionSchema = z.enum(['allow', 'ask', 'deny'])

export const PermissionsSchema = z.object({
  defaultMode: z.enum(['default', 'acceptEdits', 'bypass']).optional(),
  read: DecisionSchema.optional(),
  write: DecisionSchema.optional(),
  execute: DecisionSchema.optional(),
  additionalDirectories: z.array(z.string()).optional(),
  allow: z.array(z.string()).optional(),
  deny: z.array(z.string()).optional(),
})

/** Un número en un `.env` es un número en JSON; el proceso sólo entiende cadenas. */
export const EnvironmentVariablesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()]).transform((v) => String(v)),
)

export const SettingsSchema = z
  .object({
    $schema: z.string().optional(),
    model: IDENTIFICADOR_DE_MODELO.optional(),
    advisorModel: IDENTIFICADOR_DE_MODELO.optional(),
    effort: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).optional(),
    cacheTtl: z.enum(['5m', '1h']).optional(),
    maxTurns: z.number().int().positive().optional(),
    system: z.string().optional(),
    permissions: PermissionsSchema.optional(),
    hooks: HooksSchema.optional(),
    env: EnvironmentVariablesSchema.optional(),
    transcriptDir: z.string().optional(),
    disableAllHooks: z.boolean().optional(),
    // El cliente las declara para PONER el remolque de autoría; aquí existen
    // para poder apagarlo, que es lo que `git-author-identity.md` manda:
    // ni `Co-Authored-By: Claude …` ni `Claude-Session:` en ningún mensaje.
    // Por eso `includeCoAuthoredBy` sólo admite `false`: aceptar `true`
    // permitiría escribir en un archivo lo que la regla prohíbe.
    includeCoAuthoredBy: z.literal(false).optional(),
    attribution: z.object({ commit: z.string().optional(), pr: z.string().optional() }).optional(),

    // --- DECLARADAS: tipadas y validadas, todavía sin consumidor ------------
    // Criterio del ejecutor: sólo se retira lo que apunta a un servicio
    // externo (ver `settings/inventory.ts`). Lo demás se declara AUNQUE no se
    // use: así un error de tecleo se detecta hoy, y la deuda queda contada en
    // vez de escondida. Su estado vive en `KEY_STATUS`, no en un comentario.
    includeGitInstructions: z.boolean().optional(),
    respectGitignore: z.boolean().optional(),
    claudeMdExcludes: z.array(z.string()).optional(),
    cleanupPeriodDays: z.number().nonnegative().optional(),
    fileSuggestion: z.unknown().optional(),
    dynamicWorkflowSize: z.unknown().optional(),
    askUserQuestionTimeout: z.number().positive().optional(),
    modelType: z.string().optional(),
    availableModels: z.array(z.string()).optional(),
    modelOverrides: z.record(z.string(), z.unknown()).optional(),
    apiKeyHelper: z.string().optional(),
    defaultShell: z.string().optional(),
    allowManagedHooksOnly: z.boolean().optional(),
    allowedHttpHookUrls: z.array(z.string()).optional(),
    httpHookAllowedEnvVars: z.array(z.string()).optional(),
    allowManagedPermissionRulesOnly: z.boolean().optional(),
    allowManagedMcpServersOnly: z.boolean().optional(),
    strictPluginOnlyCustomization: z.boolean().optional(),
    enableAllProjectMcpServers: z.boolean().optional(),
    enabledMcpjsonServers: z.array(z.string()).optional(),
    disabledMcpjsonServers: z.array(z.string()).optional(),
    allowedMcpServers: z.array(z.unknown()).optional(),
    deniedMcpServers: z.array(z.unknown()).optional(),
    enabledPlugins: z.record(z.string(), z.unknown()).optional(),
    pluginConfigs: z.record(z.string(), z.unknown()).optional(),
    worktree: z.object({ symlinkDirectories: z.array(z.string()).optional(), sparsePaths: z.array(z.string()).optional() }).optional(),
    plansDirectory: z.string().optional(),
    sandbox: z.unknown().optional(),
    statusLine: z.object({ type: z.literal('command'), command: z.string() }).optional(),
    outputStyle: z.string().optional(),
    /**
     * Selección de pruebas por impacto (T-051). **No la trae el cliente**: es
     * nuestra, y existe para que el selector sirva a cualquier repo y no sólo
     * al paquete donde se escribió.
     *
     * `strategy` es un enum cerrado a propósito: un valor desconocido
     * produciría un subconjunto vacío que se leería como «no hay nada que
     * probar», y eso es un verde que no midió nada. `crossCutting` se
     * DECLARA — inferirlo mal fuerza o salta la suite completa sin que nadie
     * lo note (sub-patrón D de `metrica-decide-la-conclusion.md`).
     */
    testImpact: z.object({
      strategy: z.enum(['text-reference', 'path-convention']),
      testGlob: z.string(),
      runner: z.string(),
      fullRunner: z.string(),
      crossCutting: z.array(z.string()).optional(),
      pathPattern: z.object({ from: z.string(), to: z.string() }).optional(),
    }).optional(),
    viewMode: z.string().optional(),
    language: z.string().optional(),
    tui: z.unknown().optional(),
    spinnerTipsEnabled: z.boolean().optional(),
    spinnerVerbs: z.array(z.string()).optional(),
    spinnerTipsOverride: z.unknown().optional(),
    syntaxHighlightingDisabled: z.boolean().optional(),
    terminalTitleFromRename: z.boolean().optional(),
    prefersReducedMotion: z.boolean().optional(),
    alwaysThinkingEnabled: z.boolean().optional(),
    showThinkingSummaries: z.boolean().optional(),
    fastMode: z.unknown().optional(),
    fastModePerSessionOptIn: z.boolean().optional(),
    promptSuggestionEnabled: z.boolean().optional(),
    showClearContextOnPlanAccept: z.boolean().optional(),
    agent: z.unknown().optional(),
    autoMemoryEnabled: z.boolean().optional(),
    autoMemoryDirectory: z.string().optional(),
    autoDreamEnabled: z.boolean().optional(),
    skipWebFetchPreflight: z.boolean().optional(),
    skipDangerousModePermissionPrompt: z.boolean().optional(),
    disableAutoMode: z.boolean().optional(),
    wslInheritsWindowsSettings: z.boolean().optional(),
  })
  .passthrough()

export type Settings = z.infer<typeof SettingsSchema>
export type Permissions = z.infer<typeof PermissionsSchema>
export type HookEvent = (typeof HOOK_EVENTS)[number]
