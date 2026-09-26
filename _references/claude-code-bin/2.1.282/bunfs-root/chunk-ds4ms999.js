// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{f}from"/$bunfs/root/chunk-f344jh32.js";import{Xr}from"/$bunfs/root/chunk-c9jscxk0.js";import{o,ae,C,d,R}from"/$bunfs/root/chunk-hq4c63ht.js";var dqr="Resumed agent. Its final report is not in this message.",uqr="Resumed agent. Its final report follows this JSON, framed by the harness.";function f8n({displayName:e,content:n}){return`Resumed agent ${e}. Result:

${Xr(n,`
`)||"(no text output)"}`}var m8n=f(()=>d({message:o().optional(),display:o().optional(),inlineHandback:d({displayName:o(),content:C(d({type:R("text"),text:o()}))}).optional().catch(void 0),routing:ae().optional(),request_id:ae().optional(),target:ae().optional()}));function g8n(e){if(e.routing)return;if(e.request_id!==void 0&&e.target!==void 0)return;return e.display??(e.inlineHandback?f8n(e.inlineHandback):e.message)}function pqr(e){let n=m8n().safeParse(e);return n.success?g8n(n.data)??"":""}
export{dqr,uqr,f8n,m8n,g8n,pqr};
