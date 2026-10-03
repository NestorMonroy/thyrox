// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{qn}from"/$bunfs/root/chunk-hd8cteey.js";import{I}from"/$bunfs/root/chunk-ctczby4m.js";import{F}from"/$bunfs/root/chunk-616rkgbc.js";import{Pr}from"/$bunfs/root/chunk-j6mm9mhr.js";import{Tf,rt}from"/$bunfs/root/chunk-vfrshp8a.js";import{mkdir as i}from"fs/promises";import{join as a}from"path";async function a6t(e,r){if(F()&&r!==void 0&&qn(e)){await n(r,{namespace:"job",jobId:e});return}await i(Pr(e),{recursive:!0})}async function VMe(e,r){if(F()&&r!==void 0&&qn(e)){await n(r,c(e));return}await i(a(Pr(e),"tmp"),{recursive:!0})}function c(e){return{namespace:"job",jobId:e,relPath:["tmp"]}}async function n(e,r){let o=await e.ensureScope(r);if(!o.ok){let t=Tf(o.error);throw Object.assign(new I(`job folder not made (${rt(o.error)})`,"job folder not made"),t!==void 0?{code:t}:{})}}
export{a6t,VMe};
