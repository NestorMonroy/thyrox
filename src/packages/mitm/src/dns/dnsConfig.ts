/**
 * Las entradas del archivo hosts que desvían los hosts de un agente al MITM
 * local: una línea IPv4 y una IPv6 por host, porque los sistemas modernos
 * suelen resolver IPv6 primero. Añadir y retirar son idempotentes, y ningún
 * valor viaja interpolado en un comando: el archivo y el host van como
 * argumentos, y las líneas nuevas como stdin de `tee`.
 *
 * Porte de `omniroute: src/mitm/dns/dnsConfig.ts` (MIT). Tres diferencias:
 *  - el `isSudoAvailable` de la referencia (que en Windows respondía `true`)
 *    no se duplica: se usa el de `systemCommands`, y en Windows la pregunta no
 *    llega a hacerse porque allí eleva UAC;
 *  - la bandera para no escribir es `THYROX_MITM_SKIP_DNS_WRITE`, y sólo el
 *    valor exacto `1` la activa, como en la referencia;
 *  - el archivo hosts se puede inyectar (`hostsFile`), para medir la
 *    invocación real en vez de leer el fuente.
 *
 * El filtro de retirada corre como `<runtime> -e <guion> <archivo> <host>`:
 * medido, `bun -e` deja el primer argumento extra en `process.argv[1]`, igual
 * que `node -e`, así que el guion vale para los dos.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { logForDebugging } from '@thyrox/local-observability/debug.js'

import {
  execFileWithPassword,
  isRoot,
  isSudoAvailable,
  quotePowerShell,
  runElevatedPowerShell,
} from '../systemCommands.ts'
import { ALL_TARGETS } from '../targets/index.ts'

// Los hosts de antigravity: el conjunto por defecto cuando no se nombra agente.
const ANTIGRAVITY_HOSTS = [
  'daily-cloudcode-pa.googleapis.com',
  'cloudcode-pa.googleapis.com',
  'daily-cloudcode-pa.sandbox.googleapis.com',
  'autopush-cloudcode-pa.sandbox.googleapis.com',
]

export function resolveHostsForAgent(agentId?: string): string[] {
  if (!agentId) return ANTIGRAVITY_HOSTS
  const target = ALL_TARGETS.find(t => t.id === agentId)
  return target?.hosts ?? ANTIGRAVITY_HOSTS
}

// La plataforma se lee al llamar: una lectura en la carga del módulo la fija
// un empaquetador a la de la máquina que construye.
function isWin32(): boolean {
  return os.platform() === 'win32'
}

function defaultHostsFile(): string {
  if (isWin32()) {
    return path.win32.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts')
  }
  return '/etc/hosts'
}

export interface DnsHostsFileOption {
  hostsFile?: string
}

export interface DnsCommandDependencies extends DnsHostsFileOption {
  execFileWithPassword?: typeof execFileWithPassword
  runElevatedPowerShell?: typeof runElevatedPowerShell
}

function resolveCommandDependencies(deps?: DnsCommandDependencies) {
  return {
    hostsFile: deps?.hostsFile ?? defaultHostsFile(),
    execFileWithPassword: deps?.execFileWithPassword ?? execFileWithPassword,
    runElevatedPowerShell: deps?.runElevatedPowerShell ?? runElevatedPowerShell,
  }
}

function isDnsWriteSkipped(): boolean {
  return process.env.THYROX_MITM_SKIP_DNS_WRITE === '1'
}

/**
 * ¿Se puede elevar sin pedir contraseña? En Windows eleva UAC; siendo root o
 * sin `sudo` instalado no hay a quién pedirla; y `sudo -n true` sale 0 con la
 * credencial en caché o con NOPASSWD.
 */
export function canRunSudoWithoutPassword(): boolean {
  if (isWin32()) return true
  if (isRoot()) return true
  if (!isSudoAvailable()) return true
  try {
    execFileSync('sudo', ['-n', 'true'], { stdio: 'ignore', windowsHide: true, env: process.env })
    return true
  } catch {
    return false
  }
}

/** ¿Hay que pedirle la contraseña de sudo al usuario antes de elevar? */
export function isSudoPasswordRequired(): boolean {
  return !isWin32() && isSudoAvailable() && !canRunSudoWithoutPassword()
}

function dnsLines(hostname: string): string[] {
  return [`127.0.0.1 ${hostname}`, `::1 ${hostname}`]
}

function readHostsFile(hostsFile: string): string {
  try {
    return fs.readFileSync(hostsFile, 'utf8')
  } catch {
    return ''
  }
}

// Una línea cuenta si su primera columna es la dirección y el host aparece
// entre sus nombres.
function hasLine(existing: string[], entry: string): boolean {
  const [ip, host] = entry.split(/\s+/)
  return existing.some(line => {
    const parts = line.trim().split(/\s+/).filter(Boolean)
    return parts.length >= 2 && parts[0] === ip && parts.includes(host!)
  })
}

function hasHostEntry(hostsContent: string, hostname: string): boolean {
  const lines = hostsContent.split(/\r?\n/)
  return dnsLines(hostname).every(entry => hasLine(lines, entry))
}

/**
 * Añade las líneas que falten para cada host. En Windows van todas en una
 * sola invocación elevada, para que el usuario vea un único aviso de UAC.
 */
