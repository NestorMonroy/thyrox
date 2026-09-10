// ==========================================================================
// cost-tracker.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/cost-tracker.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 10  (0 cadena, 10 nombre)
//   descartadas por ruido (>400 aparic.) : 4
//   sitios de co-ocurrencia : 3
//   regiones emitidas  : 2
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

// --- bundle[9218119:9218619]  (500 B)
//     especificidad 27.480 · 9 anclas — 'ModelUsage'(×4 g1), 'totalAPIDurationWithoutRetries'(×4 g1), 'totalCostUSD'(×4 g1), 'totalLinesAdded'(×4 g1), 'totalLinesRemoved'(×4 g1) …
function Mil(e){let t=$f();if(t.lastSessionId!==e)return;let r;if(t.lastModelUsage)r=xA(t.lastModelUsage,(n,o)=>({...n,contextWindow:FC(o,zx()),maxOutputTokens:xMt(o).default}));return{totalCostUSD:t.lastCost??0,totalAPIDuration:t.lastAPIDuration??0,totalAPIDurationWithoutRetries:t.lastAPIDurationWithoutRetries??0,totalToolDuration:t.lastToolDuration??0,totalLinesAdded:t.lastLinesAdded??0,totalLinesRemoved:t.lastLinesRemoved??0,lastDuration:t.lastDuration,startTime:t.lastStartTime,modelUsage:r}}

// --- bundle[34182:35957]  (1775 B)
//     especificidad 24.234 · 8 anclas — 'totalAPIDurationWithoutRetries'(×4 g1), 'totalCostUSD'(×4 g1), 'totalLinesAdded'(×4 g1), 'totalLinesRemoved'(×4 g1), 'totalToolDuration'(×4 g1) …
class H4s{#e=0;#t=0;#r=0;#n=0;#o=Date.now();#i=void 0;#l=0;#a=0;#s=!1;#c={};#u=null;totalCostUSD(){return this.#e}totalAPIDuration(){return this.#t}totalAPIDurationWithoutRetries(){return this.#r}totalToolDuration(){return this.#n}totalDuration(){return Date.now()-this.#o}sessionStartTime(){return this.#i??this.#o}totalLinesAdded(){return this.#l}totalLinesRemoved(){return this.#a}hasUnknownModelCost(){return this.#s}modelUsage(){return this.#c}usageForModel(e){return this.#c[e]}totalInputTokens(){return NPr(Object.values(this.#c),"inputTokens")}totalOutputTokens(){return NPr(Object.values(this.#c),"outputTokens")}totalCacheReadInputTokens(){return NPr(Object.values(this.#c),"cacheReadInputTokens")}totalCacheCreationInputTokens(){return NPr(Object.values(this.#c),"cacheCreationInputTokens")}totalWebSearchRequests(){return NPr(Object.values(this.#c),"webSearchRequests")}recordApiDuration(e,t){this.#t+=e,this.#r+=t}recordCost(e,t,r){this.#c[r]=t,this.#e+=e}recordToolDuration(e){this.#n+=e}recordLinesChanged(e,t){this.#l+=e,this.#a+=t}markUnknownModelCost(){this.#s=!0}zeroDurationsAndCostForTests(){this.#t=0,this.#r=0,this.#e=0}restartClock(){this.#o=Date.now(),this.anchorLogicalStart(void 0)}anchorLogicalStart(e){this.#i=e===void 0?void 0:Math.min(e,this.#o)}restore({totalCostUSD:e,totalAPIDuration:t,totalAPIDurationWithoutRetries:r,totalToolDuration:n,totalLinesAdded:o,totalLinesRemoved:i,lastDuration:s,startTime:a,modelUsage:l}){if(this.#e=e,this.#t=t,this.#r=r,this.#n=n,this.#l=o,this.#a=i,l)this.#c=l;if(s)this.#o=Date.now()-s;this.anchorLogicalStart(a)}registerSaver(e){this.#u=e}runSaver(e){this.#u?.(e)}reset(){this.#e=0,this.#t=0,this.#r=0,this.#n=0,this.#o=Date.now(),this.anchorLogicalStart(void 0),this.#l=0,this.#a=0,this.#s=!1,this.#c={}}}

