// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{sDr}from"/$bunfs/root/chunk-cqc88nqm.js";import{Li}from"/$bunfs/root/chunk-yk19v0xp.js";function eYn(e){if(e)Li.terminalFocusGainedAt=Date.now();if(!e&&Li.terminalFocus==="blurred")return;Li.terminalFocus=e?"focused":"blurred",sDr(e),Li.terminalFocusChanged.emit()}function Xhe(){return Li.terminalFocus!=="blurred"}function O$(){return Li.terminalFocus}function wGr(){return Li.terminalFocusGainedAt}function _X(e){return Li.terminalFocusChanged.subscribe(e)}
export{eYn,Xhe,O$,wGr,_X};
