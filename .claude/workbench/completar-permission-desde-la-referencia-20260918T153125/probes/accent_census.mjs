#!/usr/bin/env node
// Censa la palabra española escrita sin tilde DENTRO de un comentario.
//
// Dos clases, y sólo una es sustituible sin juicio:
//
//   INEQUIVOCA — la forma sin tilde no es una palabra del español, así que la
//     sustitución no puede producir otra palabra (`sesion` -> `sesión`).
//   AMBIGUA    — la forma sin tilde SI es una palabra, con otro significado
//     (`esta`/`está`, `mas`/`más`, `si`/`sí`, `aun`/`aún`). Se reporta con su
//     línea para decidir caso por caso; NUNCA se sustituye en bloque.
//
// El universo son los spans de comentario que da el AST (misma fuente que
// list_comments.mjs), no el archivo entero: una cadena de texto o un
// identificador nunca entra.
import ts from '/home/user/thyrox/node_modules/typescript/lib/typescript.js'
import { readFileSync } from 'node:fs'
const INEQUIVOCA = {
  asi: 'así', tambien: 'también', automatico: 'automático',
  automatica: 'automática', automaticamente: 'automáticamente',
  sesion: 'sesión', segun: 'según', logica: 'lógica',
  logico: 'lógico', aqui: 'aquí', razon: 'razón',
  explicitamente: 'explícitamente', explicito: 'explícito',
  explicita: 'explícita', deberia: 'debería', podria: 'podría',
  opcion: 'opción', accion: 'acción',
  posicion: 'posición', denegacion: 'denegación', validacion: 'validación',
  informacion: 'información', implementacion: 'implementación',
  invocacion: 'invocación', ejecucion: 'ejecución', seleccion: 'selección',
  condicion: 'condición', sustitucion: 'sustitución', linea: 'línea',
  lineas: 'líneas', modulo: 'módulo', modulos: 'módulos', unico: 'único',
  unica: 'única', unicamente: 'únicamente', ademas: 'además',
  especifico: 'específico', especifica: 'específica', numerico: 'numérico',
  practica: 'práctica', semanticamente: 'semánticamente',
  semantico: 'semántico', semantica: 'semántica', critico: 'crítico',
  critica: 'crítica', ultimo: 'último', ultima: 'última',
  proximo: 'próximo', tipico: 'típico', generico: 'genérico',
  generica: 'genérica', basico: 'básico', basica: 'básica',
  publico: 'público', publica: 'pública',
  parametro: 'parámetro', parametros: 'parámetros', metodo: 'método',
  metodos: 'métodos', codigo: 'código', numero: 'número',
  interpretacion: 'interpretación', configuracion: 'configuración',
  aplicacion: 'aplicación',
  descripcion: 'descripción', comprobacion: 'comprobación',
  aseveracion: 'aseveración', atribucion: 'atribución',
  conversion: 'conversión', expresion: 'expresión', extension: 'extensión',
  peticion: 'petición', reaccion: 'reacción',
  restriccion: 'restricción',
  navegacion: 'navegación', direccion: 'dirección', deteccion: 'detección',
  proteccion: 'protección', excepcion: 'excepción', funcion: 'función',
  cancion: 'canción', asincrono: 'asíncrono', asincrona: 'asíncrona',
  sincrono: 'síncrono', sincrona: 'síncrona', analisis: 'análisis', caracter: 'carácter',
  estandar: 'estándar', dificil: 'difícil',
  facil: 'fácil', rapido: 'rápido', rapida: 'rápida',
  categoria: 'categoría', categorias: 'categorías',
  politica: 'política', dia: 'día', dias: 'días',
  mecanico: 'mecánico', mecanica: 'mecánica', identico: 'idéntico',
  identica: 'idéntica', ciclico: 'cíclico', estatico: 'estático',
  estatica: 'estática', dinamico: 'dinámico', dinamica: 'dinámica',
  dialogo: 'diálogo',
  dialogos: 'diálogos',
  ningun: 'ningún',
  algun: 'algún',
  telemetria: 'telemetría',
  garantia: 'garantía',
  interaccion: 'interacción',
  asignacion: 'asignación',
  operacion: 'operación',
  integracion: 'integración',
  compilacion: 'compilación',
  construccion: 'construcción',
  instalacion: 'instalación',
  autorizacion: 'autorización',
  autenticacion: 'autenticación',
  confirmacion: 'confirmación',
  notificacion: 'notificación',
  actualizacion: 'actualización',
  creacion: 'creación',
  eliminacion: 'eliminación',
  restauracion: 'restauración',
  reanudacion: 'reanudación',
  compactacion: 'compactación',
  migracion: 'migración',
  clasificacion: 'clasificación',
  evaluacion: 'evaluación',
  aprobacion: 'aprobación',
  omision: 'omisión',
  emision: 'emisión',
  inyeccion: 'inyección',
  proyeccion: 'proyección',
  reduccion: 'reducción',
  traduccion: 'traducción',
  produccion: 'producción',
  reproduccion: 'reproducción',
  edicion: 'edición',
  medicion: 'medición',
  anotacion: 'anotación',
  citacion: 'citación',
  iteracion: 'iteración',
  duracion: 'duración',
  jerarquia: 'jerarquía',
  indice: 'índice',
  maximo: 'máximo',
  minimo: 'mínimo',
  maxima: 'máxima',
  minima: 'mínima',
  automaticos: 'automáticos',
  automaticas: 'automáticas',
  simbolo: 'símbolo',
  simbolos: 'símbolos',
  termino: 'término',
  terminos: 'términos',
  ambito: 'ámbito',
  ambitos: 'ámbitos',
  limite: 'límite',
  limites: 'límites',
  atomico: 'atómico',
  atomica: 'atómica',
  anonimo: 'anónimo',
  anonima: 'anónima',
  organico: 'orgánico',
  historico: 'histórico',
  historica: 'histórica',
  automata: 'autómata',
  heuristica: 'heurística',
  metrica: 'métrica',
  metricas: 'métricas',
  grafico: 'gráfico',
  grafica: 'gráfica',
  periodico: 'periódico',
  periodica: 'periódica',
  tecnico: 'técnico',
  tecnica: 'técnica',
  magico: 'mágico',
  magica: 'mágica',
  cronico: 'crónico',
  sintactico: 'sintáctico',
  sintactica: 'sintáctica',
  pragmatico: 'pragmático',
  economico: 'económico',
  estrategico: 'estratégico',
  logicos: 'lógicos',
  numeros: 'números',
  articulo: 'artículo',
  capitulo: 'capítulo',
  titulo: 'título',
  titulos: 'títulos',
  multiplos: 'múltiplos',
  asincronia: 'asincronía',
  basicos: 'básicos',
  basicas: 'básicas',
  despues: 'después',
  quiza: 'quizá',
  jamas: 'jamás',
  detras: 'detrás',
  atras: 'atrás',
  alli: 'allí',
  ahi: 'ahí',
  tipicos: 'típicos',
  genericos: 'genéricos',
  especificos: 'específicos',
  especificas: 'específicas',
  unicos: 'únicos',
  unicas: 'únicas',
  criticos: 'críticos',
  criticas: 'críticas',
  ultimos: 'últimos',
  ultimas: 'últimas',
  maximos: 'máximos',
  minimos: 'mínimos',
  comun: 'común',
  demas: 'demás',
  indices: 'índices',
  representacion: 'representación',
  convendria: 'convendría',
  seccion: 'sección',
  anadir: 'añadir',
  seria: 'sería',
  habria: 'habría',
  tendria: 'tendría',
  bloquearia: 'bloquearía',
  produciria: 'produciría',
  arrastraria: 'arrastraría',
  colgaria: 'colgaría',
  reventaria: 'reventaría',
  romperia: 'rompería',
  mostraria: 'mostraría',
  devolveria: 'devolvería',
  llamaria: 'llamaría',
  deberian: 'deberían',
  podrian: 'podrían',
  serian: 'serían',
  estan: 'están',
}
// La forma sin tilde existe en español con otro significado. Se reporta, no
// se sustituye: el juicio es de quien lee la línea.
const AMBIGUA = new Set(['esta', 'estan', 'mas', 'si', 'aun', 'solo', 'este',
  'ese', 'como', 'cuando', 'donde', 'que', 'el', 'tu', 'mi', 'se', 'de'])
