// Adaptación de @claude-code-how-works/app-host: src/runtime/installMcpRuntimeBindings.ts.
// Capa 1 tramo B — porte verbatim de la ÚNICA línea de la fuente, con la
// importación DECLARADA COLGANTE (no traducida a `@thyrox/mcp-runtime`).
//
// El paquete `mcp-runtime` NO existe en este árbol. Mismo criterio que
// `installBridgeBindings.ts` (hermano en este directorio): el import se
// conserva literal, sin traducir y sin stub, porque el paquete entero
// está ausente, no sólo un módulo suyo. Queda colgante hasta que
// `mcp-runtime` se porte.
//
// Sin test: la única línea del archivo agota la resolución de módulos
// al importarlo. Ningún consumidor de este árbol lo importa hoy.

import '@claude-code-how-works/mcp-runtime/runtimeHostSetup.js'
