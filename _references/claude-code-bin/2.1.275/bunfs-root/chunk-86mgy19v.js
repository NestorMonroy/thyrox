// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{G,W}from"/$bunfs/root/chunk-4qqe0nh4.js";import{ej}from"/$bunfs/root/chunk-1qj0na9r.js";import{ac}from"/$bunfs/root/chunk-nbfvjj3w.js";var d=new G(()=>({degraded:!1}));function t(){return d.of(W().host)}function cde(n,r){if(n!==ac)return;let e=t();if(r===void 0){e.degraded=!1;return}let o=ej(r);if(o==="downstream_unreachable")e.degraded=!0;else if(o==="downstream_error")e.degraded=!1}function AAr(){return t().degraded}
export{cde,AAr};
