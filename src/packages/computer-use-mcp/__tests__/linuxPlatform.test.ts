/**
 * Capturas de la plataforma Linux del camino heredado
 * (`legacy/platforms/linux.ts`): `scrot` captura en PNG y `convert` (o
 * `ffmpeg`) lo pasa a JPEG, porque el llamador declara `image/jpeg`.
 *
 * Nacieron en rojo por dos defectos:
 * - tres rutas FIJAS en `/tmp` (`cu-screenshot-tmp.png`, `cu-screenshot.jpg`,
 *   `cu-window-capture.jpg`): ignoraban TMPDIR, las compartían dos capturas
 *   simultáneas, y una conversión fallida devolvía el JPEG ANTERIOR;
 * - `return pngToJpegBase64(...)` sin `await` dentro del `try`: si la
 *   conversión rechazaba, el rechazo escapaba del `catch` y el llamador
 *   recibía una excepción en vez de una captura vacía.
 * La forma correcta ya estaba en el árbol: el backend de macOS
 * (`computer-use-swift/src/backends/darwin.ts`) captura en archivos propios
 * bajo `tmpdir()` y los borra en un `finally`.
 *
 * Ninguna de estas CLI está en esta máquina. Cada operación corre en un proceso
 * propio (`fixtures/drive-linux-platform.ts`) con CLI falsas delante en el PATH;
 * `which` también es falso, para decidir qué conversor «está instalado».
 *
 * Restricción técnica declarada: la plataforma se prueba en Linux; en otra se
 * saltan estos casos con esa razón.
 *
 * Control de anulación, medido mutando la plataforma y restaurándola: sin el
 * `await` cae el 4, y con el JPEG en un nombre fijo también el 4; sin borrar
 * el PNG caen 1 y 2; sin borrar la captura de ventana, el 5; con las rutas en
 * `/tmp`, 1 y 5.
 */
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const onLinux = process.platform === 'linux'
const work = mkdtempSync(join(tmpdir(), 'cu-mcp-linux-'))
const bin = join(work, 'bin')
const childTmp = join(work, 'tmp')
const calls = join(work, 'calls')
const DRIVER = join(import.meta.dir, 'fixtures', 'drive-linux-platform.ts')
afterAll(() => rmSync(work, { recursive: true, force: true }))

function fake(name: string, body = ''): void {
  writeFileSync(join(bin, name),
    `#!/bin/sh\n(IFS='\t'; printf '%s\\t%s\\n' '${name}' "$*") >> '${calls}'\n${body}\n`)
  chmodSync(join(bin, name), 0o755)
}

function installed(...tools: string[]): void {
  fake('which', `case "$1" in ${tools.length ? tools.join('|') : '__ninguna__'}) exit 0 ;; *) exit 1 ;; esac`)
}

function recorded(name: string): string[][] {
  return existsSync(calls)
    ? readFileSync(calls, 'utf8').trim().split('\n').filter(Boolean).map(l => l.split('\t'))
        .filter(([cli]) => cli === name)
    : []
}

function drive(path: string, ...args: unknown[]): unknown {
  const child = Bun.spawnSync(['bun', DRIVER, path, JSON.stringify(args)], {
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TMPDIR: childTmp },
  })
  if (child.exitCode !== 0) throw new Error(child.stderr.toString())
  return JSON.parse(child.stdout.toString())
}

const b64 = (text: string) => Buffer.from(text).toString('base64')
/** Escribe `$2` en el último argumento: la salida de scrot/convert/ffmpeg/import. */
const WRITE_LAST = (content: string) => `for a in "$@"; do last="$a"; done; printf '${content}' > "$last"`

beforeEach(() => {
  rmSync(work, { recursive: true, force: true })
  for (const dir of [bin, childTmp]) mkdirSync(dir, { recursive: true })
  installed()
  fake('xrandr', "printf 'eDP-1 connected primary 2560x1440+0+0 (normal)\\n'")
  fake('scrot', WRITE_LAST('PNG'))
})

describe.skipIf(!onLinux)('computer-use-mcp — capturas de la plataforma Linux', () => {
  test('1. con convert, la captura sale en JPEG, bajo TMPDIR, y no queda nada en disco', () => {
    installed('convert')
    fake('convert', WRITE_LAST('JPG'))
    const shot = drive('screenshot.captureScreen') as { base64: string }
    expect(shot.base64).toBe(b64('JPG'))
    const [scrot] = recorded('scrot')
    const [convert] = recorded('convert')
    expect(scrot![2]!.startsWith(childTmp)).toBe(true)
    expect(convert!.slice(2, 4)).toEqual(['-quality', '75'])
    expect(convert![4]!.startsWith(childTmp)).toBe(true)
    expect(readdirSync(childTmp)).toEqual([])
  })

  test('2. sin convert, ffmpeg; sin ninguno, el PNG tal cual', () => {
    installed('ffmpeg')
    fake('ffmpeg', WRITE_LAST('FFJPG'))
    expect((drive('screenshot.captureScreen') as { base64: string }).base64).toBe(b64('FFJPG'))
    installed()
    expect((drive('screenshot.captureScreen') as { base64: string }).base64).toBe(b64('PNG'))
    expect(readdirSync(childTmp)).toEqual([])
  })

  test('3. una región pasa x,y,w,h y devuelve ese tamaño', () => {
    installed('convert')
    fake('convert', WRITE_LAST('JPG'))
    expect(drive('screenshot.captureRegion', 10, 20, 300, 200)).toEqual({ base64: b64('JPG'), width: 300, height: 200 })
    expect(recorded('scrot')[0]!.slice(1, 3)).toEqual(['-a', '10,20,300,200'])
  })

  test('4. si la conversión no escribe, la captura es vacía: ni excepción ni la anterior', () => {
    installed('convert')
    fake('convert', WRITE_LAST('JPG'))
    drive('screenshot.captureScreen')
    writeFileSync(join(childTmp, 'cu-screenshot.jpg'), 'ANTERIOR')
    fake('convert', 'exit 1')
    expect(drive('screenshot.captureScreen')).toEqual({ base64: '', width: 0, height: 0 })
  })

  test('5. una ventana se captura con import bajo TMPDIR, con el tamaño de su geometría', () => {
    installed('import')
    fake('import', WRITE_LAST('WIN'))
    fake('xdotool', "printf 'WINDOW=77\\nX=0\\nY=0\\nWIDTH=640\\nHEIGHT=480\\n'")
    expect(drive('screenshot.captureWindow', '77')).toEqual({ base64: b64('WIN'), width: 640, height: 480 })
    const [call] = recorded('import')
    expect(call!.slice(1, 5)).toEqual(['-window', '77', '-quality', '75'])
    expect(call![5]!.startsWith(childTmp)).toBe(true)
    expect(readdirSync(childTmp)).toEqual([])
  })

  test('6. sin import no hay captura de ventana', () => {
    expect(drive('screenshot.captureWindow', '77')).toBeNull()
  })
})
