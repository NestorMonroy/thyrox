/**
 * Puerto de `ccnmt: packages/output/src/targets/terminal.ts` (verbatim).
 */
import type { OutputEvent, OutputTarget } from '../contracts.js'

export class TerminalOutputTarget implements OutputTarget {
  constructor(
    private write: (line: string) => void = line => {
      console.log(line)
    },
  ) {}

  emit(event: OutputEvent): void {
    if (event.type === 'error') {
      this.write(`[error] ${String(event.error)}`)
      return
    }
    this.write(JSON.stringify(event))
  }
}
