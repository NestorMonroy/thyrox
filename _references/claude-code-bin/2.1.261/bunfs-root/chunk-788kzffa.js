// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{m}from"/$bunfs/root/chunk-84mvm17e.js";import{Rr}from"/$bunfs/root/chunk-vd630rs0.js";import{s,se,k,c,C}from"/$bunfs/root/chunk-hc3tpgm9.js";var a2n="Resumed agent. Its final report is not in this message.",l2n="Resumed agent. Its final report follows this JSON, framed by the harness.";function $on({displayName:e,content:n}){return`Resumed agent ${e}. Result:

${Rr(n,`
`)||"(no text output)"}`}var Mon=m(()=>c({message:s().optional(),display:s().optional(),inlineHandback:c({displayName:s(),content:k(c({type:C("text"),text:s()}))}).optional().catch(void 0),routing:se().optional(),request_id:se().optional(),target:se().optional()}));function Oon(e){if(e.routing)return;if(e.request_id!==void 0&&e.target!==void 0)return;return e.display??(e.inlineHandback?$on(e.inlineHandback):e.message)}function c2n(e){let n=Mon().safeParse(e);return n.success?Oon(n.data)??"":""}
export{a2n,l2n,$on,Mon,Oon,c2n};
