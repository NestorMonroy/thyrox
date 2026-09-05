// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{sn}from"/$bunfs/root/chunk-ptdm1fhw.js";import{C}from"/$bunfs/root/chunk-058caznt.js";import{M}from"/$bunfs/root/chunk-56nvyfje.js";import{uu,Ye}from"/$bunfs/root/chunk-fzpv8ev5.js";import{nr}from"/$bunfs/root/chunk-m1g84jsb.js";import{mkdir as i}from"fs/promises";import{join as a}from"path";async function Uft(e,r){if(M()&&r!==void 0&&sn(e)){await n(r,{namespace:"job",jobId:e});return}await i(nr(e),{recursive:!0})}async function bue(e,r){if(M()&&r!==void 0&&sn(e)){await n(r,c(e));return}await i(a(nr(e),"tmp"),{recursive:!0})}function c(e){return{namespace:"job",jobId:e,relPath:["tmp"]}}async function n(e,r){let o=await e.ensureScope(r);if(!o.ok){let t=uu(o.error);throw Object.assign(new C(`job folder not made (${Ye(o.error)})`,"job folder not made"),t!==void 0?{code:t}:{})}}
export{Uft,bue};
