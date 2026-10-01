/**
 * Almacén de capacidades de superficie de 2.1.283: la clase `ve`
 * (`chunk-nvht7ckf.js`) y las funciones de módulo que la leen —`Yn`, `hN`,
 * `Aqr`, `kK` del mismo chunk, e `I6n`, `lr`, `Dt`, `Ea`, `Bv` de
 * `chunk-m8ebe51k.js`—.
 */
import { beforeEach, describe, expect, test } from 'bun:test'

import {
  DEFAULT_SURFACE_CAPS,
  NOT_REMOTE_SURFACE,
  SurfaceCapabilitiesStore,
  getActiveRemote,
  getSurfaceCaps,
  hasRemoteCapability,
  hasRemoteControlChannel,
  isRemoteSurface,
  isRemoteWorkspace,
  markRemoteWorkspace,
  replaceSurfaceCaps,
  surfaceCapabilities,
  type SurfaceCaps,
} from '../surfaceCapabilities.js'

beforeEach(() => {
  surfaceCapabilities.reset()
})

describe('SurfaceCapabilitiesStore — diálogos del SDK', () => {
  test('sdkDialogHostActive arranca en falso y se declara con markSdkDialogHostActive', () => {
    const store = new SurfaceCapabilitiesStore()
    expect(store.sdkDialogHostActive()).toBe(false)
    store.markSdkDialogHostActive(true)
    expect(store.sdkDialogHostActive()).toBe(true)
  })

  test('declareDialogKinds guarda los tipos y su origen', () => {
    const store = new SurfaceCapabilitiesStore()
    store.declareDialogKinds(['trust', 'permission'], 'sdk')
    expect(store.sdkSupportedDialogKinds()).toEqual(['trust', 'permission'])
    expect(store.sdkSupportedDialogKindsSource()).toBe('sdk')
  })

  test('declareDialogKinds con kinds=undefined descarta también el origen', () => {
    const store = new SurfaceCapabilitiesStore()
    store.declareDialogKinds(['trust'], 'sdk')
    store.declareDialogKinds(undefined, 'sdk')
    expect(store.sdkSupportedDialogKinds()).toBeUndefined()
    expect(store.sdkSupportedDialogKindsSource()).toBeUndefined()
  })

  test('declarePerTaskStopAffordance y declareRapidFollowupPreempt guardan su valor', () => {
    const store = new SurfaceCapabilitiesStore()
    expect(store.sdkPerTaskStopAffordance()).toBeUndefined()
    expect(store.sdkRapidFollowupPreempt()).toBeUndefined()
    store.declarePerTaskStopAffordance(true)
    store.declareRapidFollowupPreempt(false)
    expect(store.sdkPerTaskStopAffordance()).toBe(true)
    expect(store.sdkRapidFollowupPreempt()).toBe(false)
  })
})

describe('SurfaceCapabilitiesStore — attacherCaps con su señal', () => {
  test('replaceAttacherCaps guarda el valor y emite attacherCapsChanged', () => {
    const store = new SurfaceCapabilitiesStore()
    expect(store.attacherCaps()).toBeNull()
    let emitted = 0
    store.attacherCapsChanged.subscribe(() => void emitted++)
    store.replaceAttacherCaps({ bashExec: true })
    expect(store.attacherCaps()).toEqual({ bashExec: true })
    expect(emitted).toBe(1)
  })
})

describe('SurfaceCapabilitiesStore — rvSupervisorLink con su señal', () => {
  test('replaceRvSupervisorLinkLive sólo emite cuando el valor cambia', () => {
    const store = new SurfaceCapabilitiesStore()
    expect(store.rvSupervisorLinkLive()).toBe(false)
    let emitted = 0
    store.rvSupervisorLinkChanged.subscribe(() => void emitted++)
    store.replaceRvSupervisorLinkLive(false)
    expect(emitted).toBe(0)
    store.replaceRvSupervisorLinkLive(true)
    expect(store.rvSupervisorLinkLive()).toBe(true)
    expect(emitted).toBe(1)
    store.replaceRvSupervisorLinkLive(true)
    expect(emitted).toBe(1)
  })
})

