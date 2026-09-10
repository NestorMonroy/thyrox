// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{le}from"/$bunfs/root/chunk-ras23w04.js";import{Nt}from"/$bunfs/root/chunk-7y5wjz4e.js";var BHn=128,Rtr=/^[\x21-\x7e]+$/,xtr="io.modelcontextprotocol/tasks";function pFe(r){return le(r.replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu,""),BHn)}function Sq(r){return le(pFe(r),8)}function YXe(r){if(!Number.isFinite(r)||r<=0)return;return r<1000?`${r}ms`:Nt(r)}
export{BHn,Rtr,xtr,pFe,Sq,YXe};
