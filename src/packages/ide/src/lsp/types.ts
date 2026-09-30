// La fuente (`ccnmt: packages/ide/src/lsp/types.ts`) era un stub `unknown`.
// La forma de la configuración sale del esquema zod del binario 2.1.275
// (el validador del `.lsp.json` de un plugin: `command`, `args`,
// `extensionToLanguage`, `transport`, …), no de una invención; los estados
// son los cinco que `LSPServerInstance.ts` asigna y compara.
// Las dos formas viven en `@thyrox/config/plugin/types`: `config` las
// necesita al leer el `.lsp.json` de un plugin y no puede depender de `ide`.
export type { LspServerConfig, ScopedLspServerConfig } from '@thyrox/config/plugin/types'

export type LspServerState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'error'
