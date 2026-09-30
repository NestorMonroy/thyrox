// Sonda: ¿el gate de combinaciones ve los alias de modificador que el ejecutor acepta?
import { isSystemKeyCombo, normalizeKeySequence } from '../../../src/packages/computer-use-mcp/src/keyBlocklist.ts'
for (const seq of ['alt+f4', 'lalt+f4', 'ralt+f4', 'ctrl+lalt+delete']) {
  console.log(seq, '->', normalizeKeySequence(seq), isSystemKeyCombo(seq, 'win32'))
}
