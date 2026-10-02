
describe('run con la referencia de trabajo de un consumidor', () => {
  test('--work autoriza con la identidad del consumidor y --owner declara el dueño del pool', async () => {
    const h = harness()
    const code = await runExecutionCommand(['run', '--work', 'ai-course-notes:cs224r/n/001', '--owner', 'pool:cs224r-001',
      '--kind', 'test', '--', 'true'], h.deps)
    const argv = createArgv(h)
    expect(code).toBe(0)
    expect(argv).toContain('thyrox.execution-reference=work:ai-course-notes:cs224r/n/001')
    expect(argv).toContain('thyrox.owner-kind=pool')
    expect(argv).toContain('thyrox.owner-id=cs224r-001')
    expect(h.stderr.join('')).toContain('kind=test work=ai-course-notes:cs224r/n/001 exit=0')
  })

  test('--task y --work juntos no son una autorización', async () => {
    const h = harness()
    const code = await runExecutionCommand(['run', '--task', 'TASK-THYROX-0001', '--work', 'a:b', '--kind', 'test', '--', 'true'], h.deps)
    expect(code).toBe(2)
    expect(h.calls).toHaveLength(0)
  })

  test('un dueño que no es de pool no se declara por línea de orden', async () => {
    const h = harness()
    const code = await runExecutionCommand(['run', '--work', 'a:b', '--owner', 'model-coordinator:x', '--kind', 'test', '--', 'true'], h.deps)
    expect(code).toBe(2)
    expect(h.calls).toHaveLength(0)
  })
})
