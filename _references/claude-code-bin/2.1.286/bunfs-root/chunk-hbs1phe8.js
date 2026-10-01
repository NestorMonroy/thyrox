// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{c}from"/$bunfs/root/chunk-dwaez71m.js";import{i,Ns}from"/$bunfs/root/chunk-r27mnwfc.js";import{Ij,mD}from"/$bunfs/root/chunk-av210xrn.js";import{_ue}from"/$bunfs/root/chunk-je15msha.js";var r="tengu_org_policy_denied";function l(o,n){let e=mD(o);if(e===null||e==="unregistered")return null;return{org_policy_key:c(o),org_policy_deny_kind:c(e),org_policy_taint_named:_ue(Ij()).length>0,surface:c(n)}}function rk(o,n){let e=l(o,n);if(e)i(r,e)}async function L1(o,n){let e=l(o,n);if(e)await Ns(r,e)}
export{rk,L1};
