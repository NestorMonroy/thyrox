// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{V,j}from"/$bunfs/root/chunk-hbjpbz2q.js";import{WK}from"/$bunfs/root/chunk-4hjp8tw4.js";import{Zl}from"/$bunfs/root/chunk-0wj52kch.js";var d=new V(()=>({degraded:!1}));function t(){return d.of(j().host)}function OB(n,r){if(n!==Zl)return;let e=t();if(r===void 0){e.degraded=!1;return}let o=WK(r);if(o==="downstream_unreachable")e.degraded=!0;else if(o==="downstream_error")e.degraded=!1}function Vmo(){return t().degraded}
export{OB,Vmo};
