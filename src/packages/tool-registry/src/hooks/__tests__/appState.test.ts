/**
 * La mitad ROJA de `hooks/appState`.
 *
 * Procedencia del SUJETO: `ccnmt: packages/tool-registry/src/hooks/appState.ts`.
 * Los casos son propios —ese árbol declara `"license": "UNLICENSED"`.
 *
 * QUÉ SE PUEDE MEDIR AQUÍ, Y QUÉ NO. El módulo es una indirección: su única
 * conducta es resolver el paquete hermano en el sitio de la llamada y delegar.
 * Así que lo medible es que la resolución ATERRIZA en el módulo real, no que
 * el estado de la aplicación funcione — eso es de `app-host` y su suite.
 *
 * La costura se ejercita por el ERROR, no por el valor. Llamados fuera de un
 * render de React los dos hooks mueren en el despachador —sin él, o con el
 * de sólo contexto que React deja tras un render (ver `OUTSIDE_RENDER`)—, y
 * esos mensajes sólo los puede producir el hook REAL: si `require` devolviera un
 * espacio de nombres vacío el error sería «no es una función», y si el
 * especificador no resolviera sería un error de resolución del módulo. Los
 * tres son distinguibles, así que el caso discrimina.
 *
 * Una costura con anulación, y se corrió:
 *
 * 1. **El especificador del paquete hermano** — `@thyrox/app-host/state/AppState.js`.
 *    Anulación: apuntarlo a un subpath inexistente y caen **3** casos, el 2,
 *    el 3 y el 4: los dos que exigen el error del despachador y el que exige
 *    que el fallo NO sea de resolución. Ese tercero es el que separa «llegué
 *    al hook y React se quejó» de «no llegué al módulo».
 *
 * Métrica: el tipo de los dos símbolos, y el mensaje del error que lanzan al
 * invocarlos fuera de un render.
 * Ciega a: si la indirección de verdad DIFIERE la carga —comprobarlo exigiría
 * inspeccionar el grafo de módulos cargados del proceso, y `bun test` ya
 * carga `app-host` por otras suites del paquete—. Y ciega al valor que los
 * hooks devuelven dentro de un render, que exige montar el árbol de React.
 */
import { describe, expect, test } from 'bun:test'
import { useAppStateStore, useSetAppState } from '../appState.js'

/**
 * Los dos mensajes con que React rechaza un hook fuera de un render. Cuál sale
 * depende de si el proceso ya renderizó algo: sin render previo no hay
 * despachador (`dispatcher.useContext` sobre null); tras cualquier render
 * React deja instalado su despachador de sólo contexto, que lanza «Invalid
 * hook call». `bun test` reúne varias suites en un proceso, así que las dos
 * formas ocurren según el orden (medido: tras `searchTextRenderFidelity`, la
 * segunda). Las dos las produce sólo el hook REAL.
 */
const OUTSIDE_RENDER = /dispatcher|Invalid hook call/

describe('hooks/appState — la indirección hacia el paquete hermano', () => {
  test('1. los dos símbolos existen y son funciones', () => {
    expect(typeof useAppStateStore).toBe('function')
    expect(typeof useSetAppState).toBe('function')
  })

  test('2. useAppStateStore alcanza el hook REAL de app-host', () => {
    // El error del despachador prueba que se llegó a un hook de React. Un
    // require que fallara daría un error de resolución; uno que devolviera un
    // espacio vacío daría «no es una función».
    expect(() => useAppStateStore()).toThrow(OUTSIDE_RENDER)
  })

  test('3. useSetAppState alcanza el hook REAL de app-host', () => {
    expect(() => useSetAppState()).toThrow(OUTSIDE_RENDER)
  })

  test('4. el fallo es de React, no uno de resolución', () => {
    let capturado: unknown
    try {
      useAppStateStore()
    } catch (e) {
      capturado = e
    }
    expect(capturado).toBeInstanceOf(Error)
    expect((capturado as Error).message).toMatch(OUTSIDE_RENDER)
    expect((capturado as Error).message).not.toContain('Cannot find')
  })
})
