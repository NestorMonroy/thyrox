// ==========================================================================
// services/api/withRetry.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/services/api/withRetry.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 31  (4 cadena, 27 nombre)
//   descartadas por ruido (>400 aparic.) : 34
//   sitios de co-ocurrencia : 62  (se emiten los 6 de mayor cruce)
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

// --- bundle[10096705:10101212]  (4507 B)
//     especificidad 41.135 · 18 anclas — 'FLOOR_OUTPUT_TOKENS'(×1 g1), 'tengu_api_opus_fallback_triggered'(×2 g1), 'FALLBACK_FOR_ALL_PRIMARY_MODELS'(×3 g1), 'retryContext'(×4 g1), 'abortError'(×14 g1) …
()=>{xq();mr();Ve();st();Bs();by();Mr();Ng();LLt();zNn();YQ();x9f={litellm:{prefixes:["x-litellm-"]},helicone:{prefixes:["helicone-"]},portkey:{prefixes:["x-portkey-"]},"cloudflare-ai-gateway":{prefixes:["cf-aig-"]},kong:{prefixes:["x-kong-"]},braintrust:{prefixes:["x-bt-"]}},etw={databricks:[".cloud.databricks.com",".azuredatabricks.net",".gcp.databricks.com"]};ttw=["invalid_request_error","authentication_error","billing_error","permission_error","not_found_error","request_too_large","rate_limit_error","timeout_error","api_error","overloaded_error"];ntw=[["cloudflare",/cloudflare/],["envoy",/envoy|istio/],["nginx",/nginx|openresty/],["apigee",/apigee/],["akamai",/akamai/],["aws",/awselb|amazon|cloudfront/],["azure",/azure/],["google",/^(gws|gfe|esf|gse)\b|google/],["iis",/microsoft-iis/],["apache",/apache/],["zscaler",/zscaler/],["netskope",/netskope/],["bluecoat",/bluecoat|symantec/],["forcepoint",/forcepoint|websense/],["f5",/big-?ip|\bf5\b/],["netscaler",/netscaler|citrix/],["squid",/squid/],["haproxy",/haproxy/],["traefik",/traefik/],["kestrel",/kestrel/],["python",/uvicorn|gunicorn|hypercorn/]];itw=["target","proxy","policy","apigee","mp"],stw=["flow.APITimedOut","flow.SharedFlowNotFound","messaging.adaptors.http.flow.ApplicationNotFound","messaging.adaptors.http.flow.DecompressionFailureAtRequest","messaging.adaptors.http.flow.DecompressionFailureAtResponse","messaging.adaptors.http.flow.ErrorResponseCode","messaging.adaptors.http.flow.GatewayTimeout","messaging.adaptors.http.flow.LengthRequired","messaging.adaptors.http.flow.NoActiveTargets","messaging.adaptors.http.flow.ServiceUnavailable","messaging.adaptors.http.flow.SslHandshakeFailed","messaging.adaptors.http.flow.UnexpectedEOFAtTarget","messaging.runtime.RouteFailed","messaging.runtime.TargetMissing","protocol.http.BadPath","protocol.http.DuplicateHeader","protocol.http.ProxyTunnelCreationFailed","protocol.http.Response405WithoutAllowHeader","protocol.http.TooBigBody","protocol.http.TooBigHeaders","protocol.http.TooBigLine","protocol.http.UnsupportedEncoding","policies.ratelimit.QuotaViolation","policies.ratelimit.SpikeArrestViolation","policies.ratelimit.InvalidMessageWeight","policies.concurrentratelimit.ConcurrentRatelimitViolation","steps.raisefault.RaiseFault","steps.jsonthreatprotection.ExecutionFailed","steps.regexprotection.ThreatDetected","steps.servicecallout.ExecutionFailed","steps.javascript.ScriptExecutionFailed","oauth.v2.InvalidAccessToken","oauth.v2.InvalidApiKey","oauth.v2.InvalidApiKeyForGivenResource","oauth.v2.FailedToResolveAPIKey","keymanagement.service.access_token_expired","keymanagement.service.access_token_not_approved","keymanagement.service.invalid_access_token","keymanagement.service.consumer_key_expired","keymanagement.service.invalid_consumer_key","keymanagement.service.InvalidAPICallAsNoApiProductMatchFound","security.util.KeyAliasNotFound"],atw=["messaging","protocol","flow","steps","policies","security","keymanagement","oauth","mintstep","scripts"];utw=new Set(["via","x-cache","x-cache-hits","x-served-by","x-varnish","age","cf-ray","cf-cache-status","x-request-id","x-correlation-id","x-forwarded-for","x-powered-by","x-squid-error","proxy-authenticate","proxy-connection","www-authenticate","server-timing","retry-after","x-should-retry","content-encoding","transfer-encoding","x-accel-buffering","traceparent","x-cloud-trace-context","cf-mitigated","x-iinfo"]),dtw=["anthropic-","x-amz-","x-amzn-","x-ms-","x-azure-","x-goog-","x-envoy-","x-apigee-","x-akamai-","x-zscaler-","x-databricks-",...Object.values(x9f).flatMap(({prefixes:e})=>e)];ptw=/^(event|data|id|retry)?:/;mtw=["message_start","message_delta","message_stop","content_block_start","content_block_delta","content_block_stop"];gtw={empty:"empty body","event-stream":"body is an event stream (the non-streaming request was answered with a stream)",html:"body is an HTML page",xml:"body is an XML document","json-text":"body is JSON served under a non-JSON content-type","json-not-message":"body is JSON but not a Message","other-text":"body is unrecognized text",other:"body is unrecognized"};kOi=class kOi extends gt{name="UnexpectedApiResponseError";bodyKind;bodyBytes;response;constructor(e){let t=ytw(e);super(`API returned an empty or malformed response (HTTP ${e.status??"unknown"}) \u2014 check for a proxy or gateway intercepting the request.${t.summary}`,"API returned an empty or malformed response");this.bodyKind=t.bodyKind,this.bodyBytes=t.bodyBytes,this.response=t.response}}}

