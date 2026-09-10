// ==========================================================================
// query/stopHooks.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/query/stopHooks.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 4  (0 cadena, 4 nombre)
//   descartadas por ruido (>400 aparic.) : 6
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

// --- bundle[11603256:11604948]  (1692 B)
//     especificidad 6.614 · 3 anclas — 'executeExtractMemories'(×2 g1), 'appendSystemMessage'(×17 g1), 'toolUseContext'(×321 g3)
async function*evl(e,t,r,n,o,i,s,a,l,c,u,d){let p=d==="tool",f=[...e,...t,...r];if(O4(s.agentContext)&&(a.startsWith("repl_main_thread")||a==="sdk"))kFi(eot({messages:f,systemPrompt:n,userContext:o,systemContext:i,toolUseContext:s,querySource:a,stickyBetas:c}));if(p||!Es()&&s.sessionState)yield*Msm(u,[...e,...t],t,s,a);if(!s.agentId)try{yield*Fzt(s)}catch{}let m=Date.now(),h=s.agentId?void 0:s.getAppState().activeGoal;try{let g=PFe(yn(s).mode,s.abortController.signal,void 0,l,s.agentId,s,f,s.agentType),y=[];for await(let _ of g){if(_.timedOut&&h&&_.hook?.prompt===h.condition)be("goal_met","evaluator_timeout");if(_.message){if(yield _.message,_.message.type==="attachment"){let b=_.message.attachment;if("hookEvent"in b&&(b.hookEvent==="Stop"||b.hookEvent==="SubagentStop")){if(b.type==="hook_non_blocking_error")y.push(b.stderr||`Exit code ${b.exitCode}`);else if(b.type==="hook_error_during_execution")y.push(b.content)}}}if(_.blockingError||_.preventContinuation)E(`[end-turn] Stop hook block discarded (turn ended by ${d==="tool"?"tool result":d==="mcp_meta"?"MCP end-turn":"loop tick"}, no model re-invoke): ${_.blockingError?.blockingError??_.stopReason??"preventContinuation"}`)}if(y.length>0)yield{type:"notification",notification:{key:"stop-hook-error",text:`Stop hook error occurred \xB7 ${t2("app:toggleTranscript","Global","ctrl+o")} to see`,priority:"immediate"}}}catch(g){if(zl(g)&&(s.abortController.signal.aborted||g instanceof zE)){E("Stop hook cancelled (abort or stream teardown)");return}N("tengu_stop_hook_error",{duration:Date.now()-m,queryChainId:un(s.queryTracking?.chainId),queryDepth:s.queryTracking?.depth}),yield As(`Stop hook failed: ${le(g)}`,"warning")}}

