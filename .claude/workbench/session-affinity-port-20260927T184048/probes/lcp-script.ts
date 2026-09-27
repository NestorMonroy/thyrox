/**
 * Genera el guion diferencial del comparador LCP: casos de extracción a
 * mano y sesiones del comparador al azar con semilla fija. La salida es la
 * entrada de `probes/lcpgo` (Go, la referencia sin tocar) y de la prueba de
 * TypeScript, que compara línea a línea.
 *
 * Uso: bun run lcp-script.ts > guion.jsonl
 */
type Op = Record<string, unknown>
const out: Op[] = []
const emit = (op: Op) => out.push(op)

let seed = 20260927
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!
const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1))

const turns = (format: string, payload: unknown) => emit({ op: 'turns', format, payload: typeof payload === 'string' ? payload : JSON.stringify(payload) })

// --- Extracción: un caso por regla de lcp.go ---
const big = (n: number, unit: string) => unit.repeat(Math.ceil(n / unit.length)).slice(0, n)
turns('claude', { system: 'Sys 2026-09-27T10:00:00Z id 123e4567-e89b-12d3-a456-426614174000', messages: [{ role: 'user', content: 'hi <think>x</think> there' }] })
turns('claude', { system: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }], messages: [{ role: 'user', content: [{ type: 'text', text: 'q' }, { type: 'image', source: { data: 'zz' } }] }] })
turns('openai', { messages: [{ role: 'system', content: 'S' }, { role: 'user', content: 'u' }, { role: 'assistant', content: null, tool_calls: [{ id: 'b', function: { name: 'f', arguments: '{"x":1}' } }, { id: 'a', function: { name: 'g' } }] }, { role: 'tool', content: 'r' }] })
turns('', { messages: [{ role: 'user', content: 'infer openai' }] })
turns('', { system: 'infer claude', messages: [{ role: 'user', content: 'x' }] })
turns('', { contents: [{ role: 'user', parts: [{ text: 'infer gemini' }] }] })
turns('', { instructions: 'infer responses', input: [{ role: 'user', content: 'x' }] })
turns('', { input: 'infer interactions' })
turns('', { input: [{ type: 'user_input', content: 'infer interactions list' }] })
turns('', { input: [{ type: 'message', role: 'user', content: 'responses list' }] })
turns('gemini', { cachedContent: 'cachedContents/abc', systemInstruction: { parts: [{ text: 'S' }] }, contents: [{ role: 'user', parts: [{ text: 'u' }] }, { role: 'model', parts: [{ functionCall: { name: 'z', args: {} } }, { functionCall: { name: 'a', args: { k: 1 } } }, { text: 'thought', thought: true }] }, { role: 'user', parts: [{ functionResponse: { name: 'a', response: {} } }] }] })
turns('antigravity', { request: { system_instruction: { parts: [{ text: 'S' }] }, contents: [{ role: 'user', parts: [{ text: 'nested' }] }] } })
turns('openai-response', { instructions: 'I', input: [{ type: 'reasoning', summary: [] }, { type: 'message', role: 'developer', content: [{ type: 'input_text', text: 'dev' }] }, { type: 'function_call', name: 'f', arguments: '{}', call_id: 'c1' }, { type: 'function_call_output', call_id: 'c1', output: 'o' }, { type: 'compaction', encrypted_content: 'e' }, { type: 'response.output_text', text: 'skip' }, { type: 'item_reference', id: 'r1' }] })
turns('codex', { instructions: 'I', input: 'plain string input' })
turns('interactions', { system_instruction: 'S', input: [{ role: 'user', content: 'a' }, { type: 'model_output', content: 'b' }, { steps: [{ type: 'tool_call', content: 'c' }, 'bare step'], role: 'model' }, 42, true] })
turns('claude', { messages: [{ role: 'user', content: [{ type: 'thinking', thinking: 'hidden' }, { type: 'text', text: 'visible' }, { type: 'redacted_reasoning_x' }] }] })
turns('claude', { messages: [{ role: 'user', content: 7 }, { role: 'assistant', content: 1.50 }, { role: 'user', content: false }] })
turns('claude', '{"messages":[{"role":"user","content":1.50},{"role":"assistant","content":[{"type":"tool_use","input":{"n":1.50,"e":1e-7,"big":1e21,"s":"<&>\\u2028","z":"\\u00e9","a":"\\ud83d\\ude00"}}]}]}')
turns('claude', '{"messages":[{"role":"user","content":"dup","content":"second"}]}')
turns('claude', '{"messages":[{"role":"user","content":[{"type":"tool_use","input":{"\\ud83d\\ude00":1,"\\uffff":2,"b\\bf\\f":"\\ud800x","-0":-0,"n":-0.0}}]}]}')
turns('claude', { messages: [{ role: 'user', content: big(20000, 'abcdefghij') }] })
turns('claude', { messages: [{ role: 'user', content: big(20000, 'ñandú ') }] })
turns('claude', { system: big(20000, 'sys 2026-01-01T00:00:00Z '), messages: [{ role: 'user', content: 'x' }] })
turns('claude', { messages: [{ role: 'user', content: [{ type: 'tool_result', content: big(20000, '{"k":"v"}') }] }, { role: 'assistant', content: [{ type: 'tool_use', input: { blob: big(20000, 'xyz') } }] }] })
turns('claude', { messages: [{ role: 'user', content: Array.from({ length: 300 }, (_, i) => ({ type: 'text', text: `p${i}` })) }] })
turns('claude', { messages: [{ role: 'user', content: [Array.from({ length: 300 }, (_, i) => ({ type: 'text', text: `n${i}` })), { type: 'text', text: 'tail' }] }] })
turns('claude', { messages: Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `turn ${i}` })) })
turns('openai', { messages: [{ role: 'AI', content: 'x' }, { role: 'Function', content: 'y' }, { role: 'custom-Role', content: 'z' }, { content: 'no role' }, { role: 'user' }, 'bare string message'] })
turns('openai', { messages: { a: { role: 'user', content: 'object messages' } } })
turns('claude', { messages: [{ role: 'user', content: '  \r\n windows\r\nlines \r ' }, { role: 'user', content: ' nbsp ' }] })
turns('claude', 'not json')
turns('claude', '')

