/**
 * Adaptación de `ccnmt: packages/mcp-runtime/testing/index.ts`.
 * Capa 0 (sin cita a paquete hermano ausente) — porte verbatim, sin
 * divergencias. A diferencia de los 13 módulos de `src/` que siguen
 * bloqueados por la ausencia de `@claude-code-how-works/tool-registry`
 * (ver `package.json` de este paquete), este archivo sólo depende de
 * `McpRuntimeHostBindings` (`../src/contracts.js`), que YA está portado
 * — de ahí que sea el único de los 14 módulos ausentes que se cierra en
 * este pase.
 *
 * Runtime MCP en memoria para pruebas. Archivo de ayuda de test — los
 * casteos `as any`/`as unknown` adaptan los tipos concretos del runtime
 * en memoria a los tipos genéricos del lado de prueba
 * (`TConfig`/`TTool`/`TCommand`/`TConnection`). Es un bypass deliberado
 * del patrón de vinculación de runtime; los casteos están en la costura
 * entre las superficies concreta y genérica de prueba.
 */
import type { McpRuntimeHostBindings } from '../src/contracts.js'

export class InMemoryMcpRuntime<
  TConfig extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly toolCalls: Array<{
    serverName: string
    toolName: string
    input: Record<string, unknown>
    meta?: Record<string, unknown>
    signal?: AbortSignal
  }> = []

  constructor(
    private readonly options: {
      connections?: Array<{ name: string; config: TConfig }>
      tools?: unknown[]
      commands?: unknown[]
      resources?: Record<string, unknown[]>
      executeTool?: (call: {
        serverName: string
        serverConfig: TConfig
        toolName: string
        input: Record<string, unknown>
        meta?: Record<string, unknown>
        signal?: AbortSignal
      }) => Promise<unknown> | unknown
    } = {},
  ) {}

  async connectAll(
    configs: Record<string, TConfig>,
  ): Promise<Array<{ name: string; config: TConfig }>> {
    return this.options.connections ?? Object.entries(configs).map(([name, config]) => ({
      name,
      config,
    }))
  }

  async discover(configs: Record<string, TConfig> = {}): Promise<{
    clients: Array<{ name: string; config: TConfig }>
    tools: unknown[]
    commands: unknown[]
    resources?: Record<string, unknown[]>
  }> {
    return {
      clients: await this.connectAll(configs),
      tools: [...(this.options.tools ?? [])],
      commands: [...(this.options.commands ?? [])],
      ...(this.options.resources ? { resources: this.options.resources } : {}),
    }
  }

  async executeTool(call: {
    serverName: string
    serverConfig: TConfig
    toolName: string
    input: Record<string, unknown>
    meta?: Record<string, unknown>
    signal?: AbortSignal
  }): Promise<unknown> {
    this.toolCalls.push(call)
    if (this.options.executeTool) {
      return this.options.executeTool(call)
    }
    return { ok: true, call }
  }

  async prefetchResources(configs: Record<string, TConfig>) {
    return this.discover(configs)
  }
}

export function createInMemoryMcpRuntimeBindings<
  TTool = unknown,
  TCommand = unknown,
  TResource = unknown,
  TConfig extends Record<string, unknown> = Record<string, unknown>,
  TConnection extends { name: string; config: TConfig } = {
    name: string
    config: TConfig
  },
>(
  runtime: InMemoryMcpRuntime<TConfig>,
): McpRuntimeHostBindings<TTool, TCommand, TResource, TConfig, TConnection> {
  return {
    getMcpToolsCommandsAndResources: async onConnectionAttempt => {
      const discovered = await runtime.discover()
      for (const client of discovered.clients as unknown as TConnection[]) {
        onConnectionAttempt({
          client,
          tools: discovered.tools as TTool[],
          commands: discovered.commands as TCommand[],
          resources: discovered.resources?.[client.name] as
            | TResource[]
            | undefined,
        })
      }
    },
    prefetchAllMcpResources: async configs => {
      const discovered = await runtime.discover(configs)
      return {
        clients: discovered.clients as unknown as TConnection[],
        tools: discovered.tools as TTool[],
        commands: discovered.commands as TCommand[],
      }
    },
    connectAll: configs =>
      runtime.connectAll(configs) as unknown as Promise<TConnection[]>,
    discover: configs =>
      runtime.discover(configs as Record<string, TConfig>) as any,
    executeTool: call => runtime.executeTool(call),
    prefetchResources: configs => runtime.prefetchResources(configs) as any,
  }
}
