/**
 * Porte fiel de `ccnmt: packages/command-runtime/src/testing/index.ts`
 * (paquete `command-runtime`, licencia UNLICENSED — reimplementación, no
 * copia). Porte COMPLETO — sin dependencias cruzadas de paquete: la
 * fuente advierte explícitamente "Must NOT import from ../internal/", y
 * este archivo no lo hace.
 *
 * `StubCommandRuntime` para tests herméticos que no quieren instalar
 * bindings de host reales.
 */
export type StubCommandDefinition = {
  name: string
  description?: string
  aliases?: string[]
}

export class StubCommandRuntime {
  private readonly _commands: StubCommandDefinition[] = []

  addCommand(cmd: StubCommandDefinition): void {
    this._commands.push(cmd)
  }

  async getCommands(): Promise<StubCommandDefinition[]> {
    return [...this._commands]
  }

  find(name: string): StubCommandDefinition | undefined {
    return this._commands.find(c => c.name === name || c.aliases?.includes(name))
  }

  get(name: string): StubCommandDefinition {
    const cmd = this.find(name)
    if (!cmd) throw new Error(`Command not found: ${name}`)
    return cmd
  }

  reset(): void {
    this._commands.length = 0
  }
}
