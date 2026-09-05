// ==========================================================================
// memdir/memdir.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/memdir/memdir.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 2  (1 cadena, 1 nombre)
//   descartadas por ruido (>400 aparic.) : 4
//   sitios de co-ocurrencia : 7  (se emiten los 6 de mayor cruce)
//   regiones emitidas  : 4
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

// --- bundle[3539849:3540213]  (364 B)
//     especificidad 4.603 · 2 anclas — 'MEMORY.md'(×11 g1), 'MEMORY'(×113 g1)
function joi(){if(Cd())return!1;let e=process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY;if(Vn(e))return!1;if(Gp(e))return!0;if(q.CLAUDE_CODE_SIMPLE)return!1;if(q.CLAUDE_CODE_REMOTE&&!process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR&&!q.CLAUDE_COWORK_MEMORY_PATH_OVERRIDE)return!1;if(L2n())return!1;let t=Qo();if(t.autoMemoryEnabled!==void 0)return t.autoMemoryEnabled;return!0}

// --- bundle[4489937:4491193]  (1256 B)
//     especificidad 4.603 · 2 anclas — 'MEMORY.md'(×11 g1), 'MEMORY'(×113 g1)
withSelectedGroupingMounts(e,t,r){let n=C1t()?e.filter((u)=>I7(u.path)!==void 0):e,o=Aui(t);if(o===void 0){if(!SGr())this.emitGrantMissingOnce();return n}if(!AGr(o.path))return E("org-memory-discovery: granted grouping path failed the partition pin \u2014 not mounting",{level:"warn"}),this.emitGrantMissingOnce(),n;let i=[...n],s=(u)=>i.some((d)=>Kk(d.path)===Kk(u)),a=(u,d)=>{if(s(d))return!0;return i=ivp(i,u,d),!1};for(let u of VIa().filter(Yzn)){let d=Kk(u.path),p=d.slice(d.lastIndexOf("/")+1);if(!p.startsWith("cagt_")||!AGr(u.path)){E("org-memory-discovery: granted silo entry failed the tag or partition pin \u2014 not mounting",{level:"warn"});continue}let f=`silo_${p.replace(/[^A-Za-z0-9_-]/g,"-")}`;if(a(f,u.path))continue;i.push({path:u.path,mount:f,scope:"team",mode:r&&u.mode==="rw"?"rw":"ro",promptIndex:"MEMORY.md"})}let l=`project_${t.replace(/[^A-Za-z0-9_-]/g,"-")}`;if(!a(l,o.path))i.push({path:o.path,mount:l,scope:"team",mode:"ro",promptIndex:"MEMORY.md",...o.visibility==="private"&&{owned:!0}});else if(o.visibility==="private")i.forEach((u,d)=>{if(Kk(u.path)===Kk(o.path))i[d]={...u,owned:!0}});let c=Kzn();if(c!==void 0&&AGr(c.path)&&!a(EGr,c.path))i.push({path:c.path,mount:EGr,scope:"team",mode:"ro",promptIndex:cRa});return i}

// --- bundle[5699382:5699805]  (423 B)
//     especificidad 4.603 · 2 anclas — 'MEMORY.md'(×11 g1), 'MEMORY'(×113 g1)
function J3n(){let e;try{e=hSe()}catch{return null}if(e===null)return null;let t=new Set(["MEMORY.md"]),r=[];for(let n of e){for(let i of n.skillsDirs??[]){let s=i.split("/");r.push((n.scope==="user"?V7.join(...s):V7.join("team",n.mount,...s))+V7.sep)}if(n.promptIndex===void 0)continue;let o=n.promptIndex.split("/");t.add(n.scope==="user"?V7.join(...o):V7.join("team",n.mount,...o))}return{excluded:t,excludedPrefixes:r}}

// --- bundle[12524577:12524811]  (234 B)
//     especificidad 4.603 · 2 anclas — 'MEMORY.md'(×11 g1), 'MEMORY'(×113 g1)
()=>pi({store:O().describe(`Id of the connected memory store to read from (call ${UD} with no arguments to see the connected stores).`),path:O().describe("Path of the memory document to read (e.g. /project/<project-id>/MEMORY.md).")})

// Habia 7 sitios de co-ocurrencia; se emitieron los 6 de mayor cruce. Un contrato con muchas
// realizaciones (una interfaz) los tiene por decenas.
