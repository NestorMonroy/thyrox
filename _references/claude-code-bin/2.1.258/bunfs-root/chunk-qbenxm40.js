// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{rn}from"/$bunfs/root/chunk-fkh93x1w.js";import{C}from"/$bunfs/root/chunk-xtc2dmbe.js";import{M}from"/$bunfs/root/chunk-y7x1gsy0.js";import{tu,Ye}from"/$bunfs/root/chunk-5nyank6v.js";import{rr}from"/$bunfs/root/chunk-bnc671w7.js";import{mkdir as i}from"fs/promises";import{join as a}from"path";async function Wut(e,r){if(M()&&r!==void 0&&rn(e)){await n(r,{namespace:"job",jobId:e});return}await i(rr(e),{recursive:!0})}async function yce(e,r){if(M()&&r!==void 0&&rn(e)){await n(r,c(e));return}await i(a(rr(e),"tmp"),{recursive:!0})}function c(e){return{namespace:"job",jobId:e,relPath:["tmp"]}}async function n(e,r){let o=await e.ensureScope(r);if(!o.ok){let t=tu(o.error);throw Object.assign(new C(`job folder not made (${Ye(o.error)})`,"job folder not made"),t!==void 0?{code:t}:{})}}
export{Wut,yce};
