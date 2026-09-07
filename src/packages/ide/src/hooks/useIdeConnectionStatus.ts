/**
 * Puerto de `ccnmt: packages/ide/src/hooks/useIdeConnectionStatus.ts`
 * (verbatim). `MCPServerConnection` viene de `@thyrox/mcp-runtime/types.js`
 * — sólo como TIPO (erasado).
 */
import { useMemo } from 'react'
import type { MCPServerConnection } from '@thyrox/mcp-runtime/types.js'

export type IdeStatus = 'connected' | 'disconnected' | 'pending' | null

type IdeConnectionResult = {
  status: IdeStatus
  ideName: string | null
}

export function useIdeConnectionStatus(
  mcpClients?: MCPServerConnection[],
): IdeConnectionResult {
  return useMemo(() => {
    const ideClient = mcpClients?.find(client => client.name === 'ide')
    if (!ideClient) {
      return { status: null, ideName: null }
    }
    // Extrae el nombre del IDE de la config, si está disponible.
    const config = ideClient.config
    const ideName =
      config.type === 'sse-ide' || config.type === 'ws-ide'
        ? config.ideName
        : null
    if (ideClient.type === 'connected') {
      return { status: 'connected', ideName }
    }
    if (ideClient.type === 'pending') {
      return { status: 'pending', ideName }
    }
    return { status: 'disconnected', ideName }
  }, [mcpClients])
}
