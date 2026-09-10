/**
 * Porte de `ccnmt: packages/agent/core/AgentCore.ts`.
 *
 * La fachada del bucle: guarda el estado acumulado entre turnos (mensajes,
 * conteo de turnos, uso agregado, modelo, sesión) y delega la conversación
 * en sí a `AgentLoop`. `run` reenvía cada evento del loop, actualiza su
 * propio estado a partir de él (`updateState`), y corta el generador con
 * un `done: interrupted` en cuanto `interrupt()` marca la bandera — sin
 * esperar a que el loop termine su turno actual por su cuenta.
 */
import type { AgentDeps } from '../agentDeps.ts'
import type { AgentEvent, DoneReason } from '../agentEvents.ts'
import type { AgentState, AgentInput } from '../agentState.ts'
import type { CoreMessage, Usage } from '../agentMessages.ts'
import { AgentLoop } from './AgentLoop.ts'

export class AgentCore {
  private loop: AgentLoop
  private _messages: CoreMessage[]
  private _turnCount: number
  private _totalUsage: Usage
  private _model: string
  private _sessionId: string
  private _interrupted: boolean

  constructor(deps: AgentDeps,
    initialState?: Partial<AgentState>,
  ) {
    this._messages = initialState?.messages ? [...initialState.messages] : []
    this._turnCount = initialState?.turnCount ?? 0
    this._totalUsage = initialState?.totalUsage ?? {
      input_tokens: 0,
      output_tokens: 0,
    }
    this._model = initialState?.model ?? deps.provider.getModel()
    this._sessionId = initialState?.sessionId ?? deps.session.getSessionId()
    this._interrupted = false
    this.loop = new AgentLoop(deps)
  }

  /**
   * Corre el loop y reenvía sus eventos, actualizando el estado propio a
   * medida que llegan. Si `interrupt()` marcó la bandera durante el `yield`
   * al llamador, emite `done: interrupted` y retorna sin drenar el resto
   * del generador interno.
   */
  async *run(input: AgentInput): AsyncGenerator<AgentEvent> {
    this._interrupted = false

    if (input.messages && input.messages.length > 0) {
      this._messages = [...input.messages]
    }

    try {
      for await (const event of this.loop.run(input)) {
        this.updateState(event)
        yield event
        if (this._interrupted) {
          yield {
            type: 'done',
            reason: 'interrupted' as DoneReason,
          }
          return
        }
      }
    } catch (error) {
      yield {
        type: 'done',
        reason: 'error' as DoneReason,
        error,
      }
    }
  }

  interrupt(): void {
    this._interrupted = true
  }

  getMessages(): readonly CoreMessage[] {
    return this._messages
  }

  getState(): AgentState {
    return {
      messages: this._messages,
      turnCount: this._turnCount,
      totalUsage: { ...this._totalUsage },
      model: this._model,
      sessionId: this._sessionId,
    }
  }

  setModel(model: string): void {
    this._model = model
  }

  private updateState(event: AgentEvent): void {
    switch (event.type) {
      case 'message':
        this._messages = [...this._messages, event.message]
        if (
          event.message.type === 'assistant' &&
          event.message.usage
        ) {
          this._totalUsage.input_tokens += event.message.usage.input_tokens
          this._totalUsage.output_tokens += event.message.usage.output_tokens
          if (event.message.usage.cache_creation_input_tokens) {
            this._totalUsage.cache_creation_input_tokens =
              (this._totalUsage.cache_creation_input_tokens ?? 0) +
              event.message.usage.cache_creation_input_tokens
          }
          if (event.message.usage.cache_read_input_tokens) {
            this._totalUsage.cache_read_input_tokens =
              (this._totalUsage.cache_read_input_tokens ?? 0) +
              event.message.usage.cache_read_input_tokens
          }
        }
        break
      case 'compaction':
        this._messages = [...event.after]
        break
      case 'done':
        break
    }
  }
}
