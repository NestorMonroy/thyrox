/**
 * Global declarations for compile-time macros and internal-only identifiers
 * that are eliminated via Bun's MACRO/bundle feature system.
 */

// ============================================================================
// MACRO — compartido por varios paquetes: vive en src/types/build-globals.d.ts.

// ============================================================================
// Internal Anthropic-only identifiers (dead-code eliminated in open-source)
// These are referenced inside `MACRO(() => ...)` or `false && ...` blocks.

// Model resolution (internal)
declare function resolveAntModel(model: string): import('@thyrox/provider/model/antModels.js').AntModel | undefined
declare function getAntModels(): import('@thyrox/provider/model/antModels.js').AntModel[]
declare function getAntModelOverrideConfig(): {
  defaultSystemPromptSuffix?: string
  [key: string]: unknown
} | null

// Metrics (internal)
type ApiMetricEntry = { ttftMs: number; firstTokenTime: number; lastTokenTime: number; responseLengthBaseline: number; endResponseLength: number }
declare const apiMetricsRef: React.RefObject<ApiMetricEntry[]> | null
declare function computeTtftText(metrics: ApiMetricEntry[]): string

// Gate/feature system (internal)
declare const Gates: Record<string, boolean>
declare function GateOverridesWarning(): JSX.Element | null
declare function ExperimentEnrollmentNotice(): JSX.Element | null

// Hook timing threshold: se importa de @thyrox/tool-registry/services/hookTiming.js

// Ultraplan (internal)
declare function UltraplanChoiceDialog(props: Record<string, unknown>): JSX.Element | null
declare function UltraplanLaunchDialog(props: Record<string, unknown>): JSX.Element | null
declare function launchUltraplan(...args: unknown[]): Promise<string>

// T — Generic type parameter leaked from React compiler output
// (react/compiler-runtime emits compiled JSX that loses generic type params)
declare type T = unknown

// Tungsten (internal): declarado en su único usuario, repl/PromptInputFooterLeftSide.tsx

// ============================================================================
// Build-time constants BUILD_TARGET/BUILD_ENV/INTERFACE_TYPE — removed (zero runtime usage)

// ============================================================================
// Ink custom JSX intrinsic elements — see src/types/ink-jsx.d.ts

// ============================================================================
// Bun text/file loaders: declarados en src/types/build-globals.d.ts
