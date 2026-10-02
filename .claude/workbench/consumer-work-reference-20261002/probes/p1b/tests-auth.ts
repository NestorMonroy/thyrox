
describe('la referencia de trabajo de un consumidor', () => {
  const work = { kind: 'work', consumer: 'ai-course-notes', workId: 'cs224r/cs224r__lecture01__lecture01-notes/001' } as const

  test('autoriza un trabajo de tarea con la identidad del consumidor, sin convertirla en TASK', () => {
    expect(refusedField(authorization({ reference: work }))).toBe('accepted')
    const argv = createWorkerContainerArgv(executionContainerSpec(authorization({ reference: work })))
    expect(argv).toContain(`${EXECUTION_REFERENCE_LABEL_KEY}=work:ai-course-notes:${work.workId}`)
  })

  test('un consumidor o un id fuera de su forma se rehúsan', () => {
    expect(refusedField(authorization({ reference: { ...work, consumer: 'AI Notes' } }))).toBe('reference')
    expect(refusedField(authorization({ reference: { ...work, workId: 'cs224r/../escape' } }))).toBe('reference')
    expect(refusedField(authorization({ reference: { ...work, workId: '' } }))).toBe('reference')
  })

  test('un runtime de modelo no se autoriza por una referencia de trabajo', () => {
    expect(refusedField(modelAuthorization({ reference: work }))).toBe('reference')
  })
})
