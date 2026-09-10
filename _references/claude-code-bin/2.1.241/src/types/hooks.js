// ==========================================================================
// types/hooks.ts
//
// Codigo VERBATIM del bundle, delimitado por tree-sitter.
//   estructura : tools/restored-src/src/types/hooks.ts
//   contenido  : tools/claude-code-bin/bunfs-root/cli
//
//   anclas utilizables : 12  (2 cadena, 10 nombre)
//   descartadas por ruido (>400 aparic.) : 23
//   sitios de co-ocurrencia : 14  (se emiten los 6 de mayor cruce)
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

// --- bundle[16027009:16032853]  (5844 B)
//     especificidad 23.473 · 12 anclas — 'suppressOutput'(×6 g1), 'permissionDecisionReason'(×7 g1), 'permissionDecision'(×25 g1), 'systemMessage'(×50 g1), 'hookEventName'(×64 g1) …
()=>ye({continue:Bt().describe("Whether Claude should continue after hook (default: true)").optional(),suppressOutput:Bt().describe("Hide stdout from transcript (default: false)").optional(),stopReason:O().describe("Message shown when continue is false").optional(),decision:Dr(["approve","block"]).optional(),reason:O().describe("Explanation for the decision").optional(),systemMessage:O().describe("Warning message shown to the user").optional(),terminalSequence:O().describe("A terminal escape sequence (e.g. OSC 9 / OSC 777 desktop-notification) for Claude Code to emit on your behalf. Only notification/title OSCs (0, 1, 2, 9, 99, 777) and BEL are permitted; anything else is dropped.").optional(),hookSpecificOutput:Ts([ye({hookEventName:Ht("PreToolUse"),permissionDecision:KyE().optional(),permissionDecisionReason:O().optional(),updatedInput:so(O(),Dn()).optional(),additionalContext:O().optional()}),ye({hookEventName:Ht("UserPromptSubmit"),additionalContext:O().optional(),sessionTitle:O().describe("Set the session title").optional(),suppressOriginalPrompt:Bt().describe('When decision is "block", omit the original prompt from the block message').optional()}),ye({hookEventName:Ht("UserPromptExpansion"),additionalContext:O().optional(),suppressOriginalPrompt:Bt().describe('When decision is "block", omit the original prompt from the block message').optional()}),ye({hookEventName:Ht("SessionStart"),additionalContext:O().optional(),initialUserMessage:O().optional(),sessionTitle:O().describe("Set the session title").optional(),watchPaths:ft(O()).describe("Absolute paths to watch for FileChanged hooks").optional(),reloadSkills:Bt().describe("Re-scan skill and command directories after SessionStart hooks complete, so skills installed by the hook are available in the same session").optional()}),ye({hookEventName:Ht("Setup"),additionalContext:O().optional()}),ye({hookEventName:Ht("SubagentStart"),additionalContext:O().optional()}),ye({hookEventName:Ht("PostToolUse"),additionalContext:O().optional(),classifierContext:O().describe("Host-asserted context shown to the auto-mode permission classifier alongside this tool call's result. In the live session the classifier may weigh a user statement relayed here as user intent (it can satisfy a consent bar a user turn would satisfy, never a hard boundary); values restored from saved session state are treated as unverified context only. Relay discipline is the host's obligation: put ONLY genuine user statements in intent-bearing positions \u2014 never tool output or model text dressed as one. Capped at 2000 UTF-16 code units, a budget shared across all hooks that contribute to one call (surrogate-pair-safe; emoji and other astral characters count as two). Honored on synchronous hook responses only: an async hook's late response arrives after the result message is frozen and this field in it is silently ignored. Security note: do not copy untrusted tool output or third-party text into it blindly \u2014 content placed here reaches the permission classifier with host-application framing. Applies only to calls the classifier transcript shows: read-only lookups the transcript omits (file reads, searches), inner REPL calls, and remote-engine shells produce no per-result line, and context attached to them is silently unused. Not a delivery channel: it is bound to a single call id and sized for a short assertion, not for relaying messages or events. Rewrite integrity: if this assertion describes output you are rewriting, return it in the SAME hook result as the rewrite \u2014 it is then dropped automatically if your rewrite is rejected or superseded by a later hook's rewrite; assertions returned without a rewrite are never invalidated by other hooks' rewrites, so a non-rewriting hook should assert only what holds regardless of other hooks' rewrites \u2014 hosts that need an assertion bound to exact output bytes should make it in the hook that produces those bytes. (Do NOT return an identity rewrite just to pair an assertion: hooks run in parallel on the ORIGINAL output, so an identity rewrite competes last-write-wins with sibling rewrites and can clobber a real redaction.)").optional(),updatedToolOutput:Dn().describe("Replaces the tool output before it is sent to the model").optional(),updatedMCPToolOutput:Dn().describe("Replaces the output for MCP tools only. Prefer updatedToolOutput, which works for all tools").optional()}),ye({hookEventName:Ht("PostToolUseFailure"),additionalContext:O().optional()}),ye({hookEventName:Ht("PostToolBatch"),additionalContext:O().optional()}),ye({hookEventName:Ht("Stop"),additionalContext:O().optional()}),ye({hookEventName:Ht("SubagentStop"),additionalContext:O().optional()}),ye({hookEventName:Ht("PermissionDenied"),retry:Bt().optional()}),ye({hookEventName:Ht("Notification"),additionalContext:O().optional()}),ye({hookEventName:Ht("PermissionRequest"),decision:Ts([ye({behavior:Ht("allow"),updatedInput:so(O(),Dn()).optional(),updatedPermissions:ft(FIe()).optional()}),ye({behavior:Ht("deny"),message:O().optional(),interrupt:Bt().optional()})])}),ye({hookEventName:Ht("Elicitation"),action:Dr(["accept","decline","cancel"]).optional(),content:so(O(),Dn()).optional()}),ye({hookEventName:Ht("ElicitationResult"),action:Dr(["accept","decline","cancel"]).optional(),content:so(O(),Dn()).optional()}),ye({hookEventName:Ht("CwdChanged"),watchPaths:ft(O()).describe("Absolute paths to watch for FileChanged hooks").optional()}),ye({hookEventName:Ht("FileChanged"),watchPaths:ft(O()).describe("Absolute paths to watch for FileChanged hooks").optional()}),ye({hookEventName:Ht("WorktreeCreate"),worktreePath:O()}),ye({hookEventName:Ht("MessageDisplay"),displayContent:O().describe("Text displayed in place of the delta. Omit (or return the delta unchanged) to display the original.").optional()})]).optional()})

