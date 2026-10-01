// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{V,q,Ee}from"/$bunfs/root/chunk-hbjpbz2q.js";import{_,c}from"/$bunfs/root/chunk-dwaez71m.js";import{ee,l,GD,Ht}from"/$bunfs/root/chunk-ctczby4m.js";import{P}from"/$bunfs/root/chunk-xjjs8j5r.js";import{i}from"/$bunfs/root/chunk-r27mnwfc.js";import{y,m}from"/$bunfs/root/chunk-gm7a1q0z.js";import{qn}from"/$bunfs/root/chunk-hd8cteey.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{d$}from"/$bunfs/root/chunk-wk88sc60.js";import{cr}from"/$bunfs/root/chunk-dsxed40r.js";import{Je}from"/$bunfs/root/chunk-j27hwf9z.js";import{vi,R,Ed,zs}from"/$bunfs/root/chunk-4hjp8tw4.js";import{Ot,hn}from"/$bunfs/root/chunk-vqc3jzpc.js";import{Nun,tK,NF}from"/$bunfs/root/chunk-76ncyjb9.js";import{bd,qM,ARe}from"/$bunfs/root/chunk-k1m7zx7f.js";import{uS}from"/$bunfs/root/chunk-22qvrdjq.js";import{hd,xh}from"/$bunfs/root/chunk-wq44yhgc.js";import{Uy,mf,ac}from"/$bunfs/root/chunk-x276sydg.js";import{aq,qE,Rit,Re,Dt,Xrn}from"/$bunfs/root/chunk-kt4703ww.js";import{i6t,Fxn,Qet,Uxn}from"/$bunfs/root/chunk-6svw7jzn.js";import{RGe,Boo,ket,joo}from"/$bunfs/root/chunk-k7djt6f0.js";import{sw,Df}from"/$bunfs/root/chunk-6j0tanmw.js";import{G}from"/$bunfs/root/chunk-fcbtf7cc.js";function J(){return R("tengu_onyx_plover",null)}function zvt(){let e=J();return e?.enabled===!0||e?.available===!0}function vGe(){if(!zvt())return!1;let e=Je().autoDreamEnabled;if(e!==void 0)return e;return J()?.enabled===!0}import{readdir as he}from"fs/promises";import{basename as ae,dirname as W,join as ge}from"path";class Z{runner=null}var H=new V(()=>new Z);var ce="## Team memory (`team/` subdirectory)\n\nThe `team/` subdirectory holds memories shared across everyone working in this repo. Other teammates' Claude sessions write here too \u2014 treat it differently from your personal files:\n\n- **Phase 1:** `ls team/` and skim it alongside your personal files. A teammate may have already captured something you'd otherwise duplicate.\n- **Phase 3:** Merge near-duplicates *within* `team/` the same way you would personal memories. If a personal memory restates a team memory, delete the personal one.\n- **Phase 4 \u2014 be conservative pruning `team/`:**\n  - DO delete or fix a team memory that is clearly contradicted by the current code, or that a newer team memory marks as superseded.\n  - DO NOT delete a team memory just because you don't recognize it or it isn't relevant to *your* recent sessions \u2014 a teammate may rely on it.\n  - When unsure, leave it. A stale team memory costs little; deleting a teammate's load-bearing note costs a lot.\n\nDo not promote personal memories into `team/` during a dream \u2014 that's a deliberate choice the user makes via `/remember`, not something to do reflexively.",pe=`### Reconcile memories against CLAUDE.md

