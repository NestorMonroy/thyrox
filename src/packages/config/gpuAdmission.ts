/**
 * La cara .ts de la admisión por VRAM.
 *
 * La implementación es UNA, `src/session/gpu_monitor.py`: el registro de VRAM
 * comprometida, la medida, la decisión y la reserva bajo `shared_lock`. Esta
 * cara no la reimplementa —dos implementaciones del mismo protocolo derivan
 * con el tiempo, y la carrera que cierra sólo se cierra si todas las lenguas
 * reservan en el mismo registro con el mismo criterio—. Lanza la interfaz de
 * `bin/gpu_monitor`, igual que `headless-pool.sh`, y traduce su código de
 * salida:
 *
 *   0 -> 'admitted' (reservó, o el requisito `none` no mira la VRAM)
 *   3 -> 'timeout' (venció el plazo sin sitio)
 *   4 -> 'cpu-fallback' (un `optional` sin telemetría o sin sitio: la ruta
 *        CPU que el trabajo declaró, decidida antes de ejecutarlo)
 *   cualquier otro -> excepción con el stderr: no pudo medir, y eso no es
 *   un «no admitido». El 2 es un `required` sin telemetría: `admit` rehúsa
 *   al instante, sin esperar el plazo y sin publicar cifra.
 *
 * El requisito es propiedad declarada del trabajo; sin declararlo es
 * `required`, el contrato anterior a que existiera.
 */
import { spawn } from 'node:child_process'
import { join } from 'node:path'

export type VramAdmission = 'admitted' | 'timeout' | 'cpu-fallback'

export type GpuRequirement = 'none' | 'optional' | 'required'

export type AdmitVramOptions = {
  needMib: number
  ledger: string
  ownerPid: number
  nvidiaSmi?: string
  requirement?: GpuRequirement
  timeoutS?: number
  intervalS?: number
  thyroxRoot?: string
}

export type ReleaseVramOptions = { ledger: string; ownerPid: number; thyroxRoot?: string }

const EXIT_ADMITTED = 0
const EXIT_TIMEOUT = 3
const EXIT_CPU_FALLBACK = 4

/** La raíz de thyrox: la declarada, o la del árbol donde vive este módulo. */
function gpuMonitorBin(thyroxRoot?: string): string {
  const root = thyroxRoot ?? process.env.THYROX_ROOT ?? join(import.meta.dir, '../../..')
  return join(root, 'bin/gpu_monitor')
}

function runGpuMonitor(bin: string, args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [bin, ...args], { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('close', code => resolve({ code: code ?? -1, stderr }))
  })
}

function failure(bin: string, command: string, code: number, stderr: string): Error {
  return new Error(`gpu_monitor ${command} salió ${code} (${bin}): ${stderr.trim() || 'sin stderr'}`)
}

/** Reserva `needMib` en el registro compartido; espera hasta el plazo. */
export async function admitVram(options: AdmitVramOptions): Promise<VramAdmission> {
  const bin = gpuMonitorBin(options.thyroxRoot)
  const args = ['admit', String(options.needMib), '--ledger', options.ledger,
    '--owner', String(options.ownerPid), '--nvidia-smi', options.nvidiaSmi ?? 'nvidia-smi']
  if (options.requirement !== undefined) args.push('--requirement', options.requirement)
  if (options.timeoutS !== undefined) args.push('--timeout', String(options.timeoutS))
  if (options.intervalS !== undefined) args.push('--interval', String(options.intervalS))
  const { code, stderr } = await runGpuMonitor(bin, args)
  if (code === EXIT_ADMITTED) return 'admitted'
  if (code === EXIT_TIMEOUT) return 'timeout'
  if (code === EXIT_CPU_FALLBACK) return 'cpu-fallback'
  throw failure(bin, 'admit', code, stderr)
}

/** Suelta la reserva de `ownerPid`; hay que llamarla al terminar el trabajo. */
export async function releaseVram(options: ReleaseVramOptions): Promise<void> {
  const bin = gpuMonitorBin(options.thyroxRoot)
  const { code, stderr } = await runGpuMonitor(bin,
    ['release', '--ledger', options.ledger, '--owner', String(options.ownerPid)])
  if (code !== 0) throw failure(bin, 'release', code, stderr)
}
