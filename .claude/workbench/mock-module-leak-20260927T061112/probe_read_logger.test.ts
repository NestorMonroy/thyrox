import { test } from 'bun:test'
import { getLocalObservability } from '@thyrox/local-observability'
test('b lee', () => { console.log('b ve:', String(getLocalObservability().logger.event).includes('events.push') ? 'capturador' : 'no-op') })
