// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{V,Y,he}from"/$bunfs/root/chunk-cqc88nqm.js";import{b,c}from"/$bunfs/root/chunk-rnxz8hs2.js";import{se,l,PB,Ht}from"/$bunfs/root/chunk-2bj5eqbj.js";import{P}from"/$bunfs/root/chunk-nqsdwfmt.js";import{i}from"/$bunfs/root/chunk-bh8vsyek.js";import{y,m}from"/$bunfs/root/chunk-2pwc1ycq.js";import{Mn}from"/$bunfs/root/chunk-99avamm5.js";import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{a}from"/$bunfs/root/chunk-ay603yys.js";import{jT,kD}from"/$bunfs/root/chunk-wckxjewz.js";import{ar}from"/$bunfs/root/chunk-xe0dn6dd.js";import{Ke}from"/$bunfs/root/chunk-pw35yar9.js";import{ai,x,Va,Qs}from"/$bunfs/root/chunk-5khn4tvf.js";import{Pt,vn}from"/$bunfs/root/chunk-b7h8pwnv.js";import{T_}from"/$bunfs/root/chunk-gf0h00am.js";import{Z2,Mv,LWe,Ae,P6t}from"/$bunfs/root/chunk-4n4g22z6.js";import{bc,CM,kse,oU}from"/$bunfs/root/chunk-015gmret.js";import{uy,Qp,Kl,jZt,fR,QG}from"/$bunfs/root/chunk-mm8vme0b.js";import{rd,Sc}from"/$bunfs/root/chunk-brvrqzf2.js";import{Ggn,h8e,zgn}from"/$bunfs/root/chunk-2740tpj2.js";import{X$e,ejr,aUt,tjr}from"/$bunfs/root/chunk-4raw0610.js";import{Lb,rm}from"/$bunfs/root/chunk-ag7kxh8x.js";import{B}from"/$bunfs/root/chunk-z1tzjygm.js";function O(){return x("tengu_onyx_plover",null)}function put(){let e=O();return e?.enabled===!0||e?.available===!0}function I$e(){if(!put())return!1;let e=Ke().autoDreamEnabled;if(e!==void 0)return e;return O()?.enabled===!0}import{readdir as oe}from"fs/promises";import{basename as q,dirname as R,join as re}from"path";class N{runner=null}var M=new V(()=>new N);var Q="## Team memory (`team/` subdirectory)\n\nThe `team/` subdirectory holds memories shared across everyone working in this repo. Other teammates' Claude sessions write here too \u2014 treat it differently from your personal files:\n\n- **Phase 1:** `ls team/` and skim it alongside your personal files. A teammate may have already captured something you'd otherwise duplicate.\n- **Phase 3:** Merge near-duplicates *within* `team/` the same way you would personal memories. If a personal memory restates a team memory, delete the personal one.\n- **Phase 4 \u2014 be conservative pruning `team/`:**\n  - DO delete or fix a team memory that is clearly contradicted by the current code, or that a newer team memory marks as superseded.\n  - DO NOT delete a team memory just because you don't recognize it or it isn't relevant to *your* recent sessions \u2014 a teammate may rely on it.\n  - When unsure, leave it. A stale team memory costs little; deleting a teammate's load-bearing note costs a lot.\n\nDo not promote personal memories into `team/` during a dream \u2014 that's a deliberate choice the user makes via `/remember`, not something to do reflexively.",ee=`### Reconcile memories against CLAUDE.md

