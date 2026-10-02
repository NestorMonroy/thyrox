
describe('local-models-catalog adopt (TASK-THYROX-0782)', () => {
  test('adopta en la caché, por enlace duro, el blob del volumen de una entrada del catálogo', async () => {
    const install = installation(correct)
    expect((await run(runCatalogCommand, ['declare', 'qwen2.5:0.5b'], install)).code).toBe(0)
    const result = await run(runCatalogCommand, ['adopt', CONTRACT_NAME], install)
    expect(result).toMatchObject({ code: 0, stderr: [] })
    expect(result.stdout[0]).toContain('adoptado')
    const cached = join(install.root, '.thyrox/models/artifacts', `sha256-${GGUF_SHA256}.gguf`)
    const blob = join(install.root, 'volume', 'models', 'blobs', `sha256-${GGUF_SHA256}`)
    expect(statSync(cached).ino).toBe(statSync(blob).ino)
  })

  test('un nombre fuera del catálogo sale 2 nombrándolo, sin tocar la caché', async () => {
    const install = installation(correct)
    const result = await run(runCatalogCommand, ['adopt', 'thyrox-no--existe:q4_k_m-ollama-000000000000'], install)
    expect(result.code).toBe(2)
    expect(result.stderr.join('\n')).toContain('thyrox-no--existe')
  })
})
