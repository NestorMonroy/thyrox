/**
 * Puerto de `ccnmt: packages/ide/src/hooks/useDiffInIDE.ts`.
 *
 * `PermissionOption`/`ToolUseContext`/`FileEdit` — sólo TIPOS (erasados),
 * de `@thyrox/permission/...`, `@thyrox/tool-registry/Tool.js` y
 * `@thyrox/tool-registry/tools/FileEditTool/types.js` respectivamente.
 * `getEditsForPatch`/`getPatchForEdits` sí son VALUE imports — el paquete
 * `tool-registry` no existe en este árbol; reimplementación fiel recortada
 * en `../internal/pendingCrossPackageDeps.js` (ver el bloque 2h de ese
 * archivo para el detalle de qué se portó y qué se omitió del archivo
 * fuente de 775 líneas).
 */
import { randomUUID } from 'crypto'
import { basename } from 'path'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PermissionOption } from '@thyrox/permission/components/FilePermissionDialog/permissionOptions.js'
import type {
  MCPServerConnection,
  McpSSEIDEServerConfig,
  McpWebSocketIDEServerConfig,
} from '@thyrox/mcp-runtime/types.js'
import type { ToolUseContext } from '@thyrox/tool-registry/Tool.js'
import type { FileEdit } from '@thyrox/tool-registry/tools/FileEditTool/types.js'
import {
  getEditsForPatch,
  getGlobalConfig,
  getPatchForEdits,
  getPatchFromContents,
  requireConfigPlatform,
  requireLocalObservabilityErrorHelpers,
  requireLocalObservabilityLogging,
  requireLocalObservabilityRoot,
  requireStorageFileRead,
  requireStoragePath,
} from '../internal/pendingCrossPackageDeps.js'
import {
  callIdeRpc,
  getConnectedIdeClient,
  getConnectedIdeName,
  hasAccessToIDEExtensionDiffFeature,
} from '../ide.js'
import { WindowsToWSLConverter } from '../idePathConversion.js'

type Props = {
  onChange(
    option: PermissionOption,
    input: {
      file_path: string
      edits: FileEdit[]
    },
  ): void
  toolUseContext: ToolUseContext
  filePath: string
  edits: FileEdit[]
  editMode: 'single' | 'multiple'
}

