/**
 * La confianza del sistema en la CA del MITM: comprobar si está instalada,
 * instalarla y retirarla del almacén de cada plataforma (Linux por distro,
 * el llavero de sistema de macOS, el almacén Root de Windows) y de las bases
 * NSS de Chromium y Firefox. La identidad del certificado es siempre su
 * huella SHA-1, calculada del propio archivo.
 *
 * Porte de `omniroute: src/mitm/cert/install.ts` (MIT). Diferencias:
 *  - la plataforma se lee al llamar, no en la carga del módulo;
 *  - los nombres del certificado llevan `PRODUCT_NAME`, y la bandera para no
 *    tocar el almacén es `THYROX_MITM_SKIP_SYSTEM_TRUST`;
 *  - thyrox no tiene el panel web de la referencia, así que la guía manual
 *    apunta al archivo local (`file://`) en vez de a su ruta de descarga;
 *  - los directorios candidatos de Linux y la elevación de Windows se pueden
 *    inyectar (`CertTrustDeps`), para medir los comandos sin tocar el sistema;
 *  - el registro va a `logForDebugging`.
 */
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import { pathToFileURL } from 'node:url'

import { PRODUCT_NAME } from '@thyrox/config/product'
import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'

import {
  execFileText,
  execFileWithPassword,
  quotePowerShell,
  runElevatedPowerShell,
} from '../systemCommands.ts'

/** El nombre del certificado en el directorio de anclas de Linux. */
export const LINUX_CERT_NAME = `${PRODUCT_NAME}-mitm.crt`
/** El apodo del certificado en las bases NSS. */
export const NSS_CERT_NAME = `${PRODUCT_NAME} MITM Root CA`

const MAC_SYSTEM_KEYCHAIN = '/Library/Keychains/System.keychain'

export interface LinuxCertConfig {
  dir: string
  cmd: string
}

const LINUX_CERT_PATHS: LinuxCertConfig[] = [
  // Debian / Ubuntu
  { dir: '/usr/local/share/ca-certificates', cmd: 'update-ca-certificates' },
  // Arch / CachyOS / Manjaro
  { dir: '/etc/ca-certificates/trust-source/anchors', cmd: 'update-ca-trust' },
  // Fedora / RHEL / CentOS
  { dir: '/etc/pki/ca-trust/source/anchors', cmd: 'update-ca-trust' },
  // openSUSE
  { dir: '/etc/pki/trust/anchors', cmd: 'update-ca-certificates' },
]

export interface CertTrustDeps {
  /** Candidatos de Linux en orden; gana el primero cuyo directorio existe. */
  linuxCertPaths?: LinuxCertConfig[]
  runElevatedPowerShell?: typeof runElevatedPowerShell
}

function platform(): NodeJS.Platform {
  return os.platform()
}

function getLinuxCertConfig(deps?: CertTrustDeps): LinuxCertConfig {
  const candidates = deps?.linuxCertPaths ?? LINUX_CERT_PATHS
  return candidates.find(config => fs.existsSync(config.dir)) ?? candidates[0]!
}

function linuxDestFile(deps?: CertTrustDeps): string {
  return `${getLinuxCertConfig(deps).dir}/${LINUX_CERT_NAME}`
}

function elevate(deps?: CertTrustDeps): typeof runElevatedPowerShell {
  return deps?.runElevatedPowerShell ?? runElevatedPowerShell
}

function isSystemTrustSkipped(): boolean {
  return process.env.THYROX_MITM_SKIP_SYSTEM_TRUST === '1'
}

// Los valores viajan por el entorno del shell y no interpolados en el guion:
// un metacarácter en la ruta queda dentro del argumento entre comillas.
const NSS_SCRIPT = `
  set -u
  if ! command -v certutil > /dev/null 2>&1; then
    exit 0
  fi

  DIRS="$HOME/.pki/nssdb $HOME/snap/chromium/current/.pki/nssdb"

  if [ -d "$HOME/.mozilla/firefox" ]; then
    for profile in "$HOME"/.mozilla/firefox/*/; do
      if [ -f "\${profile}cert9.db" ] || [ -f "\${profile}cert8.db" ]; then
        DIRS="$DIRS $profile"
      fi
    done
  fi

  if [ -d "$HOME/snap/firefox/common/.mozilla/firefox" ]; then
    for profile in "$HOME"/snap/firefox/common/.mozilla/firefox/*/; do
      if [ -f "\${profile}cert9.db" ] || [ -f "\${profile}cert8.db" ]; then
        DIRS="$DIRS $profile"
      fi
    done
  fi

  for db in $DIRS; do
    if [ -d "$db" ]; then
      if [ "$ACTION" = "add" ]; then
        certutil -d sql:"$db" -A -t "C,," -n "$CERT_NAME" -i "$CERT_PATH" 2>/dev/null || \\
        certutil -d "$db" -A -t "C,," -n "$CERT_NAME" -i "$CERT_PATH" 2>/dev/null || true
      else
        certutil -d sql:"$db" -D -n "$CERT_NAME" 2>/dev/null || \\
        certutil -d "$db" -D -n "$CERT_NAME" 2>/dev/null || true
      fi
    fi
  done
`

