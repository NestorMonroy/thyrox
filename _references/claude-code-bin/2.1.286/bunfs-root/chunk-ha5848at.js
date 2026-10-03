// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{re}from"/$bunfs/root/chunk-xjjs8j5r.js";import{Ds}from"/$bunfs/root/chunk-vqc3jzpc.js";function qet(n){return n.replace(/[\r\n\u2028\u2029]+/g," ")}function ave(n,r){let e=Ds(n);if(e.length<=r)return e;let t=re(e,r),o=Array.from(e.slice(t.length)).length;return`${t} \u2026 (${o} more characters follow that are NOT shown in this message)`}
export{qet,ave};
