// ==========================================================================
// tools/SkillTool/SkillTool.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/tools/SkillTool/SkillTool.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 14  (9 cadena, 5 nombre)
//   descartadas por ruido (>400 aparic.) : 40
//   sitios de co-ocurrencia : 21  (se emiten los 6 de mayor cruce)
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

// --- bundle[11932911:11933195]  (284 B)
//     especificidad 11.762 · 12 anclas — 'contentLength'(×32 g1), 'isHidden'(×94 g1), 'commandName'(×126 g1), 'userInvocable'(×60 g2), 'progressMessage'(×84 g2) …
function Odm({skill:e},{commands:t,teammateAuthorOf:r}){if(!e)return null;let n=e.trim(),o=n.startsWith("/")?n.substring(1):n,i=t?.find((l)=>l.name===o),s=i?.loadedFrom==="commands_DEPRECATED"?`/${o}`:o,a=r?.(i?.type==="prompt"?i.source:void 0,o)??null;return a?`${s} \xB7 by ${a}`:s}

// --- bundle[7168934:7170095]  (1161 B)
//     especificidad 9.630 · 10 anclas — 'contentLength'(×32 g1), 'isHidden'(×94 g1), 'userInvocable'(×60 g2), 'progressMessage'(×84 g2), 'disableModelInvocation'(×51 g3) …
n={type:"prompt",name:e.name,description:typeof e.description==="function"?"":e.description,menuDescription:e.menuDescription,aliases:e.aliases,subcommands:e.subcommands,subcommandsBareOnly:e.subcommandsBareOnly,hasUserSpecifiedDescription:!0,allowedTools:e.allowedTools??[],getAllowedTools:e.getAllowedTools,disallowedTools:e.disallowedTools??[],argumentHint:typeof e.argumentHint==="function"?void 0:e.argumentHint,whenToUse:typeof e.whenToUse==="function"?void 0:e.whenToUse,model:e.model,disableModelInvocation:typeof e.disableModelInvocation==="function"?!0:e.disableModelInvocation??!1,userInvocable:e.userInvocable??!0,terminalOriented:e.terminalOriented,argsMayContainSlashCommands:e.argsMayContainSlashCommands,contentLength:0,source:"bundled",loadedFrom:"bundled",hooks:e.hooks,skillRoot:t,context:e.context,getContext:e.getContext,agent:e.agent,background:e.background,isEnabled:e.isEnabled,requires:e.requires,isHidden:!(e.userInvocable??!0),progressMessage:e.progressMessage??"running",getPromptForCommand:r,getEffort:e.getEffort,getDefaultEffort:e.getDefaultEffort,onUserTypedArgs:e.onUserTypedArgs,getArgumentCompletions:e.getArgumentCompletions}

