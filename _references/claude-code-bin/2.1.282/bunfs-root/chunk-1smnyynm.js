// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{K,Y,he}from"/$bunfs/root/chunk-zwm3fybx.js";import{_,c}from"/$bunfs/root/chunk-zxcb8vnv.js";import{se,l,X0,Ht}from"/$bunfs/root/chunk-dw9y6h6j.js";import{P}from"/$bunfs/root/chunk-shebh248.js";import{i}from"/$bunfs/root/chunk-hm522bzh.js";import{y,m}from"/$bunfs/root/chunk-fq30rq8e.js";import{Nn}from"/$bunfs/root/chunk-z3ns4mz4.js";import{t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{rA,ZD}from"/$bunfs/root/chunk-esvkqvk3.js";import{lr}from"/$bunfs/root/chunk-36kx407g.js";import{Ke}from"/$bunfs/root/chunk-verj0kzw.js";import{pi,x,al,Hs}from"/$bunfs/root/chunk-wbbthbh9.js";import{Ct,wn}from"/$bunfs/root/chunk-tsex6vh0.js";import{EG,Kv,mGe,Ae,gXt}from"/$bunfs/root/chunk-c9jscxk0.js";import{Uc,vN,Qfe,grn,Xj,RR,x2}from"/$bunfs/root/chunk-n8qypqam.js";import{id,kc}from"/$bunfs/root/chunk-dg8z8cmw.js";import{Q_n,V9e,Z_n}from"/$bunfs/root/chunk-ah87dcrd.js";import{SUe,U2r,X1t,B2r}from"/$bunfs/root/chunk-he6sstgc.js";import{qb,cm}from"/$bunfs/root/chunk-39h9wrhn.js";import{F_}from"/$bunfs/root/chunk-nmwx5m3f.js";import{ey,$p,jl}from"/$bunfs/root/chunk-eh3g1h57.js";import{U}from"/$bunfs/root/chunk-2s9xnv72.js";function N(){return x("tengu_onyx_plover",null)}function Zpt(){let e=N();return e?.enabled===!0||e?.available===!0}function QFe(){if(!Zpt())return!1;let e=Ke().autoDreamEnabled;if(e!==void 0)return e;return N()?.enabled===!0}import{readdir as oe}from"fs/promises";import{basename as W,dirname as R,join as re}from"path";class I{runner=null}var M=new K(()=>new I);var Q="## Team memory (`team/` subdirectory)\n\nThe `team/` subdirectory holds memories shared across everyone working in this repo. Other teammates' Claude sessions write here too \u2014 treat it differently from your personal files:\n\n- **Phase 1:** `ls team/` and skim it alongside your personal files. A teammate may have already captured something you'd otherwise duplicate.\n- **Phase 3:** Merge near-duplicates *within* `team/` the same way you would personal memories. If a personal memory restates a team memory, delete the personal one.\n- **Phase 4 \u2014 be conservative pruning `team/`:**\n  - DO delete or fix a team memory that is clearly contradicted by the current code, or that a newer team memory marks as superseded.\n  - DO NOT delete a team memory just because you don't recognize it or it isn't relevant to *your* recent sessions \u2014 a teammate may rely on it.\n  - When unsure, leave it. A stale team memory costs little; deleting a teammate's load-bearing note costs a lot.\n\nDo not promote personal memories into `team/` during a dream \u2014 that's a deliberate choice the user makes via `/remember`, not something to do reflexively.",ee=`### Reconcile memories against CLAUDE.md

