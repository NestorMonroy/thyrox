// Mide el guard `assertLevel3` TAL COMO ESTÁ DESPLEGADO en los guiones de
// `.claude/workflows/`, no una copia de laboratorio.
//
// El runtime de `Workflow` no tiene `require` ni filesystem, así que el guard
// vive inlineado en cada guion. Un test que reimplementara el bloque mediría
// su propia copia — el defecto que `metrica-decide-la-conclusion.md` llama
// «medir con el testimonio del propio sujeto». Por eso este archivo EXTRAE el
// bloque de cada guion por sus marcadores y lo ejecuta.
//
// Dos cosas mide, y las dos hacen falta:
//   1. que las N copias desplegadas sean idénticas entre sí (deriva);
//   2. que el guard acepte lo que debe y aborte lo que debe.
//
//   node .claude/scripts/tests/test-nivel3-guard.mjs
//     exit 0 = todas las aserciones pasan · exit 1 = alguna falla

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const WORKFLOWS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'workflows')
const ABRE = '// >>> nivel-3-guard'
const CIERRA = '// <<< nivel-3-guard'

let ok = 0, fallas = 0
const afirma = (cond, nombre) => {
  if (cond) { ok++; console.log(`  OK    ${nombre}`) }
  else { fallas++; console.log(`  FALLA ${nombre}`) }
}

// --- 1. Extraer el bloque de cada guion que lo declare -----------------------
const copias = new Map()
for (const f of readdirSync(WORKFLOWS).filter(n => n.endsWith('.js')).sort()) {
  const texto = readFileSync(join(WORKFLOWS, f), 'utf8')
  const i = texto.indexOf(ABRE), j = texto.indexOf(CIERRA)
  if (i === -1 || j === -1) continue
  // Desde el FIN DE LÍNEA del marcador: la línea lleva un comentario detrás.
  copias.set(f, texto.slice(texto.indexOf('\n', i) + 1, j))
}

if (!copias.size) {
  console.log('FALLA: ningún guion declara el bloque nivel-3-guard')
  process.exit(1)
}
console.log(`Guiones con el guard desplegado: ${copias.size}`)

// --- 2. Las copias no derivan entre sí --------------------------------------
const [primera, ...resto] = [...copias.entries()]
for (const [f, cuerpo] of resto) {
  afirma(cuerpo === primera[1], `${f} idéntica a ${primera[0]}`)
}

// --- 3. El guard, ejecutado desde la copia desplegada ------------------------
const { assertLevel3, assertLevel3All } = new Function(
  `${primera[1]}\nreturn { assertLevel3, assertLevel3All }`)()

const caso = (nombre, fn, espera) => {
  let r
  try { fn(); r = 'pasa' } catch { r = 'aborta' }
  afirma(r === espera, `${nombre} -> ${r}`)
}

// Positivos: formas REALES de los esquemas vivos, no fabricadas.
caso('archivo_escrito absoluto (CENSO, VEREDICTOS, BLOQUEOS)',
  () => assertLevel3({ archivo_escrito: '/home/user/kaupamex-docs/source/gestion/pm/api/x.rst' }, 'censo'), 'pasa')
caso('archivos_escritos como lista de rutas (PORTE)',
  () => assertLevel3({ archivos_escritos: ['src/addons/account_payment/models/x.py'] }, 'porte'), 'pasa')
caso('archivos[].ruta_escrita relativa (LOTE de completar-cascara)',
  () => assertLevel3({ archivos: [{ archivo: 'models/x.py', ruta_escrita: 'src/addons/a/models/x.py' }] }, 'lote'), 'pasa')
caso('ruta_escrita en la raíz (fila suelta de un LOTE)',
  () => assertLevel3({ archivo: 'models/x.py', ruta_escrita: 'src/addons/a/models/x.py' }, 'fila'), 'pasa')
caso('ruta_addon a un directorio (PORTE de portar-capa)',
  () => assertLevel3({ ruta_addon: '/home/user/kaupamex-api/src/addons/account' }, 'capa'), 'pasa')
caso('rutas[] (ESCRITURA de portar-validity)',
  () => assertLevel3({ archivos_escritos: 3, rutas: ['/home/user/kaupamex-api/src/addons/sale/models/x.py'] }, 'escribir'), 'pasa')

// Negativos: los modos de nivel 4 que el runtime produce EN SILENCIO.
caso('null de parallel() — «resolves to null, never rejects»',
  () => assertLevel3(null, 'muerto'), 'aborta')
caso('archivos_escritos sólo como ENTERO: no es verificable contra disco',
  () => assertLevel3({ archivos_escritos: 7, resumen: 'listo' }, 'entero'), 'aborta')
caso('resumen que luce completo y no declara dónde persistió',
  () => assertLevel3({ simbolos_portados: 83, gates_estaticos_ok: true }, 'sin-ruta'), 'aborta')
caso('ruta vacía', () => assertLevel3({ archivo_escrito: '' }, 'vacia'), 'aborta')
caso('nombre suelto sin ruta', () => assertLevel3({ archivo_escrito: 'informe.rst' }, 'suelto'), 'aborta')
caso('una tanda con un hueco lo nombra',
  () => assertLevel3All([{ archivo_escrito: '/a/b/c.rst' }, null], 'tanda'), 'aborta')
caso('una tanda completa pasa',
  () => assertLevel3All([{ archivo_escrito: '/a/b/c.rst' }, { archivo_escrito: '/a/b/d.rst' }], 'tanda'), 'pasa')

// El mensaje del error nombra al culpable — si no, el abort no sirve de nada.
try {
  assertLevel3All([{ archivo_escrito: '/a/b/c.rst' }, null], 'tanda')
  afirma(false, 'el error nombra el índice del hueco')
} catch (e) {
  afirma(e.message.includes('tanda[1]'), `el error nombra el índice del hueco (${e.message.slice(0, 60)})`)
}

console.log(`\n${ok} OK · ${fallas} fallas`)
process.exit(fallas ? 1 : 0)
