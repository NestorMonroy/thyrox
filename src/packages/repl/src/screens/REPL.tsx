import React from 'react'
import type { RuntimeGraph } from '@thyrox/app-host'
import {
  REPL as REPLView,
  type Props as REPLViewProps,
  type Screen,
} from './REPLView.js'
import { useReplController } from './repl/REPLController.js'

export type Props = REPLViewProps & {
  runtimeGraph?: RuntimeGraph
}

export type { Screen }

export function REPL(props: Props): React.ReactNode {
  const viewProps = useReplController(props)
  return <REPLView {...viewProps} />
}
