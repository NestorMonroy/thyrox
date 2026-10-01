/**
 * Los esquemas de los cuerpos y consultas de las rutas del inspector.
 *
 * Porte de `omniroute: src/shared/schemas/inspector.ts` (MIT).
 */
import { z } from 'zod'

/** El tope del cuerpo que se anexa a una sesión: 1 MiB. */
export const INSPECTOR_SESSION_PAYLOAD_MAX_BYTES = 1_048_576
/** El tope de una anotación. */
export const INSPECTOR_ANNOTATION_MAX_CHARS = 10_000

export const InspectorCustomHostSchema = z.object({
  host: z.string().min(1),
  enabled: z.boolean().default(true),
  label: z.string().nullable().optional(),
  kind: z.enum(['llm', 'app', 'custom']).default('custom'),
})

export const InspectorSessionStartSchema = z.object({ name: z.string().optional() })

export const InspectorSessionPatchSchema = z.object({
  action: z.enum(['stop', 'rename']),
  name: z.string().optional(),
})

export const InspectorCaptureModeActionSchema = z.object({
  action: z.enum(['start', 'stop']),
})

export const InspectorSystemProxyActionSchema = z.object({
  action: z.enum(['apply', 'revert']),
  port: z.number().int().positive().max(65535).optional(),
  guardMinutes: z.number().int().positive().optional(),
})

export const InspectorTlsInterceptToggleSchema = z.object({
  enabled: z.boolean(),
})

export const InspectorAnnotationPutSchema = z.object({
  annotation: z.string().max(INSPECTOR_ANNOTATION_MAX_CHARS),
})

export const InspectorSessionRequestAppendSchema = z.object({
  payload: z.string().max(INSPECTOR_SESSION_PAYLOAD_MAX_BYTES),
})

export const InspectorListQuerySchema = z.object({
  profile: z.enum(['llm', 'custom', 'all']).optional(),
  host: z.string().optional(),
  agent: z.string().optional(),
  status: z.enum(['2xx', '3xx', '4xx', '5xx', 'error']).optional(),
  source: z.enum(['agent-bridge', 'custom-host', 'http-proxy', 'system-proxy', 'tproxy']).optional(),
  sessionId: z.string().uuid().optional(),
})
