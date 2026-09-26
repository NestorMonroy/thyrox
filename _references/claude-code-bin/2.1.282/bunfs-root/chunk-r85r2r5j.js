// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Zc}from"/$bunfs/root/chunk-x80cfbm0.js";var yyt="usage limit",DGt=` (after ${yyt})`;function CQn(e,t=!1){let r=Zc(e,t);if(r===void 0)return;return/^\d/.test(r)?`resets at ${r}`:`resets ${r}`}function n(e){let t=CQn(e);return t===void 0?yyt:`${yyt} ${t}`}function n3r(e){return`Paused \xB7 ${n(e)}`}function RQn(e){return[["paused",n(e)],["paused",yyt],["paused"]]}
export{yyt,DGt,CQn,n3r,RQn};
