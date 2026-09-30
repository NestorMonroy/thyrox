// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{m}from"/$bunfs/root/chunk-7tpgnqqk.js";import{xr}from"/$bunfs/root/chunk-yw4jc948.js";import{s,se,T,c,C}from"/$bunfs/root/chunk-44xw78rx.js";var Zqn="Resumed agent. Its final report is not in this message.",eVn="Resumed agent. Its final report follows this JSON, framed by the harness.";function yln({displayName:e,content:n}){return`Resumed agent ${e}. Result:

${xr(n,`
`)||"(no text output)"}`}var _ln=m(()=>c({message:s().optional(),display:s().optional(),inlineHandback:c({displayName:s(),content:T(c({type:C("text"),text:s()}))}).optional().catch(void 0),routing:se().optional(),request_id:se().optional(),target:se().optional()}));function bln(e){if(e.routing)return;if(e.request_id!==void 0&&e.target!==void 0)return;return e.display??(e.inlineHandback?yln(e.inlineHandback):e.message)}function tVn(e){let n=_ln().safeParse(e);return n.success?bln(n.data)??"":""}
export{Zqn,eVn,yln,_ln,bln,tVn};
