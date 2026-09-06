// Adaptación de @claude-code-how-works/app-host: src/runtime/installBridgeBindings.ts.
// Capa 1 tramo B — porte verbatim de la ÚNICA línea de la fuente, con la
// importación DECLARADA COLGANTE (no traducida a `@thyrox/bridge`).
//
// La fuente es un único side-effect import a
// `@claude-code-how-works/bridge/runtimeHostSetup.js`. El paquete `bridge`
// NO existe en este árbol (`ls src/packages/` — sólo agent, app-host,
// binary, command-runtime, config, harness, storage, tasks). No es un
// caso de "módulo aún no exportado" (como `./commandRegistryRuntime.js`
// en `installCommandRuntimeBindings.ts`, capa 0, ya en este mismo
// directorio): aquí el PAQUETE HERMANO ENTERO está ausente.
//
// Se conserva el import literal —no se traduce a `@thyrox/bridge/...`,
// que tampoco existiría— siguiendo el mismo criterio que
// `agent/internal/macroFallback.ts` fija para `@claude-code-how-works/config/env`:
// el import se pinnea contra la fuente, no contra un sustituto local. No
// se fabrica un stub. Queda colgante hasta que `bridge` se porte.
//
// Sin test: importar este archivo agota la resolución de módulos en la
// primera línea (paquete inexistente). Ningún test de este árbol lo
// importa hoy — mismo estado que `installCommandRuntimeBindings.ts`,
// `installProviderBindings.ts` e `installToolRegistryBindings.ts`, los
// tres ya portados en este directorio sin suite.

import '@claude-code-how-works/bridge/runtimeHostSetup.js'
