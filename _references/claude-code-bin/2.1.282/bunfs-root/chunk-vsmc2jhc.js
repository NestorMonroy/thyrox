// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{K,W}from"/$bunfs/root/chunk-zwm3fybx.js";import{oV}from"/$bunfs/root/chunk-wbbthbh9.js";import{_c}from"/$bunfs/root/chunk-nbmjse29.js";var d=new K(()=>({degraded:!1}));function t(){return d.of(W().host)}function C6(n,r){if(n!==_c)return;let e=t();if(r===void 0){e.degraded=!1;return}let o=oV(r);if(o==="downstream_unreachable")e.degraded=!0;else if(o==="downstream_error")e.degraded=!1}function x7r(){return t().degraded}
export{C6,x7r};
