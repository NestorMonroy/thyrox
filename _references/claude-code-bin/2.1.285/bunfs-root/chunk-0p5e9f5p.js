// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{c}from"/$bunfs/root/chunk-aap6zsd0.js";import{i,Ps}from"/$bunfs/root/chunk-gn6mgw10.js";import{tj,jD}from"/$bunfs/root/chunk-mbk7s6pb.js";import{Lde}from"/$bunfs/root/chunk-gfn67bwy.js";var r="tengu_org_policy_denied";function l(o,n){let e=jD(o);if(e===null||e==="unregistered")return null;return{org_policy_key:c(o),org_policy_deny_kind:c(e),org_policy_taint_named:Lde(tj()).length>0,surface:c(n)}}function zE(o,n){let e=l(o,n);if(e)i(r,e)}async function QB(o,n){let e=l(o,n);if(e)await Ps(r,e)}
export{zE,QB};
