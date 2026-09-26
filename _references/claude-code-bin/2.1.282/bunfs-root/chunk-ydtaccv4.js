// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{c}from"/$bunfs/root/chunk-zxcb8vnv.js";import{i,Cs}from"/$bunfs/root/chunk-hm522bzh.js";import{n$,yV}from"/$bunfs/root/chunk-dezzmzg8.js";import{Qae}from"/$bunfs/root/chunk-2y2sj49d.js";var r="tengu_org_policy_denied";function l(o,n){let e=yV(o);if(e===null||e==="unregistered")return null;return{org_policy_key:c(o),org_policy_deny_kind:c(e),org_policy_taint_named:Qae(n$()).length>0,surface:c(n)}}function aE(o,n){let e=l(o,n);if(e)i(r,e)}async function TU(o,n){let e=l(o,n);if(e)await Cs(r,e)}
export{aE,TU};
