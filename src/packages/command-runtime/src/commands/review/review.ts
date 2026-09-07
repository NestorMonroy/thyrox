/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/commands/review/review.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO — sin divergencias: `./ultrareviewEnabled.js` ya
 * está portado en este árbol, y `ContentBlockParam` es type-only (se
 * borra al transpilar, ver `types.ts`).
 */
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.js'
import type { Command } from '../../runtime.js'
import { isUltrareviewEnabled } from './ultrareviewEnabled.js'

// Legal pide el nombre explícito de la superficie más un link a la doc
// visible antes de que el usuario dispare, así que la descripción lleva
// el nombre "Claude Code on the web" + la URL.
const CCR_TERMS_URL = 'https://code.claude.com/docs/en/claude-code-how-works-how-works-on-the-web'

const LOCAL_REVIEW_PROMPT = (args: string) => `
      You are an expert code reviewer. Follow these steps:

      1. If no PR number is provided in the args, run \`gh pr list\` to show open PRs
      2. If a PR number is provided, run \`gh pr view <number>\` to get PR details
      3. Run \`gh pr diff <number>\` to get the diff
      4. Analyze the changes and provide a thorough code review that includes:
         - Overview of what the PR does
         - Analysis of code quality and style
         - Specific suggestions for improvements
         - Any potential issues or risks

      Keep your review concise but thorough. Focus on:
      - Code correctness
      - Following project conventions
      - Performance implications
      - Test coverage
      - Security considerations

      Format your review with clear sections and bullet points.

      PR number: ${args}
    `

const review: Command = {
  type: 'prompt',
  name: 'review',
  description: 'Review a pull request',
  progressMessage: 'reviewing pull request',
  contentLength: 0,
  source: 'builtin',
  async getPromptForCommand(args): Promise<ContentBlockParam[]> {
    return [{ type: 'text', text: LOCAL_REVIEW_PROMPT(args) }]
  },
}

// /ultrareview es el ÚNICO punto de entrada al path remoto de bughunter —
// /review se queda puramente local. El tipo local-jsx renderiza el
// diálogo de permiso de overage cuando se agotan los reviews gratis.
const ultrareview: Command = {
  type: 'local-jsx',
  name: 'ultrareview',
  description: `~10–20 min · Finds and verifies bugs in your branch. Runs in Claude Code on the web. See ${CCR_TERMS_URL}`,
  isEnabled: () => isUltrareviewEnabled(),
  load: () => import('./ultrareviewCommand.js'),
}

export default review
export { ultrareview }
