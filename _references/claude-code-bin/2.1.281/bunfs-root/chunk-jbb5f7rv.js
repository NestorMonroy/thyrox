// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Yc}from"/$bunfs/root/chunk-a22am1vw.js";var Tgt="usage limit",Wjt=` (after ${Tgt})`;function C9n(e,t=!1){let r=Yc(e,t);if(r===void 0)return;return/^\d/.test(r)?`resets at ${r}`:`resets ${r}`}function n(e){let t=C9n(e);return t===void 0?Tgt:`${Tgt} ${t}`}function pVr(e){return`Paused \xB7 ${n(e)}`}function R9n(e){return[["paused",n(e)],["paused",Tgt],["paused"]]}
export{Tgt,Wjt,C9n,pVr,R9n};
