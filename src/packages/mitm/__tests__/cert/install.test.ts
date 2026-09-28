// Portado de omniroute: tests/unit/mitm-cert-install-mode-9442, mitm-cert-mac-fingerprint,
// agent-bridge-cert-install-fallback-4546, windows-cert-identity-7275,
// mitm-cert-removal-wiring y system-trust-test-guard (MIT), sobre bun:test. Los comandos
// son ejecutables falsos en el PATH que registran su argv; el directorio del almacén de
// confianza, la elevación de Windows y HOME se inyectan, así que nada toca el sistema.
import { afterEach, beforeEach, test } from 'bun:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  buildCertManualGuide,
  buildWindowsDelstoreScript,
  certutilThumbprint,
  checkCertInstalled,
  classifyCertInstallError,
  ensureSystemCertMode,
  installCaCert,
  installCert,
  installCertResult,
  LINUX_CERT_NAME,
  macCertOutputHasFingerprint,
  NSS_CERT_NAME,
  uninstallCert,
  type CertTrustDeps,
} from '../../src/cert/install.ts'

const cleanups: Array<() => void> = []
let root = ''
let capture = ''
let anchors = ''
let deps: CertTrustDeps
let scripts: string[] = []

function setEnv(name: string, value: string | undefined): void {
  const previous = process.env[name]
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
  cleanups.push(() => {
    if (previous === undefined) delete process.env[name]
    else process.env[name] = previous
  })
}

function withPlatform(platform: NodeJS.Platform): void {
  const original = os.platform
  ;(os as { platform: () => NodeJS.Platform }).platform = () => platform
  cleanups.push(() => {
    ;(os as { platform: () => NodeJS.Platform }).platform = original
  })
}

// Un comando falso: registra `nombre\0arg\0arg…` por línea; con `failOn`, sale
// 1 cuando ese argumento aparece; con `stdout`, lo imprime.
function stub(name: string, options: { failOn?: string; exitCode?: number; stdout?: string } = {}): void {
  const fail = options.failOn
    ? `for a in "$@"; do [ "$a" = '${options.failOn}' ] && exit 1; done\n`
    : ''
  const out = options.stdout ? `printf '%s' '${options.stdout}'\n` : ''
  fs.writeFileSync(
    path.join(root, 'bin', name),
    `#!/bin/sh\nprintf '%s\\0' '${name}' "$@" >> '${capture}'\nprintf '\\n' >> '${capture}'\n${fail}${out}exit ${options.exitCode ?? 0}\n`,
    { mode: 0o755 },
  )
}

function captured(): string[][] {
  return fs
    .readFileSync(capture, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => line.split('\0').filter(Boolean))
}

function fakeCert(seed: string): string {
  const der = crypto.createHash('sha256').update(seed).digest()
  const pem = `-----BEGIN CERTIFICATE-----\n${der.toString('base64')}\n-----END CERTIFICATE-----\n`
  const file = path.join(root, `${seed}.crt`)
  fs.writeFileSync(file, pem)
  return file
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'thyrox-cert-install-'))
  cleanups.push(() => fs.rmSync(root, { recursive: true, force: true }))
  fs.mkdirSync(path.join(root, 'bin'))
  fs.mkdirSync(path.join(root, 'home', '.pki', 'nssdb'), { recursive: true })
  anchors = path.join(root, 'anchors')
  fs.mkdirSync(anchors)
  capture = path.join(root, 'argv.log')
  fs.writeFileSync(capture, '')
  for (const name of ['cp', 'mkdir', 'chmod', 'rm', 'update-ca-certificates', 'certutil']) stub(name)
  setEnv('PATH', `${path.join(root, 'bin')}:/usr/bin:/bin`)
  setEnv('HOME', path.join(root, 'home'))
  setEnv('THYROX_MITM_NO_SUDO', '1')
  setEnv('THYROX_MITM_SKIP_SYSTEM_TRUST', undefined)
  scripts = []
  deps = {
    linuxCertPaths: [{ dir: anchors, cmd: 'update-ca-certificates' }],
    runElevatedPowerShell: async script => {
      scripts.push(script)
      return ''
    },
  }
})

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

test('macCertOutputHasFingerprint ignores colons and case', () => {
  const fingerprint = 'AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01'
  const output = 'SHA-1 hash: ABCDEF0123456789ABCDEF0123456789ABCDEF01'
  assert.equal(macCertOutputHasFingerprint(output, fingerprint), true)
  assert.equal(macCertOutputHasFingerprint(output.toLowerCase(), fingerprint), true)
  assert.equal(macCertOutputHasFingerprint('SHA-1 hash: 00000000000000000000000000000000000000FF', fingerprint), false)
})

