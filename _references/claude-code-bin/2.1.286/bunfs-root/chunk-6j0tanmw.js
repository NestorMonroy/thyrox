// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Sn}from"/$bunfs/root/chunk-hbjpbz2q.js";import{hp}from"/$bunfs/root/chunk-mj86404k.js";function ui(e){return e==="completed"||e==="failed"||e==="killed"}import{randomBytes as n}from"crypto";var i=new Set(["local_agent","remote_agent","in_process_teammate","local_workflow"]);function PF(e){return Object.values(e).some(Yqn)}function Yqn(e){return i.has(e.type)&&!ui(e.status)&&!(e.type==="in_process_teammate"&&e.isIdle)&&!(e.type==="remote_agent"&&e.isLongRunning)}function ULr(e){return Object.values(e).some(Xqn)}function Xqn(e){return e.type==="local_bash"&&!ui(e.status)}var l={local_bash:"b",local_agent:"a",remote_agent:"r",in_process_teammate:"t",local_workflow:"w",monitor_mcp:"m",monitor_ws:"s",mcp_task:"k",dream:"d",auto_mode_scan:"e",local_memory_import:"n"},r="0123456789abcdefghijklmnopqrstuvwxyz";function sw(e){let s=l[e]??"x",a=n(8),t=s;for(let o=0;o<8;o++)t+=r[a[o]%r.length];return t}function Df(e,s,a,t){return{id:e,type:s,status:"pending",description:a,toolUseId:t,startTime:Date.now(),...!Sn()&&{outputFile:hp(e)},outputOffset:0,notified:!1}}
export{ui,PF,Yqn,ULr,Xqn,sw,Df};