// Casos que las anulaciones pidieron: cada uno sólo lo distingue su regla.
turns('claude', { messages: [{ role: 'user', content: Array.from({ length: 300 }, (_, i) => [{ type: 'text', text: `a${i}` }, { type: 'text', text: `b${i}` }]) }] })
turns('', { instructions: 'responses without input', messages: [{ role: 'user', content: 'ignored' }] })
turns('openai', { messages: 'a lone string' })
turns('openai', { messages: null })
turns('openai', { messages: [{ role: 'user', content: [{ type: 'input_text', text: 1.5e-7 }, { type: 'input_text', text: 2.5e21 }] }] })
turns('openai', { messages: [{ role: 'user', content: 'a <thinK>hidden</THINK> b' }] })
turns('openai', { messages: [{ role: 'İ', content: 'dotted' }, { role: '\u0085user ', content: 'spaced role' }] })

// --- Comparador: escenarios de lcp_test.go y lcp_lookup_test.go ---
const users = (...texts: string[]) => JSON.stringify({ messages: texts.map(content => ({ role: 'user', content })) })
const scripted = (ns: string, steps: Op[]) => {
  emit({ op: 'new', ttl_ms: 3_600_000 })
  for (const step of steps) emit({ ns, format: 'openai', ...step })
}
scripted('lcp:v1:test-ambiguity:model:caller', [
  { op: 'bind', payload: users('branch1', 'turn2', 'turn3', 'sharedTailA', 'sharedTailB'), auth: 'auth-1' },
  { op: 'bind', payload: users('branch2', 'turnX', 'turnY', 'sharedTailA', 'sharedTailB'), auth: 'auth-2' },
  { op: 'match', payload: users('summary', 'sharedTailA', 'sharedTailB', 'newTurn') },
])
scripted('lcp:v1:test-consec-comp:model:caller', [
  { op: 'bind', payload: users('turnA', 'turnB', 'turnC', 'turnD'), auth: 'auth-root' },
  { op: 'bind', payload: users('summary-1', 'turnC', 'turnD'), auth: 'auth-root' },
  { op: 'match', payload: users('summary-2', 'turnC', 'turnD', 'turnE') },
])
scripted('lcp:v1:test-comp-ambig-unrel:model:caller', [
  { op: 'bind', payload: users('turnA', 'turnB', 'turnC', 'turnD'), auth: 'auth-A' },
  { op: 'bind', payload: users('summary-A', 'turnC', 'turnD'), auth: 'auth-A' },
  { op: 'bind', payload: users('unrel1', 'unrel2', 'turnC', 'turnD'), auth: 'auth-R' },
  { op: 'match', payload: users('summary-new', 'turnC', 'turnD', 'turnE') },
])
scripted('lcp:v1:gen-test:model:caller', [
  { op: 'bind', payload: users('1', '2'), auth: 'auth-1' },
  { op: 'touch', payload: users('1', '2'), auth: 'auth-1' },
  { op: 'remove', payload: users('1', '2'), auth: 'auth-1', from_last: true, gen_delta: 0 },
  { op: 'match', payload: users('1', '2') },
  { op: 'remove', payload: users('1', '2'), auth: 'auth-1', gen: 0 },
  { op: 'match', payload: users('1', '2') },
])
scripted('lcp:v1::openai::gpt-4o::caller', [
  { op: 'bind', payload: users('turnA'), auth: 'auth-z' },
  { op: 'bind', payload: users('turnA', 'turnB'), auth: 'auth-b' },
  { op: 'lookup', from_last: true },
])

