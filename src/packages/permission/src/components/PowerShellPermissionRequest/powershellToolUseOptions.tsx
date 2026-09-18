import { POWERSHELL_TOOL_NAME } from '@claude-code-how-works/tool-registry/tools/PowerShellTool/toolName.js'
import type { PermissionUpdate } from '../../PermissionUpdateSchema.js'
import { shouldShowAlwaysAllowOptions } from '../../permissionsLoader.js'
import type { OptionWithDescription } from '@claude-code-how-works/repl/components/CustomSelect/select.js'
import { generateShellSuggestionsLabel } from '../shellPermissionHelpers.js'

type PowerShellToolUseOption =
  | 'yes'
  | 'yes-apply-suggestions'
  | 'yes-prefix-edited'
  | 'no'

export function powershellToolUseOptions({
  suggestions = [],
  onRejectFeedbackChange,
  onAcceptFeedbackChange,
  yesInputMode = false,
  noInputMode = false,
  editablePrefix,
  onEditablePrefixChange,
}: {
  suggestions?: PermissionUpdate[]
  onRejectFeedbackChange: (value: string) => void
  onAcceptFeedbackChange: (value: string) => void
  yesInputMode?: boolean
  noInputMode?: boolean
  editablePrefix?: string
  onEditablePrefixChange?: (value: string) => void
}): OptionWithDescription<PowerShellToolUseOption>[] {
  const options: OptionWithDescription<PowerShellToolUseOption>[] = []

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

  // Copia de `ccnmt: packages/permission/src/components/
  // PowerShellPermissionRequest/powershellToolUseOptions.tsx` con los
  // comentarios traducidos; el cuerpo es el de la fuente.
  //
  // Nota: PowerShell no tiene alternador de sandbox, porque el sandbox no está
  // soportado en Windows.
  // Nota: PowerShell no tiene la opción de revisado-por-el-clasificador, que es
  // una capacidad [SOLO-ANT] de Bash.

  // Las opciones de "permitir siempre" solo se muestran cuando
  // allowManagedPermissionRulesOnly no las restringe. Se prefiere el input de
  // prefijo editable — extractor estático más las ediciones del usuario — sobre
  // la etiqueta de sugerencias, que no es editable. El input editable no puede
  // representar permisos de directorio ni reglas de la herramienta Read, así
  // que ante esos se cae de vuelta a la etiqueta.
  if (shouldShowAlwaysAllowOptions() && suggestions.length > 0) {
    const hasNonPowerShellSuggestions = suggestions.some(
      s =>
        s.type === 'addDirectories' ||
        (s.type === 'addRules' &&
          s.rules?.some(r => r.toolName !== POWERSHELL_TOOL_NAME)),
    )
    if (
      editablePrefix !== undefined &&
      onEditablePrefixChange &&
      !hasNonPowerShellSuggestions
    ) {
      options.push({
        type: 'input',
        label: 'Yes, and don\u2019t ask again for',
        value: 'yes-prefix-edited',
        placeholder: 'command prefix (e.g., Get-Process:*)',
        initialValue: editablePrefix,
        onChange: onEditablePrefixChange,
        allowEmptySubmitToCancel: true,
        showLabelWithValue: true,
        labelValueSeparator: ': ',
        resetCursorOnUpdate: true,
      })
    } else {
      const label = generateShellSuggestionsLabel(
        suggestions,
        POWERSHELL_TOOL_NAME,
      )
      if (label) {
        options.push({
          label,
          value: 'yes-apply-suggestions',
        })
      }
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
