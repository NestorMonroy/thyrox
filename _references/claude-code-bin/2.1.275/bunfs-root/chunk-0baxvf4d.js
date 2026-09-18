// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{p}from"/$bunfs/root/chunk-dtjhjxgx.js";import{Dr}from"/$bunfs/root/chunk-q2gh92k2.js";import{o,ae,C,u,R}from"/$bunfs/root/chunk-nfxfp8ap.js";var uSr="Resumed agent. Its final report is not in this message.",dSr="Resumed agent. Its final report follows this JSON, framed by the harness.";function vOn({displayName:e,content:n}){return`Resumed agent ${e}. Result:

${Dr(n,`
`)||"(no text output)"}`}var EOn=p(()=>u({message:o().optional(),display:o().optional(),inlineHandback:u({displayName:o(),content:C(u({type:R("text"),text:o()}))}).optional().catch(void 0),routing:ae().optional(),request_id:ae().optional(),target:ae().optional()}));function kOn(e){if(e.routing)return;if(e.request_id!==void 0&&e.target!==void 0)return;return e.display??(e.inlineHandback?vOn(e.inlineHandback):e.message)}function pSr(e){let n=EOn().safeParse(e);return n.success?kOn(n.data)??"":""}
export{uSr,dSr,vOn,EOn,kOn,pSr};
