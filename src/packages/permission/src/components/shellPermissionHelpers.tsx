import { basename, sep } from 'path'
import React, { type ReactNode } from 'react'
import { getOriginalCwd } from '@claude-code-how-works/app-host/bootstrap/state.js'
import { Text } from '@anthropic/ink'
import type { PermissionUpdate } from '../PermissionUpdateSchema.js'
import { permissionRuleExtractPrefix } from '../shellRuleMatching.js'

function commandListDisplay(commands: string[]): ReactNode {
  switch (commands.length) {
    case 0:
      return ''
    case 1:
      return <Text bold>{commands[0]}</Text>
    case 2:
      return (
        <Text>
          <Text bold>{commands[0]}</Text> and <Text bold>{commands[1]}</Text>
        </Text>
      )
    default:
      return (
        <Text>
          <Text bold>{commands.slice(0, -1).join(', ')}</Text>, and{' '}
          <Text bold>{commands.slice(-1)[0]}</Text>
        </Text>
      )
  }
}

function commandListDisplayTruncated(commands: string[]): ReactNode {
  // Copia de `ccnmt: packages/permission/src/components/shellPermissionHelpers.tsx`
  // con los comentarios traducidos; el cuerpo es el de la fuente.
  //
  // Comprobar si la representación en texto llano quedaría demasiado larga
  const plainText = commands.join(', ')
  if (plainText.length > 50) {
    return 'similar'
  }
  return commandListDisplay(commands)
}

function formatPathList(paths: string[]): ReactNode {
  if (paths.length === 0) return ''

  // Extraer los nombres de directorio de las rutas
  const names = paths.map(p => basename(p) || p)

  if (names.length === 1) {
    return (
      <Text>
        <Text bold>{names[0]}</Text>
        {sep}
      </Text>
    )
  }
  if (names.length === 2) {
    return (
      <Text>
        <Text bold>{names[0]}</Text>
        {sep} and <Text bold>{names[1]}</Text>
        {sep}
      </Text>
    )
  }

  // Con 3 o más, mostrar los dos primeros y «and N more»
  return (
    <Text>
      <Text bold>{names[0]}</Text>
      {sep}, <Text bold>{names[1]}</Text>
      {sep} and {paths.length - 2} more
    </Text>
  )
}

/**
 * Genera la etiqueta de la opción «Yes, and apply suggestions» de los diálogos
 * de permiso de shell (Bash, PowerShell). Se parametriza con el nombre de la
 * herramienta de shell y con una transformación opcional del comando (Bash,
 * por ejemplo, retira las redirecciones de salida para que un nombre de
 * archivo no aparezca como si fuera un comando).
 */
export function generateShellSuggestionsLabel(
  suggestions: PermissionUpdate[],
  shellToolName: string,
  commandTransform?: (command: string) => string,
): ReactNode | null {
  // Recoger todas las reglas para mostrarlas
  const allRules = suggestions
    .filter(s => s.type === 'addRules')
    .flatMap(s => s.rules || [])

  // Separar las reglas de Read de las de shell
  const readRules = allRules.filter(r => r.toolName === 'Read')
  const shellRules = allRules.filter(r => r.toolName === shellToolName)

  // Obtener la información de directorio
  const directories = suggestions
    .filter(s => s.type === 'addDirectories')
    .flatMap(s => s.directories || [])

  // Extraer las rutas de las reglas de Read (aparte de los directorios)
  const readPaths = readRules
    .map(r => r.ruleContent?.replace('/**', '') || '')
    .filter(p => p)

  // Extraer los prefijos de comando de shell, transformándolos si hace falta para mostrarlos
  const shellCommands = [
    ...new Set(
      shellRules.flatMap(rule => {
        if (!rule.ruleContent) return []
        const command =
          permissionRuleExtractPrefix(rule.ruleContent) ?? rule.ruleContent
        return commandTransform ? commandTransform(command) : command
      }),
    ),
  ]

  // Comprobar con qué se cuenta
  const hasDirectories = directories.length > 0
  const hasReadPaths = readPaths.length > 0
  const hasCommands = shellCommands.length > 0

  // Atender los casos de un solo tipo
  if (hasReadPaths && !hasDirectories && !hasCommands) {
    // Sólo reglas de Read: usar el lenguaje de «reading from»
    if (readPaths.length === 1) {
      const firstPath = readPaths[0]!
      const dirName = basename(firstPath) || firstPath
      return (
        <Text>
          Yes, allow reading from <Text bold>{dirName}</Text>
          {sep} from this project
        </Text>
      )
    }

    // Varias rutas de lectura
    return (
      <Text>
        Yes, allow reading from {formatPathList(readPaths)} from this project
      </Text>
    )
  }

  if (hasDirectories && !hasReadPaths && !hasCommands) {
    // Sólo permisos de directorio: usar el lenguaje de «access to»
    if (directories.length === 1) {
      const firstDir = directories[0]!
      const dirName = basename(firstDir) || firstDir
      return (
        <Text>
          Yes, and always allow access to <Text bold>{dirName}</Text>
          {sep} from this project
        </Text>
      )
    }

    // Varios directorios
    return (
      <Text>
        Yes, and always allow access to {formatPathList(directories)} from this
        project
      </Text>
    )
  }

  if (hasCommands && !hasDirectories && !hasReadPaths) {
    // Sólo permisos de comando de shell
    return (
      <Text>
        {"Yes, and don't ask again for "}
        {commandListDisplayTruncated(shellCommands)} commands in{' '}
        <Text bold>{getOriginalCwd()}</Text>
      </Text>
    )
  }

  // Atender los casos mixtos
  if ((hasDirectories || hasReadPaths) && !hasCommands) {
    // Combinar directorios y rutas de lectura, porque los dos son acceso a una ruta
    const allPaths = [...directories, ...readPaths]
    if (hasDirectories && hasReadPaths) {
      // Mixto: usar el «access to» genérico
      return (
        <Text>
          Yes, and always allow access to {formatPathList(allPaths)} from this
          project
        </Text>
      )
    }
  }

  if ((hasDirectories || hasReadPaths) && hasCommands) {
    // Construir un mensaje descriptivo para los dos tipos
    const allPaths = [...directories, ...readPaths]

    // Que quede conciso pero informativo
    if (allPaths.length === 1 && shellCommands.length === 1) {
      return (
        <Text>
          Yes, and allow access to {formatPathList(allPaths)} and{' '}
          {commandListDisplayTruncated(shellCommands)} commands
        </Text>
      )
    }

    return (
      <Text>
        Yes, and allow {formatPathList(allPaths)} access and{' '}
        {commandListDisplayTruncated(shellCommands)} commands
      </Text>
    )
  }

  return null
}
