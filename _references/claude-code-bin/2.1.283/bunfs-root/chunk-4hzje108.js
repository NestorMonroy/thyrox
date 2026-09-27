// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{q,j}from"/$bunfs/root/chunk-nvht7ckf.js";import{xq}from"/$bunfs/root/chunk-t6pwageh.js";import{xc}from"/$bunfs/root/chunk-bydh8jk1.js";var d=new q(()=>({degraded:!1}));function t(){return d.of(j().host)}function r8(n,r){if(n!==xc)return;let e=t();if(r===void 0){e.degraded=!1;return}let o=xq(r);if(o==="downstream_unreachable")e.degraded=!0;else if(o==="downstream_error")e.degraded=!1}function mio(){return t().degraded}
export{r8,mio};
