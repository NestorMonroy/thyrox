import { Doctor } from '../../screens/Doctor.js'
import type { LocalJSXCommandCall } from '@thyrox/agent/command.js'

export const call: LocalJSXCommandCall = (onDone, _context, _args) => {
  return Promise.resolve(<Doctor onDone={onDone} />)
}
