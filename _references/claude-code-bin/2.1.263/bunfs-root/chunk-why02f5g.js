// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{$f,ty}from"/$bunfs/root/chunk-ah1kb8zv.js";import{JF}from"/$bunfs/root/chunk-9wa0ka8p.js";import{z}from"/$bunfs/root/chunk-k7tq93j1.js";function iee(r){let n=r[0];if(!n)return null;let e=r.length;if(r.every((t)=>t.type===n.type))switch(n.type){case"local_bash":{let t=z(r,(s)=>s.type==="local_bash"&&s.kind==="monitor"),o=e-t,a=[];if(o>0)a.push(o===1?"1 shell":`${o} shells`);if(t>0)a.push(t===1?"1 monitor":`${t} monitors`);return a.join(", ")}case"in_process_teammate":{let t=new Set(r.map((o)=>o.type==="in_process_teammate"?o.identity.teamName:"")).size;return t===1?"1 team":`${t} teams`}case"local_agent":return e===1?"1 local agent":`${e} local agents`;case"remote_agent":{if(e===1&&n.isUltraplan)switch(n.ultraplanPhase){case"plan_ready":return`${ty} ultraplan ready`;case"needs_input":return`${$f} ultraplan needs your input`;default:return`${$f} ultraplan`}if(r.every((t)=>t.type==="remote_agent"&&t.remoteTaskType==="remote-workflow"))return e===1?`${$f} 1 remote dynamic workflow`:`${$f} ${e} remote dynamic workflows`;return e===1?`${$f} 1 cloud session`:`${$f} ${e} cloud sessions`}case"local_workflow":return e===1?"1 background dynamic workflow":`${e} background dynamic workflows`;case"monitor_mcp":case"monitor_ws":{if(r.every(JF))return e===1?"1 Artifact comment monitor":`${e} Artifact comment monitors`;return e===1?"1 monitor":`${e} monitors`}case"mcp_task":return e===1?"1 MCP task":`${e} MCP tasks`;case"dream":return"dreaming";case"auto_mode_scan":return"auto-mode scan"}return`${e} background ${e===1?"task":"tasks"}`}function Ltn(r){if(r.length!==1)return!1;let n=r[0];return n.type==="remote_agent"&&n.isUltraplan===!0&&n.ultraplanPhase!==void 0}
export{iee,Ltn};
