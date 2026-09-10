// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Uod as r,atd as g}from"/$bunfs/root/_826.js";import{xxd as l}from"/$bunfs/root/_837.js";function u(e){return e!==void 0&&t.includes(e)}function _(e){return e.userOverride??e.agentDefinitionColor}function N(e){if(e==="general-purpose")return;let n=r().get(e);if(n&&t.includes(n))return i[n];return}function d(e,o){let n=r();if(!o){n.delete(e);return}if(t.includes(o))n.set(e,o)}var i,t;var a=l(()=>{g();i={red:"red_FOR_SUBAGENTS_ONLY",blue:"blue_FOR_SUBAGENTS_ONLY",green:"green_FOR_SUBAGENTS_ONLY",yellow:"yellow_FOR_SUBAGENTS_ONLY",purple:"purple_FOR_SUBAGENTS_ONLY",orange:"orange_FOR_SUBAGENTS_ONLY",pink:"pink_FOR_SUBAGENTS_ONLY",cyan:"cyan_FOR_SUBAGENTS_ONLY"},t=Object.keys(i)});
export{i as k6a,t as l6a,u as m6a,_ as n6a,N as o6a,d as p6a,a as q6a};