Project CLAUDE.md instructions are loaded in your system prompt. For each memory that captures feedback or project conventions (the \`feedback\`/\`project\` types, where tagged), check whether it contradicts a CLAUDE.md instruction on the same topic:

- **Memory is stale** \u2014 CLAUDE.md and the memory describe different procedures for the same task: CLAUDE.md is the maintained, checked-in source. Delete the memory, or rewrite it to agree if it carries context worth keeping (the *why* is still useful but the *how* is wrong).
- **CLAUDE.md may be stale** \u2014 the memory is clearly dated after CLAUDE.md and explicitly corrects it: do NOT edit CLAUDE.md during a dream. Annotate the memory with "contradicts CLAUDE.md \u2014 verify which is current" and list it in your summary so the user can update CLAUDE.md.
- **Not a conflict** \u2014 the memory adds detail CLAUDE.md doesn't cover, or narrows a CLAUDE.md rule with a stated reason. Leave it.

A \`feedback\` memory's "Why: the user corrected me" framing is not evidence it's newer than CLAUDE.md \u2014 CLAUDE.md may have been updated since.`;function I(e,o,s,r=!1,n=!1,p=!1,d=!1,u=!1){return`# Dream: Memory Consolidation

You are performing a dream \u2014 a reflective pass over your memory files. Synthesize what you've learned recently into durable, well-organized memories so that future sessions can orient quickly.

Memory directory: \`${e}\`
${kse}

Session transcripts: \`${o}\` (large JSONL files \u2014 grep narrowly, don't read whole files)
${r?`
${Q}
`:""}
---

## Phase 1 \u2014 Orient

- \`ls\` the memory directory to see what already exists
${p?"":`- Read \`${bc}\` to understand the current index
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

For each thing worth remembering, write or update a memory file at the top level of the memory directory. Use the memory file format${n?"":" and type conventions"} from your system prompt's auto-memory section \u2014 it's the source of truth for what to save, how to structure it, and what NOT to save.${d?` The ${uy} / ${Qp} / ${Kl} tools are unavailable in a dream: consolidate only this memory directory, and leave anything that section marks as shared with the project where it is \u2014 never copy it into these files.`:""}${""}

Focus on:
- Merging new signal into existing topic files rather than creating near-duplicates
- Converting relative dates ("yesterday", "last week") to absolute dates so they remain interpretable after time passes
- Deleting contradicted facts \u2014 if today's investigation disproves an old memory, fix it at the source

${p?"## Phase 4 \u2014 Prune\n\nKeep each memory file's frontmatter (`name`, `description`) accurate and one-line \u2014 the index shown in future sessions is assembled from those fields at load time, so a stale `description` is a stale index entry.\n\n- Remove memories that are now stale, wrong, or superseded\n- Resolve contradictions \u2014 if two files disagree, fix the wrong one":`## Phase 4 \u2014 Prune and index

Update \`${bc}\` so it stays under ${CM} lines AND under ~25KB. It's an **index**, not a dump \u2014 each entry should be one line under ~150 characters: \`- [Title](file.md) \u2014 one-line hook\`. Never write memory content directly into it.

- Remove pointers to memories that are now stale, wrong, or superseded
- Demote verbose entries: if an index line is over ~200 chars, it's carrying content that belongs in the topic file \u2014 shorten the line, move the detail
- Add pointers to newly important memories
- Resolve contradictions \u2014 if two files disagree, fix the wrong one`}

${ee}

---

Return a brief summary of what you consolidated, updated, or pruned. If nothing changed (memories are already tight), say so.${s?`

## Additional context

${s}`:""}`}var te=30;function L(e){return typeof e==="object"&&e!==null&&"type"in e&&e.type==="dream"}function F(e,o){let s=Lb("dream"),r={...rm(s,"dream","dreaming"),type:"dream",status:"running",skipTranscript:!0,phase:"starting",sessionsReviewing:o.sessionsReviewing,filesTouched:[],turns:[],abortController:o.abortController,priorMtime:o.priorMtime,...o.storageV5!==void 0&&{storageV5:o.storageV5}};return e.register(r),s}function j(e,o,s,r){r.update(e,(n)=>{let p=new Set(n.filesTouched),d=s.filter((u)=>!p.has(u)&&p.add(u));if(o.text===""&&o.toolUseCount===0&&d.length===0)return n;return{...n,phase:d.length>0?"updating":n.phase,filesTouched:d.length>0?[...n.filesTouched,...d]:n.filesTouched,turns:n.turns.slice(-(te-1)).concat(o)}})}function H(e,o){o.update(e,(s)=>({...s,status:"completed",endTime:Date.now(),notified:!0,abortController:void 0})),y("task_dream"),ai(e,"completed",{skipTranscript:!0,ambient:!0})}function W(e,o){o.update(e,(s)=>({...s,status:"failed",endTime:Date.now(),notified:!0,abortController:void 0})),m("task_dream","task_dream_failed"),ai(e,"failed",{skipTranscript:!0,ambient:!0})}var ne=600000,ae=new RegExp(`^\\s*(?:${Ggn})\\b`,"i"),z={minHours:24,minSessions:5};function ie(){let e=x("tengu_onyx_plover",null);return{minHours:typeof e?.minHours==="number"&&Number.isFinite(e.minHours)&&e.minHours>0?e.minHours:z.minHours,minSessions:typeof e?.minSessions==="number"&&Number.isFinite(e.minSessions)&&e.minSessions>0?e.minSessions:z.minSessions}}function me(){if(ar()!==null)return!1;if(kD())return!1;if(!Va())return!1;if(oU())return!1;return I$e()}function le(){return!1}function WUr(e){let o=0;M.of(e).runner=async function(r,n){let p=ie(),d=le();if(!d&&!me())return;let u;try{u=await X$e(void 0,r.toolUseContext.storageV5)}catch(f){t(`[autoDream] readLastConsolidatedAt failed: ${l(f)}`);return}let g=(Date.now()-u)/3600000;if(!d&&g<p.minHours)return;let T=Date.now()-o;if(!d&&T<ne){t(`[autoDream] scan throttle \u2014 time-gate passed but last scan was ${Math.round(T/1000)}s ago`);return}o=Date.now();let h;try{h=await tjr(u,r.toolUseContext.storageV5)}catch(f){t(`[autoDream] listSessionsTouchedSince failed: ${l(f)}`);return}let K=Y();if(h=h.filter((f)=>f!==K),!d&&h.length<p.minSessions){t(`[autoDream] skip \u2014 ${h.length} sessions since last consolidation, need ${p.minSessions}`),i("tengu_auto_dream_skipped",{reason:b("sessions"),session_count:h.length,min_required:p.minSessions});return}let D;if(d)D=u;else{try{D=await ejr(r.toolUseContext.storageV5)}catch(f){t(`[autoDream] lock acquire failed: ${l(f)}`);return}if(D===null){i("tengu_auto_dream_skipped",{reason:b("lock")});return}}let v=fR();t(`[autoDream] firing \u2014 ${g.toFixed(1)}h since last, ${h.length} sessions to review`),i("tengu_auto_dream_fired",{hours_since:Math.round(g),sessions_since:h.length,team_memory_enabled:v});let{taskRegistry:w}=r.toolUseContext,C=new AbortController,S=F(w,{sessionsReviewing:h.length,priorMtime:D,abortController:C,storageV5:r.toolUseContext.storageV5}),E="fork";try{let f=Qs(),U=Sc(he()),X=await ue(f,r.toolUseContext.storageV5),G=`

**Tool constraints for this run:** Shell access is restricted to read-only commands (\`ls\`, \`find\`, \`grep\`, \`cat\`, \`stat\`, \`wc\`, \`head\`, \`tail\`, and similar) plus deleting \`.md\` files inside the memory directory (outside protected subdirectories like \`.git\` or \`agents\`; \`rm\` takes no flags except \`-f\`). Anything else that writes, redirects to a file, or modifies state will be denied. Plan your exploration with this in mind.

Sessions since last consolidation (${h.length}):
${h.map((A)=>`- ${A}`).join(`
`)}`,pe=!1,J=I(f,U,G,v,QG(),QG()&&!a.CLAUDE_CODE_REMOTE&&!jT(),jZt(),!1),k=await Mv({promptMessages:[Ae({content:J})],cacheSafeParams:Z2(r),canUseTool:zgn(f),querySource:"auto_dream",forkLabel:"auto_dream",skipTranscript:!0,overrides:{abortController:C},onMessage:de(S,w,f),skipCacheWrite:LWe()});E="completion",H(S,w);let _=r.toolUseContext.taskRegistry.get(S),Z=L(_)?_.filesTouched.length:0;if(L(_)&&_.filesTouched.length>0)n?.({...P6t(_.filesTouched),verb:"Improved"}),r.toolUseContext.setAppState((A)=>({...A,pendingMemoryUpdates:[...A.pendingMemoryUpdates,{source:"dream",summary:`consolidated ${_.filesTouched.length} ${P(_.filesTouched.length,"memory file")}`,paths:_.filesTouched}]}));t(`[autoDream] completed \u2014 cache: read=${k.totalUsage.cache_read_input_tokens} created=${k.totalUsage.cache_creation_input_tokens}`),i("tengu_auto_dream_completed",{cache_read:k.totalUsage.cache_read_input_tokens,cache_created:k.totalUsage.cache_creation_input_tokens,output:k.totalUsage.output_tokens,sessions_reviewed:h.length,daily_logs_found:X,files_touched_count:Z,team_memory_enabled:v,account_memory_line_rendered:!1})}catch(f){if(C.signal.aborted){t("[autoDream] aborted by user");return}if(t(`[autoDream] ${E} failed: ${l(f)}`),i("tengu_auto_dream_failed",{phase:c(E),error_class:PB(se(f))}),E==="fork")W(S,w),await aUt(D,r.toolUseContext.storageV5)}}}function de(e,o,s){return(r)=>{if(r.type!=="assistant")return;let n="",p=0,d=[];for(let u of r.message.content)if(u.type==="text")n+=u.text;else if(u.type==="tool_use"){if(p++,u.name===Pt||u.name===vn){let g=u.input;if(typeof g.file_path==="string")d.push(g.file_path)}else if(T_.includes(u.name)){let g=u.input;if(typeof g.command==="string"&&ae.test(g.command))for(let T of g.command.matchAll(/"[^"]*\.md"|'[^']*\.md'|(?:\/|[A-Za-z]:[\\/])\S*\.md\b/g))d.push(T[0].replace(/^["']|["']$/g,""))}}j(e,{text:n.trim(),toolUseCount:p},d.filter((u)=>h8e(u,s)),o)}}async function ue(e,o){if(o!==void 0){let s=ce(e);if(s!==void 0){let r=0,n;do{let p=await o.listRecursive(s,n!==void 0?{cursor:n}:void 0);if(!p.ok)return t(`[autoDream] countDailyLogs: ${p.error.code}`),0;r+=B(p.value.items,(d)=>d.key.namespace==="memory"&&(d.key.relPath.at(-1)??"").endsWith(".md")),n=p.value.cursor}while(n);return r}}try{let s=await oe(re(e,"logs"),{recursive:!0});return B(s,(r)=>r.endsWith(".md"))}catch(s){if(!Ht(s))t(`[autoDream] countDailyLogs: ${l(s)}`);return 0}}function ce(e){let o=q(R(e));if(q(e)!=="memory"||R(R(e))!==rd()||!Mn(o))return;return{namespace:"memory",projectKey:o,relPath:["logs"]}}async function GUr(e,o){await M.of(e.toolUseContext.session.host).runner?.(e,o)}
export{put,I$e,WUr,GUr};