// --- bundle[7348759:7351327]  (2568 B)
//     especificidad 9.268 · 9 anclas — 'contentLength'(×32 g1), 'isHidden'(×94 g1), 'userInvocable'(×60 g2), 'progressMessage'(×84 g2), 'disableModelInvocation'(×51 g3) …
function L9n(e,t,r,n,o,i,s={isSkillMode:!1}){try{let{frontmatter:a,content:l}=t,c=Ome(a.description,e),u=c??vtt(l,i?"Plugin skill":"Plugin command"),p=V3.dirname(t.filePath),f=(Y)=>{let W=hOe(Y,{path:o,source:r});if(s.isSkillMode)W=W.replace(/\$\{CLAUDE_SKILL_DIR\}/g,()=>p);return W},m=a["allowed-tools"],h=typeof m==="string"?f(m):Array.isArray(m)?m.map((Y)=>typeof Y==="string"?f(Y):Y):m,g=cce(h),y=cce(a["disallowed-tools"]??a.disallowedTools),_=a["argument-hint"]!=null?String(a["argument-hint"]):void 0,b=_Si(a.arguments),S=a.when_to_use!=null?String(a.when_to_use):void 0,w=a.version!=null?String(a.version):void 0,H=a.name!=null?String(a.name):void 0,T=e.slice(0,e.lastIndexOf(":")+1),k=H?`${T}${H}`:e,C=H&&!H.includes(":")?[H]:void 0,x=a.model,I;if(typeof x==="string"&&x.trim().length>0){let Y=x.trim();I=Y==="inherit"?void 0:vs(Y)}let P=a.effort,M=P!==void 0?Cne(P):void 0;if(P!==void 0&&M===void 0)E(`Plugin command ${e} has invalid effort '${P}'. Valid options: ${HB.join(", ")} or an integer`);let D=DGr(a["disable-model-invocation"]),F=a["user-invocable"],U=F===void 0?!0:DGr(F),G=Gui(a.shell,e),Q;if((i||s.isSkillMode)&&a.hooks){let Y=Xbe().safeParse(a.hooks);if(Y.success)Q=Y.data;else E(`Invalid hooks in plugin skill '${e}': ${Y.error.message}`)}return{type:"prompt",name:e,description:u,hasUserSpecifiedDescription:c!==null,allowedTools:g,disallowedTools:y.length>0?y:void 0,argumentHint:_,argNames:b.length>0?b:void 0,whenToUse:S,version:w,model:I,effort:M,context:a.context==="fork"?"fork":void 0,agent:a.agent!=null?String(a.agent):void 0,background:PCe(a.background),disableModelInvocation:D,userInvocable:U,declaredFields:zui(a),metadata:Go(a.metadata)?a.metadata:void 0,contentLength:l.length,source:"plugin",loadedFrom:i||s.isSkillMode?"plugin":void 0,hooks:Q,skillRoot:(i||s.isSkillMode)&&Q?o:void 0,pluginInfo:{pluginManifest:n,repository:r},isHidden:!U,progressMessage:i||s.isSkillMode?"loading":"running",userFacingName(){return k},aliases:C,async getPromptForCommand(Y,W){let V=s.isSkillMode?`Base directory for this skill: ${V3.dirname(t.filePath)}

${l}`:l;if(V=VFt(V,Y,!0,b,Q7),V=hOe(V,{path:o,source:r}),n.userConfig)V=vli(V,await LQ(r),n.userConfig,Q7);if(s.isSkillMode)V=V.replace(/\$\{CLAUDE_SKILL_DIR\}/g,p);if(V=V.replace(/\$\{CLAUDE_SESSION_ID\}/g,qt()),V=V.replaceAll("${CLAUDE_EFFORT}",aV(I??W.options.mainLoopModel,M??HH(W))),MSi())V=eVr(V);else V=await eNe(V,{...W,getAppState:s2t(W,g)},`/${e}`,G);return[{type:"text",text:V}]}}}catch(a){return E(`Failed to create command from ${t.filePath}: ${a}`,{level:"error"}),null}}

