// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Ln}from"/$bunfs/root/chunk-d37h8mav.js";import{pp}from"/$bunfs/root/chunk-pjvmazn4.js";import{mi}from"/$bunfs/root/chunk-ny5wsng0.js";import{randomBytes as n}from"crypto";var i=new Set(["local_agent","remote_agent","in_process_teammate","local_workflow"]);function $$(t){return Object.values(t).some(T1n)}function T1n(t){return i.has(t.type)&&!mi(t.status)&&!(t.type==="in_process_teammate"&&t.isIdle)&&!(t.type==="remote_agent"&&t.isLongRunning)}function bCr(t){return Object.values(t).some(A1n)}function A1n(t){return t.type==="local_bash"&&!mi(t.status)}var l={local_bash:"b",local_agent:"a",remote_agent:"r",in_process_teammate:"t",local_workflow:"w",monitor_mcp:"m",monitor_ws:"s",mcp_task:"k",dream:"d",auto_mode_scan:"e"},r="0123456789abcdefghijklmnopqrstuvwxyz";function PS(t){let s=l[t]??"x",a=n(8),e=s;for(let o=0;o<8;o++)e+=r[a[o]%r.length];return e}function Pm(t,s,a,e){return{id:t,type:s,status:"pending",description:a,toolUseId:e,startTime:Date.now(),...!Ln()&&{outputFile:pp(t)},outputOffset:0,notified:!1}}
export{$$,T1n,bCr,A1n,PS,Pm};
