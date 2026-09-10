// ==========================================================================
// tools/TeamCreateTool/TeamCreateTool.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/tools/TeamCreateTool/TeamCreateTool.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 4  (0 cadena, 4 nombre)
//   descartadas por ruido (>400 aparic.) : 8
//   sitios de co-ocurrencia : 7  (se emiten los 6 de mayor cruce)
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

// --- bundle[12313425:12314431]  (1006 B)
//     especificidad 5.576 · 3 anclas — 'team_name'(×30 g1), 'agent_type'(×131 g1), 'inputSchema'(×238 g1)
async function szi(e,t,r,n,o,i){for(let[c,u]of[["name",e],["team_name",t]])if(t5f(u))throw pe("subagent_launch","subagent_teammate_control_chars"),Error(c==="name"?"Invalid name: control characters are not allowed in agent or team names":"Invalid team_name: control characters are not allowed in agent or team names");let s=await Vqe(t,(c)=>{let u=Imm(e,c),d=tWe(u,t),p=n.assign(d);return c.members.push({agentId:d,name:u,color:p,joinedAt:Date.now(),tmuxPaneId:"",subscriptions:[],...r}),{sanitizedName:u,teammateId:d,teammateColor:p}},void 0,i);if(!s)throw pe("subagent_launch","subagent_teammate_internal_invariant"),Error("reserveTeammateIdentity: updateTeamFile returned undefined");let a=!1,l;try{return await o(s,()=>{a=!0},(c)=>{l=c})}catch(c){if(!a){if(l)try{await l()}catch(u){E(`[spawnTeammate] pane cleanup failed for ${s.teammateId}: ${le(u)}`)}await Ccl(t,s.teammateId,i)}else E(`[spawnTeammate] post-commit failure for ${s.teammateId}; entry kept (agent already running): ${le(c)}`);throw c}}

// --- bundle[2554149:2554737]  (588 B)
//     especificidad 4.103 · 2 anclas — 'team_name'(×30 g1), 'agent_type'(×131 g1)
function C4b(){return{event_name:"",client_timestamp:void 0,model:"",session_id:"",user_type:"",betas:"",env:void 0,entrypoint:"",agent_sdk_version:"",is_interactive:!1,client_type:"",process:void 0,additional_metadata:void 0,auth:void 0,server_timestamp:void 0,event_id:"",device_id:"",swe_bench_run_id:"",swe_bench_instance_id:"",swe_bench_task_id:"",email:"",agent_id:"",parent_session_id:"",agent_type:"",slack:void 0,team_name:"",skill_name:"",plugin_name:"",marketplace_name:"",head_sha:"",client_reported_auth:void 0,event_metadata_vars:void 0,mcp_server_name:"",mcp_tool_name:""}}

// --- bundle[2563415:2565725]  (2310 B)
//     especificidad 4.103 · 2 anclas — 'team_name'(×30 g1), 'agent_type'(×131 g1)
fromJSON(e){return{event_name:kp(e.event_name)?globalThis.String(e.event_name):"",client_timestamp:kp(e.client_timestamp)?SNd(e.client_timestamp):void 0,model:kp(e.model)?globalThis.String(e.model):"",session_id:kp(e.session_id)?globalThis.String(e.session_id):"",user_type:kp(e.user_type)?globalThis.String(e.user_type):"",betas:kp(e.betas)?globalThis.String(e.betas):"",env:kp(e.env)?jJo.fromJSON(e.env):void 0,entrypoint:kp(e.entrypoint)?globalThis.String(e.entrypoint):"",agent_sdk_version:kp(e.agent_sdk_version)?globalThis.String(e.agent_sdk_version):"",is_interactive:kp(e.is_interactive)?globalThis.Boolean(e.is_interactive):!1,client_type:kp(e.client_type)?globalThis.String(e.client_type):"",process:kp(e.process)?globalThis.String(e.process):void 0,additional_metadata:kp(e.additional_metadata)?globalThis.String(e.additional_metadata):void 0,auth:kp(e.auth)?iht.fromJSON(e.auth):void 0,server_timestamp:kp(e.server_timestamp)?SNd(e.server_timestamp):void 0,event_id:kp(e.event_id)?globalThis.String(e.event_id):"",device_id:kp(e.device_id)?globalThis.String(e.device_id):"",swe_bench_run_id:kp(e.swe_bench_run_id)?globalThis.String(e.swe_bench_run_id):"",swe_bench_instance_id:kp(e.swe_bench_instance_id)?globalThis.String(e.swe_bench_instance_id):"",swe_bench_task_id:kp(e.swe_bench_task_id)?globalThis.String(e.swe_bench_task_id):"",email:kp(e.email)?globalThis.String(e.email):"",agent_id:kp(e.agent_id)?globalThis.String(e.agent_id):"",parent_session_id:kp(e.parent_session_id)?globalThis.String(e.parent_session_id):"",agent_type:kp(e.agent_type)?globalThis.String(e.agent_type):"",slack:kp(e.slack)?zJo.fromJSON(e.slack):void 0,team_name:kp(e.team_name)?globalThis.String(e.team_name):"",skill_name:kp(e.skill_name)?globalThis.String(e.skill_name):"",plugin_name:kp(e.plugin_name)?globalThis.String(e.plugin_name):"",marketplace_name:kp(e.marketplace_name)?globalThis.String(e.marketplace_name):"",head_sha:kp(e.head_sha)?globalThis.String(e.head_sha):"",client_reported_auth:kp(e.client_reported_auth)?sht.fromJSON(e.client_reported_auth):void 0,event_metadata_vars:kp(e.event_metadata_vars)?globalThis.String(e.event_metadata_vars):void 0,mcp_server_name:kp(e.mcp_server_name)?globalThis.String(e.mcp_server_name):"",mcp_tool_name:kp(e.mcp_tool_name)?globalThis.String(e.mcp_tool_name):""}}

