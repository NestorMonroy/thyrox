// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{vR}from"/$bunfs/root/chunk-k6vqz9fa.js";import{I,nx}from"/$bunfs/root/chunk-32f2qmtc.js";import{a}from"/$bunfs/root/chunk-bxegdt3f.js";import{Zh,net}from"/$bunfs/root/chunk-8as7yv62.js";import{zfe,Hbn}from"/$bunfs/root/chunk-qda7rvee.js";var t=300000;function _St(){return a.CLAUDE_CODE_BRIEF||nx("tengu_kairos_brief",!1,t)}function hyr(e){if(!e.includes(Zh)&&!e.includes(net))return!1;if(zfe())return!1;return _St()}function jAe(){return vR()&&_St()||Hbn()}var r=`In brief mode, plain assistant text is hidden from the user \u2014 only ${Zh} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;function yyr(){let e=I("tengu_kairos_brief_stop_hook_text","");return typeof e==="string"&&e.length>0?e:r}
export{_St,hyr,jAe,yyr};
