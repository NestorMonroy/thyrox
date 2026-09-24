// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{re}from"/$bunfs/root/chunk-nqsdwfmt.js";import{Qt}from"/$bunfs/root/chunk-a22am1vw.js";var wpr=128,Tro=/^[\x21-\x7e]+$/,Aro="io.modelcontextprotocol/tasks";function TPn(r){return re(r.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu,""),wpr)}function p7(r){return re(TPn(r),8)}function vpr(r){if(!Number.isFinite(r)||r<=0)return;return r<1000?`${r}ms`:Qt(r)}
export{wpr,Tro,Aro,TPn,p7,vpr};
