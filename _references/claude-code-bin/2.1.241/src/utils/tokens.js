// ==========================================================================
// utils/tokens.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/utils/tokens.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 3  (0 cadena, 3 nombre)
//   descartadas por ruido (>400 aparic.) : 13
//   sitios de co-ocurrencia : 48  (se emiten los 6 de mayor cruce)
//   regiones emitidas  : 6
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

// --- bundle[346380:348641]  (2261 B)
//     especificidad 5.121 · 3 anclas — 'cache_creation_input_tokens'(×118 g1), 'cache_read_input_tokens'(×124 g1), 'output_tokens'(×182 g1)
function(t){let r=rn(this,aLt,"f");if(t.type==="message_start"){if(r)throw new ma(`Unexpected event order, got ${t.type} before receiving "message_stop"`);return t.message}if(!r)throw new ma(`Unexpected event order, got ${t.type} before "message_start"`);switch(t.type){case"message_stop":return r;case"message_delta":if(r.container=t.delta.container,r.stop_reason=t.delta.stop_reason,r.stop_sequence=t.delta.stop_sequence,t.delta.stop_details!=null)r.stop_details=t.delta.stop_details;if(r.usage.output_tokens=t.usage.output_tokens,r.context_management=t.context_management,t.usage.input_tokens!=null)r.usage.input_tokens=t.usage.input_tokens;if(t.usage.cache_creation_input_tokens!=null)r.usage.cache_creation_input_tokens=t.usage.cache_creation_input_tokens;if(t.usage.cache_read_input_tokens!=null)r.usage.cache_read_input_tokens=t.usage.cache_read_input_tokens;if(t.usage.server_tool_use!=null)r.usage.server_tool_use=t.usage.server_tool_use;if(t.usage.iterations!=null)r.usage.iterations=t.usage.iterations;return r;case"content_block_start":if(r.content.push(t.content_block),t.content_block.type==="fallback")r.model=t.content_block.to.model;return r;case"content_block_delta":{let n=r.content.at(t.index);switch(t.delta.type){case"text_delta":{if(n?.type==="text")r.content[t.index]={...n,text:(n.text||"")+t.delta.text};break}case"citations_delta":{if(n?.type==="text")r.content[t.index]={...n,citations:[...n.citations??[],t.delta.citation]};break}case"input_json_delta":{if(n&&l8s(n)){let o=(n[sLt]||"")+t.delta.partial_json;r.content[t.index]=$zo(n,o)}break}case"thinking_delta":{if(n?.type==="thinking")r.content[t.index]={...n,thinking:n.thinking+t.delta.thinking};break}case"signature_delta":{if(n?.type==="thinking")r.content[t.index]={...n,signature:t.delta.signature};break}case"compaction_delta":{if(n?.type==="compaction")r.content[t.index]={...n,content:(n.content||"")+t.delta.content,encrypted_content:t.delta.encrypted_content};break}default:QPu(t.delta)}return r}case"content_block_stop":{let n=r.content.at(t.index);if(n&&l8s(n)&&sLt in n){let o;try{o=n.input}catch(i){o={},rn(this,XIn,"f").call(this,rn(this,wbe,"m",a8s).call(this,n,i))}Object.defineProperty(n,"input",{value:o,enumerable:!0,configurable:!0,writable:!0})}return r}}}

// --- bundle[352689:353730]  (1041 B)
//     especificidad 5.121 · 3 anclas — 'cache_creation_input_tokens'(×118 g1), 'cache_read_input_tokens'(×124 g1), 'output_tokens'(×182 g1)
async function(){let t=rn(this,NY,"f").params.compactionControl;if(!t||!t.enabled)return!1;let r=0;if(rn(this,UTe,"f")!==void 0)try{let l=await rn(this,UTe,"f");r=l.usage.input_tokens+(l.usage.cache_creation_input_tokens??0)+(l.usage.cache_read_input_tokens??0)+l.usage.output_tokens}catch{return!1}let n=t.contextTokenThreshold??tMu;if(r<n)return!1;let o=t.model??rn(this,NY,"f").params.model,i=t.summaryPrompt??rMu,s=rn(this,NY,"f").params.messages;if(s[s.length-1].role==="assistant"){let l=s[s.length-1];if(Array.isArray(l.content)){let c=l.content.filter((u)=>u.type!=="tool_use");if(c.length===0)s.pop();else l.content=c}}let a=await this.client.beta.messages.create({model:o,messages:[...s,{role:"user",content:[{type:"text",text:i}]}],max_tokens:rn(this,NY,"f").params.max_tokens},{signal:rn(this,Ebe,"f").signal,headers:$i([rn(this,Ebe,"f").headers,SIn("compaction")])});if(a.content[0]?.type!=="text")throw new ma("Expected text response for compaction");return rn(this,NY,"f").params.messages=[{role:"user",content:a.content}],!0}

