// ==========================================================================
// utils/plugins/pluginOptionsStorage.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/utils/plugins/pluginOptionsStorage.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 3  (1 cadena, 2 nombre)
//   descartadas por ruido (>400 aparic.) : 8
//   sitios de co-ocurrencia : 0
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
//   nombre  'pluginId'  245 aparic. · grado 1 → peso 1.4598
//   cadena  'sensitive'  323 aparic. · grado 1 → peso 1.3397
//   nombre  'memoize'  347 aparic. · grado 7 → peso 0.1869