describe('SurfaceCapabilitiesStore — sdkBetas', () => {
  test('replaceSdkBetas guarda la lista', () => {
    const store = new SurfaceCapabilitiesStore()
    expect(store.sdkBetas()).toBeUndefined()
    store.replaceSdkBetas(['beta-1', 'beta-2'])
    expect(store.sdkBetas()).toEqual(['beta-1', 'beta-2'])
  })
})

describe('SurfaceCapabilitiesStore — caps/replaceCaps/markRemote', () => {
  test('caps() arranca en DEFAULT_SURFACE_CAPS', () => {
    const store = new SurfaceCapabilitiesStore()
    expect(store.caps()).toEqual(DEFAULT_SURFACE_CAPS)
  })

  test('replaceCaps reemplaza el objeto entero', () => {
    const store = new SurfaceCapabilitiesStore()
    const next: SurfaceCaps = { ...DEFAULT_SURFACE_CAPS, renderTarget: 'html' }
    store.replaceCaps(next)
    expect(store.caps()).toEqual(next)
  })

  test('markRemote sólo toca workspace, preservando el resto', () => {
    const store = new SurfaceCapabilitiesStore()
    store.replaceCaps({ ...DEFAULT_SURFACE_CAPS, canDrive: false })
    store.markRemote(true)
    expect(store.caps()).toEqual({ ...DEFAULT_SURFACE_CAPS, canDrive: false, workspace: 'remote' })
    store.markRemote(false)
    expect(store.caps().workspace).toBe('local')
  })
})

describe('SurfaceCapabilitiesStore — replBridgeActive', () => {
  test('replaceReplBridgeActive guarda el valor', () => {
    const store = new SurfaceCapabilitiesStore()
    expect(store.replBridgeActive()).toBe(false)
    store.replaceReplBridgeActive(true)
    expect(store.replBridgeActive()).toBe(true)
  })
})

describe('SurfaceCapabilitiesStore — estado del bucle principal', () => {
  test('mainLoopBusy y mainQueryRunning derivan de replaceMainLoopStatus', () => {
    const store = new SurfaceCapabilitiesStore()
    expect(store.mainLoopBusy()).toBe(false)
    expect(store.mainQueryRunning()).toBe(false)
    store.replaceMainLoopStatus('queued')
    expect(store.mainLoopBusy()).toBe(true)
    expect(store.mainQueryRunning()).toBe(false)
    store.replaceMainLoopStatus('running')
    expect(store.mainLoopBusy()).toBe(true)
    expect(store.mainQueryRunning()).toBe(true)
  })
})

describe('SurfaceCapabilitiesStore — reset', () => {
  test('reset devuelve todos los campos a su valor inicial y limpia las señales', () => {
    const store = new SurfaceCapabilitiesStore()
    store.markSdkDialogHostActive(true)
    store.declareDialogKinds(['trust'], 'sdk')
    store.declarePerTaskStopAffordance(true)
    store.declareRapidFollowupPreempt(true)
    store.replaceAttacherCaps({ bashExec: true })
    store.replaceRvSupervisorLinkLive(true)
    store.replaceSdkBetas(['beta-1'])
    store.replaceCaps({ ...DEFAULT_SURFACE_CAPS, workspace: 'remote' })
    store.replaceReplBridgeActive(true)
    store.replaceMainLoopStatus('running')

    let attacherEmits = 0
    let rvEmits = 0
    store.attacherCapsChanged.subscribe(() => void attacherEmits++)
    store.rvSupervisorLinkChanged.subscribe(() => void rvEmits++)

    store.reset()

    expect(store.sdkDialogHostActive()).toBe(false)
    expect(store.sdkSupportedDialogKinds()).toBeUndefined()
    expect(store.sdkSupportedDialogKindsSource()).toBeUndefined()
    expect(store.sdkPerTaskStopAffordance()).toBeUndefined()
    expect(store.sdkRapidFollowupPreempt()).toBeUndefined()
    expect(store.attacherCaps()).toBeNull()
    expect(store.rvSupervisorLinkLive()).toBe(false)
    expect(store.sdkBetas()).toBeUndefined()
    expect(store.caps()).toEqual(DEFAULT_SURFACE_CAPS)
    expect(store.replBridgeActive()).toBe(false)
    expect(store.mainLoopBusy()).toBe(false)

    // las señales quedan limpias: un nuevo emit no llega a los oyentes de antes del reset
    store.replaceAttacherCaps({ x: 1 })
    store.replaceRvSupervisorLinkLive(true)
    expect(attacherEmits).toBe(0)
    expect(rvEmits).toBe(0)
  })
})

