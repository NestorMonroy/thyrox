// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{DN}from"/$bunfs/root/chunk-d37h8mav.js";import{x,OF}from"/$bunfs/root/chunk-swk3rjnt.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{wp,BBt}from"/$bunfs/root/chunk-qwx8d9cf.js";import{SAe,xHr}from"/$bunfs/root/chunk-t2qzymvt.js";var t=300000;function k9t(){return a.CLAUDE_CODE_BRIEF||OF("tengu_kairos_brief",!1,t)}function o8o(e){if(!e.includes(wp)&&!e.includes(BBt))return!1;if(SAe())return!1;return k9t()}function qU(){return DN()&&k9t()||xHr()}var r=`In brief mode, plain assistant text is hidden from the user \u2014 only ${wp} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;function s8o(){let e=x("tengu_kairos_brief_stop_hook_text","");return typeof e==="string"&&e.length>0?e:r}
export{k9t,o8o,qU,s8o};