export function useDiffInIDE({
  onChange,
  toolUseContext,
  filePath,
  edits,
  editMode,
}: Props): {
  closeTabInIDE: () => void
  showingDiffInIDE: boolean
  ideName: string
  hasError: boolean
} {
  const isUnmounted = useRef(false)
  const [hasError, setHasError] = useState(false)

  const sha = useMemo(() => randomUUID().slice(0, 6), [])
  const tabName = useMemo(
    () => `✻ [Claude Code] ${basename(filePath)} (${sha}) ⧉`,
    [filePath, sha],
  )

  const shouldShowDiffInIDE =
    hasAccessToIDEExtensionDiffFeature(toolUseContext.options.mcpClients) &&
    getGlobalConfig().diffTool === 'auto' &&
    // Los diffs sólo deben ser para ediciones de archivo.
    // Las escrituras de archivo pueden pasar por aquí pero no se soportan para diffs.
    !filePath.endsWith('.ipynb')

  const ideName =
    getConnectedIdeName(toolUseContext.options.mcpClients) ?? 'IDE'

  async function showDiff(): Promise<void> {
    const { logError } = requireLocalObservabilityLogging()
    const { logEvent } = requireLocalObservabilityRoot()

    if (!shouldShowDiffInIDE) {
      return
    }

    try {
      logEvent('tengu_ext_will_show_diff', {})

      const { oldContent, newContent } = await showDiffInIDE(
        filePath,
        edits,
        toolUseContext,
        tabName,
      )
      // Se salta si el componente ya se desmontó.
      if (isUnmounted.current) {
        return
      }

      logEvent('tengu_ext_diff_accepted', {})

      const newEdits = computeEditsFromContents(
        filePath,
        oldContent,
        newContent,
        editMode,
      )

      if (newEdits.length === 0) {
        // Sin cambios -- la edición se rechazó (p. ej. se revirtió).
        logEvent('tengu_ext_diff_rejected', {})
        // Se cierra la pestaña aquí porque 'no' ya no la cierra automáticamente.
        const ideClient = getConnectedIdeClient(
          toolUseContext.options.mcpClients,
        )
        if (ideClient) {
          // Cierra la pestaña en el IDE.
          await closeTabInIDE(tabName, ideClient)
        }
        onChange(
          { type: 'reject' },
          {
            file_path: filePath,
            edits: edits,
          },
        )
        return
      }

      // El archivo se modificó - la edición se aceptó.
      onChange(
        { type: 'accept-once' },
        {
          file_path: filePath,
          edits: newEdits,
        },
      )
    } catch (error) {
      logError(error as Error)
      setHasError(true)
    }
  }

  useEffect(() => {
    void showDiff()

    // Fija la bandera al desmontar.
    return () => {
      isUnmounted.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    closeTabInIDE() {
      const ideClient = getConnectedIdeClient(toolUseContext.options.mcpClients)

      if (!ideClient) {
        return Promise.resolve()
      }

      return closeTabInIDE(tabName, ideClient)
    },
    showingDiffInIDE: shouldShowDiffInIDE && !hasError,
    ideName: ideName,
    hasError,
  }
}

/**
 * Recalcula las ediciones a partir del contenido viejo y nuevo. Es
 * necesario para aplicar cualquier edición que el usuario haya hecho sobre
 * el contenido nuevo.
 */
export function computeEditsFromContents(
  filePath: string,
  oldContent: string,
  newContent: string,
  editMode: 'single' | 'multiple',
): FileEdit[] {
  const { logError } = requireLocalObservabilityLogging()

  // Usa patches sin formatear, si no las ediciones quedarían formateadas.
  const singleHunk = editMode === 'single'
  const patch = getPatchFromContents({
    filePath,
    oldContent,
    newContent,
    singleHunk,
  })

  if (patch.length === 0) {
    return []
  }

  // En modo de edición única, se verifica que sólo se obtuvo un hunk.
  if (singleHunk && patch.length > 1) {
    logError(
      new Error(
        `Unexpected number of hunks: ${patch.length}. Expected 1 hunk.`,
      ),
    )
  }

  // Recalcula las ediciones para que coincidan con el patch.
  return getEditsForPatch(patch) as unknown as FileEdit[]
}

/**
 * Termina cuando:
 *
 * 1. La pestaña se cierra en el IDE.
 * 2. La pestaña se guarda en el IDE (entonces se cierra la pestaña).
 * 3. El usuario elige una opción en el IDE.
 * 4. El usuario elige una opción en la terminal (o presiona esc).
 *
 * Se resuelve con el contenido nuevo del archivo.
 *
 * TODO: ¿Timeout tras 5 min de inactividad?
 * TODO: Actualizar la UI de auto-aprobación cuando el IDE sale.
 * TODO: Cerrar la pestaña del IDE cuando se desmonta el prompt de aprobación.
 */
async function showDiffInIDE(
  file_path: string,
  edits: FileEdit[],
  toolUseContext: ToolUseContext,
  tabName: string,
): Promise<{ oldContent: string; newContent: string }> {
  const { logError } = requireLocalObservabilityLogging()
  const { isENOENT } = requireLocalObservabilityErrorHelpers()
  const { expandPath } = requireStoragePath()
  const { readFileSync } = requireStorageFileRead()
  const { getPlatform } = requireConfigPlatform()

  let isCleanedUp = false

  const oldFilePath = expandPath(file_path)
  let oldContent = ''
  try {
    oldContent = readFileSync(oldFilePath)
  } catch (e: unknown) {
    if (!isENOENT(e)) {
      throw e
    }
  }

  async function cleanup() {
    // Se tiene cuidado de evitar race conditions, ya que esta función se
    // puede llamar desde varios lugares.
    if (isCleanedUp) {
      return
    }
    isCleanedUp = true

    // No falla si esto falla.
    try {
      await closeTabInIDE(tabName, ideClient)
    } catch (e) {
      logError(e as Error)
    }

    process.off('beforeExit', cleanup)
    toolUseContext.abortController.signal.removeEventListener('abort', cleanup)
  }

  // Limpia si el usuario presiona esc para cancelar la llamada a la
  // herramienta - o al salir.
  toolUseContext.abortController.signal.addEventListener('abort', cleanup)
  process.on('beforeExit', cleanup)

  // Abre el diff en el IDE.
  const ideClient = getConnectedIdeClient(toolUseContext.options.mcpClients)
  try {
    const { updatedFile } = getPatchForEdits({
      filePath: oldFilePath,
      fileContents: oldContent,
      edits,
    })

    if (!ideClient || ideClient.type !== 'connected') {
      throw new Error('IDE client not available')
    }
    let ideOldPath = oldFilePath

    // Sólo se convierten rutas si estamos en WSL y el IDE está en Windows.
    const ideRunningInWindows =
      (ideClient.config as McpSSEIDEServerConfig | McpWebSocketIDEServerConfig)
        .ideRunningInWindows === true
    if (
      getPlatform() === 'wsl' &&
      ideRunningInWindows &&
      process.env.WSL_DISTRO_NAME
    ) {
      const converter = new WindowsToWSLConverter(process.env.WSL_DISTRO_NAME)
      ideOldPath = converter.toIDEPath(oldFilePath)
    }

    const rpcResult = await callIdeRpc(
      'openDiff',
      {
        old_file_path: ideOldPath,
        new_file_path: ideOldPath,
        new_file_contents: updatedFile,
        tab_name: tabName,
      },
      ideClient,
    )

    // Convierte el resultado crudo del RPC a formato ToolCallResponse.
    const data = Array.isArray(rpcResult) ? rpcResult : [rpcResult]

    // Si el usuario guardó el archivo, se toma el contenido nuevo y se resuelve con eso.
    if (isSaveMessage(data)) {
      void cleanup()
      return {
        oldContent: oldContent,
        newContent: data[1].text,
      }
    } else if (isClosedMessage(data)) {
      void cleanup()
      return {
        oldContent: oldContent,
        newContent: updatedFile,
      }
    } else if (isRejectedMessage(data)) {
      void cleanup()
      return {
        oldContent: oldContent,
        newContent: oldContent,
      }
    }

    // Indica que la llamada a la herramienta terminó sin ninguno de los
    // resultados esperados. ¿El usuario cerró el IDE?
    throw new Error('Not accepted')
  } catch (error) {
    logError(error as Error)
    void cleanup()
    throw error
  }
}

async function closeTabInIDE(
  tabName: string,
  ideClient?: MCPServerConnection | undefined,
): Promise<void> {
  const { logError } = requireLocalObservabilityLogging()
  try {
    if (!ideClient || ideClient.type !== 'connected') {
      throw new Error('IDE client not available')
    }

    // Usa RPC directo para cerrar la pestaña.
    await callIdeRpc('close_tab', { tab_name: tabName }, ideClient)
  } catch (error) {
    logError(error as Error)
    // No se lanza - esto es una operación de limpieza.
  }
}

function isClosedMessage(data: unknown): data is { text: 'TAB_CLOSED' } {
  return (
    Array.isArray(data) &&
    typeof data[0] === 'object' &&
    data[0] !== null &&
    'type' in data[0] &&
    data[0].type === 'text' &&
    'text' in data[0] &&
    data[0].text === 'TAB_CLOSED'
  )
}

function isRejectedMessage(data: unknown): data is { text: 'DIFF_REJECTED' } {
  return (
    Array.isArray(data) &&
    typeof data[0] === 'object' &&
    data[0] !== null &&
    'type' in data[0] &&
    data[0].type === 'text' &&
    'text' in data[0] &&
    data[0].text === 'DIFF_REJECTED'
  )
}

function isSaveMessage(
  data: unknown,
): data is [{ text: 'FILE_SAVED' }, { text: string }] {
  return (
    Array.isArray(data) &&
    (data[0] as { type?: string } | undefined)?.type === 'text' &&
    (data[0] as { text?: string }).text === 'FILE_SAVED' &&
    typeof (data[1] as { text?: string }).text === 'string'
  )
}
