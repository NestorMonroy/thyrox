import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { LocalCommandCall } from '@thyrox/agent/command.js'
import { getCwd } from '@thyrox/app-host/bootstrap/cwd.js'
import { setOriginalCwd } from '@thyrox/app-host/bootstrap/state.js'
import { clearSystemPromptSections } from '@thyrox/provider/systemPromptSections'
import { clearMemoryFileCaches } from '@thyrox/storage/claudemd.js'
import { setCwd } from '@thyrox/shell/Shell.js'
import { onCwdChangedForHooks } from '@thyrox/agent/fileChangedWatcher.js'

export const call: LocalCommandCall = async args => {
  const oldCwd = getCwd()
  const path = resolve(oldCwd, args.trim() || '.')
  const info = await stat(path)
  if (!info.isDirectory()) throw new Error(`Not a directory: ${path}`)
  process.chdir(path)
  setCwd(path)
  setOriginalCwd(path)
  clearSystemPromptSections()
  clearMemoryFileCaches()
  await onCwdChangedForHooks(oldCwd, path)
  return { type: 'text', value: `Working directory changed to ${path}` }
}
