// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{jN}from"/$bunfs/root/chunk-bxhyh54r.js";import{x,$F}from"/$bunfs/root/chunk-f74xvn8g.js";import{a}from"/$bunfs/root/chunk-5054mktj.js";import{yp,gBt}from"/$bunfs/root/chunk-5zcypx67.js";import{TTe,Kxr}from"/$bunfs/root/chunk-e6rxwyg3.js";var t=300000;function I8t(){return a.CLAUDE_CODE_BRIEF||$F("tengu_kairos_brief",!1,t)}function d8o(e){if(!e.includes(yp)&&!e.includes(gBt))return!1;if(TTe())return!1;return I8t()}function GU(){return jN()&&I8t()||Kxr()}var r=`In brief mode, plain assistant text is hidden from the user \u2014 only ${yp} reaches them. Call it now with your substantive reply for this turn. Do not mention this reminder; the message should read as if you wrote it unprompted, addressing only what the user actually asked. If you genuinely have nothing useful to tell the user, you may end the turn without calling it.`;function u8o(){let e=x("tengu_kairos_brief_stop_hook_text","");return typeof e==="string"&&e.length>0?e:r}
export{I8t,d8o,GU,u8o};
