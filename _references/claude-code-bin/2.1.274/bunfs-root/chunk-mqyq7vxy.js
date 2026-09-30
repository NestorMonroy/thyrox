// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{oe}from"/$bunfs/root/chunk-r2c9k9kh.js";import{jt}from"/$bunfs/root/chunk-hf9yhhhe.js";var TVn=128,DDr=/^[\x21-\x7e]+$/,LDr="io.modelcontextprotocol/tasks";function _3e(r){return oe(r.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu,""),TVn)}function i8(r){return oe(_3e(r),8)}function bdt(r){if(!Number.isFinite(r)||r<=0)return;return r<1000?`${r}ms`:jt(r)}
export{TVn,DDr,LDr,_3e,i8,bdt};
