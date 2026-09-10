// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{z,B}from"/$bunfs/root/chunk-t8q7n4ta.js";import{iB}from"/$bunfs/root/chunk-yw4jc948.js";import{cF}from"/$bunfs/root/chunk-fq2q5808.js";var d=new z(()=>({degraded:!1}));function t(){return d.of(B().host)}function Zte(n,r){if(n!==cF)return;let e=t();if(r===void 0){e.degraded=!1;return}let o=iB(r);if(o==="downstream_unreachable")e.degraded=!0;else if(o==="downstream_error")e.degraded=!1}function gVn(){return t().degraded}
export{Zte,gVn};
