// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{u4r}from"/$bunfs/root/chunk-d37h8mav.js";import{Zi}from"/$bunfs/root/chunk-sb5ssmwc.js";function isr(e){if(e)Zi.terminalFocusGainedAt=Date.now();if(!e&&Zi.terminalFocus==="blurred")return;Zi.terminalFocus=e?"focused":"blurred",u4r(e),Zi.terminalFocusChanged.emit()}function iwe(){return Zi.terminalFocus!=="blurred"}function E4(){return Zi.terminalFocus}function aeo(){return Zi.terminalFocusGainedAt}function Lpe(e){return Zi.terminalFocusChanged.subscribe(e)}
export{isr,iwe,E4,aeo,Lpe};
