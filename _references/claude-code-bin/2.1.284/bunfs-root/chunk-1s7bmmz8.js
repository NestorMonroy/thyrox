// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{q,Y,we}from"/$bunfs/root/chunk-d37h8mav.js";import{y,c}from"/$bunfs/root/chunk-czwr6846.js";import{te,l,dD,Rt}from"/$bunfs/root/chunk-31aa9k3a.js";import{I}from"/$bunfs/root/chunk-k6n2tyj0.js";import{i}from"/$bunfs/root/chunk-wt82nr44.js";import{_,m}from"/$bunfs/root/chunk-q5gkv7dz.js";import{zn}from"/$bunfs/root/chunk-h4npc7kp.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{UA,AN}from"/$bunfs/root/chunk-2rw92xpq.js";import{cr}from"/$bunfs/root/chunk-hqy3a2gr.js";import{Je}from"/$bunfs/root/chunk-r03mjfax.js";import{wi,x,yl,Ns}from"/$bunfs/root/chunk-swk3rjnt.js";import{Tt,wn}from"/$bunfs/root/chunk-hf1cte62.js";import{xV,PE,oKe,Ae,Ft,Xtn}from"/$bunfs/root/chunk-77kn462z.js";import{Jb}from"/$bunfs/root/chunk-q3brtb9y.js";import{Ty,cf,sc}from"/$bunfs/root/chunk-aajqf4q2.js";import{Jcn,jG,Rx,Rq}from"/$bunfs/root/chunk-ydh20bsp.js";import{Oc,DL,Wce}from"/$bunfs/root/chunk-vbpq1dj9.js";import{Td,Wh}from"/$bunfs/root/chunk-xn16exs1.js";import{n5t,lCn,_Ze,cCn}from"/$bunfs/root/chunk-mg4cs21q.js";import{rGe,XZr,jQe,JZr}from"/$bunfs/root/chunk-gnsqf7j9.js";import{PS,Pm}from"/$bunfs/root/chunk-dzagexj9.js";import{U}from"/$bunfs/root/chunk-f84h7z01.js";function J(){return x("tengu_onyx_plover",null)}function FSt(){let e=J();return e?.enabled===!0||e?.available===!0}function JWe(){if(!FSt())return!1;let e=Je().autoDreamEnabled;if(e!==void 0)return e;return J()?.enabled===!0}import{readdir as he}from"fs/promises";import{basename as ne,dirname as V,join as ge}from"path";class Z{runner=null}var H=new q(()=>new Z);var ce="## Team memory (`team/` subdirectory)\n\nThe `team/` subdirectory holds memories shared across everyone working in this repo. Other teammates' Claude sessions write here too \u2014 treat it differently from your personal files:\n\n- **Phase 1:** `ls team/` and skim it alongside your personal files. A teammate may have already captured something you'd otherwise duplicate.\n- **Phase 3:** Merge near-duplicates *within* `team/` the same way you would personal memories. If a personal memory restates a team memory, delete the personal one.\n- **Phase 4 \u2014 be conservative pruning `team/`:**\n  - DO delete or fix a team memory that is clearly contradicted by the current code, or that a newer team memory marks as superseded.\n  - DO NOT delete a team memory just because you don't recognize it or it isn't relevant to *your* recent sessions \u2014 a teammate may rely on it.\n  - When unsure, leave it. A stale team memory costs little; deleting a teammate's load-bearing note costs a lot.\n\nDo not promote personal memories into `team/` during a dream \u2014 that's a deliberate choice the user makes via `/remember`, not something to do reflexively.",fe=`### Reconcile memories against CLAUDE.md

