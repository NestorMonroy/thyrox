import type { Command } from '@thyrox/command-runtime/runtime'

const tui = {
  type: 'local',
  name: 'tui',
  description: 'Set the terminal UI renderer (default | fullscreen)',
  argumentHint: '[default|fullscreen]',
  supportsNonInteractive: false,
  load: () => import('./tui.js'),
} satisfies Command

export default tui
