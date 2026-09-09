/**
 * Registro de herramientas de juguete para tests herméticos.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/testing/index.ts` (34
 * líneas). Ese árbol declara `"license": "UNLICENSED"`, así que se reimplementa
 * el contrato y no se copia el cuerpo.
 *
 * Su valor está en lo que NO hace: no toca el registro real, no lee el disco y
 * no importa nada de `internal/`. Un test que necesite «hay una herramienta
 * llamada X» la declara aquí y no arrastra el arranque del registro entero.
 *
 * El mapa es privado a propósito: `getAll()` devuelve una copia, así que quien
 * la reciba no puede mutar el registro por debajo.
 */

export type StubToolDefinition = {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export class StubRegistry {
  private readonly tools = new Map<string, StubToolDefinition>()

  register(tool: StubToolDefinition): void {
    this.tools.set(tool.name, tool)
  }

  /** Devuelve si había algo que quitar — no lanza cuando el nombre no existe. */
  unregister(name: string): boolean {
    return this.tools.delete(name)
  }

  get(name: string): StubToolDefinition | undefined {
    return this.tools.get(name)
  }

  /** Copia en orden de inserción; mutarla no afecta al registro. */
  getAll(): StubToolDefinition[] {
    return Array.from(this.tools.values())
  }

  reset(): void {
    this.tools.clear()
  }
}