Project CLAUDE.md instructions are loaded in your system prompt. For each memory that captures feedback or project conventions (the \`feedback\`/\`project\` types, where tagged), check whether it contradicts a CLAUDE.md instruction on the same topic:

- **Memory is stale** \u2014 CLAUDE.md and the memory describe different procedures for the same task: CLAUDE.md is the maintained, checked-in source. Delete the memory, or rewrite it to agree if it carries context worth keeping (the *why* is still useful but the *how* is wrong).
- **CLAUDE.md may be stale** \u2014 the memory is clearly dated after CLAUDE.md and explicitly corrects it: do NOT edit CLAUDE.md during a dream. Annotate the memory with "contradicts CLAUDE.md \u2014 verify which is current" and list it in your summary so the user can update CLAUDE.md.
- **Not a conflict** \u2014 the memory adds detail CLAUDE.md doesn't cover, or narrows a CLAUDE.md rule with a stated reason. Leave it.

A \`feedback\` memory's "Why: the user corrected me" framing is not evidence it's newer than CLAUDE.md \u2014 CLAUDE.md may have been updated since.`;function Q(e,r,o,f=!1,u=!1,s=!1,n=!1,d=!1){return`# Dream: Memory Consolidation

You are performing a dream \u2014 a reflective pass over your memory files. Synthesize what you've learned recently into durable, well-organized memories so that future sessions can orient quickly.

Memory directory: \`${e}\`
${Wce}

Session transcripts: \`${r}\` (large JSONL files \u2014 grep narrowly, don't read whole files)
${f?`
${ce}
`:""}
---

## Phase 1 \u2014 Orient

- \`ls\` the memory directory to see what already exists
${s?"":`- Read \`${Oc}\` to understand the current index
`}- Skim existing topic files so you improve them rather than creating duplicates
- \`ls -R logs/\` \u2014 recent activity logs (one file per session under \`YYYY/MM/DD/\`). If a \`sessions/\` subdirectory also exists, review recent entries there too

## Phase 2 \u2014 Gather recent signal

Look for new information worth persisting. Sources in rough priority order:

1. **Session logs** (\`logs/YYYY/MM/DD/<id>-<title>.md\`) \u2014 the append-only activity stream, one file per session. Read the most recent 1\u20133 days of sessions (the filename title tells you what each was about); each line is prefix-coded (\`>\` user, \`<\` assistant, \`.\` tool call)
2. **Existing memories that drifted** \u2014 facts that contradict something you see in the codebase now
3. **Transcript search** \u2014 if you need specific context (e.g., "what was the error message from yesterday's build failure?"), grep the JSONL transcripts for narrow terms:
   \`grep -rn "<narrow term>" ${r}/ --include="*.jsonl" | tail -50\`

Don't exhaustively read transcripts. Look only for things you already suspect matter.

## Phase 3 \u2014 Consolidate

For each thing worth remembering, write or update a memory file at the top level of the memory directory. Use the memory file format${u?"":" and type conventions"} from your system prompt's auto-memory section \u2014 it's the source of truth for what to save, how to structure it, and what NOT to save.${n?` The ${Ty} / ${cf} / ${sc} tools are unavailable in a dream: consolidate only this memory directory, and leave anything that section marks as shared with the project where it is \u2014 never copy it into these files.`:""}${""}

Focus on:
- Merging new signal into existing topic files rather than creating near-duplicates
- Converting relative dates ("yesterday", "last week") to absolute dates so they remain interpretable after time passes
- Deleting contradicted facts \u2014 if today's investigation disproves an old memory, fix it at the source

${s?"## Phase 4 \u2014 Prune\n\nKeep each memory file's frontmatter (`name`, `description`) accurate and one-line \u2014 the index shown in future sessions is assembled from those fields at load time, so a stale `description` is a stale index entry.\n\n- Remove memories that are now stale, wrong, or superseded\n- Resolve contradictions \u2014 if two files disagree, fix the wrong one":`## Phase 4 \u2014 Prune and index

Update \`${Oc}\` so it stays under ${DL} lines AND under ~25KB. It's an **index**, not a dump \u2014 each entry should be one line under ~150 characters: \`- [Title](file.md) \u2014 one-line hook\`. Never write memory content directly into it.

- Remove pointers to memories that are now stale, wrong, or superseded
- Demote verbose entries: if an index line is over ~200 chars, it's carrying content that belongs in the topic file \u2014 shorten the line, move the detail
- Add pointers to newly important memories
- Resolve contradictions \u2014 if two files disagree, fix the wrong one`}

${fe}

---

