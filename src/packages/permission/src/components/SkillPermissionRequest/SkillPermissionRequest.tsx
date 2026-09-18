import React, { useCallback, useMemo } from 'react'
import { logError } from '@thyrox/local-observability/logging'
import { getOriginalCwd } from '@thyrox/app-host/bootstrap/state.js'
import { Box, Text } from '@anthropic/ink'
import { sanitizeToolNameForAnalytics } from '@thyrox/agent/eventMetadata.js'
import { SKILL_TOOL_NAME } from '@thyrox/tool-registry/tools/SkillTool/constants.js'
import { SkillTool } from '@thyrox/tool-registry/tools/SkillTool/SkillTool.js'
import { env } from '@thyrox/config/env/paths'
import { shouldShowAlwaysAllowOptions } from '../../permissionsLoader.js'
import { logUnaryEvent } from '@thyrox/local-observability/logging'
import { type UnaryEvent, usePermissionRequestLogging } from '../hooks.js'
import { PermissionDialog } from '../PermissionDialog.js'
import {
  PermissionPrompt,
  type PermissionPromptOption,
  type ToolAnalyticsContext,
} from '../PermissionPrompt.js'
import type { PermissionRequestProps } from '../PermissionRequest.js'
import { PermissionRuleExplanation } from '../PermissionRuleExplanation.js'

type SkillOptionValue = 'yes' | 'yes-exact' | 'yes-prefix' | 'no'