Project CLAUDE.md instructions are loaded in your system prompt. For each memory that captures feedback or project conventions (the \`feedback\`/\`project\` types, where tagged), check whether it contradicts a CLAUDE.md instruction on the same topic:

- **Memory is stale** \u2014 CLAUDE.md and the memory describe different procedures for the same task: CLAUDE.md is the maintained, checked-in source. Delete the memory, or rewrite it to agree if it carries context worth keeping (the *why* is still useful but the *how* is wrong).
- **CLAUDE.md may be stale** \u2014 the memory is clearly dated after CLAUDE.md and explicitly corrects it: do NOT edit CLAUDE.md during a dream. Annotate the memory with "contradicts CLAUDE.md \u2014 verify which is current" and list it in your summary so the user can update CLAUDE.md.
- **Not a conflict** \u2014 the memory adds detail CLAUDE.md doesn't cover, or narrows a CLAUDE.md rule with a stated reason. Leave it.

A \`feedback\` memory's "Why: the user corrected me" framing is not evidence it's newer than CLAUDE.md \u2014 CLAUDE.md may have been updated since.`;function F(e,o,s,r=!1,n=!1,p=!1,d=!1,u=!1){return`# Dream: Memory Consolidation

You are performing a dream \u2014 a reflective pass over your memory files. Synthesize what you've learned recently into durable, well-organized memories so that future sessions can orient quickly.

Memory directory: \`${e}\`
${Qfe}

Session transcripts: \`${o}\` (large JSONL files \u2014 grep narrowly, don't read whole files)
${r?`
${Q}
`:""}
---

## Phase 1 \u2014 Orient

- \`ls\` the memory directory to see what already exists
${p?"":`- Read \`${Uc}\` to understand the current index
`}- Skim existing topic files so you improve them rather than creating duplicates
- \`ls -R logs/\` \u2014 recent activity logs (one file per session under \`YYYY/MM/DD/\`). If a \`sessions/\` subdirectory also exists, review recent entries there too

## Phase 2 \u2014 Gather recent signal

Look for new information worth persisting. Sources in rough priority order:

1. **Session logs** (\`logs/YYYY/MM/DD/<id>-<title>.md\`) \u2014 the append-only activity stream, one file per session. Read the most recent 1\u20133 days of sessions (the filename title tells you what each was about); each line is prefix-coded (\`>\` user, \`<\` assistant, \`.\` tool call)
2. **Existing memories that drifted** \u2014 facts that contradict something you see in the codebase now
3. **Transcript search** \u2014 if you need specific context (e.g., "what was the error message from yesterday's build failure?"), grep the JSONL transcripts for narrow terms:
   \`grep -rn "<narrow term>" ${o}/ --include="*.jsonl" | tail -50\`

Don't exhaustively read transcripts. Look only for things you already suspect matter.

## Phase 3 \u2014 Consolidate

For each thing worth remembering, write or update a memory file at the top level of the memory directory. Use the memory file format${n?"":" and type conventions"} from your system prompt's auto-memory section \u2014 it's the source of truth for what to save, how to structure it, and what NOT to save.${d?` The ${ey} / ${$p} / ${jl} tools are unavailable in a dream: consolidate only this memory directory, and leave anything that section marks as shared with the project where it is \u2014 never copy it into these files.`:""}${""}

Focus on:
- Merging new signal into existing topic files rather than creating near-duplicates
- Converting relative dates ("yesterday", "last week") to absolute dates so they remain interpretable after time passes
- Deleting contradicted facts \u2014 if today's investigation disproves an old memory, fix it at the source

${p?"## Phase 4 \u2014 Prune\n\nKeep each memory file's frontmatter (`name`, `description`) accurate and one-line \u2014 the index shown in future sessions is assembled from those fields at load time, so a stale `description` is a stale index entry.\n\n- Remove memories that are now stale, wrong, or superseded\n- Resolve contradictions \u2014 if two files disagree, fix the wrong one":`## Phase 4 \u2014 Prune and index

Update \`${Uc}\` so it stays under ${vN} lines AND under ~25KB. It's an **index**, not a dump \u2014 each entry should be one line under ~150 characters: \`- [Title](file.md) \u2014 one-line hook\`. Never write memory content directly into it.

- Remove pointers to memories that are now stale, wrong, or superseded
- Demote verbose entries: if an index line is over ~200 chars, it's carrying content that belongs in the topic file \u2014 shorten the line, move the detail
- Add pointers to newly important memories
- Resolve contradictions \u2014 if two files disagree, fix the wrong one`}

${ee}

---

