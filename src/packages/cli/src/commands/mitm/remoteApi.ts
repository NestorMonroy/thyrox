/** La API del MITM de otro proceso, por HTTP en loopback. */
import type { MitmApiCall } from './inProcessApi.ts'

export function remoteApi(baseUrl: string): MitmApiCall {
  return ({ method, path, body }) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
}
