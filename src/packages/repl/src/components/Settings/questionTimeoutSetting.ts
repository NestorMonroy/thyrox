import { updateSettingsForSource } from '@thyrox/config/settings'
import type { AskUserQuestionTimeout } from '@thyrox/config/settings'

const ASK_USER_QUESTION_TIMEOUTS = ['60s', '5m', '10m', 'never'] as const

export function questionTimeoutSetting(
  value: AskUserQuestionTimeout | undefined,
  onSaved: (value: AskUserQuestionTimeout) => void,
) {
  return {
    id: 'askUserQuestionTimeout',
    label: 'Question auto-continue timeout',
    value: value ?? 'never',
    options: [...ASK_USER_QUESTION_TIMEOUTS],
    type: 'enum' as const,
    onChange(next: string) {
      const timeout = ASK_USER_QUESTION_TIMEOUTS.find(item => item === next)
      if (!timeout) return
      updateSettingsForSource('userSettings', { askUserQuestionTimeout: timeout })
      onSaved(timeout)
    },
  }
}
