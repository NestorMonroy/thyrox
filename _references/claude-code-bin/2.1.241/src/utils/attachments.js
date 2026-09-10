// ==========================================================================
// utils/attachments.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/utils/attachments.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 19  (3 cadena, 16 nombre)
//   descartadas por ruido (>400 aparic.) : 9
//   sitios de co-ocurrencia : 16  (se emiten los 6 de mayor cruce)
//   regiones emitidas  : 5
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

// --- bundle[16074754:16076250]  (1496 B)
//     especificidad 45.373 · 16 anclas — 'PLAN_MODE_ATTACHMENT_CONFIG'(×1 g1), 'getPlanModeAttachmentTurnCount'(×1 g1), 'tengu_ultrathink'(×1 g1), 'FULL_REMINDER_EVERY_N_ATTACHMENTS'(×2 g1), 'TURNS_BETWEEN_ATTACHMENTS'(×2 g1) …
async function lbE(e){let{query:t,memoryDir:r,selectorCtx:n,history:o,byFilename:i,cacheControl:s,signal:a,credentials:l}=e,c=`Select memories relevant to:
${t}`,u=WR(),[d,p]=Tht(u);try{let f=await Age({model:u,system:[{type:"text",text:ibE,cache_control:s}],skipSystemPromptPrefix:!0,messages:[...o,{role:"user",content:[{type:"text",text:c,cache_control:s}]}],max_tokens:sbE+p,thinking:d,output_format:{type:"json_schema",schema:{type:"object",properties:{selected_memories:{type:"array",items:{type:"string"}}},required:["selected_memories"],additionalProperties:!1}},signal:a,querySource:fSi,credentials:l});if(f.stop_reason==="max_tokens")return be("memory_recall_select","output_truncated"),E("[memdir] selectRelevantMemories truncated at max_tokens",{level:"warn"}),[];let m=f.content.find((g)=>g.type==="text");if(!m||m.type!=="text")return be("memory_recall_select","no_text_block"),E("[memdir] selectRelevantMemories returned no text block",{level:"warn"}),[];let h=er(Oae(m.text));return LKp(n,r,c,m.text),n.lastUsage={cacheReadInputTokens:f.usage.cache_read_input_tokens??0,cacheCreationInputTokens:f.usage.cache_creation_input_tokens??0,turnCount:(o.length+1)/2},Ee("memory_recall_select"),h.selected_memories.map((g)=>typeof g!=="string"||i.has(g)?g:g.replace(abE,"")).filter((g)=>i.has(g))}catch(f){if(n.lastUsage=null,a.aborted)return[];return be("memory_recall_select","memory_recall_select_query_failed"),E(`[memdir] selectRelevantMemories failed: ${le(f)}`,{level:"warn"}),[]}}

// --- bundle[14197955:14198616]  (661 B)
//     especificidad 14.427 · 6 anclas — 'isSubAgent'(×4 g1), 'reminderType'(×6 g1), 'planExists'(×7 g1), 'plan_mode'(×56 g1), 'attachments'(×111 g1) …
async function WFi(e,t,r,n,o,i=!1){let s=mb(t.agentContext),[a,l]=await Promise.all([Rzw(e,t,wzw,r,i),s?Promise.resolve([]):Pzw(t)]),c=t.agentId,u=await Lzw(c,t.storageV5),d=await o_l(t,o),p=Dzw(c,r),f=[...EQr(t.options.tools,t.options.mainLoopModel,r,{callSite:n}),...xlo(t,r),...Jqi(t.options.mcpClients,t.options.tools,t.options.mainLoopModel,r),...Zqi(t,r)].map((h)=>ac(h)),m=[];if(!s)t.onCompactEvent?.({type:"compact_progress",event:{type:"hooks_start",hookType:"session_start"}}),m=await dit(t.session,"compact",{model:t.options.mainLoopModel,storageV5:t.storageV5});return{attachments:[...a,...l,...u?[u]:[],...d?[d]:[],...p?[p]:[],...f],hookResults:m}}

// --- bundle[16300184:16300406]  (222 B)
//     especificidad 12.526 · 5 anclas — 'ultrathink_effort'(×5 g1), 'reminderType'(×6 g1), 'planExists'(×7 g1), 'plan_mode'(×56 g1), 'planFilePath'(×28 g2)
(e)=>l_([Cn({content:`A plan file exists from plan mode at: ${e.planFilePath}

Plan contents:

${e.planContent}

If this plan is relevant to the current work and not already complete, continue working on it.`,isMeta:!0})])

// --- bundle[16116723:16117051]  (328 B)
//     especificidad 10.605 · 4 anclas — 'FULL_REMINDER_EVERY_N_ATTACHMENTS'(×2 g1), 'TURNS_BETWEEN_ATTACHMENTS'(×2 g1), 'attachments'(×111 g1), 'Attachment'(×139 g1)
async function XbE(e){let{attachments:t,updatedTaskOffsets:r,evictedTaskIds:n}=await klm(e.taskRegistry.all());return e.taskRegistry.applyOffsetsAndEvict(r,n),t.map((o)=>({type:"task_status",taskId:o.taskId,taskType:o.taskType,status:o.status,description:o.description,deltaSummary:o.deltaSummary,outputFilePath:bE(o.taskId)}))}

