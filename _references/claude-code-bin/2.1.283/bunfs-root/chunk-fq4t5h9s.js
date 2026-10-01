// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{dN}from"/$bunfs/root/chunk-nvht7ckf.js";import{x,rF}from"/$bunfs/root/chunk-t6pwageh.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{I_,mFt}from"/$bunfs/root/chunk-0yw1fewm.js";import{mTe,_Ir}from"/$bunfs/root/chunk-mmzsebn0.js";var t=300000;function V6t(){return a.CLAUDE_CODE_BRIEF||rF("tengu_kairos_brief",!1,t)}function e4o(e){if(!e.includes(I_)&&!e.includes(mFt))return!1;if(mTe())return!1;return V6t()}function ZGe(){return dN()&&V6t()||_Ir()}var r=`In brief mode, plain assistant text is hidden from the user \u2014 only ${I_} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;function t4o(){let e=x("tengu_kairos_brief_stop_hook_text","");return typeof e==="string"&&e.length>0?e:r}
export{V6t,e4o,ZGe,t4o};
