// El estado de los modos de captura del inspector (omniroute: src/lib/inspector/captureState.ts,
// MIT): el proxy HTTP en marcha, el proxy del sistema aplicado con su guarda de reversión y la
// intercepción TLS.
import { afterEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import os from 'node:os'

import {
  clearSystemProxy,
  getHttpProxyHandle,
  getSystemProxyState,
  isTlsInterceptEnabled,
  setHttpProxyHandle,
  setSystemProxyApplied,
  setTlsIntercept,
} from '../../src/inspector/captureState.ts'
import type { HttpProxyServerHandle } from '../../src/inspector/httpProxyServer.ts'
import { __setExec, type ExecFileFn } from '../../src/inspector/systemProxyConfig.ts'

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
  clearSystemProxy()
  setTlsIntercept(null)
})

const LINUX_PREVIOUS = {
  platform: 'linux' as const,
  gnomeMode: "'none'",
  httpHost: '',
  httpPort: '',
  httpsHost: '',
  httpsPort: '',
}

test('the HTTP proxy handle is stored and cleared', () => {
  const handle = { port: 8080 } as HttpProxyServerHandle
  setHttpProxyHandle(handle)
  assert.equal(getHttpProxyHandle(), handle)
  setHttpProxyHandle(null)
  assert.equal(getHttpProxyHandle(), null)
})

test('an applied system proxy records its port, guard and previous state', () => {
  const before = Date.now()
  setSystemProxyApplied(9090, LINUX_PREVIOUS, 10)
  const state = getSystemProxyState()
  assert.equal(state.applied, true)
  assert.equal(state.port, 9090)
  assert.deepEqual(state.previousState, LINUX_PREVIOUS)
  const guard = Date.parse(state.guardUntil!)
  assert.ok(guard >= before + 10 * 60_000 && guard <= Date.now() + 10 * 60_000)
  clearSystemProxy()
  assert.deepEqual(getSystemProxyState(), { applied: false, port: null, guardUntil: null, previousState: null })
})

test('the guard reverts the system proxy on expiry, and clear cancels it', async () => {
  const original = os.platform
  ;(os as { platform: () => NodeJS.Platform }).platform = () => 'linux'
  cleanups.push(() => {
    ;(os as { platform: () => NodeJS.Platform }).platform = original
  })
  const calls: string[][] = []
  const exec: ExecFileFn = async (file, args) => {
    calls.push([file, ...args])
    return { stdout: '', stderr: '' }
  }
  cleanups.push(__setExec(exec))

  setSystemProxyApplied(9090, LINUX_PREVIOUS, 0.0005)
  clearSystemProxy()
  await Bun.sleep(80)
  assert.equal(calls.length, 0)

  setSystemProxyApplied(9090, LINUX_PREVIOUS, 0.0005)
  await Bun.sleep(80)
  assert.equal(getSystemProxyState().applied, false)
  assert.ok(calls.some(c => c.join(' ') === "gsettings set org.gnome.system.proxy mode 'none'"), JSON.stringify(calls))
})

test('TLS interception follows THYROX_INSPECTOR_TLS_INTERCEPT until set explicitly', () => {
  const previous = process.env.THYROX_INSPECTOR_TLS_INTERCEPT
  cleanups.push(() => {
    if (previous === undefined) delete process.env.THYROX_INSPECTOR_TLS_INTERCEPT
    else process.env.THYROX_INSPECTOR_TLS_INTERCEPT = previous
  })
  process.env.THYROX_INSPECTOR_TLS_INTERCEPT = 'true'
  assert.equal(isTlsInterceptEnabled(), true)
  process.env.THYROX_INSPECTOR_TLS_INTERCEPT = '1'
  assert.equal(isTlsInterceptEnabled(), false)
  setTlsIntercept(true)
  assert.equal(isTlsInterceptEnabled(), true)
  process.env.THYROX_INSPECTOR_TLS_INTERCEPT = 'true'
  setTlsIntercept(false)
  assert.equal(isTlsInterceptEnabled(), false)
})

test('clearing the system proxy cancels the guard, so it no longer holds the process', () => {
  const module = new URL('../../src/inspector/captureState.ts', import.meta.url).pathname
  const script = `
    import { setSystemProxyApplied, clearSystemProxy } from ${JSON.stringify(module)}
    setSystemProxyApplied(9090, { platform: 'linux', gnomeMode: "'none'", httpHost: '', httpPort: '', httpsHost: '', httpsPort: '' }, 0.1)
    clearSystemProxy()
  `
  const started = Date.now()
  const result = Bun.spawnSync([process.execPath, '-e', script])
  assert.equal(result.exitCode, 0, result.stderr.toString())
  assert.ok(Date.now() - started < 4000, `the process lived ${Date.now() - started} ms`)
})
