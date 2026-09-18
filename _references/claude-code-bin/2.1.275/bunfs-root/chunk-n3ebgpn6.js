// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import"/$bunfs/root/chunk-q7rz8cer.js";import"/$bunfs/root/chunk-aw1peprz.js";import"/$bunfs/root/chunk-4qqe0nh4.js";import"/$bunfs/root/chunk-h401nbms.js";import"/$bunfs/root/chunk-d5d0zdsy.js";import"/$bunfs/root/chunk-gytndg57.js";import"/$bunfs/root/chunk-t2x4z9pb.js";import"/$bunfs/root/chunk-gfewy5rb.js";import{t}from"/$bunfs/root/chunk-4bbpt7sc.js";import"/$bunfs/root/chunk-6ghkw3jc.js";import"/$bunfs/root/chunk-q4s29khb.js";import"/$bunfs/root/chunk-gh1pqen9.js";import"/$bunfs/root/chunk-tmptt1gv.js";import"/$bunfs/root/chunk-qwxqekf7.js";import"/$bunfs/root/chunk-vtbas3eg.js";import"/$bunfs/root/chunk-dtjhjxgx.js";import"/$bunfs/root/chunk-j47jt515.js";import"/$bunfs/root/chunk-crr3rzxx.js";import"/$bunfs/root/chunk-ebf04mp3.js";import"/$bunfs/root/chunk-ayvre55m.js";import"/$bunfs/root/chunk-g8rhxhbp.js";import"/$bunfs/root/chunk-nm7g42qn.js";import{m7}from"/$bunfs/root/chunk-hnz6tktt.js";import"/$bunfs/root/chunk-50y2d1jk.js";import"/$bunfs/root/chunk-afr02rb5.js";var m={name:"MCP Task",type:"mcp_task",async kill(i,r,p,d,s){let e=r.get(i),n=e?.type==="mcp_task"?e.sidecarSessionId:void 0,o=e?.type==="mcp_task"?e.sidecarProjectDir:void 0,c=e?.type==="mcp_task"?e.sidecarWrite:void 0;if(e?.type==="mcp_task")e.abortController?.abort(),e.driveAbortController?.abort(),e.sep2663Cancel?.();r.update(i,(a)=>{if(a.notified||a.status!=="running")return a;return{...a,status:"killed",endTime:Date.now(),parked:void 0,notified:!0}}),(async()=>{await c,await m7(i,s,n,o)})().catch((a)=>t(`McpTask.kill deleteMcpTaskMetadata: ${String(a)}`))}};export{m as MCP_TASK};