describe('funciones de módulo — instancia única', () => {
  test('getSurfaceCaps/replaceSurfaceCaps operan sobre la instancia de módulo', () => {
    expect(getSurfaceCaps()).toEqual(DEFAULT_SURFACE_CAPS)
    const next: SurfaceCaps = { ...DEFAULT_SURFACE_CAPS, transcriptSource: 'remote-stream' }
    replaceSurfaceCaps(next)
    expect(getSurfaceCaps()).toEqual(next)
    expect(surfaceCapabilities.caps()).toEqual(next)
  })

  test('isRemoteWorkspace/markRemoteWorkspace', () => {
    expect(isRemoteWorkspace()).toBe(false)
    markRemoteWorkspace(true)
    expect(isRemoteWorkspace()).toBe(true)
    markRemoteWorkspace(false)
    expect(isRemoteWorkspace()).toBe(false)
  })

  test('getActiveRemote lee caps().remote', () => {
    expect(getActiveRemote()).toBeNull()
    replaceSurfaceCaps({ ...DEFAULT_SURFACE_CAPS, remote: { isRemoteMode: true, viewerOnly: false, caps: { controlChannel: true } } })
    expect(getActiveRemote()).toEqual({ isRemoteMode: true, viewerOnly: false, caps: { controlChannel: true } })
  })

  test('isRemoteSurface es verdadero si el workspace es remoto O hay conexión remota activa', () => {
    expect(isRemoteSurface()).toBe(false)
    markRemoteWorkspace(true)
    expect(isRemoteSurface()).toBe(true)
    markRemoteWorkspace(false)
    expect(isRemoteSurface()).toBe(false)
    replaceSurfaceCaps({ ...DEFAULT_SURFACE_CAPS, remote: { isRemoteMode: true, viewerOnly: false, caps: {} } })
    expect(isRemoteSurface()).toBe(true)
  })

  test('hasRemoteControlChannel exige controlChannel y que no sea sólo viewerOnly', () => {
    expect(hasRemoteControlChannel()).toBe(false)
    replaceSurfaceCaps({
      ...DEFAULT_SURFACE_CAPS,
      remote: { isRemoteMode: true, viewerOnly: true, caps: { controlChannel: true } },
    })
    expect(hasRemoteControlChannel()).toBe(false)
    replaceSurfaceCaps({
      ...DEFAULT_SURFACE_CAPS,
      remote: { isRemoteMode: true, viewerOnly: false, caps: { controlChannel: true } },
    })
    expect(hasRemoteControlChannel()).toBe(true)
  })

  test('hasRemoteCapability lee la capacidad nombrada del remoto activo', () => {
    expect(hasRemoteCapability('bashExec')).toBe(false)
    replaceSurfaceCaps({
      ...DEFAULT_SURFACE_CAPS,
      remote: { isRemoteMode: true, viewerOnly: false, caps: { bashExec: true, fileRead: false } },
    })
    expect(hasRemoteCapability('bashExec')).toBe(true)
    expect(hasRemoteCapability('fileRead')).toBe(false)
    expect(hasRemoteCapability('presence')).toBe(false)
  })
})

describe('remoto sin caps', () => {
  test('hasRemoteControlChannel y hasRemoteCapability dan falso sin lanzar', () => {
    replaceSurfaceCaps({ ...DEFAULT_SURFACE_CAPS, remote: { isRemoteMode: true, viewerOnly: false } })
    expect(hasRemoteControlChannel()).toBe(false)
    expect(hasRemoteCapability('bashExec')).toBe(false)
    expect(isRemoteSurface()).toBe(true)
  })
})

describe('NOT_REMOTE_SURFACE — I6n', () => {
  test('es el descriptor de no-remoto: { isRemoteMode: false }', () => {
    expect(NOT_REMOTE_SURFACE).toEqual({ isRemoteMode: false })
  })
})
