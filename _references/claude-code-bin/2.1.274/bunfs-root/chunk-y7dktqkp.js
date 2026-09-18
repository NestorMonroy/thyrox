// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{x0}from"/$bunfs/root/chunk-ja309z9r.js";import{I,yM}from"/$bunfs/root/chunk-27bj2wbx.js";import{a}from"/$bunfs/root/chunk-j96jysac.js";import{T_,K_t}from"/$bunfs/root/chunk-8jxxned0.js";import{Zfe,G3n}from"/$bunfs/root/chunk-a7vzy2cn.js";var t=300000;function YOt(){return a.CLAUDE_CODE_BRIEF||yM("tengu_kairos_brief",!1,t)}function Q7r(e){if(!e.includes(T_)&&!e.includes(K_t))return!1;if(Zfe())return!1;return YOt()}function F0e(){return x0()&&YOt()||G3n()}var r=`In brief mode, plain assistant text is hidden from the user \u2014 only ${T_} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;function Z7r(){let e=I("tengu_kairos_brief_stop_hook_text","");return typeof e==="string"&&e.length>0?e:r}
export{YOt,Q7r,F0e,Z7r};
