// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{c}from"/$bunfs/root/chunk-64dkx51v.js";import{i,Rs}from"/$bunfs/root/chunk-qpc977f4.js";import{uN,Aj}from"/$bunfs/root/chunk-4jd7d9ec.js";import{Hee}from"/$bunfs/root/chunk-8nk4yw0p.js";var r="tengu_org_policy_denied";function l(o,n){let e=Aj(o);if(e===null||e==="unregistered")return null;return{org_policy_key:c(o),org_policy_deny_kind:c(e),org_policy_taint_named:Hee(uN()).length>0,surface:c(n)}}function JS(o,n){let e=l(o,n);if(e)i(r,e)}async function AL(o,n){let e=l(o,n);if(e)await Rs(r,e)}
export{JS,AL};
