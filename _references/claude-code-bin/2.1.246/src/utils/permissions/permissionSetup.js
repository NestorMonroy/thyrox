// ==========================================================================
// utils/permissions/permissionSetup.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/utils/permissions/permissionSetup.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 12  (1 cadena, 11 nombre)
//   descartadas por ruido (>400 aparic.) : 15
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

// --- bundle[11839170:11841384]  (2214 B)
//     especificidad 9.667 · 6 anclas — 'setAutoModeActive'(×2 g1), 'isAutoModeActive'(×2 g2), 'stripDangerousPermissionsForAutoMode'(×2 g2), 'prePlanMode'(×35 g2), 'ToolPermissionContext'(×60 g2) …
async call(e,t,r,n,o){let i=null,s=null;[i,s]=await Promise.all([Promise.resolve().then(() => (fV(),ipi)),Promise.resolve().then(() => (mI(),SUi))]);let a=!!t.agentId,l=v$(t.agentId),c="plan"in e&&typeof e.plan==="string"?e.plan:void 0;Xk(l);let u=c??$Q(t.agentId);if(c!==void 0&&l)await oLa(l,c,t.storageV5),w4t(t.storageV5);if(fb()&&nBn()){if(!u)throw new AUi(`No plan file found at ${l}. Please write your plan to this file before calling ExitPlanMode.`);let m=Zx()||"unknown",h=My(),g=gyi("plan_approval",tWe(m,h||"default")),y={type:"plan_approval_request",from:m,timestamp:new Date().toISOString(),planFilePath:l,planContent:u,requestId:g};if(await g1("team-lead",{from:m,text:Re(y),timestamp:new Date().toISOString()},h,t.storageV5)===void 0)throw new AUi("Failed to write the plan approval request to the lead's inbox \u2014 plan not submitted; try again");let b=t.getAppState(),S=Eum(m,b);if(S)HSl(S,t.taskRegistry,!0);return{data:{plan:u,isAgent:!0,filePath:l,awaitingLeaderApproval:!0,requestId:g}}}let d=null;{let m=yn(t).prePlanMode??"default";if(m==="auto"&&!(s?.isAutoModeGateEnabled()??!1)){let h=s?.getAutoModeUnavailableReason()??"circuit-breaker";d=s?.getAutoModeUnavailableNotification(h)??"auto mode unavailable",E(`[auto-mode gate @ ExitPlanModeV2Tool] prePlanMode=${m} but gate is off (reason=${h}) \u2014 falling back to default on plan exit`,{level:"warn"})}}if(d)o?.({type:"notification",notification:{key:"auto-mode-gate-plan-exit-fallback",text:`plan exit \u2192 default \xB7 ${d}`,priority:"immediate",color:"warning",timeoutMs:1e4}});let p=yn(t);if(p.mode==="plan"){hae(!0),ITe(!0);let m=p.prePlanMode??"default";{if(m==="auto"&&!(s?.isAutoModeGateEnabled()??!1))m="default";let y=m==="auto",_=i?.isAutoModeActive()??!1;if(i?.setAutoModeActive(y),_&&!y)Sre(!0)}V$e({from:"plan",to:m,trigger:"exit_plan_mode"});let h=m==="auto",g=p.strippedDangerousRules;t.setToolPermissionContext((y)=>{let _=y;if(h)_=s?.stripDangerousPermissionsForAutoMode(_)??_;else if(g)_=s?.restoreDangerousPermissions(_)??_;return{..._,mode:m,prePlanMode:void 0}})}let f=Id()&&t.options.tools.some((m)=>al(m,Ri));return{data:{plan:u,isAgent:a,filePath:l,hasTaskTool:f||void 0,planWasEdited:c!==void 0||void 0}}}

