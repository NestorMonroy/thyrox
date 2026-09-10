/**
 * El texto con que se le explica al modelo cuándo y cómo dormir.
 *
 * Procedencia: `ccnmt: packages/tool-registry/src/tools/SleepTool/prompt.ts`
 * (3 símbolos exportados). Ese árbol declara `"license": "UNLICENSED"`; el
 * prompt es la INSTRUCCIÓN que el útil emite, así que su texto se conserva
 * verbatim —cambiarlo cambiaría la conducta que produce— y lo que se
 * reimplementa es su envoltorio.
 *
 * LA ETIQUETA DEL AVISO PERIÓDICO NO SE TECLEA: entra por interpolación
 * desde `@thyrox/command-runtime/xml.js`. Si el runtime la renombra, el
 * prompt sigue nombrando la real; con el literal quedaría instruyendo sobre
 * una etiqueta que nunca llega, y ese fallo aparece como un modelo que
 * ignora avisos que sí está recibiendo.
 *
 * SÓLO LLEGA EL PROMPT, y no es un porte parcial silencioso: la fuente
 * tampoco tiene el útil. `SleepTool/` contiene un único archivo, este.
 *
 * DIVERGENCIA DECLARADA: ninguna.
 */
import { TICK_TAG } from '@thyrox/command-runtime/xml.js'

export const SLEEP_TOOL_NAME = 'Sleep'

export const DESCRIPTION = 'Wait for a specified duration'

export const SLEEP_TOOL_PROMPT = `Wait for a specified duration. The user can interrupt the sleep at any time.

Use this when the user tells you to sleep or rest, when you have nothing to do, or when you're waiting for something.

You may receive <${TICK_TAG}> prompts — these are periodic check-ins. Look for useful work to do before sleeping.

You can call this concurrently with other tools — it won't interfere with them.

Prefer this over \`Bash(sleep ...)\` — it doesn't hold a shell process.

Each wake-up costs an API call, but the prompt cache expires after 5 minutes of inactivity — balance accordingly.`
