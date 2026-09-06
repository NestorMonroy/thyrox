// Adaptación de @claude-code-how-works/app-host: src/index.ts.
// Capa 0 (sin cita a paquete hermano) — porte PARCIAL, declarado.
//
// La fuente reexporta también 5 símbolos de ./packageHostSetup.js
// (2 tipos — PackageHostBindingInstallers, PackageHostCoreResolvers —
// y 3 funciones — installCorePackageHostBindings,
// installPackageHostBindings, resetPackageHostBindingsForTests). Ese
// archivo cita @claude-code-how-works/agent, /config, /memory y
// /permission (4 citas medidas), así que NO es capa 0 y queda fuera
// de este pase. Se omiten esos 5 símbolos aquí; el resto del archivo
// se porta verbatim.
//
// El paquete app-host también deja SIN portar sus dos archivos .tsx
// (context/QueuedMessageContext.tsx, context/notifications.tsx):
// ninguno de los dos es capa 0 por el criterio de "cita a paquete
// hermano" (0 hits de @claude-code-how-works en ambos), pero los dos
// requieren `react` y QueuedMessageContext.tsx además `@anthropic/ink`
// — medido: ninguno de los dos existe en node_modules de este árbol
// (`find . -maxdepth 6 -iname react -type d` → 0 resultados). Instalar
// React es decisión del ejecutor, no de este pase.

export type {
  AgentCatalogHandle,
  HostFactory,
  HostFactoryOptions,
  HostSessionStore,
  InteractiveHost,
  InteractiveHostCreateSessionArgs,
  InteractiveHostSession,
  InteractiveSessionHostBindings,
  McpRuntimeHandle,
  McpRuntimeSnapshot,
  PermissionRuntimeHandle,
  PluginRuntimeHandle,
  PluginRuntimeSnapshot,
  RuntimeHandles,
  RuntimeBindingInstallers,
  RuntimeGraph,
  SessionStoreFactory,
} from './contracts.js'
export { createRuntimeGraph } from './runtimeGraph.js'
export {
  createHeadlessHost,
  createInteractiveHost,
  createRemoteHost,
  getInteractiveSessionHostBindings,
  installHostBindings,
  installInteractiveSessionHostBindings,
  resetHostBindingsForTests,
} from './host.js'
