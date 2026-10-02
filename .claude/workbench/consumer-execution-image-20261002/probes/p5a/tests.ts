
describe('build-image con la referencia de trabajo de un consumidor (TASK-THYROX-0760)', () => {
  test('--work construye bajo la identidad del consumidor, sin citar una TASK de thyrox', async () => {
    const h = harness()
    const code = await runExecutionCommand(['build-image', '--work', 'ai-course-notes:es-mx/execution-image',
      '--context', '/srv/ctx', '--tag', 'localhost/ai-course-notes-runner:dev'], h.deps)
    const build = h.calls.find(call => call[0] === 'build') ?? []
    expect(code).toBe(0)
    expect(build).toContain('thyrox.execution-reference=work:ai-course-notes:es-mx/execution-image')
    expect(build.some(arg => arg.startsWith('thyrox.task='))).toBe(false)
  })

  test('una tarea de thyrox conserva su etiqueta de hoy', async () => {
    const h = harness()
    await runExecutionCommand(['build-image', '--task', 'TASK-THYROX-0001', '--context', '/srv/ctx', '--tag', 'localhost/x:dev'], h.deps)
    expect(h.calls.find(call => call[0] === 'build')).toContain('thyrox.task=TASK-THYROX-0001')
  })

  test('--task y --work juntos no construyen nada', async () => {
    const h = harness()
    const code = await runExecutionCommand(['build-image', '--task', 'TASK-THYROX-0001', '--work', 'a:b',
      '--context', '/srv/ctx', '--tag', 'localhost/x:dev'], h.deps)
    expect(code).toBe(2)
    expect(h.calls).toHaveLength(0)
  })
})
