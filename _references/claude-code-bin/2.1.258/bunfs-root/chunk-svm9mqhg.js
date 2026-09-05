// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{UI}from"/$bunfs/root/chunk-b1z7jvb2.js";import{L,ux}from"/$bunfs/root/chunk-8qt7d28b.js";import{a}from"/$bunfs/root/chunk-sr28hb79.js";import{ly,TQe}from"/$bunfs/root/chunk-g9d7r5bw.js";import{Xfe,J_n}from"/$bunfs/root/chunk-7yfvmzre.js";var t=300000;function Dbt(){return a.CLAUDE_CODE_BRIEF||ux("tengu_kairos_brief",!1,t)}function mIr(e){if(!e.includes(ly)&&!e.includes(TQe))return!1;if(Xfe())return!1;return Dbt()}function vAe(){return UI()&&Dbt()||J_n()}var r=`In brief mode, plain assistant text is hidden from the user \u2014 only ${ly} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;function gIr(){let e=L("tengu_kairos_brief_stop_hook_text","");return typeof e==="string"&&e.length>0?e:r}
export{Dbt,mIr,vAe,gIr};
