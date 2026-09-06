// Adaptación de @claude-code-how-works/app-host: src/main/cli/runtimeActivation.ts.
// Capa 1 — porte PARCIAL declarado.
//
// El gateo real de las dos funciones depende de `feature('PROACTIVE')`,
// `feature('KAIROS')` y `feature('KAIROS_BRIEF')` — macros de `bun:bundle`
// resueltas en tiempo de compilación por el bundler de ccnmt (confirmado
// empíricamente: `bun -e "import('bun:bundle')"` da
// `Cannot find package 'bundle'` en este runtime). Se omiten, con el mismo
// precedente que `storage/src/sessionStoragePredicates.ts`: sin esos
// flags, la fuente NUNCA activa proactive/brief en un build como el
// nuestro, así que el puerto honesto es no activarlos nunca — no fabricar
// un mecanismo de flag equivalente que la fuente no pidió (`no hay uno
// equivalente todavía en @thyrox/*`, mismo texto de aquel porte).
//
// `require("@claude-code-how-works/agent/proactive/index.js")` y
// `require("@claude-code-how-works/tool-registry/tools/BriefTool/BriefTool.js")`
// son paquetes hermanos ausentes enteros; se reciben como colaboradores
// inyectables (`ProactiveDeps`/`BriefDeps`) con default no-op, igual que
// `logEvent` (de `@claude-code-how-works/local-observability`, ausente).
// `setUserMsgOptIn` (de `../../bootstrap/state.js`) también se recibe
// inyectado: no está exportado todavía por nuestro `bootstrap/state.ts`.
// `isEnvTruthy` se reimplementa localmente (verbatim de
// `ccnmt: packages/config/env/utils.ts:43-48`).

function isEnvTruthy(envVar: string | boolean | undefined): boolean {
  if (!envVar) return false
  if (typeof envVar === 'boolean') return envVar
  const normalizedValue = envVar.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalizedValue)
}

export type ProactiveDeps = {
  isProactiveActive?: () => boolean
  activateProactive?: (source: string) => void
}

export function maybeActivateProactive(options: unknown, deps: ProactiveDeps = {}): void {
  // Ver docstring del módulo: `feature('PROACTIVE') || feature('KAIROS')`
  // se omite (constante en `false`), no se reemplaza.
  const featureGateActive = false
  if (
    featureGateActive &&
    ((options as { proactive?: boolean } | null)?.proactive || isEnvTruthy(process.env.CLAUDE_CODE_PROACTIVE))
  ) {
    const isProactiveActive = deps.isProactiveActive ?? (() => false)
    const activateProactive = deps.activateProactive ?? (() => {})
    if (!isProactiveActive()) {
      activateProactive('command')
    }
  }
}

export type BriefDeps = {
  isBriefEntitled?: () => boolean
  setUserMsgOptIn?: (value: boolean) => void
  logEvent?: (event: string, metadata: Record<string, unknown>) => void
}

export function maybeActivateBrief(options: unknown, deps: BriefDeps = {}): void {
  // Ver docstring del módulo: `feature('KAIROS') || feature('KAIROS_BRIEF')`
  // se omite (constante en `false`), no se reemplaza.
  const featureGateActive = false
  if (!featureGateActive) return

  const briefFlag = (options as { brief?: boolean } | null)?.brief
  const briefEnv = isEnvTruthy(process.env.CLAUDE_CODE_BRIEF)
  if (!briefFlag && !briefEnv) return

  const isBriefEntitled = deps.isBriefEntitled ?? (() => false)
  const setUserMsgOptIn = deps.setUserMsgOptIn ?? (() => {})
  const logEvent = deps.logEvent ?? (() => {})

  const entitled = isBriefEntitled()
  if (entitled) {
    setUserMsgOptIn(true)
  }
  logEvent('tengu_brief_mode_enabled', {
    enabled: entitled,
    gated: !entitled,
    source: briefEnv ? 'env' : 'flag',
  })
}
