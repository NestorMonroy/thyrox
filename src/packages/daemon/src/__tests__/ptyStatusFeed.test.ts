import { describe, expect, test } from 'bun:test'
import { MAX_DETAIL_CHARS } from '../classifier/state.js'
import { createPtyStatusFeed, type StatusFeedPatch } from '../ptyStatusFeed.js'

/** Espera lo bastante para que corran `n` ticks de `tickMs`. */
function waitTicks(tickMs: number, n = 1): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, tickMs * n + Math.max(5, tickMs / 2)))
}

describe('createPtyStatusFeed — cadencia sin escritura', () => {
  test('sin ningun feed() emite working/idle en el primer tick', async () => {
    const patches: StatusFeedPatch[] = []
    const feed = createPtyStatusFeed({ tickMs: 15, onPatch: p => void patches.push(p) })
    await waitTicks(15, 1)
    feed.dispose()
    expect(patches.length).toBeGreaterThan(0)
    expect(patches[0]?.state).toBe('working')
    expect(patches[0]?.tempo).toBe('idle')
  })

  test('una linea terminada en salto no deja pendiente — sigue idle, no blocked', async () => {
    const patches: StatusFeedPatch[] = []
    const feed = createPtyStatusFeed({ tickMs: 15, onPatch: p => void patches.push(p) })
    feed.feed('todo listo\n')
    await waitTicks(15, 2)
    feed.dispose()
    expect(patches.some(p => p.tempo === 'blocked')).toBe(false)
  })

  test('una linea sin salto final, tras silencio, pasa a blocked con esa linea de detalle', async () => {
    const patches: StatusFeedPatch[] = []
    const feed = createPtyStatusFeed({ tickMs: 15, onPatch: p => void patches.push(p) })
    feed.feed('¿continuo con el borrado? (y/n)')
    await waitTicks(15, 2)
    feed.dispose()
    const blocked = patches.find(p => p.state === 'blocked')
    expect(blocked).toBeDefined()
    expect(blocked?.tempo).toBe('blocked')
    expect(blocked?.detail).toBe('¿continuo con el borrado? (y/n)')
  })
})

describe('createPtyStatusFeed — escritura reciente', () => {
  test('un feed() reciente da working/active en el siguiente tick que lo ve', async () => {
    const patches: StatusFeedPatch[] = []
    const tickMs = 200
    const feed = createPtyStatusFeed({ tickMs, onPatch: p => void patches.push(p) })
    // feed() ANTES del primer tick, con margen de sobra respecto de tickMs
    // en las dos direcciones: bastante lejos del tick (para que siga
    // "reciente" cuando el tick lo mire) y bastante cerca (para no cruzar
    // al tick siguiente).
    await new Promise(r => setTimeout(r, tickMs * 0.6))
    feed.feed('trabajando…\n')
    await new Promise(r => setTimeout(r, tickMs * 0.55))
    feed.dispose()
    const last = patches[patches.length - 1]
    expect(last?.state).toBe('working')
    expect(last?.tempo).toBe('active')
  })

  test('un feed() nuevo mientras esta blocked reactiva a working/active de inmediato', async () => {
    const patches: StatusFeedPatch[] = []
    const feed = createPtyStatusFeed({ tickMs: 15, onPatch: p => void patches.push(p) })
    feed.feed('¿seguro? (y/n)')
    await waitTicks(15, 2)
    expect(patches.some(p => p.state === 'blocked')).toBe(true)
    const before = patches.length
    feed.feed('y\n')
    feed.dispose()
    expect(patches.length).toBeGreaterThan(before)
    expect(patches[patches.length - 1]?.state).toBe('working')
    expect(patches[patches.length - 1]?.tempo).toBe('active')
  })
})

describe('createPtyStatusFeed — deduplicacion', () => {
  test('dos ticks con la misma clave no repiten el patch', async () => {
    const patches: StatusFeedPatch[] = []
    const feed = createPtyStatusFeed({ tickMs: 15, onPatch: p => void patches.push(p) })
    await waitTicks(15, 3)
    feed.dispose()
    expect(patches.length).toBe(1)
  })
})

