// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{PD}from"/$bunfs/root/chunk-cqc88nqm.js";import{x,CN}from"/$bunfs/root/chunk-5khn4tvf.js";import{a}from"/$bunfs/root/chunk-ay603yys.js";import{Qy,c0t}from"/$bunfs/root/chunk-9c4ja01c.js";import{Hwe,Byr}from"/$bunfs/root/chunk-6rmzss7k.js";var t=300000;function Jqt(){return a.CLAUDE_CODE_BRIEF||CN("tengu_kairos_brief",!1,t)}function fLo(e){if(!e.includes(Qy)&&!e.includes(c0t))return!1;if(Hwe())return!1;return Jqt()}function R1e(){return PD()&&Jqt()||Byr()}var r=`In brief mode, plain assistant text is hidden from the user \u2014 only ${Qy} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;function mLo(){let e=x("tengu_kairos_brief_stop_hook_text","");return typeof e==="string"&&e.length>0?e:r}
export{Jqt,fLo,R1e,mLo};
