// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{vR}from"/$bunfs/root/chunk-annedm50.js";import{I,tx}from"/$bunfs/root/chunk-hyqdn9c0.js";import{a}from"/$bunfs/root/chunk-a207t0vs.js";import{Qh,net}from"/$bunfs/root/chunk-31tjt5p8.js";import{Gfe,Sbn}from"/$bunfs/root/chunk-22072mav.js";var t=300000;function ySt(){return a.CLAUDE_CODE_BRIEF||tx("tengu_kairos_brief",!1,t)}function pyr(e){if(!e.includes(Qh)&&!e.includes(net))return!1;if(Gfe())return!1;return ySt()}function UAe(){return vR()&&ySt()||Sbn()}var r=`In brief mode, plain assistant text is hidden from the user \u2014 only ${Qh} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;function myr(){let e=I("tengu_kairos_brief_stop_hook_text","");return typeof e==="string"&&e.length>0?e:r}
export{ySt,pyr,UAe,myr};
