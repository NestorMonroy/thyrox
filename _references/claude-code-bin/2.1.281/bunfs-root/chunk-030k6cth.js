// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{f}from"/$bunfs/root/chunk-1y7zyxh8.js";import{Xr}from"/$bunfs/root/chunk-4n4g22z6.js";import{o,ae,C,d,R}from"/$bunfs/root/chunk-r9b963ay.js";var kWr="Resumed agent. Its final report is not in this message.",TWr="Resumed agent. Its final report follows this JSON, framed by the harness.";function y5n({displayName:e,content:n}){return`Resumed agent ${e}. Result:

${Xr(n,`
`)||"(no text output)"}`}var _5n=f(()=>d({message:o().optional(),display:o().optional(),inlineHandback:d({displayName:o(),content:C(d({type:R("text"),text:o()}))}).optional().catch(void 0),routing:ae().optional(),request_id:ae().optional(),target:ae().optional()}));function b5n(e){if(e.routing)return;if(e.request_id!==void 0&&e.target!==void 0)return;return e.display??(e.inlineHandback?y5n(e.inlineHandback):e.message)}function AWr(e){let n=_5n().safeParse(e);return n.success?b5n(n.data)??"":""}
export{kWr,TWr,y5n,_5n,b5n,AWr};
