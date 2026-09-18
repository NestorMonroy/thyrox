import { BASH_TOOL_NAME } from '@thyrox/tool-registry/tools/BashTool/toolName.js'
import { extractOutputRedirections } from '@thyrox/shell/bash/commands.js'
import { isClassifierPermissionsEnabled } from '../../bashClassifier.js'
import type { PermissionDecisionReason } from '../../PermissionResult.js'
import type { PermissionUpdate } from '../../PermissionUpdateSchema.js'
import { shouldShowAlwaysAllowOptions } from '../../permissionsLoader.js'
import type { OptionWithDescription } from '@thyrox/repl/components/CustomSelect/select.js'
import { generateShellSuggestionsLabel } from '../shellPermissionHelpers.js'
import { readEnv } from '@thyrox/config/env'

type BashToolUseOption =
  | 'yes'
  | 'yes-apply-suggestions'
  | 'yes-prefix-edited'
  | 'yes-classifier-reviewed'
  | 'no'

/**
 * Copia de `ccnmt: packages/permission/src/components/BashPermissionRequest/bashToolUseOptions.tsx`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Comprueba si una descripción ya existe en la lista de permitidos. Compara
 * las versiones en minúscula y sin espacios al final.
 */
function descriptionAlreadyExists(
  description: string,
  existingDescriptions: string[],
): boolean {
  const normalized = description.toLowerCase().trimEnd()
  return existingDescriptions.some(
    existing => existing.toLowerCase().trimEnd() === normalized,
  )
}

/**
 * Retira las redirecciones de salida, para que un nombre de archivo no
 * aparezca como si fuera un comando en la etiqueta.
 */
function stripBashRedirections(command: string): string {
  const { commandWithoutRedirections, redirections } =
    extractOutputRedirections(command)
  // Usar la versión recortada sólo si de verdad había redirecciones
  return redirections.length > 0 ? commandWithoutRedirections : command
}

export function bashToolUseOptions({
  suggestions = [],
  decisionReason,
  onRejectFeedbackChange,
  onAcceptFeedbackChange,
  onClassifierDescriptionChange,
  classifierDescription,
  initialClassifierDescriptionEmpty = false,
  existingAllowDescriptions = [],
  yesInputMode = false,
  noInputMode = false,
  editablePrefix,
  onEditablePrefixChange,
}: {
  suggestions?: PermissionUpdate[]
  decisionReason?: PermissionDecisionReason
  onRejectFeedbackChange: (value: string) => void
  onAcceptFeedbackChange: (value: string) => void
  onClassifierDescriptionChange?: (value: string) => void
  classifierDescription?: string
  /** Si la descripción inicial del clasificador venía vacía. Con true, oculta la opción. */
  initialClassifierDescriptionEmpty?: boolean
  existingAllowDescriptions?: string[]
  yesInputMode?: boolean
  noInputMode?: boolean
  /** Contenido editable de la regla de prefijo (por ejemplo «npm run:*»). Si se fija, sustituye a las sugerencias de Haiku. */
  editablePrefix?: string
  /** Callback para cuando el usuario edita el valor del prefijo. */
  onEditablePrefixChange?: (value: string) => void
}): OptionWithDescription<BashToolUseOption>[] {
  const options: OptionWithDescription<BashToolUseOption>[] = []

  if (yesInputMode) {
    options.push({
      type: 'input',
      label: 'Yes',
      value: 'yes',
      placeholder: 'and tell Claude what to do next',
      onChange: onAcceptFeedbackChange,
      allowEmptySubmitToCancel: true,
    })
  } else {
    options.push({
      label: 'Yes',
      value: 'yes',
    })
  }

  // Mostrar las opciones de «permitir siempre» sólo si `allowManagedPermissionRulesOnly` no lo restringe
  if (shouldShowAlwaysAllowOptions()) {
    // Mostrar un campo editable para la regla de prefijo en vez de la
    // etiqueta de sugerencia que genera Haiku — pero sólo cuando las
    // sugerencias no traen elementos que no son de Bash (`addDirectories`,
    // reglas de Read) y que el prefijo editable no puede representar.
    const hasNonBashSuggestions = suggestions.some(
      s =>
        s.type === 'addDirectories' ||
        (s.type === 'addRules' &&
          s.rules?.some(r => r.toolName !== BASH_TOOL_NAME)),
    )
    if (
      editablePrefix !== undefined &&
      onEditablePrefixChange &&
      !hasNonBashSuggestions &&
      suggestions.length > 0
    ) {
      options.push({
        type: 'input',
        label: 'Yes, and don\u2019t ask again for',
        value: 'yes-prefix-edited',
        placeholder: 'command prefix (e.g., npm run:*)',
        initialValue: editablePrefix,
        onChange: onEditablePrefixChange,
        allowEmptySubmitToCancel: true,
        showLabelWithValue: true,
        labelValueSeparator: ': ',
        resetCursorOnUpdate: true,
      })
    } else if (suggestions.length > 0) {
      const label = generateShellSuggestionsLabel(
        suggestions,
        BASH_TOOL_NAME,
        stripBashRedirections,
      )

      if (label) {
        options.push({
          label,
          value: 'yes-apply-suggestions',
        })
      }
    }

    // Añadir la opción revisada por el clasificador si está habilitada, si la
    // descripción inicial no venía vacía, si esa descripción no existe ya en
    // la lista de permitidos, y si la razón de la decisión NO es un bloqueo
    // del clasificador del lado del servidor (una regla basada en prompt no
    // ayuda cuando el clasificador del servidor se dispara antes).
    // Saltársela cuando ya se está mostrando la opción de prefijo editable:
    // cumplen el mismo papel, y tener dos campos de «no me lo vuelvas a
    // preguntar» de aspecto idéntico confunde.
    const editablePrefixShown = options.some(
      o => o.value === 'yes-prefix-edited',
    )
    if (
      process.env.USER_TYPE === 'ant' &&
      !editablePrefixShown &&
      isClassifierPermissionsEnabled() &&
      onClassifierDescriptionChange &&
      !initialClassifierDescriptionEmpty &&
      !descriptionAlreadyExists(
        classifierDescription ?? '',
        existingAllowDescriptions,
      ) &&
      decisionReason?.type !== 'classifier'
    ) {
      options.push({
        type: 'input',
        label: 'Yes, and don\u2019t ask again for',
        value: 'yes-classifier-reviewed',
        placeholder: 'describe what to allow...',
        initialValue: classifierDescription ?? '',
        onChange: onClassifierDescriptionChange,
        allowEmptySubmitToCancel: true,
        showLabelWithValue: true,
        labelValueSeparator: ': ',
        resetCursorOnUpdate: true,
      })
    }
  }

  if (noInputMode) {
    options.push({
      type: 'input',
      label: 'No',
      value: 'no',
      placeholder: 'and tell Claude what to do differently',
      onChange: onRejectFeedbackChange,
      allowEmptySubmitToCancel: true,
    })
  } else {
    options.push({
      label: 'No',
      value: 'no',
    })
  }

  return options
}
