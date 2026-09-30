// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Zzr}from"/$bunfs/root/chunk-nvht7ckf.js";import{Ji}from"/$bunfs/root/chunk-ad283xw4.js";function Gtr(e){if(e)Ji.terminalFocusGainedAt=Date.now();if(!e&&Ji.terminalFocus==="blurred")return;Ji.terminalFocus=e?"focused":"blurred",Zzr(e),Ji.terminalFocusChanged.emit()}function Zbe(){return Ji.terminalFocus!=="blurred"}function pU(){return Ji.terminalFocus}function mJr(){return Ji.terminalFocusGainedAt}function j7(e){return Ji.terminalFocusChanged.subscribe(e)}
export{Gtr,Zbe,pU,mJr,j7};
