// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{p}from"/$bunfs/root/chunk-z10rc4tf.js";import{io}from"/$bunfs/root/chunk-qazw855w.js";import{o,le,C,d,R}from"/$bunfs/root/chunk-ea52y7e7.js";var xto="Resumed agent. Its final report is not in this message.",Ito="Resumed agent. Its final report follows this JSON, framed by the harness.";function Isr({displayName:e,content:n}){return`Resumed agent ${e}. Result:

${io(n,`
`)||"(no text output)"}`}var Psr=p(()=>d({message:o().optional(),display:o().optional(),inlineHandback:d({displayName:o(),content:C(d({type:R("text"),text:o()}))}).optional().catch(void 0),routing:le().optional(),request_id:le().optional(),target:le().optional()}));function Osr(e){if(e.routing)return;if(e.request_id!==void 0&&e.target!==void 0)return;return e.display??(e.inlineHandback?Isr(e.inlineHandback):e.message)}function Pto(e){let n=Psr().safeParse(e);return n.success?Osr(n.data)??"":""}
export{xto,Ito,Isr,Psr,Osr,Pto};
