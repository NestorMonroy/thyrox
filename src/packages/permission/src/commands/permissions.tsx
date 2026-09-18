import * as React from 'react'
import { PermissionRuleList } from '../components/rules/PermissionRuleList.js'
import type { LocalJSXCommandCall } from '@thyrox/agent/command.js'
import { createPermissionRetryMessage } from '@thyrox/agent/messages.js'

export const call: LocalJSXCommandCall = async (onDone, context) => {
  return (
    <PermissionRuleList
      onExit={onDone}
      onRetryDenials={commands => {
        context.setMessages(prev => [
          ...prev,
          createPermissionRetryMessage(commands),
        ])
      }}
    />
  )
}
