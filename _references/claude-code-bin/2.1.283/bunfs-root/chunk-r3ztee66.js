// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{f}from"/$bunfs/root/chunk-bnk68ax9.js";import{eo}from"/$bunfs/root/chunk-csayct82.js";import{o,ae,A,u,R}from"/$bunfs/root/chunk-dk5kbfrn.js";var wJr="Resumed agent. Its final report is not in this message.",vJr="Resumed agent. Its final report follows this JSON, framed by the harness.";function onr({displayName:e,content:n}){return`Resumed agent ${e}. Result:

${eo(n,`
`)||"(no text output)"}`}var snr=f(()=>u({message:o().optional(),display:o().optional(),inlineHandback:u({displayName:o(),content:A(u({type:R("text"),text:o()}))}).optional().catch(void 0),routing:ae().optional(),request_id:ae().optional(),target:ae().optional()}));function inr(e){if(e.routing)return;if(e.request_id!==void 0&&e.target!==void 0)return;return e.display??(e.inlineHandback?onr(e.inlineHandback):e.message)}function EJr(e){let n=snr().safeParse(e);return n.success?inr(n.data)??"":""}
export{wJr,vJr,onr,snr,inr,EJr};
