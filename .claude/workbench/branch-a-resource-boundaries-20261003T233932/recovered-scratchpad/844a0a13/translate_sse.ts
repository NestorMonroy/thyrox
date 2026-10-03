import { readFileSync } from 'node:fs'
import { messagesEventsFromOpenAISse } from '/home/user/thyrox/src/packages/provider/src/proxy/openaiCompat/streamTranslation.ts'
const raw = readFileSync(process.argv[2]!)
const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(raw)); c.close() } })
let json = ''
for await (const event of messagesEventsFromOpenAISse(body, 'probe')) {
  const delta = (event as { delta?: { type?: string; partial_json?: string } }).delta
  if (delta?.type === 'input_json_delta') json += delta.partial_json ?? ''
}
console.log('partial_json concatenado:', JSON.stringify(json))
console.log('command:', JSON.stringify((JSON.parse(json) as { command: string }).command))
