// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{PFr}from"/$bunfs/root/chunk-zwm3fybx.js";import{zi}from"/$bunfs/root/chunk-pe52zkbe.js";function GJn(e){if(e)zi.terminalFocusGainedAt=Date.now();if(!e&&zi.terminalFocus==="blurred")return;zi.terminalFocus=e?"focused":"blurred",PFr(e),zi.terminalFocusChanged.emit()}function d_e(){return zi.terminalFocus!=="blurred"}function eF(){return zi.terminalFocus}function z4r(){return zi.terminalFocusGainedAt}function gJ(e){return zi.terminalFocusChanged.subscribe(e)}
export{GJn,d_e,eF,z4r,gJ};
