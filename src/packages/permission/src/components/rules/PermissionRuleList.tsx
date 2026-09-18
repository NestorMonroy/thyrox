import chalk from 'chalk'
import figures from 'figures'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppState, useSetAppState } from '../../appStateHooks.js'
import {
  applyPermissionUpdate,
  persistPermissionUpdate,
} from '../../PermissionUpdate.js'
import type { PermissionUpdateDestination } from '../../PermissionUpdateSchema.js'
import type { CommandResultDisplay } from '@thyrox/command-runtime/runtime'
import { Select } from '@thyrox/repl/components/CustomSelect/select.js'
import { useExitOnCtrlCDWithKeybindings } from '@thyrox/repl/hooks/useExitOnCtrlCDWithKeybindings.js'
import { useSearchInput } from '@anthropic/ink/search'
import { type KeyboardEvent, Box, Text, useTerminalFocus } from '@anthropic/ink'
import { useKeybinding } from '@anthropic/ink/keybindings'
import {
  type AutoModeDenial,
  getAutoModeDenials,
} from '../../autoModeDenials.js'
import type {
  PermissionBehavior,
  PermissionRule,
  PermissionRuleValue,
} from '../../PermissionRule.js'
import { permissionRuleValueToString } from '../../permissionRuleParser.js'
import {
  deletePermissionRule,
  getAllowRules,
  getAskRules,
  getDenyRules,
  permissionRuleSourceDisplayString,
} from '../../permissions.js'
import type { UnreachableRule } from '../../shadowedRuleDetection.js'
import { jsonStringify } from '@thyrox/local-observability/slowOperations.js'
import { Pane, Tab, Tabs, useTabHeaderFocus, useTabsWidth } from '@anthropic/ink'
import { SearchBox } from '@anthropic/ink'
import type { Option } from '@thyrox/repl/components/ui/option.js'
import { AddPermissionRules } from './AddPermissionRules.js'
import { AddWorkspaceDirectory } from './AddWorkspaceDirectory.js'
import { PermissionRuleDescription } from './PermissionRuleDescription.js'
import { PermissionRuleInput } from './PermissionRuleInput.js'
import { RecentDenialsTab } from './RecentDenialsTab.js'
import { RemoveWorkspaceDirectory } from './RemoveWorkspaceDirectory.js'
import { WorkspaceTab } from './WorkspaceTab.js'

type TabType = 'recent' | 'allow' | 'ask' | 'deny' | 'workspace'

type RuleSourceTextProps = {
  rule: PermissionRule
}
function RuleSourceText({ rule }: RuleSourceTextProps): React.ReactNode {
  return (
    <Text
      dimColor
    >{`From ${permissionRuleSourceDisplayString(rule.source)}`}</Text>
  )
}

// Copia de `ccnmt: packages/permission/src/components/rules/PermissionRuleList.tsx`
// con los comentarios traducidos; el cuerpo es el de la fuente.
//
// Función auxiliar que da la etiqueta adecuada para cada comportamiento de regla
function getRuleBehaviorLabel(ruleBehavior: PermissionBehavior): string {
  switch (ruleBehavior) {
    case 'allow':
      return 'allowed'
    case 'deny':
      return 'denied'
    case 'ask':
      return 'ask'
  }
}