// --- bundle[16692464:16753421]  (60957 B)
//     especificidad 20.349 · 9 anclas — 'tengu_api_opus_fallback_triggered'(×2 g1), 'retryContext'(×4 g1), 'delayMs'(×18 g1), 'fallback_model'(×29 g1), 'original_model'(×31 g1) …
//     ATRIBUCION NO DISCRIMINADA — esta misma region la reclaman: bootstrap/state.ts, services/api/promptCacheBreakDetection.ts, utils/api.ts
//     REGION ANCHA (60957 B) — muy por encima de la mediana; puede envolver varios modulos.
async function*Wfh(e,t,r,n,o,i){let s=$o(i.model);if(!ds()&&(p$e(s)||p2r(s)||f2r(s))&&(await Uve("tengu-off-switch",{activated:!1})).activated){N("tengu_off_switch_query",{}),yield kQi(Error(p2r(s)?v3t:b3t),i.model);return}let a=null;try{a=await Xyp(s)}catch(Ot){E(`tengu-model-error-overrides block check failed: ${Ot}`,{level:"error"})}if(a!==null){if(i.fallbackModel!==void 0)throw N("tengu_off_switch_query",{tier:Ce("per_model_block"),outcome:Ce("fallback")}),new Zoe(i.model,i.fallbackModel,"model_blocked");N("tengu_off_switch_query",{tier:Ce("per_model_block")}),yield Xd({content:a,error:"rate_limit"});return}let l=t0E(e),c=den(e,i.agentContext),u=n0E(e),d=lo()==="bedrock"&&i.model.includes("application-inference-profile")?await jrr(fd(i.model))??i.model:i.model;if(Ues(i.model,i.querySource),Bes())await ofh(i.model);IS("query_tool_schema_build_start");let p=i.querySource.startsWith("repl_main_thread")||i.querySource.startsWith("agent:")||i.querySource==="sdk"||i.querySource==="hook_agent",f=S2r(i.model,{isAgenticQuery:p}),m=$o(d);if(rge()&&hB())f.push(sma);let h=i.fallbackCreditCode!==void 0&&i.fallbackCreditMintModel!==void 0&&f0E(i.fallbackCreditMintModel,i.model),g=h?i.fallbackCreditMintModel:void 0,y=g??i.model,_=p?OLi(i.advisorModel,y):void 0,b=await Clo(y,n,i.getToolPermissionContext,i.agents,"query",i.credentials),S=new Set;if(b){for(let Ot of n)if(ahe(Ot))S.add(Ot.name)}if(b&&S.size===0&&!i.hasPendingMcpServers)E("Tool search disabled: no deferred tools available to search"),b=!1;let w;if(b){let Ot=SFe(e);w=n.filter((_r)=>{if(!S.has(_r.name))return!0;if(al(_r,SH))return!0;return Ot.has(_r.name)})}else w=n.filter((Ot)=>{if(al(Ot,SH))return!1;return!0});let H=llh(w),T=Iw(i.model),k=b?VBd():null;if(k&&T!=="bedrock"){if(!f.includes(k))f.push(k)}let C=IMt(),x=(Ot)=>b&&(S.has(Ot.name)||QHE(Ot)),I=C&&w.some((Ot)=>Ot.isMcp===!0&&!x(Ot));if(C&&!f.includes(n2r))f.push(n2r);let P=C?I?"none":"system_prompt":"none",M=await Promise.all(H.map((Ot)=>aVi(Ot,{getToolPermissionContext:i.getToolPermissionContext,tools:n,agents:i.agents,allowedAgentTypes:i.allowedAgentTypes,model:y,deferLoading:x(Ot)})));if(b){let Ot=sfh();if(Ot&&!w.some((mn)=>al(mn,MGr)))M.splice(Math.max(M.length-1,0),0,Ot);let _r=Zt(w,(mn)=>S.has(mn.name));E(`Dynamic tool loading: ${_r}/${S.size} deferred tools included`)}if(IS("query_tool_schema_build_end"),N("tengu_api_before_normalize",{preNormalizedMessageCount:e.length}),IS("query_message_normalization_start"),g!==void 0)N("tengu_fallback_credit_strip_as_mint_model",{});let D=i.stickyBetas??IP(),F=LY(D,F8),U=F||LY(D,WZ);if(f=f.filter((Ot)=>!(F&&Ot===F8)&&!(U&&Ot===WZ)),g!==void 0){let Ot=S2r(g,{isAgenticQuery:p}),_r=(mn)=>{if(Ot.includes(mn)){if(!f.includes(mn))f.push(mn)}else f=f.filter((Fn)=>Fn!==mn)};if(!F)_r(F8);if(!U)_r(WZ);_r(u$e)}let G=HQ(d,i.effortValue),Q=QP(d)&&G!==void 0?T5e(G):void 0,Y=O4(i.agentContext)&&(i.querySource.startsWith("repl_main_thread")||i.querySource==="sdk"),W=(Ot)=>{if(!Y||Ot===void 0)return{};try{let _r=bir(d);return{isDefaultEffort:Ot===_r,defaultEffortLevel:_r}}catch(_r){return He(kn(_r)),{}}},V=typeof G==="string"&&!(r.type==="disabled"&&r.mechanical===!0)?Q:void 0,{messagesPreNormalize:j,messagesForAPI:B,midConvFallback:Z}=m0E(e,{model:i.model,bodyModel:y,tools:w,betas:f,midConvLatchedOff:F,useToolSearch:b,advisorModel:_,resumeIncompleteThinking:i.resumeIncompleteThinking,perTurnEffort:V,traceSources:i.onWireMessagesBuilt!==void 0}),K=B,ne=Z,ie=!1;if($Qi(K)){let Ot=Fq()?Znm({fromModel:uch(K),sticky:D,serverDefaultFallbacksEnabled:()=>nt(SBi,!1)}):null,_r=Ot!==null&&!LY(D,Ot);if(_r)jze(D,Ot);N("tengu_rotunda_pennant_replay",{echo_eligible:_r,category:Ot!==null&&Ot===Xx})}N("tengu_api_after_normalize",{postNormalizedMessageCount:K.length,apiSystemMessageCount:Zt(K,(Ot)=>Ot.type==="api_system")});let X=Kph(j);t=Um([yyi(X,i.agentContext,l,c),Iii({isNonInteractive:i.isNonInteractiveSession,hasAppendSystemPrompt:i.hasAppendSystemPrompt}),...t,..._?[pBf]:[]].filter(Boolean)),Gph(t);let te=i.enablePromptCaching??jtn(y),re=EEe(i.querySource)?"1h":void 0;if(Y)WGs(re==="1h"?Vhr:feo);let de=y0E(t,te,{skipGlobalCacheForSystemPrompt:I,cacheTtl:re}),oe=f.length>0,ee=[...i.extraToolSchemas??[]];if(_)ee.push({type:"advisor_20260301",name:"advisor",model:_});let se=[...M,...ee],Se=Ju()&&i3()&&!HGe()&&Bk(y)&&!!i.fastMode;if(jq&&p&&iha()&&X4())jze(D,jq);let ge=jq?rXe(D,jq):!1;if(Se)jze(D,o2r);let he=rXe(D,o2r),fe=!1;if(o0E())jze(D,fht);if(fe=rXe(D,fht),i.evictCacheOnComplete&&i.stickyBetas!==void 0&&i0E())jze(D,pht);let we=rXe(D,pht),Ie=(Pfh(),ln(Dfh)).createContextHintController({querySource:i.querySource,includeFirstPartyBetas:hB(),is529Error:Qle}),xe=void 0;if(fFe()){let Ot=se.filter((_r)=>!(("defer_loading"in _r)&&_r.defer_loading));Q9f({system:de,toolSchemas:Ot,anyDeferLoading:Ot.length!==se.length,querySource:i.querySource,model:i.model,agentId:i.agentId,fastMode:he,globalCacheStrategy:P,betas:I4(f),autoModeActive:ge,isUsingOverage:qB().isUsingOverage??!1,is1hCacheTTL:re==="1h",queryDepth:i.queryTracking?.depth,cacheDiagnosis:fe,effortValue:G,extraBodyParams:avr(),messagesForAPI:K})}let Ne=pj()?{systemPrompt:t.join(`

`),userSystemPrompt:i.userSystemPrompt,querySource:i.querySource,tools:Re(se)}:void 0,Ye=Inp(i.model,i.agentContext,Ne,K,Se),Fe=performance.now(),Ue=performance.now(),je=0,ze=[],Ge=void 0,De=void 0,We=void 0,Ze=void 0,it=void 0,Kt=!1,mt=!1,at=xyi(),bt=void 0,xt,yt=dSi(),Ct=null;function lt(){if(Ct!==null)clearTimeout(Ct),Ct=null}function pr(){if(lt(),h0E(Ge),Ge=void 0,it)it.body?.cancel().catch(()=>{}),it=void 0}let Pt=[],Ut=!1,vt="none",Wt=!1,Dt=!1;if(i.fallbackCreditCode!==void 0&&!h)N("tengu_fallback_credit_skipped",{reason:Ce("backend_unknown_or_mismatch"),mint_request_id:un(i.fallbackCreditMintRequestId),mint_model:gu(i.fallbackCreditMintModel),model:gu(i.model),query_source:_7(i.querySource)});let hr=h?i.fallbackCreditCode:void 0,dr=(Ot)=>(i.fallbackCreditCode?Ot.split(i.fallbackCreditCode).join("[FCT_REDACTED]"):Ot).slice(0,600),ur=!1,Te=!1,Le=!1,et=!1,ct=!1,Ke=!1,ot=(Ot,_r,mn)=>{if(!ur||ct)return;ct=!0,N("tengu_fallback_credit_outcome",{outcome:me(Ot),mint_request_id:un(i.fallbackCreditMintRequestId),mint_model:gu(i.fallbackCreditMintModel),request_id:un(_r),client_request_id:un(Ze),model:gu(i.model),query_source:_7(i.querySource),...mn!==null&&{input_tokens:mn.input_tokens,output_tokens:mn.output_tokens,cache_read_input_tokens:mn.cache_read_input_tokens,cache_creation_input_tokens:mn.cache_creation_input_tokens,cache_creation_5m_input_tokens:mn.cache_creation?.ephemeral_5m_input_tokens??0,cache_creation_1h_input_tokens:mn.cache_creation?.ephemeral_1h_input_tokens??0,service_tier:io(mn.service_tier),speed:io(mn.speed)}})},kt=!1,_t=!1,Ft=(Ot)=>{let _r=[...f];if(!_r.includes(a7)&&YZo(Ot.model)!==null)_r.push(a7);let mn=Iw(Ot.model),Fn=mn==="bedrock"&&jq&&ge&&p&&nQo();if(Fn)E(`auto-mode 3P: sending afk-mode beta '${jq?.header}' to bedrock via body.anthropic_beta`);let Ao=mn==="bedrock"?[...KBd(Ot.model),...k?[k]:[],...Fn&&jq?[jq]:[]]:[],Vo=avr(Ao);qHE(Vo,mn==="bedrock"&&_r.includes(F8));let Yi={...Vo.output_config??{}};delete Vo.output_config,KHE(G,Yi,Vo,_r,d),YHE(i.taskBudget,Yi,_r),XHE(i.outputFormat,Yi,_r,i.model);let Ha=i.refusalFallbackSilentArmActive===!0,El=Wnm(i.serverRefusalFallback,Ot.model,_r,D,Ha);Ut=El.fallbacks!==void 0,vt=El.fallbacks==="default"?"default":Ut?"explicit":"none",Vnm(i.fallbackCreditLaneArmed===!0||i.fallbackCreditCode!==void 0,_r,D,Ha,mn==="bedrock"?Vo:void 0),et=_r.includes(qZ);let Vs=Hlr(d),No=Math.min(Ot?.maxTokensOverride||i.maxOutputTokensOverride||Vs,Vs),Wl=Vn(process.env.CLAUDE_CODE_DISABLE_THINKING),au=r.type!=="disabled"&&!Wl,Cu=au&&hB()&&HNn(d),Lp=Cu?r.display:void 0,Hh=void 0;if(au&&oha(d)){let hu=Vn(process.env.CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING)&&(m.includes("opus-4-6")||m.includes("sonnet-4-6")),xa=tWs(i.model);if(xa!==void 0?xa==="adaptive":b2r(d)&&!hu)Hh={type:"adaptive",display:Lp};else{let Ou=jBd(d);if(r.type==="enabled"&&r.budgetTokens!==void 0)Ou=r.budgetTokens;Ou=Math.max(1024,Math.min(No-1,Ou)),Hh={budget_tokens:Ou,type:"enabled",display:Lp}}}else if(r.type==="disabled"&&lo()==="firstParty"&&!Wl&&oha(d)&&!0&&!_2r(d))Hh={type:"disabled"};let Uc=r.type==="disabled"?void 0:r.display,pu="none";try{pu=Zph(Uc,d)}catch(hu){He(hu)}let gc=()=>{let hu=_r.indexOf(U1n);if(hu!==-1)_r.splice(hu,1)};if(Hh&&Lp)gc();switch(pu){case"thinking_and_connector_text":case"none":break;case"connector_text":{if((Hh?.type==="adaptive"||Hh?.type==="enabled")&&Cu&&lo()==="firstParty"&&Fm()&&!XZe()&&!("thinking"in Vo)&&!q.CLAUDE_CODE_SIMULATE_PROXY_USAGE){if(Hh={...Hh,display:"updates"},!_r.includes(vZo))_r.push(vZo);gc()}break}}let Nl=Hh?.type==="enabled"||Hh?.type==="adaptive"||Hh===void 0&&_2r(d),Sd=i.toolChoice;if(Sd?.type==="tool"&&Nl)E(`tool_choice {type:'tool', name:'${Sd.name}'} demoted to auto: extended thinking is active`),Sd={type:"auto"};if(r.type==="disabled"&&r.mechanical===!0&&Hh?.type==="disabled"&&typeof Yi.effort==="string"&&lop(Yi.effort))E(`output_config.effort '${Yi.effort}' clamped to '${wsi}': mechanically-disabled thinking, and the API rejects higher effort when thinking is disabled (gh-79798)`),Yi.effort=wsi;let Zf=Yph({hasThinking:au}),fu=i.enablePromptCaching??jtn(g??Ot.model),si;if(Ju()&&i3()&&!HGe()&&Bk(y)&&!!Ot.fastMode)si="fast";if(he&&!_r.includes(o2r))_r.push(o2r);if(jq&&ge&&iha()&&p&&!_r.includes(jq)){if(_r.push(jq),nQo())E(`auto-mode 3P: sending afk-mode beta '${jq.header}' to ${mn} via betas header`)}if(re==="1h"&&hB()&&!_r.includes(Anr))_r.push(Anr);let Vd=null,zf=Ie?.buildRequestParams(K);if(zf)_r.push(zf.beta),Vd=zf.body;let kd=null;if(we&&fu){if(!_r.includes(pht))_r.push(pht);kd={cache_control:{type:"ephemeral",...re&&{ttl:re},evict_on_complete:!0}}}if(fe&&!_r.includes(fht))_r.push(fht);let Gf=Vn(process.env.CLAUDE_CODE_SIMULATE_PROXY_USAGE),Xg=Gf?_r.filter((hu)=>hu===bMt):_r;if(Gf)E(`[API:client] SIMULATE_PROXY_USAGE: stripping ${_r.length-Xg.length} beta headers from request (keeping ${I4(Xg).join(", ")||"none"}): ${I4(_r).join(", ")}`);let Fl=!au&&rQo(d)?i.temperatureOverride??1:void 0;Pt=I4(Xg);let ed=lha(Xg),bg=oe&&(!Gf||Xg.length>0)&&(ed.includes(B8)||Xx!==null&&ed.includes(Xx));if(Wt=bg&&$Qi(K),i.onWireMessagesBuilt!==void 0){let hu=K;if(kRn(hu))try{hu=$U(hu),ter(hu)}catch{}i.onWireMessagesBuilt(hu)}let ll=g0E(dch(K,bg),fu,re,i.skipCacheWrite,i.forkPointUuid,LY(D,z1n)||iWs(),mn);ie=ll.some((hu)=>hu.role==="system"&&Array.isArray(hu.content)&&hu.content.some((od)=>typeof od==="object"&&od!==null&&("cache_control"in od)&&od.cache_control!=null));let If={model:fne(i.model),messages:ll,system:de,tools:hMp(se,i.model),tool_choice:Sd,...oe&&(!Gf||Xg.length>0)&&{betas:I4(lha(Xg))},metadata:jFt({agentContext:i.agentContext}),max_tokens:No,thinking:Hh,...Fl!==void 0&&{temperature:Fl},...Zf&&oe&&_r.includes(Enr)&&{context_management:Zf},...!Gf&&Vd?Vd:{},...!Gf&&kd?kd:{},...El,...Vo,...Object.keys(Yi).length>0&&{output_config:Yi},...si!==void 0&&{speed:si},...fe&&p&&oe&&!Gf?{diagnostics:{previous_message_id:u??null}}:{}},Hb=VHE(If.thinking,i.querySource,!kt);if(Hb!==If.thinking)kt=!0,If.thinking=Hb;if(kRn(If)){try{If=$U(If)}catch{}if(ter(If),!_t)_t=!0,N("tengu_lone_surrogate_sanitized",{source:Ce("queryModel")})}let wi=If.output_config?.effort;return xe=typeof wi==="string"&&yme(wi)?wi:void 0,If};{let Ot=Ft({model:i.model}),_r=Ot.messages.length,mn=oe?Ot.betas??[]:[],Fn=Ot.thinking?.type??"disabled",Ao=Q;i.getToolPermissionContext().then((Vo)=>{bKf({model:i.model,messagesLength:_r,temperature:i.temperatureOverride??1,betas:mn,permissionMode:Vo.mode,proactivityLevel:i.proactivityLevel,querySource:i.querySource,messageClientPlatform:i.messageClientPlatform,queryTracking:i.queryTracking,thinkingType:Fn,effortValue:Ao,fastMode:Se,previousRequestId:l})})}let Qe=[],Gt=0,Vt=0,dn=0,Ur=void 0,an=[],An=BC,tn=0,Sr=null,Br=!1,Xr="none",Qn=!1,Xt,Vr=0,Nn=void 0,Pr=void 0,sr,Gr=Se,Tn=!1,Rn=new Map,gr=3,Fr={value:0},Ln=2,mi=0,Ni=0,ci=!1,xr=1,oo=0,vr=0,Kr=!1,hn=!1,Mn=!1,Zr=!1,ho=!1,Hi,Oo=(Ot,_r)=>{if(!(Ot instanceof $s)||Ot.status!==400)return;let mn=Ot.message.includes("`fallback-credit-"),Fn=Xx!==null&&Ot.message.includes(`\`${Xx.header}`),Ao=(Xx!==null?new RegExp(`\`server-side-fallback-(?!${Xx.header.slice(21)})`):/`server-side-fallback-/).test(Ot.message),Vo=(El)=>{E(`[server-fallback] 400 attributed (${El}) \u2014 stripping and retrying`,{level:"warn"});let Vs=vt;N("tengu_rotunda_pennant_strip",{shape:me(El),mode:me(Vs),non_streaming:_r==="sync",query_source:_7(i.querySource),sticky_scope:i.stickyBetas===void 0?Ce("session"):qP(i.querySource)==="main"?Ce("detached_main"):qP(i.querySource)==="subagent"?Ce("agent"):Ce("aux")})},Yi=Kah(Ot);if(Yi!==void 0&&!Te){if(Te=!0,hr=void 0,Yi==="credit_beta_header"){if(Hq(D,qZ),Fn&&Xx!==null)Hq(D,Xx),Dt=!0;if(Ao)Hq(D,B8),Mn=!0;if(Fn&&Wt&&!LY(D,B8))jze(D,B8)}if(_r==="stream")ot(Yi,Ot.requestID??null,null);return Vo(Yi),"retry:fallback-credit-strip"}let Ha=Vah(Ot);if(Xx!==null&&(Ha==="category_beta_header"||Ha==="default_unconfigured"&&Ut)&&!Dt){if(Dt=!0,Hq(D,Xx),mn)Hq(D,qZ),Te=!0,hr=void 0;if(Ao)Hq(D,B8),Mn=!0;if(Wt&&!LY(D,B8))jze(D,B8);return Vo(Ha),"retry:server-fallback-category-strip"}if(Ha!==void 0&&(Ut||Ha==="beta_header")&&!Mn){if(Mn=!0,Hq(D,B8),Ha==="beta_header"&&mn)Hq(D,qZ),Te=!0,hr=void 0;return Vo(Ha),"retry:server-fallback-strip"}if(deo(Ot))return;if(_r==="sync"&&qs(Ot))return;if(_r==="stream"&&ur&&!Te)return Te=!0,ot("unattributed_400_dropped",Ot.requestID??null,null),Vo("unattributed"),"retry:fallback-credit-unattributed";if((Ut||Wt)&&!Mn){if(Mn=!0,Hq(D,B8),Xx!==null)Hq(D,Xx);return Vo("unattributed"),"retry:server-fallback-strip"}if(et&&!Le)return Le=!0,Hq(D,qZ),Vo("unattributed"),"retry:fallback-credit-header-strip";return},qs=(Ot)=>EQi(Ot)||CUl(Ot)||bQi(Ot)!==void 0||xUl(Ot)||IUl(Ot)||TQi(Ot)!==null||PUl(Ot)||AQi(Ot)||LUl(Ot)||DUl(Ot)||HQi(Ot),ms=(Ot)=>{let _r=AQi(Ot),mn=f.includes(WZ)&&DUl(Ot)&&!HQi(Ot);if(ne&&(_r||mn)){if(K=_r?ne():yfh(K),ne=null,_r)f=f.filter((Fn)=>Fn!==F8&&Fn!==WZ),Hq(D,F8);if(mn)f=f.filter((Fn)=>Fn!==WZ),Hq(D,WZ),be("api_per_turn_effort","server_rejected");return E(mn?'[per-turn-control] server rejected the per-turn effort statement \u2014 falling back to a body with no {role:"system"} turn, sticky-rejecting the beta until /clear or /compact':'[mid-conv-system] server rejected role:"system" \u2014 falling back to a body with no {role:"system"} turn, sticky-rejecting the beta until /clear or /compact',{level:"warn"}),N("tengu_mid_conv_system_fallback_retry",{per_turn_effort:mn}),"retry:mid-conv-system"}if(ie&&!LY(D,z1n)&&LUl(Ot))return Hq(D,z1n),sWs(),E("[mid-conv-system] proxy rejected cache_control on the api_system tail \u2014 demoting the breakpoint to the trailing message for this conversation",{level:"warn"}),be("api_midconv_cache_proxy","proxy_rejected"),"retry:api-system-cache-demote";return},go=()=>{if(ie&&!LY(D,z1n)&&!LY(D,dma))Hq(D,dma),Ee("api_midconv_cache_proxy")},Qi=()=>{if(!aWs()&&f.includes(WZ))lWs(),Ee("api_per_turn_effort")},is=(Ot)=>{if(!HQi(Ot))return null;if(pjo(i.model),d!==i.model)pjo(d);return E(`[effort] model ${i.model} rejected output_config.effort; latching unsupported and retrying without it.`,{level:"warn"}),N("tengu_effort_unsupported_retry",{model:gu(i.model)}),"retry:effort-unsupported"},Er=(Ot)=>{let _r=i.serverRefusalFallback!==void 0?(Ot.content??[]).reduce((El,Vs,No)=>vBi(Vs)?No:El,-1):-1,mn=Ot.stop_reason==="refusal",Fn,Ao=0,Vo=!1,Yi=[];for(let[El,Vs]of(Ot.content??[]).entries()){if(!vBi(Vs)){if(El<_r&&Vs.type!=="text"||mn&&_r>=0){Ao++,Vo||=Vs.type==="tool_use";continue}Yi.push(Vs);continue}let No=Ynm(Vs);if(No===void 0){fr("warn","cli_malformed_fallback_block"),N("tengu_rotunda_pennant_malformed",{block_index:El,non_streaming:!0}),be("refusal_fallback","malformed_fallback_block",{non_streaming:!0});continue}Yi.push(V_l(No)),Fn=No;let Wl=vt;if(N("tengu_rotunda_pennant_materialized",{armed:i.serverRefusalFallback!==void 0,mode:me(Wl),block_index:El,non_streaming:!0}),No.reason==="refusal")yeo({model:d,requestId:De||void 0,querySource:i.querySource,effort:Q,fastMode:Gr,attempt:je,attribution:yce(i.querySource,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool),serverFallbackHop:!0,agentContext:i.agentContext})}if(Yi.length===0&&(Ot.content??[]).length>0)Yi.push({type:"text",text:XR,citations:[]});let Ha=i.serverRefusalFallback!==void 0?pyr(Ot.usage):void 0;if(Zr=Ha?.servedFallbackModel!==void 0||i.serverRefusalFallback!==void 0&&Fn!==void 0,ho=!1,Ke=!1,Hi=Ha,Ao>0)N("tengu_rotunda_pennant_sync_dropped",{dropped_count:Ao,had_tool_use:Vo,chain_exhausted:mn});return{content:Yi,lastHop:Fn,iterations:Ha}};function*jn(Ot,_r,mn){if(mn!==void 0&&!Ke){Ke=!0;let No=mEe(BC,_r.usage);N("tengu_fallback_credit_minted",{request_id:un(De),model:gu(i.model),fallback_target_model:gu(i.refusalFallbackModel??(i.serverRefusalFallback!==void 0&&!Zr?i.serverRefusalFallback.model:void 0)),token_length:mn.length,input_tokens:No.input_tokens,output_tokens:No.output_tokens,cache_read_input_tokens:No.cache_read_input_tokens,cache_creation_input_tokens:No.cache_creation_input_tokens,cache_creation_5m_input_tokens:No.cache_creation?.ephemeral_5m_input_tokens??0,cache_creation_1h_input_tokens:No.cache_creation?.ephemeral_1h_input_tokens??0,service_tier:io(No.service_tier),speed:io(No.speed),query_source:_7(i.querySource),...i.queryTracking&&{query_chain_id:un(i.queryTracking.chainId),query_depth:i.queryTracking.depth}})}let Fn=i.serverRefusalFallback!==void 0?Ot.lastHop?.model??Ot.iterations?.servedFallbackModel:void 0;if(!ho&&Fn!==void 0)ho=!0,yield{type:"server_fallback",fromModel:Ot.lastHop?.fromModel??i.model,toModel:Fn,reason:Ot.lastHop!==void 0?"refusal":"sticky",apiRefusalCategory:Ot.lastHop?.category??null,midStream:!1,requestId:De??null,discardedMessages:[],retainedMessages:[],retainedText:"",finalStopReason:_r.stop_reason};let Ao=i.refusalFallbackModelLane==="silent",Vo=!Ao?i.refusalFallbackModel??(i.serverRefusalFallback!==void 0&&!Zr?i.serverRefusalFallback.model:void 0):void 0,Yi=i.refusalFallbackCascadeHop,Ha=_r.stop_reason==="refusal"&&Vo!==void 0&&Yi===void 0?dIa({originalModelCanonical:$o(i.model),armedFallbackModel:Vo,apiRefusalCategory:_r.stop_details?.category??null,armedTargetIsRefusingModel:kZr(i.model,Vo),resolveTarget:(No)=>JZr({mappedTarget:No,armedFallbackModel:Vo,refusingModel:i.model,triedModels:[Lyr(i.model)]}),routesOverride:fQi()}):void 0,El=Ha!==void 0?Ha.model:Vo;if(Ha!==void 0)pQi({route:Ha,model:i.model,armedFallbackModel:Vo,apiRefusalCategory:_r.stop_details?.category,requestId:De});if(_r.stop_reason==="refusal"&&El!==void 0)return yield{type:"fallback_request",trigger:"refusal",originalModel:i.model,fallbackModel:El,requestId:De??null,apiRefusalCategory:_r.stop_details?.category??null,apiRefusalExplanation:_r.stop_details?.explanation??null,creditCode:mn??null,...cIa(Ha,Yi)},!0;let Vs=Ryr(_r.stop_reason,_r.stop_details,De,Fn??i.model);if(Vs){let No=Wze()||aXe()!==void 0;if(Vo!==void 0||i.refusalFallbackModel!==void 0||h3t(i.model)&&xX()||y3t()||No)pe("refusal_fallback",Ha?.matched==="none"?"route_declined":Ao?"sync_silent_stood":Fn!==void 0?"server_chain_exhausted":No?"client_chain_exhausted":h3t(i.model)&&hQi()?"disabled_by_config":"not_armed",{convolute_arcades:y3t(),armed:Vo!==void 0,model_scope:me(QIe(i.model))});yield{type:"refusal_no_fallback",originalModel:i.model,requestId:De??null,apiRefusalCategory:_r.stop_details?.category??null,apiRefusalExplanation:_r.stop_details?.explanation??null},yield Vs}return!1}let pn=!1,In=new Map,zo=new Set,Po=new Set,vo,cs=$ti(i.agentContext)??(i.isBackgroundAgent?i.agentId:void 0);try{yhr("api_call",cs);e:for(;;){let Gf=function(){if(zf!==null)clearTimeout(zf),zf=null;if(kd)kd=!1,i.onRetryStatus?.(null);if(mu!==null)clearTimeout(mu),mu=null;if(Vd!==null)clearTimeout(Vd),Vd=null},Xg=function(){if(!i.onRetryStatus||!mn)return;let ll=mn.lastAt,If=performance.now();zf=setTimeout(()=>{if(performance.now()-If<Zzl/2)return;if(mn.lastAt>ll){Xg();return}let Hb=performance.now()-mn.lastAt;if(Tn&&Hb<Zf){Xg();return}let wi=mn.lastAt===0?performance.now()-Fn:Hb;kd=!0,i.onRetryStatus?.({kind:"stalled",deadline:Date.now()+Math.max(0,Sd-wi)})},Zzl),zf.unref?.()},Fl=function(){if(Gf(),Xg(),!pu)return;let ll=performance.now();mu=setTimeout((If,Hb)=>{if(performance.now()-Hb<If)return;E(`Streaming idle warning: no chunks received for ${If/1000}s`,{level:"warn"}),fr("warn","cli_streaming_idle_warning")},Nl,Nl,ll),Vd=setTimeout(()=>{fu=!0,si=performance.now(),E(`Streaming idle timeout: no chunks received for ${gc/1000}s, aborting stream`,{level:"error"}),fr("error","cli_streaming_idle_timeout"),N("tengu_streaming_idle_timeout",{model:i.model,request_id:l6(De),timeout_ms:gc,tier:Ce("event")}),pr()},gc)};xt=void 0,IS("query_client_creation_start");let Ot=IOi(()=>She({maxRetries:0,model:i.model,fetchOverride:i.fetchOverride,source:i.querySource,agentContext:i.agentContext,credentials:i.credentials}),async(ll,If,Hb)=>{ot("attempt_errored",De??null,null),je=If,Gr=Hb.fastMode??!1,Ue=performance.now(),xt=void 0,ze.push(Ue),IS("query_client_creation_end");let wi=Ft(Hb);if(jfh(wi),YRn(wi,i.querySource,O4(i.agentContext)),UOi({...wi,stream:!0},i.querySource),Vr=wi.max_tokens,IS("query_api_request_sent"),E(`[API:timing] dispatching to ${Iw(i.model)} model=${i.model}`),!i.agentId){if(A2("api_request_sent"),If===1&&!Vt)Vt=performance.now(),dn=Date.now(),Lwm()}lt();let hu=Vy(process.env.CLAUDE_SLOW_FIRST_BYTE_MS)||30000;Ct=setTimeout(()=>{Ct=null;let Pg=performance.now()-Ue;E(`Slow first byte: no stream chunk ${(Pg/1000).toFixed(1)}s after request sent (attempt ${If})`,{level:"warn"}),N("tengu_api_slow_first_byte",{model:i.model,provider:Bfe(),attempt:If,elapsed_ms:Math.round(Pg)})},hu);let xa=zfh(Ye,ze.length);Ze=xa.clientRequestId;let od=xa.headers;if(mt=Fq()&&kWr(),mt)od[dWn]=byi;if(Kt=!mt&&(i.queryTracking?.depth??0)>0&&(qP(i.querySource)!=="auxiliary"||i.querySource==="compact")&&lo()==="firstParty"&&Fm()&&cr().cachedExtraUsageDisabledReason!==null&&nt("tengu_lantern_spool",!1),Kt)od[dWn]="extended";if(hn=!1,!Kr&&!mt&&qP(i.querySource)!=="auxiliary"&&Fq()&&(Ru.CLAUDE_CODE_DISPATCH_V2S??nt("tengu_cedar_lattice",!1)))od[Xzl]=Mfh,hn=!0,E(`[dispatch] sent ${Xzl}=${Mfh}`);if(i.fallbackStampFromModel!==void 0&&lo()==="firstParty"&&Fm())for(let[Pg,Fo]of[[fUl,i.fallbackStampFromModel],[mUl,i.fallbackStampCategory],[hUl,i.fallbackStampTrigger],[gUl,i.fallbackStampOriginalRequestId]]){let pa=t6n(Fo);if(pa!==void 0)od[Pg]=pa}let Ou=hr;if(Ou!==void 0)hr=void 0,ur=!0;yt=dSi();let jp=await ll.beta.messages.create({...wi,...Ou!==void 0&&{fallback_credit_token:Ou},stream:!0},{signal:o,...Object.keys(od).length>0&&{headers:od}}).withResponse().catch((Pg)=>{throw lt(),Pg});if(IS("query_response_headers_received"),De=jp.request_id,it=jp.response,bt=Date.now(),xt=jp.response&&{status:jp.response.status,headers:jp.response.headers,latencyMs:Math.round(performance.now()-Ue)},Ou!==void 0)N("tengu_rotunda_pennant_credit_echoed",{mint_request_id:un(i.fallbackCreditMintRequestId),mint_model:gu(i.fallbackCreditMintModel),request_id:un(De),client_request_id:un(Ze),model:gu(i.model),token_length:Ou.length,query_source:_7(i.querySource)});return jp.data},{model:i.model,credentials:i.credentials,fallbackModel:i.fallbackModel,...Ju()?{fastMode:Se}:!1,signal:o,initialConsecutive529Errors:vr,querySource:i.querySource,onRetryStatus:i.onRetryStatus,subscribeRetryWake:i.subscribeRetryWake,lowPriorityWait:at,onError:async(ll)=>{if(ge&&EQi(ll)){if(ge=!1,jq)Hq(D,jq);return R3(!1),q4n(!0),E("[auto-mode] server rejected afk-mode beta \u2014 dropping header and circuit-breaking auto for this session",{level:"warn"}),"retry:afk-beta"}if(hn&&!Kr){let wi=ll instanceof $s?ll.status:void 0,hu=wi!==void 0&&wi>=500,xa=ll instanceof Pk;if(hu||xa)return Kr=!0,E(`[dispatch] ${hu?`HTTP ${wi}`:"connection error"} with ${Xzl}; retrying without it`,{level:"warn"}),N("tengu_dispatch_header_fallback",{model:gu(i.model),reason:hu?Ce("5xx"):Ce("conn_err"),status:wi!==void 0?kh(wi):Ce("none"),request_id:un(ll instanceof $s?ll.requestID:void 0)}),"retry:dispatch-header-strip"}if(CUl(ll))return K=tjl(K),N("tengu_advisor_strip_retry",{query_source:eT(i.querySource)??""}),"retry:advisor-strip";let If=Hgi(ll,i.model,i.querySource);if(If===T3n)return;if(If!==null)return If;{let wi=bQi(ll);if(wi){let hu=ll instanceof Error?ll.message:String(ll);if(wi.messageIdx!==void 0&&wi.contentIdx!==void 0){let od=pfh(K,{messageIdx:wi.messageIdx,contentIdx:wi.contentIdx,kind:wi.kind},hu);if(od!==K)return K=od,Rn.set(wi.kind,hu),Ofh(i,wi.kind,hu),E(`Removed unprocessable ${wi.kind} at messages.${wi.messageIdx}.content.${wi.contentIdx}; retrying.`,{level:"warn"}),N("tengu_media_block_strip_retry",{kind:me(wi.kind),message_idx:wi.messageIdx,content_idx:wi.contentIdx,targeted:1}),`retry:media-strip:${wi.kind}:${wi.messageIdx}.${wi.contentIdx}`}let xa=Fr.value<gr?ffh(K,wi.kind,hu):void 0;if(xa)return Fr.value++,K=xa.messages,Rn.set(wi.kind,hu),Ofh(i,wi.kind,hu),E(`Removed base64 ${wi.kind} blocks from carrier ${xa.carrierIdx} (API 400 had no usable path); retrying.`,{level:"warn"}),N("tengu_media_block_strip_retry",{kind:me(wi.kind),targeted:0,carrier_idx:xa.carrierIdx}),`retry:media-strip-latest:${wi.kind}:${xa.carrierIdx}`}}if(fe&&xUl(ll))return fe=!1,Hq(D,fht),E("[cache-diagnosis] server rejected beta \u2014 dropping header latch",{level:"warn"}),"retry:cache-diagnosis-beta";if(we&&IUl(ll))return we=!1,Hq(D,pht),E("[cache-evict] server rejected prompt-caching-evict beta \u2014 dropping for this conversation",{level:"warn"}),"retry:prompt-caching-evict-beta";{let wi=TQi(ll);if(wi){let hu=wi==="enabled"?"adaptive":"enabled";return rWs(i.model,hu),E(`[thinking] model rejected thinking.type=${wi}; retrying with ${hu}. For Bedrock application-inference-profile ARNs with bearer-token auth, granting bedrock:GetInferenceProfile to the token avoids this round-trip.`,{level:"warn"}),"retry:thinking-type"}}let Hb=is(ll);if(Hb!==null)return Hb;if(!i.resumeIncompleteThinking&&PUl(ll)){let wi=0,hu=0;for(let od of K){if(od.type!=="assistant"||!Array.isArray(od.message.content))continue;for(let Ou of od.message.content)if(Ou.type==="redacted_thinking")wi++;else if(Ou.type==="thinking")if("signature"in Ou&&Ou.signature)wi++;else hu++}let xa=lch(K);if(xa!==K)return K=xa,E("[thinking] server rejected a thinking block; stripping all thinking blocks and retrying.",{level:"warn"}),N("tengu_thinking_signature_strip_retry",{query_source:eT(i.querySource)??"",model:i.model,stripped_signed_count:wi,stripped_unsigned_count:hu}),"retry:thinking-signature-strip"}{let wi=ms(ll);if(wi)return wi}{let wi=await Ie?.onRequestError(ll,K);if(wi){if(K=wi.messages,wi.clearedIds.size>0)i.onHintCleared?.(wi.clearedIds,wi.clearedContent);return"retry:context-hint"}}return Oo(ll,"stream")}}),_r;do if(_r=await Ot.next(),!("controller"in _r.value))yield _r.value;while(!_r.done);if(Ge=_r.value,Qi(),ci)ci=!1,i.onRetryStatus?.(null);for(let[ll,If]of Rn)yield Xd({content:ysn(ll),error:"invalid_request",errorDetails:If});Rn.clear();let mn=it?it._chunkTimes??void 0:void 0;if(mn===void 0&&it!==void 0&&lo()==="bedrock"&&qGa("bedrock"))E("wire-heartbeat: _chunkTimes absent on a Bedrock stream with the byte watchdog enabled \u2014 heartbeat side-channel unavailable for this stream (bedrock-sdk \u22650.32.0 eventstream\u2192SSE transcode drops it; also expected if the response was not vnd.amazon.eventstream, e.g. behind a header-rewriting proxy)");let Fn=performance.now();Qe.length=0,Gt=0,Ur=void 0,an.length=0,Zr=!1,ho=!1,pn=!1,In.clear(),zo.clear(),Po.clear(),vo=void 0,Ke=!1,An=BC,Sr=null,Br=!1,Xr="none",Tn=!1;let Ao=!1,Vo=!1,Yi=!1,Ha=null,El=!1,Vs=null,No=0,Wl=0,au=0,Cu=null,Lp=null,Hh=null,Uc=0,pu=q.CLAUDE_ENABLE_STREAM_WATCHDOG??!0,gc=zGa(),Nl=gc/2,Sd=Math.min(GGa(lo()),pu?gc:1/0),Zf=Math.min(c0E,Sd-Zzl),fu=!1,si=null,mu=null,Vd=null,zf=null,kd=!1;Fl();let ed=()=>{if(i.querySource!=="sdk"&&i.keepPartialMessageOnAbort!==!0)return;if(pn)return;let ll=an[Qe.length];if(ll?.type!=="text"||!ll.text.trim()||!Ur)return;return{message:{...Ur,content:tfo([ll],n,i.agentId,{requestId:De??void 0,messageId:Ur.id},i.storageV5)},requestId:De??void 0,...yce(i.querySource,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool),type:"assistant",uuid:Jsn.randomUUID(),timestamp:new Date().toISOString(),isAbortedMidStream:!0,...void 0,...xe!==void 0&&{effort:xe}}},bg=()=>{if(vo===void 0||ho)return;let ll=vo;return vo=void 0,ho=!0,{type:"server_fallback",fromModel:ll.fromModel,toModel:ll.model,reason:ll.reason,apiRefusalCategory:ll.category,midStream:!1,requestId:De??null,discardedMessages:[],retainedMessages:[],retainedText:"",finalStopReason:null}};try{let ll=!0,If=30000;for await(let wi of d0E(Ge,mn)){if(Fl(),yHt(wi)){yield{type:"stream_event",event:wi};continue}au++,Cu??=Math.round(performance.now()-Ue),Lp??=wi.type,Hh=wi.type;let hu=Date.now();if(Vs!==null){let xa=hu-Vs;if(xa>If)No++,Wl+=xa,E(`Streaming stall detected: ${(xa/1000).toFixed(1)}s gap between events (stall #${No})`,{level:"warn"}),N("tengu_streaming_stall",{stall_duration_ms:xa,stall_count:No,total_stall_time_ms:Wl,event_type:me(HOi(wi.type)),model:i.model,request_id:l6(De)})}if(Vs=hu,ll){if(lt(),E("Stream started - received first chunk"),E(`[API:timing] first byte after ${Math.round(performance.now()-Ue)}ms`),IS("query_first_chunk_received"),!i.agentId)A2("first_chunk");Com(),ll=!1}{let xa=K_l(wi),od=!xa&&Xnm(wi);if(xa||od)Tn=!1;if(xa){Po.add(xa.index),an[xa.index]=V_l(xa);let Ou=vt;if(N("tengu_rotunda_pennant_materialized",{armed:i.serverRefusalFallback!==void 0,mode:me(Ou),block_index:xa.index,non_streaming:!1}),xa.reason==="refusal")yeo({model:d,requestId:De||void 0,querySource:i.querySource,effort:Q,fastMode:Gr,attempt:je,attribution:yce(i.querySource,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool),serverFallbackHop:!0,agentContext:i.agentContext});if(i.serverRefusalFallback===void 0)continue;if(bBi(xa.reason))Zr=!0;if(Ur!==void 0)Ur={...Ur,model:xa.model};for(let jp of In.values())jp.message.model=xa.model;if(In.size===0)vo=xa;else if(!bBi(xa.reason))ho=!0,yield{type:"server_fallback",fromModel:xa.fromModel,toModel:xa.model,reason:xa.reason,apiRefusalCategory:xa.category,midStream:!0,requestId:De??null,discardedMessages:[],retainedMessages:[],retainedText:"",finalStopReason:null};else{ho=!0;let jp=[];for(let[pa,wd]of In)if(qnm(wd))jp.push(wd),In.delete(pa),delete an[pa];if(jp.length>0){let pa=new Set(jp);for(let wd=Qe.length-1;wd>=0;wd--)if(pa.has(Qe[wd]))Qe.splice(wd,1);pn=!0}let Pg=[...In.entries()].sort((pa,wd)=>pa[0]-wd[0]).map(([,pa])=>pa),Fo=Pg.map((pa)=>pa.message.content.map((wd)=>wd.type==="text"?wd.text:"").join("")).join("");yield{type:"server_fallback",fromModel:xa.fromModel,toModel:xa.model,reason:xa.reason,apiRefusalCategory:xa.category,midStream:!0,requestId:De??null,discardedMessages:jp,retainedMessages:Pg,retainedText:Fo,finalStopReason:null}}continue}if(od){let Ou=wi.index;zo.add(Ou),pn=!0,fr("warn","cli_malformed_fallback_block"),N("tengu_rotunda_pennant_malformed",{block_index:Ou,non_streaming:!1}),be("refusal_fallback","malformed_fallback_block",{non_streaming:!1});continue}if(wi.type==="content_block_stop"&&zo.has(wi.index))continue}switch(wi.type){case"message_start":{if(El=!0,Ur=wi.message,Gt=Math.max(0,Math.round(performance.now()-Ue)),An=mEe(An,wi.message?.usage),wi.message?.model)djo(fd(i.model),wi.message.model);sr=wi.message.diagnostics?.cache_miss_reason??void 0;break}case"content_block_start":switch(Br=!1,wi.content_block.type){case"tool_use":an[wi.index]={...wi.content_block,input:""};break;case"server_tool_use":if(an[wi.index]={...wi.content_block,input:""},wi.content_block.name==="advisor")Tn=!0,E("[AdvisorTool] Advisor tool called"),N("tengu_advisor_tool_call",{model:i.model,advisor_model:_??"unknown"});break;case"text":an[wi.index]={...wi.content_block,text:""};break;case"thinking":an[wi.index]={...wi.content_block,thinking:"",signature:""};break;default:if(an[wi.index]={...wi.content_block},wi.content_block.type==="advisor_tool_result"){Tn=!1,E("[AdvisorTool] Advisor tool result received");let xa=lBf(wi.content_block);if(xa!==void 0)E(`[AdvisorTool] Advisor tool result error: ${xa}`),N("tengu_advisor_tool_error",{model:gu(i.model),advisor_model:gu(_??"unknown"),error_code:me(xa)});else N("tengu_advisor_tool_result",{model:gu(i.model),advisor_model:gu(_??"unknown"),stop_reason:io(Iil(wi.content_block))??Ce("none")})}break}if(Ha=wi.index,wi.content_block.type!=="thinking"&&wi.content_block.type!=="redacted_thinking"&&!_Q(wi.content_block))Yi=!0;break;case"content_block_delta":{Br=!1;let xa=an[wi.index],od=wi.delta;if(!xa)throw N("tengu_streaming_error",{error_type:Ce("content_block_not_found_delta"),part_type:me(wi.type),part_index:wi.index}),RangeError("Content block not found");switch(od.type){case"citations_delta":break;case"input_json_delta":if(xa.type!=="tool_use"&&xa.type!=="server_tool_use")throw N("tengu_streaming_error",{error_type:Ce("content_block_type_mismatch_input_json"),expected_type:Ce("tool_use"),actual_type:me(xa.type)}),Error("Content block is not a input_json block");if(typeof xa.input!=="string")throw N("tengu_streaming_error",{error_type:Ce("content_block_input_not_string"),input_type:me(typeof xa.input)}),Error("Content block input is not a string");xa.input+=od.partial_json;break;case"text_delta":if(xa.type!=="text")throw N("tengu_streaming_error",{error_type:Ce("content_block_type_mismatch_text"),expected_type:Ce("text"),actual_type:me(xa.type)}),Error("Content block is not a text block");xa.text+=od.text;break;case"signature_delta":if(xa.type!=="thinking")throw N("tengu_streaming_error",{error_type:Ce("content_block_type_mismatch_thinking_signature"),expected_type:Ce("thinking"),actual_type:me(xa.type)}),Error("Content block is not a thinking block");xa.signature=od.signature;break;case"thinking_delta":if(xa.type==="redacted_thinking")break;if(xa.type!=="thinking")throw N("tengu_streaming_error",{error_type:Ce("content_block_type_mismatch_thinking_delta"),expected_type:Ce("thinking"),actual_type:me(xa.type)}),Error("Content block is not a thinking block");xa.thinking+=od.thinking;break}break}case"content_block_stop":{Br=!1,Ha=null;let xa=an[wi.index];if(!xa)throw N("tengu_streaming_error",{error_type:Ce("content_block_not_found_stop"),part_type:me(wi.type),part_index:wi.index}),RangeError("Content block not found");if(!Ur)throw N("tengu_streaming_error",{error_type:Ce("partial_message_not_found"),part_type:me(wi.type)}),Error("Message not found");let{content:od,batchToolUses:Ou}=RQi(tfo([xa],n,i.agentId,{requestId:De??void 0,messageId:Ur.id},i.storageV5),n),jp={message:{...Ur,content:od},...Ou.length>0&&{batchToolUses:Ou},requestId:De??void 0,...yce(i.querySource,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool),type:"assistant",uuid:Jsn.randomUUID(),timestamp:new Date().toISOString(),...!1,..._&&{advisorModel:_},...xe!==void 0&&{effort:xe}};if(Qe.push(jp),Uc++,In.set(wi.index,jp),jp.message.content.some((Pg)=>!_Q(Pg))){if(Vo=!0,jp.message.content.some((Pg)=>Pg.type!=="thinking"&&Pg.type!=="redacted_thinking"&&!_Q(Pg)))Yi=!0}yield jp;break}case"message_delta":{An=mEe(An,wi.usage);let xa=i.serverRefusalFallback!==void 0?pyr(An):void 0;if(xa?.servedFallbackModel!==void 0)Zr=!0,An=Cfo(An,wi.usage);let od=q_l(wi.delta.stop_details);{let nr=wi.delta.stop_details;if(nr&&"fallback_credit_token"in nr)delete nr.fallback_credit_token}if(od!==void 0&&!Ke)Ke=!0,N("tengu_fallback_credit_minted",{request_id:un(De),model:gu(i.model),fallback_target_model:gu(i.refusalFallbackModel??(i.serverRefusalFallback!==void 0&&!Zr?i.serverRefusalFallback.model:void 0)),token_length:od.length,input_tokens:An.input_tokens,output_tokens:An.output_tokens,cache_read_input_tokens:An.cache_read_input_tokens,cache_creation_input_tokens:An.cache_creation_input_tokens,cache_creation_5m_input_tokens:An.cache_creation?.ephemeral_5m_input_tokens??0,cache_creation_1h_input_tokens:An.cache_creation?.ephemeral_1h_input_tokens??0,service_tier:io(An.service_tier),speed:io(An.speed),query_source:_7(i.querySource),...i.queryTracking&&{query_chain_id:un(i.queryTracking.chainId),query_depth:i.queryTracking.depth}});if(Sr=wi.delta.stop_reason,Sr!==null)Br=!0;let Ou=wi.delta;if(Ou.diagnostics?.cache_miss_reason)sr=Ou.diagnostics.cache_miss_reason;for(let nr of Qe)nr.message.usage=An,nr.message.stop_reason=Sr,nr.message.stop_details=wi.delta.stop_details??null;if(Sr!==null&&Xr!=="credited"){Xr="credited";let nr=xa!==void 0&&xa.servedFallbackModel!==void 0,xn=nr?Y_l(xa.entries,{speed:An.speed,inferenceGeo:An.inference_geo,serverToolUse:An.server_tool_use},Sr):mve(d,An),xo=nr?i.serverRefusalFallback?.model??i.model:i.model;tn+=hIe(xn,An,xo,i.querySource,Q,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool)}else if(Xr==="none")Xr="pending";if(Sr==="refusal")yeo({model:d,requestId:De||void 0,querySource:i.querySource,effort:Q,fastMode:Gr,attempt:je,attribution:yce(i.querySource,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool),serverFallbackHop:!1,stopDetails:wi.delta.stop_details??null,agentContext:i.agentContext});if(i.serverRefusalFallback!==void 0){let nr=vo;if(vo=void 0,nr!==void 0){if(!ho)ho=!0,yield{type:"server_fallback",fromModel:nr.fromModel,toModel:nr.model,reason:nr.reason,apiRefusalCategory:nr.category,midStream:!1,requestId:De??null,discardedMessages:[],retainedMessages:[],retainedText:"",finalStopReason:Sr}}else if(!ho&&xa?.servedFallbackModel!==void 0)ho=!0,yield{type:"server_fallback",fromModel:i.model,toModel:xa.servedFallbackModel,reason:"sticky",apiRefusalCategory:null,midStream:!1,requestId:De??null,discardedMessages:[],retainedMessages:[],retainedText:"",finalStopReason:Sr}}let jp=i.refusalFallbackModel??(i.serverRefusalFallback!==void 0&&!Zr?i.serverRefusalFallback.model:void 0),Pg=i.refusalFallbackModelLane==="silent",Fo=i.refusalFallbackCascadeHop,pa=Sr==="refusal"&&jp!==void 0&&!Pg&&Fo===void 0?dIa({originalModelCanonical:$o(i.model),armedFallbackModel:jp,apiRefusalCategory:wi.delta.stop_details?.category??null,armedTargetIsRefusingModel:kZr(i.model,jp),resolveTarget:(nr)=>JZr({mappedTarget:nr,armedFallbackModel:jp,refusingModel:i.model,triedModels:[Lyr(i.model)]}),routesOverride:fQi()}):void 0,wd=pa!==void 0?pa.model:jp;if(pa!==void 0)pQi({route:pa,model:i.model,armedFallbackModel:jp,apiRefusalCategory:wi.delta.stop_details?.category,requestId:De});let sf=Sr==="refusal"&&jp===void 0?i.refusalFallbackSilentRearm?.():void 0,Jg=wd??sf;if(Sr==="refusal"&&Jg!==void 0){yield{type:"fallback_request",trigger:"refusal",originalModel:i.model,fallbackModel:Jg,requestId:De??null,apiRefusalCategory:wi.delta.stop_details?.category??null,apiRefusalExplanation:wi.delta.stop_details?.explanation??null,creditCode:od??null,...sf!==void 0&&{silentArmAtTrigger:!0},...cIa(pa,Fo)};return}let Qt=Ryr(Sr,wi.delta.stop_details,De,Zr?xa?.servedFallbackModel??Ur?.model??i.model:i.model);if(Qt){let nr=Wze()||aXe()!==void 0;if(jp!==void 0||i.refusalFallbackModel!==void 0||h3t(i.model)&&xX()||y3t()||nr)pe("refusal_fallback",pa?.matched==="none"?"route_declined":Zr?"server_chain_exhausted":nr?"client_chain_exhausted":h3t(i.model)&&hQi()?"disabled_by_config":"not_armed",{convolute_arcades:y3t(),armed:jp!==void 0,model_scope:me(QIe(i.model))});yield{type:"refusal_no_fallback",originalModel:i.model,requestId:De??null,apiRefusalCategory:wi.delta.stop_details?.category??null,apiRefusalExplanation:wi.delta.stop_details?.explanation??null},yield Qt}if(Sr==="max_tokens")N("tengu_max_tokens_reached",{max_tokens:Vr}),yield Xd({content:`${YA}: Claude's response exceeded the ${Vr} output token maximum. To configure this behavior, set the CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable.`,apiError:"max_output_tokens",error:"max_output_tokens"});if(Sr==="model_context_window_exceeded")N("tengu_context_window_exceeded",{max_tokens:Vr,output_tokens:An.output_tokens}),yield Xd({content:`${YA}: The model has reached its context window limit.`,apiError:"max_output_tokens",error:"max_output_tokens"});break}case"message_stop":if(El=!1,Xr==="pending")Xr="credited",tn+=hIe(mve(d,An),An,i.model,i.querySource,Q,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool);ot("stream_completed",De??null,An);break}if(wi.type==="content_block_stop"&&Po.has(wi.index))continue;Ao=!0,yield{type:"stream_event",event:wi,...wi.type==="message_start"?{ttftMs:Gt,...Vt?{requestSentAtMs:Vt}:void 0,...dn?{requestSentWallMs:dn}:void 0}:void 0}}if(Gf(),o.aborted&&!fu){ot("aborted",De??null,null);let wi=bg();if(wi)yield wi;let hu=ed();if(hu)yield hu;if(Tn)N("tengu_advisor_tool_interrupted",{model:i.model,advisor_model:_??"unknown"});return}if(fu){let wi=si!==null?Math.round(performance.now()-si):-1;throw fr("info","cli_stream_loop_exited_after_watchdog_clean"),N("tengu_stream_loop_exited_after_watchdog",{request_id:l6(De),exit_delay_ms:wi,exit_path:Ce("clean"),model:i.model}),si=null,Error("Stream idle timeout - no chunks received")}if(!Ur||Qe.length===0&&!Sr)throw E(!Ur?"Stream completed without receiving message_start event - triggering non-streaming fallback":"Stream completed with message_start but no content blocks completed - triggering non-streaming fallback",{level:"error"}),N("tengu_stream_no_events",{model:i.model,request_id:l6(De)}),new kyi;try{let wi=ND(),hu=wi.hasFired("stream_text_delivery_bad"),xa=wi.hasFired("stream_text_delivery_ok");if(Sr!==null&&!pn&&(!hu||!xa)){if(!hu)for(let[od,Ou]of an.entries()){if(!Ou||Ou.type!=="text")continue;if(Ou.text.trim().length>0&&!In.has(od)&&!zo.has(od)){wi.markFired("stream_text_delivery_bad"),pe("api_stream_text_delivery","text_block_unyielded",{had_tool_use:an.some((jp)=>jp?.type==="tool_use"),dropped_block_index:od});break}}if(!xa){let od=an.some((jp,Pg)=>jp?.type==="text"&&jp.text.trim().length>0&&In.has(Pg)),Ou=an.some((jp,Pg)=>jp?.type==="tool_use"&&In.has(Pg));if(od&&Ou)wi.markFired("stream_text_delivery_ok"),Ee("api_stream_text_delivery")}}if(Sr!==null)go()}catch{}if(No>0)E(`Streaming completed with ${No} stall(s), total stall time: ${(Wl/1000).toFixed(1)}s`,{level:"warn"}),N("tengu_streaming_stall_summary",{stall_count:No,total_stall_time_ms:Wl,model:i.model,request_id:l6(De)});if(fFe())eKf(i.querySource,An.cache_read_input_tokens,An.cache_creation_input_tokens,e,i.agentId,De,u);let Hb=it;if(Hb)wWn(at,bt),EKp(Hb.headers,Kt,bt,yt),r5a(Hb.headers,i.model,(IA(i.model)||ZU(i.model))&&An.input_tokens+An.cache_read_input_tokens+An.cache_creation_input_tokens>_ve,bt,yt),Nn=Hb.headers}catch(ll){Gf(),lt();{let Vc=bg();if(Vc)yield Vc}if(!fu&&ll instanceof e6n)fu=!0,si=performance.now(),E(`Streaming idle timeout (byte-level): ${ll.message}, aborting stream`,{level:"error"}),fr("error","cli_streaming_idle_timeout"),N("tengu_streaming_idle_timeout",{model:i.model,request_id:l6(De),timeout_ms:ll.idleMs,tier:Ce("byte"),bytes_received_before_stall:ll.bytesReceived,time_to_first_byte_ms:ll.ttfbMs,body_read_pending:ll.bodyReadPending,slept_ms:ll.sleptMs,cf_ray:un(ll.cfRay)});if(fu&&si!==null){let Vc=Math.round(performance.now()-si);fr("info","cli_stream_loop_exited_after_watchdog_error"),N("tengu_stream_loop_exited_after_watchdog",{request_id:l6(De),exit_delay_ms:Vc,exit_path:Ce("error"),error_name:ll instanceof Error?ll.name:Ce("unknown"),model:i.model})}let If={events_received:au,ms_to_first_event:Cu,ms_since_last_event:Vs===null?null:Date.now()-Vs},Hb=(Vc,Rm)=>fr("warn","cli_stream_failed",()=>({...pzt(Rm,Nnt(Rm),xt),fallback_cause:Vc,watchdog_fired:fu,slept_ms:ll instanceof e6n||ll instanceof aSi?ll.sleptMs:null,client_request_id:un(Ze)??null,model:gu(i.model)??null,stream:{...If,first_event_type:Lp===null?null:HOi(Lp),last_event_type:Hh===null?null:HOi(Hh),message_envelope_open:El,stop_reason_received:Sr!==null,content_blocks_completed:Uc,any_event_yielded:Ao,ms_since_request:Math.round(performance.now()-Ue),ms_to_headers:xt?.latencyMs??null,stalls_over_30s:No,stall_ms_total:Wl},route:TOi()}));if(ll instanceof jS){if(o.aborted){ot("aborted",De??null,null);let Vc=bg();if(Vc)yield Vc;let Rm=ed();if(Rm)yield Rm;if(E(`Streaming aborted by user: ${le(ll)}`),Tn)N("tengu_advisor_tool_interrupted",{model:i.model,advisor_model:_??"unknown"});throw ll}else if(!fu){E(`Streaming timeout (SDK abort): ${ll.message}`,{level:"error"});let Vc=new ife({message:"Request timed out"});throw Hb("sdk_timeout",Vc),Vc}}let wi=BB(ll),hu=wi!==null&&ece.has(wi.code),xa=wi!==null&&(hu||uhe.has(wi.code)),od=Ie?.classifyStreamError(ll)??!1,Ou=z1p({connDetails:wi,isStaleConnection:hu,isContextHintSse:od,streamIdleAborted:fu,noEvents:ll instanceof kyi}),jp=F8s(ll)??null,Pg=_Rn(wi?.code)??null,Fo=ll instanceof Error?jp??Ce("none"):me(typeof ll),pa=ll instanceof Error?U8s(ll.constructor?.name)??Ce("none"):Ce("none"),wd=Pg??Ce("none"),sf=(nt("tengu_watchdog_skip_nonstreaming_fallback",!1)||q.CLAUDE_CODE_REMOTE)&&fu||Vn(process.env.CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK)||nt("tengu_disable_streaming_to_non_streaming_fallback",!1),Jg=fu?Error(Qe.length>0?"Stream idle timeout - partial response received":"Stream idle timeout - no chunks received"):ll;if(Hb(Ou,ll instanceof jS?Jg:ll),Qe.some((Vc)=>Vc.message.content.some((Rm)=>!_Q(Rm)))||Vo){let Vc=(Qle(ll)||Vpl(ll)||ll instanceof $s&&ll.type==="api_error")&&Yi;if(fu||xa||Vc){let Rm=fu,vg=Qe.some((Ux)=>Ux.message.content.some((BS)=>BS.type==="tool_use")),GH=Qe.some((Ux)=>Ux.message.content.some((BS)=>BS.type!=="thinking"&&BS.type!=="redacted_thinking"&&!_Q(BS)));if(!Yi&&Sr===null&&(Rm?oo<xr:mi<Ln)){if(Rm)oo++,E(`Stream idle timeout after thinking-only yield \u2014 retrying streaming (${oo}/${xr})`,{level:"warn"}),N("tengu_streaming_watchdog_retry",{model:gu(i.model),retry_attempt:oo,request_id:un(De),after_thinking_only:!0});else mi++,E(`Stream connection closed (${wi?.code}) after thinking-only yield \u2014 retrying streaming (${mi}/${Ln})`,{level:"warn"}),N("tengu_streaming_stale_connection_retry",{model:gu(i.model),error_code:pWn(wi?.code??""),retry_attempt:mi,request_id:un(De),after_thinking_only:!0});if(pr(),ot("attempt_errored",De??null,null),Xr!=="credited")Xr="credited",tn+=hIe(mve(d,An),An,i.model,i.querySource,Q,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool);if(El){if(Ha!==null)yield{type:"stream_event",event:{type:"content_block_stop",index:Ha}};yield{type:"stream_event",event:{type:"message_stop"}}}if(De=null,!Rm)await Ir(100*mi,o);continue e}let Bx=Sr!==null,lD=wi?.code==="StreamSuspended",KM=Rm?Ce("watchdog"):Vc?Ce("server_error"):lD?Ce("stream_suspended"):wi!==null&&uhe.has(wi.code)?Ce("network_down"):Ce("stale_connection");if(Bx&&Br&&Ha===null){E(`Stream ${Rm?"stalled":`connection closed (${wi?.code??"unknown"})`} after message_delta (stop_reason=${Sr}) \u2014 response already complete, no truncation`,{level:"info"}),N("tengu_streaming_close_after_complete",{model:gu(i.model),blocks_yielded:Qe.length,cause:KM,error_code:wi?pWn(wi.code):Ce("none"),request_id:un(De)}),ot("stream_completed",De??null,An);break e}let Zz=vg?"tool_use":"end_turn";Sr=Zz;for(let Ux of Qe)Ux.message.usage=An,Ux.message.stop_reason=Zz;E(Rm?`Stream idle timeout after ${Qe.length} block(s) yielded \u2014 finalizing partial response`:Vc?`Mid-stream server error after ${Qe.length} block(s) yielded \u2014 finalizing partial response`:`Stream connection closed (${wi?.code}) after ${Qe.length} block(s) yielded \u2014 finalizing partial response`,{level:"warn"});let PR=GH||Yi;if(N("tengu_streaming_partial_finalized",{model:gu(i.model),blocks_yielded:Qe.length,has_output:PR,synthesized_stop_reason:me(Zz),cause:KM,request_id:un(De)}),yield Xd({content:PR?Rm?`${YA}: The response stopped arriving. The response above may be incomplete.`:Vc?`${YA}: Server error mid-response. The response above may be incomplete.`:lD?`${YA}: Your computer went to sleep mid-response. The response above may be incomplete.`:`${YA}: Connection lost mid-response. The response above may be incomplete.`:Rm?`${YA}: The response stalled before a response was produced. Try again.`:lD?`${YA}: Your computer went to sleep before a response was produced. Try again.`:`${YA}: Connection lost before a response was produced. Try again.`,error:"server_error"}),Xr!=="credited")Xr="credited",tn+=hIe(mve(d,An),An,i.model,i.querySource,Q,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool);break e}throw N("tengu_streaming_fallback_to_non_streaming",{model:i.model,error:Jg instanceof Error?Jg.name:cSe(String(Jg)),attemptNumber:je,maxOutputTokens:Vr,thinkingType:me(r.type),fallback_disabled:sf,request_id:l6(De),fallback_cause:Ce("partial_yield"),any_stream_event_yielded:Ao}),Jg}if(hn&&!Kr&&wi!==null&&!Ao){Kr=!0,E(`[dispatch] Stream connection error (${wi.code}) with anthropic-dispatch-id before first event; retrying without it`,{level:"warn"}),N("tengu_dispatch_header_fallback",{model:gu(i.model),reason:Ce("body_phase"),status:Ce("none"),error_code:pWn(wi.code),request_id:un(De)}),pr(),ot("attempt_errored",De??null,null),De=null;continue e}let nr=Xpl();if(xa&&Sr===null&&Ni<nr){if(Ni++,E(`Stream connection error (${wi.code}) \u2014 retrying streaming (${Ni}/${nr})`,{level:"warn"}),N("tengu_streaming_stale_connection_retry",{model:i.model,error_code:pWn(wi.code),retry_attempt:Ni,request_id:l6(De)}),pr(),ot("attempt_errored",De??null,null),El&&Xr!=="credited"){if(Xr="credited",tn+=hIe(mve(d,An),An,i.model,i.querySource,Q,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool),Ha!==null)yield{type:"stream_event",event:{type:"content_block_stop",index:Ha}};yield{type:"stream_event",event:{type:"message_stop"}}}De=null;let Vc=CZe(Ni),Rm=Tyi(new Pk({cause:ll instanceof Error?ll:void 0}));ci=!0,i.onRetryStatus?.({kind:"retrying",error:Rm,attempt:Ni,maxRetries:nr,retryInMs:Vc,deadline:Date.now()+Vc}),yield ueo(Rm,Vc,Ni,nr,"connection_retry"),await Ir(Vc,o);continue e}if(fu&&!Ao&&oo<xr){oo++,E(`Stream idle timeout before first event \u2014 retrying streaming (${oo}/${xr})`,{level:"warn"}),N("tengu_streaming_watchdog_retry",{model:i.model,retry_attempt:oo,request_id:l6(De)}),pr(),ot("attempt_errored",De??null,null),De=null;continue e}if(w_t(ll))throw N("tengu_streaming_fallback_to_non_streaming",{model:gu(i.model),error:Ce(Vet),attemptNumber:je,maxOutputTokens:Vr,thinkingType:me(r.type),fallback_disabled:!0,request_id:l6(De),fallback_cause:Ce(Vet),any_stream_event_yielded:Ao}),ll;if(Qle(ll)){let Vc=Yi?null:Dyi(ll,{markedAtDispatch:mt,querySource:i.querySource,wait:at});if(Vc===null)vr++;if(!Yi){if(El&&Xr!=="credited")Xr="credited",tn+=hIe(mve(d,An),An,i.model,i.querySource,Q,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool);if(Vc!==null||vr<xOi&&(vMt(i.querySource)||Ont())){if(E(Vc!==null?`Mid-stream 529 before content at lower priority \u2014 waiting ${Vc.delayMs}ms for capacity (attempt ${Vc.attempt})`:`Mid-stream 529 before content \u2014 retrying streaming (${vr}/${xOi})`,{level:"warn"}),N("tengu_streaming_529_retry",{model:gu(i.model),retry_attempt:Vc!==null?Vc.attempt:vr,request_id:un(De),...Vc!==null&&{is_low_priority:!0}}),pr(),ot("attempt_errored",De??null,null),El){if(Ha!==null)yield{type:"stream_event",event:{type:"content_block_stop",index:Ha}};yield{type:"stream_event",event:{type:"message_stop"}}}if(De=null,Vc!==null)ci=!0,i.onRetryStatus?.({kind:"low_priority_waiting",attempt:Vc.attempt,retryInMs:Vc.delayMs,deadline:Date.now()+Vc.delayMs});await Ir(Vc?.delayMs??CZe(vr),o);continue e}if(i.fallbackModel)throw N("tengu_api_opus_fallback_triggered",{original_model:gu(i.model),fallback_model:gu(i.fallbackModel),provider:Bfe(),source:Ce("mid_stream")}),be("api_request","api_request_fallback_triggered"),new Zoe(i.model,i.fallbackModel,"overloaded",ll)}}if(sf)throw E(`Error streaming (non-streaming fallback disabled): ${le(Jg)}`,{level:"error"}),N("tengu_streaming_fallback_to_non_streaming",{model:i.model,error:Jg instanceof Error?Jg.name:cSe(String(Jg)),attemptNumber:je,maxOutputTokens:Vr,thinkingType:me(r.type),fallback_disabled:!0,request_id:l6(De),fallback_cause:me(Ou),error_name:Fo,error_constructor:pa,error_code:wd,any_stream_event_yielded:Ao}),Jg;E(`Error streaming, falling back to non-streaming mode: ${le(Jg)}`,{level:"error"}),Qn=!0;{let Vc=await Ie?.onStreamFallback(K,De??void 0);if(Vc){if(K=Vc.messages,Vc.clearedIds.size>0)i.onHintCleared?.(Vc.clearedIds,Vc.clearedContent)}}if(i.onStreamingFallback)i.onStreamingFallback();N("tengu_streaming_fallback_to_non_streaming",{model:i.model,error:Jg instanceof Error?Jg.name:cSe(String(Jg)),attemptNumber:je,maxOutputTokens:Vr,thinkingType:me(r.type),fallback_disabled:!1,request_id:l6(De),fallback_cause:me(Ou),error_name:Fo,error_constructor:pa,error_code:wd,any_stream_event_yielded:Ao}),fr("info","cli_nonstreaming_fallback_started"),N("tengu_nonstreaming_fallback_started",{request_id:l6(De),model:i.model,fallback_cause:me(Ou)}),ot("attempt_errored",De??null,null),We=De,yield{type:"streaming_fallback_began",cause:Ou};let{message:xn,requestId:xo,creditCode:Gi}=yield*Ffh({model:i.model,source:i.querySource,agentContext:i.agentContext,credentials:i.credentials,llmSpan:Ye},{model:i.model,fallbackModel:i.fallbackModel,...Ju()&&{fastMode:Se},signal:o,initialConsecutive529Errors:Qle(ll)?vr:0,querySource:i.querySource,onRetryStatus:i.onRetryStatus,subscribeRetryWake:i.subscribeRetryWake,lowPriorityWait:at,onApiError:(Vc)=>{let Rm=Hgi(Vc,i.model,i.querySource);if(Rm===T3n)return;if(Rm!==null)return Rm;let vg=ms(Vc);if(vg)return vg;let GH=is(Vc);if(GH!==null)return GH;return Oo(Vc,"sync")}},Ft,(Vc,Rm,vg)=>{je=Vc,Vr=vg},(Vc)=>{YRn(Vc,i.querySource,O4(i.agentContext)),UOi(Vc,i.querySource)},{requestId:AOi(De),analyticsRequestId:l6(De),cause:Ou,errorName:jp,connectionCode:Pg,stall:If});De=xo,go(),Qi(),N("tengu_nonstreaming_fallback_success",{model:gu(i.model),request_id:l6(xo),originating_request_id:l6(We),fallback_cause:me(Ou),attempt:je}),sr=xn.diagnostics?.cache_miss_reason??void 0;let qi=Er(xn),{content:Ns,batchToolUses:Ya}=RQi(tfo(qi.content,n,i.agentId,{requestId:De??void 0,messageId:xn.id},i.storageV5),n),Im={message:{...xn,content:Ns,usage:mEe(BC,xn.usage)},...Ya.length>0&&{batchToolUses:Ya},requestId:De??void 0,...yce(i.querySource,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool),type:"assistant",uuid:Jsn.randomUUID(),timestamp:new Date().toISOString(),...!1,..._&&{advisorModel:_},...xe!==void 0&&{effort:xe}};if(Qe.push(Im),Xt=Im,yield Im,yield*jn(qi,xn,Gi))return}finally{Gf()}ot("stream_completed",De??null,Sr!==null?An:null);break e}}catch(Ot){if(ot(o.aborted?"aborted":"attempt_errored",De??null,null),Ot instanceof Zoe)throw Ot;if(!Qn&&Ot instanceof wG&&Ot.originalError instanceof $s&&Ot.originalError.status===404){let mn=Ot.originalError.requestID??"unknown";if(E("Streaming endpoint returned 404, falling back to non-streaming mode",{level:"warn"}),Qn=!0,Ie?.strip(),i.onStreamingFallback)i.onStreamingFallback();N("tengu_streaming_fallback_to_non_streaming",{model:i.model,error:Ce("404_stream_creation"),attemptNumber:je,maxOutputTokens:Vr,thinkingType:me(r.type),request_id:l6(mn),fallback_cause:Ce("404_stream_creation"),any_stream_event_yielded:!1}),fr("info","cli_nonstreaming_fallback_started"),N("tengu_nonstreaming_fallback_started",{request_id:un(mn),model:gu(i.model),fallback_cause:Ce("404_stream_creation")}),yield{type:"streaming_fallback_began",cause:"404_stream_creation"};try{We=De??(mn!=="unknown"?mn:null);let{message:Fn,requestId:Ao,creditCode:Vo}=yield*Ffh({model:i.model,source:i.querySource,agentContext:i.agentContext,credentials:i.credentials,llmSpan:Ye},{model:i.model,fallbackModel:i.fallbackModel,...Ju()&&{fastMode:Se},signal:o,onRetryStatus:i.onRetryStatus,subscribeRetryWake:i.subscribeRetryWake,lowPriorityWait:at,onApiError:(No)=>{let Wl=Hgi(No,i.model,i.querySource);if(Wl===T3n)return;if(Wl!==null)return Wl;let au=ms(No);if(au)return au;let Cu=is(No);if(Cu!==null)return Cu;return Oo(No,"sync")}},Ft,(No,Wl,au)=>{je=No,Vr=au},(No)=>{YRn(No,i.querySource,O4(i.agentContext)),UOi(No,i.querySource)},{requestId:AOi(mn),analyticsRequestId:l6(mn),cause:"404_stream_creation",errorName:null,connectionCode:null,stall:null});De=Ao,go(),Qi(),N("tengu_nonstreaming_fallback_success",{model:gu(i.model),request_id:l6(Ao),originating_request_id:l6(We),fallback_cause:Ce("404_stream_creation"),attempt:je}),sr=Fn.diagnostics?.cache_miss_reason??void 0;let Yi=Er(Fn),{content:Ha,batchToolUses:El}=RQi(tfo(Yi.content,n,i.agentId,{requestId:De??void 0,messageId:Fn.id},i.storageV5),n),Vs={message:{...Fn,content:Ha,usage:mEe(BC,Fn.usage)},...El.length>0&&{batchToolUses:El},requestId:De??void 0,...yce(i.querySource,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool),type:"assistant",uuid:Jsn.randomUUID(),timestamp:new Date().toISOString(),...!1,..._&&{advisorModel:_},...xe!==void 0&&{effort:xe}};if(Qe.push(Vs),Xt=Vs,yield Vs,yield*jn(Yi,Fn,Vo))return}catch(Fn){if(Fn instanceof Zoe)throw Fn;E(`Non-streaming fallback also failed: ${le(Fn)}`,{level:"error"});let Ao=Fn,Vo=i.model;if(Fn instanceof wG)Ao=Fn.originalError,Vo=Fn.retryContext.model;if(Ao instanceof jS){pr();return}if(Ao instanceof $s)n5a(Ao,Nfh(i),Date.now(),yt);let Yi=De||(Ao instanceof $s?Ao.requestID:void 0)||(Ao instanceof $s?Ao.error?.request_id:void 0);pfl({isLowPriority:mt,error:Ao,model:Vo,messageCount:K.length,messageTokens:aie(K),durationMs:Math.max(0,Math.round(performance.now()-Ue)),durationMsIncludingRetries:Math.max(0,Math.round(performance.now()-Fe)),attempt:je,requestId:Yi,clientRequestId:Ze,didFallBackToNonStreaming:Qn,queryTracking:i.queryTracking,querySource:i.querySource,messageClientPlatform:i.messageClientPlatform,llmSpan:Ye,fastMode:Gr,previousRequestId:l,effort:Q,agentContext:i.agentContext,attribution:yce(i.querySource,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool),promptTooLongIsHandled:i.promptTooLongIsHandled}),yield kQi(Ao,Vo,{messages:e,messagesForAPI:K,requestId:Yi}),pr();return}}else{E(`Error in API request: ${le(Ot)}`,{level:"error"});let mn=Ot,Fn=i.model;if(Ot instanceof wG)mn=Ot.originalError,Fn=Ot.retryContext.model;if(mn instanceof jS){pr();return}if(mn instanceof $s)n5a(mn,Nfh(i),Date.now(),yt);let Ao=De||(mn instanceof $s?mn.requestID:void 0)||(mn instanceof $s?mn.error?.request_id:void 0);pfl({isLowPriority:mt,error:mn,model:Fn,messageCount:K.length,messageTokens:aie(K),durationMs:Math.max(0,Math.round(performance.now()-Ue)),durationMsIncludingRetries:Math.max(0,Math.round(performance.now()-Fe)),attempt:je,requestId:Ao,clientRequestId:Ze,didFallBackToNonStreaming:Qn,observedResponse:Qn?void 0:xt,queryTracking:i.queryTracking,querySource:i.querySource,messageClientPlatform:i.messageClientPlatform,llmSpan:Ye,fastMode:Gr,previousRequestId:l,effort:Q,agentContext:i.agentContext,attribution:yce(i.querySource,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool),promptTooLongIsHandled:i.promptTooLongIsHandled}),yield kQi(mn,Fn,{messages:e,messagesForAPI:K,requestId:Ao}),pr();return}}finally{if(_hr("api_call",cs),ci)i.onRetryStatus?.(null);if(ot(o.aborted?"aborted":"attempt_errored",De??null,null),pr(),Xt){let Ot=Xt.message.usage;if(An=mEe(BC,Ot),Sr=Xt.message.stop_reason,Sr==="refusal")yeo({model:d,requestId:De||void 0,querySource:i.querySource,effort:Q,fastMode:Gr,attempt:je,attribution:yce(i.querySource,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool),serverFallbackHop:!1,stopDetails:Xt.message.stop_details??null,agentContext:i.agentContext});let _r=Hi?.servedFallbackModel!==void 0;if(!Zr)djo(fd(i.model),Xt.message.model);let mn=_r&&Hi!==void 0?Y_l(Hi.entries,{speed:An.speed,inferenceGeo:An.inference_geo,serverToolUse:An.server_tool_use},Sr):mve(d,An);tn+=hIe(mn,An,_r?i.serverRefusalFallback?.model??i.model:i.model,i.querySource,Q,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool)}}if(De&&Y)zGs(De);if(fe&&sr)tKf(sr,{requestId:De,previousMessageId:u,model:i.model,is1hCacheTTL:re==="1h",querySource:i.querySource,queryDepth:i.queryTracking?.depth});let ce=K.length,Be=aie(K),Tt=UZ()?void 0:vKf(K,i.model);i.getToolPermissionContext().then((Ot)=>{SKf({isLowPriority:mt,model:Qe[0]?.message.model??Ur?.model??i.model,preNormalizedModel:i.model,usage:An,start:Ue,startIncludingRetries:Fe,attempt:je,messageCount:ce,messageTokens:Be,requestId:De??null,clientRequestId:Qn?void 0:Ze,firstAttemptRequestId:We??null,stopReason:Sr,ttftMs:Gt,didFallBackToNonStreaming:Qn,querySource:i.querySource,messageClientPlatform:i.messageClientPlatform,headers:Nn,costUSD:tn,isDefaultModel:Y?i.isDefaultModel:void 0,defaultModel:Y?i.defaultModel:void 0,...W(xe),queryTracking:i.queryTracking,permissionMode:Ot.mode,proactivityLevel:i.proactivityLevel,newMessages:Qe,requestContentTelemetry:Tt,llmSpan:Ye,globalCacheStrategy:P,requestSetupMs:Ue-Fe,attemptStartTimes:ze,fastMode:Gr,previousRequestId:l,betas:Pt,effort:xe,agentContext:i.agentContext,attribution:yce(i.querySource,i.spawnedBySkill,i.activeSkill,i.activeMcpServer,i.activeMcpTool)})}),pr()}

// --- bundle[5782294:5782709]  (415 B)
//     especificidad 14.996 · 7 anclas — 'anthropic-ratelimit-unified-overage-disabled-reason'(×14 g1), 'retryAfterMs'(×17 g1), 'delayMs'(×18 g1), 'retryAfter'(×30 g1), 'ratelimit'(×142 g1) …
function Tyi(e){let t=(i)=>e.headers?.get?.(i)??void 0,r=t("anthropic-ratelimit-unified-representative-claim"),n=t("anthropic-ratelimit-unified-reset"),o=t("anthropic-ratelimit-unified-overage-status");return{message:e.message,status:e.status,requestId:e.requestID??void 0,formatted:xlr(e),connection:BB(e),isNetworkDown:D5v(e),rateLimits:r||o?{...r&&{rateLimitType:r},...n&&{resetsAt:Math.round(Number(n))}}:null}}

// --- bundle[2787400:2790665]  (3265 B)
//     especificidad 14.434 · 7 anclas — 'APIError'(×13 g1), 'fallback_model'(×29 g1), 'original_model'(×31 g1), 'overloaded'(×48 g1), 'persistent'(×122 g1) …
()=>ye({type:Ht("system"),subtype:Ht("model_refusal_fallback"),trigger:Ht("refusal"),direction:Dr(["retry","revert","sticky"]),scope:Dr(["session","local"]).optional().describe("'session': the main thread fell back and the session model is swapped. 'local': a subagent / side-question (/btw) / background fork fell back \u2014 only that response came from the fallback model and the session model is unchanged. Absent from older CLIs (treat as 'session')."),original_model:O(),fallback_model:O(),request_id:O().nullable(),api_refusal_category:O().nullable().optional().describe("The refusal category ('cyber', 'bio', \u2026): stop_details.category from the refused API response (client lane), or the fallback block's server-gated trigger.category (server lane). Open string \u2014 new categories ship on the wire ahead of schema updates. null when neither source carried a category (normal, not an error). Absent when emitted by an older CLI."),saw_cyber_refusal:Ht(!0).optional().describe("@internal Present when ANY hop of this banner's multi-hop episode was a cyber refusal \u2014 not only the origin hop that api_refusal_category describes (the banner keeps first-hop category semantics for display). Re-arm evidence for the CLI's cyber-exclusion header on session restore; never rendered, not part of the public SDK contract. Absent on cyber-free episodes and when emitted by an older CLI."),api_refusal_explanation:O().nullable().optional().describe("stop_details.explanation from the refused API response (client lane only \u2014 the server-lane trigger carries no explanation). Unstable human prose \u2014 display only, never parse. null/absent when the response carried none, and always null on server-lane banners."),retracted_message_uuids:ft(O()).optional().describe("Wire uuids of the messages this fallback retracted \u2014 the refused partial as the consumer received it (one uuid per normalized SDK message; multi-block messages carry per-block derived uuids) plus any tombstoned tool_results. Emitted AFTER the retraction, so this is a resolution-time eviction signal: remove these messages from transcript state on receipt. Eviction is idempotent \u2014 unknown or already-removed uuids are a no-op. Absent when emitted by an older CLI."),refused_user_message_uuid:O().nullable().optional().describe("UUID of the user message the refused request was for \u2014 the rewind target and composer prefill for edit-and-retry. This is the message's own uuid as delivered on the replay ack (not a per-block normalized uuid). null when the refused turn was not human-authored (e.g. a background task notification or auto-continuation \u2014 nothing to edit-and-retry) or otherwise cannot be identified; absent from older CLIs."),content:O(),uuid:ld(),session_id:O()}).describe('Emitted when the primary model ends the stream with stop_reason "refusal" and the turn is retried once on a fallback model (direction: "retry"). When `scope` is "session" (or absent \u2014 older CLIs), the swap is made persistent for the session; when `scope` is "local", only that subagent/side-question response came from the fallback model and the session model is unchanged. "revert" and "sticky" are retained in the enum for SDK-consumer compat and are no longer emitted.')

// --- bundle[27638841:27666635]  (27794 B)
//     especificidad 11.267 · 6 anclas — 'anthropic-ratelimit-unified-overage-disabled-reason'(×14 g1), 'overloaded'(×48 g1), 'ratelimit'(×142 g1), 'rate_limit'(×145 g1), 'unified'(×149 g1) …
//     REGION ANCHA (27794 B) — muy por encima de la mediana; puede envolver varios modulos.
t=e.oidcConfigured?`# Claude Code gateway protocol

This is the wire contract the Claude Code CLI uses to talk to this gateway:
sign-in, inference, managed settings, and telemetry. It's served from the
gateway itself so it always matches the version you're running.

> **Stability:** this protocol exists to give you a more stable target than
> proxying raw CLI traffic. Auth is standard OAuth 2.0, inference is the
> Messages API, and headers are the lowest common denominator across
> backends. We keep it backwards compatible within reason to support older
> clients, but not forever \u2014 expect changes, managed settings in particular,
> with notice.

A developer points Claude Code at your gateway's base URL via \`/login\` and
the client does the rest. All paths below are relative to that base URL, and
the client does not follow cross-origin redirects.

## Flow

1. Client fetches \`GET {base}/.well-known/oauth-authorization-server\`.
2. On first contact, client fingerprints your TLS certificate and asks the
   user to trust it.
3. Client runs the RFC 8628 device flow: \`POST device_authorization_endpoint\`
   -> user approves in a browser at \`verification_uri\` -> client polls
   \`token_endpoint\` until it gets a bearer token.
4. Client sends \`Authorization: Bearer <token>\` on every subsequent request.
5. Client uses fixed paths under \`{base}\` for inference (\`/v1/messages\`),
   policy (\`/managed/settings\`), model discovery (\`/v1/models\`), and
   telemetry (\`/v1/{metrics,logs,traces}\`).
6. Before the token expires, client silently calls \`token_endpoint\` with
   \`grant_type=refresh_token\`. If you didn't issue a refresh token, the user
   is sent back through the browser flow instead.

## Discovery \u2014 required

\`GET /.well-known/oauth-authorization-server\` (unauthenticated)

RFC 8414 authorization server metadata. The client reads
\`device_authorization_endpoint\` and \`token_endpoint\` and ignores the rest;
both must be same-origin with \`{base}\`. \`authorization_endpoint\` is
intentionally absent.

    {
      "issuer": "https://gw.corp.example.com",
      "device_authorization_endpoint": "https://gw.corp.example.com/oauth/device_authorization",
      "token_endpoint": "https://gw.corp.example.com/oauth/token",
      "grant_types_supported": ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"]
    }

## Device authorization \u2014 required

\`POST {device_authorization_endpoint}\` (unauthenticated)

RFC 8628 \xA73.2. The client opens \`verification_uri_complete\` in the user's
browser and polls \`token_endpoint\` every \`interval\` seconds.

    {
      "device_code": "AbK9-s3n4C8H...",
      "user_code": "WDJB-MJHT",
      "verification_uri": "https://gw.corp.example.com/device",
      "verification_uri_complete": "https://gw.corp.example.com/device?user_code=WDJB-MJHT",
      "expires_in": 600,
      "interval": 5
    }

\`device_code\` should be >=256 bits, opaque, single-use. \`user_code\` should
use a base-20 charset (RFC 8628 \xA76.1).

## Verification page \u2014 required

\`GET/POST {verification_uri}\` (browser-facing; the client never calls this)

Accept the user code, authenticate the user against your IdP, and mark the
matching \`device_code\` approved so the next token poll succeeds. Apply a
per-IP rate limit (RFC 8628 \xA75.1) and don't auto-submit a pre-filled code
(\xA75.4).

## Token \u2014 required

\`POST {token_endpoint}\` (unauthenticated,
\`application/x-www-form-urlencoded\`)

**Device grant** (\`grant_type=urn:ietf:params:oauth:grant-type:device_code\`):

| Status | Body | Client reaction |
|---|---|---|
| 200 | \`{"access_token","token_type":"Bearer","expires_in","refresh_token"?}\` | Login complete. \`refresh_token\` is optional; omit it and the client re-runs the device flow on expiry. |
| 400 | \`{"error":"authorization_pending"}\` | Keep polling. |
| 400/429 | \`{"error":"slow_down"}\` | Add 5s to the poll interval. |
| 400 | \`{"error":"access_denied"}\` | Stop. |
| 400 | \`{"error":"expired_token"}\` | Stop. |

**Refresh grant** (\`grant_type=refresh_token\`): return a fresh
\`{"access_token","token_type","expires_in","refresh_token"}\` on 200. Return
\`401 {"error":"invalid_grant"}\` to force re-login \u2014 this is your
deprovisioning hook.

## Messages \u2014 required

\`POST /v1/messages\` and \`POST /v1/messages/count_tokens\` (bearer)

The Anthropic Messages API (https://platform.claude.com/docs/en/api/messages),
unchanged. Proxy to your upstream and stream the response back. Enforce your
model allowlist here, returning \`400 invalid_request_error\` for a denied
model. Don't buffer SSE on the \`stream: true\` path. The client always sets
\`Content-Length\`, so you may reject chunked-without-CL (\`411\`) and cap body
size (\`413\`). The client doesn't assume server-side tools are available. The
client also sends \`x-app\` and \`x-stainless-*\` headers \u2014 pass them through or
drop them, but don't reject the request because of them.

## Managed settings \u2014 optional

\`GET /managed/settings\` (bearer)

The authenticated user's Claude Code \`managed-settings.json\`; see
https://code.claude.com/docs/en/settings for the key reference. The client
polls about once an hour; support \`ETag\`/\`If-None-Match\` -> \`304\` to keep
that cheap. Return \`404\` for "no managed policy"; \`200 {}\` means "this user
has an empty policy" \u2014 they're not the same. **This is the endpoint most
likely to change.**

## Models \u2014 optional

\`GET /v1/models\` (bearer)

Anthropic models-list shape: \`{"data":[{"id","display_name"},...]}\`. Use
Anthropic-style IDs (\`claude-{family}-{major}-{minor}\`) \u2014 the client's
model-family logic keys on that shape. The client only calls this when
\`CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY\` is set on the client, which you
can push via the \`env\` block in \`/managed/settings\`. Return \`404\` to fall
back to the client's built-in list.

## Telemetry \u2014 optional

\`POST /v1/metrics\`, \`/v1/logs\`, \`/v1/traces\` (bearer)

OTLP/HTTP (protobuf or JSON). When connected to a gateway the client sends
telemetry here and ignores \`OTEL_EXPORTER_OTLP_*\` env vars. Return \`200\`
whether you forward or discard \u2014 \`404\` makes the client's exporter log an
error on every flush.

## Errors

OAuth endpoints use \`{"error":"...","error_description":"..."}\`
(RFC 6749/8628). Bearer-authenticated endpoints use the Anthropic envelope so
the SDK surfaces the message to the user:

    {"type":"error","error":{"type":"authentication_error","message":"..."}}

| HTTP | error.type | Use for |
|---|---|---|
| 400 | \`invalid_request_error\` | Denied model, malformed body, policy violation |
| 401 | \`authentication_error\` | Missing/expired/invalid bearer; client prompts re-login |
| 403 | \`permission_error\` | Authenticated but not allowed |
| 413 | \`request_too_large\` | Body over your cap |
| 429 | \`rate_limit_error\` | Throttling; include \`Retry-After\` |
| 429 | \`billing_error\` | The user's own cap on your gateway is reached; see Usage-limit headers below |
| 501 | \`not_supported\` | Endpoint not available on this backend |
| 529 | \`overloaded_error\` | Upstream at capacity; client backs off and retries |
| 5xx | \`api_error\` | Anything else |

## Usage-limit headers \u2014 optional

If you enforce a per-user spend or usage cap, report the caller's standing
against it on each successful \`POST /v1/messages\` response and Claude Code
(2.1.225 and later, when signed in to a gateway) shows its usual "You've used
NN% of your usage credits \xB7 resets \u2026" notice past 75% and again past 95%.
These are the same \`anthropic-ratelimit-unified-*\` headers api.anthropic.com
sends its subscribers, so strip the upstream's own \`anthropic-ratelimit-*\`
response headers first \u2014 otherwise your org-wide quota reaches users as if it
were theirs. Send none of these for a user with no cap.

| Header | Value |
|---|---|
| \`anthropic-ratelimit-unified-status\` | \`allowed\`, or \`allowed_warning\` once past a threshold |
| \`anthropic-ratelimit-unified-representative-claim\` | \`overage\` \u2014 the window-agnostic claim; \`5h\`/\`7d\` mean rolling 5-hour/7-day windows the client does time math on, so don't borrow them for a calendar budget |
| \`anthropic-ratelimit-unified-overage-status\` | Same value as \`-status\` |
| \`anthropic-ratelimit-unified-overage-utilization\` | Fraction of the cap used, two decimals, kept below \`1\` while you're still allowing requests (\`0.82\`) |
| \`anthropic-ratelimit-unified-overage-surpassed-threshold\` | \`0.75\` or \`0.95\` once utilization passes it \u2014 this header is what triggers the client's notice; omit it below 75% |
| \`anthropic-ratelimit-unified-reset\`, \`-overage-reset\` | When the cap resets, Unix seconds |

When the cap is reached, reject \`POST /v1/messages\` before proxying:

    HTTP/1.1 429
    retry-after: 37800
    x-should-retry: false
    anthropic-ratelimit-unified-status: rejected
    anthropic-ratelimit-unified-reset: 1786147200
    anthropic-ratelimit-unified-overage-reset: 1786147200
    anthropic-ratelimit-unified-overage-utilization: 1
    anthropic-ratelimit-unified-overage-surpassed-threshold: 1
    anthropic-ratelimit-unified-overage-period: daily
    anthropic-ratelimit-unified-overage-disabled-reason: org_spend_cap_reached

    {"type":"error","error":{"type":"billing_error","message":"spend limit reached (daily; resets 2026-08-08 00:00 UTC) \u2014 request an increase at https://go.corp.example.com/claude-limits"}}

Leave \`representative-claim\` and \`overage-status\` off the 429. With them the
client composes its own "You've hit your limit" line and drops your message;
without them it prints \`error.message\` as-is (older clients too, behind a
generic "API Error" prefix), so put the period, the reset time, and what the
user should do next in that one sentence. \`retry-after\` is seconds until the
reset; \`x-should-retry: false\` keeps the SDK from retrying into the block. If
you can't read your counter and choose to fail closed, send the 429 with
\`x-should-retry: false\`,
\`anthropic-ratelimit-unified-overage-disabled-reason: fetch_error\`, and a
message, nothing else. This gateway sends exactly the shapes above for caps
set through its admin API (\`overage-period\` is \`daily\`, \`weekly\`, or
\`monthly\`); when several caps apply it describes the fullest one, or once
blocked the one that resets last.

## Bearer token

Your \`access_token\` is opaque to the client \u2014 it stores it, sends it, and
refreshes it before \`expires_in\`, but never inspects the payload. Encode the
user's identity and groups in the token (or in server-side state keyed by it)
so you can apply per-user RBAC at \`/v1/messages\` and per-group policy at
\`/managed/settings\`. The same token must work across every
bearer-authenticated endpoint.

## TLS

\`https://\` is required; \`http://\` is accepted only for loopback during
development. The client pins the SHA-256 fingerprint of your TLS leaf
certificate per-hostname after the user confirms it on first connect, and
re-prompts on mismatch \u2014 rotating your certificate costs every user one
confirmation prompt.

## Client guarantees

- OAuth endpoint paths come from your discovery document; the client never
  hard-codes \`/oauth/token\`.
- Fixed-path endpoints are resolved against \`{base}\`, never a redirect.
- Every request body carries \`Content-Length\`.
- The OTLP exporter is locked to \`{base}/v1/{signal}\` regardless of the
  user's environment.
- \`404\` from \`/v1/models\` or \`/managed/settings\` is a clean "not
  implemented", with no retry storm.

## Proxying to Bedrock, Vertex, or Foundry

Proxying to \`api.anthropic.com\` is pass-through. Proxying to a cloud
provider's Claude endpoint needs translation:

- **Model IDs.** The client sends Anthropic-style IDs like
  \`claude-sonnet-4-5\`; translate to the upstream's form (Bedrock model ID or
  inference-profile ARN; Vertex \`@\`-versioned ID), or advertise
  upstream-native IDs from \`/v1/models\`.
- **\`anthropic-beta\`.** Bedrock rejects some betas in the *header*; move them
  into the request body as \`"anthropic_beta": [...]\`. Vertex and Foundry
  accept the header.
- **Streaming.** Bedrock's native stream is AWS binary event-stream, not SSE;
  decode and re-emit Anthropic-shaped \`text/event-stream\`. The provider SDKs
  handle this, but their stream iterators drop the upstream's \`ping\` events
  (and Bedrock sends none) \u2014 emit your own \`event: ping\` during silent gaps
  so long thinking pauses don't trip client or proxy idle timeouts.
- **\`count_tokens\`.** Bedrock has no count-tokens API. Return
  \`501 not_supported\`; the client falls back to a Haiku \`max_tokens:1\` probe.
- **Headers.** Forward \`content-type\`, \`accept\`, \`accept-encoding\`,
  \`anthropic-version\`, \`anthropic-beta\`, \`user-agent\`, and \`x-stainless-*\`;
  strip the client's \`Authorization\` and apply the upstream's own
  credentials. On the response, strip hop-by-hop headers
  (\`content-encoding\`, \`content-length\`, \`transfer-encoding\`, \`connection\`).
- **Errors.** Upstream error messages can carry your cloud account
  IDs/ARNs/project IDs \u2014 log them for the operator and return a generic
  message, keeping \`error.type\`. The exception is a 400/413 in Anthropic's
  own error envelope (e.g. \`prompt is too long: \u2026\`): relay that
  \`error.message\`, the client's recovery (auto-compact etc.) keys on it.

## References

RFC 6749 (OAuth 2.0), RFC 8414 (AS metadata), RFC 8628 (device grant),
Anthropic Messages API, Claude Code settings reference, OTLP spec.
`:`# Claude Code gateway protocol

This is the wire contract the Claude Code CLI uses to talk to this gateway:
sign-in, inference, managed settings, and telemetry. It's served from the
gateway itself so it always matches the version you're running.

> **Stability:** this protocol exists to give you a more stable target than
> proxying raw CLI traffic. Auth is standard OAuth 2.0, inference is the
> Messages API, and headers are the lowest common denominator across
> backends. We keep it backwards compatible within reason to support older
> clients, but not forever \u2014 expect changes, managed settings in particular,
> with notice.

A developer points Claude Code at your gateway's base URL via \`/login\` and
the client does the rest. All paths below are relative to that base URL, and
the client does not follow cross-origin redirects.

## Flow

1. Client fetches \`GET {base}/.well-known/oauth-authorization-server\`.
2. On first contact, client fingerprints your TLS certificate and asks the
   user to trust it.
3. Client runs the RFC 8628 device flow: \`POST device_authorization_endpoint\`
   -> user approves in a browser at \`verification_uri\` -> client polls
   \`token_endpoint\` until it gets a bearer token.
4. Client sends \`Authorization: Bearer <token>\` on every subsequent request.
5. Client uses fixed paths under \`{base}\` for inference (\`/v1/messages\`),
   policy (\`/managed/settings\`), model discovery (\`/v1/models\`), and
   telemetry (\`/v1/{metrics,logs,traces}\`).
6. Before the token expires, client silently calls \`token_endpoint\` with
   \`grant_type=refresh_token\`. If you didn't issue a refresh token, the user
   is sent back through the browser flow instead.

## Discovery \u2014 required

\`GET /.well-known/oauth-authorization-server\` (unauthenticated)

RFC 8414 authorization server metadata. The client reads
\`device_authorization_endpoint\` and \`token_endpoint\` and ignores the rest;
both must be same-origin with \`{base}\`. \`authorization_endpoint\` is
intentionally absent.

    {
      "issuer": "https://gw.corp.example.com",
      "device_authorization_endpoint": "https://gw.corp.example.com/oauth/device_authorization",
      "token_endpoint": "https://gw.corp.example.com/oauth/token",
      "grant_types_supported": ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"]
    }

## Device authorization \u2014 required

\`POST {device_authorization_endpoint}\` (unauthenticated)

RFC 8628 \xA73.2. The client opens \`verification_uri_complete\` in the user's
browser and polls \`token_endpoint\` every \`interval\` seconds.

    {
      "device_code": "AbK9-s3n4C8H...",
      "user_code": "WDJB-MJHT",
      "verification_uri": "https://gw.corp.example.com/device",
      "verification_uri_complete": "https://gw.corp.example.com/device?user_code=WDJB-MJHT",
      "expires_in": 600,
      "interval": 5
    }

\`device_code\` should be >=256 bits, opaque, single-use. \`user_code\` should
use a base-20 charset (RFC 8628 \xA76.1).

## Verification page \u2014 required

\`GET/POST {verification_uri}\` (browser-facing; the client never calls this)

Accept the user code, authenticate the user against your IdP, and mark the
matching \`device_code\` approved so the next token poll succeeds. Apply a
per-IP rate limit (RFC 8628 \xA75.1) and don't auto-submit a pre-filled code
(\xA75.4).

## Token \u2014 required

\`POST {token_endpoint}\` (unauthenticated,
\`application/x-www-form-urlencoded\`)

**Device grant** (\`grant_type=urn:ietf:params:oauth:grant-type:device_code\`):

| Status | Body | Client reaction |
|---|---|---|
| 200 | \`{"access_token","token_type":"Bearer","expires_in","refresh_token"?}\` | Login complete. \`refresh_token\` is optional; omit it and the client re-runs the device flow on expiry. |
| 400 | \`{"error":"authorization_pending"}\` | Keep polling. |
| 400/429 | \`{"error":"slow_down"}\` | Add 5s to the poll interval. |
| 400 | \`{"error":"access_denied"}\` | Stop. |
| 400 | \`{"error":"expired_token"}\` | Stop. |

**Refresh grant** (\`grant_type=refresh_token\`): return a fresh
\`{"access_token","token_type","expires_in","refresh_token"}\` on 200. Return
\`401 {"error":"invalid_grant"}\` to force re-login \u2014 this is your
deprovisioning hook.

## Messages \u2014 required

\`POST /v1/messages\` and \`POST /v1/messages/count_tokens\` (bearer)

The Anthropic Messages API (https://platform.claude.com/docs/en/api/messages),
unchanged. Proxy to your upstream and stream the response back. Enforce your
model allowlist here, returning \`400 invalid_request_error\` for a denied
model. Don't buffer SSE on the \`stream: true\` path. The client always sets
\`Content-Length\`, so you may reject chunked-without-CL (\`411\`) and cap body
size (\`413\`). The client doesn't assume server-side tools are available. The
client also sends \`x-app\` and \`x-stainless-*\` headers \u2014 pass them through or
drop them, but don't reject the request because of them.

## Managed settings \u2014 optional

\`GET /managed/settings\` (bearer)

The authenticated user's Claude Code \`managed-settings.json\`; see
https://code.claude.com/docs/en/settings for the key reference. The client
polls about once an hour; support \`ETag\`/\`If-None-Match\` -> \`304\` to keep
that cheap. Return \`404\` for "no managed policy"; \`200 {}\` means "this user
has an empty policy" \u2014 they're not the same. **This is the endpoint most
likely to change.**

## Models \u2014 optional

\`GET /v1/models\` (bearer)

Anthropic models-list shape: \`{"data":[{"id","display_name"},...]}\`. Use
Anthropic-style IDs (\`claude-{family}-{major}-{minor}\`) \u2014 the client's
model-family logic keys on that shape. The client only calls this when
\`CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY\` is set on the client, which you
can push via the \`env\` block in \`/managed/settings\`. Return \`404\` to fall
back to the client's built-in list.

## Telemetry \u2014 optional

\`POST /v1/metrics\`, \`/v1/logs\`, \`/v1/traces\` (bearer)

OTLP/HTTP (protobuf or JSON). When connected to a gateway the client sends
telemetry here and ignores \`OTEL_EXPORTER_OTLP_*\` env vars. Return \`200\`
whether you forward or discard \u2014 \`404\` makes the client's exporter log an
error on every flush.

## Errors

OAuth endpoints use \`{"error":"...","error_description":"..."}\`
(RFC 6749/8628). Bearer-authenticated endpoints use the Anthropic envelope so
the SDK surfaces the message to the user:

    {"type":"error","error":{"type":"authentication_error","message":"..."}}

| HTTP | error.type | Use for |
|---|---|---|
| 400 | \`invalid_request_error\` | Denied model, malformed body, policy violation |
| 401 | \`authentication_error\` | Missing/expired/invalid bearer; client prompts re-login |
| 403 | \`permission_error\` | Authenticated but not allowed |
| 413 | \`request_too_large\` | Body over your cap |
| 429 | \`rate_limit_error\` | Throttling; include \`Retry-After\` |
| 429 | \`billing_error\` | The user's own cap on your gateway is reached; see Usage-limit headers below |
| 501 | \`not_supported\` | Endpoint not available on this backend |
| 529 | \`overloaded_error\` | Upstream at capacity; client backs off and retries |
| 5xx | \`api_error\` | Anything else |

## Usage-limit headers \u2014 optional

If you enforce a per-user spend or usage cap, report the caller's standing
against it on each successful \`POST /v1/messages\` response and Claude Code
(2.1.225 and later, when signed in to a gateway) shows its usual "You've used
NN% of your usage credits \xB7 resets \u2026" notice past 75% and again past 95%.
These are the same \`anthropic-ratelimit-unified-*\` headers api.anthropic.com
sends its subscribers, so strip the upstream's own \`anthropic-ratelimit-*\`
response headers first \u2014 otherwise your org-wide quota reaches users as if it
were theirs. Send none of these for a user with no cap.

| Header | Value |
|---|---|
| \`anthropic-ratelimit-unified-status\` | \`allowed\`, or \`allowed_warning\` once past a threshold |
| \`anthropic-ratelimit-unified-representative-claim\` | \`overage\` \u2014 the window-agnostic claim; \`5h\`/\`7d\` mean rolling 5-hour/7-day windows the client does time math on, so don't borrow them for a calendar budget |
| \`anthropic-ratelimit-unified-overage-status\` | Same value as \`-status\` |
| \`anthropic-ratelimit-unified-overage-utilization\` | Fraction of the cap used, two decimals, kept below \`1\` while you're still allowing requests (\`0.82\`) |
| \`anthropic-ratelimit-unified-overage-surpassed-threshold\` | \`0.75\` or \`0.95\` once utilization passes it \u2014 this header is what triggers the client's notice; omit it below 75% |
| \`anthropic-ratelimit-unified-reset\`, \`-overage-reset\` | When the cap resets, Unix seconds |

When the cap is reached, reject \`POST /v1/messages\` before proxying:

    HTTP/1.1 429
    retry-after: 37800
    x-should-retry: false
    anthropic-ratelimit-unified-status: rejected
    anthropic-ratelimit-unified-reset: 1786147200
    anthropic-ratelimit-unified-overage-reset: 1786147200
    anthropic-ratelimit-unified-overage-utilization: 1
    anthropic-ratelimit-unified-overage-surpassed-threshold: 1
    anthropic-ratelimit-unified-overage-period: daily
    anthropic-ratelimit-unified-overage-disabled-reason: org_spend_cap_reached

    {"type":"error","error":{"type":"billing_error","message":"spend limit reached (daily; resets 2026-08-08 00:00 UTC) \u2014 request an increase at https://go.corp.example.com/claude-limits"}}

Leave \`representative-claim\` and \`overage-status\` off the 429. With them the
client composes its own "You've hit your limit" line and drops your message;
without them it prints \`error.message\` as-is (older clients too, behind a
generic "API Error" prefix), so put the period, the reset time, and what the
user should do next in that one sentence. \`retry-after\` is seconds until the
reset; \`x-should-retry: false\` keeps the SDK from retrying into the block. If
you can't read your counter and choose to fail closed, send the 429 with
\`x-should-retry: false\`,
\`anthropic-ratelimit-unified-overage-disabled-reason: fetch_error\`, and a
message, nothing else. This gateway sends exactly the shapes above for caps
set through its admin API (\`overage-period\` is \`daily\`, \`weekly\`, or
\`monthly\`); when several caps apply it describes the fullest one, or once
blocked the one that resets last.

## Bearer token

Your \`access_token\` is opaque to the client \u2014 it stores it, sends it, and
refreshes it before \`expires_in\`, but never inspects the payload. Encode the
user's identity and groups in the token (or in server-side state keyed by it)
so you can apply per-user RBAC at \`/v1/messages\` and per-group policy at
\`/managed/settings\`. The same token must work across every
bearer-authenticated endpoint.

## TLS

\`https://\` is required; \`http://\` is accepted only for loopback during
development. The client pins the SHA-256 fingerprint of your TLS leaf
certificate per-hostname after the user confirms it on first connect, and
re-prompts on mismatch \u2014 rotating your certificate costs every user one
confirmation prompt.

## Client guarantees

- OAuth endpoint paths come from your discovery document; the client never
  hard-codes \`/oauth/token\`.
- Fixed-path endpoints are resolved against \`{base}\`, never a redirect.
- Every request body carries \`Content-Length\`.
- The OTLP exporter is locked to \`{base}/v1/{signal}\` regardless of the
  user's environment.
- \`404\` from \`/v1/models\` or \`/managed/settings\` is a clean "not
  implemented", with no retry storm.

## Proxying to Bedrock, Vertex, or Foundry

Proxying to \`api.anthropic.com\` is pass-through. Proxying to a cloud
provider's Claude endpoint needs translation:

- **Model IDs.** The client sends Anthropic-style IDs like
  \`claude-sonnet-4-5\`; translate to the upstream's form (Bedrock model ID or
  inference-profile ARN; Vertex \`@\`-versioned ID), or advertise
  upstream-native IDs from \`/v1/models\`.
- **\`anthropic-beta\`.** Bedrock rejects some betas in the *header*; move them
  into the request body as \`"anthropic_beta": [...]\`. Vertex and Foundry
  accept the header.
- **Streaming.** Bedrock's native stream is AWS binary event-stream, not SSE;
  decode and re-emit Anthropic-shaped \`text/event-stream\`. The provider SDKs
  handle this, but their stream iterators drop the upstream's \`ping\` events
  (and Bedrock sends none) \u2014 emit your own \`event: ping\` during silent gaps
  so long thinking pauses don't trip client or proxy idle timeouts.
- **\`count_tokens\`.** Bedrock has no count-tokens API. Return
  \`501 not_supported\`; the client falls back to a Haiku \`max_tokens:1\` probe.
- **Headers.** Forward \`content-type\`, \`accept\`, \`accept-encoding\`,
  \`anthropic-version\`, \`anthropic-beta\`, \`user-agent\`, and \`x-stainless-*\`;
  strip the client's \`Authorization\` and apply the upstream's own
  credentials. On the response, strip hop-by-hop headers
  (\`content-encoding\`, \`content-length\`, \`transfer-encoding\`, \`connection\`).
- **Errors.** Upstream error messages can carry your cloud account
  IDs/ARNs/project IDs \u2014 log them for the operator and return a generic
  message, keeping \`error.type\`. The exception is a 400/413 in Anthropic's
  own error envelope (e.g. \`prompt is too long: \u2026\`): relay that
  \`error.message\`, the client's recovery (auto-compact etc.) keys on it.

## References

RFC 6749 (OAuth 2.0), RFC 8414 (AS metadata), RFC 8628 (device grant),
Anthropic Messages API, Claude Code settings reference, OTLP spec.
`.replace("## Flow",`${`> **This deployment runs without an identity provider (\`oidc\` is not
> configured):** the device sign-in flow described below is unavailable \u2014
> every IdP-backed sign-in route returns 404 and the well-known document
> advertises no OAuth endpoints. Callers authenticate as customer-routed
> inference principals with a short-lived CRI JWT minted by Anthropic (see
> the customer-routed inference section).

`}## Flow`)

// Habia 62 sitios de co-ocurrencia; se emitieron los 6 de mayor cruce. Un contrato con muchas
// realizaciones (una interfaz) los tiene por decenas.