/** Añade o retira el certificado de las bases NSS del usuario; nunca falla. */
function updateNssDatabases(certPath: string | null, action: 'add' | 'delete'): Promise<void> {
  return new Promise(resolve => {
    execFile(
      '/bin/bash',
      ['-c', NSS_SCRIPT],
      { env: { ...process.env, CERT_NAME: NSS_CERT_NAME, CERT_PATH: certPath ?? '', ACTION: action } },
      () => resolve(),
    )
  })
}

// La huella SHA-1 del DER, en pares hexadecimales separados por dos puntos.
function getCertFingerprint(certPath: string): string {
  const pem = fs.readFileSync(certPath, 'utf-8')
  const der = Buffer.from(pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, ''), 'base64')
  const pairs = crypto.createHash('sha1').update(der).digest('hex').toUpperCase().match(/.{2}/g)
  if (!pairs) throw new Error(`Unable to compute certificate fingerprint for ${certPath}`)
  return pairs.join(':')
}

/**
 * `security find-certificate -Z` imprime la huella sin dos puntos; se
 * normalizan los dos lados antes de comparar.
 */
export function macCertOutputHasFingerprint(securityOutput: string, fingerprint: string): boolean {
  const normalize = (value: string) => value.replace(/:/g, '').toUpperCase()
  return normalize(securityOutput).includes(normalize(fingerprint))
}

/** La huella que `certutil -store` y `-delstore` aceptan como identidad. */
export function certutilThumbprint(certPath: string): string {
  return getCertFingerprint(certPath).replace(/:/g, '')
}

/** ¿Está este certificado en el almacén de confianza del sistema? */
export async function checkCertInstalled(certPath: string, deps?: CertTrustDeps): Promise<boolean> {
  try {
    switch (platform()) {
      case 'win32':
        await execFileText('certutil', ['-store', 'Root', certutilThumbprint(certPath)])
        return true
      case 'darwin': {
        const output = await execFileText('security', ['find-certificate', '-a', '-Z', MAC_SYSTEM_KEYCHAIN])
        return macCertOutputHasFingerprint(output, getCertFingerprint(certPath))
      }
      default: {
        const destFile = linuxDestFile(deps)
        if (!fs.existsSync(destFile)) return false
        return getCertFingerprint(certPath) === getCertFingerprint(destFile)
      }
    }
  } catch {
    return false
  }
}

/** Instala el certificado; si ya está, en Linux sólo repara su modo. */
export async function installCert(sudoPassword: string, certPath: string, deps?: CertTrustDeps): Promise<void> {
  if (!fs.existsSync(certPath)) throw new Error(`Certificate file not found: ${certPath}`)

  if (await checkCertInstalled(certPath, deps)) {
    // Un umask restrictivo al instalar pudo dejarlo en 0600, ilegible para
    // los clientes TLS sin root: se repara aunque la huella ya coincida.
    if (platform() !== 'win32' && platform() !== 'darwin') {
      await ensureSystemCertMode(linuxDestFile(deps), sudoPassword)
    }
    logForDebugging('[cert] Certificate already installed', { level: 'info' })
    return
  }

  if (isSystemTrustSkipped()) {
    logForDebugging('[cert] THYROX_MITM_SKIP_SYSTEM_TRUST=1 — skipping OS trust-store mutation', { level: 'info' })
    return
  }

  switch (platform()) {
    case 'win32':
      return installCertWindows(certPath, deps)
    case 'darwin':
      return installCertMac(sudoPassword, certPath)
    default:
      return installCertLinux(sudoPassword, certPath, deps)
  }
}

