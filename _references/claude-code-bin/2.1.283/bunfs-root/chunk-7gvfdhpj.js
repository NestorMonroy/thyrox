// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{re}from"/$bunfs/root/chunk-vq0drrah.js";import{Gs}from"/$bunfs/root/chunk-7y2gzc5g.js";function O7e(n){return n.replace(/[\r\n\u2028\u2029]+/g," ")}function oSe(n,r){let e=Gs(n);if(e.length<=r)return e;let t=re(e,r),o=Array.from(e.slice(t.length)).length;return`${t} \u2026 (${o} more characters follow that are NOT shown in this message)`}
export{O7e,oSe};