// --- bundle[16497281:16498166]  (885 B)
//     especificidad 22.256 · 11 anclas — 'suppressOutput'(×6 g1), 'permissionDecisionReason'(×7 g1), 'permissionDecision'(×25 g1), 'systemMessage'(×50 g1), 'hookEventName'(×64 g1) …
async function kwr(e,t){let r={...S_(e,tr()),hook_event_name:"WorktreeCreate",name:t},n=await ez({session:e,hookInput:r,timeoutMs:eb}),o=n.filter((i)=>i.succeeded).map((i)=>pAE(i.output)).find((i)=>i.length>0);if(o===void 0){if(n.length===0)throw Error("WorktreeCreate hook failed: hook is configured but did not run (workspace not trusted, disableAllHooks set, or matcher mismatch)");let i=n.filter((s)=>!s.succeeded).map((s)=>`${s.command}: ${s.output.trim()||"no output"}`);if(i.length===0)throw Error("WorktreeCreate hook failed: hook succeeded but returned no worktree path (command: echo the path to stdout; http/callback: return hookSpecificOutput.worktreePath)");throw new gt(`WorktreeCreate hook failed: ${i.join("; ")}`,"WorktreeCreate hook failed (stderr redacted)")}if(Ees.isAbsolute(o))return{worktreePath:o};return{worktreePath:Ees.resolve(await Aes(r.cwd,e.project),o)}}

