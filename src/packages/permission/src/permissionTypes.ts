/**
 * Subconjunto ESTRUCTURAL de `ccnmt: packages/permission/src/permissionTypes.ts`
 * (paquete `permission`, licencia UNLICENSED — 434 líneas medidas con
 * `wc -l`). NO es un porte completo de ese archivo: es una porción local con
 * los alias de tipo (y las dos constantes de modos) que el resto de este
 * paquete consume hoy, copiados/reimplementados verbatim de sus definiciones
 * en la fuente.
 *
 * Por qué un archivo local y no un `import type` colgante hacia un
 * `./permissionTypes.js` inexistente: la fuente ES un archivo hermano real,
 * así que un `import type` apuntándole no "cuelga" (Bun lo borra en
 * tiempo de ejecución, es invisible para `bun test`) pero SÍ rompe el
 * script `typecheck` (`tsc --noEmit -p tsconfig.json`) de este paquete de
 * forma permanente — a diferencia de un paquete npm externo, un archivo
 * hermano ausente nunca se autosana con `bun install`.
 *
 * AMPLIADO (TASK del porte de `permission/` completo). Se agregan aquí, con
 * consumidor real dentro de este mismo paquete (`PermissionMode.ts`,
 * `PermissionResult.ts`, `PermissionUpdate.ts`, `shellRuleMatching.ts`,
 * `getNextPermissionMode.ts`) y, para `PermissionMode`, un consumidor
 * cross-package (`@thyrox/bridge/bridgeMessaging.ts`, que hoy declara un
 * tipo estructural propio en `internal/pendingCrossPackageDeps.ts` a la
 * espera de este puerto — ver el docstring de ese archivo):
 *
 *   `EXTERNAL_PERMISSION_MODES` · `ExternalPermissionMode` ·
 *   `InternalPermissionMode` · `PermissionMode` · `PERMISSION_MODES`
 *   (`permissionTypes.ts:16-36`) · `PermissionUpdateDestination` ·
 *   `PermissionUpdate` (`:86-127`) · `PermissionCommandMetadata` ·
 *   `PermissionMetadata` (`:150-165`) · `PendingClassifierCheck` (`:184-188`)
 *   · `PermissionAllowDecision` · `PermissionAskDecision` ·
 *   `PermissionDenyDecision` · `PermissionDecision` · `PermissionResult`
 *   (`:172-257`) · `PermissionDecisionReason` (`:269-329`).
 *
 * NO se agregan (sin consumidor confirmado en este pase): `AdditionalWorkingDirectory`
 * (SÍ se agrega — ver abajo), `PermissionCommandMetadata` sólo se usa dentro
 * de `PermissionMetadata`, `ClassifierResult`/`ClassifierBehavior`
 * (sólo los consume `yoloClassifier.ts`
 * y `classifierShared.ts`, bloqueados por `@anthropic-ai/sdk`/`zod`, no
 * linkeados en `node_modules` de este paquete sin correr `bun install`, fuera
 * de alcance de este pase), `ToolPermissionRulesBySource`/`ToolPermissionContext`
 * canónicos (cada consumidor de este pase declara su propio tipo local más
 * angosto, igual que ya hace `permissions.ts` — ver su docstring).
 *
 * DIVERGENCIA DECLARADA — `ContentBlockParam`: la fuente tipa los campos
 * `contentBlocks` de `PermissionAllowDecision`/`PermissionAskDecision` con
 * `ContentBlockParam` de `@anthropic-ai/sdk/resources/messages.mjs`, que no
 * está linkeado en `node_modules` de este paquete. Se declara aquí la misma
 * forma estructural mínima que ya usa `@thyrox/agent/messages.ts:516-518`
 * para el mismo problema (discriminante `type` + índice abierto), en vez de
 * arrastrar el SDK entero por un tipo.
 */

import { feature } from 'bun:bundle'

/** `permissionTypes.ts:42`. */
export type PermissionBehavior = 'allow' | 'deny' | 'ask'

/** `permissionTypes.ts:52-60`. Todos los `SettingSource` más los propios de regla. */
export type PermissionRuleSource =
  | 'userSettings'
  | 'projectSettings'
  | 'localSettings'
  | 'flagSettings'
  | 'policySettings'
  | 'cliArg'
  | 'command'
  | 'session'

/** `permissionTypes.ts:65-68`. */
export type PermissionRuleValue = {
  toolName: string
  ruleContent?: string
}

/** `permissionTypes.ts:73-77`. */
export type PermissionRule = {
  source: PermissionRuleSource
  ruleBehavior: PermissionBehavior
  ruleValue: PermissionRuleValue
}

// ============================================================================
// Modos de permiso — `permissionTypes.ts:16-36`
// ============================================================================

