// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{ah,ow}from"/$bunfs/root/chunk-b93xrf5w.js";import{D3}from"/$bunfs/root/chunk-7yy6st81.js";import{B}from"/$bunfs/root/chunk-z1tzjygm.js";function uye(r){let o=r[0];if(!o)return null;let t=r.length;if(r.every((e)=>e.type===o.type))switch(o.type){case"local_bash":{let e=B(r,(s)=>s.type==="local_bash"&&s.kind==="monitor"),a=t-e,n=[];if(a>0)n.push(a===1?"1 shell":`${a} shells`);if(e>0)n.push(e===1?"1 monitor":`${e} monitors`);return n.join(", ")}case"in_process_teammate":{let e=new Set(r.map((a)=>a.type==="in_process_teammate"?a.identity.teamName:"")).size;return e===1?"1 team":`${e} teams`}case"local_agent":return t===1?"1 local agent":`${t} local agents`;case"remote_agent":{if(t===1&&o.isUltraplan)switch(o.ultraplanPhase){case"plan_ready":return`${ow} ultraplan ready`;case"needs_input":return`${ah} ultraplan needs your input`;default:return`${ah} ultraplan`}if(r.every((e)=>e.type==="remote_agent"&&e.remoteTaskType==="remote-workflow"))return t===1?`${ah} 1 remote dynamic workflow`:`${ah} ${t} remote dynamic workflows`;return t===1?`${ah} 1 cloud session`:`${ah} ${t} cloud sessions`}case"local_workflow":return t===1?"1 background dynamic workflow":`${t} background dynamic workflows`;case"monitor_mcp":case"monitor_ws":{if(r.every(D3))return t===1?"1 Artifact comment monitor":`${t} Artifact comment monitors`;return t===1?"1 monitor":`${t} monitors`}case"mcp_task":return t===1?"1 MCP task":`${t} MCP tasks`;case"dream":return"dreaming";case"auto_mode_scan":return"auto-mode scan";default:}return`${t} background ${t===1?"task":"tasks"}`}function f9n(r){if(r.length!==1)return!1;let o=r[0];return o.type==="remote_agent"&&o.isUltraplan===!0&&o.ultraplanPhase!==void 0}
export{uye,f9n};
