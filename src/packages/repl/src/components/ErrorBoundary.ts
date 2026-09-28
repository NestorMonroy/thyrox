import * as React from 'react'
import { recordError } from '@thyrox/local-observability/errorRecorder.js'

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
 * de tumbar el REPL entero, y guarda el error en la base local de errores.
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
    recordError('component_boundary', error, {
      componentBoundary: this.props.name ?? 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
    })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}
