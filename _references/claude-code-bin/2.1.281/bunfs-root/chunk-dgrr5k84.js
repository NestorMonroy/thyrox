// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{c}from"/$bunfs/root/chunk-rnxz8hs2.js";import{i,ks}from"/$bunfs/root/chunk-bh8vsyek.js";import{FN,Uz}from"/$bunfs/root/chunk-pwyp6fhc.js";import{Zie}from"/$bunfs/root/chunk-cft4wy8y.js";var r="tengu_org_policy_denied";function l(o,n){let e=Uz(o);if(e===null||e==="unregistered")return null;return{org_policy_key:c(o),org_policy_deny_kind:c(e),org_policy_taint_named:Zie(FN()).length>0,surface:c(n)}}function qv(o,n){let e=l(o,n);if(e)i(r,e)}async function ZF(o,n){let e=l(o,n);if(e)await ks(r,e)}
export{qv,ZF};
