/**
 * Pregunta un secreto sin eco: pone la entrada en modo crudo, acumula hasta
 * Enter, respeta el retroceso y cancela con Ctrl-C. Pase lo que pase, la
 * terminal vuelve al modo en que estaba y el oyente se retira.
 */
const ENTER = new Set(['\r', '\n'])
const CTRL_C = '\u0003'
const BACKSPACE = new Set(['\u007f', '\b'])

interface RawInput {
  on(event: 'data', listener: (chunk: Buffer | string) => void): unknown
  off(event: 'data', listener: (chunk: Buffer | string) => void): unknown
  setRawMode?(mode: boolean): unknown
  resume(): unknown
  pause(): unknown
}

export function promptHidden(question: string, input: RawInput, output: { write(text: string): unknown }): Promise<string> {
  output.write(question)
  input.setRawMode?.(true)
  input.resume()
  return new Promise((resolve, reject) => {
    let value = ''
    const finish = (settle: () => void) => {
      input.off('data', onData)
      input.setRawMode?.(false)
      input.pause()
      output.write('\n')
      settle()
    }
    function onData(chunk: Buffer | string) {
      for (const char of String(chunk)) {
        if (ENTER.has(char)) return finish(() => resolve(value))
        if (char === CTRL_C) return finish(() => reject(new Error('Credential prompt cancelled.')))
        if (BACKSPACE.has(char)) value = value.slice(0, -1)
        else value += char
      }
    }
    input.on('data', onData)
  })
}