/** Por qué no se completó una instalación automática. */
export type CertInstallReason = 'canceled' | 'environment'

/** Los pasos para confiar en la CA a mano. */
export interface CertManualGuide {
  platform: NodeJS.Platform
  certPath: string
  downloadUrl: string
  steps: string[]
}

/** El desenlace de un intento de instalación; un fallo de entorno no lanza. */
export interface CertInstallResult {
  installed: boolean
  skipped: boolean
  reason?: CertInstallReason
  /** Mensaje ya saneado, sin traza. */
  message?: string
  manualGuide?: CertManualGuide
}

/**
 * Sólo una cancelación explícita del usuario es `canceled`; cualquier otro
 * fallo (sin almacén, sin sudo, sistema de sólo lectura, contenedor) es de
 * entorno y se resuelve instalando a mano.
 */
export function classifyCertInstallError(message: string): CertInstallReason {
  return /cancel+ed/i.test(message) ? 'canceled' : 'environment'
}

export function buildCertManualGuide(
  certPath: string,
  forPlatform: NodeJS.Platform = platform(),
  deps?: CertTrustDeps,
): CertManualGuide {
  let steps: string[]
  if (forPlatform === 'win32') {
    steps = [
      `certutil -addstore -f Root "${certPath}"`,
      'Or import it via certmgr.msc → Trusted Root Certification Authorities → Certificates → Import.',
    ]
  } else if (forPlatform === 'darwin') {
    steps = [`sudo security add-trusted-cert -d -r trustRoot -k ${MAC_SYSTEM_KEYCHAIN} "${certPath}"`]
  } else {
    const config = getLinuxCertConfig(deps)
    steps = [
      `sudo cp "${certPath}" ${config.dir}/${LINUX_CERT_NAME}`,
      `sudo ${config.cmd}`,
      `Container-friendly per-tool trust (no root needed): set NODE_EXTRA_CA_CERTS="${certPath}" (Node) or REQUESTS_CA_BUNDLE="${certPath}" (Python), or import "${certPath}" into your client's trust store.`,
    ]
  }
  return { platform: forPlatform, certPath, downloadUrl: pathToFileURL(certPath).href, steps }
}

/**
 * Intenta instalar y devuelve el desenlace en vez de lanzar: una cancelación
 * se informa como tal; cualquier otro fallo, como omisión con su guía manual,
 * para que el puente arranque igual.
 */
export async function installCertResult(
  sudoPassword: string,
  certPath: string,
  deps?: CertTrustDeps,
): Promise<CertInstallResult> {
  try {
    await installCert(sudoPassword, certPath, deps)
    return { installed: true, skipped: false }
  } catch (error) {
    const message = errorMessage(error)
    const reason = classifyCertInstallError(message)
    if (reason === 'canceled') return { installed: false, skipped: false, reason, message }
    return { installed: false, skipped: true, reason, message, manualGuide: buildCertManualGuide(certPath, platform(), deps) }
  }
}

/**
 * Instala la CA raíz persistida (`cert/rootCa.ts`). Ocupa el mismo lugar del
 * almacén que el certificado hoja anterior, así que lo sustituye.
 */
export async function installCaCert(
  sudoPassword: string,
  caCertPath: string,
  deps?: CertTrustDeps,
): Promise<CertInstallResult> {
  return installCertResult(sudoPassword, caCertPath, deps)
}

function installFailure(error: unknown): Error {
  return new Error(errorMessage(error).includes('canceled') ? 'User canceled authorization' : 'Certificate install failed')
}

async function installCertMac(sudoPassword: string, certPath: string): Promise<void> {
  try {
    await execFileWithPassword(
      'sudo',
      ['-S', 'security', 'add-trusted-cert', '-d', '-r', 'trustRoot', '-k', MAC_SYSTEM_KEYCHAIN, certPath],
      sudoPassword,
    )
    logForDebugging(`[cert] Installed certificate to system keychain: ${certPath}`, { level: 'info' })
  } catch (error) {
    throw installFailure(error)
  }
}

