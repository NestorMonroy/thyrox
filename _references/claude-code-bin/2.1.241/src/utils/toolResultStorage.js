// ==========================================================================
// utils/toolResultStorage.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/utils/toolResultStorage.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 8  (3 cadena, 5 nombre)
//   descartadas por ruido (>400 aparic.) : 26
//   sitios de co-ocurrencia : 3
//   regiones emitidas  : 1
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

// --- bundle[10132517:10133172]  (655 B)
//     especificidad 10.142 · 4 anclas — '<persisted-output>'(×2 g1), '[Old tool result content cleared]'(×3 g1), 'cleared'(×145 g1), 'persisted'(×206 g1)
async function sKf(e,t,r){let{keepSet:n,tokensSaved:o,candidates:i}=sfl(e,r.keepRecent);if(o<ifl)return null;let s=new Set(i.map((c)=>c.tool_use_id)),a=new Map;for(let c of i){let u=c.content?await r.persist?.(c.content,c.tool_use_id):null;a.set(c.tool_use_id,u??MOi)}let l=heo(e,s,a);if(N("tengu_time_based_microcompact",{toolsCleared:s.size,toolsKept:n.size,keepRecent:r.keepRecent,tokensSaved:o,trigger:Ce("context_hint")}),Ee("compact_micro_keep_recent"),E(`[KEEP-RECENT MC] context_hint trigger, cleared ${s.size} tool results (~${o} tokens), kept last ${n.size}`),zXr(),fFe()&&t)rKf(t);return{messages:l,tokensSaved:o,clearedIds:s,clearedContent:a}}

