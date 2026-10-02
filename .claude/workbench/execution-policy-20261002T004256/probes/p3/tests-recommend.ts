
describe('recommendExecution con una política de ejecución declarada (TASK-THYROX-0758)', () => {
  const QWEN = catalogEntry('Qwen/Qwen2.5-7B-Instruct-GGUF', '3')
  const PROFILE = { contextTokens: CONTEXT_TOKENS }
  const policyOf = (fallback: boolean) => parseExecutionPolicy(JSON.stringify({
    allowed: [{ runtime: 'ollama', repository: 'Qwen/Qwen2.5-7B-Instruct-GGUF', quantization: 'q4_k_m' }],
    fallback: { enabled: fallback },
  }))
  const both = {
    entries: [QWEN, FAST],
    qualifications: [protocol(QWEN.name), qualification(QWEN.name), protocol(FAST.name), qualification(FAST.name, { tokensPerSecond: 99 })],
  }
  const onlyOther = { entries: [FAST], qualifications: [protocol(FAST.name), qualification(FAST.name)] }

  test('elige sólo entre los modelos que la política permite, aunque otro sea más rápido', () => {
    const result = recommendExecution('mecanica', PROFILE, both, policyOf(false))
    expect(result.runtime).toBe('ollama')
    expect(result.runtime === 'ollama' ? result.model : '').toBe(QWEN.name)
  })

  test('sin candidato permitido cualificado y sin respaldo: bloqueada con su causa, nunca claude-cli', () => {
    const result = recommendExecution('mecanica', PROFILE, onlyOther, policyOf(false))
    expect(result.runtime).toBe('blocked')
    expect(result.runtime === 'blocked' ? result.blockedReason : '').toMatch(/política/)
  })

  test('con el respaldo declarado, cae a claude-cli y lo nombra', () => {
    const result = recommendExecution('mecanica', PROFILE, onlyOther, policyOf(true))
    expect(result.runtime).toBe('claude-cli')
  })

  test('sin política, el comportamiento de hoy no cambia', () => {
    expect(recommendExecution('mecanica', PROFILE, both).runtime).toBe('ollama')
    expect(recommendExecution('mecanica', PROFILE, both).model).toBe(FAST.name)
  })
})

describe('parseExecutionPolicy', () => {
  test('el respaldo no tiene valor por defecto: sin declararlo se rehúsa', () => {
    expect(() => parseExecutionPolicy(JSON.stringify({ allowed: [] }))).toThrow(ExecutionPolicyError)
  })

  test('sólo se permiten modelos locales por su repositorio; un proveedor no se lista', () => {
    expect(() => parseExecutionPolicy(JSON.stringify({ allowed: [{ runtime: 'claude-cli' }], fallback: { enabled: false } })))
      .toThrow(ExecutionPolicyError)
  })

  test('un JSON ilegible se rehúsa con su causa', () => {
    expect(() => parseExecutionPolicy('{ no es json')).toThrow(ExecutionPolicyError)
  })
})
