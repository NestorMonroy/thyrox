import { HelpV2 } from '../../components/HelpV2/HelpV2.js'
import type { LocalJSXCommandCall } from '@thyrox/agent/command.js'

export const call: LocalJSXCommandCall = async (
  onDone,
  { options: { commands } },
) => {
  return <HelpV2 commands={commands} onClose={onDone} />
}
