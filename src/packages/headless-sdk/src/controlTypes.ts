/**
 * Puerto de `ccnmt: packages/headless-sdk/src/controlTypes.ts` (verbatim en
 * estructura; los imports que en la fuente son auto-referencias al propio
 * paquete por nombre, `@claude-code-how-works/headless-sdk/*`, se portan
 * como imports relativos — son módulos hermanos dentro del MISMO paquete,
 * no una dependencia cruzada).
 *
 * Tipos de Control del SDK — inferidos de los schemas Zod en
 * `controlSchemas.ts` / `coreSchemas.ts`.
 *
 * Definen el protocolo de control entre el bridge del CLI y el servidor.
 * Los consume la capa de bridge/transporte, el gestor de sesión remota, y
 * las rutas de print/IO del CLI.
 */
import type { z } from 'zod/v4'
import type {
  SDKControlRequestSchema,
  SDKControlResponseSchema,
  SDKControlInitializeRequestSchema,
  SDKControlInitializeResponseSchema,
  SDKControlMcpSetServersResponseSchema,
  SDKControlReloadPluginsResponseSchema,
  SDKControlPermissionRequestSchema,
  SDKControlCancelRequestSchema,
  SDKControlRequestInnerSchema,
  StdoutMessageSchema,
  StdinMessageSchema,
} from './controlSchemas.ts'
import type { SDKPartialAssistantMessageSchema } from './coreSchemas.ts'

export type SDKControlRequest = z.infer<ReturnType<typeof SDKControlRequestSchema>>
export type SDKControlResponse = z.infer<ReturnType<typeof SDKControlResponseSchema>>
export type StdoutMessage = z.infer<ReturnType<typeof StdoutMessageSchema>>
export type SDKControlInitializeRequest = z.infer<ReturnType<typeof SDKControlInitializeRequestSchema>>
export type SDKControlInitializeResponse = z.infer<ReturnType<typeof SDKControlInitializeResponseSchema>>
export type SDKControlMcpSetServersResponse = z.infer<ReturnType<typeof SDKControlMcpSetServersResponseSchema>>
export type SDKControlReloadPluginsResponse = z.infer<ReturnType<typeof SDKControlReloadPluginsResponseSchema>>
export type StdinMessage = z.infer<ReturnType<typeof StdinMessageSchema>>
export type SDKPartialAssistantMessage = z.infer<ReturnType<typeof SDKPartialAssistantMessageSchema>>
export type SDKControlPermissionRequest = z.infer<ReturnType<typeof SDKControlPermissionRequestSchema>>
export type SDKControlCancelRequest = z.infer<ReturnType<typeof SDKControlCancelRequestSchema>>
export type SDKControlRequestInner = z.infer<ReturnType<typeof SDKControlRequestInnerSchema>>
