/**
 * Puerto de `ccnmt: packages/local-observability/src/logging/unary.ts`
 * (44 líneas fuente, 100 % portado). Envoltura delgada `logUnaryEvent` —
 * sin dependencias de paquete hermano.
 */

import { logEvent } from '../index.js'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../compat.js'

export type CompletionType =
  | 'str_replace_single'
  | 'str_replace_multi'
  | 'write_file_single'
  | 'tool_use_single'

type LogEvent = {
  completion_type: CompletionType
  event: 'accept' | 'reject' | 'response'
  metadata: {
    language_name: string | Promise<string>
    message_id: string
    platform: string
    hasFeedback?: boolean
  }
}

export async function logUnaryEvent(event: LogEvent): Promise<void> {
  logEvent('tengu_unary_event', {
    event:
      event.event as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    completion_type:
      event.completion_type as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    language_name: (await event.metadata
      .language_name) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    message_id: event.metadata
      .message_id as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    platform: event.metadata
      .platform as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    ...(event.metadata.hasFeedback !== undefined && {
      hasFeedback: event.metadata.hasFeedback,
    }),
  })
}