test('classifyCertInstallError calls only an explicit cancel canceled', () => {
  assert.equal(classifyCertInstallError('User canceled authorization'), 'canceled')
  assert.equal(classifyCertInstallError('Operation was cancelled by the user'), 'canceled')
  assert.equal(classifyCertInstallError('Certificate install failed'), 'environment')
  assert.equal(classifyCertInstallError('sudo: no tty present'), 'environment')
})

test('buildCertManualGuide gives the platform steps and a file URL to the cert', () => {
  const linux = buildCertManualGuide('/data/mitm/ca.crt', 'linux', deps)
  assert.equal(linux.downloadUrl, pathToFileURL('/data/mitm/ca.crt').href)
  assert.ok(linux.steps[0]!.includes(`${anchors}/${LINUX_CERT_NAME}`), linux.steps[0])
  assert.ok(linux.steps.join('\n').includes('sudo update-ca-certificates'))
  assert.ok(buildCertManualGuide('/d/ca.crt', 'darwin').steps.join('\n').includes('add-trusted-cert'))
  assert.ok(buildCertManualGuide('C:/d/ca.crt', 'win32').steps.join('\n').includes('certutil -addstore -f Root'))
})

test('installCertResult reports a missing cert as a skippable environment failure', async () => {
  const result = await installCertResult('', '/nonexistent/thyrox-server.crt', deps)
  assert.equal(result.installed, false)
  assert.equal(result.skipped, true)
  assert.equal(result.reason, 'environment')
  assert.ok(result.manualGuide)
  assert.ok(!String(result.message).includes('\n    at '))
  assert.deepEqual(await installCaCert('', '/nonexistent/thyrox-server.crt', deps), result)
})

test('installCertResult passes a user cancel through without skipping', async () => {
  withPlatform('win32')
  stub('certutil', { exitCode: 1 })
  const result = await installCertResult('', fakeCert('cancel'), {
    runElevatedPowerShell: async () => {
      throw new Error('The operation was canceled by the user')
    },
  })
  assert.deepEqual([result.skipped, result.reason], [false, 'canceled'])
})

test('linux install copies, makes it world-readable, refreshes and adds to NSS [#9442]', async () => {
  withPlatform('linux')
  const cert = fakeCert('install-9442')
  const dest = `${anchors}/${LINUX_CERT_NAME}`
  await installCert('', cert, deps)
  const nssdb = path.join(root, 'home', '.pki', 'nssdb')
  assert.deepEqual(captured(), [
    ['mkdir', '-p', anchors],
    ['cp', cert, dest],
    ['chmod', '0644', dest],
    ['update-ca-certificates'],
    ['certutil', '-d', `sql:${nssdb}`, '-A', '-t', 'C,,', '-n', NSS_CERT_NAME, '-i', cert],
  ])
})

test('an installed cert only has its mode repaired [#9442]', async () => {
  withPlatform('linux')
  const cert = fakeCert('installed-9442')
  const dest = `${anchors}/${LINUX_CERT_NAME}`
  fs.copyFileSync(cert, dest)
  fs.chmodSync(dest, 0o600)
  assert.equal(await checkCertInstalled(cert, deps), true)
  await installCert('', cert, deps)
  assert.deepEqual(captured(), [['chmod', '0644', dest]])
})

test('ensureSystemCertMode chmods only a cert that is not 0644', async () => {
  const wrong = path.join(root, 'wrong.crt')
  fs.writeFileSync(wrong, 'x', { mode: 0o600 })
  fs.chmodSync(wrong, 0o600)
  const right = path.join(root, 'right.crt')
  fs.writeFileSync(right, 'x')
  fs.chmodSync(right, 0o644)
  await ensureSystemCertMode(right, '')
  await ensureSystemCertMode(wrong, '')
  assert.deepEqual(captured(), [['chmod', '0644', wrong]])
})

test('cp under umask 0077 creates 0600, which is why the chmod exists', () => {
  const src = path.join(root, 'umask-src')
  const dst = path.join(root, 'umask-dst')
  fs.writeFileSync(src, 'x', { mode: 0o644 })
  const previous = process.umask(0o077)
  try {
    execFileSync('/bin/cp', [src, dst])
  } finally {
    process.umask(previous)
  }
  assert.equal(fs.statSync(dst).mode & 0o777, 0o600)
})