// --- bundle[23968348:23972714]  (4366 B)
//     especificidad 22.256 · 11 anclas — 'suppressOutput'(×6 g1), 'permissionDecisionReason'(×7 g1), 'permissionDecision'(×25 g1), 'systemMessage'(×50 g1), 'hookEventName'(×64 g1) …
ZEy=`## Hooks Configuration

Hooks run commands at specific points in Claude Code's lifecycle.

### Hook Structure
\`\`\`json
{
  "hooks": {
    "EVENT_NAME": [
      {
        "matcher": "ToolName|OtherTool",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here",
            "timeout": 60,
            "statusMessage": "Running..."
          }
        ]
      }
    ]
  }
}
\`\`\`

### Hook Events

| Event | Matcher | Purpose |
|-------|---------|---------|
| PermissionRequest | Tool name | Run before permission prompt |
| PreToolUse | Tool name | Run before tool, can block |
| PostToolUse | Tool name | Run after successful tool |
| PostToolUseFailure | Tool name | Run after tool fails |
| Notification | Notification type | Run on notifications |
| Stop | - | Run when Claude stops (including clear, resume, compact) |
| PreCompact | "manual"/"auto" | Before compaction |
| PostCompact | "manual"/"auto" | After compaction (receives summary) |
| UserPromptSubmit | - | When user submits |
| SessionStart | - | When session starts |

**Common tool matchers:** \`Bash\`, \`Write\`, \`Edit\`, \`Read\`, \`Glob\`, \`Grep\`

### Hook Types

**1. Command Hook** - Runs a shell command:
\`\`\`json
{ "type": "command", "command": "prettier --write $FILE", "timeout": 30 }
\`\`\`

**2. Prompt Hook** - Evaluates a condition with LLM:
\`\`\`json
{ "type": "prompt", "prompt": "Is this safe? $ARGUMENTS" }
\`\`\`
Only available for tool events: PreToolUse, PostToolUse, PermissionRequest.

**3. Agent Hook** - Runs an agent with tools:
\`\`\`json
{ "type": "agent", "prompt": "Verify tests pass: $ARGUMENTS" }
\`\`\`
Only available for tool events: PreToolUse, PostToolUse, PermissionRequest.

### Hook Input (stdin JSON)
\`\`\`json
{
  "session_id": "abc123",
  "tool_name": "Write",
  "tool_input": { "file_path": "/path/to/file.txt", "content": "..." },
  "tool_response": { "success": true }  // PostToolUse only
}
\`\`\`

### Hook JSON Output

Hooks can return JSON to control behavior:

\`\`\`json
{
  "systemMessage": "Warning shown to user in UI",
  "continue": false,
  "stopReason": "Message shown when blocking",
  "suppressOutput": false,
  "decision": "block",
  "reason": "Explanation for decision",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Context injected back to model"
  }
}
\`\`\`

**Fields:**
- \`systemMessage\` - Display a message to the user (all hooks)
- \`continue\` - Set to \`false\` to block/stop (default: true)
- \`stopReason\` - Message shown when \`continue\` is false
- \`suppressOutput\` - Hide stdout from transcript (default: false)
- \`decision\` - "block" for PostToolUse/Stop/UserPromptSubmit hooks (deprecated for PreToolUse, use hookSpecificOutput.permissionDecision instead)
- \`reason\` - Explanation for decision
- \`hookSpecificOutput\` - Event-specific output (must include \`hookEventName\`):
  - \`additionalContext\` - Text injected into model context
  - \`permissionDecision\` - "allow", "deny", or "ask" (PreToolUse only)
  - \`permissionDecisionReason\` - Reason for the permission decision (PreToolUse only)
  - \`updatedInput\` - Modified tool input (PreToolUse only)

### Common Patterns

**Auto-format after writes:**
\`\`\`json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "jq -r '.tool_response.filePath // .tool_input.file_path' | { read -r f; prettier --write \\"$f\\"; } 2>/dev/null || true"
      }]
    }]
  }
}
\`\`\`

**Log all bash commands:**
\`\`\`json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "jq -r '.tool_input.command' >> ~/.claude/bash-log.txt"
      }]
    }]
  }
}
\`\`\`

**Stop hook that displays message to user:**

Command must output JSON with \`systemMessage\` field:
\`\`\`bash
# Example command that outputs: {"systemMessage": "Session complete!"}
echo '{"systemMessage": "Session complete!"}'
\`\`\`

**Run tests after code changes:**
\`\`\`json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "jq -r '.tool_input.file_path // .tool_response.filePath' | grep -E '\\\\.(ts|js)$' && npm test || true"
      }]
    }]
  }
}
\`\`\`
`