Return a brief summary of what you consolidated, updated, or pruned. If nothing changed (memories are already tight), say so.${s?`

## Additional context

${s}`:""}`}var te=30;function L(e){return typeof e==="object"&&e!==null&&"type"in e&&e.type==="dream"}function j(e,o){let s=qb("dream"),r={...cm(s,"dream","dreaming"),type:"dream",status:"running",skipTranscript:!0,phase:"starting",sessionsReviewing:o.sessionsReviewing,filesTouched:[],turns:[],abortController:o.abortController,priorMtime:o.priorMtime,...o.storageV5!==void 0&&{storageV5:o.storageV5}};return e.register(r),s}function H(e,o,s,r){r.update(e,(n)=>{let p=new Set(n.filesTouched),d=s.filter((u)=>!p.has(u)&&p.add(u));if(o.text===""&&o.toolUseCount===0&&d.length===0)return n;return{...n,phase:d.length>0?"updating":n.phase,filesTouched:d.length>0?[...n.filesTouched,...d]:n.filesTouched,turns:n.turns.slice(-(te-1)).concat(o)}})}function V(e,o){o.update(e,(s)=>({...s,status:"completed",endTime:Date.now(),notified:!0,abortController:void 0})),y("task_dream"),pi(e,"completed",{skipTranscript:!0,ambient:!0})}function B(e,o){o.update(e,(s)=>({...s,status:"failed",endTime:Date.now(),notified:!0,abortController:void 0})),m("task_dream","task_dream_failed"),pi(e,"failed",{skipTranscript:!0,ambient:!0})}var ne=600000,ae=new RegExp(`^\\s*(?:${Q_n})\\b`,"i"),q={minHours:24,minSessions:5};function ie(){let e=x("tengu_onyx_plover",null);return{minHours:typeof e?.minHours==="number"&&Number.isFinite(e.minHours)&&e.minHours>0?e.minHours:q.minHours,minSessions:typeof e?.minSessions==="number"&&Number.isFinite(e.minSessions)&&e.minSessions>0?e.minSessions:q.minSessions}}function me(){if(lr()!==null)return!1;if(ZD())return!1;if(!al())return!1;if(Xj())return!1;return QFe()}function le(){return!1}function dzr(e){let o=0;M.of(e).runner=async function(r,n){let p=ie(),d=le();if(!d&&!me())return;let u;try{u=await SUe(void 0,r.toolUseContext.storageV5)}catch(f){t(`[autoDream] readLastConsolidatedAt failed: ${l(f)}`);return}let g=(Date.now()-u)/3600000;if(!d&&g<p.minHours)return;let w=Date.now()-o;if(!d&&w<ne){t(`[autoDream] scan throttle \u2014 time-gate passed but last scan was ${Math.round(w/1000)}s ago`);return}o=Date.now();let h;try{h=await B2r(u,r.toolUseContext.storageV5)}catch(f){t(`[autoDream] listSessionsTouchedSince failed: ${l(f)}`);return}let z=Y();if(h=h.filter((f)=>f!==z),!d&&h.length<p.minSessions){t(`[autoDream] skip \u2014 ${h.length} sessions since last consolidation, need ${p.minSessions}`),i("tengu_auto_dream_skipped",{reason:_("sessions"),session_count:h.length,min_required:p.minSessions});return}let k;if(d)k=u;else{try{k=await U2r(r.toolUseContext.storageV5)}catch(f){t(`[autoDream] lock acquire failed: ${l(f)}`);return}if(k===null){i("tengu_auto_dream_skipped",{reason:_("lock")});return}}let v=RR();t(`[autoDream] firing \u2014 ${g.toFixed(1)}h since last, ${h.length} sessions to review`),i("tengu_auto_dream_fired",{hours_since:Math.round(g),sessions_since:h.length,team_memory_enabled:v});let{taskRegistry:S}=r.toolUseContext,C=new AbortController,b=j(S,{sessionsReviewing:h.length,priorMtime:k,abortController:C,storageV5:r.toolUseContext.storageV5}),E="fork";try{let f=Hs(),O=kc(he()),X=await ue(f,r.toolUseContext.storageV5),G=`

