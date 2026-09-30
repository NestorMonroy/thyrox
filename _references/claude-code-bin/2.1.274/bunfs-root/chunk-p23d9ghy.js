// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Qsr}from"/$bunfs/root/chunk-ja309z9r.js";import{vi}from"/$bunfs/root/chunk-kg4vy5ca.js";function NPn(e){if(e)vi.terminalFocusGainedAt=Date.now();if(!e&&vi.terminalFocus==="blurred")return;vi.terminalFocus=e?"focused":"blurred",Qsr(e),vi.terminalFocusChanged.emit()}function Dce(){return vi.terminalFocus!=="blurred"}function bD(){return vi.terminalFocus}function Hhr(){return vi.terminalFocusGainedAt}function y6(e){return vi.terminalFocusChanged.subscribe(e)}
export{NPn,Dce,bD,Hhr,y6};
