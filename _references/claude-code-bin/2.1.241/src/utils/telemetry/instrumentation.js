// ==========================================================================
// utils/telemetry/instrumentation.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/utils/telemetry/instrumentation.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 4  (1 cadena, 3 nombre)
//   descartadas por ruido (>400 aparic.) : 3
//   sitios de co-ocurrencia : 5
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

// --- bundle[3145726:3147562]  (1836 B)
//     especificidad 7.219 · 3 anclas — 'com.anthropic.claude_code.events'(×4 g1), 'getLogger'(×27 g1), 'claude_code'(×197 g1)
function u$t(e){let t=yor.of(lr().host);if(e!==void 0&&t.retainedStorageV5===void 0)t.retainedStorageV5=e;if(Lu("1p_event_logging_start"),!Mve()){t.preInitQueue=null;return}let n=_3d();Lu("1p_event_after_growthbook_config");let o=n.scheduledDelayMillis||CMr(process.env.OTEL_LOGS_EXPORT_INTERVAL,RXb),i=n.maxExportBatchSize||LXb,s=n.maxQueueSize||DXb,a=zt(),l={[Yti.ATTR_SERVICE_NAME]:"claude-code",[Yti.ATTR_SERVICE_VERSION]:{ISSUES_EXPLAINER:"report the issue at https://github.com/anthropics/claude-code/issues",PACKAGE_URL:"@anthropic-ai/claude-code",README_URL:"https://code.claude.com/docs/en/overview",VERSION:"2.1.241",FEEDBACK_CHANNEL:"https://github.com/anthropics/claude-code/issues",BUILD_TIME:"2026-08-22T22:46:48Z",GIT_SHA:"c87e2742fc9ad269ec8920460d00a091b1e410f0",DD_SOURCEMAP_GROUP:"default"}.VERSION};if(a==="wsl"){let d=wer();if(d)l["wsl.version"]=d}let c=g3d.resourceFromAttributes(l),u=new gba({maxBatchSize:i,skipAuth:n.skipAuth,maxAttempts:n.maxAttempts,path:n.path,baseUrl:n.baseUrl,isKilled:()=>gor("firstParty"),storageV5:t.retainedStorageV5});if(t.firstPartyEventLoggerProvider=new anr({resource:c,processors:[new nht(u,{scheduledDelayMillis:o,maxExportBatchSize:i,maxQueueSize:s})]}),t.firstPartyEventLogger=t.firstPartyEventLoggerProvider.getLogger("com.anthropic.claude_code.events",{ISSUES_EXPLAINER:"report the issue at https://github.com/anthropics/claude-code/issues",PACKAGE_URL:"@anthropic-ai/claude-code",README_URL:"https://code.claude.com/docs/en/overview",VERSION:"2.1.241",FEEDBACK_CHANNEL:"https://github.com/anthropics/claude-code/issues",BUILD_TIME:"2026-08-22T22:46:48Z",GIT_SHA:"c87e2742fc9ad269ec8920460d00a091b1e410f0",DD_SOURCEMAP_GROUP:"default"}.VERSION),t.lastBatchConfig=n,t.preInitQueue!==null){let d=t.preInitQueue;t.preInitQueue=null;for(let{eventName:p,metadata:f}of d)kUr(p,f)}}

// --- bundle[15638286:15638729]  (443 B)
//     especificidad 7.219 · 3 anclas — 'com.anthropic.claude_code.events'(×4 g1), 'getLogger'(×27 g1), 'claude_code'(×197 g1)
s=xJo.getLogger("com.anthropic.claude_code.events",{ISSUES_EXPLAINER:"report the issue at https://github.com/anthropics/claude-code/issues",PACKAGE_URL:"@anthropic-ai/claude-code",README_URL:"https://code.claude.com/docs/en/overview",VERSION:"2.1.241",FEEDBACK_CHANNEL:"https://github.com/anthropics/claude-code/issues",BUILD_TIME:"2026-08-22T22:46:48Z",GIT_SHA:"c87e2742fc9ad269ec8920460d00a091b1e410f0",DD_SOURCEMAP_GROUP:"default"}.VERSION)

// --- bundle[15644175:15644612]  (437 B)
//     especificidad 7.219 · 3 anclas — 'com.anthropic.claude_code.events'(×4 g1), 'getLogger'(×27 g1), 'claude_code'(×197 g1)
meter:s.getMeter("com.anthropic.claude_code",{ISSUES_EXPLAINER:"report the issue at https://github.com/anthropics/claude-code/issues",PACKAGE_URL:"@anthropic-ai/claude-code",README_URL:"https://code.claude.com/docs/en/overview",VERSION:"2.1.241",FEEDBACK_CHANNEL:"https://github.com/anthropics/claude-code/issues",BUILD_TIME:"2026-08-22T22:46:48Z",GIT_SHA:"c87e2742fc9ad269ec8920460d00a091b1e410f0",DD_SOURCEMAP_GROUP:"default"}.VERSION)

// --- bundle[3136906:3137807]  (901 B)
//     especificidad 4.801 · 2 anclas — 'com.anthropic.claude_code.events'(×4 g1), 'claude_code'(×197 g1)
async doExport(e,t){try{let r=e.filter((i)=>i.instrumentationScope?.name==="com.anthropic.claude_code.events");if(r.length===0){t({code:c$t.ExportResultCode.SUCCESS});return}let n=this.transformLogsToEvents(r).events;if(n.length===0){t({code:c$t.ExportResultCode.SUCCESS});return}if(this.attempts>=this.maxAttempts){t({code:c$t.ExportResultCode.FAILED,error:Error(`Dropped ${n.length} events: max attempts (${this.maxAttempts}) reached`)});return}let o=await this.sendEventsInBatches(n);if(this.attempts++,o.length>0){await this.queueFailedEvents(o),this.scheduleBackoffRetry();let i=this.lastExportErrorContext?` (${this.lastExportErrorContext})`:"";t({code:c$t.ExportResultCode.FAILED,error:Error(`Failed to export ${o.length} events${i}`)});return}this.resetBackoff(),this.retryFailedEvents(),t({code:c$t.ExportResultCode.SUCCESS})}catch(r){He(r),t({code:c$t.ExportResultCode.FAILED,error:kn(r)})}}

// --- bundle[65423:66445]  (1022 B)
//     especificidad 4.289 · 2 anclas — 'eventLogger'(×13 g1), 'claude_code'(×197 g1)
installMeter(e,t,{omitUnits:r=!1}={}){this.#e=e;let n=(o)=>r?void 0:o;this.#t=t("claude_code.session.count",{description:"Count of CLI sessions started"}),this.#r=t("claude_code.lines_of_code.count",{description:"Count of lines of code modified, with the 'type' attribute indicating whether lines were added or removed and the 'model' attribute indicating which model made the change"}),this.#n=t("claude_code.pull_request.count",{description:"Number of pull requests created"}),this.#o=t("claude_code.commit.count",{description:"Number of git commits created"}),this.#i=t("claude_code.cost.usage",{description:"Cost of the Claude Code session",unit:n("USD")}),this.#l=t("claude_code.token.usage",{description:"Number of tokens used",unit:n("tokens")}),this.#a=t("claude_code.code_edit_tool.decision",{description:"Count of code editing tool permission decisions (accept/reject) for Edit, Write, and NotebookEdit tools"}),this.#s=t("claude_code.active_time.total",{description:"Total active time in seconds",unit:n("s")})}