// --- bundle[15979673:15990327]  (10654 B)
//     especificidad 9.268 · 9 anclas — 'contentLength'(×32 g1), 'isHidden'(×94 g1), 'userInvocable'(×60 g2), 'progressMessage'(×84 g2), 'disableModelInvocation'(×51 g3) …
()=>{sjt();Wn();sI();wy();Oh();Ve();_o();st();oc();Kir();wn();$r();li();xi();Nw();HC();em();Za();Bl();wr();Mr();rL();pb();NRe=require("fs/promises"),xBe=require("path");Nnh=ve(()=>ye({session_id:O(),transcript_mtime:Xe().optional(),project_path:O(),start_time:O(),duration_minutes:Xe(),user_message_count:Xe(),assistant_message_count:Xe(),tool_counts:so(O(),Xe()).optional(),languages:so(O(),Xe()).optional(),git_commits:Xe(),git_pushes:Xe(),input_tokens:Xe(),output_tokens:Xe(),first_prompt:O(),summary:O().optional(),user_interruptions:Xe().optional(),user_response_times:ft(Xe()).optional(),tool_errors:Xe().optional(),tool_error_categories:so(O(),Xe()).optional(),uses_task_agent:Bt().optional(),uses_mcp:Bt().optional(),uses_web_search:Bt().optional(),uses_web_fetch:Bt().optional(),lines_added:Xe().optional(),lines_removed:Xe().optional(),files_modified:Xe().optional(),message_hours:ft(Xe()).optional(),user_message_timestamps:ft(O()).optional()})),zgE={".ts":"TypeScript",".tsx":"TypeScript",".js":"JavaScript",".jsx":"JavaScript",".py":"Python",".rb":"Ruby",".go":"Go",".rs":"Rust",".java":"Java",".c":"C",".h":"C",".cpp":"C++",".cc":"C++",".cxx":"C++",".hpp":"C++",".hh":"C++",".hxx":"C++",".ipp":"C++",".md":"Markdown",".json":"JSON",".yaml":"YAML",".yml":"YAML",".sh":"Shell",".css":"CSS",".html":"HTML"},GgE={debug_investigate:"Debug/Investigate",implement_feature:"Implement Feature",fix_bug:"Fix Bug",write_script_tool:"Write Script/Tool",refactor_code:"Refactor Code",configure_system:"Configure System",create_pr_commit:"Create PR/Commit",analyze_data:"Analyze Data",understand_codebase:"Understand Codebase",write_tests:"Write Tests",write_docs:"Write Docs",deploy_infra:"Deploy/Infra",warmup_minimal:"Cache Warmup",fast_accurate_search:"Fast/Accurate Search",correct_code_edits:"Correct Code Edits",good_explanations:"Good Explanations",proactive_help:"Proactive Help",multi_file_changes:"Multi-file Changes",handled_complexity:"Multi-file Changes",good_debugging:"Good Debugging",misunderstood_request:"Misunderstood Request",wrong_approach:"Wrong Approach",buggy_code:"Buggy Code",user_rejected_action:"User Rejected Action",claude_got_blocked:"Claude Got Blocked",user_stopped_early:"User Stopped Early",wrong_file_or_location:"Wrong File/Location",excessive_changes:"Excessive Changes",slow_or_verbose:"Slow/Verbose",tool_failed:"Tool Failed",user_unclear:"User Unclear",external_issue:"External Issue",frustrated:"Frustrated",dissatisfied:"Dissatisfied",likely_satisfied:"Likely Satisfied",satisfied:"Satisfied",happy:"Happy",unsure:"Unsure",neutral:"Neutral",delighted:"Delighted",single_task:"Single Task",multi_task:"Multi Task",iterative_refinement:"Iterative Refinement",exploration:"Exploration",quick_question:"Quick Question",fully_achieved:"Fully Achieved",mostly_achieved:"Mostly Achieved",partially_achieved:"Partially Achieved",not_achieved:"Not Achieved",unclear_from_transcript:"Unclear",unhelpful:"Unhelpful",slightly_helpful:"Slightly Helpful",moderately_helpful:"Moderately Helpful",very_helpful:"Very Helpful",essential:"Essential"};KgE=[[["exit code"],"Command Failed"],[["rejected","doesn't want"],"User Rejected"],[["string to replace not found","no changes"],"Edit Failed"],[["modified since read"],"File Changed"],[["exceeds maximum","too large"],"File Too Large"],[["file not found","does not exist"],"File Not Found"]];tyE=[{name:"project_areas",prompt:`Analyze this Claude Code usage data and identify project areas.

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "areas": [
    {"name": "Area name", "session_count": N, "description": "2-3 sentences about what was worked on and how Claude Code was used."}
  ]
}

Include 4-5 areas. Skip internal CC operations.`,maxTokens:8192},{name:"interaction_style",prompt:`Analyze this Claude Code usage data and describe the user's interaction style.

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "narrative": "2-3 paragraphs analyzing HOW the user interacts with Claude Code. Use second person 'you'. Describe patterns: iterate quickly vs detailed upfront specs? Interrupt often or let Claude run? Include specific examples. Use **bold** for key insights.",
  "key_pattern": "One sentence summary of most distinctive interaction style"
}`,maxTokens:8192},{name:"what_works",prompt:`Analyze this Claude Code usage data and identify what's working well for this user. Use second person ("you").

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "intro": "1 sentence of context",
  "impressive_workflows": [
    {"title": "Short title (3-6 words)", "description": "2-3 sentences describing the impressive workflow or approach. Use 'you' not 'the user'."}
  ]
}

Include 3 impressive workflows.`,maxTokens:8192},{name:"friction_analysis",prompt:`Analyze this Claude Code usage data and identify friction points for this user. Use second person ("you").

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "intro": "1 sentence summarizing friction patterns",
  "categories": [
    {"category": "Concrete category name", "description": "1-2 sentences explaining this category and what could be done differently. Use 'you' not 'the user'.", "examples": ["Specific example with consequence", "Another example"]}
  ]
}

Include 3 friction categories with 2 examples each.`,maxTokens:8192},{name:"suggestions",prompt:`Analyze this Claude Code usage data and suggest improvements.

## CC FEATURES REFERENCE (pick from these for features_to_try):
1. **MCP Servers**: Connect Claude to external tools, databases, and APIs via Model Context Protocol.
   - How to use: Run \`claude mcp add <server-name> -- <command>\`
   - Good for: database queries, Slack integration, GitHub issue lookup, connecting to internal APIs

2. **Custom Skills**: Reusable prompts you define as markdown files that run with a single /command.
   - How to use: Create \`.claude/skills/commit/SKILL.md\` with instructions. Then type \`/commit\` to run it.
   - Good for: repetitive workflows - /commit, /review, /test, /deploy, /pr, or complex multi-step workflows

3. **Hooks**: Shell commands that auto-run at specific lifecycle events.
   - How to use: Add to \`.claude/settings.json\` under "hooks" key.
   - Good for: auto-formatting code, running type checks, enforcing conventions

4. **Headless Mode**: Run Claude non-interactively from scripts and CI/CD.
   - How to use: \`claude -p "fix lint errors" --allowedTools "Edit,Read,Bash"\`
   - Good for: CI/CD integration, batch code fixes, automated reviews

5. **Task Agents**: Claude spawns focused subagents for complex exploration or parallel work.
   - How to use: Claude auto-invokes when helpful, or ask "use an agent to explore X"
   - Good for: codebase exploration, understanding complex systems

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "claude_md_additions": [
    {"addition": "A specific line or block to add to CLAUDE.md based on workflow patterns. E.g., 'Always run tests after modifying auth-related files'", "why": "1 sentence explaining why this would help based on actual sessions", "prompt_scaffold": "Instructions for where to add this in CLAUDE.md. E.g., 'Add under ## Testing section'"}
  ],
  "features_to_try": [
    {"feature": "Feature name from CC FEATURES REFERENCE above", "one_liner": "What it does", "why_for_you": "Why this would help YOU based on your sessions", "example_code": "Actual command or config to copy"}
  ],
  "usage_patterns": [
    {"title": "Short title", "suggestion": "1-2 sentence summary", "detail": "3-4 sentences explaining how this applies to YOUR work", "copyable_prompt": "A specific prompt to copy and try"}
  ]
}

IMPORTANT for claude_md_additions: PRIORITIZE instructions that appear MULTIPLE TIMES in the user data. If user told Claude the same thing in 2+ sessions (e.g., 'always run tests', 'use TypeScript'), that's a PRIME candidate - they shouldn't have to repeat themselves.

IMPORTANT for features_to_try: Pick 2-3 from the CC FEATURES REFERENCE above. Include 2-3 items for each category.`,maxTokens:8192},{name:"on_the_horizon",prompt:`Analyze this Claude Code usage data and identify future opportunities.

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "intro": "1 sentence about evolving AI-assisted development",
  "opportunities": [
    {"title": "Short title (4-8 words)", "whats_possible": "2-3 ambitious sentences about autonomous workflows", "how_to_try": "1-2 sentences mentioning relevant tooling", "copyable_prompt": "Detailed prompt to try"}
  ]
}

Include 3 opportunities. Think BIG - autonomous workflows, parallel agents, iterating against tests.`,maxTokens:8192},...[],{name:"fun_ending",prompt:`Analyze this Claude Code usage data and find a memorable moment.

RESPOND WITH ONLY A VALID JSON OBJECT:
{
  "headline": "A memorable QUALITATIVE moment from the transcripts - not a statistic. Something human, funny, or surprising.",
  "detail": "Brief context about when/where this happened"
}

Find something genuinely interesting or amusing from the session summaries.`,maxTokens:8192}];nyE=["frustrated","dissatisfied","likely_satisfied","satisfied","happy","unsure"],oyE=["not_achieved","partially_achieved","mostly_achieved","fully_achieved","unclear_from_transcript"];pyE={type:"prompt",name:"insights",description:"Generate a report analyzing your Claude Code sessions",contentLength:0,progressMessage:"analyzing your sessions",source:"builtin",async getPromptForCommand(e,t){if(t.options?.isSkillPreload)return[{type:"text",text:"The /insights report is generated only when the command is invoked directly."}];let r=!1,n=[],o=!1,{insights:i,htmlPath:s,data:a,remoteStats:l}=await Jnh({collectRemote:r,storageV5:t.storageV5,credentials:t.credentials}),c=`file://${s}`,d=[a.total_sessions_scanned&&a.total_sessions_scanned>a.total_sessions?`${a.total_sessions_scanned.toLocaleString()} sessions total \xB7 ${a.total_sessions} analyzed`:`${a.total_sessions} sessions`,`${a.total_messages.toLocaleString()} messages`,`${Math.round(a.total_duration_hours)}h`,`${a.git_commits} commits`].join(" \xB7 "),p="",f=i.at_a_glance,m=f?`## At a Glance

${f.whats_working?`**What's working:** ${f.whats_working} See _Impressive Things You Did_.`:""}

${f.whats_hindering?`**What's hindering you:** ${f.whats_hindering} See _Where Things Go Wrong_.`:""}

${f.quick_wins?`**Quick wins to try:** ${f.quick_wins} See _Features to Try_.`:""}

${f.ambitious_workflows?`**Ambitious workflows:** ${f.ambitious_workflows} See _On the Horizon_.`:""}`:"_No insights generated_",h=`# Claude Code Insights

${d}
${a.date_range.start} to ${a.date_range.end}
${p}
`;return[{type:"text",text:Znh({insightsJson:Re(i,null,2),reportUrl:c,htmlPath:s,facetsDir:TZi(),header:h,summaryText:m})}]}};fyE=pyE}

// --- bundle[11754589:11754994]  (405 B)
//     especificidad 9.198 · 7 anclas — 'contentLength'(×32 g1), 'isHidden'(×94 g1), 'commandName'(×126 g1), 'userInvocable'(×60 g2), 'progressMessage'(×84 g2) …
function Xvl({commandName:e,agentId:t,isNonInteractiveSession:r,setAppState:n,credentials:o}){if(t!==void 0||r)return;if(Es())return;Ocm(e);let i=tUi(o);if(!Q2i(e))return;if(eUi(e)){Fcm(e,n,o);return}i.then((s)=>{if(eUi(e)){Fcm(e,n,o);return}if(!s)return;let a=Z2i();if(!a)return;n((l)=>({...l,fotwClaim:{phase:"needs_payment_setup",command:a,amountMinorUnits:s.amountMinorUnits,currency:s.currency}}))})}

// Habia 21 sitios de co-ocurrencia; se emitieron los 6 de mayor cruce. Un contrato con muchas
// realizaciones (una interfaz) los tiene por decenas.
