
describe('runQualifyCommand --suite: la cualificación de tarea de un consumidor (TASK-THYROX-0780)', () => {
  function taskSuiteFile(): string {
    const path = join(directory, 'task-suite.json')
    writeFileSync(path, JSON.stringify({
      id: 'es-mx-translation@1',
      taskClass: 'analisis',
      cases: [{ id: 'sin-han', messages: [{ role: 'user', content: '一' }], checks: [{ kind: 'excludes-pattern', pattern: '\\p{Script=Han}' }] }],
    }))
    return path
  }

  test('corre los casos de la suite y escribe una cualificación de tarea de su clase', async () => {
    const coordinator = await coordinatorWith()
    expect(await runQualifyCommand([MODEL, '--suite', taskSuiteFile()], contextFor())).toBe(EXIT_OK)
    expect(chats()).toHaveLength(1)
    expect(coordinator.finished).toEqual(['admission-1'])
    const written = JSON.parse(readFileSync(join(directory, 'qualifications.json'), 'utf8'))
    expect(JSON.stringify(written)).toContain('"kind":"task"')
    expect(JSON.stringify(written)).toContain('"taskClass":"analisis"')
    expect(stdout.join('\n')).toContain('tarea analisis es-mx-translation@1')
  })

  test('una suite ilegible se rehúsa antes de pedir admisión', async () => {
    const coordinator = await coordinatorWith()
    expect(await runQualifyCommand([MODEL, '--suite', join(directory, 'no-existe.json')], contextFor())).toBe(EXIT_REFUSED)
    expect(coordinator.admitted).toHaveLength(0)
  })
})
