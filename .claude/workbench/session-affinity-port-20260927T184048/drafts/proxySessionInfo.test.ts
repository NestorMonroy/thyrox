/**
 * Extracción de la sesión — casos portados de CLIProxyAPI
 * (`sdk/cliproxy/session/info_test.go` e `info_duplicate_test.go`, leídos
 * como referencia). `TestDeprecatedInMemorySessionTreeStoreCompatibility`
 * pertenece a `tree_compat.go` y va con la caché de sesiones.
 */
import { describe, expect, test } from 'bun:test'
import { boundSessionIdentity, extractSessionInfo, type SessionHeaders } from '../src/proxy/session/info.ts'

const extract = (headers: SessionHeaders, payload?: string, metadata?: Record<string, unknown>) =>
  extractSessionInfo(headers, payload, metadata)

describe('extractSessionInfo: todos los clientes', () => {
  test('Messages con subagente', () => {
    const info = extract({ 'X-Claude-Code-Session-Id': 'claude-root-123', 'X-Claude-Code-Agent-Id': 'subagent-checker' })
    expect(info).toMatchObject({
      clientType: 'claude',
      sessionId: 'claude:claude-root-123:agent:subagent-checker',
      parentSessionId: 'claude:claude-root-123',
      agentName: 'subagent-checker',
    })
  })

  test('Codex con hilo padre', () => {
    const info = extract({ 'Session-Id': 'codex-child-555', 'x-codex-parent-thread-id': 'codex-parent-111' })
    expect(info).toMatchObject({ clientType: 'codex', sessionId: 'codex:codex-child-555', parentSessionId: 'codex:codex-parent-111' })
  })

  test('Codex bifurcado por X-Codex-Turn-Metadata', () => {
    const info = extract({
      'Session-Id': 'codex-fork-666',
      'X-Codex-Turn-Metadata': '{"session_id":"codex-fork-666","forked_from_thread_id":"codex-parent-111","request_kind":"turn"}',
    })
    expect(info).toMatchObject({ clientType: 'codex', sessionId: 'codex:codex-fork-666', parentSessionId: 'codex:codex-parent-111', isFork: true })
  })

  test('Codex multiagente v2', () => {
    const info = extract({
      'Session-Id': 'codex-root-001',
      'Thread-Id': 'codex-sub-thread-002',
      'X-Openai-Subagent': 'collab_spawn',
      'X-Codex-Turn-Metadata':
        '{"session_id":"codex-root-001","thread_id":"codex-sub-thread-002","agent_name":"/root/check_readme","parent_thread_id":"codex-root-001","subagent_kind":"thread_spawn"}',
    })
    expect(info).toMatchObject({
      clientType: 'codex',
      sessionId: 'codex:codex-root-001:agent:check_readme',
      parentSessionId: 'codex:codex-root-001',
      agentName: 'check_readme',
      isSubagent: true,
    })
  })

  test('slot de pi', () => {
    expect(extract({ 'X-Slot-Session-Id': 'pi-slot-777' })).toMatchObject({ clientType: 'pi', sessionId: 'slot:pi-slot-777' })
  })

  test('afinidad de OpenCode con padre', () => {
    expect(extract({ 'X-Session-Affinity': 'oc-child-999', 'X-Parent-Session-Affinity': 'oc-parent-333' })).toMatchObject({
      clientType: 'opencode',
      sessionId: 'affinity:oc-child-999',
      parentSessionId: 'affinity:oc-parent-333',
    })
  })

  test('bifurcación sólo en el cuerpo, con thread_id', () => {
    const info = extract(undefined, '{"thread_id":"child-thread-01","forked_from_thread_id":"parent-thread-00"}')
    expect(info).toMatchObject({ sessionId: 'thread:child-thread-01', parentSessionId: 'thread:parent-thread-00', isFork: true })
    expect(info?.isSubagent).toBeFalsy()
  })

  test('Codex bifurcado con Session-Id y Thread-Id', () => {
    const info = extract({
      'Session-Id': 'parent-thread-00',
      'Thread-Id': 'child-thread-01',
      'X-Codex-Turn-Metadata': '{"session_id":"parent-thread-00","thread_id":"child-thread-01","forked_from_thread_id":"parent-thread-00"}',
    })
    expect(info).toMatchObject({ sessionId: 'codex:child-thread-01', parentSessionId: 'codex:parent-thread-00', isFork: true })
  })

  test('bifurcación en metadata anidada', () => {
    const info = extract(undefined, '{"thread_id":"child-t-99","metadata":{"forked_from_thread_id":"parent-t-88"}}')
    expect(info).toMatchObject({ sessionId: 'thread:child-t-99', parentSessionId: 'thread:parent-t-88', isFork: true })
  })

  test('Codex: Session-Id en cabecera, hilo y bifurcación en el cuerpo', () => {
    const info = extract({ 'Session-Id': 'parent-sess-uuid' }, '{"thread_id":"child-thread-uuid","metadata":{"forked_from_thread_id":"parent-sess-uuid"}}')
    expect(info).toMatchObject({ sessionId: 'codex:child-thread-uuid', parentSessionId: 'codex:parent-sess-uuid', isFork: true })
  })

  test('Antigravity', () => {
    expect(extract({ 'X-Http-Session-Id': 'agy-sess-888' })).toMatchObject({ clientType: 'agy', sessionId: 'agy:agy-sess-888' })
  })

  test('cuerpo con agent_id, padre y ámbito del llamador', () => {
    const info = extract(
      undefined,
      '{"session_id":"payload-child-10","parent_session_id":"payload-parent-01","metadata":{"agent_id":"analyzer"}}',
      { caller_scope: 'test-scope' },
    )
    expect(info).toMatchObject({
      clientType: 'generic',
      sessionId: 'session:payload-child-10:agent:analyzer',
      parentSessionId: 'session:payload-parent-01',
      callerScope: 'test-scope',
    })
  })
})

