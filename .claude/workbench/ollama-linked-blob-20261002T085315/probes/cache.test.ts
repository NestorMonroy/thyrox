
describe('adoptLocalArtifact: un blob local verificado entra a la caché por enlace duro (TASK-THYROX-0782)', () => {
  let sourceDir: string
  beforeEach(() => { sourceDir = mkdtempSync(join(tmpdir(), 'adopt-source-')) })
  afterEach(() => rmSync(sourceDir, { recursive: true, force: true }))

  function source(content: string): string {
    const path = join(sourceDir, `sha256-${SHA}`)
    writeFileSync(path, content)
    return path
  }

  test('el archivo de la caché es el mismo inodo que el blob: no se copió ni un byte', async () => {
    const blob = source(CONTENT)
    const outcome = await adoptLocalArtifact({ artifact: ARTIFACT, sourcePath: blob, cacheDir })
    expect(outcome).toEqual({ status: 'adopted', path: cachedArtifactPath(cacheDir, SHA), sha256: SHA })
    expect(statSync(cachedArtifactPath(cacheDir, SHA)).ino).toBe(statSync(blob).ino)
  })

  test('adoptar dos veces no vuelve a enlazar: la segunda está en caché', async () => {
    const blob = source(CONTENT)
    await adoptLocalArtifact({ artifact: ARTIFACT, sourcePath: blob, cacheDir })
    const second = await adoptLocalArtifact({ artifact: ARTIFACT, sourcePath: blob, cacheDir })
    expect(second.status).toBe('cached')
  })

  test('un blob con otro contenido se rechaza y no deja nada en la caché', async () => {
    const outcome = await adoptLocalArtifact({ artifact: ARTIFACT, sourcePath: source('otro contenido'), cacheDir })
    expect(outcome.status).toBe('rejected')
    expect(existsSync(cachedArtifactPath(cacheDir, SHA))).toBe(false)
    expect(readdirSync(cacheDir).filter(name => name.startsWith('.partial'))).toEqual([])
  })

  test('un blob ausente falla nombrando su ruta, sin crear nada', async () => {
    const missing = join(sourceDir, 'no-existe')
    const outcome = await adoptLocalArtifact({ artifact: ARTIFACT, sourcePath: missing, cacheDir })
    expect(outcome.status).toBe('failed')
    expect(outcome.status === 'failed' ? outcome.reason : '').toContain(missing)
    expect(existsSync(cachedArtifactPath(cacheDir, SHA))).toBe(false)
  })
})
