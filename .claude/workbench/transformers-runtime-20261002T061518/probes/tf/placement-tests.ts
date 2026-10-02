
describe('cpuPlacementOf por formato del artefacto (TASK-THYROX-0761)', () => {
  test('un GGUF va a Ollama', () => {
    expect(cpuPlacementOf({ artifact: resolvedArtifact() } as ResolvedModel).runtime).toBe('ollama')
  })

  test('un snapshot de safetensors va a Transformers', () => {
    const artifact = { ...resolvedArtifact({ quantization: 'f32' }), format: 'safetensors' as const }
    expect(cpuPlacementOf({ artifact } as ResolvedModel).runtime).toBe('transformers')
  })
})