describe('extractSessionInfo: padre del cuerpo con sesión en cabecera', () => {
  test.each([
    ['genérica', { 'X-Session-ID': 'child' }, 'header:parent'],
    ['Codex', { 'Session-Id': 'child' }, 'codex:parent'],
    ['Messages', { 'X-Claude-Code-Session-Id': 'child' }, 'claude:parent'],
  ])('%s', (_name, headers, parent) => {
    expect(extract(headers, '{"parent_session_id":"parent"}')?.parentSessionId).toBe(parent)
  })
})

describe('extractSessionInfo: reglas', () => {
  test('rechaza caracteres de control', () => {
    expect(extract(undefined, '{"session_id": "test\\nsession"}')).toBeUndefined()
    expect(extract(undefined, '{"session_id": "test\\u0000session"}')).toBeUndefined()
  })

  test('user_id anidado de Messages con padre y agente; cabecera más padre del cuerpo', () => {
    const nested = extract(undefined, JSON.stringify({
      metadata: { user_id: JSON.stringify({ session_id: 'child-session-123', parent_session_id: 'parent-session-456', agent_id: 'subagent-worker' }) },
    }))
    expect(nested).toMatchObject({ sessionId: 'claude:child-session-123:agent:subagent-worker', parentSessionId: 'claude:parent-session-456' })
    const headers = new Headers({ 'X-Claude-Code-Session-Id': 'header-child-123' })
    expect(extract(headers, '{"parent_session_id":"parent-session-789"}')).toMatchObject({
      sessionId: 'claude:header-child-123',
      parentSessionId: 'claude:parent-session-789',
    })
  })

  test('jerarquía de Gemini y de Antigravity', () => {
    expect(extract(undefined, '{"cachedContent":"cache-child-1","parent_session_id":"cache-parent-1"}')).toMatchObject({
      sessionId: 'geminicache:cache-child-1',
      parentSessionId: 'geminicache:cache-parent-1',
      agentName: 'subagent',
    })
    const headers = new Headers({ 'X-Http-Session-Id': 'agy-child-2', 'X-Parent-Session-ID': 'agy-parent-2' })
    expect(extract(headers)).toMatchObject({ sessionId: 'agy:agy-child-2', parentSessionId: 'agy:agy-parent-2', agentName: 'subagent' })
  })

  test('petición anidada de Antigravity', () => {
    const info = extract(undefined, '{"project_id":"proj-123","request":{"parentSessionId":"parent-sess-456","sessionId":"child-sess-789"}}')
    expect(info).toMatchObject({ sessionId: 'session:child-sess-789', parentSessionId: 'session:parent-sess-456' })
  })

  test('hilo y conversación, en cabecera y en cuerpo', () => {
    expect(extract({ 'X-Thread-Id': 'thread-abc-123' })).toMatchObject({ clientType: 'openai-thread', sessionId: 'thread:thread-abc-123' })
    expect(extract({ 'X-Conversation-Id': 'conv-xyz-789' })).toMatchObject({ clientType: 'conv', sessionId: 'conv:conv-xyz-789' })
    expect(extract(undefined, '{"thread_id":"thread-child-1","parent_thread_id":"thread-parent-1"}')).toMatchObject({
      clientType: 'openai-thread',
      sessionId: 'thread:thread-child-1',
      parentSessionId: 'thread:thread-parent-1',
    })
    expect(extract(undefined, '{"conversation_id":"conv-child-2","parent_conversation_id":"conv-parent-2"}')).toMatchObject({
      clientType: 'conv',
      sessionId: 'conv:conv-child-2',
      parentSessionId: 'conv:conv-parent-2',
    })
  })

  test('un padre igual a la propia sesión se descarta', () => {
    const info = extract({ 'X-Session-ID': 'self-session-123' }, '{"parent_session_id": "self-session-123"}')
    expect(info?.sessionId).toBe('header:self-session-123')
    expect(info?.parentSessionId).toBeUndefined()
  })

  test('el user_id de Messages en el cuerpo gana a la cabecera genérica', () => {
    const info = extract({ 'X-Session-ID': 'generic-fallback-session' }, JSON.stringify({
      metadata: { user_id: JSON.stringify({ session_id: 'claude-real-session', agent_id: 'reviewer' }) },
    }))
    expect(info).toMatchObject({ clientType: 'claude', sessionId: 'claude:claude-real-session:agent:reviewer' })
  })

  test('prompt_cache_key, clientreq y sesión de ejecución', () => {
    const pck = extract(undefined, '{"prompt_cache_key":"prompt-key-123","conversation":{"id":"conv-456"}}')
    expect(pck?.sessionId).toBe('pck:prompt-key-123')
    expect(pck?.parentSessionId).toBeUndefined()
    expect(extract(undefined, '{"prompt_cache_key":"prompt-key-123","conversation":{"id":"conv-456"},"parent_session_id":"pck-parent-789"}')).toMatchObject({
      sessionId: 'pck:prompt-key-123',
      parentSessionId: 'pck:pck-parent-789',
    })
    expect(extract(undefined, '{"metadata":{"user_id":"user-999"}}')?.sessionId).toBe('user:user-999')
    expect(extract({ 'X-Client-Request-Id': 'client-req-001' })?.sessionId).toBe('clientreq:client-req-001')
    expect(extract(undefined, undefined, { execution_session_id: 'exec-777' })?.sessionId).toBe('execution:exec-777')
  })

  test('agente en la petición anidada', () => {
    expect(extract(undefined, '{"request":{"sessionId":"child-sess-1","metadata":{"agent_id":"worker-sub"}}}')).toMatchObject({
      sessionId: 'session:child-sess-1:agent:worker-sub',
      parentSessionId: 'session:child-sess-1',
      agentName: 'worker-sub',
    })
  })

  test('user_id de Messages con el agente en cabecera', () => {
    const info = extract({ 'X-Claude-Code-Agent-Id': 'subagent-uuid-123' }, JSON.stringify({
      metadata: { user_id: JSON.stringify({ device_id: 'dev-1', session_id: 'main-sess-456' }) },
    }))
    expect(info).toMatchObject({
      clientType: 'claude',
      sessionId: 'claude:main-sess-456:agent:subagent-uuid-123',
      parentSessionId: 'claude:main-sess-456',
      agentName: 'subagent-uuid-123',
    })
  })

  test('subagent_id, user_id y promptCacheKey anidados', () => {
    expect(extract(undefined, '{"request":{"sessionId":"main-sess-999","metadata":{"subagent_id":"worker-sub-999"}}}')).toMatchObject({
      sessionId: 'session:main-sess-999:agent:worker-sub-999',
      parentSessionId: 'session:main-sess-999',
      agentName: 'worker-sub-999',
    })
    expect(extract(undefined, '{"request":{"metadata":{"user_id":"nested-user-123"}}}')?.sessionId).toBe('user:nested-user-123')
    expect(extract(undefined, '{"request":{"promptCacheKey":"nested-pck-456"}}')?.sessionId).toBe('pck:nested-pck-456')
    expect(extract(undefined, '{"prompt_cache_key":"","request":{"promptCacheKey":"nested-pck-valid"}}')?.sessionId).toBe('pck:nested-pck-valid')
  })
})

