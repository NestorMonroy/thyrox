// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{kOc as o,lOc as l}from"/$bunfs/root/_713.js";import{wxd as f,xxd as u}from"/$bunfs/root/_837.js";var g={};f(g,{sanitizeServerClaudeCodeArgs:()=>c,serverToolsValueNamesSelfHostedRunnerTool:()=>i,stripSelfHostedRunnerToolNames:()=>s,toolsSpecNamesSelfHostedRunnerTool:()=>S});function r(n){return n.startsWith(p)}function S(n){return o([...n]).some(r)}function s(n){return o([n]).filter((t)=>!r(t)).join(",")}function i(n){if(n===void 0)return!1;let t=typeof n==="string"?n:String(n);return o([t]).some(r)}function c(n){let t=n.tools;if(t===void 0)return n;let e=typeof t==="string"?t:String(t);if(!i(e))return typeof t==="string"?n:{...n,tools:e};return{...n,tools:s(e)}}var p="self_hosted_runner_";var m=u(()=>{l()});
export{i as _a,c as $a,g as ab,m as bb};
