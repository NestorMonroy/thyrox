import * as React from 'react'
import { Box, Text } from '@anthropic/ink'
import {
  type NetworkHostPattern,
  shouldAllowManagedSandboxDomainsOnly,
} from '@claude-code-how-works/shell/sandbox.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from '@claude-code-how-works/local-observability'
import { Select } from '@claude-code-how-works/repl/components/CustomSelect/select.js'
import { PermissionDialog } from './PermissionDialog.js'
import { readEnv } from '@claude-code-how-works/config/env'

export type SandboxPermissionRequestProps = {
  hostPattern: NetworkHostPattern
  onUserResponse: (response: {
    allow: boolean
    persistToSettings: boolean
  }) => void
}

export function SandboxPermissionRequest({
  hostPattern: { host },
  onUserResponse,
}: SandboxPermissionRequestProps): React.ReactNode {
  function onSelect(value: string) {
    // Copia de `ccnmt: packages/permission/src/components/
    // SandboxPermissionRequest.tsx` con los comentarios traducidos; el cuerpo es
    // el de la fuente.
    //
    // Convendria unificar mejor este dialogo con los demas dialogos de permiso y
    // usar su registro, pero este es algo distinto y aqui no se tiene el
    // contexto de la herramienta. Por ahora se usa un registro basico para datos
    // basicos.
    if (process.env.USER_TYPE === 'ant') {
      logEvent('tengu_sandbox_network_dialog_result', {
        host: host as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        result:
          value as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })
    }

    switch (value) {
      case 'yes':
        onUserResponse({ allow: true, persistToSettings: false })
        break
      case 'yes-dont-ask-again':
        onUserResponse({ allow: true, persistToSettings: true })
        break
      case 'no':
        onUserResponse({ allow: false, persistToSettings: false })
        break
    }
  }

  const managedDomainsOnly = shouldAllowManagedSandboxDomainsOnly()

  const options = [
    { label: 'Yes', value: 'yes' },
    ...(!managedDomainsOnly
      ? [
          {
            label: (
              <Text>
                Yes, and don&apos;t ask again for <Text bold>{host}</Text>
              </Text>
            ),
            value: 'yes-dont-ask-again',
          },
        ]
      : []),
    {
      label: (
        <Text>
          No, and tell Claude what to do differently <Text bold>(esc)</Text>
        </Text>
      ),
      value: 'no',
    },
  ]

  return (
    <PermissionDialog title="Network request outside of sandbox">
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Box>
          <Text dimColor>Host:</Text>
          <Text> {host}</Text>
        </Box>
        <Box marginTop={1}>
          <Text>Do you want to allow this connection?</Text>
        </Box>
        <Box>
          <Select
            options={options}
            onChange={onSelect}
            onCancel={() => {
              if (process.env.USER_TYPE === 'ant') {
                logEvent('tengu_sandbox_network_dialog_result', {
                  host: host as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
                  result:
                    'cancel' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
                })
              }
              onUserResponse({ allow: false, persistToSettings: false })
            }}
          />
        </Box>
      </Box>
    </PermissionDialog>
  )
}