Return a brief summary of what you consolidated, updated, or pruned. If nothing changed (memories are already tight), say so.${o?`

## Additional context

${o}`:""}`}var pe=30;function B(e){return typeof e==="object"&&e!==null&&"type"in e&&e.type==="dream"}function ee(e,r){let o=PS("dream"),f={...Pm(o,"dream","dreaming"),type:"dream",status:"running",skipTranscript:!0,phase:"starting",sessionsReviewing:r.sessionsReviewing,filesTouched:[],turns:[],abortController:r.abortController,priorMtime:r.priorMtime,...r.storageV5!==void 0&&{storageV5:r.storageV5}};return e.register(f),o}function re(e,r,o,f){f.update(e,(u)=>{let s=new Set(u.filesTouched),n=o.filter((d)=>!s.has(d)&&s.add(d));if(r.text===""&&r.toolUseCount===0&&n.length===0)return u;return{...u,phase:n.length>0?"updating":u.phase,filesTouched:n.length>0?[...u.filesTouched,...n]:u.filesTouched,turns:u.turns.slice(-(pe-1)).concat(r)}})}function oe(e,r){r.update(e,(o)=>({...o,status:"completed",endTime:Date.now(),notified:!0,abortController:void 0})),_("task_dream"),wi(e,"completed",{skipTranscript:!0,ambient:!0})}function se(e,r){r.update(e,(o)=>({...o,status:"failed",endTime:Date.now(),notified:!0,abortController:void 0})),m("task_dream","task_dream_failed"),wi(e,"failed",{skipTranscript:!0,ambient:!0})}var D=null,ye=600000,_e=new RegExp(`^\\s*(?:${lCn})\\b`,"i"),ae={minHours:24,minSessions:5};function ke(){let e=x("tengu_onyx_plover",null);return{minHours:typeof e?.minHours==="number"&&Number.isFinite(e.minHours)&&e.minHours>0?e.minHours:ae.minHours,minSessions:typeof e?.minSessions==="number"&&Number.isFinite(e.minSessions)&&e.minSessions>0?e.minSessions:ae.minSessions}}function De(){if(cr()!==null)return!1;if(AN())return!1;if(!yl())return!1;if(jG())return!1;return JWe()}function be(){return!1}function $Qr(e){let r=0,o=!1,f=!1;H.of(e).runner=async function(s,n){let d=ke(),p=be();if(!p&&!De())return;let E;try{E=await rGe(void 0,s.toolUseContext.storageV5)}catch(g){t(`[autoDream] readLastConsolidatedAt failed: ${l(g)}`);return}let O=(Date.now()-E)/3600000;if(!p&&O<d.minHours)return;let W=Date.now()-r;if(!p&&W<ye){t(`[autoDream] scan throttle \u2014 time-gate passed but last scan was ${Math.round(W/1000)}s ago`);return}r=Date.now();let h;try{h=await JZr(E,s.toolUseContext.storageV5)}catch(g){t(`[autoDream] listSessionsTouchedSince failed: ${l(g)}`);return}let ie=Y();if(h=h.filter((g)=>g!==ie),!p&&h.length<d.minSessions){t(`[autoDream] skip \u2014 ${h.length} sessions since last consolidation, need ${d.minSessions}`),i("tengu_auto_dream_skipped",{reason:y("sessions"),session_count:h.length,min_required:d.minSessions});return}let T;if(p)T=E;else{try{T=await XZr(s.toolUseContext.storageV5)}catch(g){t(`[autoDream] lock acquire failed: ${l(g)}`);return}if(T===null){i("tengu_auto_dream_skipped",{reason:y("lock")});return}}let A=Ns(),K=void 0,S=K==="unplaced"?void 0:K;if(S==="newer"||S==="unreadable"){if(!p)await jQe(T,s.toolUseContext.storageV5);if(S==="unreadable"){if(t("[autoDream] skipped: the memory items could not be read (the warning above says why); the next run tries again"),i("tengu_auto_dream_skipped",{reason:y("items_unreadable")}),D!==null&&n!==void 0&&!f)f=!0,n?.(Ft(D.UNREADABLE_RECORD_NOTICE,"warning"));return}if(t("[autoDream] skip \u2014 newer item record"),i("tengu_auto_dream_skipped",{reason:y("record_newer")}),D!==null&&n!==void 0&&!o)o=!0,n?.(Ft(D.NEWER_RECORD_NOTICE,"warning"));return}let P=Rx();t(`[autoDream] firing \u2014 ${O.toFixed(1)}h since last, ${h.length} sessions to review`),i("tengu_auto_dream_fired",{hours_since:Math.round(O),sessions_since:h.length,team_memory_enabled:P});let{taskRegistry:M}=s.toolUseContext,C=new AbortController,L=ee(M,{sessionsReviewing:h.length,priorMtime:T,abortController:C,storageV5:s.toolUseContext.storageV5}),R="fork";try{let g=Wh(we()),z=await Ee(A,s.toolUseContext.storageV5),me=`

