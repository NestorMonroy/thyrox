/**
 * Estado de superficie de la sesión: diálogos declarados por el SDK, las
 * capacidades del adjuntador remoto (`attacherCaps`) y el enlace del
 * supervisor de RV (`rvSupervisorLink`) —cada uno con su señal de cambio—,
 * los betas del SDK, el estado del bucle principal y las capacidades de
 * superficie propiamente dichas (destino de render, workspace local o
 * remoto, procedencia del transcript, conexión remota activa).
 *
 * Porte de la clase `ve` y su valor inicial `nn` (`chunk-nvht7ckf.js`), y de
 * las funciones de módulo que la leen: `Yn`, `hN`, `Aqr`, `kK` (mismo
 * chunk) e `I6n`, `lr`, `Dt`, `Ea`, `Bv` (`chunk-m8ebe51k.js`) de 2.1.283.
 * La referencia lee `n().surfaceCapabilities`; aquí es la instancia de
 * módulo única `surfaceCapabilities`.
 */
import { createSignal, type Signal } from '@thyrox/config/signal'

/** Capacidades booleanas que ofrece una conexión remota activa. */
export type SurfaceRemoteCaps = Record<string, boolean>

/** Forma de `remote` cuando hay una conexión remota activa (rama de `O6n` no portada aquí). */
export type SurfaceRemoteInfo = {
  isRemoteMode: true
  viewerOnly: boolean
  caps?: SurfaceRemoteCaps
}

/**
 * `I6n`: descriptor de una conexión que NO está en modo remoto. No es el
 * valor por defecto de `SurfaceCaps.remote` (ése es `null`, ver `nn`) — es
 * la forma que toma el otro lado del par discriminado (`isRemoteMode`)
 * cuando quien construye la conexión decide no activarla.
 */
export const NOT_REMOTE_SURFACE = { isRemoteMode: false as const }

export type SurfaceCaps = {
  renderTarget: string
  workspace: 'local' | 'remote'
  canDrive: boolean
  transcriptSource: string
  remote: SurfaceRemoteInfo | null
}

/** `nn`: capacidades de superficie por defecto — local, sin conexión remota. */
export const DEFAULT_SURFACE_CAPS: SurfaceCaps = {
  renderTarget: 'ink',
  workspace: 'local',
  canDrive: true,
  transcriptSource: 'local-jsonl',
  remote: null,
}

/** `ve`. */
export class SurfaceCapabilitiesStore {
  private dialogHostActive = false
  private dialogKinds: readonly string[] | undefined
  private dialogKindsSource: string | undefined
  private perTaskStopAffordance: boolean | undefined
  private rapidFollowupPreempt: boolean | undefined
  private attacherCapsValue: unknown = null
  private rvSupervisorLinkLiveValue = false
  private sdkBetasValue: readonly string[] | undefined
  private capsValue: SurfaceCaps = DEFAULT_SURFACE_CAPS
  private replBridgeActiveValue = false
  private mainLoopStatusValue = 'idle'

  readonly attacherCapsChanged: Signal<[]> = createSignal()
  readonly rvSupervisorLinkChanged: Signal<[]> = createSignal()

  sdkDialogHostActive(): boolean {
    return this.dialogHostActive
  }

  markSdkDialogHostActive(active: boolean): void {
    this.dialogHostActive = active
  }

  sdkSupportedDialogKinds(): readonly string[] | undefined {
    return this.dialogKinds
  }

  sdkSupportedDialogKindsSource(): string | undefined {
    return this.dialogKindsSource
  }

  declareDialogKinds(kinds: readonly string[] | undefined, source: string | undefined): void {
    this.dialogKinds = kinds
    this.dialogKindsSource = kinds === undefined ? undefined : source
  }

  sdkPerTaskStopAffordance(): boolean | undefined {
    return this.perTaskStopAffordance
  }

