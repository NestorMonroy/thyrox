// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{z4r}from"/$bunfs/root/chunk-bxhyh54r.js";import{la}from"/$bunfs/root/chunk-fcgb6f1a.js";function hsr(e){if(e)la.terminalFocusGainedAt=Date.now();if(!e&&la.terminalFocus==="blurred")return;la.terminalFocus=e?"focused":"blurred",z4r(e),la.terminalFocusChanged.emit()}function awe(){return la.terminalFocus!=="blurred"}function U4(){return la.terminalFocus}function Sto(){return la.terminalFocusGainedAt}function Upe(e){return la.terminalFocusChanged.subscribe(e)}
export{hsr,awe,U4,Sto,Upe};
