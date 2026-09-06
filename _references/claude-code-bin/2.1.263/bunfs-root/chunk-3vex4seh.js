// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{m}from"/$bunfs/root/chunk-78nzsrc6.js";import{Rr}from"/$bunfs/root/chunk-9wa0ka8p.js";import{s,se,k,c,C}from"/$bunfs/root/chunk-9evvptjs.js";var u2n="Resumed agent. Its final report is not in this message.",d2n="Resumed agent. Its final report follows this JSON, framed by the harness.";function Mon({displayName:e,content:n}){return`Resumed agent ${e}. Result:

${Rr(n,`
`)||"(no text output)"}`}var Oon=m(()=>c({message:s().optional(),display:s().optional(),inlineHandback:c({displayName:s(),content:k(c({type:C("text"),text:s()}))}).optional().catch(void 0),routing:se().optional(),request_id:se().optional(),target:se().optional()}));function Non(e){if(e.routing)return;if(e.request_id!==void 0&&e.target!==void 0)return;return e.display??(e.inlineHandback?Mon(e.inlineHandback):e.message)}function f2n(e){let n=Oon().safeParse(e);return n.success?Non(n.data)??"":""}
export{u2n,d2n,Mon,Oon,Non,f2n};
