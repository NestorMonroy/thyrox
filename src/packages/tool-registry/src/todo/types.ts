/**
 * La forma de un elemento de la lista de pendientes de la sesión.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/todo/types.ts` (18 líneas,
 * 4 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`, así
 * que el cuerpo se **reimplementa** y no se copia.
 *
 * DOS CAMPOS PARA UNA MISMA TAREA, Y NO ES REDUNDANCIA. `content` va en
 * imperativo («correr las pruebas») porque es lo que se lee en la lista;
 * `activeForm` va en gerundio («corriendo las pruebas») porque es lo que se
 * lee en el indicador mientras la tarea corre. Derivar uno del otro exigiría
 * conjugar, que en español y en inglés falla en cuanto el verbo es irregular.
 *
 * Los esquemas se construyen bajo demanda (`lazySchema`) por el mismo motivo
 * que el resto del paquete: armar el árbol de zod al cargar el módulo cuesta
 * en el arranque aunque nadie valide nada.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
import { z } from 'zod/v4'
import { lazySchema } from '../utils/lazySchema.js'

/** Los tres estados por los que pasa un pendiente. */
const TodoStatusSchema = lazySchema(() =>
  z.enum(['pending', 'in_progress', 'completed']),
)

/**
 * Un pendiente: qué hay que hacer, en qué estado está, y cómo se anuncia
 * mientras se hace.
 *
 * Los dos textos se exigen NO vacíos con su propio mensaje: un contenido en
 * blanco produce una fila invisible en la lista, y una forma activa en blanco
 * produce un indicador mudo. Los dos fallan en silencio si no se rechazan
 * aquí.
 */
export const TodoItemSchema = lazySchema(() =>
  z.object({
    content: z.string().min(1, 'Content cannot be empty'),
    status: TodoStatusSchema(),
    activeForm: z.string().min(1, 'Active form cannot be empty'),
  }),
)
export type TodoItem = z.infer<ReturnType<typeof TodoItemSchema>>

/** La lista completa. La vacía es válida: es como se cierra una sesión. */
export const TodoListSchema = lazySchema(() => z.array(TodoItemSchema()))
export type TodoList = z.infer<ReturnType<typeof TodoListSchema>>