  declarePerTaskStopAffordance(value: boolean | undefined): void {
    this.perTaskStopAffordance = value
  }

  sdkRapidFollowupPreempt(): boolean | undefined {
    return this.rapidFollowupPreempt
  }

  declareRapidFollowupPreempt(value: boolean | undefined): void {
    this.rapidFollowupPreempt = value
  }

  attacherCaps(): unknown {
    return this.attacherCapsValue
  }

  replaceAttacherCaps(caps: unknown): void {
    this.attacherCapsValue = caps
    this.attacherCapsChanged.emit()
  }

  rvSupervisorLinkLive(): boolean {
    return this.rvSupervisorLinkLiveValue
  }

  replaceRvSupervisorLinkLive(live: boolean): void {
    if (this.rvSupervisorLinkLiveValue === live) return
    this.rvSupervisorLinkLiveValue = live
    this.rvSupervisorLinkChanged.emit()
  }

  sdkBetas(): readonly string[] | undefined {
    return this.sdkBetasValue
  }

  replaceSdkBetas(betas: readonly string[] | undefined): void {
    this.sdkBetasValue = betas
  }

  caps(): SurfaceCaps {
    return this.capsValue
  }

  replaceCaps(caps: SurfaceCaps): void {
    this.capsValue = caps
  }

  markRemote(isRemote: boolean): void {
    this.capsValue = { ...this.capsValue, workspace: isRemote ? 'remote' : 'local' }
  }

  replBridgeActive(): boolean {
    return this.replBridgeActiveValue
  }

  replaceReplBridgeActive(active: boolean): void {
    if (this.replBridgeActiveValue === active) return
    this.replBridgeActiveValue = active
  }

  mainLoopBusy(): boolean {
    return this.mainLoopStatusValue !== 'idle'
  }

  mainQueryRunning(): boolean {
    return this.mainLoopStatusValue === 'running'
  }

  replaceMainLoopStatus(status: string): void {
    this.mainLoopStatusValue = status
  }

  reset(): void {
    this.dialogHostActive = false
    this.dialogKinds = undefined
    this.dialogKindsSource = undefined
    this.perTaskStopAffordance = undefined
    this.rapidFollowupPreempt = undefined
    this.attacherCapsValue = null
    this.sdkBetasValue = undefined
    this.capsValue = DEFAULT_SURFACE_CAPS
    this.replBridgeActiveValue = false
    this.mainLoopStatusValue = 'idle'
    this.rvSupervisorLinkLiveValue = false
    this.attacherCapsChanged.clear()
    this.rvSupervisorLinkChanged.clear()
  }
}

/** Instancia de módulo única — `n().surfaceCapabilities` en la referencia. */
export const surfaceCapabilities = new SurfaceCapabilitiesStore()

/** `Yn`. */
export function isRemoteWorkspace(): boolean {
  return surfaceCapabilities.caps().workspace === 'remote'
}

/** `hN`. */
export function getSurfaceCaps(): SurfaceCaps {
  return surfaceCapabilities.caps()
}

/** `Aqr`. */
export function replaceSurfaceCaps(caps: SurfaceCaps): void {
  surfaceCapabilities.replaceCaps(caps)
}

/** `kK`. */
export function markRemoteWorkspace(isRemote: boolean): void {
  surfaceCapabilities.markRemote(isRemote)
}

/** `lr`. */
export function getActiveRemote(): SurfaceRemoteInfo | null {
  return getSurfaceCaps().remote
}

/** `Dt`. */
export function isRemoteSurface(): boolean {
  return isRemoteWorkspace() || getActiveRemote() !== null
}

/** `Ea`. */
export function hasRemoteControlChannel(): boolean {
  const remote = getActiveRemote()
  return remote !== null && remote.caps?.controlChannel === true && !remote.viewerOnly
}

/** `Bv`. */
export function hasRemoteCapability(capability: string): boolean {
  return getActiveRemote()?.caps?.[capability] === true
}
