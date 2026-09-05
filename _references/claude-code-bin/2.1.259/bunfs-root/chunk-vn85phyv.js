// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{V,z}from"/$bunfs/root/chunk-x1rrg5j2.js";import{SB}from"/$bunfs/root/chunk-qpwbvc04.js";import{wK}from"/$bunfs/root/chunk-b3pxzdmn.js";var d=new V(()=>({degraded:!1}));function t(){return d.of(z().host)}function Ate(n,r){if(n!==wK)return;let e=t();if(r===void 0){e.degraded=!1;return}let o=SB(r);if(o==="downstream_unreachable")e.degraded=!0;else if(o==="downstream_error")e.degraded=!1}function bWn(){return t().degraded}
export{Ate,bWn};