// --- bundle[2717343:2717641]  (298 B)
//     especificidad 4.103 · 2 anclas — 'team_name'(×30 g1), 'agent_type'(×131 g1)
agent_id:O().optional().describe("Subagent identifier. Present only when the hook fires from within a subagent (e.g., a tool called by an AgentTool worker). Absent for the main thread, even in --agent sessions. Use this field (not agent_type) to distinguish subagent calls from main-thread calls.")

// --- bundle[3126386:3129286]  (2900 B)
//     especificidad 4.103 · 2 anclas — 'team_name'(×30 g1), 'agent_type'(×131 g1)
function m3d(e,t,r={}){let{envContext:n,processMetrics:o,rh:i,head_sha:s,coachMode:a,observerMode:l,sessionKind:c,hasAttacher:u,rendererMode:d,subscriptionType:p,parentAgentId:f,promptId:m,...h}=e,g={platform:n.platform,platform_raw:n.platformRaw,arch:n.arch,node_version:n.nodeVersion,terminal:n.terminal||"unknown",shell:n.shell,package_managers:n.packageManagers,runtimes:n.runtimes,is_running_with_bun:n.isRunningWithBun,is_ci:n.isCi,is_claubbit:n.isClaubbit,is_claude_code_remote:n.isClaudeCodeRemote,is_local_agent_mode:n.isLocalAgentMode,is_conductor:n.isConductor,is_github_action:n.isGithubAction,is_claude_code_action:n.isClaudeCodeAction,is_claude_ai_auth:n.isClaudeAiAuth,version:n.version,build_time:n.buildTime,deployment_environment:n.deploymentEnvironment};if(n.remoteEnvironmentType)g.remote_environment_type=n.remoteEnvironmentType;if(n.claudeCodeContainerId)g.claude_code_container_id=n.claudeCodeContainerId;if(n.claudeCodeRemoteSessionId)g.claude_code_remote_session_id=n.claudeCodeRemoteSessionId;if(n.tags)g.tags=n.tags.split(",").map((b)=>b.trim()).filter(Boolean);if(n.githubEventName)g.github_event_name=n.githubEventName;if(n.githubActionsRunnerEnvironment)g.github_actions_runner_environment=n.githubActionsRunnerEnvironment;if(n.githubActionsRunnerOs)g.github_actions_runner_os=n.githubActionsRunnerOs;if(n.githubActionRef)g.github_action_ref=n.githubActionRef;if(n.wslVersion)g.wsl_version=n.wslVersion;if(n.linuxDistroId)g.linux_distro_id=n.linuxDistroId;if(n.linuxDistroVersion)g.linux_distro_version=n.linuxDistroVersion;if(n.linuxKernel)g.linux_kernel=n.linuxKernel;if(n.vcs)g.vcs=n.vcs;if(n.versionBase)g.version_base=n.versionBase;let y={session_id:h.sessionId,model:h.model,user_type:h.userType,is_interactive:h.isInteractive==="true",client_type:h.clientType};if(h.betas)y.betas=h.betas;if(h.entrypoint)y.entrypoint=h.entrypoint;if(h.agentSdkVersion)y.agent_sdk_version=h.agentSdkVersion;if(h.sweBenchRunId)y.swe_bench_run_id=h.sweBenchRunId;if(h.sweBenchInstanceId)y.swe_bench_instance_id=h.sweBenchInstanceId;if(h.sweBenchTaskId)y.swe_bench_task_id=h.sweBenchTaskId;if(h.agentId)y.agent_id=h.agentId;if(h.parentSessionId)y.parent_session_id=h.parentSessionId;if(h.agentType)y.agent_type=h.agentType;if(h.teamName)y.team_name=h.teamName;if(t.githubActionsMetadata){let b=t.githubActionsMetadata;g.github_actions_metadata={actor_id:b.actorId,repository_id:b.repositoryId,repository_owner_id:b.repositoryOwnerId}}let _;if(t.accountUuid||t.organizationUuid)_={account_uuid:t.accountUuid,organization_uuid:t.organizationUuid};return{env:g,...o&&{process:Buffer.from(Re(o)).toString("base64")},..._&&{auth:_},core:y,additional:{...i&&{rh:i},...s&&{_PROTO_head_sha:s},...a&&{coach_mode:a},...l&&{observer_mode:l},...c&&{session_kind:c},...u&&{has_attacher:u},...d&&{renderer_mode:d},...p&&{subscription_type:p},...f&&{parent_agent_id:f},...m&&{cc_prompt_id:m},...r}}}

// --- bundle[16493073:16493438]  (365 B)
//     especificidad 4.103 · 2 anclas — 'team_name'(×30 g1), 'agent_type'(×131 g1)
async function*Hlo(e,t,r,n,o,i,s,a=eb,l){let c=r!==void 0?{id:jT(r),project:e.project}:e,u={...S_(c,tr()),hook_event_name:"SessionStart",source:t,agent_type:o,model:i,session_title:n??vH(c.id)};yhr("hook_exec",bes);try{yield*g2({session:e,hookInput:u,toolUseID:ves.randomUUID(),matchQuery:t,signal:s,timeoutMs:a,forceSyncExecution:l})}finally{_hr("hook_exec",bes)}}

// Habia 7 sitios de co-ocurrencia; se emitieron los 6 de mayor cruce. Un contrato con muchas
// realizaciones (una interfaz) los tiene por decenas.
