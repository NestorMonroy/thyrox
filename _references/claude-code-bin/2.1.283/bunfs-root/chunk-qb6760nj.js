// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{jo}from"/$bunfs/root/chunk-nvht7ckf.js";import{tp}from"/$bunfs/root/chunk-spmtf5nr.js";import{ui}from"/$bunfs/root/chunk-gfkhec5a.js";import{randomBytes as n}from"crypto";var i=new Set(["local_agent","remote_agent","in_process_teammate","local_workflow"]);function c$(t){return Object.values(t).some(dFn)}function dFn(t){return i.has(t.type)&&!ui(t.status)&&!(t.type==="in_process_teammate"&&t.isIdle)&&!(t.type==="remote_agent"&&t.isLongRunning)}function qEr(t){return Object.values(t).some(uFn)}function uFn(t){return t.type==="local_bash"&&!ui(t.status)}var l={local_bash:"b",local_agent:"a",remote_agent:"r",in_process_teammate:"t",local_workflow:"w",monitor_mcp:"m",monitor_ws:"s",mcp_task:"k",dream:"d",auto_mode_scan:"e"},r="0123456789abcdefghijklmnopqrstuvwxyz";function yS(t){let s=l[t]??"x",a=n(8),e=s;for(let o=0;o<8;o++)e+=r[a[o]%r.length];return e}function Em(t,s,a,e){return{id:t,type:s,status:"pending",description:a,toolUseId:e,startTime:Date.now(),...!jo()&&{outputFile:tp(t)},outputOffset:0,notified:!1}}
export{c$,dFn,qEr,uFn,yS,Em};
