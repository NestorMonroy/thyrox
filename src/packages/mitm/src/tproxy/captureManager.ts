/**
 * La sesión única del modo de captura TPROXY: arranca la captura con
 * descifrado (CA dinámica nueva por sesión), cuenta las interceptaciones y
 * publica su estado. Una segunda sesión simultánea se rehúsa.
 *
 * Porte de `omniroute: src/mitm/tproxy/captureManager.ts` (MIT).
 */
import { isTransparentSocketAvailable } from '@thyrox/transparent-napi'

import { DynamicCertStore } from '../dynamicCert.ts'
import type { TproxyConfig } from './commands.ts'
import { startTproxyCapture, type TproxyCaptureHandle } from './captureMode.ts'

export interface CaptureManagerStatus {
  running: boolean
  available: boolean
  startedAt?: string
  interceptCount?: number
  onPort?: number
}

export interface CaptureManagerDeps {
  startTproxyCapture: typeof startTproxyCapture
  isAvailable: () => boolean
  createCertStore: () => DynamicCertStore
  now: () => string
}

const realDeps: CaptureManagerDeps = {
  startTproxyCapture,
  isAvailable: isTransparentSocketAvailable,
  createCertStore: () => new DynamicCertStore(),
  now: () => new Date().toISOString(),
}

export interface StartCaptureModeOptions {
  cfg: TproxyConfig
  installCa: (caPem: string) => Promise<void>
  uninstallCa: () => Promise<void>
  deps?: Partial<CaptureManagerDeps>
}

interface ActiveCapture {
  handle: TproxyCaptureHandle
  startedAt: string
  intercepts: { count: number }
}

let active: ActiveCapture | null = null

export async function startCaptureMode(options: StartCaptureModeOptions): Promise<CaptureManagerStatus> {
  if (active) throw new Error('TPROXY capture mode is already running')
  const deps: CaptureManagerDeps = { ...realDeps, ...options.deps }
  if (!deps.isAvailable()) throw new Error('TPROXY capture mode requires the native addon (Linux + CAP_NET_ADMIN).')
  const certStore = deps.createCertStore()
  const intercepts = { count: 0 }
  const handle = await deps.startTproxyCapture(options.cfg, {
    decrypt: { certStore, installCa: options.installCa, uninstallCa: options.uninstallCa },
    onIntercept: () => {
      intercepts.count += 1
    },
  })
  active = { handle, startedAt: deps.now(), intercepts }
  return getCaptureStatus()
}

export async function stopCaptureMode(): Promise<CaptureManagerStatus> {
  const current = active
  active = null
  if (current) await current.handle.stop()
  return getCaptureStatus()
}

export function getCaptureStatus(): CaptureManagerStatus {
  const available = isTransparentSocketAvailable()
  if (!active) return { running: false, available }
  return {
    running: true,
    available,
    startedAt: active.startedAt,
    interceptCount: active.intercepts.count,
    onPort: active.handle.cfg.onPort,
  }
}

/** Sólo para pruebas: olvida la sesión activa. */
export function __resetCaptureManager(): void {
  active = null
}
