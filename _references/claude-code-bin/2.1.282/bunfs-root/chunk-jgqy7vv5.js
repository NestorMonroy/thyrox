// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Nn}from"/$bunfs/root/chunk-z3ns4mz4.js";import{I}from"/$bunfs/root/chunk-dw9y6h6j.js";import{N}from"/$bunfs/root/chunk-hm6k4hcw.js";import{Rr}from"/$bunfs/root/chunk-kda7f0br.js";import{ef,Ze}from"/$bunfs/root/chunk-rw3y01gt.js";import{mkdir as i}from"fs/promises";import{join as a}from"path";async function Yzt(e,r){if(N()&&r!==void 0&&Nn(e)){await n(r,{namespace:"job",jobId:e});return}await i(Rr(e),{recursive:!0})}async function fxe(e,r){if(N()&&r!==void 0&&Nn(e)){await n(r,c(e));return}await i(a(Rr(e),"tmp"),{recursive:!0})}function c(e){return{namespace:"job",jobId:e,relPath:["tmp"]}}async function n(e,r){let o=await e.ensureScope(r);if(!o.ok){let t=ef(o.error);throw Object.assign(new I(`job folder not made (${Ze(o.error)})`,"job folder not made"),t!==void 0?{code:t}:{})}}
export{Yzt,fxe};