describe('boundSessionIdentity', () => {
  test('corta sin partir un carácter y sin colisiones', () => {
    expect(boundSessionIdentity('session:normal-length-session')).toBe('session:normal-length-session')
    const bounded = boundSessionIdentity('会话测试超长标识符'.repeat(20))
    expect(Buffer.byteLength(bounded)).toBeLessThanOrEqual(256)
    expect(bounded).not.toContain('�')
    const a = boundSessionIdentity(`${'a'.repeat(250)}-worker-1`)
    const b = boundSessionIdentity(`${'a'.repeat(250)}-worker-2`)
    expect(a).not.toBe(b)
    expect(Math.max(Buffer.byteLength(a), Buffer.byteLength(b))).toBeLessThanOrEqual(256)
  })
})

describe('extractSessionInfo: arneses', () => {
  test('tareas de Roo Code y Cline, en cabecera y en cuerpo', () => {
    const headers = new Headers({ 'X-Task-ID': 'task-child-001', 'X-Parent-Task-ID': 'task-parent-001' })
    expect(extract(headers)).toMatchObject({ sessionId: 'task:task-child-001', parentSessionId: 'task:task-parent-001', clientType: 'task', agentName: 'subagent' })
    expect(extract(undefined, '{"taskId":"task-child-002","parentTaskId":"task-parent-002"}')).toMatchObject({
      sessionId: 'task:task-child-002',
      parentSessionId: 'task:task-parent-002',
      clientType: 'task',
      agentName: 'subagent',
    })
  })

  test('parent_id y parentID de OpenCode', () => {
    expect(extract(undefined, '{"session_id":"opencode-child-100","parent_id":"opencode-parent-100"}')).toMatchObject({
      sessionId: 'session:opencode-child-100',
      parentSessionId: 'session:opencode-parent-100',
      agentName: 'subagent',
    })
    expect(extract(undefined, '{"sessionID":"opencode-child-200","parentID":"opencode-parent-200"}')).toMatchObject({
      sessionId: 'session:opencode-child-200',
      parentSessionId: 'session:opencode-parent-200',
    })
  })

  test('forkSource y previousSessionId de OpenClaw', () => {
    expect(extract(undefined, '{"sessionId":"claw-child-1","forkSource":{"sessionId":"claw-parent-1"}}')).toMatchObject({
      sessionId: 'session:claw-child-1',
      parentSessionId: 'session:claw-parent-1',
      isFork: true,
    })
    expect(extract(undefined, '{"sessionId":"claw-child-2","previousSessionId":"claw-parent-2"}')).toMatchObject({
      sessionId: 'session:claw-child-2',
      parentSessionId: 'session:claw-parent-2',
      isFork: true,
    })
  })

  test('Hermes, OpenHands y pi', () => {
    expect(extract(undefined, '{"child_session_id":"hermes-child-1","parent_subagent_id":"hermes-parent-1"}')).toMatchObject({
      sessionId: 'session:hermes-child-1',
      parentSessionId: 'session:hermes-parent-1',
    })
    expect(extract(undefined, '{"action_id":"openhands-action-1","parent_action_id":"openhands-parent-action"}')).toMatchObject({
      sessionId: 'task:openhands-action-1',
      parentSessionId: 'task:openhands-parent-action',
      clientType: 'task',
    })
    const slot = new Headers({ 'X-Slot-Session-Id': 'slot-child-001', 'X-Parent-Slot-Session-Id': 'slot-parent-001' })
    expect(extract(slot)).toMatchObject({ sessionId: 'slot:slot-child-001', parentSessionId: 'slot:slot-parent-001', clientType: 'pi', agentName: 'subagent' })
    expect(extract(undefined, '{"prompt_cache_key":"pi-pck-001","parent_session":"pi-parent-001"}')).toMatchObject({
      sessionId: 'pck:pi-pck-001',
      parentSessionId: 'pck:pi-parent-001',
    })
  })

  test('parent_agent_id en el metadata de Messages con user_id heredado', () => {
    const info = extract(undefined, JSON.stringify({
      metadata: {
        user_id: 'user_123_acc__session_01a06a06-e830-7da9-a866-98470a94389c',
        agent_id: 'worker-reviewer',
        parent_agent_id: 'orchestrator-main',
      },
    }))
    expect(info).toMatchObject({
      sessionId: 'claude:01a06a06-e830-7da9-a866-98470a94389c:agent:worker-reviewer',
      parentSessionId: 'claude:01a06a06-e830-7da9-a866-98470a94389c:agent:orchestrator-main',
      agentName: 'worker-reviewer',
    })
  })

  test('cabeceras genéricas de padre', () => {
    expect(extract(new Headers({ 'X-Session-ID': 'gen-child-001', 'X-Parent-ID': 'gen-parent-001' }))).toMatchObject({
      sessionId: 'header:gen-child-001',
      parentSessionId: 'header:gen-parent-001',
    })
    expect(extract(new Headers({ 'X-Conversation-Id': 'conv-child-001', 'X-Parent-Conversation-Id': 'conv-parent-001' }))).toMatchObject({
      sessionId: 'conv:conv-child-001',
      parentSessionId: 'conv:conv-parent-001',
    })
    expect(extract(new Headers({ 'X-Thread-Id': 'thread-child-001', 'X-Parent-Thread-Id': 'thread-parent-001' }))).toMatchObject({
      sessionId: 'thread:thread-child-001',
      parentSessionId: 'thread:thread-parent-001',
    })
  })
})

describe('claves duplicadas en el metadata', () => {
  test.each([
    ['sesión en la raíz', undefined, '{"metadata":{},"metadata":{"session_id":"child"}}', 'session:child', undefined],
    ['sesión en la petición anidada', undefined, '{"request":{"metadata":{},"metadata":{"session_id":"child"}}}', 'session:child', undefined],
    ['padre con sesión en cabecera', { 'X-Session-Id': 'child' }, '{"metadata":{},"metadata":{"parent_session_id":"parent"}}', 'header:child', 'header:parent'],
  ])('%s', (_name, headers, payload, sessionId, parentSessionId) => {
    const info = extract(headers, payload)
    expect(info?.sessionId).toBe(sessionId)
    expect(info?.parentSessionId).toBe(parentSessionId)
  })
})
