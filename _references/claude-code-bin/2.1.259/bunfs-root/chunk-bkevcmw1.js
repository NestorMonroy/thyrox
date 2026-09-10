// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{le}from"/$bunfs/root/chunk-ras23w04.js";import{vi}from"/$bunfs/root/chunk-6q0mr3fq.js";function SDe(n){return n.replace(/[\r\n\u2028\u2029]+/g," ")}function vte(n,r){let e=vi(n);if(e.length<=r)return e;let t=le(e,r),o=Array.from(e.slice(t.length)).length;return`${t} \u2026 (${o} more characters follow that are NOT shown in this message)`}
export{SDe,vte};
