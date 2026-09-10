/**
 * Puerto de `ccnmt: packages/ide/src/hooks/useIDEIntegration.tsx`.
 * `getGlobalConfig`/`isEnvDefinedFalsy` — sustitutos locales; ver
 * `../internal/pendingCrossPackageDeps.js`.
 */
import type React from 'react'
import { useEffect } from 'react'
import type { ScopedMcpServerConfig } from '@thyrox/mcp-runtime/types.js'
import {
  getGlobalConfig,
  isEnvDefinedFalsy,
  requireConfigEnvUtils,
} from '../internal/pendingCrossPackageDeps.js'
import type { DetectedIDEInfo } from '../ide.js'
import {
  type IDEExtensionInstallationStatus,
  type IdeType,
  initializeIdeIntegration,
  isSupportedTerminal,
} from '../ide.js'

type UseIDEIntegrationProps = {
  autoConnectIdeFlag?: boolean
  ideToInstallExtension: IdeType | null
  setDynamicMcpConfig: React.Dispatch<
    React.SetStateAction<Record<string, ScopedMcpServerConfig> | undefined>
  >
  setShowIdeOnboarding: React.Dispatch<React.SetStateAction<boolean>>
  setIDEInstallationState: React.Dispatch<
    React.SetStateAction<IDEExtensionInstallationStatus | null>
  >
}

export function useIDEIntegration({
  autoConnectIdeFlag,
  ideToInstallExtension,
  setDynamicMcpConfig,
  setShowIdeOnboarding,
  setIDEInstallationState,
}: UseIDEIntegrationProps): void {
  useEffect(() => {
    function addIde(ide: DetectedIDEInfo | null) {
      if (!ide) {
        return
      }

      // Comprueba si el auto-connect está habilitado.
      const { isEnvTruthy } = requireConfigEnvUtils()
      const globalConfig = getGlobalConfig()
      const autoConnectEnabled =
        (globalConfig.autoConnectIde ||
          autoConnectIdeFlag ||
          isSupportedTerminal() ||
          // tmux/screen sobreescriben TERM_PROGRAM, rompiendo la detección
          // de terminal, pero la variable de entorno del puerto de la
          // extensión de IDE se hereda. Si está fijada, se conecta
          // automáticamente de todas formas.
          process.env.CLAUDE_CODE_SSE_PORT ||
          ideToInstallExtension ||
          isEnvTruthy(process.env.CLAUDE_CODE_AUTO_CONNECT_IDE)) &&
        !isEnvDefinedFalsy(process.env.CLAUDE_CODE_AUTO_CONNECT_IDE)

      if (!autoConnectEnabled) {
        return
      }

      setDynamicMcpConfig(prev => {
        // Sólo se agrega el IDE si todavía no hay uno.
        if (prev?.ide) {
          return prev
        }
        return {
          ...prev,
          ide: {
            type: ide.url.startsWith('ws:') ? 'ws-ide' : 'sse-ide',
            url: ide.url,
            ideName: ide.name,
            authToken: ide.authToken,
            ideRunningInWindows: ide.ideRunningInWindows,
            scope: 'dynamic' as const,
          },
        }
      })
    }

    // Usa la función utilitaria.
    void initializeIdeIntegration(
      addIde,
      ideToInstallExtension,
      () => setShowIdeOnboarding(true),
      status => setIDEInstallationState(status),
    )
  }, [
    autoConnectIdeFlag,
    ideToInstallExtension,
    setDynamicMcpConfig,
    setShowIdeOnboarding,
    setIDEInstallationState,
  ])
}
