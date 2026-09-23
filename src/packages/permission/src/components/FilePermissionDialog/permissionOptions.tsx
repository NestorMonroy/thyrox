import { homedir } from 'os'
import { basename, join, sep } from 'path'
import { type ReactNode } from 'react'
import { getOriginalCwd } from '@thyrox/app-host/bootstrap/state.js'
import { Text } from '@anthropic/ink'
import { getShortcutDisplay } from '@thyrox/repl/keybindings/shortcutFormat.js'
import type { ToolPermissionContext } from '@thyrox/tool-registry/Tool.js'
import { expandPath, getDirectoryForPath } from '@thyrox/storage/path.js'
import {
  normalizeCaseForComparison,
  pathInAllowedWorkingPath,
} from '../../filesystem.js'
import type { OptionWithDescription } from '@thyrox/repl/components/CustomSelect/select.js'
/**
 * Copia de `ccnmt: packages/permission/src/components/FilePermissionDialog/permissionOptions.tsx`
 * con los comentarios traducidos; el cuerpo es el de la fuente.
 *
 * Comprueba si una ruta cae dentro de la carpeta .claude/ del proyecto. Sirve
 * para decidir si se muestra la opción de permiso especial de «.claude
 * folder».
 */
export function isInClaudeFolder(filePath: string): boolean {
  const absolutePath = expandPath(filePath)
  const claudeFolderPath = expandPath(`${getOriginalCwd()}/.claude`)

  // Comprobar si la ruta cae dentro de la carpeta .claude del proyecto
  const normalizedAbsolutePath = normalizeCaseForComparison(absolutePath)
  const normalizedClaudeFolderPath =
    normalizeCaseForComparison(claudeFolderPath)

  // La ruta tiene que empezar por la de la carpeta .claude, y estar dentro de ella, no ser la carpeta misma
  return (
    normalizedAbsolutePath.startsWith(
      normalizedClaudeFolderPath + sep.toLowerCase(),
    ) ||
    // Casar también el caso en que el separador es / en los sistemas posix
    normalizedAbsolutePath.startsWith(normalizedClaudeFolderPath + '/')
  )
}

/**
 * Comprueba si una ruta cae dentro de la carpeta global ~/.claude/. Sirve para
 * decidir si se muestra la opción de permiso especial de «.claude folder» en
 * los archivos del directorio personal del usuario.
 */
export function isInGlobalClaudeFolder(filePath: string): boolean {
  const absolutePath = expandPath(filePath)
  const globalClaudeFolderPath = join(homedir(), '.claude')

  const normalizedAbsolutePath = normalizeCaseForComparison(absolutePath)
  const normalizedGlobalClaudeFolderPath = normalizeCaseForComparison(
    globalClaudeFolderPath,
  )

  return (
    normalizedAbsolutePath.startsWith(
      normalizedGlobalClaudeFolderPath + sep.toLowerCase(),
    ) ||
    normalizedAbsolutePath.startsWith(normalizedGlobalClaudeFolderPath + '/')
  )
}

export type PermissionOption =
  | { type: 'accept-once' }
  | { type: 'accept-session'; scope?: 'claude-folder' | 'global-claude-folder' }
  | { type: 'reject' }

export type PermissionOptionWithLabel = OptionWithDescription<string> & {
  option: PermissionOption
}

export type FileOperationType = 'read' | 'write' | 'create'

export function getFilePermissionOptions({
  filePath,
  toolPermissionContext,
  operationType = 'write',
  onRejectFeedbackChange,
  onAcceptFeedbackChange,
  yesInputMode = false,
  noInputMode = false,
}: {
  filePath: string
  toolPermissionContext: ToolPermissionContext
  operationType?: FileOperationType
  onRejectFeedbackChange?: (value: string) => void
  onAcceptFeedbackChange?: (value: string) => void
  yesInputMode?: boolean
  noInputMode?: boolean
}): PermissionOptionWithLabel[] {
  const options: PermissionOptionWithLabel[] = []
  const modeCycleShortcut = getShortcutDisplay(
    'chat:cycleMode',
    'Chat',
    'shift+tab',
  )

  // En modo de entrada, mostrar el campo
  if (yesInputMode && onAcceptFeedbackChange) {
    options.push({
      type: 'input',
      label: 'Yes',
      value: 'yes',
      placeholder: 'and tell Claude what to do next',
      onChange: onAcceptFeedbackChange,
      allowEmptySubmitToCancel: true,
      option: { type: 'accept-once' },
    })
  } else {
    options.push({
      label: 'Yes',
      value: 'yes',
      option: { type: 'accept-once' },
    })
  }

  const inAllowedPath = pathInAllowedWorkingPath(
    filePath,
    toolPermissionContext,
  )

  // Comprobar si ésta es una ruta de carpeta .claude/, de proyecto o global
  const inClaudeFolder = isInClaudeFolder(filePath)
  const inGlobalClaudeFolder = isInGlobalClaudeFolder(filePath)

  // Opción 2: para la carpeta .claude/, mostrar la opción especial en vez de
  // la genérica de sesión.
  // Nota: las opciones de nivel de sesión se muestran siempre, porque sólo
  // afectan al estado en memoria, no a los ajustes persistidos. El ajuste
  // `allowManagedPermissionRulesOnly` sólo restringe las reglas de permiso
  // persistidas.
  if ((inClaudeFolder || inGlobalClaudeFolder) && operationType !== 'read') {
    options.push({
      label: 'Yes, and allow Claude to edit its own settings for this session',
      value: 'yes-claude-folder',
      option: {
        type: 'accept-session',
        scope: inGlobalClaudeFolder ? 'global-claude-folder' : 'claude-folder',
      },
    })
  } else {
    // Opción 2: permitir todos los cambios y lecturas durante la sesión
    let sessionLabel: ReactNode

    if (inAllowedPath) {
      // Dentro del directorio de trabajo
      if (operationType === 'read') {
        sessionLabel = 'Yes, during this session'
      } else {
        sessionLabel = (
          <Text>
            Yes, allow all edits during this session{' '}
            <Text bold>({modeCycleShortcut})</Text>
          </Text>
        )
      }
    } else {
      // Fuera del directorio de trabajo: incluir el nombre del directorio
      const dirPath = getDirectoryForPath(filePath)
      const dirName = basename(dirPath) || 'this directory'

      if (operationType === 'read') {
        sessionLabel = (
          <Text>
            Yes, allow reading from <Text bold>{dirName}/</Text> during this
            session
          </Text>
        )
      } else {
        sessionLabel = (
          <Text>
            Yes, allow all edits in <Text bold>{dirName}/</Text> during this
            session <Text bold>({modeCycleShortcut})</Text>
          </Text>
        )
      }
    }

    options.push({
      label: sessionLabel,
      value: 'yes-session',
      option: { type: 'accept-session' },
    })
  }

  // En modo de entrada, mostrar el campo para el rechazo
  if (noInputMode && onRejectFeedbackChange) {
    options.push({
      type: 'input',
      label: 'No',
      value: 'no',
      placeholder: 'and tell Claude what to do differently',
      onChange: onRejectFeedbackChange,
      allowEmptySubmitToCancel: true,
      option: { type: 'reject' },
    })
  } else {
    // Fuera del modo de entrada: opción simple
    options.push({
      label: 'No',
      value: 'no',
      option: { type: 'reject' },
    })
  }

  return options
}