// Componente que muestra el detalle de una herramienta y gestiona el flujo interactivo de borrado
function RuleDetails({
  rule,
  onDelete,
  onCancel,
}: {
  rule: PermissionRule
  onDelete: () => void
  onCancel: () => void
}): React.ReactNode {
  const exitState = useExitOnCtrlCDWithKeybindings()
  // Usar el atajo configurable de ESC para cancelar
  useKeybinding('confirm:no', onCancel, { context: 'Confirmation' })

  const ruleDescription = (
    <Box flexDirection="column" marginX={2}>
      <Text bold>{permissionRuleValueToString(rule.ruleValue)}</Text>
      <PermissionRuleDescription ruleValue={rule.ruleValue} />
      <RuleSourceText rule={rule} />
    </Box>
  )

  const footer = (
    <Box marginLeft={3}>
      {exitState.pending ? (
        <Text dimColor>Press {exitState.keyName} again to exit</Text>
      ) : (
        <Text dimColor>Esc to cancel</Text>
      )}
    </Box>
  )

  // Los ajustes gestionados no se pueden editar
  if (rule.source === 'policySettings') {
    return (
      <>
        <Box
          flexDirection="column"
          gap={1}
          borderStyle="round"
          paddingLeft={1}
          paddingRight={1}
          borderColor="permission"
        >
          <Text bold color="permission">
            Rule details
          </Text>
          {ruleDescription}
          <Text italic>
            This rule is configured by managed settings and cannot be modified.
            {'\n'}
            Contact your system administrator for more information.
          </Text>
        </Box>
        {footer}
      </>
    )
  }

  return (
    <>
      <Box
        flexDirection="column"
        gap={1}
        borderStyle="round"
        paddingLeft={1}
        paddingRight={1}
        borderColor="error"
      >
        <Text bold color="error">
          Delete {getRuleBehaviorLabel(rule.ruleBehavior)} tool?
        </Text>
        {ruleDescription}
        <Text>Are you sure you want to delete this permission rule?</Text>
        <Select
          onChange={_ => (_ === 'yes' ? onDelete() : onCancel())}
          onCancel={onCancel}
          options={[
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' },
          ]}
        />
      </Box>
      {footer}
    </>
  )
}

type RulesTabContentProps = {
  options: Option[]
  searchQuery: string
  isSearchMode: boolean
  isFocused: boolean
  onSelect: (value: string) => void
  onCancel: () => void
  lastFocusedRuleKey: string | undefined
  cursorOffset?: number
  onHeaderFocusChange?: (focused: boolean) => void
}

// Componente que renderiza el contenido de la pestaña de reglas, con soporte de ancho completo
function RulesTabContent(props: RulesTabContentProps): React.ReactNode {
  const {
    options,
    searchQuery,
    isSearchMode,
    isFocused,
    onSelect,
    onCancel,
    lastFocusedRuleKey,
    cursorOffset,
    onHeaderFocusChange,
  } = props
  const tabWidth = useTabsWidth()
  const { headerFocused, focusHeader, blurHeader } = useTabHeaderFocus()
  useEffect(() => {
    if (isSearchMode && headerFocused) blurHeader()
  }, [isSearchMode, headerFocused, blurHeader])
  useEffect(() => {
    onHeaderFocusChange?.(headerFocused)
  }, [headerFocused, onHeaderFocusChange])
  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <SearchBox
          query={searchQuery}
          isFocused={isSearchMode && !headerFocused}
          isTerminalFocused={isFocused}
          width={tabWidth}
          cursorOffset={cursorOffset}
        />
      </Box>
      <Select
        options={options}
        onChange={onSelect}
        onCancel={onCancel}
        visibleOptionCount={Math.min(10, options.length)}
        isDisabled={isSearchMode || headerFocused}
        defaultFocusValue={lastFocusedRuleKey}
        onUpFromFirstItem={focusHeader}
      />
    </Box>
  )
}

// Compone el subtítulo, la búsqueda y el `Select` de una sola pestaña de allow, ask o deny.
function PermissionRulesTab({
  tab,
  getRulesOptions,
  handleToolSelect,
  ...rulesProps
}: {
  tab: 'allow' | 'ask' | 'deny'
  getRulesOptions: (tab: TabType, query?: string) => { options: Option[] }
  handleToolSelect: (value: string, tab: TabType) => void
} & Omit<RulesTabContentProps, 'options' | 'onSelect'>): React.ReactNode {
  return (
    <Box flexDirection="column" flexShrink={tab === 'allow' ? 0 : undefined}>
      <Text>
        {
          {
            allow: "Claude Code won't ask before using allowed tools.",
            ask: 'Claude Code will always ask for confirmation before using these tools.',
            deny: 'Claude Code will always reject requests to use denied tools.',
          }[tab]
        }
      </Text>
      <RulesTabContent
        options={getRulesOptions(tab, rulesProps.searchQuery).options}
        onSelect={v => handleToolSelect(v, tab)}
        {...rulesProps}
      />
    </Box>
  )
}

type Props = {
  onExit: (
    result?: string,
    options?: {
      display?: CommandResultDisplay
      shouldQuery?: boolean
      metaMessages?: string[]
    },
  ) => void
  initialTab?: TabType
  onRetryDenials?: (commands: string[]) => void
}

