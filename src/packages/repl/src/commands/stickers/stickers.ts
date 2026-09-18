import type { LocalCommandResult } from '@thyrox/agent/command.js'
import { openBrowser } from '@thyrox/storage/browser.js'

export async function call(): Promise<LocalCommandResult> {
  const url = 'https://www.stickermule.com/claudecode'
  const success = await openBrowser(url)

  if (success) {
    return { type: 'text', value: 'Opening sticker page in browser…' }
  } else {
    return {
      type: 'text',
      value: `Failed to open browser. Visit: ${url}`,
    }
  }
}