**Tool constraints for this run:** Shell access is restricted to read-only commands (\`ls\`, \`find\`, \`grep\`, \`cat\`, \`stat\`, \`wc\`, \`head\`, \`tail\`, and similar) plus deleting \`.md\` files inside the memory directory (outside protected subdirectories like \`.git\` or \`agents\`; \`rm\` takes no flags except \`-f\`). Anything else that writes, redirects to a file, or modifies state will be denied. Plan your exploration with this in mind.

Sessions since last consolidation (${h.length}):
${h.map((w)=>`- ${w}`).join(`
`)}`,Ce=!1,le=Q(A,g,me,P,Rq(),Rq()&&!a.CLAUDE_CODE_REMOTE&&!UA(),Jcn(),!1),de=Se(L,M,A),N=new Map,F=new Set,G=!1,X=!1,j=!1,v;try{v=await PE({promptMessages:[Ae({content:le})],cacheSafeParams:xV(s),canUseTool:cCn(A,S!==void 0?D?.keptItemsOf(S):void 0,{fork:"dream",onWriteAllowed:(w,k)=>N.set(k,w)}),querySource:"auto_dream",forkLabel:"auto_dream",skipTranscript:!0,overrides:{abortController:C},onMessage:(w)=>{if(de(w),Te(w,F),w.type==="assistant")G=w.isApiErrorMessage===!0},skipCacheWrite:oKe()}),X=!0,j=!C.signal.aborted&&!G}finally{if(D!==null&&S!==void 0){let w=await D.settleDreamItems({memoryDir:A,before:S,dreamWrote:new Set([...N].filter(([k])=>!j||!F.has(k)).map(([,k])=>k)),mayHaveWritten:new Set([...N].filter(([k])=>j&&F.has(k)).map(([,k])=>k))});if((w.skipped||w.failed)&&X&&!C.signal.aborted&&!p&&await D.claimLockGiveBack(A))await jQe(T,s.toolUseContext.storageV5)}}R="completion",oe(L,M);let b=s.toolUseContext.taskRegistry.get(L),ue=B(b)?b.filesTouched.length:0;if(B(b)&&b.filesTouched.length>0)n?.({...Xtn(b.filesTouched),verb:"Improved"}),await n5t(s.toolUseContext,{source:"dream",summary:`consolidated ${b.filesTouched.length} ${I(b.filesTouched.length,"memory file")}`,paths:b.filesTouched});t(`[autoDream] completed \u2014 cache: read=${v.totalUsage.cache_read_input_tokens} created=${v.totalUsage.cache_creation_input_tokens}`),i("tengu_auto_dream_completed",{cache_read:v.totalUsage.cache_read_input_tokens,cache_created:v.totalUsage.cache_creation_input_tokens,output:v.totalUsage.output_tokens,sessions_reviewed:h.length,daily_logs_found:z,files_touched_count:ue,team_memory_enabled:P,account_memory_line_rendered:!1})}catch(g){if(C.signal.aborted){t("[autoDream] aborted by user");return}if(t(`[autoDream] ${R} failed: ${l(g)}`),i("tengu_auto_dream_failed",{phase:c(R),error_class:dD(te(g))}),R==="fork")se(L,M),await jQe(T,s.toolUseContext.storageV5)}}}function Te(e,r){if(e.type!=="user"||e.toolDenialKind!==void 0||typeof e.message.content==="string")return;for(let o of e.message.content)if(o.type==="tool_result"&&o.is_error===!0)r.add(o.tool_use_id)}function Se(e,r,o){return(f)=>{if(f.type!=="assistant")return;let u="",s=0,n=[];for(let d of f.message.content)if(d.type==="text")u+=d.text;else if(d.type==="tool_use"){if(s++,d.name===Tt||d.name===wn){let p=d.input;if(typeof p.file_path==="string")n.push(p.file_path)}else if(Jb.includes(d.name)){let p=d.input;if(typeof p.command==="string"&&_e.test(p.command))for(let E of p.command.matchAll(/"[^"]*\.md"|'[^']*\.md'|(?:\/|[A-Za-z]:[\\/])\S*\.md\b/g))n.push(E[0].replace(/^["']|["']$/g,""))}}re(e,{text:u.trim(),toolUseCount:s},n.filter((d)=>_Ze(d,o)),r)}}async function Ee(e,r){if(r!==void 0){let o=ve(e);if(o!==void 0){let f=0,u;do{let s=await r.listRecursive(o,u!==void 0?{cursor:u}:void 0);if(!s.ok)return t(`[autoDream] countDailyLogs: ${s.error.code}`),0;f+=U(s.value.items,(n)=>n.key.namespace==="memory"&&(n.key.relPath.at(-1)??"").endsWith(".md")),u=s.value.cursor}while(u);return f}}try{let o=await he(ge(e,"logs"),{recursive:!0});return U(o,(f)=>f.endsWith(".md"))}catch(o){if(!Rt(o))t(`[autoDream] countDailyLogs: ${l(o)}`);return 0}}function ve(e){let r=ne(V(e));if(ne(e)!=="memory"||V(V(e))!==Td()||!zn(r))return;return{namespace:"memory",projectKey:r,relPath:["logs"]}}async function FQr(e,r){await H.of(e.toolUseContext.session.host).runner?.(e,r)}
export{FSt,JWe,$Qr,FQr};
