import { Stats } from '../../components/Stats.js'
import type { LocalJSXCommandCall } from '@thyrox/agent/command.js'

export const call: LocalJSXCommandCall = async onDone => {
  return <Stats onClose={onDone} />
}
