// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{p}from"/$bunfs/root/chunk-159k5j1y.js";import{oo}from"/$bunfs/root/chunk-kt4703ww.js";import{o,ie,A,u,x}from"/$bunfs/root/chunk-cgbfr9c2.js";var Oso="Resumed agent. Its final report is not in this message.",Mso="Resumed agent. Its final report follows this JSON, framed by the harness.";function Hlr({displayName:e,content:n}){return`Resumed agent ${e}. Result:

${oo(n,`
`)||"(no text output)"}`}var Dlr=p(()=>u({message:o().optional(),display:o().optional(),inlineHandback:u({displayName:o(),content:A(u({type:x("text"),text:o()}))}).optional().catch(void 0),routing:ie().optional(),request_id:ie().optional(),target:ie().optional()}));function Llr(e){if(e.routing)return;if(e.request_id!==void 0&&e.target!==void 0)return;return e.display??(e.inlineHandback?Hlr(e.inlineHandback):e.message)}function Hso(e){let n=Dlr().safeParse(e);return n.success?Llr(n.data)??"":""}
export{Oso,Mso,Hlr,Dlr,Llr,Hso};
