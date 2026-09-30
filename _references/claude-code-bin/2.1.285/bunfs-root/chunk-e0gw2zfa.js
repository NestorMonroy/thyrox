// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Sn}from"/$bunfs/root/chunk-bxhyh54r.js";import{lp}from"/$bunfs/root/chunk-2gz9d26e.js";function ni(e){return e==="completed"||e==="failed"||e==="killed"}import{randomBytes as n}from"crypto";var i=new Set(["local_agent","remote_agent","in_process_teammate","local_workflow"]);function Q$(e){return Object.values(e).some(qWn)}function qWn(e){return i.has(e.type)&&!ni(e.status)&&!(e.type==="in_process_teammate"&&e.isIdle)&&!(e.type==="remote_agent"&&e.isLongRunning)}function XIr(e){return Object.values(e).some(KWn)}function KWn(e){return e.type==="local_bash"&&!ni(e.status)}var l={local_bash:"b",local_agent:"a",remote_agent:"r",in_process_teammate:"t",local_workflow:"w",monitor_mcp:"m",monitor_ws:"s",mcp_task:"k",dream:"d",auto_mode_scan:"e"},r="0123456789abcdefghijklmnopqrstuvwxyz";function jS(e){let s=l[e]??"x",a=n(8),t=s;for(let o=0;o<8;o++)t+=r[a[o]%r.length];return t}function Ef(e,s,a,t){return{id:e,type:s,status:"pending",description:a,toolUseId:t,startTime:Date.now(),...!Sn()&&{outputFile:lp(e)},outputOffset:0,notified:!1}}
export{ni,Q$,qWn,XIr,KWn,jS,Ef};
