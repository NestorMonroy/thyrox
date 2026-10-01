/**
 * Dónde escucha la API que sirve `thyrox mitm serve`: su URL queda en el
 * directorio de datos del MITM mientras corre, para que los verbos que
 * necesitan al dueño del servidor MITM la encuentren.
 */
import fs from 'node:fs'
import path from 'node:path'

const API_URL_FILE = 'api.url'

export function publishApiUrl(dataDir: string, url: string): void {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(path.join(dataDir, API_URL_FILE), `${url}\n`, { mode: 0o600 })
}

export function readApiUrl(dataDir: string): string | null {
  try {
    return fs.readFileSync(path.join(dataDir, API_URL_FILE), 'utf8').trim() || null
  } catch {
    return null
  }
}

export function withdrawApiUrl(dataDir: string): void {
  fs.rmSync(path.join(dataDir, API_URL_FILE), { force: true })
}