describe('createPtyStatusFeed — limpieza de la PTY', () => {
  test('un movimiento de cursor ANSI hacia atras separa en lineas', () => {
    // Sin el `\x1b[7D` como delimitador, "primero" y "segundo" quedarian
    // fundidos en una sola linea ("primerosegundo") y `lastLine` seria esa
    // fusion, no "segundo": la ultima linea COMPLETA antes del salto final.
    const feed = createPtyStatusFeed({ tickMs: 10_000, onPatch: () => {} })
    feed.feed('primero\x1b[7Dsegundo\n')
    feed.dispose()
    expect(feed.lastLine).toBe('segundo')
  })

  test('secuencias ANSI de color se limpian del detalle', () => {
    const feed = createPtyStatusFeed({ tickMs: 10_000, onPatch: () => {} })
    feed.feed('\x1b[31mfallo\x1b[0m\n')
    feed.dispose()
    expect(feed.lastLine).toBe('fallo')
  })

  test('el buffer interno sin saltos se acota a la cola tras 2x MAX_DETAIL_CHARS', () => {
    // La cola se acota ANTES de que llegue el salto que cierra la linea.
    // Sin acotar, la linea completa mediria 2000 caracteres y el truncado
    // final del `lastLine` la recortaria con una elipsis; acotada, queda
    // justo en MAX_DETAIL_CHARS y sin elipsis — misma longitud, contenido
    // distinguible.
    const feed = createPtyStatusFeed({ tickMs: 10_000, onPatch: () => {} })
    feed.feed('x'.repeat(2000))
    feed.feed('\n')
    feed.dispose()
    expect(feed.lastLine).toBe('x'.repeat(MAX_DETAIL_CHARS))
  })
})

describe('createPtyStatusFeed — chunk que limpia a vacio', () => {
  test('un chunk puramente ANSI (sin texto visible) no refresca el reloj de escritura', async () => {
    const patches: StatusFeedPatch[] = []
    const tickMs = 50
    const feed = createPtyStatusFeed({ tickMs, onPatch: p => void patches.push(p) })
    feed.feed('en curso')
    await new Promise(r => setTimeout(r, 30))
    // Se limpia a cadena vacia: si refrescara el reloj de escritura como
    // una escritura real, el tick de mas abajo veria la ventana activa en
    // vez de "blocked".
    feed.feed('\x1b[0m')
    await new Promise(r => setTimeout(r, 30))
    feed.dispose()
    expect(patches.some(p => p.state === 'blocked')).toBe(true)
  })
})

describe('createPtyStatusFeed — fallo del sumidero inyectado', () => {
  test('si onPatch rechaza, se logea con logErrorFn en vez de propagar', async () => {
    const errors: unknown[] = []
    const feed = createPtyStatusFeed({
      tickMs: 15,
      onPatch: () => Promise.reject(new Error('sumidero caido')),
      logErrorFn: e => void errors.push(e),
    })
    await waitTicks(15, 1)
    feed.dispose()
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe('createPtyStatusFeed — dispose', () => {
  test('tras dispose no se publican mas patches, ni por tick ni por reactivacion', async () => {
    const patches: StatusFeedPatch[] = []
    const feed = createPtyStatusFeed({ tickMs: 15, onPatch: p => void patches.push(p) })
    await waitTicks(15, 1)
    feed.dispose()
    const before = patches.length
    // El propio `feed()` puede disparar `emit()` fuera del temporizador
    // (la reactivacion tras "blocked"); dispose() lo tiene que cortar
    // tambien, no solo el temporizador.
    feed.feed('algo nuevo despues de disponer\n')
    await waitTicks(15, 2)
    expect(patches.length).toBe(before)
  })

  test('dispose corta la reactivacion blocked->active de feed(), no solo el temporizador', async () => {
    const patches: StatusFeedPatch[] = []
    const feed = createPtyStatusFeed({ tickMs: 15, onPatch: p => void patches.push(p) })
    feed.feed('¿seguro? (y/n)')
    await waitTicks(15, 2)
    expect(patches.some(p => p.state === 'blocked')).toBe(true)
    feed.dispose()
    const before = patches.length
    feed.feed('y\n')
    expect(patches.length).toBe(before)
  })
})
