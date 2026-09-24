// La fuente (`ccnmt: packages/ide/src/lsp/types.ts`) era un stub `unknown`.
// La forma de la configuración sale del esquema zod del binario 2.1.275
// (el validador del `.lsp.json` de un plugin: `command`, `args`,
// `extensionToLanguage`, `transport`, …), no de una invención; los estados
// son los cinco que `LSPServerInstance.ts` asigna y compara.
export type LspServerConfig = {
  command: string
  args?: string[]
  extensionToLanguage: Record<string, string>
  transport?: 'stdio' | 'socket'
  env?: Record<string, string>
  initializationOptions?: unknown
  settings?: unknown
  workspaceFolder?: string
  startupTimeout?: number
  shutdownTimeout?: number
  restartOnCrash?: boolean
  maxRestarts?: number
  diagnostics?: boolean
}

/** Una configuración de servidor LSP junto con el origen que la declaró. */
export type ScopedLspServerConfig = LspServerConfig & { source?: string }

export type LspServerState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'error'