async function installCertLinux(sudoPassword: string, certPath: string, deps?: CertTrustDeps): Promise<void> {
  try {
    const config = getLinuxCertConfig(deps)
    const destFile = `${config.dir}/${LINUX_CERT_NAME}`
    await execFileWithPassword('sudo', ['-S', 'mkdir', '-p', config.dir], sudoPassword)
    await execFileWithPassword('sudo', ['-S', 'cp', certPath, destFile], sudoPassword)
    // `cp` hereda el umask; el certificado público se fuerza a 0644.
    await execFileWithPassword('sudo', ['-S', 'chmod', '0644', destFile], sudoPassword)
    await execFileWithPassword('sudo', ['-S', config.cmd], sudoPassword)
    await updateNssDatabases(certPath, 'add')
  } catch (error) {
    throw installFailure(error)
  }
}

/**
 * Deja el certificado del almacén legible por todos (0644). De mejor
 * esfuerzo: si no se puede leer o cambiar el modo, no se informa.
 */
export async function ensureSystemCertMode(destFile: string, sudoPassword: string): Promise<void> {
  try {
    const mode = fs.statSync(destFile).mode & 0o777
    if (mode !== 0o644) await execFileWithPassword('sudo', ['-S', 'chmod', '0644', destFile], sudoPassword)
  } catch {
    // La reparación del modo se omite; la próxima instalación la reintenta.
  }
}

async function installCertWindows(certPath: string, deps?: CertTrustDeps): Promise<void> {
  await elevate(deps)(`
    $certPath = ${quotePowerShell(certPath)};
    $proc = Start-Process certutil -ArgumentList @('-addstore','Root',$certPath) -Verb RunAs -Wait -PassThru;
    if ($proc.ExitCode -ne 0) { throw "certutil exited with code $($proc.ExitCode)" }
  `)
  logForDebugging('[cert] Installed certificate to Windows Root store', { level: 'info' })
}

/** Retira el certificado del almacén del sistema, si está. */
export async function uninstallCert(sudoPassword: string, certPath: string, deps?: CertTrustDeps): Promise<void> {
  if (!(await checkCertInstalled(certPath, deps))) {
    logForDebugging('[cert] Certificate not found in system store', { level: 'info' })
    return
  }
  if (isSystemTrustSkipped()) {
    logForDebugging('[cert] THYROX_MITM_SKIP_SYSTEM_TRUST=1 — skipping OS trust-store mutation', { level: 'info' })
    return
  }
  switch (platform()) {
    case 'win32':
      return uninstallCertWindows(certPath, deps)
    case 'darwin':
      return uninstallCertMac(sudoPassword, certPath)
    default:
      return uninstallCertLinux(sudoPassword, deps)
  }
}

async function uninstallCertMac(sudoPassword: string, certPath: string): Promise<void> {
  try {
    await execFileWithPassword(
      'sudo',
      ['-S', 'security', 'delete-certificate', '-Z', certutilThumbprint(certPath), MAC_SYSTEM_KEYCHAIN],
      sudoPassword,
    )
    logForDebugging('[cert] Uninstalled certificate from system keychain', { level: 'info' })
  } catch {
    throw new Error('Failed to uninstall certificate')
  }
}

async function uninstallCertLinux(sudoPassword: string, deps?: CertTrustDeps): Promise<void> {
  try {
    await updateNssDatabases(null, 'delete')
    const config = getLinuxCertConfig(deps)
    const destFile = `${config.dir}/${LINUX_CERT_NAME}`
    if (fs.existsSync(destFile)) await execFileWithPassword('sudo', ['-S', 'rm', '-f', destFile], sudoPassword)
    try {
      await execFileWithPassword('sudo', ['-S', config.cmd, '--fresh'], sudoPassword)
    } catch {
      await execFileWithPassword('sudo', ['-S', config.cmd], sudoPassword)
    }
  } catch {
    throw new Error('Failed to uninstall certificate')
  }
}

/** El guion elevado de `certutil -delstore` para esa huella. */
export function buildWindowsDelstoreScript(thumbprint: string): string {
  return `
    $proc = Start-Process certutil -ArgumentList @('-delstore','Root',${quotePowerShell(thumbprint)}) -Verb RunAs -Wait -PassThru;
    if ($proc.ExitCode -ne 0) { throw "certutil exited with code $($proc.ExitCode)" }
  `
}

async function uninstallCertWindows(certPath: string, deps?: CertTrustDeps): Promise<void> {
  await elevate(deps)(buildWindowsDelstoreScript(certutilThumbprint(certPath)))
  logForDebugging('[cert] Uninstalled certificate from Windows Root store', { level: 'info' })
}