// --- bundle[380321:382120]  (1799 B)
//     especificidad 5.121 · 3 anclas — 'cache_creation_input_tokens'(×118 g1), 'cache_read_input_tokens'(×124 g1), 'output_tokens'(×182 g1)
function(t){let r=rn(this,pLt,"f");if(t.type==="message_start"){if(r)throw new ma(`Unexpected event order, got ${t.type} before receiving "message_stop"`);return t.message}if(!r)throw new ma(`Unexpected event order, got ${t.type} before "message_start"`);switch(t.type){case"message_stop":return r;case"message_delta":if(r.stop_reason=t.delta.stop_reason,r.stop_sequence=t.delta.stop_sequence,t.delta.stop_details!=null)r.stop_details=t.delta.stop_details;if(r.usage.output_tokens=t.usage.output_tokens,t.usage.input_tokens!=null)r.usage.input_tokens=t.usage.input_tokens;if(t.usage.cache_creation_input_tokens!=null)r.usage.cache_creation_input_tokens=t.usage.cache_creation_input_tokens;if(t.usage.cache_read_input_tokens!=null)r.usage.cache_read_input_tokens=t.usage.cache_read_input_tokens;if(t.usage.server_tool_use!=null)r.usage.server_tool_use=t.usage.server_tool_use;return r;case"content_block_start":return r.content.push({...t.content_block}),r;case"content_block_delta":{let n=r.content.at(t.index);switch(t.delta.type){case"text_delta":{if(n?.type==="text")r.content[t.index]={...n,text:(n.text||"")+t.delta.text};break}case"citations_delta":{if(n?.type==="text")r.content[t.index]={...n,citations:[...n.citations??[],t.delta.citation]};break}case"input_json_delta":{if(n&&D8s(n)){let o=(n[sLt]||"")+t.delta.partial_json;r.content[t.index]=$zo(n,o)}break}case"thinking_delta":{if(n?.type==="thinking")r.content[t.index]={...n,thinking:n.thinking+t.delta.thinking};break}case"signature_delta":{if(n?.type==="thinking")r.content[t.index]={...n,signature:t.delta.signature};break}default:cMu(t.delta)}return r}case"content_block_stop":{let n=r.content.at(t.index);if(n&&D8s(n)&&sLt in n)Object.defineProperty(n,"input",{value:n.input,enumerable:!0,configurable:!0,writable:!0});return r}}}

// --- bundle[2635967:2636222]  (255 B)
//     especificidad 5.121 · 3 anclas — 'cache_creation_input_tokens'(×118 g1), 'cache_read_input_tokens'(×124 g1), 'output_tokens'(×182 g1)
function f5b(e,t){let r=t.cache_creation_input_tokens??0,n=e.promptCacheWrite1hTokens,o=Math.min(t.cache_creation?.ephemeral_1h_input_tokens??0,r);if(n===void 0||o<=0)return r/1e6*e.promptCacheWriteTokens;return o/1e6*n+(r-o)/1e6*e.promptCacheWriteTokens}

// --- bundle[2682245:2682462]  (217 B)
//     especificidad 5.121 · 3 anclas — 'cache_creation_input_tokens'(×118 g1), 'cache_read_input_tokens'(×124 g1), 'output_tokens'(×182 g1)
function XZo(e,t){if(!e)return{used:null,remaining:null};let r=e.input_tokens+e.cache_creation_input_tokens+e.cache_read_input_tokens,n=Math.round(r/t*100),o=Math.min(100,Math.max(0,n));return{used:o,remaining:100-o}}

// --- bundle[2852792:2854317]  (1525 B)
//     especificidad 5.121 · 3 anclas — 'cache_creation_input_tokens'(×118 g1), 'cache_read_input_tokens'(×124 g1), 'output_tokens'(×182 g1)
()=>ye({categories:ft(Bqb()),totalTokens:Xe().int(),maxTokens:Xe().int(),rawMaxTokens:Xe().int(),percentage:Xe(),gridRows:ft(ft(Uqb())),model:O(),memoryFiles:ft(ye({path:O(),type:O(),tokens:Xe().int()})),mcpTools:ft(ye({name:O(),serverName:O(),tokens:Xe().int(),isLoaded:Bt().optional()})),deferredBuiltinTools:ft(ye({name:O(),tokens:Xe().int(),isLoaded:Bt()})).optional(),systemTools:ft(ye({name:O(),tokens:Xe().int()})).optional(),systemPromptSections:ft(ye({name:O(),tokens:Xe().int()})).optional(),agents:ft(ye({agentType:O(),source:O(),tokens:Xe().int()})),slashCommands:ye({totalCommands:Xe().int(),includedCommands:Xe().int(),tokens:Xe().int()}).optional(),skills:ye({totalSkills:Xe().int(),includedSkills:Xe().int(),tokens:Xe().int(),skillFrontmatter:ft(ye({name:O(),source:O(),tokens:Xe().int()}))}).optional(),autoCompactThreshold:Xe().int().optional(),isAutoCompactEnabled:Bt(),messageBreakdown:ye({toolCallTokens:Xe().int(),toolResultTokens:Xe().int(),attachmentTokens:Xe().int(),assistantMessageTokens:Xe().int(),userMessageTokens:Xe().int(),redirectedContextTokens:Xe().int(),unattributedTokens:Xe().int(),toolCallsByType:ft(ye({name:O(),callTokens:Xe().int(),resultTokens:Xe().int()})),attachmentsByType:ft(ye({name:O(),tokens:Xe().int()}))}).optional(),apiUsage:ye({input_tokens:Xe().int(),output_tokens:Xe().int(),cache_creation_input_tokens:Xe().int(),cache_read_input_tokens:Xe().int()}).nullable()}).describe("Breakdown of current context window usage by category (system prompt, tools, messages, etc.).")

// Habia 48 sitios de co-ocurrencia; se emitieron los 6 de mayor cruce. Un contrato con muchas
// realizaciones (una interfaz) los tiene por decenas.
