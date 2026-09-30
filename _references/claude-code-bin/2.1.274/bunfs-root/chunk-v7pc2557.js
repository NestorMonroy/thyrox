// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{mc}from"/$bunfs/root/chunk-hf9yhhhe.js";var vnt="usage limit",MRt=` (after ${vnt})`;function QHn(e,t=!1){let r=mc(e,t);if(r===void 0)return;return/^\d/.test(r)?`resets at ${r}`:`resets ${r}`}function n(e){let t=QHn(e);return t===void 0?vnt:`${vnt} ${t}`}function Myr(e){return`Paused \xB7 ${n(e)}`}function Dyr(e){return[["paused",n(e)],["paused",vnt],["paused"]]}
export{vnt,MRt,QHn,Myr,Dyr};