// --- bundle[16531482:16541661]  (10179 B)
//     especificidad 19.252 · 10 anclas — 'suppressOutput'(×6 g1), 'permissionDecision'(×25 g1), 'systemMessage'(×50 g1), 'hookEventName'(×64 g1), 'PreToolUse'(×90 g1) …
I=g.map(async function*({hook:V,pluginRoot:j,pluginId:B,skillRoot:Z},K){if(B)pee(B,"hook",{kind:"hook",name:f});if(V.type==="callback"){let ee=V.timeout?V.timeout*1000:s,{signal:se,cleanup:Se}=H$(i,{timeoutMs:ee});try{yield await TAE({toolUseID:n,hook:V,hookEvent:f,hookInput:t,signal:se,hookIndex:K,toolUseContext:a}).finally(Se)}catch(ge){if(ge instanceof zE){x=ge,E(`${f} SDK callback hook cancelled (control stream closed); draining sibling hooks`),yield{outcome:"cancelled",hook:V};return}if(f!=="UserPromptSubmit"&&f!=="UserPromptExpansion"||!se.aborted||i?.aborted)throw ge;E(`${m} callback hook timed out; swallowed rejection: ${le(ge)}`),N("tengu_sdk_hook_callback_timeout",{hookEvent:me(f)}),yield{blockingError:{blockingError:`${m} hook callback timed out after ${ee}ms`,command:DBe(V)},suppressOriginalPrompt:!0,outcome:"blocking",hook:V}}return}if(V.type==="function"){if(!c){yield{message:ac({type:"hook_error_during_execution",hookName:m,toolUseID:n,hookEvent:f,content:"Messages not provided for function hook"}),outcome:"non_blocking_error",hook:V};return}yield HAE({hook:V,messages:c,hookName:m,toolUseID:n,hookEvent:f,timeoutMs:s,signal:i});return}let ne=V.timeout?V.timeout*1000:s,{signal:ie,cleanup:X}=H$(i,{timeoutMs:ne}),te=x3t.randomUUID(),re=Date.now(),de=qX(V),oe=DBe(V);try{let ee=C(B);if(!ee.ok){yield{message:ac({type:"hook_error_during_execution",hookName:m,toolUseID:n,hookEvent:f,content:`Failed to prepare hook input: ${le(ee.error)}`,command:de,durationMs:Date.now()-re}),outcome:"non_blocking_error",hook:V},X();return}let se=ee.value;if(V.type==="prompt"){if(!a)throw Error(`prompt-type hooks are not supported for ${f} events (no conversation context is available). Use a command-type hook instead.`);if(a.agentId?.startsWith(yes)){X(),yield{message:ac({type:"hook_cancelled",hookName:m,toolUseID:n,hookEvent:f}),outcome:"cancelled",hook:V};return}let Ie=await fdh(V,m,f,se,ie,a,c,n,ne);if(Ie.message?.type==="attachment"){let xe=Ie.message.attachment;if(xe.type==="hook_success"||xe.type==="hook_non_blocking_error")xe.command=de,xe.durationMs=Date.now()-re}yield Ie,X?.();return}if(V.type==="agent"){if(!a)throw Error(`agent-type hooks are not supported for ${f} events (no conversation context is available). Use a command-type hook instead.`);if(a.agentId?.startsWith(yes)){X(),yield{message:ac({type:"hook_cancelled",hookName:m,toolUseID:n,hookEvent:f}),outcome:"cancelled",hook:V};return}let Ie=await gdh(V,m,f,se,ie,a,n,"agent_type"in t?t.agent_type:void 0);if(Ie.message?.type==="attachment"){let xe=Ie.message.attachment;if(xe.type==="hook_success"||xe.type==="hook_non_blocking_error")xe.command=de,xe.durationMs=Date.now()-re}yield Ie,X?.();return}if(V.type==="http"){BZi(te,m,f);let Ie=await dzl(V,f,se,i,s);if(X?.(),Ie.aborted){_W({hookId:te,hookName:m,hookEvent:f,output:"Hook cancelled",stdout:"",stderr:"",exitCode:void 0,outcome:"cancelled"}),yield{message:ac({type:"hook_cancelled",hookName:m,toolUseID:n,hookEvent:f,timedOut:!i?.aborted,timeoutMs:V.timeout?V.timeout*1000:s}),outcome:"cancelled",hook:V};return}if(Ie.error||!Ie.ok){let Ye=Ie.error||`HTTP ${Ie.statusCode} from ${V.url}`;_W({hookId:te,hookName:m,hookEvent:f,output:Ye,stdout:"",stderr:Ye,exitCode:Ie.statusCode,outcome:"error"}),yield{message:ac({type:"hook_non_blocking_error",hookName:m,toolUseID:n,hookEvent:f,stderr:Ye,stdout:"",exitCode:Ie.statusCode??0}),outcome:"non_blocking_error",hook:V};return}let{json:xe,validationError:Ne}=Wdh(Ie.body);if(Ne){_W({hookId:te,hookName:m,hookEvent:f,output:Ie.body,stdout:Ie.body,stderr:Ne,exitCode:Ie.statusCode,outcome:"error"}),yield{message:ac({type:"hook_non_blocking_error",hookName:m,toolUseID:n,hookEvent:f,stderr:Ne,stdout:Ie.body,exitCode:Ie.statusCode??0}),outcome:"non_blocking_error",hook:V};return}if(xe&&n8e(xe)){_W({hookId:te,hookName:m,hookEvent:f,output:Ie.body,stdout:Ie.body,stderr:"",exitCode:Ie.statusCode,outcome:"success"}),yield{outcome:"success",hook:V};return}if(xe){let Ye=wfo({json:xe,command:V.url,hookName:m,toolUseID:n,hookEvent:f,expectedHookEvent:f,stdout:Ie.body,stderr:"",exitCode:Ie.statusCode});mst(xe.metrics,B,f),_W({hookId:te,hookName:m,hookEvent:f,output:Ie.body,stdout:Ie.body,stderr:"",exitCode:Ie.statusCode,outcome:"success"}),yield{...Ye,outcome:"success",hook:V};return}return}if(V.type==="mcp_tool"){BZi(te,m,f);let Ie=await pzl(V,f,t,a?.options.mcpClients,i,s);if(X?.(),Ie.aborted){_W({hookId:te,hookName:m,hookEvent:f,output:"Hook cancelled",stdout:"",stderr:"",exitCode:void 0,outcome:"cancelled"}),yield{message:ac({type:"hook_cancelled",hookName:m,toolUseID:n,hookEvent:f,timedOut:!i?.aborted,timeoutMs:V.timeout?V.timeout*1000:s}),outcome:"cancelled",hook:V};return}if(Ie.error||!Ie.ok){let Ye=Ie.error||"MCP tool returned an error";_W({hookId:te,hookName:m,hookEvent:f,output:Ye,stdout:Ie.body,stderr:Ye,exitCode:1,outcome:"error"}),yield{message:ac({type:"hook_non_blocking_error",hookName:m,toolUseID:n,hookEvent:f,stderr:Ye,stdout:Ie.body,exitCode:1}),outcome:"non_blocking_error",hook:V};return}let{json:xe,validationError:Ne}=kes(Ie.body);if(Ne){_W({hookId:te,hookName:m,hookEvent:f,output:Ie.body,stdout:Ie.body,stderr:Ne,exitCode:1,outcome:"error"}),yield{message:ac({type:"hook_non_blocking_error",hookName:m,toolUseID:n,hookEvent:f,stderr:Ne,stdout:Ie.body,exitCode:1}),outcome:"non_blocking_error",hook:V};return}if(_W({hookId:te,hookName:m,hookEvent:f,output:Ie.body,stdout:Ie.body,stderr:"",exitCode:0,outcome:"success"}),xe&&a6(xe)){let Ye=wfo({json:xe,command:de,hookName:m,toolUseID:n,hookEvent:f,expectedHookEvent:f,stdout:Ie.body,stderr:"",exitCode:0});mst(xe.metrics,B,f),yield{...Ye,outcome:"success",hook:V};return}yield{message:ac({type:"hook_success",hookName:m,toolUseID:n,hookEvent:f,content:`${ir.bold(m)} completed`,stdout:Ie.body,stderr:"",command:de,durationMs:Date.now()-re}),outcome:"success",hook:V};return}BZi(te,m,f);let Se=await Ies(V,f,m,se,mir(t),e.project,t.cwd,ie,te,K,j,B,Z,u,a?.storageV5);X?.();let ge=Date.now()-re;if(Se.backgrounded){yield{outcome:"success",hook:V};return}if(Se.aborted){_W({hookId:te,hookName:m,hookEvent:f,output:Se.output,stdout:Se.stdout,stderr:Se.stderr,exitCode:Se.status,outcome:"cancelled"}),yield{message:ac({type:"hook_cancelled",hookName:m,toolUseID:n,hookEvent:f,command:de,durationMs:ge,timedOut:!i?.aborted,timeoutMs:ne}),outcome:"cancelled",hook:V};return}let{json:he,plainText:fe,validationError:we}=kes(Se.stdout);if(we&&Se.status!==2){_W({hookId:te,hookName:m,hookEvent:f,output:Se.output,stdout:Se.stdout,stderr:we,exitCode:1,outcome:"error"}),yield{message:ac({type:"hook_non_blocking_error",hookName:m,toolUseID:n,hookEvent:f,stderr:we,stdout:Se.stdout,exitCode:1,command:de,durationMs:ge}),outcome:"non_blocking_error",hook:V};return}if(he){if(n8e(he)){yield{outcome:"success",hook:V};return}let Ie=wfo({json:he,command:de,hookName:m,toolUseID:n,hookEvent:f,expectedHookEvent:f,stdout:Se.stdout,stderr:Se.stderr,exitCode:Se.status,durationMs:ge});if(mst(he.metrics,B,f),a6(he)&&!he.suppressOutput&&fe&&Se.status===0){let xe=`${ir.bold(m)} completed`;_W({hookId:te,hookName:m,hookEvent:f,output:Se.output,stdout:Se.stdout,stderr:Se.stderr,exitCode:Se.status,outcome:"success"}),yield{...Ie,message:Ie.message||ac({type:"hook_success",hookName:m,toolUseID:n,hookEvent:f,content:xe,stdout:Se.stdout,stderr:Se.stderr,exitCode:Se.status,command:de,durationMs:ge}),outcome:"success",hook:V};return}if(Se.status===2&&!Ie.blockingError)Ie.blockingError={blockingError:`[${oe}]: ${Se.stderr||"No stderr output"}`,command:oe};_W({hookId:te,hookName:m,hookEvent:f,output:Se.output,stdout:Se.stdout,stderr:Se.stderr,exitCode:Se.status,outcome:Se.status===0?"success":"error"}),yield{...Ie,outcome:Ie.blockingError?"blocking":"success",hook:V};return}if(Se.status===0){_W({hookId:te,hookName:m,hookEvent:f,output:Se.output,stdout:Se.stdout,stderr:Se.stderr,exitCode:Se.status,outcome:"success"});let Ie=await vHt(Se.stdout.trim(),te,"stdout");yield{message:ac({type:"hook_success",hookName:m,toolUseID:n,hookEvent:f,content:Ie,stdout:Se.stdout,stderr:Se.stderr,exitCode:Se.status,command:de,durationMs:ge}),outcome:"success",hook:V};return}if(Se.status===2&&(f==="Stop"||f==="SubagentStop"||f==="TaskCompleted"||f==="TeammateIdle"||B&&f==="UserPromptSubmit")&&!Se.stdout.trim()&&/no such file|can't open/i.test(Se.stderr)){_W({hookId:te,hookName:m,hookEvent:f,output:Se.output,stdout:Se.stdout,stderr:Se.stderr,exitCode:Se.status,outcome:"error"}),yield{message:ac({type:"hook_non_blocking_error",hookName:m,toolUseID:n,hookEvent:f,stderr:`Hook script appears to be missing \u2014 "${oe}" exited 2 with: ${Se.stderr.trim()}. Treating as non-blocking. `+(B?`Run \`/plugin\` to reinstall '${B}' or remove it from settings.`:"If this is a plugin hook, check the plugin install (run /plugin)."),stdout:Se.stdout,exitCode:Se.status,command:de,durationMs:ge}),outcome:"non_blocking_error",hook:V};return}if(Se.status===2){_W({hookId:te,hookName:m,hookEvent:f,output:Se.output,stdout:Se.stdout,stderr:Se.stderr,exitCode:Se.status,outcome:"error"}),yield{blockingError:{blockingError:`[${oe}]: ${Se.stderr||"No stderr output"}`,command:oe},outcome:"blocking",hook:V};return}if(_W({hookId:te,hookName:m,hookEvent:f,output:Se.output,stdout:Se.stdout,stderr:Se.stderr,exitCode:Se.status,outcome:"error"}),Se.spawnFailed&&!Odh(f,oe)){yield{outcome:"non_blocking_error",hook:V};return}yield{message:ac({type:"hook_non_blocking_error",hookName:m,toolUseID:n,hookEvent:f,stderr:`Failed with non-blocking status code: ${Se.stderr.trim()||"No stderr output"}`,stdout:Se.stdout,exitCode:Se.status,command:de,durationMs:ge}),outcome:"non_blocking_error",hook:V};return}catch(ee){X?.();let se=ee instanceof Error?ee.message:String(ee);if(E(`Hook failed to run (${m}): ${se}`,{level:"error"}),_W({hookId:te,hookName:m,hookEvent:f,output:`Failed to run: ${se}`,stdout:"",stderr:`Failed to run: ${se}`,exitCode:1,outcome:"error"}),!Odh(f,oe)){yield{outcome:"non_blocking_error",hook:V};return}yield{message:ac({type:"hook_non_blocking_error",hookName:m,toolUseID:n,hookEvent:f,stderr:`Failed to run: ${se}`,stdout:"",exitCode:1,command:de,durationMs:Date.now()-re}),outcome:"non_blocking_error",hook:V};return}})

// --- bundle[20816114:20816438]  (324 B)
//     especificidad 11.386 · 6 anclas — 'systemMessage'(×50 g1), 'hookEventName'(×64 g1), 'PreToolUse'(×90 g1), 'PermissionRequest'(×97 g1), 'hookSpecificOutput'(×110 g1) …
PreToolUse:{summary:"Before tool execution",description:`Input to command is JSON of tool call arguments.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to model and block tool call
Other exit codes - show stderr to user only but continue with tool call`,matcherMetadata:{fieldToMatch:"tool_name",values:e}}

// Habia 14 sitios de co-ocurrencia; se emitieron los 6 de mayor cruce. Un contrato con muchas
// realizaciones (una interfaz) los tiene por decenas.
