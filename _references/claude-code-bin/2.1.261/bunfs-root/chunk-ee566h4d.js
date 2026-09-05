// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{j,U}from"/$bunfs/root/chunk-annedm50.js";import{KF}from"/$bunfs/root/chunk-vd630rs0.js";import{fK}from"/$bunfs/root/chunk-p3zwp1vp.js";var d=new j(()=>({degraded:!1}));function t(){return d.of(U().host)}function Mee(n,r){if(n!==fK)return;let e=t();if(r===void 0){e.degraded=!1;return}let o=KF(r);if(o==="downstream_unreachable")e.degraded=!0;else if(o==="downstream_error")e.degraded=!1}function E2n(){return t().degraded}
export{Mee,E2n};
