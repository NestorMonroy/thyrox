// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{JI}from"/$bunfs/root/chunk-x1rrg5j2.js";import{L,vx}from"/$bunfs/root/chunk-x722nt0q.js";import{a}from"/$bunfs/root/chunk-m92n5xra.js";import{py,ret}from"/$bunfs/root/chunk-trntcdrz.js";import{Qpe,own}from"/$bunfs/root/chunk-b3pk8jsy.js";var t=300000;function NHt(){return a.CLAUDE_CODE_BRIEF||vx("tengu_kairos_brief",!1,t)}function iPr(e){if(!e.includes(py)&&!e.includes(ret))return!1;if(Qpe())return!1;return NHt()}function qve(){return JI()&&NHt()||own()}var r=`In brief mode, plain assistant text is hidden from the user \u2014 only ${py} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;function sPr(){let e=L("tengu_kairos_brief_stop_hook_text","");return typeof e==="string"&&e.length>0?e:r}
export{NHt,iPr,qve,sPr};
