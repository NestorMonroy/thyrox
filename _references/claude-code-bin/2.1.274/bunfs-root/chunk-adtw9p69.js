// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import"/$bunfs/root/chunk-4cmy5sqz.js";import"/$bunfs/root/chunk-tep8see7.js";import"/$bunfs/root/chunk-ja309z9r.js";import"/$bunfs/root/chunk-p7hrkaq4.js";import"/$bunfs/root/chunk-3btyksgt.js";import"/$bunfs/root/chunk-64dkx51v.js";import"/$bunfs/root/chunk-akpzg2yh.js";import"/$bunfs/root/chunk-g5h2a16k.js";import{t}from"/$bunfs/root/chunk-r2c9k9kh.js";import"/$bunfs/root/chunk-53a5hn9r.js";import"/$bunfs/root/chunk-yy7a4xwv.js";import"/$bunfs/root/chunk-dz2zqf8q.js";import"/$bunfs/root/chunk-hf9yhhhe.js";import"/$bunfs/root/chunk-z0202m3z.js";import"/$bunfs/root/chunk-w8gsn0hm.js";import"/$bunfs/root/chunk-ecxh3hga.js";import"/$bunfs/root/chunk-j96jysac.js";import"/$bunfs/root/chunk-hxy982f9.js";import"/$bunfs/root/chunk-b565vq97.js";import"/$bunfs/root/chunk-b5k761bj.js";import"/$bunfs/root/chunk-hk70qp2z.js";import"/$bunfs/root/chunk-58xqqga9.js";import{kJ}from"/$bunfs/root/chunk-pkhq0dax.js";import"/$bunfs/root/chunk-mqyq7vxy.js";import"/$bunfs/root/chunk-c113sjy3.js";var m={name:"MCP Task",type:"mcp_task",async kill(i,r,p,d,s){let e=r.get(i),n=e?.type==="mcp_task"?e.sidecarSessionId:void 0,o=e?.type==="mcp_task"?e.sidecarProjectDir:void 0,c=e?.type==="mcp_task"?e.sidecarWrite:void 0;if(e?.type==="mcp_task")e.abortController?.abort(),e.driveAbortController?.abort(),e.sep2663Cancel?.();r.update(i,(a)=>{if(a.notified||a.status!=="running")return a;return{...a,status:"killed",endTime:Date.now(),parked:void 0,notified:!0}}),(async()=>{await c,await kJ(i,s,n,o)})().catch((a)=>t(`McpTask.kill deleteMcpTaskMetadata: ${String(a)}`))}};export{m as MCP_TASK};
