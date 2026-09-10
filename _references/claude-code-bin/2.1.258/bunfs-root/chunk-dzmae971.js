// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{m}from"/$bunfs/root/chunk-ffgkv432.js";import{Lr}from"/$bunfs/root/chunk-vw215j9f.js";import{i,de,T,c,I}from"/$bunfs/root/chunk-3qwvcykp.js";var WUn="Resumed agent. Its final report is not in this message.",zUn="Resumed agent. Its final report follows this JSON, framed by the harness.";function xrn({displayName:e,content:n}){return`Resumed agent ${e}. Result:

${Lr(n,`
`)||"(no text output)"}`}var Lrn=m(()=>c({message:i().optional(),display:i().optional(),inlineHandback:c({displayName:i(),content:T(c({type:I("text"),text:i()}))}).optional().catch(void 0),routing:de().optional(),request_id:de().optional(),target:de().optional()}));function Prn(e){if(e.routing)return;if(e.request_id!==void 0&&e.target!==void 0)return;return e.display??(e.inlineHandback?xrn(e.inlineHandback):e.message)}function VUn(e){let n=Lrn().safeParse(e);return n.success?Prn(n.data)??"":""}
export{WUn,zUn,xrn,Lrn,Prn,VUn};
