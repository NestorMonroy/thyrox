// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{f}from"/$bunfs/root/chunk-w8gsn0hm.js";import{Hr}from"/$bunfs/root/chunk-ayyj05ne.js";import{o,ae,C,u,R}from"/$bunfs/root/chunk-13s0tpz6.js";var _gr="Resumed agent. Its final report is not in this message.",bgr="Resumed agent. Its final report follows this JSON, framed by the harness.";function dIn({displayName:e,content:n}){return`Resumed agent ${e}. Result:

${Hr(n,`
`)||"(no text output)"}`}var pIn=f(()=>u({message:o().optional(),display:o().optional(),inlineHandback:u({displayName:o(),content:C(u({type:R("text"),text:o()}))}).optional().catch(void 0),routing:ae().optional(),request_id:ae().optional(),target:ae().optional()}));function fIn(e){if(e.routing)return;if(e.request_id!==void 0&&e.target!==void 0)return;return e.display??(e.inlineHandback?dIn(e.inlineHandback):e.message)}function Sgr(e){let n=pIn().safeParse(e);return n.success?fIn(n.data)??"":""}
export{_gr,bgr,dIn,pIn,fIn,Sgr};
