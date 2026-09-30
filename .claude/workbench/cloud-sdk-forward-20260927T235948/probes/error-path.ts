// Sonda: qué devuelve forwardThroughSdk cuando el upstream de nube responde 401.
import { createCloudUpstream } from '../../../../src/packages/provider/src/proxy/sdk/cloudClients.ts'
import { forwardThroughSdk } from '../../../../src/packages/provider/src/proxy/sdk/sdkForward.ts'
const fetch = (async () => Response.json({ type: 'error', error: { type: 'authentication_error', message: 'bad' } }, { status: 401 })) as unknown as typeof globalThis.fetch
const up = await createCloudUpstream({ name: 'v', provider: 'vertex', region: 'us-east5', project_id: 'p', auth: { access_token: 't' } }, { fetch })
try {
  const r = await forwardThroughSdk({ path: '/v1/messages', body: { model: 'm', max_tokens: 1, messages: [] }, provider: 'vertex', client: up.client, requestId: 'r1' })
  console.log(r?.status, await r?.text())
} catch (e) { console.log('THROW', e) }
