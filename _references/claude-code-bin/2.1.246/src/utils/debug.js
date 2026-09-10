// ==========================================================================
// utils/debug.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/utils/debug.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 7  (1 cadena, 6 nombre)
//   descartadas por ruido (>400 aparic.) : 7
//   sitios de co-ocurrencia : 1
//   regiones emitidas  : 0
//
// COMO SE LOCALIZO. El minificador mangla los identificadores
// locales y preserva los literales de cadena y las claves de
// objeto. Un ancla frecuente no discrimina sola; se cruza con
// las demas del mismo archivo en una ventana de 4000 B.
//
// La puntuacion de un sitio NO es su numero de anclas: es la
// suma de log10(ventanas/apariciones)/grado de cada una. El
// grado es en cuantos archivos del arbol aparece el ancla: un
// nombre que citan doce fragmentos no es de ninguno. El umbral
// se DERIVA del bundle — aqui 3.85 = log10(7062).
// ==========================================================================

// NINGUN SITIO ALCANZO EL UMBRAL DE ESPECIFICIDAD. Las anclas
// existen en el bundle, pero no discriminan: o son comunes en
// el binario, o las citan muchos archivos del arbol. Ninguna
// agrupacion alcanza 3.85. Las mejores medidas:
//   nombre  'isDebugToStdErr'  1 aparic. · grado 1 → peso 3.8489
//   nombre  'getDebugFilePath'  1 aparic. · grado 1 → peso 3.8489
//   nombre  'DEBUG_SDK'  2 aparic. · grado 1 → peso 3.5479
//   cadena  '--debug='  4 aparic. · grado 1 → peso 3.2469
//   nombre  'runtimeDebugEnabled'  5 aparic. · grado 1 → peso 3.1500
//   nombre  'isDebugMode'  7 aparic. · grado 1 → peso 3.0038
//   nombre  'memoize'  347 aparic. · grado 7 → peso 0.1869
