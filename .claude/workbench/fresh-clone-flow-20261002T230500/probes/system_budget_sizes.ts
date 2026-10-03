import { systemPromptFor } from '/home/user/thyrox/src/packages/cli/src/entry/systemPrompt.ts'
for (const budget of [undefined, '8000', '6000']) {
  const argv = budget ? ['--system-budget-tokens', budget] : []
  const a = systemPromptFor(argv, '/home/user/thyrox')
  console.log(`presupuesto=${budget ?? 'ninguno'} tokens=${a.tokens} secciones=${a.sections.map(s => s.name).join(',')}`)
  console.log(`  descartadas=${a.dropped.map(s => `${s.name}(${s.tokens})`).join(',') || '-'}`)
}
