import * as React from 'react'
import { logError } from '@thyrox/local-observability/log.js'

interface Props {
  children: React.ReactNode
  /** Nombre del límite, para saber en el registro cuál atrapó el error. */
  name?: string
}

interface State {
  hasError: boolean
}

/**
 * Aísla un componente que falla al renderizar: lo retira de la pantalla en vez
 * de tumbar el REPL entero, y deja el error en el registro local.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logError(new Error(`[${this.props.name ?? 'ErrorBoundary'}] ${error.message}${errorInfo.componentStack ?? ''}`, { cause: error }))
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}
