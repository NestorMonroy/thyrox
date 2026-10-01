// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{h$}from"/$bunfs/root/chunk-hbjpbz2q.js";import{R,pU}from"/$bunfs/root/chunk-4hjp8tw4.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{kp,Ajt}from"/$bunfs/root/chunk-y6zh5p1t.js";import{vye,LDr}from"/$bunfs/root/chunk-b3sqb3dd.js";var t=300000;function JXt(){return a.CLAUDE_CODE_BRIEF||pU("tengu_kairos_brief",!1,t)}function V7o(e){if(!e.includes(kp)&&!e.includes(Ajt))return!1;if(vye())return!1;return JXt()}function AB(){return h$()&&JXt()||LDr()}var r=`In brief mode, plain assistant text is hidden from the user \u2014 only ${kp} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;function q7o(){let e=R("tengu_kairos_brief_stop_hook_text","");return typeof e==="string"&&e.length>0?e:r}
export{JXt,V7o,AB,q7o};
