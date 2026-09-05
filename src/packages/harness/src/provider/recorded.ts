/**
 * `RecordedProvider` (T-004): el adaptador determinista.
 *
 * El harness se construye y se prueba **entero** contra este proveedor. No es
 * un apaño de pruebas: es la consecuencia de que este contenedor no tenga
 * credencial de modelo (ver el análisis §2). Guarda cada petición recibida,
 * que es lo que permite comprobar qué se envió —el `tool_result`, el
 * historial reanudado, el prompt de sistema— sin gastar un solo token.
 */
import type { AssistantTurn, Provider, ProviderRequest } from '../types.ts'

export class RecordedProvider implements Provider {
  readonly name = 'recorded'
  readonly requests: ProviderRequest[] = []
  private turnos: AssistantTurn[]
  private i = 0
  private alEnviar?: (request: ProviderRequest, indice: number) => void

  constructor(turnos: AssistantTurn[], alEnviar?: (request: ProviderRequest, indice: number) => void) {
    this.turnos = turnos
    this.alEnviar = alEnviar
  }

  async send(request: ProviderRequest): Promise<AssistantTurn> {
    this.requests.push(structuredClone(request))
    this.alEnviar?.(request, this.i)
    const t = this.turnos[this.i]
    this.i += 1
    if (!t) throw new Error(`RecordedProvider: no hay turno grabado ${this.i} (grabados: ${this.turnos.length})`)
    return t
  }

  /**
   * El mismo turno grabado, entregado en chunks. Parte por palabra: no
   * imita el troceado del servicio -- imita su **forma**, que es lo único que
   * el bucle consume. El turno que devuelve es idéntico al de `send()`.
   */
  async *stream(
    request: ProviderRequest,
  ): AsyncGenerator<{ type: 'text_delta' | 'thinking_delta'; text: string }, AssistantTurn> {
    const turn = await this.send(request)
    for (const block of turn.content) {
      // El pensamiento grabado también se entrega en incremental, con su tipo:
      // si sólo se troceara el texto, un turno con razonamiento no ejercitaría
      // en las pruebas el camino que el servicio real sí produce.
      const texto = block.type === 'text' ? block.text : block.type === 'thinking' ? block.thinking : null
      if (texto === null) continue
      const tipo = block.type === 'text' ? ('text_delta' as const) : ('thinking_delta' as const)
      for (const chunk of texto.split(/(?<=\s)/)) if (chunk) yield { type: tipo, text: chunk }
    }
    return turn
  }
}
