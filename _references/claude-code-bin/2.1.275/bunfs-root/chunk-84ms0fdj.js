// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{eO}from"/$bunfs/root/chunk-4qqe0nh4.js";import{I,jM}from"/$bunfs/root/chunk-xbd48fav.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import{M_,Fwt}from"/$bunfs/root/chunk-w21br88b.js";import{hge,N9n}from"/$bunfs/root/chunk-vhzdng8b.js";var t=300000;function jLt(){return a.CLAUDE_CODE_BRIEF||jM("tengu_kairos_brief",!1,t)}function $oo(e){if(!e.includes(M_)&&!e.includes(Fwt))return!1;if(hge())return!1;return jLt()}function CMe(){return eO()&&jLt()||N9n()}var r=`In brief mode, plain assistant text is hidden from the user \u2014 only ${M_} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;function Foo(){let e=I("tengu_kairos_brief_stop_hook_text","");return typeof e==="string"&&e.length>0?e:r}
export{jLt,$oo,CMe,Foo};