export function PermissionRuleList({
  onExit,
  initialTab,
  onRetryDenials,
}: Props): React.ReactNode {
  const hasDenials = getAutoModeDenials().length > 0
  const defaultTab: TabType = initialTab ?? (hasDenials ? 'recent' : 'allow')
  const [changes, setChanges] = useState<string[]>([])
  const toolPermissionContext = useAppState(s => s.toolPermissionContext)
  const setAppState = useSetAppState()
  const isTerminalFocused = useTerminalFocus()

  // Una ref, no estado: las actualizaciones de `RecentDenialsTab` no tienen
  // por qué disparar un re-render del padre (sólo se leen al salir), y los
  // re-renders disparan el defecto de colapso del `ScrollBox` modal del
  // #23592 en pantalla completa.
  const denialStateRef = useRef<{
    approved: Set<number>
    retry: Set<number>
    denials: readonly AutoModeDenial[]
  }>({ approved: new Set(), retry: new Set(), denials: [] })
  const handleDenialStateChange = useCallback(
    (s: typeof denialStateRef.current) => {
      denialStateRef.current = s
    },
    [],
  )

  const [selectedRule, setSelectedRule] = useState<PermissionRule | undefined>()
  // Seguir la clave de la última regla con el foco, para restaurar la posición tras borrar
  const [lastFocusedRuleKey, setLastFocusedRuleKey] = useState<
    string | undefined
  >()
  const [addingRuleToTab, setAddingRuleToTab] = useState<TabType | null>(null)
  const [validatedRule, setValidatedRule] = useState<{
    ruleBehavior: PermissionBehavior
    ruleValue: PermissionRuleValue
  } | null>(null)
  const [isAddingWorkspaceDirectory, setIsAddingWorkspaceDirectory] =
    useState(false)
  const [removingDirectory, setRemovingDirectory] = useState<string | null>(
    null,
  )
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [headerFocused, setHeaderFocused] = useState(true)
  const handleHeaderFocusChange = useCallback((focused: boolean) => {
    setHeaderFocused(focused)
  }, [])

  const allowRulesByKey = useMemo(() => {
    const map = new Map<string, PermissionRule>()
    getAllowRules(toolPermissionContext).forEach(rule => {
      map.set(jsonStringify(rule), rule)
    })
    return map
  }, [toolPermissionContext])

  const denyRulesByKey = useMemo(() => {
    const map = new Map<string, PermissionRule>()
    getDenyRules(toolPermissionContext).forEach(rule => {
      map.set(jsonStringify(rule), rule)
    })
    return map
  }, [toolPermissionContext])

  const askRulesByKey = useMemo(() => {
    const map = new Map<string, PermissionRule>()
    getAskRules(toolPermissionContext).forEach(rule => {
      map.set(jsonStringify(rule), rule)
    })
    return map
  }, [toolPermissionContext])

  const getRulesOptions = useCallback(
    (tab: TabType, query: string = '') => {
      const rulesByKey = (() => {
        switch (tab) {
          case 'allow':
            return allowRulesByKey
          case 'deny':
            return denyRulesByKey
          case 'ask':
            return askRulesByKey
          case 'workspace':
          case 'recent':
            return new Map<string, PermissionRule>()
        }
      })()

      const options: Option[] = []

      // Mostrar «Add a new rule» sólo en las pestañas de allow y deny (y no mientras se busca)
      if (tab !== 'workspace' && tab !== 'recent' && !query) {
        options.push({
          label: `Add a new rule${figures.ellipsis}`,
          value: 'add-new-rule',
        })
      }

      // Tomar todas las claves de regla y ordenarlas alfabéticamente por el valor formateado de la regla
      const sortedRuleKeys = Array.from(rulesByKey.keys()).sort((a, b) => {
        const ruleA = rulesByKey.get(a)
        const ruleB = rulesByKey.get(b)
        if (ruleA && ruleB) {
          const ruleAString = permissionRuleValueToString(
            ruleA.ruleValue,
          ).toLowerCase()
          const ruleBString = permissionRuleValueToString(
            ruleB.ruleValue,
          ).toLowerCase()
          return ruleAString.localeCompare(ruleBString)
        }
        return 0
      })

      // Construir las opciones desde las claves ordenadas, filtrando por la consulta de búsqueda
      const lowerQuery = query.toLowerCase()
      for (const ruleKey of sortedRuleKeys) {
        const rule = rulesByKey.get(ruleKey)
        if (rule) {
          const ruleString = permissionRuleValueToString(rule.ruleValue)
          // Filtrar por la consulta de búsqueda, si la hay
          if (query && !ruleString.toLowerCase().includes(lowerQuery)) {
            continue
          }
          options.push({
            label: ruleString,
            value: ruleKey,
          })
        }
      }

      return { options, rulesByKey }
    },
    [allowRulesByKey, denyRulesByKey, askRulesByKey],
  )

  const exitState = useExitOnCtrlCDWithKeybindings()

  const isSearchModeActive =
    !selectedRule &&
    !addingRuleToTab &&
    !validatedRule &&
    !isAddingWorkspaceDirectory &&
    !removingDirectory

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    cursorOffset: searchCursorOffset,
  } = useSearchInput({
    isActive: isSearchModeActive && isSearchMode,
    onExit: () => {
      setIsSearchMode(false)
    },
  })

  // Atender la entrada al modo de búsqueda
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isSearchModeActive) return
      if (isSearchMode) return
      if (e.ctrl || e.meta) return

      // Entrar al modo de búsqueda con '/' o con cualquier carácter
      // imprimible. `e.key.length === 1` descarta las teclas especiales
      // (abajo, return, escape, etc.) — antes la secuencia de escape en crudo
      // se colaba y activaba el modo de búsqueda con basura al pulsar una
      // flecha.
      if (e.key === '/') {
        e.preventDefault()
        setIsSearchMode(true)
        setSearchQuery('')
      } else if (
        e.key.length === 1 &&
        // No entrar al modo de búsqueda con las teclas de navegación de vim, el espacio o la de reintentar
        e.key !== 'j' &&
        e.key !== 'k' &&
        e.key !== 'm' &&
        e.key !== 'i' &&
        e.key !== 'r' &&
        e.key !== ' '
      ) {
        e.preventDefault()
        setIsSearchMode(true)
        setSearchQuery(e.key)
      }
    },
    [isSearchModeActive, isSearchMode, setSearchQuery],
  )

  const handleToolSelect = useCallback(
    (selectedValue: string, tab: TabType) => {
      const { rulesByKey } = getRulesOptions(tab)
      if (selectedValue === 'add-new-rule') {
        setAddingRuleToTab(tab)
        return
      } else {
        setSelectedRule(rulesByKey.get(selectedValue))
        return
      }
    },
    [getRulesOptions],
  )

  const handleRuleInputCancel = useCallback(() => {
    setAddingRuleToTab(null)
  }, [])

  const handleRuleInputSubmit = useCallback(
    (ruleValue: PermissionRuleValue, ruleBehavior: PermissionBehavior) => {
      setValidatedRule({ ruleValue, ruleBehavior })
      setAddingRuleToTab(null)
    },
    [],
  )

  const handleAddRulesSuccess = useCallback(
    (rules: PermissionRule[], unreachable?: UnreachableRule[]) => {
      setValidatedRule(null)
      for (const rule of rules) {
        setChanges(prev => [
          ...prev,
          `Added ${rule.ruleBehavior} rule ${chalk.bold(permissionRuleValueToString(rule.ruleValue))}`,
        ])
      }

      // Avisar de cualquier regla inalcanzable que se acabe de añadir
      if (unreachable && unreachable.length > 0) {
        for (const u of unreachable) {
          const severity = u.shadowType === 'deny' ? 'blocked' : 'shadowed'
          setChanges(prev => [
            ...prev,
            chalk.yellow(
              `${figures.warning} Warning: ${permissionRuleValueToString(u.rule.ruleValue)} is ${severity}`,
            ),
            chalk.dim(`  ${u.reason}`),
            chalk.dim(`  Fix: ${u.fix}`),
          ])
        }
      }
    },
    [],
  )

  const handleAddRuleCancel = useCallback(() => {
    setValidatedRule(null)
  }, [])

  const handleRequestAddDirectory = useCallback(
    () => setIsAddingWorkspaceDirectory(true),
    [],
  )
  const handleRequestRemoveDirectory = useCallback(
    (path: string) => setRemovingDirectory(path),
    [],
  )
  const handleRulesCancel = useCallback(() => {
    const s = denialStateRef.current
    const denialsFor = (set: Set<number>) =>
      Array.from(set)
        .map(idx => s.denials[idx])
        .filter((d): d is AutoModeDenial => d !== undefined)

    const retryDenials = denialsFor(s.retry)
    if (retryDenials.length > 0) {
      const commands = retryDenials.map(d => d.display)
      onRetryDenials?.(commands)
      onExit(undefined, {
        shouldQuery: true,
        metaMessages: [
          `Permission granted for: ${commands.join(', ')}. You may now retry ${commands.length === 1 ? 'this command' : 'these commands'} if you would like.`,
        ],
      })
      return
    }

    const approvedDenials = denialsFor(s.approved)
    if (approvedDenials.length > 0 || changes.length > 0) {
      const approvedMsg =
        approvedDenials.length > 0
          ? [
              `Approved ${approvedDenials.map(d => chalk.bold(d.display)).join(', ')}`,
            ]
          : []
      onExit([...approvedMsg, ...changes].join('\n'))
    } else {
      onExit('Permissions dialog dismissed', {
        display: 'system',
      })
    }
  }, [changes, onExit, onRetryDenials])

  // Atender Escape en el nivel superior, para que funcione incluso con el
  // foco en la cabecera (que deshabilita el componente `Select` y su atajo
  // `select:cancel`). Replica el patrón de `Settings.tsx`.
  useKeybinding('confirm:no', handleRulesCancel, {
    context: 'Settings',
    isActive: isSearchModeActive && !isSearchMode,
  })

  const handleDeleteRule = () => {
    if (!selectedRule) return

    // Localizar la regla contigua a la que dar el foco tras borrar
    const { options } = getRulesOptions(selectedRule.ruleBehavior as TabType)
    const selectedKey = jsonStringify(selectedRule)
    const ruleKeys = options
      .filter(opt => opt.value !== 'add-new-rule')
      .map(opt => opt.value)
    const currentIndex = ruleKeys.indexOf(selectedKey)

    // Intentar dar el foco a la regla siguiente, o a la anterior si se está borrando la última
    let nextFocusKey: string | undefined
    if (currentIndex !== -1) {
      if (currentIndex < ruleKeys.length - 1) {
        // Dar el foco a la regla siguiente
        nextFocusKey = ruleKeys[currentIndex + 1]
      } else if (currentIndex > 0) {
        // Dar el foco a la regla anterior (se está borrando la última)
        nextFocusKey = ruleKeys[currentIndex - 1]
      }
    }
    setLastFocusedRuleKey(nextFocusKey)

    void deletePermissionRule({
      rule: selectedRule,
      initialContext: toolPermissionContext,
      setToolPermissionContext(toolPermissionContext) {
        setAppState(prev => ({
          ...prev,
          toolPermissionContext,
        }))
      },
    })

    setChanges(prev => [
      ...prev,
      `Deleted ${selectedRule.ruleBehavior} rule ${chalk.bold(permissionRuleValueToString(selectedRule.ruleValue))}`,
    ])
    setSelectedRule(undefined)
  }

  if (selectedRule) {
    return (
      <RuleDetails
        rule={selectedRule}
        onDelete={handleDeleteRule}
        onCancel={() => setSelectedRule(undefined)}
      />
    )
  }

  if (
    addingRuleToTab &&
    addingRuleToTab !== 'workspace' &&
    addingRuleToTab !== 'recent'
  ) {
    return (
      <PermissionRuleInput
        onCancel={handleRuleInputCancel}
        onSubmit={handleRuleInputSubmit}
        ruleBehavior={addingRuleToTab}
      />
    )
  }

  if (validatedRule) {
    return (
      <AddPermissionRules
        onAddRules={handleAddRulesSuccess}
        onCancel={handleAddRuleCancel}
        ruleValues={[validatedRule.ruleValue]}
        ruleBehavior={validatedRule.ruleBehavior}
        initialContext={toolPermissionContext}
        setToolPermissionContext={toolPermissionContext => {
          setAppState(prev => ({
            ...prev,
            toolPermissionContext,
          }))
        }}
      />
    )
  }

  if (isAddingWorkspaceDirectory) {
    return (
      <AddWorkspaceDirectory
        onAddDirectory={(path, remember) => {
          // Aplicar la actualización de permiso que añade el directorio
          const destination: PermissionUpdateDestination = remember
            ? 'localSettings'
            : 'session'

          const permissionUpdate = {
            type: 'addDirectories' as const,
            directories: [path],
            destination,
          }

          const updatedContext = applyPermissionUpdate(
            toolPermissionContext,
            permissionUpdate,
          )
          setAppState(prev => ({
            ...prev,
            toolPermissionContext: updatedContext,
          }))

          // Persistir si `remember` es true
          if (remember) {
            persistPermissionUpdate(permissionUpdate)
          }

          setChanges(prev => [
            ...prev,
            `Added directory ${chalk.bold(path)} to workspace${remember ? ' and saved to local settings' : ' for this session'}`,
          ])
          setIsAddingWorkspaceDirectory(false)
        }}
        onCancel={() => setIsAddingWorkspaceDirectory(false)}
        permissionContext={toolPermissionContext}
      />
    )
  }

  if (removingDirectory) {
    return (
      <RemoveWorkspaceDirectory
        directoryPath={removingDirectory}
        onRemove={() => {
          setChanges(prev => [
            ...prev,
            `Removed directory ${chalk.bold(removingDirectory)} from workspace`,
          ])
          setRemovingDirectory(null)
        }}
        onCancel={() => setRemovingDirectory(null)}
        permissionContext={toolPermissionContext}
        setPermissionContext={toolPermissionContext => {
          setAppState(prev => ({
            ...prev,
            toolPermissionContext,
          }))
        }}
      />
    )
  }

  const sharedRulesProps = {
    searchQuery,
    isSearchMode,
    isFocused: isTerminalFocused,
    onCancel: handleRulesCancel,
    lastFocusedRuleKey,
    cursorOffset: searchCursorOffset,
    getRulesOptions,
    handleToolSelect,
    onHeaderFocusChange: handleHeaderFocusChange,
  }

  const isHidden =
    !!selectedRule ||
    !!addingRuleToTab ||
    !!validatedRule ||
    isAddingWorkspaceDirectory ||
    !!removingDirectory

  return (
    <Box flexDirection="column" onKeyDown={handleKeyDown}>
      <Pane color="permission">
        <Tabs
          title="Permissions:"
          color="permission"
          defaultTab={defaultTab}
          hidden={isHidden}
          initialHeaderFocused={!hasDenials}
          navFromContent={!isSearchMode}
        >
          <Tab id="recent" title="Recently denied">
            <RecentDenialsTab
              onHeaderFocusChange={handleHeaderFocusChange}
              onStateChange={handleDenialStateChange}
            />
          </Tab>
          <Tab id="allow" title="Allow">
            <PermissionRulesTab tab="allow" {...sharedRulesProps} />
          </Tab>
          <Tab id="ask" title="Ask">
            <PermissionRulesTab tab="ask" {...sharedRulesProps} />
          </Tab>
          <Tab id="deny" title="Deny">
            <PermissionRulesTab tab="deny" {...sharedRulesProps} />
          </Tab>
          <Tab id="workspace" title="Workspace">
            <Box flexDirection="column">
              <Text>
                Claude Code can read files in the workspace, and make edits when
                auto-accept edits is on.
              </Text>
              <WorkspaceTab
                onExit={onExit}
                toolPermissionContext={toolPermissionContext}
                onRequestAddDirectory={handleRequestAddDirectory}
                onRequestRemoveDirectory={handleRequestRemoveDirectory}
                onHeaderFocusChange={handleHeaderFocusChange}
              />
            </Box>
          </Tab>
        </Tabs>
        <Box marginTop={1} paddingLeft={1}>
          <Text dimColor>
            {exitState.pending ? (
              <>Press {exitState.keyName} again to exit</>
            ) : headerFocused ? (
              <>←/→ tab switch · ↓ return · Esc cancel</>
            ) : isSearchMode ? (
              <>Type to filter · Enter/↓ select · ↑ tabs · Esc clear</>
            ) : hasDenials && defaultTab === 'recent' ? (
              <>
                Enter approve · r retry · ↑↓ navigate · ←/→ switch · Esc cancel
              </>
            ) : (
              <>
                ↑↓ navigate · Enter select · Type to search · ←/→ switch · Esc
                cancel
              </>
            )}
          </Text>
        </Box>
      </Pane>
    </Box>
  )
}