test('THYROX_MITM_SKIP_SYSTEM_TRUST=1 skips the trust store but still checks the file', async () => {
  withPlatform('linux')
  setEnv('THYROX_MITM_SKIP_SYSTEM_TRUST', '1')
  await assert.rejects(installCert('', '/nonexistent/guard.pem', deps), /Certificate file not found/)
  const cert = fakeCert('guard')
  await installCert('', cert, deps)
  fs.copyFileSync(cert, `${anchors}/${LINUX_CERT_NAME}`)
  await uninstallCert('', cert, deps)
  assert.deepEqual(captured(), [])
})

test('a failed linux step reports a plain install failure', async () => {
  withPlatform('linux')
  stub('cp', { exitCode: 1 })
  await assert.rejects(installCert('', fakeCert('cp-fails'), deps), /^Error: Certificate install failed$/)
})

test('linux uninstall removes from NSS and the store, refreshing with --fresh or without', async () => {
  withPlatform('linux')
  const cert = fakeCert('uninstall')
  const dest = `${anchors}/${LINUX_CERT_NAME}`
  fs.copyFileSync(cert, dest)
  stub('update-ca-certificates', { failOn: '--fresh' })
  await uninstallCert('', cert, deps)
  const nssdb = path.join(root, 'home', '.pki', 'nssdb')
  assert.deepEqual(captured(), [
    ['certutil', '-d', `sql:${nssdb}`, '-D', '-n', NSS_CERT_NAME],
    ['rm', '-f', dest],
    ['update-ca-certificates', '--fresh'],
    ['update-ca-certificates'],
  ])
})

test('uninstall of a cert that is not installed does nothing', async () => {
  withPlatform('linux')
  await uninstallCert('', fakeCert('absent'), deps)
  assert.deepEqual(captured(), [])
})

test('windows checks and removes by the cert thumbprint [#7275]', async () => {
  withPlatform('win32')
  const certA = fakeCert('probe-a')
  const certB = fakeCert('probe-b')
  assert.notEqual(certutilThumbprint(certA), certutilThumbprint(certB))
  assert.equal(await checkCertInstalled(certB, deps), true)
  assert.deepEqual(captured(), [['certutil', '-store', 'Root', certutilThumbprint(certB)]])
  await uninstallCert('', certB, deps)
  assert.equal(scripts.length, 1)
  assert.equal(scripts[0]!.match(/'-delstore'\s*,\s*'Root'\s*,\s*'([^']+)'/)?.[1], certutilThumbprint(certB))
  assert.equal(scripts[0], buildWindowsDelstoreScript(certutilThumbprint(certB)))
})

test('windows installs through one elevated certutil -addstore', async () => {
  withPlatform('win32')
  stub('certutil', { exitCode: 1 })
  const cert = fakeCert('win-install')
  assert.equal(await checkCertInstalled(cert, deps), false)
  await installCert('', cert, deps)
  assert.equal(scripts.length, 1)
  assert.ok(scripts[0]!.includes(`$certPath = '${cert}'`), scripts[0])
  assert.ok(scripts[0]!.includes("@('-addstore','Root',$certPath)"), scripts[0])
})

test('macOS reads the keychain fingerprint and adds or deletes by it', async () => {
  withPlatform('darwin')
  const cert = fakeCert('mac')
  const bare = certutilThumbprint(cert)
  stub('security', { stdout: `SHA-1 hash: ${bare}` })
  assert.equal(await checkCertInstalled(cert, deps), true)
  await uninstallCert('pw', cert, deps)
  assert.deepEqual(captured().at(-1), [
    'security', 'delete-certificate', '-Z', bare, '/Library/Keychains/System.keychain',
  ])
  stub('security', { stdout: 'SHA-1 hash: 00' })
  await installCert('pw', cert, deps)
  assert.deepEqual(captured().at(-1), [
    'security', 'add-trusted-cert', '-d', '-r', 'trustRoot', '-k', '/Library/Keychains/System.keychain', cert,
  ])
})

test('linux uses the first candidate whose directory exists, with its refresh command', async () => {
  withPlatform('linux')
  stub('update-ca-trust')
  const cert = fakeCert('distro')
  await installCert('', cert, {
    linuxCertPaths: [
      { dir: path.join(root, 'missing'), cmd: 'update-ca-certificates' },
      { dir: anchors, cmd: 'update-ca-trust' },
    ],
  })
  const commands = captured()
  assert.deepEqual(commands[1], ['cp', cert, `${anchors}/${LINUX_CERT_NAME}`])
  assert.deepEqual(commands[3], ['update-ca-trust'])
})
