// ==========================================================================
// services/extractMemories/extractMemories.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/services/extractMemories/extractMemories.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 3  (1 cadena, 2 nombre)
//   descartadas por ruido (>400 aparic.) : 10
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

// --- bundle[11492913:11495448]  (2535 B)
//     especificidad 7.397 · 2 anclas — 'tengu_bramble_lintel'(×1 g1), 'isTrailingRun'(×2 g1)
async function a({context:u,appendSystemMessage:d,isTrailingRun:p}){let{messages:f}=u,m=Xh(),h=bhw(f,r);if(vhw(f,r)){E("[extractMemories] skipping \u2014 conversation already wrote to memory files");let H=f.at(-1);if(H?.uuid)r=H.uuid;N("tengu_extract_memories_skipped_direct_write",{message_count:h});return}if(!Shw(f,r)){E("[extractMemories] skipping \u2014 no user prose since last extraction");let H=f.at(-1);if(H?.uuid)r=H.uuid;N("tengu_extract_memories_skipped_no_prose",{message_count:h});return}let g=Jui(),y=C7()||g,_=nt("tengu_bramble_lintel",null)??1,b=FBi(m),S=eot(u);if(!p){if(i++,i<_)return}i=0,o=!0;let w=Date.now();try{E(`[extractMemories] starting \u2014 ${h} new messages, memoryDir=${m}`);let H=Q3n(await Z3n(m,cd().signal,u.toolUseContext.storageV5)),T=Vom(h,H,y,g),k=await lW({promptMessages:[Cn({content:T})],cacheSafeParams:S,canUseTool:b,querySource:"extract_memories",forkLabel:"extract_memories",skipTranscript:!0,maxTurns:5,skipCacheWrite:OZr()}),C=f.at(-1);if(C?.uuid)r=C.uuid;let x=Hhw(k.messages,m),I=Zt(k.messages,(U)=>U.type==="assistant"),P=k.totalUsage.input_tokens+k.totalUsage.cache_creation_input_tokens+k.totalUsage.cache_read_input_tokens,M=P>0?(k.totalUsage.cache_read_input_tokens/P*100).toFixed(1):"0.0";if(E(`[extractMemories] finished \u2014 ${x.length} files written, cache: read=${k.totalUsage.cache_read_input_tokens} create=${k.totalUsage.cache_creation_input_tokens} input=${k.totalUsage.input_tokens} (${M}% hit)`),x.length>0)E(`[extractMemories] memories saved: ${x.join(", ")}`);else E("[extractMemories] no memories saved this run");let D=x.filter((U)=>Zom.basename(U)!==Sv),F=Zt(D,kCe);if(N("tengu_extract_memories_extraction",{input_tokens:k.totalUsage.input_tokens,output_tokens:k.totalUsage.output_tokens,cache_read_input_tokens:k.totalUsage.cache_read_input_tokens,cache_creation_input_tokens:k.totalUsage.cache_creation_input_tokens,message_count:h,turn_count:I,files_written:x.length,memories_saved:D.length,team_memories_saved:F,duration_ms:Date.now()-w}),E(`[extractMemories] writtenPaths=${x.length} memoryPaths=${D.length} appendSystemMessage defined=${d!=null}`),D.length>0){let U=BBi(D);U.teamCount=F,d?.(U)}Ee("memory_extract")}catch(H){E(`[extractMemories] error: ${H}`),N("tengu_extract_memories_error",{duration_ms:Date.now()-w}),pe("memory_extract","agent_error")}finally{o=!1;let H=s;if(s=void 0,H&&_<=1)E("[extractMemories] running trailing extraction for stashed context"),await a({context:H.context,appendSystemMessage:H.appendSystemMessage,isTrailingRun:!0})}}