// --- Comparador: sesiones al azar ---
const words = ['alfa', 'bravo', 'charlie', 'delta', 'eco', 'fox', 'golf', 'hotel']
const systems = ['You are helpful', 'You are terse', 'Build agent 2026-09-27T10:00:00Z']
type Conversation = { system: string; messages: { role: string; content: string }[] }
const newMessage = (i: number) => ({ role: i % 2 ? 'assistant' : 'user', content: `${pick(words)} ${pick(words)} ${int(0, 9)}` })
const payloadOf = (c: Conversation) => ({ system: c.system, messages: c.messages })

for (let scenario = 0; scenario < 24; scenario++) {
  const tight = scenario % 4 === 3
  emit({ op: 'new', ttl_ms: 60_000, max_turns: tight ? 6 : 0, max_groups: tight ? 5 : 0, max_prefixes: tight ? 12 : 0 })
  const namespaces = ['claude::m::scope', 'claude::other::scope']
  const conversations: Conversation[] = []
  for (let step = 0; step < 40; step++) {
    const roll = random()
    const ns = random() < 0.85 ? namespaces[0]! : namespaces[1]!
    const auth = pick(['auth-a', 'auth-b', 'auth-c'])
    let conversation: Conversation
    if (conversations.length === 0 || roll < 0.2) {
      conversation = { system: pick(systems), messages: Array.from({ length: int(1, 3) }, (_, i) => newMessage(i)) }
    } else {
      const base = pick(conversations)
      const kind = random()
      if (kind < 0.45) {
        conversation = { system: base.system, messages: [...base.messages, ...Array.from({ length: int(1, 3) }, (_, i) => newMessage(base.messages.length + i))] }
      } else if (kind < 0.65) {
        const cut = int(1, base.messages.length)
        conversation = { system: base.system, messages: [...base.messages.slice(0, cut), ...Array.from({ length: int(1, 2) }, (_, i) => newMessage(cut + i + 1))] }
      } else if (kind < 0.85) {
        const keep = int(2, Math.max(2, base.messages.length))
        conversation = { system: base.system, messages: [{ role: 'user', content: `summary ${int(0, 99)}` }, ...base.messages.slice(-keep), newMessage(base.messages.length)] }
      } else {
        conversation = { system: pick(systems), messages: base.messages.slice(-int(2, Math.max(2, base.messages.length))) }
      }
    }
    conversations.push(conversation)
    const payload = JSON.stringify(payloadOf(conversation))
    const action = random()
    if (action < 0.35) emit({ op: 'bind', ns, format: 'claude', payload, auth })
    else if (action < 0.6) emit({ op: 'match', ns, format: 'claude', payload })
    else if (action < 0.75) emit({ op: 'touch', ns, format: 'claude', payload, auth })
    else if (action < 0.82) emit(random() < 0.4 ? { op: 'remove', ns, format: 'claude', payload, auth, gen: 0 } : { op: 'remove', ns, format: 'claude', payload, auth, from_last: true, gen_delta: int(-2, 2) })
    else if (action < 0.88) emit({ op: 'advance', ms: pick([1_000, 30_000, 61_000]) })
    else if (action < 0.93) emit(random() < 0.8 ? { op: 'lookup', from_last: true } : { op: 'lookup', session: 'lcp:v1:none' })
    else if (action < 0.97) emit({ op: 'invalidate', auth })
    else emit({ op: 'clear' })
  }
}

process.stdout.write(out.map(op => JSON.stringify(op)).join('\n') + '\n')
