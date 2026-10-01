// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{c}from"/$bunfs/root/chunk-vyyazxfq.js";import{i,Ds}from"/$bunfs/root/chunk-ab7mw5d9.js";import{uF,Bq}from"/$bunfs/root/chunk-4gwepcrh.js";import{jce}from"/$bunfs/root/chunk-f3bx5v1a.js";var r="tengu_org_policy_denied";function l(o,n){let e=Bq(o);if(e===null||e==="unregistered")return null;return{org_policy_key:c(o),org_policy_deny_kind:c(e),org_policy_taint_named:jce(uF()).length>0,surface:c(n)}}function TE(o,n){let e=l(o,n);if(e)i(r,e)}async function GB(o,n){let e=l(o,n);if(e)await Ds(r,e)}
export{TE,GB};
