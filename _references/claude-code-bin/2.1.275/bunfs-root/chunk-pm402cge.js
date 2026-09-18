// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{c}from"/$bunfs/root/chunk-gytndg57.js";import{i,Ds}from"/$bunfs/root/chunk-bkjq2ptm.js";import{LN,p2}from"/$bunfs/root/chunk-y8as26ve.js";import{Cte}from"/$bunfs/root/chunk-1b1s2j3n.js";var r="tengu_org_policy_denied";function l(o,n){let e=p2(o);if(e===null||e==="unregistered")return null;return{org_policy_key:c(o),org_policy_deny_kind:c(e),org_policy_taint_named:Cte(LN()).length>0,surface:c(n)}}function fw(o,n){let e=l(o,n);if(e)i(r,e)}async function WL(o,n){let e=l(o,n);if(e)await Ds(r,e)}
export{fw,WL};
