// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{re}from"/$bunfs/root/chunk-vq0drrah.js";import{Zt}from"/$bunfs/root/chunk-8w2y72gy.js";var _kr=128,S_o=/^[\x21-\x7e]+$/,w_o="io.modelcontextprotocol/tasks";function UFn(r){return re(r.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu,""),_kr)}function nae(r){return re(UFn(r),8)}function bkr(r){if(!Number.isFinite(r)||r<=0)return;return r<1000?`${r}ms`:Zt(r)}
export{_kr,S_o,w_o,UFn,nae,bkr};
