/**
 * El búfer circular que guarda la salida reciente de un PTY, acotado en BYTES.
 *
 * Se dice «acotado en BYTES», no «acotado» a secas: todo búfer circular es
 * acotado por definición —ésa es su propiedad definitoria, no lo que
 * distingue a éste—, y lo informativo es la UNIDAD de la cota. Y «búfer
 * circular» y no «anillo»: el segundo es el significante sin el significado,
 * porque a secas nombra también un anillo de red o uno algebraico. El
 * identificador se queda en inglés (`PtyRing`, `createRing`), que es como lo
 * nombra el código.
 *
 * Su razón de ser es el reenganche: cuando un cliente nuevo se ata a un
 * trabajo en curso, el anfitrión le reproduce lo que el búfer guarda para que
 * alcance el estado actual sin haber estado presente. Por eso el tope va en
 * BYTES y no en número de trozos — lo que acota el coste de la reproducción es
 * cuánto se manda, no en cuántas piezas venía.
 *
 * Adaptación del patrón de `ccnmt: packages/cli/src/bg/ptyRing.ts`. NO es
 * copia de su texto: ccnmt declara `"license": "UNLICENSED"`, así que lo que
 * se porta es el mecanismo y el contrato (#207).
 *
 * Dos invariantes que el tope NO puede romper:
 *
 *  1. **Nunca se queda vacío.** Un trozo que por sí solo excede el tope se
 *     conserva entero. Vaciar el búfer para respetar el tope daría un
 *     reenganche mudo, que es peor que uno largo.
 *  2. **La cabeza empieza en un punto de código válido.** La salida de un PTY
 *     no viene alineada, así que al tirar un trozo el siguiente puede
 *     arrancar a mitad de un carácter. Se recortan hasta 3 bytes de
 *     continuación (`10xxxxxx`) — el máximo que UTF-8 admite tras un líder de
 *     cuatro bytes.
 *
 * Rendimiento: el desalojo NO reasigna el arreglo. Un cursor `head` marca el
 * prefijo muerto y la compactación real ocurre cuando ese prefijo llega a la
 * mitad de la lista, lo que deja el trabajo amortizado en O(1) por empuje. Es
 * la diferencia entre un `shift()` por byte desalojado y un `splice` cada N.
 */

export interface PtyRing {
  /** Los trozos vivos, en orden de llegada. Leerlos compacta el prefijo muerto. */
  readonly chunks: Buffer[]
  /** Añade un trozo y desaloja los más antiguos hasta volver bajo el tope. */
  push(chunk: Buffer): void
}

/** Cuántos bytes de continuación UTF-8 puede haber tras un líder de 4 bytes. */
const MAX_CONTINUATION_BYTES = 3

/** ¿Es `byte` una continuación UTF-8 (`10xxxxxx`)? */
function isContinuation(byte: number): boolean {
  return (byte & 0xc0) === 0x80
}

/**
 * Un búfer circular con tope en bytes. 256 KiB por defecto — el mismo orden de
 * magnitud que la referencia, y suficiente para que un reenganche recupere
 * varias pantallas de salida sin volverse un volcado.
 */
export function createRing(cap: number): PtyRing {
  const list: Buffer[] = []
  let head = 0
  let totalBytes = 0

  function compact(): void {
    if (head > 0) {
      list.splice(0, head)
      head = 0
    }
  }

  /**
   * Recorta de la cabeza los bytes de continuación que quedaron huérfanos al
   * desalojar. Avanza de trozo si uno se agota entero, y para al toparse con
   * un byte que ya inicia un punto de código.
   */
  function trimOrphanContinuations(): void {
    let stripped = 0
    while (stripped < MAX_CONTINUATION_BYTES) {
      const next = list[head]
      if (!next) break
      let n = 0
      while (stripped + n < MAX_CONTINUATION_BYTES && n < next.length && isContinuation(next[n]!)) {
        n++
      }
      if (n > 0) {
        list[head] = next.subarray(n)
        totalBytes -= n
        stripped += n
      }
      // Se avanza sólo si el trozo se agotó Y no es el último: el invariante 1
      // manda por encima del saneo.
      if (list[head]!.length > 0 || list.length - head === 1) break
      head++
    }
  }

  return {
    get chunks(): Buffer[] {
      compact()
      return list
    },
    push(chunk: Buffer): void {
      list.push(chunk)
      totalBytes += chunk.length
      // `list.length - head > 1` es el invariante 1: se desaloja mientras
      // quede más de un trozo vivo, nunca el último.
      while (totalBytes > cap && list.length - head > 1) {
        totalBytes -= list[head]!.length
        head++
        trimOrphanContinuations()
      }
      if (head >= list.length - head) compact()
    },
  }
}
