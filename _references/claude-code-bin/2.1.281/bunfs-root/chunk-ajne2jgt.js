// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import"/$bunfs/root/chunk-kp7gknaw.js";import"/$bunfs/root/chunk-4a5nddj6.js";import"/$bunfs/root/chunk-cqc88nqm.js";import"/$bunfs/root/chunk-7yckkh1m.js";import"/$bunfs/root/chunk-rnxz8hs2.js";import"/$bunfs/root/chunk-2bj5eqbj.js";import"/$bunfs/root/chunk-7r0w3nmp.js";import"/$bunfs/root/chunk-35k7s716.js";import{t}from"/$bunfs/root/chunk-wfscmafr.js";import"/$bunfs/root/chunk-8bp13hnn.js";import"/$bunfs/root/chunk-kcjajdc8.js";import"/$bunfs/root/chunk-nqsdwfmt.js";import"/$bunfs/root/chunk-0n80jtth.js";import"/$bunfs/root/chunk-bzbw9xhh.js";import"/$bunfs/root/chunk-a22am1vw.js";import"/$bunfs/root/chunk-99avamm5.js";import"/$bunfs/root/chunk-1y7zyxh8.js";import"/$bunfs/root/chunk-ahgv64tk.js";import"/$bunfs/root/chunk-cqpd6xa9.js";import"/$bunfs/root/chunk-brvrqzf2.js";import{Vte}from"/$bunfs/root/chunk-xm3432dj.js";import"/$bunfs/root/chunk-x3c0ndcj.js";import"/$bunfs/root/chunk-7891bvze.js";var m={name:"MCP Task",type:"mcp_task",async kill(i,r,p,d,s){let e=r.get(i),n=e?.type==="mcp_task"?e.sidecarSessionId:void 0,o=e?.type==="mcp_task"?e.sidecarProjectDir:void 0,c=e?.type==="mcp_task"?e.sidecarWrite:void 0;if(e?.type==="mcp_task")e.abortController?.abort(),e.driveAbortController?.abort(),e.sep2663Cancel?.();r.update(i,(a)=>{if(a.notified||a.status!=="running")return a;return{...a,status:"killed",endTime:Date.now(),parked:void 0,notified:!0}}),(async()=>{await c,await Vte(i,s,n,o)})().catch((a)=>t(`McpTask.kill deleteMcpTaskMetadata: ${String(a)}`))}};export{m as MCP_TASK};
