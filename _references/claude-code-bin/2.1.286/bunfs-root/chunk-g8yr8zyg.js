// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{re}from"/$bunfs/root/chunk-xjjs8j5r.js";import{Yt}from"/$bunfs/root/chunk-abdftc9s.js";var kce=128,Tce=/^[\x21-\x7e]+$/,Bqn="io.modelcontextprotocol/tasks";function Ydt(r){return re(r.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu,""),kce)}function Jq(r){return re(Ydt(r),8)}function ILr(r){if(!Number.isFinite(r)||r<=0)return;return r<1000?`${r}ms`:Yt(r)}
export{kce,Tce,Bqn,Ydt,Jq,ILr};
