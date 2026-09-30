import React from 'react'
import { logEvent } from '@thyrox/local-observability'
import { Box, Dialog, Link, Text } from '@anthropic/ink'
import { updateSettingsForSource } from '@thyrox/config/settings'
import { Select } from './CustomSelect/index.js'
import { PRODUCT_NAME } from '@thyrox/config/product'

// NOTE: This copy is legally reviewed — do not modify without Legal team approval.
export const AUTO_MODE_DESCRIPTION =
  `Auto mode lets ${PRODUCT_NAME} handle permission prompts automatically — ${PRODUCT_NAME} checks each tool call for risky actions and prompt injection before executing. Actions ${PRODUCT_NAME} identifies as safe are executed, while actions ${PRODUCT_NAME} identifies as risky are blocked and ${PRODUCT_NAME} may try a different approach. Ideal for long-running tasks. Sessions are slightly more expensive. ${PRODUCT_NAME} can make mistakes that allow harmful commands to run, it's recommended to only use in isolated environments. Shift+Tab to change mode.`

type Props = {
  onAccept(): void
  onDecline(): void
  // Startup gate: decline exits the process, so relabel accordingly.
  declineExits?: boolean
}

export function AutoModeOptInDialog({
  onAccept,
  onDecline,
  declineExits,
}: Props): React.ReactNode {
  React.useEffect(() => {
    logEvent('tengu_auto_mode_opt_in_dialog_shown', {})
  }, [])

  function onChange(value: 'accept' | 'accept-default' | 'decline') {
    switch (value) {
      case 'accept': {
        logEvent('tengu_auto_mode_opt_in_dialog_accept', {})
        updateSettingsForSource('userSettings', {
          skipAutoPermissionPrompt: true,
        })
        onAccept()
        break
      }
      case 'accept-default': {
        logEvent('tengu_auto_mode_opt_in_dialog_accept_default', {})
        updateSettingsForSource('userSettings', {
          skipAutoPermissionPrompt: true,
          permissions: { defaultMode: 'auto' },
        })
        onAccept()
        break
      }
      case 'decline': {
        logEvent('tengu_auto_mode_opt_in_dialog_decline', {})
        onDecline()
        break
      }
    }
  }

  return (
    <Dialog title="Enable auto mode?" color="warning" onCancel={onDecline}>
      <Box flexDirection="column" gap={1}>
        <Text>{AUTO_MODE_DESCRIPTION}</Text>

        <Link url="https://code.claude.com/docs/en/security" />
      </Box>

      <Select
        options={[
          ...(process.env.USER_TYPE !== 'ant'
            ? [
                {
                  label: 'Yes, and make it my default mode',
                  value: 'accept-default' as const,
                },
              ]
            : []),
          { label: 'Yes, enable auto mode', value: 'accept' as const },
          {
            label: declineExits ? 'No, exit' : 'No, go back',
            value: 'decline' as const,
          },
        ]}
        onChange={value =>
          onChange(value as 'accept' | 'accept-default' | 'decline')
        }
        onCancel={onDecline}
      />
    </Dialog>
  )
}