**Tool constraints for this run:** Shell access is restricted to read-only commands (\`ls\`, \`find\`, \`grep\`, \`cat\`, \`stat\`, \`wc\`, \`head\`, \`tail\`, and similar) plus deleting \`.md\` files inside the memory directory (outside protected subdirectories like \`.git\` or \`agents\`; \`rm\` takes no flags except \`-f\`). Anything else that writes, redirects to a file, or modifies state will be denied. Plan your exploration with this in mind.

Sessions since last consolidation (${h.length}):
${h.map((A)=>`- ${A}`).join(`
`)}`,pe=!1,J=F(f,O,G,v,x2(),x2()&&!a.CLAUDE_CODE_REMOTE&&!rA(),grn(),!1),T=await Kv({promptMessages:[Ae({content:J})],cacheSafeParams:EG(r),canUseTool:Z_n(f),querySource:"auto_dream",forkLabel:"auto_dream",skipTranscript:!0,overrides:{abortController:C},onMessage:de(b,S,f),skipCacheWrite:mGe()});E="completion",V(b,S);let D=r.toolUseContext.taskRegistry.get(b),Z=L(D)?D.filesTouched.length:0;if(L(D)&&D.filesTouched.length>0)n?.({...gXt(D.filesTouched),verb:"Improved"}),r.toolUseContext.setAppState((A)=>({...A,pendingMemoryUpdates:[...A.pendingMemoryUpdates,{source:"dream",summary:`consolidated ${D.filesTouched.length} ${P(D.filesTouched.length,"memory file")}`,paths:D.filesTouched}]}));t(`[autoDream] completed \u2014 cache: read=${T.totalUsage.cache_read_input_tokens} created=${T.totalUsage.cache_creation_input_tokens}`),i("tengu_auto_dream_completed",{cache_read:T.totalUsage.cache_read_input_tokens,cache_created:T.totalUsage.cache_creation_input_tokens,output:T.totalUsage.output_tokens,sessions_reviewed:h.length,daily_logs_found:X,files_touched_count:Z,team_memory_enabled:v,account_memory_line_rendered:!1})}catch(f){if(C.signal.aborted){t("[autoDream] aborted by user");return}if(t(`[autoDream] ${E} failed: ${l(f)}`),i("tengu_auto_dream_failed",{phase:c(E),error_class:X0(se(f))}),E==="fork")B(b,S),await X1t(k,r.toolUseContext.storageV5)}}}function de(e,o,s){return(r)=>{if(r.type!=="assistant")return;let n="",p=0,d=[];for(let u of r.message.content)if(u.type==="text")n+=u.text;else if(u.type==="tool_use"){if(p++,u.name===Ct||u.name===wn){let g=u.input;if(typeof g.file_path==="string")d.push(g.file_path)}else if(F_.includes(u.name)){let g=u.input;if(typeof g.command==="string"&&ae.test(g.command))for(let w of g.command.matchAll(/"[^"]*\.md"|'[^']*\.md'|(?:\/|[A-Za-z]:[\\/])\S*\.md\b/g))d.push(w[0].replace(/^["']|["']$/g,""))}}H(e,{text:n.trim(),toolUseCount:p},d.filter((u)=>V9e(u,s)),o)}}async function ue(e,o){if(o!==void 0){let s=ce(e);if(s!==void 0){let r=0,n;do{let p=await o.listRecursive(s,n!==void 0?{cursor:n}:void 0);if(!p.ok)return t(`[autoDream] countDailyLogs: ${p.error.code}`),0;r+=U(p.value.items,(d)=>d.key.namespace==="memory"&&(d.key.relPath.at(-1)??"").endsWith(".md")),n=p.value.cursor}while(n);return r}}try{let s=await oe(re(e,"logs"),{recursive:!0});return U(s,(r)=>r.endsWith(".md"))}catch(s){if(!Ht(s))t(`[autoDream] countDailyLogs: ${l(s)}`);return 0}}function ce(e){let o=W(R(e));if(W(e)!=="memory"||R(R(e))!==id()||!Nn(o))return;return{namespace:"memory",projectKey:o,relPath:["logs"]}}async function uzr(e,o){await M.of(e.toolUseContext.session.host).runner?.(e,o)}
export{Zpt,QFe,dzr,uzr};
