// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{m}from"/$bunfs/root/chunk-55w4bsdv.js";import{Pr}from"/$bunfs/root/chunk-qpwbvc04.js";import{i,de,T,c,I}from"/$bunfs/root/chunk-84vc68b7.js";var QGn="Resumed agent. Its final report is not in this message.",ZGn="Resumed agent. Its final report follows this JSON, framed by the harness.";function tsn({displayName:e,content:n}){return`Resumed agent ${e}. Result:

${Pr(n,`
`)||"(no text output)"}`}var nsn=m(()=>c({message:i().optional(),display:i().optional(),inlineHandback:c({displayName:i(),content:T(c({type:I("text"),text:i()}))}).optional().catch(void 0),routing:de().optional(),request_id:de().optional(),target:de().optional()}));function rsn(e){if(e.routing)return;if(e.request_id!==void 0&&e.target!==void 0)return;return e.display??(e.inlineHandback?tsn(e.inlineHandback):e.message)}function eWn(e){let n=nsn().safeParse(e);return n.success?rsn(n.data)??"":""}
export{QGn,ZGn,tsn,nsn,rsn,eWn};