Project CLAUDE.md instructions are loaded in your system prompt. For each memory that captures feedback or project conventions (the \`feedback\`/\`project\` types, where tagged), check whether it contradicts a CLAUDE.md instruction on the same topic:

- **Memory is stale** \u2014 CLAUDE.md and the memory describe different procedures for the same task: CLAUDE.md is the maintained, checked-in source. Delete the memory, or rewrite it to agree if it carries context worth keeping (the *why* is still useful but the *how* is wrong).
- **CLAUDE.md may be stale** \u2014 the memory is clearly dated after CLAUDE.md and explicitly corrects it: do NOT edit CLAUDE.md during a dream. Annotate the memory with "contradicts CLAUDE.md \u2014 verify which is current" and list it in your summary so the user can update CLAUDE.md.
- **Not a conflict** \u2014 the memory adds detail CLAUDE.md doesn't cover, or narrows a CLAUDE.md rule with a stated reason. Leave it.

A \`feedback\` memory's "Why: the user corrected me" framing is not evidence it's newer than CLAUDE.md \u2014 CLAUDE.md may have been updated since.`;function Q(e,r,o,u=!1,a=!1,s=!1){return`# Dream: Memory Consolidation

You are performing a dream \u2014 a reflective pass over your memory files. Synthesize what you've learned recently into durable, well-organized memories so that future sessions can orient quickly.

Memory directory: \`${e}\`
${ARe}

Session transcripts: \`${r}\` (large JSONL files \u2014 grep narrowly, don't read whole files)
${u?`
${ce}
`:""}
---

## Phase 1 \u2014 Orient

- \`ls\` the memory directory to see what already exists
- Read \`${bd}\` to understand the current index
- Skim existing topic files so you improve them rather than creating duplicates
- \`ls -R logs/\` \u2014 recent activity logs (one file per session under \`YYYY/MM/DD/\`). If a \`sessions/\` subdirectory also exists, review recent entries there too

## Phase 2 \u2014 Gather recent signal

Look for new information worth persisting. Sources in rough priority order:

1. **Session logs** (\`logs/YYYY/MM/DD/<id>-<title>.md\`) \u2014 the append-only activity stream, one file per session. Read the most recent 1\u20133 days of sessions (the filename title tells you what each was about); each line is prefix-coded (\`>\` user, \`<\` assistant, \`.\` tool call)
2. **Existing memories that drifted** \u2014 facts that contradict something you see in the codebase now
3. **Transcript search** \u2014 if you need specific context (e.g., "what was the error message from yesterday's build failure?"), grep the JSONL transcripts for narrow terms:
   \`grep -rn "<narrow term>" ${r}/ --include="*.jsonl" | tail -50\`

Don't exhaustively read transcripts. Look only for things you already suspect matter.

## Phase 3 \u2014 Consolidate

For each thing worth remembering, write or update a memory file at the top level of the memory directory. Use the memory file format and type conventions from your system prompt's auto-memory section \u2014 it's the source of truth for what to save, how to structure it, and what NOT to save.${a?` The ${Uy} / ${mf} / ${ac} tools are unavailable in a dream: consolidate only this memory directory, and leave anything that section marks as shared with the project where it is \u2014 never copy it into these files.`:""}${""}

Focus on:
- Merging new signal into existing topic files rather than creating near-duplicates
- Converting relative dates ("yesterday", "last week") to absolute dates so they remain interpretable after time passes
- Deleting contradicted facts \u2014 if today's investigation disproves an old memory, fix it at the source

## Phase 4 \u2014 Prune and index

Update \`${bd}\` so it stays under ${qM} lines AND under ~25KB. It's an **index**, not a dump \u2014 each entry should be one line under ~150 characters: \`- [Title](file.md) \u2014 one-line hook\`. Never write memory content directly into it.

- Remove pointers to memories that are now stale, wrong, or superseded
- Demote verbose entries: if an index line is over ~200 chars, it's carrying content that belongs in the topic file \u2014 shorten the line, move the detail
- Add pointers to newly important memories
- Resolve contradictions \u2014 if two files disagree, fix the wrong one

${pe}

---

Return a brief summary of what you consolidated, updated, or pruned. If nothing changed (memories are already tight), say so.${o?`

## Additional context

${o}`:""}`}var fe=30;function Y(e){return typeof e==="object"&&e!==null&&"type"in e&&e.type==="dream"}function te(e,r){let o=sw("dream"),u={...Df(o,"dream","dreaming"),type:"dream",status:"running",skipTranscript:!0,phase:"starting",sessionsReviewing:r.sessionsReviewing,filesTouched:[],turns:[],abortController:r.abortController,priorMtime:r.priorMtime,...r.storageV5!==void 0&&{storageV5:r.storageV5}};return e.register(u),o}function re(e,r,o,u){u.update(e,(a)=>{let s=new Set(a.filesTouched),d=o.filter((n)=>!s.has(n)&&s.add(n));if(r.text===""&&r.toolUseCount===0&&d.length===0)return a;return{...a,phase:d.length>0?"updating":a.phase,filesTouched:d.length>0?[...a.filesTouched,...d]:a.filesTouched,turns:a.turns.slice(-(fe-1)).concat(r)}})}function oe(e,r){r.update(e,(o)=>({...o,status:"completed",endTime:Date.now(),notified:!0,abortController:void 0})),y("task_dream"),vi(e,"completed",{skipTranscript:!0,ambient:!0})}function se(e,r){r.update(e,(o)=>({...o,status:"failed",endTime:Date.now(),notified:!0,abortController:void 0})),m("task_dream","task_dream_failed"),vi(e,"failed",{skipTranscript:!0,ambient:!0})}var k=null,ye=600000,_e=new RegExp(`^\\s*(?:${Fxn})\\b`,"i"),ne={minHours:24,minSessions:5};function we(){let e=R("tengu_onyx_plover",null);return{minHours:typeof e?.minHours==="number"&&Number.isFinite(e.minHours)&&e.minHours>0?e.minHours:ne.minHours,minSessions:typeof e?.minSessions==="number"&&Number.isFinite(e.minSessions)&&e.minSessions>0?e.minSessions:ne.minSessions}}function ke(){if(cr()!==null)return!1;if(d$())return!1;if(!Ed())return!1;if(tK())return!1;return vGe()}function be(){return!1}function Tro(e){let r=0,o=!1,u=new Set;H.of(e).runner=async function(s,d){let n=we(),p=be();if(!p&&!ke())return;let E;try{E=await RGe(void 0,s.toolUseContext.storageV5)}catch(g){t(`[autoDream] readLastConsolidatedAt failed: ${l(g)}`);return}let O=(Date.now()-E)/3600000;if(!p&&O<n.minHours)return;let B=Date.now()-r;if(!p&&B<ye){t(`[autoDream] scan throttle \u2014 time-gate passed but last scan was ${Math.round(B/1000)}s ago`);return}r=Date.now();let f;try{f=await joo(E,s.toolUseContext.storageV5)}catch(g){t(`[autoDream] listSessionsTouchedSince failed: ${l(g)}`);return}let ie=q();if(f=f.filter((g)=>g!==ie),!p&&f.length<n.minSessions){t(`[autoDream] skip \u2014 ${f.length} sessions since last consolidation, need ${n.minSessions}`),i("tengu_auto_dream_skipped",{reason:_("sessions"),session_count:f.length,min_required:n.minSessions});return}let T;if(p)T=E;else{try{T=await Boo(s.toolUseContext.storageV5)}catch(g){t(`[autoDream] lock acquire failed: ${l(g)}`);return}if(T===null){i("tengu_auto_dream_skipped",{reason:_("lock")});return}}let D=zs(),C=void 0,h=C==="unplaced"||C==="capped"?void 0:C;if(h==="newer"||h!==void 0&&"unreadable"in h){if(!p)await ket(T,s.toolUseContext.storageV5);if(h!=="newer"){if(t(`[autoDream] skipped: the memory items could not be read (cause: ${h.unreadable}); the warning above says why and what resumes consolidation`),i("tengu_auto_dream_skipped",{reason:_("items_unreadable")}),k!==null&&d!==void 0&&!u.has(h.unreadable))u.add(h.unreadable),d?.(Dt(await k.unreadableItemsNotice(h.unreadable,D),"warning"));return}if(t("[autoDream] skip \u2014 newer item record"),i("tengu_auto_dream_skipped",{reason:_("record_newer")}),k!==null&&d!==void 0&&!o)o=!0,d?.(Dt(k.NEWER_RECORD_NOTICE,"warning"));return}let N=NF();t(`[autoDream] firing \u2014 ${O.toFixed(1)}h since last, ${f.length} sessions to review`),i("tengu_auto_dream_fired",{hours_since:Math.round(O),sessions_since:f.length,team_memory_enabled:N});let{taskRegistry:M}=s.toolUseContext,v=new AbortController,x=te(M,{sessionsReviewing:f.length,priorMtime:T,abortController:v,storageV5:s.toolUseContext.storageV5}),L="fork";try{let g=xh(Ee()),z=await Te(D,s.toolUseContext.storageV5),me=`

**Tool constraints for this run:** Shell access is restricted to read-only commands (\`ls\`, \`find\`, \`grep\`, \`cat\`, \`stat\`, \`wc\`, \`head\`, \`tail\`, and similar) plus deleting \`.md\` files inside the memory directory (outside protected subdirectories like \`.git\` or \`agents\`; \`rm\` takes no flags except \`-f\`). Anything else that writes, redirects to a file, or modifies state will be denied. Plan your exploration with this in mind.

Sessions since last consolidation (${f.length}):
${f.map((w)=>`- ${w}`).join(`
`)}`,ve=!1,le=Q(D,g,me,N,Nun(),!1),de=Se(x,M,D),I=new Map,F=new Set,K=!1,X=!1,j=!1,A;try{A=await qE({promptMessages:[Re({content:le})],cacheSafeParams:aq(s),canUseTool:Uxn(D,h!==void 0?k?.keptItemsOf(h):void 0,{fork:"dream",onWriteAllowed:(w,U)=>I.set(U,w)}),querySource:"auto_dream",forkLabel:"auto_dream",skipTranscript:!0,overrides:{abortController:v},onMessage:(w)=>{if(de(w),De(w,F),w.type==="assistant")K=w.isApiErrorMessage===!0},skipCacheWrite:Rit()}),X=!0,j=!v.signal.aborted&&!K}finally{let w=new Set([...I].filter(([b])=>!j||!F.has(b)).map(([,b])=>b)),U=new Set([...I].filter(([b])=>j&&F.has(b)).map(([,b])=>b));if(k!==null&&C==="capped")await k.deferCappedRunWrites({memoryDir:D,dreamWrote:w,mayHaveWritten:U});if(k!==null&&h!==void 0){let b=await k.settleDreamItems({memoryDir:D,before:h,dreamWrote:w,mayHaveWritten:U});if((b.skipped||b.failed)&&X&&!v.signal.aborted&&!p&&await k.claimLockGiveBack(D))await ket(T,s.toolUseContext.storageV5)}}L="completion",oe(x,M);let S=s.toolUseContext.taskRegistry.get(x),ue=Y(S)?S.filesTouched.length:0;if(Y(S)&&S.filesTouched.length>0)d?.({...Xrn(S.filesTouched),verb:"Improved"}),await i6t(s.toolUseContext,{source:"dream",summary:`consolidated ${S.filesTouched.length} ${P(S.filesTouched.length,"memory file")}`,paths:S.filesTouched});t(`[autoDream] completed \u2014 cache: read=${A.totalUsage.cache_read_input_tokens} created=${A.totalUsage.cache_creation_input_tokens}`),i("tengu_auto_dream_completed",{cache_read:A.totalUsage.cache_read_input_tokens,cache_created:A.totalUsage.cache_creation_input_tokens,output:A.totalUsage.output_tokens,sessions_reviewed:f.length,daily_logs_found:z,files_touched_count:ue,team_memory_enabled:N,account_memory_line_rendered:!1})}catch(g){if(v.signal.aborted){t("[autoDream] aborted by user");return}if(t(`[autoDream] ${L} failed: ${l(g)}`),i("tengu_auto_dream_failed",{phase:c(L),error_class:GD(ee(g))}),L==="fork")se(x,M),await ket(T,s.toolUseContext.storageV5)}}}function De(e,r){if(e.type!=="user"||e.toolDenialKind!==void 0||typeof e.message.content==="string")return;for(let o of e.message.content)if(o.type==="tool_result"&&o.is_error===!0)r.add(o.tool_use_id)}function Se(e,r,o){return(u)=>{if(u.type!=="assistant")return;let a="",s=0,d=[];for(let n of u.message.content)if(n.type==="text")a+=n.text;else if(n.type==="tool_use"){if(s++,n.name===Ot||n.name===hn){let p=n.input;if(typeof p.file_path==="string")d.push(p.file_path)}else if(uS.includes(n.name)){let p=n.input;if(typeof p.command==="string"&&_e.test(p.command))for(let E of p.command.matchAll(/"[^"]*\.md"|'[^']*\.md'|(?:\/|[A-Za-z]:[\\/])\S*\.md\b/g))d.push(E[0].replace(/^["']|["']$/g,""))}}re(e,{text:a.trim(),toolUseCount:s},d.filter((n)=>Qet(n,o)),r)}}async function Te(e,r){if(r!==void 0){let o=Ae(e);if(o!==void 0){let u=0,a;do{let s=await r.listRecursive(o,a!==void 0?{cursor:a}:void 0);if(!s.ok)return t(`[autoDream] countDailyLogs: ${s.error.code}`),0;u+=G(s.value.items,(d)=>d.key.namespace==="memory"&&(d.key.relPath.at(-1)??"").endsWith(".md")),a=s.value.cursor}while(a);return u}}try{let o=await he(ge(e,"logs"),{recursive:!0});return G(o,(u)=>u.endsWith(".md"))}catch(o){if(!Ht(o))t(`[autoDream] countDailyLogs: ${l(o)}`);return 0}}function Ae(e){let r=ae(W(e));if(ae(e)!=="memory"||W(W(e))!==hd()||!qn(r))return;return{namespace:"memory",projectKey:r,relPath:["logs"]}}async function Aro(e,r){await H.of(e.toolUseContext.session.host).runner?.(e,r)}
export{zvt,vGe,Tro,Aro};
