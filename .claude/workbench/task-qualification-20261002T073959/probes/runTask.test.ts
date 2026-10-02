
describe('runTaskQualification — la suite de tarea de un consumidor (TASK-THYROX-0780)', () => {
  let directory: string
  beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'task-qualification-')) })
  afterEach(() => { rmSync(directory, { recursive: true, force: true }) })

  async function taskSuite(): Promise<TaskSuite> {
    const path = join(directory, 'suite.json')
    writeFileSync(path, JSON.stringify({
      id: 'es-mx-translation@1',
      taskClass: 'analisis',
      cases: [
        { id: 'uno', messages: [{ role: 'user', content: '一' }], checks: [{ kind: 'includes', text: 'uno' }] },
        { id: 'dos', messages: [{ role: 'user', content: '二' }], checks: [{ kind: 'excludes-pattern', pattern: '\\p{Script=Han}' }] },
      ],
    }))
    return loadTaskSuite(path)
  }

  async function qualifyTask(reply: (prompt: string) => FakeChatReply, contextTokens = CONTEXT_TOKENS) {
    server = startFakeOllama({ chat: prompt => reply(prompt) })
    return runTaskQualification({ ticket: ticketTo(server.baseUrl), suite: await taskSuite(), measurementCondition: 'isolated', contextTokens, now: () => NOW })
  }

  const translated = (prompt: string): FakeChatReply => ({ content: prompt === '一' ? 'uno' : 'dos' })

  test('todos los casos cumplen: una cualificación de tarea de la clase de la suite', async () => {
    const { qualification } = await qualifyTask(translated)
    expect(qualification).toEqual({
      model: MODEL,
      kind: 'task',
      taskClass: 'analisis',
      suite: 'es-mx-translation@1',
      casesPassed: 2,
      casesTotal: 2,
      passed: true,
      contextTokens: CONTEXT_TOKENS,
      tokensPerSecond: 20,
      measurementCondition: 'isolated',
      measuredAt: '2026-10-01T05:00:00.000Z',
    })
  })

  test('un caso que falla suspende, y su resultado nombra la comprobación', async () => {
    const { qualification, outcomes } = await qualifyTask(prompt => ({ content: prompt === '一' ? 'uno' : '二' }))
    expect(qualification.passed).toBe(false)
    expect(qualification.casesPassed).toBe(1)
    expect(outcomes.find(o => !o.passed)?.observed).toContain('excludes-pattern')
  })

  test('cada petición lleva los mensajes del caso, sin herramientas, stream falso y num_ctx', async () => {
    await qualifyTask(translated)
    const chats = (server?.requests ?? []).filter(r => r.path === '/api/chat').map(r => r.body as Record<string, unknown>)
    expect(chats).toHaveLength(2)
    expect(chats.every(body => body.model === MODEL && body.stream === false && !('tools' in body))).toBe(true)
    expect(chats.map(body => (body.options as { num_ctx: number }).num_ctx)).toEqual([CONTEXT_TOKENS, CONTEXT_TOKENS])
  })

  test('pedir más contexto que el concedido se rehúsa sin tocar el runtime', async () => {
    await expect(qualifyTask(translated, GRANTED_CONTEXT + 1)).rejects.toThrow(ContextBeyondGrantError)
    expect(server?.requests ?? []).toHaveLength(0)
  })
})