export function SkillPermissionRequest(
  props: PermissionRequestProps,
): React.ReactNode {
  const {
    toolUseConfirm,
    onDone,
    onReject,
    verbose: _verbose,
    workerBadge,
  } = props
  const parseInput = (input: unknown): string => {
    const result = SkillTool.inputSchema.safeParse(input)
    if (!result.success) {
      logError(
        new Error(`Failed to parse skill tool input: ${result.error.message}`),
      )
      return ''
    }
    return result.data.skill
  }

  const skill = parseInput(toolUseConfirm.input)

  // Copia de `ccnmt: packages/permission/src/components/SkillPermissionRequest/
  // SkillPermissionRequest.tsx` con los comentarios traducidos; el cuerpo es el
  // de la fuente.
  //
  // Comprueba si esto es un comando, usando la metadata de checkPermissions.
  const commandObj =
    toolUseConfirm.permissionResult.behavior === 'ask' &&
    toolUseConfirm.permissionResult.metadata &&
    'command' in toolUseConfirm.permissionResult.metadata
      ? toolUseConfirm.permissionResult.metadata.command
      : undefined

  const unaryEvent = useMemo<UnaryEvent>(
    () => ({
      completion_type: 'tool_use_single',
      language_name: 'none',
    }),
    [],
  )

  usePermissionRequestLogging(toolUseConfirm, unaryEvent)

  const originalCwd = getOriginalCwd()
  const showAlwaysAllowOptions = shouldShowAlwaysAllowOptions()
  const options = useMemo((): PermissionPromptOption<SkillOptionValue>[] => {
    const baseOptions: PermissionPromptOption<SkillOptionValue>[] = [
      {
        label: 'Yes',
        value: 'yes',
        feedbackConfig: { type: 'accept' },
      },
    ]

    // Las opciones de "permitir siempre" solo se añaden cuando
    // allowManagedPermissionRulesOnly no las restringe.
    const alwaysAllowOptions: PermissionPromptOption<SkillOptionValue>[] = []
    if (showAlwaysAllowOptions) {
      // Añade la opción de coincidencia exacta.
      alwaysAllowOptions.push({
        label: (
          <Text>
            Yes, and don&apos;t ask again for <Text bold>{skill}</Text> in{' '}
            <Text bold>{originalCwd}</Text>
          </Text>
        ),
        value: 'yes-exact',
      })

      // Añade la opción de prefijo si el skill lleva argumentos.
      const spaceIndex = skill.indexOf(' ')
      if (spaceIndex > 0) {
        const commandPrefix = skill.substring(0, spaceIndex)
        alwaysAllowOptions.push({
          label: (
            <Text>
              Yes, and don&apos;t ask again for{' '}
              <Text bold>{commandPrefix + ':*'}</Text> commands in{' '}
              <Text bold>{originalCwd}</Text>
            </Text>
          ),
          value: 'yes-prefix',
        })
      }
    }

    const noOption: PermissionPromptOption<SkillOptionValue> = {
      label: 'No',
      value: 'no',
      feedbackConfig: { type: 'reject' },
    }

    return [...baseOptions, ...alwaysAllowOptions, noOption]
  }, [skill, originalCwd, showAlwaysAllowOptions])

  const toolAnalyticsContext = useMemo(
    (): ToolAnalyticsContext => ({
      toolName: sanitizeToolNameForAnalytics(toolUseConfirm.tool.name),
      isMcp: toolUseConfirm.tool.isMcp ?? false,
    }),
    [toolUseConfirm.tool.name, toolUseConfirm.tool.isMcp],
  )

  const handleSelect = useCallback(
    (value: SkillOptionValue, feedback?: string) => {
      switch (value) {
        case 'yes':
          void logUnaryEvent({
            completion_type: 'tool_use_single',
            event: 'accept',
            metadata: {
              language_name: 'none',
              message_id: toolUseConfirm.assistantMessage.message.id,
              platform: env.platform,
            },
          })
          toolUseConfirm.onAllow(toolUseConfirm.input, [], feedback)
          onDone()
          break
        case 'yes-exact': {
          void logUnaryEvent({
            completion_type: 'tool_use_single',
            event: 'accept',
            metadata: {
              language_name: 'none',
              message_id: toolUseConfirm.assistantMessage.message.id,
              platform: env.platform,
            },
          })

          toolUseConfirm.onAllow(toolUseConfirm.input, [
            {
              type: 'addRules',
              rules: [
                {
                  toolName: SKILL_TOOL_NAME,
                  ruleContent: skill,
                },
              ],
              behavior: 'allow',
              destination: 'localSettings',
            },
          ])
          onDone()
          break
        }
        case 'yes-prefix': {
          void logUnaryEvent({
            completion_type: 'tool_use_single',
            event: 'accept',
            metadata: {
              language_name: 'none',
              message_id: toolUseConfirm.assistantMessage.message.id,
              platform: env.platform,
            },
          })

          // Extrae el prefijo del skill: todo lo anterior al primer espacio.
          const spaceIndex = skill.indexOf(' ')
          const commandPrefix =
            spaceIndex > 0 ? skill.substring(0, spaceIndex) : skill

          toolUseConfirm.onAllow(toolUseConfirm.input, [
            {
              type: 'addRules',
              rules: [
                {
                  toolName: SKILL_TOOL_NAME,
                  ruleContent: `${commandPrefix}:*`,
                },
              ],
              behavior: 'allow',
              destination: 'localSettings',
            },
          ])
          onDone()
          break
        }
        case 'no':
          void logUnaryEvent({
            completion_type: 'tool_use_single',
            event: 'reject',
            metadata: {
              language_name: 'none',
              message_id: toolUseConfirm.assistantMessage.message.id,
              platform: env.platform,
            },
          })
          toolUseConfirm.onReject(feedback)
          onReject()
          onDone()
          break
      }
    },
    [toolUseConfirm, onDone, onReject, skill],
  )

  const handleCancel = useCallback(() => {
    void logUnaryEvent({
      completion_type: 'tool_use_single',
      event: 'reject',
      metadata: {
        language_name: 'none',
        message_id: toolUseConfirm.assistantMessage.message.id,
        platform: env.platform,
      },
    })
    toolUseConfirm.onReject()
    onReject()
    onDone()
  }, [toolUseConfirm, onDone, onReject])

  return (
    <PermissionDialog title={`Use skill "${skill}"?`} workerBadge={workerBadge}>
      <Text>Claude may use instructions, code, or files from this Skill.</Text>
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text dimColor>{commandObj?.description}</Text>
      </Box>

      <Box flexDirection="column">
        <PermissionRuleExplanation
          permissionResult={toolUseConfirm.permissionResult}
          toolType="tool"
        />
        <PermissionPrompt
          options={options}
          onSelect={handleSelect}
          onCancel={handleCancel}
          toolAnalyticsContext={toolAnalyticsContext}
        />
      </Box>
    </PermissionDialog>
  )
}
