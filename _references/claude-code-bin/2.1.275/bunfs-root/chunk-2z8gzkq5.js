// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Kur}from"/$bunfs/root/chunk-4qqe0nh4.js";import{vi}from"/$bunfs/root/chunk-5n61ercr.js";function TDn(e){if(e)vi.terminalFocusGainedAt=Date.now();if(!e&&vi.terminalFocus==="blurred")return;vi.terminalFocus=e?"focused":"blurred",Kur(e),vi.terminalFocusChanged.emit()}function zue(){return vi.terminalFocus!=="blurred"}function ND(){return vi.terminalFocus}function lvr(){return vi.terminalFocusGainedAt}function i5(e){return vi.terminalFocusChanged.subscribe(e)}
export{TDn,zue,ND,lvr,i5};
