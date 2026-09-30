// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{c}from"/$bunfs/root/chunk-czwr6846.js";import{i,$s}from"/$bunfs/root/chunk-wt82nr44.js";import{FF,Lz}from"/$bunfs/root/chunk-gqk3xdpc.js";import{Bde}from"/$bunfs/root/chunk-drw7d2f5.js";var r="tengu_org_policy_denied";function l(o,n){let e=Lz(o);if(e===null||e==="unregistered")return null;return{org_policy_key:c(o),org_policy_deny_kind:c(e),org_policy_taint_named:Bde(FF()).length>0,surface:c(n)}}function WE(o,n){let e=l(o,n);if(e)i(r,e)}async function i1(o,n){let e=l(o,n);if(e)await $s(r,e)}
export{WE,i1};
