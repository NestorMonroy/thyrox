// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{V,W}from"/$bunfs/root/chunk-cqc88nqm.js";import{xz}from"/$bunfs/root/chunk-5khn4tvf.js";import{pc}from"/$bunfs/root/chunk-dzhe9h05.js";var d=new V(()=>({degraded:!1}));function t(){return d.of(W().host)}function E3(n,r){if(n!==pc)return;let e=t();if(r===void 0){e.degraded=!1;return}let o=xz(r);if(o==="downstream_unreachable")e.degraded=!0;else if(o==="downstream_error")e.degraded=!1}function qKr(){return t().degraded}
export{E3,qKr};
