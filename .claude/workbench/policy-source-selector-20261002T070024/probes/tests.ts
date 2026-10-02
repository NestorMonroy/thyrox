
describe('la política nombra lo que excluye y distingue la fuente (TASK-THYROX-0763)', () => {
  const PROFILE = { contextTokens: CONTEXT_TOKENS }
  const LIBRARY_QWEN: ModelCatalogEntry = { ...catalogEntry('library/qwen2.5-7b-instruct', '4'), source: 'ollama' }
  const HF_HOMONYM = catalogEntry('library/qwen2.5-7b-instruct', '5')
  const policyFor = (selector: Record<string, unknown>) => parseExecutionPolicy(JSON.stringify({
    allowed: [{ runtime: 'ollama', ...selector }],
    fallback: { enabled: false },
  }))
  const qualified = (entry: ModelCatalogEntry) => [protocol(entry.name), qualification(entry.name)]

  test('si la política excluye todo el catálogo, la causa lo dice y no habla de un catálogo vacío', () => {
    const policy = policyFor({ repository: 'Qwen/Qwen2.5-7B-Instruct-GGUF' })
    const result = recommendExecution('mecanica', PROFILE, { entries: [LIBRARY_QWEN], qualifications: qualified(LIBRARY_QWEN) }, policy)
    const reason = result.runtime === 'blocked' ? result.blockedReason : ''
    expect(reason).toMatch(/la política no permite ninguna de las 1 entrada\(s\) del catálogo local/)
    expect(reason).not.toMatch(/catálogo local vacío/)
  })

  test('un selector con fuente admite la entrada de esa fuente y no a su homónima de otra', () => {
    const policy = policyFor({ repository: 'library/qwen2.5-7b-instruct', source: 'ollama' })
    const inventory = {
      entries: [HF_HOMONYM, LIBRARY_QWEN],
      qualifications: [...qualified(HF_HOMONYM), ...qualified(LIBRARY_QWEN)],
    }
    const result = recommendExecution('mecanica', PROFILE, inventory, policy)
    expect(result.runtime === 'ollama' ? result.model : '').toBe(LIBRARY_QWEN.name)
    const onlyHomonym = { entries: [HF_HOMONYM], qualifications: qualified(HF_HOMONYM) }
    expect(recommendExecution('mecanica', PROFILE, onlyHomonym, policy).runtime).toBe('blocked')
  })

  test('un selector sin fuente sigue admitiendo cualquier fuente', () => {
    const policy = policyFor({ repository: 'library/qwen2.5-7b-instruct' })
    const result = recommendExecution('mecanica', PROFILE, { entries: [LIBRARY_QWEN], qualifications: qualified(LIBRARY_QWEN) }, policy)
    expect(result.runtime).toBe('ollama')
  })

  test('una fuente desconocida se rehúsa al leer la política', () => {
    expect(() => policyFor({ repository: 'library/qwen2.5-7b-instruct', source: 'docker' })).toThrow(ExecutionPolicyError)
  })
})
