// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{lI}from"/$bunfs/root/chunk-t8q7n4ta.js";import{I,BP}from"/$bunfs/root/chunk-btbsn9s4.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";import{yy,Pnt}from"/$bunfs/root/chunk-f4p6rc3t.js";import{Pme,yEn}from"/$bunfs/root/chunk-x4nq9cbt.js";var t=300000;function qvt(){return a.CLAUDE_CODE_BRIEF||BP("tengu_kairos_brief",!1,t)}function nEr(e){if(!e.includes(yy)&&!e.includes(Pnt))return!1;if(Pme())return!1;return qvt()}function kTe(){return lI()&&qvt()||yEn()}var r=`In brief mode, plain assistant text is hidden from the user \u2014 only ${yy} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;function rEr(){let e=I("tengu_kairos_brief_stop_hook_text","");return typeof e==="string"&&e.length>0?e:r}
export{qvt,nEr,kTe,rEr};
