/**
 * Controladores de aborto con limite de escuchas y propagacion padre→hijo —
 * porte de `ccnmt: packages/agent/abortController.ts`.
 *
 * Divergencia declarada: la fuente carga `setMaxListeners` con `require` para
 * no abrir un import de nivel superior a `events` (su frontera de dueno de
 * flujo). Aqui el import va arriba — `no-lazy-imports` prohibe la carga
 * diferida, y esa frontera de la fuente no existe en este arbol.
 */
import { setMaxListeners } from 'node:events'

/** Escuchas admitidas antes de que el runtime avise por acumulacion. */
const DEFAULT_MAX_LISTENERS = 50

/**
 * Un `AbortController` con su limite de escuchas ya fijado.
 *
 * Sin el limite, varias escuchas sobre la misma senal disparan
 * `MaxListenersExceededWarning` — un aviso que no es un fallo y que por eso se
 * ignora hasta que esconde una fuga real.
 */
export function createAbortController(
  maxListeners: number = DEFAULT_MAX_LISTENERS,
): AbortController {
  const controller = new AbortController()
  setMaxListeners(maxListeners, controller.signal)
  return controller
}

/**
 * Propaga el aborto del padre al hijo debilmente referenciado.
 *
 * Vive en el ambito del modulo, no dentro de `createChildAbortController`: una
 * funcion por llamada asignaria una clausura por hijo.
 */
function propagateAbort(
  this: WeakRef<AbortController>,
  weakChild: WeakRef<AbortController>,
): void {
  const parent = this.deref()
  weakChild.deref()?.abort(parent?.signal.reason)
}

/** Retira del padre la escucha que ya no hace falta. Ambos, debiles. */
function removeAbortHandler(
  this: WeakRef<AbortController>,
  weakHandler: WeakRef<(...args: unknown[]) => void>,
): void {
  const parent = this.deref()
  const handler = weakHandler.deref()
  if (parent && handler) {
    parent.signal.removeEventListener('abort', handler)
  }
}

/**
 * Un controlador hijo que aborta cuando aborta su padre. La relacion es de una
 * sola direccion: abortar al hijo NO aborta al padre.
 *
 * Las dos `WeakRef` son lo que hace que la relacion no sea una fuga. Un padre
 * de vida larga con muchos hijos efimeros los retendria a todos si la escucha
 * guardara una referencia fuerte; asi, un hijo abandonado sin abortar sigue
 * siendo recolectable y el padre se queda con una referencia muerta.
 */
export function createChildAbortController(
  parent: AbortController,
  maxListeners?: number,
): AbortController {
  const child = createAbortController(maxListeners)

  // Camino corto: el padre ya abortó, así que no hay nada que escuchar.
  if (parent.signal.aborted) {
    child.abort(parent.signal.reason)
    return child
  }

  const weakChild = new WeakRef(child)
  const weakParent = new WeakRef(parent)
  const handler = propagateAbort.bind(weakParent, weakChild)

  parent.signal.addEventListener('abort', handler, { once: true })

  // Al abortar el hijo —por la causa que sea— se retira la escucha del padre.
  // Con `once: true` ya retirada o con el padre recolectado, es un no-op.
  child.signal.addEventListener(
    'abort',
    removeAbortHandler.bind(weakParent, new WeakRef(handler)),
    { once: true },
  )

  return child
}
