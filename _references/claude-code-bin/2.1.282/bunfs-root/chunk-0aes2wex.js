// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{re}from"/$bunfs/root/chunk-shebh248.js";import{en}from"/$bunfs/root/chunk-x80cfbm0.js";var Cyr=128,gco=/^[\x21-\x7e]+$/,hco="io.modelcontextprotocol/tasks";function IMn(r){return re(r.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu,""),Cyr)}function hQ(r){return re(IMn(r),8)}function Ryr(r){if(!Number.isFinite(r)||r<=0)return;return r<1000?`${r}ms`:en(r)}
export{Cyr,gco,hco,IMn,hQ,Ryr};