// Sólo las que de verdad aparecen mal en prosa española corriente; el resto
// de AMBIGUA (`como`, `que`, …) casi nunca lleva tilde en una afirmación.
const AMBIGUA_VIGILADA = new Set(['esta', 'mas', 'si', 'aun'])
const DIRECTIVA = /(eslint-disable|eslint-enable|ts-expect-error|ts-ignore|ts-nocheck|biome-ignore|prettier-ignore|@ts-)/
function spans (ruta) {
  const texto = readFileSync(ruta, 'utf8')
  const sf = ts.createSourceFile(ruta, texto, ts.ScriptTarget.ESNext, true,
    ruta.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const vistos = new Set()
  const out = []
  const recoger = rangos => {
    for (const r of rangos ?? []) {
      const clave = `${r.pos}:${r.end}`
      if (vistos.has(clave)) continue
      vistos.add(clave)
      const cuerpo = texto.slice(r.pos, r.end)
      if (DIRECTIVA.test(cuerpo)) continue
      out.push({ pos: r.pos, end: r.end, cuerpo })
    }
  }
  const visitar = n => {
    recoger(ts.getLeadingCommentRanges(texto, n.pos))
    recoger(ts.getTrailingCommentRanges(texto, n.end))
    ts.forEachChild(n, visitar)
  }
  visitar(sf)
  recoger(ts.getLeadingCommentRanges(texto, 0))
  out.sort((a, b) => a.pos - b.pos)
  return { texto, out }
}
function linea (texto, pos) {
  return texto.slice(0, pos).split('\n').length
}
let totalIneq = 0, totalAmb = 0, archivos = 0
const soloResumen = process.argv.includes('--resumen')
for (const ruta of process.argv.slice(2).filter(a => !a.startsWith('--'))) {
  const { texto, out } = spans(ruta)
  const ineq = [], amb = []
  for (const s of out) {
    const base = linea(texto, s.pos)
    s.cuerpo.split('\n').forEach((ln, i) => {
      for (const m of ln.matchAll(/\b([a-záéíóúñü]+)\b/gi)) {
        const w = m[1].toLowerCase()
        if (INEQUIVOCA[w]) ineq.push([base + i, w, INEQUIVOCA[w], ln.trim()])
        else if (AMBIGUA_VIGILADA.has(w)) amb.push([base + i, w, ln.trim()])
      }
    })
  }
  if (!ineq.length && !amb.length) continue
  archivos++
  totalIneq += ineq.length
  totalAmb += amb.length
  if (soloResumen) { console.log(`${ineq.length}\t${amb.length}\t${ruta}`); continue }
  console.log(`\n=== ${ruta}`)
  for (const [l, w, fix, txt] of ineq) console.log(`  INEQ  :${l} ${w} -> ${fix}   ${txt.slice(0, 84)}`)
  for (const [l, w, txt] of amb) console.log(`  AMBIG :${l} ${w}?                 ${txt.slice(0, 84)}`)
}
console.log(`\narchivos=${archivos}  inequivocas=${totalIneq}  ambiguas=${totalAmb}`)
