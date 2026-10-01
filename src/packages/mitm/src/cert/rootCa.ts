/**
 * La CA raíz local del MITM, persistida en disco: con ella el servidor emite
 * una hoja por host para cada host de los destinos, sin volver a pedir al
 * almacen de confianza del sistema en cada arranque. La criptografía es la de
 * `generateMitmCa()` (`../dynamicCert.ts`); este módulo sólo añade la
 * persistencia: cargar si existe, generar una vez si no, y la clave privada
 * con permisos de sólo su dueño.
 *
 * Porte de `omniroute: src/mitm/cert/rootCa.ts` (MIT). El directorio de los
 * certificados es el de datos del MITM tal cual: la referencia cuelga un
 * `mitm/` de su directorio de aplicación, y aquí `resolveMitmDataDir()` ya es
 * ese `mitm/`.
 */
import fs from 'node:fs'
import path from 'node:path'

import { resolveMitmDataDir } from '../dataDir.ts'
import { type CaPair, generateMitmCa } from '../dynamicCert.ts'

export interface MitmCaPair extends CaPair {
  keyPath: string
  certPath: string
}

const CA_KEY_FILE = 'ca.key'
const CA_CERT_FILE = 'ca.crt'

/** El directorio de la CA (y de la hoja estática anterior). */
export function resolveMitmCertDir(): string {
  return resolveMitmDataDir()
}

function caPaths(certDir: string): { keyPath: string; certPath: string } {
  return {
    keyPath: path.join(certDir, CA_KEY_FILE),
    certPath: path.join(certDir, CA_CERT_FILE),
  }
}

/**
 * Carga la CA si `ca.key` y `ca.crt` existen; si no, genera una y la guarda.
 * La clave queda en `0o600` en cuanto se escribe: firma una hoja de confianza
 * para cualquier host, así que nadie más que su dueño la lee.
 *
 * Idempotente entre reinicios: una vez escrita devuelve los mismos bytes, y
 * la instalación en el almacen de confianza se hace una vez por máquina.
 */
export async function loadOrCreateMitmCa(certDir: string = resolveMitmCertDir()): Promise<MitmCaPair> {
  const { keyPath, certPath } = caPaths(certDir)
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath, 'utf-8'),
      cert: fs.readFileSync(certPath, 'utf-8'),
      keyPath,
      certPath,
    }
  }
  const ca = await generateMitmCa()
  if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true })
  fs.writeFileSync(keyPath, ca.key)
  fs.writeFileSync(certPath, ca.cert)
  // Windows no aplica los bits de chmod POSIX: allí no hace nada.
  fs.chmodSync(keyPath, 0o600)
  return { key: ca.key, cert: ca.cert, keyPath, certPath }
}
