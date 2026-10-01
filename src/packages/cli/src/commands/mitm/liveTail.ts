/**
 * `thyrox mitm inspect tail`: el canal en vivo del inspector, una línea JSON
 * por evento —el estado entero al abrir, luego cada cambio—, hasta que llega
 * la señal de parar o la API cierra el canal.
 */
import { LIVE_STREAM_PATH } from '@thyrox/mitm/api/liveStream'

import { EXIT_OK } from '../../exitCodes.ts'

const EXIT_FAILED = 1

export interface LiveTailDeps {
  write: (text: string) => void
  waitForStop: () => Promise<void>
}

export function liveStreamUrl(apiUrl: string): string {
  return `${apiUrl.replace(/^http/, 'ws')}${LIVE_STREAM_PATH}`
}

export function tailLiveStream(apiUrl: string, deps: LiveTailDeps): Promise<number> {
  return new Promise(resolve => {
    const socket = new WebSocket(liveStreamUrl(apiUrl))
    let exit = EXIT_OK
    socket.onmessage = event => deps.write(`${String(event.data)}\n`)
    socket.onerror = () => {
      deps.write(`thyrox mitm inspect tail: cannot reach the live stream at ${liveStreamUrl(apiUrl)}\n`)
      exit = EXIT_FAILED
    }
    socket.onclose = () => resolve(exit)
    void deps.waitForStop().then(() => socket.close())
  })
}