// --- bundle[16243838:16248754]  (4916 B)
//     especificidad 7.452 · 3 anclas — 'isSubAgent'(×4 g1), 'planExists'(×7 g1), 'planFilePath'(×28 g2)
function rwE(e){if(e.isSubAgent)return[];let t=e.planExists?`A plan file already exists at ${e.planFilePath}. You can read it and make incremental edits using the ${Il} tool.`:`No plan file exists yet. You should create your plan at ${e.planFilePath} using the ${Au} tool.`,r=!e.workshopOfferDocPath&&e.workshopActiveDocPath?`

A decision workshop is in progress for this session \u2014 exactly as granted when the workshop began, ${jUl(e.workshopActiveDocPath,{form:"full",mode:"active"})} Fold each resolved decision back into the plan file as the workshop progresses.`:"";if(e.customInstructions){let l=`${_lh}

## Plan File Info:
${t}
You should build your plan incrementally by writing to or editing this file. NOTE that this is the only file you are allowed to edit - other than this you are only allowed to take READ-ONLY actions.${r}

## Plan Workflow

${e.customInstructions}

### Call ${iT}
${blh(e.workshopActiveDocPath)}`;return l_([Cn({content:l,isMeta:!0})])}let{phase1:n,phase2:o}=ewE(),i=e.workshopOfferDocPath?`

## Interactive Workshop Option

The workshop skill is available in this session. Once you understand the request well enough to see its design decisions, judge whether this task has substantive decision points \u2014 multiple viable approaches where the user's choice shapes the plan. If it does, offer the workshop once, via ${Sy}, at a natural early moment \u2014 typically alongside your first clarifying questions, or when the first real design decision surfaces: the user can plan through an interactive workshop, a published page where they click through each open decision in their browser and their choices flow back into this session. Describe the offer in those product terms \u2014 what the user will experience, never the machinery underneath. If the task has no real decision points, do not offer, and do not mention the workshop at all.

If the user accepts: invoke the workshop skill (${Of} tool), create the workshop document at ${e.workshopOfferDocPath}, and seed it from the planning context so far \u2014 the task summary, what exploration has established, and the open decisions. The plan file remains the canonical plan: fold each resolved decision back into it as the workshop progresses, and finish the planning workflow (ending with ${iT}) as normal once the decisions are settled. Once the workshop document exists, the end-turn rule in these reminders gains a third option (publishing the document so the user can take decisions on the page) \u2014 follow the rule as stated in each reminder.

If the user declines: continue planning normally and do not raise the workshop again this session.

This placement supersedes the workshop skill's default placement step (scratchpad / do_not_commit): in plan mode the document lives beside the plan file so the write carve-out and collision reservations cover it.

This narrowly extends the plan-mode file exception above: ${jUl(e.workshopOfferDocPath,{form:"full",mode:"offer"})}`:"",s=e.prototypeOffer?`

## Prototype Artifact Option

The prototype skill is available in this session. Offer it at most once, as one short line via ${Sy} at a natural early moment, then stop and wait; if the user declines, continue planning and do not raise prototyping again this session. Make the offer only when the plan is for a new product or UI idea with nothing in the repository to modify yet \u2014 a greenfield build still proving what it should be \u2014 where a working proof-of-concept Artifact the user can open and react to would settle the idea better than a plan on paper. If the plan works within existing code, or the user has asked for the real implementation, do not offer, and do not mention prototyping at all.

If the user accepts: the prototype is built after plan mode ends, never during it \u2014 plan mode stays read-only except the plan file. Write a short plan to the plan file naming the prototype-first approach (prototype the idea as a working Artifact to validate it, then plan the real build from what it proves), present it with ${iT}, and once the user approves and plan mode has ended, invoke the prototype skill to build and publish it.`:"",a=`${_lh}

## Plan File Info:
${t}
You should build your plan incrementally by writing to or editing this file. NOTE that this is the only file you are allowed to edit - other than this you are only allowed to take READ-ONLY actions.${i}${r}${s}

## Plan Workflow

${n}

${o}

${twE}

${QSE(e.workshopOfferDocPath!==void 0||e.workshopActiveDocPath!==void 0)}

### Phase 5: Call ${iT}
${blh(e.workshopActiveDocPath)}

NOTE: At any point in time through this workflow you should feel free to ask the user questions or clarifications using the ${Sy} tool. Don't make large assumptions about user intent. The goal is to present a well researched plan to the user, and tie any loose ends before implementation begins.`;return l_([Cn({content:a,isMeta:!0})])}

// Habia 16 sitios de co-ocurrencia; se emitieron los 6 de mayor cruce. Un contrato con muchas
// realizaciones (una interfaz) los tiene por decenas.