export async function addDNSEntries(
  hosts: string[],
  sudoPassword: string,
  deps?: DnsCommandDependencies,
): Promise<void> {
  if (isDnsWriteSkipped()) return
  const commands = resolveCommandDependencies(deps)
  const existing = readHostsFile(commands.hostsFile).split(/\r?\n/)
  const missingEntries = hosts.flatMap(dnsLines).filter(entry => !hasLine(existing, entry))
  if (missingEntries.length === 0) return

  if (isWin32()) {
    const psEntries = missingEntries.map(e => quotePowerShell(e)).join(', ')
    await commands.runElevatedPowerShell(
      'Add-Content -LiteralPath ' + quotePowerShell(commands.hostsFile) + ' -Value ' + psEntries,
    )
  } else {
    const data = missingEntries.map(e => `${e}\n`).join('')
    await commands.execFileWithPassword('sudo', ['-S', 'tee', '-a', commands.hostsFile], sudoPassword, data)
  }
  for (const entry of missingEntries) logForDebugging(`[DNS] Added entry: ${entry}`, { level: 'info' })
}

// Guion de retirada: toma el archivo y el host de `process.argv`, así que
// ningún valor se interpola en su cuerpo.
const REMOVE_HOSTS_ENTRY_SCRIPT = `
const fs = require("fs");
const filePath = process.argv[1];
const targetHost = process.argv[2];
const content = fs.readFileSync(filePath, "utf8");
const filtered = content.split(/\\r?\\n/).filter((line) => {
  const parts = line.trim().split(/\\s+/).filter(Boolean);
  return !(parts.length >= 2 && parts.includes(targetHost));
});
fs.writeFileSync(filePath, filtered.join("\\n").replace(/\\n*$/, "\\n"));
`

/**
 * Retira las líneas de cada host presente; los ausentes se saltan. En Windows
 * se filtran todos en una sola invocación elevada.
 */
export async function removeDNSEntries(
  hosts: string[],
  sudoPassword: string,
  deps?: DnsCommandDependencies,
): Promise<void> {
  if (isDnsWriteSkipped()) return
  const commands = resolveCommandDependencies(deps)
  const hostsContent = readHostsFile(commands.hostsFile)
  const presentHosts = hosts.filter(h => hasHostEntry(hostsContent, h))
  if (presentHosts.length === 0) return

  if (isWin32()) {
    const psTargets = presentHosts.map(h => quotePowerShell(h)).join(', ')
    const script =
      '$hostsFile = ' +
      quotePowerShell(commands.hostsFile) +
      ';\n          $targetHosts = @(' +
      psTargets +
      ');\n' +
      '          $lines = Get-Content -LiteralPath $hostsFile;\n' +
      '          $filtered = $lines | Where-Object {\n' +
      "            $part = ($_ -split '\\s+') | Where-Object { $_ };\n" +
      '            -not ($part.Length -ge 2 -and ($targetHosts -contains $part[1]))\n' +
      '          };\n' +
      '          Set-Content -LiteralPath $hostsFile -Value $filtered;\n        '
    await commands.runElevatedPowerShell(script)
  } else {
    for (const hostname of presentHosts) {
      await commands.execFileWithPassword(
        'sudo',
        ['-S', process.execPath, '-e', REMOVE_HOSTS_ENTRY_SCRIPT, commands.hostsFile, hostname],
        sudoPassword,
      )
    }
  }
  for (const hostname of presentHosts) logForDebugging(`[DNS] Removed entries for ${hostname}`, { level: 'info' })
}

/** ¿Están las entradas de los hosts de antigravity? */
export function checkDNSEntry(options?: DnsHostsFileOption): boolean {
  return checkDNSEntryForAgent(undefined, options)
}

/** ¿Están TODAS las entradas de los hosts de este agente? Sin agente, antigravity. */
export function checkDNSEntryForAgent(agentId?: string, options?: DnsHostsFileOption): boolean {
  const hostsContent = readHostsFile(options?.hostsFile ?? defaultHostsFile())
  return resolveHostsForAgent(agentId).every(h => hasHostEntry(hostsContent, h))
}

export async function addDNSEntry(sudoPassword: string, agentId?: string, deps?: DnsCommandDependencies): Promise<void> {
  await addDNSEntries(resolveHostsForAgent(agentId), sudoPassword, deps)
}

export async function removeDNSEntry(
  sudoPassword: string,
  agentId?: string,
  deps?: DnsCommandDependencies,
): Promise<void> {
  await removeDNSEntries(resolveHostsForAgent(agentId), sudoPassword, deps)
}

/**
 * Vacía la caché del resolvedor de Windows tras editar el hosts: a diferencia
 * de los POSIX, que releen el archivo en cada consulta, Windows conserva la
 * resolución hasta vaciarla. `ipconfig /flushdns` no pide elevación. Es una
 * cortesía: un fallo no se propaga, porque la edición del archivo ya se hizo.
 */
export function flushWindowsDnsCache(): void {
  if (!isWin32()) return
  try {
    execFileSync('ipconfig', ['/flushdns'], { stdio: 'ignore', windowsHide: true, timeout: 5000 })
  } catch {
    // Cortesía: no se bloquea a quien llama.
  }
}
