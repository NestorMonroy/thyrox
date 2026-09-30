// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{ru}from"/$bunfs/root/chunk-rx56hxr8.js";var Ivt="usage limit",h3t=` (after ${Ivt})`;function Vlr(e,t=!1){let r=ru(e,t);if(r===void 0)return;return/^\d/.test(r)?`resets at ${r}`:`resets ${r}`}function n(e){let t=Vlr(e);return t===void 0?Ivt:`${Ivt} ${t}`}function sro(e){return`Paused \xB7 ${n(e)}`}function qlr(e){return[["paused",n(e)],["paused",Ivt],["paused"]]}
export{Ivt,h3t,Vlr,sro,qlr};
