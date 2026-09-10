/**
 * Puerto de `ccnmt: packages/output/src/buffers/circular-buffer.ts`
 * (verbatim — sin imports en la fuente). Un buffer circular de tamano fijo
 * que desaloja el item mas antiguo cuando se llena. Util para mantener una
 * ventana movil de datos.
 */
export class CircularBuffer<T> {
  private buffer: T[]
  private head = 0
  private size = 0

  constructor(private capacity: number) {
    this.buffer = new Array(capacity)
  }

  /**
   * Agrega un item al buffer. Si el buffer esta lleno, desaloja el item
   * mas antiguo.
   */
  add(item: T): void {
    this.buffer[this.head] = item
    this.head = (this.head + 1) % this.capacity
    if (this.size < this.capacity) {
      this.size++
    }
  }

  /**
   * Agrega varios items al buffer de una vez.
   */
  addAll(items: T[]): void {
    for (const item of items) {
      this.add(item)
    }
  }

  /**
   * Devuelve los N items mas recientes del buffer. Devuelve menos si el
   * buffer tiene menos de N items.
   */
  getRecent(count: number): T[] {
    const result: T[] = []
    const start = this.size < this.capacity ? 0 : this.head
    const available = Math.min(count, this.size)

    for (let i = 0; i < available; i++) {
      const index = (start + this.size - available + i) % this.capacity
      result.push(this.buffer[index]!)
    }

    return result
  }

  /**
   * Devuelve todos los items actualmente en el buffer, en orden del mas
   * antiguo al mas nuevo.
   */
  toArray(): T[] {
    if (this.size === 0) return []

    const result: T[] = []
    const start = this.size < this.capacity ? 0 : this.head

    for (let i = 0; i < this.size; i++) {
      const index = (start + i) % this.capacity
      result.push(this.buffer[index]!)
    }

    return result
  }

  /**
   * Vacia el buffer.
   */
  clear(): void {
    this.buffer.length = 0
    this.head = 0
    this.size = 0
  }

  /**
   * Devuelve el numero actual de items en el buffer.
   */
  length(): number {
    return this.size
  }
}
