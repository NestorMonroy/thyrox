// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Ec}from"/$bunfs/root/chunk-qwxqekf7.js";var _ot="usage limit",lPt=` (after ${_ot})`;function hLn(e,t=!1){let r=Ec(e,t);if(r===void 0)return;return/^\d/.test(r)?`resets at ${r}`:`resets ${r}`}function n(e){let t=hLn(e);return t===void 0?_ot:`${_ot} ${t}`}function Wvr(e){return`Paused \xB7 ${n(e)}`}function Gvr(e){return[["paused",n(e)],["paused",_ot],["paused"]]}
export{_ot,lPt,hLn,Wvr,Gvr};