/** Los cinco modos que el protocolo SDK/IDE conoce. `permissionTypes.ts:16-21`. */
export const EXTERNAL_PERMISSION_MODES = [
  'acceptEdits',
  'bypassPermissions',
  'default',
  'dontAsk',
  'plan',
] as const

/** `permissionTypes.ts:23`. */
export type ExternalPermissionMode = (typeof EXTERNAL_PERMISSION_MODES)[number]

/**
 * `permissionTypes.ts:27-28`. `'auto'` sólo existe bajo
 * `feature('TRANSCRIPT_CLASSIFIER')`; `'bubble'` es interno y nunca entra al
 * arreglo `PERMISSION_MODES` (ver `isExternalPermissionMode` en
 * `PermissionMode.ts`, que trata a los dos como no-externos).
 */
export type InternalPermissionMode = ExternalPermissionMode | 'auto' | 'bubble'

/** `permissionTypes.ts:29`. */
export type PermissionMode = InternalPermissionMode

/**
 * Conjunto de modos direccionables por el usuario (settings.json
 * `defaultMode`, flag `--permission-mode`, recuperación de conversación).
 * `permissionTypes.ts:33-36`.
 */
export const PERMISSION_MODES = [
  ...EXTERNAL_PERMISSION_MODES,
  ...(feature('TRANSCRIPT_CLASSIFIER') ? (['auto'] as const) : ([] as const)),
] as const

/**
 * Consumo de una llamada al clasificador. `permissionTypes.ts:337-342`.
 *
 * Los cuatro campos se suman entre etapas (`combineUsage`), así que ninguno es
 * opcional: la ausencia se representa con un cero explícito al extraerlo de la
 * respuesta, no con `undefined`.
 */
export type ClassifierUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
}

/**
 * La decision del clasificador de modo auto sobre una accion, con la
 * telemetria de su llamada. `permissionTypes.ts:344-403`.
 */
export type YoloClassifierResult = {
  thinking?: string
  shouldBlock: boolean
  reason: string
  unavailable?: boolean
  /**
   * La API respondio «prompt is too long»: el transcript del clasificador
   * excede su ventana. Es determinista (mismo transcript, mismo error), asi
   * que quien llama vuelve al prompt normal en vez de reintentar o cerrar.
   */
  transcriptTooLong?: boolean
  /** El modelo de esta llamada al clasificador. */
  model: string
  /** Consumo de la llamada, para la telemetria de sobrecosto. */
  usage?: ClassifierUsage
  durationMs?: number
  /** Longitud en caracteres de cada componente del prompt enviado. */
  promptLengths?: {
    systemPrompt: number
    toolCalls: number
    userPrompts: number
  }
  /** Ruta donde se volcaron los prompts; sólo con `unavailable` por error de API. */
  errorDumpPath?: string
  /**
   * Por que un bloqueo es un fallo de parseo: negativa de politica, respuesta
   * ilegible, sin tool_use o esquema invalido. Sólo con `shouldBlock` por
   * parseo, nunca por error de API o aborto.
   */
  failureMode?: 'policy_refusal' | 'unparseable' | 'no_tool_use' | 'invalid_schema'
  /** La etapa que produjo la decision final (clasificador XML de dos etapas). */
  stage?: 'fast' | 'thinking'
  /** Consumo de la etapa 1 (rapida) cuando tambien corrio la 2. */
  stage1Usage?: ClassifierUsage
  stage1DurationMs?: number
  /**
   * `request_id` de la etapa 1, para unir con los registros de la API. El
   * clasificador de una etapa (tool_use) tambien lo escribe aqui.
   */
  stage1RequestId?: string
  /** `msg_xxx` de la etapa 1: une el evento de decision con su prompt. */
  stage1MsgId?: string
  stage2Usage?: ClassifierUsage
  stage2DurationMs?: number
  stage2RequestId?: string
  stage2MsgId?: string
}

// ============================================================================
// Actualizaciones de permiso — `permissionTypes.ts:79-127`
// ============================================================================

/** `permissionTypes.ts:82-88`. */
export type PermissionUpdateDestination =
  | 'userSettings'
  | 'projectSettings'
  | 'localSettings'
  | 'session'
  | 'cliArg'

/** `permissionTypes.ts:93-127`. */
export type PermissionUpdate =
  | {
      type: 'addRules'
      destination: PermissionUpdateDestination
      rules: PermissionRuleValue[]
      behavior: PermissionBehavior
    }
  | {
      type: 'replaceRules'
      destination: PermissionUpdateDestination
      rules: PermissionRuleValue[]
      behavior: PermissionBehavior
    }
  | {
      type: 'removeRules'
      destination: PermissionUpdateDestination
      rules: PermissionRuleValue[]
      behavior: PermissionBehavior
    }
  | {
      type: 'setMode'
      destination: PermissionUpdateDestination
      mode: ExternalPermissionMode
    }
  | {
      type: 'addDirectories'
      destination: PermissionUpdateDestination
      directories: string[]
    }
  | {
      type: 'removeDirectories'
      destination: PermissionUpdateDestination
      directories: string[]
    }

