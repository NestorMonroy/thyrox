/**
 * CA dinamica por SNI: emite una hoja por host a demanda y la cachea como
 * `tls.SecureContext`.
 *
 * Porte de `omniroute: src/mitm/tproxy/dynamicCert.ts` (119 lineas), que a su
 * vez lo construyo para su modo de captura TPROXY. El mecanismo viaja verbatim
 * —`selfsigned` v5 con `options.ca`, que es CA-signing real— porque este arbol
 * podia traer la dependencia: no hay divergencia que declarar en la emision.
 *
 * POR QUE UNA CA Y NO UN AUTOFIRMADO ESTATICO. El certificado estatico de la
 * fuente (`cert/generate.ts`) le funciona porque su AgentBridge falsea el DNS
 * de un conjunto FIJO de hosts conocidos. Un inspector que intercepta hosts
 * ARBITRARIOS no puede saber de antemano que SNI le van a pedir, asi que tiene
 * que emitir la hoja en el momento. Esa es toda la razon de ser del modulo.
 *
 * DIVERGENCIA DE SITIO, declarada. La fuente parte el subsistema en dos
 * —`mitm/cert/` para el estatico heredado y `mitm/tproxy/` para el dinamico—
 * porque conserva los dos. Aqui llega SOLO el dinamico, asi que el nivel
 * `tproxy/` no tendria hermano con el que contrastar y el modulo vive en
 * `mitm/` a secas. Si algun dia llega la capa de socket transparente, ese es
 * el momento de reintroducir el nivel, no antes.
 *
 * LO QUE ESTE MODULO NO CIERRA, con su sucesor. Emite y cachea; no instala la
 * CA en el almacen de confianza del sistema ni levanta ningun listener. La
 * fuente tiene las dos piezas (`cert/install.ts`, `tproxy/tlsCapture.ts`) y
 * quedan fuera de este escalon — TASK-THYROX-0213.
 *
 * NOTA DE SEGURIDAD, heredada de la fuente y no diluida: una CA de confianza
 * que firma cualquier host es una capacidad poderosa. Su clave privada no sale
 * de la maquina, y el modulo por si solo no la hace confiable para nadie —
 * instalarla en el almacen del sistema es un acto aparte y explicito.
 */
import tls from 'node:tls'

export interface CaPair {
  /** Clave privada en PEM. */
  key: string
  /** Certificado en PEM. */
  cert: string
}

export interface LeafPair {
  /** Clave privada de la hoja, en PEM. */
  key: string
  /** Bundle PEM: la hoja seguida del certificado de la CA (la cadena). */
  cert: string
}

/** Genera una CA local de vida larga (`basicConstraints` CA, `keyCertSign`). */
export async function generateMitmCa(name = 'THYROX MITM CA'): Promise<CaPair> {
  const { default: selfsigned } = await import('selfsigned')
  const notAfter = new Date()
  notAfter.setFullYear(notAfter.getFullYear() + 10)
  const pems = await selfsigned.generate([{ name: 'commonName', value: name }], {
    keySize: 2048,
    algorithm: 'sha256',
    notAfterDate: notAfter,
    extensions: [
      { name: 'basicConstraints', cA: true, critical: true },
      { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
    ],
  })
  return { key: pems.private, cert: pems.cert }
}

/**
 * Emite una hoja para `hostname`, firmada por `ca`. Devuelve la clave de la
 * hoja mas un bundle (hoja + CA) para que el cliente pueda armar la cadena de
 * confianza.
 */
export async function issueLeafCert(hostname: string, ca: CaPair): Promise<LeafPair> {
  const { default: selfsigned } = await import('selfsigned')
  const notAfter = new Date()
  notAfter.setFullYear(notAfter.getFullYear() + 1)
  const pems = await selfsigned.generate([{ name: 'commonName', value: hostname }], {
    keySize: 2048,
    algorithm: 'sha256',
    notAfterDate: notAfter,
    extensions: [{ name: 'subjectAltName', altNames: [{ type: 2, value: hostname }] }],
    ca: { key: ca.key, cert: ca.cert },
  })
  return { key: pems.private, cert: `${pems.cert.trim()}\n${ca.cert.trim()}\n` }
}

/**
 * Crea la CA de forma perezosa y emite/cachea un `tls.SecureContext` por host
 * SNI.
 *
 * Se le pasa una `existingCa` —leida de disco, por ejemplo— para que la CA
 * sobreviva a los reinicios: si cambiara en cada arranque habria que volver a
 * instalarla en el almacen de confianza cada vez.
 */
export class DynamicCertStore {
  private readonly caName: string
  private caPromise: Promise<CaPair> | null = null
  private readonly contexts = new Map<string, tls.SecureContext>()

  constructor(caName = 'THYROX MITM CA', existingCa?: CaPair) {
    this.caName = caName
    if (existingCa) this.caPromise = Promise.resolve(existingCa)
  }

  private getCa(): Promise<CaPair> {
    if (!this.caPromise) this.caPromise = generateMitmCa(this.caName)
    return this.caPromise
  }

  /** El PEM del certificado de la CA — es el que se instala en el almacen. */
  async getCaCertPem(): Promise<string> {
    return (await this.getCa()).cert
  }

  /** El `SecureContext` de un host SNI, creandolo y cacheandolo al primer uso. */
  async getSecureContext(hostname: string): Promise<tls.SecureContext> {
    const cached = this.contexts.get(hostname)
    if (cached) return cached
    const ca = await this.getCa()
    const leaf = await issueLeafCert(hostname, ca)
    const context = tls.createSecureContext({ key: leaf.key, cert: leaf.cert })
    this.contexts.set(hostname, context)
    return context
  }

  /** Cuantos hosts distintos tienen contexto cacheado. */
  get size(): number {
    return this.contexts.size
  }

  /** Un `SNICallback` para `tls.createServer`/`tls.TLSSocket` (`{ SNICallback }`). */
  createSNICallback(): (
    servername: string,
    callback: (error: Error | null, context?: tls.SecureContext) => void,
  ) => void {
    return (servername, callback) => {
      this.getSecureContext(servername)
        .then((context) => callback(null, context))
        .catch((error) => callback(error instanceof Error ? error : new Error(String(error))))
    }
  }
}
