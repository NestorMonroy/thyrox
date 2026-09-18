import React from 'react'
import type { CommandResultDisplay } from '@thyrox/command-runtime/runtime'
import { DesktopHandoff } from '../../components/DesktopHandoff.js'

export async function call(
  onDone: (
    result?: string,
    options?: { display?: CommandResultDisplay },
  ) => void,
): Promise<React.ReactNode> {
  return <DesktopHandoff onDone={onDone} />
}