/**
 * Fuente de un directorio de trabajo adicional. `permissionTypes.ts:129-133`
 * — igual que `PermissionRuleSource` a propósito ("kept as a separate type
 * for semantic clarity and potential future divergence").
 */
export type WorkingDirectorySource = PermissionRuleSource

/** `permissionTypes.ts:135-138`. */
export type AdditionalWorkingDirectory = {
  path: string
  source: WorkingDirectorySource
}

// ============================================================================
// Decisiones y resultados de permiso — `permissionTypes.ts:142-329`
// ============================================================================

/** Divergencia declarada arriba — ver el docstring del módulo. */
export type ContentBlockParam = {
  type: string
  [key: string]: unknown
}

/**
 * Forma mínima de un comando para metadata de permiso. `permissionTypes.ts:150-155`.
 */
export type PermissionCommandMetadata = {
  name: string
  description?: string
  [key: string]: unknown
}

/** `permissionTypes.ts:160-165`. */
export type PermissionMetadata =
  | { command: PermissionCommandMetadata }
  | undefined

/**
 * Metadata de una comprobación pendiente del clasificador que correrá de
 * forma asíncrona. `permissionTypes.ts:181-188`.
 */
export type PendingClassifierCheck = {
  command: string
  cwd: string
  descriptions: string[]
}

/** `permissionTypes.ts:170-182`. */
export type PermissionAllowDecision<
  Input extends { [key: string]: unknown } = { [key: string]: unknown },
> = {
  behavior: 'allow'
  updatedInput?: Input
  userModified?: boolean
  decisionReason?: PermissionDecisionReason
  toolUseID?: string
  acceptFeedback?: string
  contentBlocks?: ContentBlockParam[]
}

/** `permissionTypes.ts:194-224`. */
export type PermissionAskDecision<
  Input extends { [key: string]: unknown } = { [key: string]: unknown },
> = {
  behavior: 'ask'
  message: string
  updatedInput?: Input
  decisionReason?: PermissionDecisionReason
  suggestions?: PermissionUpdate[]
  blockedPath?: string
  metadata?: PermissionMetadata
  isBashSecurityCheckForMisparsing?: boolean
  pendingClassifierCheck?: PendingClassifierCheck
  contentBlocks?: ContentBlockParam[]
}

/** `permissionTypes.ts:229-234`. */
export type PermissionDenyDecision = {
  behavior: 'deny'
  message: string
  decisionReason: PermissionDecisionReason
  toolUseID?: string
}

/** `permissionTypes.ts:239-244`. */
export type PermissionDecision<
  Input extends { [key: string]: unknown } = { [key: string]: unknown },
> =
  | PermissionAllowDecision<Input>
  | PermissionAskDecision<Input>
  | PermissionDenyDecision

/** `permissionTypes.ts:249-260`. */
export type PermissionResult<
  Input extends { [key: string]: unknown } = { [key: string]: unknown },
> =
  | PermissionDecision<Input>
  | {
      behavior: 'passthrough'
      message: string
      decisionReason?: PermissionDecision<Input>['decisionReason']
      suggestions?: PermissionUpdate[]
      blockedPath?: string
      pendingClassifierCheck?: PendingClassifierCheck
    }

/** `permissionTypes.ts:269-329`. */
export type PermissionDecisionReason =
  | {
      type: 'rule'
      rule: PermissionRule
    }
  | {
      type: 'mode'
      mode: PermissionMode
    }
  | {
      type: 'subcommandResults'
      reasons: Map<string, PermissionResult>
    }
  | {
      type: 'permissionPromptTool'
      permissionPromptToolName: string
      toolResult: unknown
    }
  | {
      type: 'hook'
      hookName: string
      hookSource?: string
      reason?: string
    }
  | {
      type: 'asyncAgent'
      reason: string
    }
  | {
      type: 'sandboxOverride'
      reason: 'excludedCommand' | 'dangerouslyDisableSandbox'
    }
  | {
      type: 'classifier'
      classifier: string
      reason: string
    }
  | {
      type: 'workingDir'
      reason: string
    }
  | {
      type: 'safetyCheck'
      reason: string
      classifierApprovable: boolean
      /** El disyuntor que la consulta dispara (2.1.275, `Au`/`Gge`). */
      circuitBreaker?: string
      also?: string[]
    }
  | {
      type: 'other'
      reason: string
    }
