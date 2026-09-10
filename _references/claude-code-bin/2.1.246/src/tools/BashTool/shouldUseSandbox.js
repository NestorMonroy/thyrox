// ==========================================================================
// tools/BashTool/shouldUseSandbox.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/tools/BashTool/shouldUseSandbox.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 7  (0 cadena, 7 nombre)
//   descartadas por ruido (>400 aparic.) : 9
//   sitios de co-ocurrencia : 1
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

// --- bundle[22582733:22583644]  (911 B)
//     especificidad 4.064 · 3 anclas — 'subcommands'(×50 g1), 'isSandboxingEnabled'(×32 g2), 'dangerouslyDisableSandbox'(×42 g3)
async function Kyy(e,t){if(t.nameType==="application")return null;let r=t.name;if(!r)return null;if(!/^[A-Za-z0-9_+-]+$/.test(r))return null;if(lPm.has(r.toLowerCase()))return null;if(t.nameType==="cmdlet")return r;if(t.elementTypes?.[0]!=="StringConstant")return null;for(let a=0;a<t.args.length;a++){let l=t.elementTypes[a+1];if(l!=="StringConstant"&&l!=="Parameter")return null}let n=r.toLowerCase(),o=await e.get(n),i=await pDi(r,t.args,o),s=0;for(let a of i.split(" ").slice(1)){if(a.includes("\\"))return null;while(s<t.args.length){let l=t.args[s];if(l===a)break;if(l.startsWith("-")){if(s++,o?.options&&s<t.args.length&&t.args[s]!==a&&!t.args[s].startsWith("-")){let c=l.toLowerCase();if(o.options.find((d)=>Array.isArray(d.name)?d.name.includes(c):d.name===c)?.args)s++}continue}return null}if(s>=t.args.length)return null;s++}if(!i.includes(" ")&&(o?.subcommands?.length||Fmr[n]))return null;return i}

