// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{re}from"/$bunfs/root/chunk-rg63yke9.js";import{Xt}from"/$bunfs/root/chunk-aqx56v12.js";var Mle=128,Dle=/^[\x21-\x7e]+$/,$Wn="io.modelcontextprotocol/tasks";function Jat(r){return re(r.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu,""),Mle)}function dq(r){return re(Jat(r),8)}function UIr(r){if(!Number.isFinite(r)||r<=0)return;return r<1000?`${r}ms`:Xt(r)}
export{Mle,Dle,$Wn,Jat,dq,UIr};
