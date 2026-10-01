// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{HYr}from"/$bunfs/root/chunk-hbjpbz2q.js";import{Yi}from"/$bunfs/root/chunk-nehh2j12.js";function llr(e){if(e)Yi.terminalFocusGainedAt=Date.now();if(!e&&Yi.terminalFocus==="blurred")return;Yi.terminalFocus=e?"focused":"blurred",HYr(e),Yi.terminalFocusChanged.emit()}function eve(){return Yi.terminalFocus!=="blurred"}function d5(){return Yi.terminalFocus}function Qoo(){return Yi.terminalFocusGainedAt}function Afe(e){return Yi.terminalFocusChanged.subscribe(e)}
export{llr,eve,d5,Qoo,Afe};
