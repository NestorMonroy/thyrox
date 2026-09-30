// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{jn}from"/$bunfs/root/chunk-qbkceaaj.js";import{I}from"/$bunfs/root/chunk-ern0s5ks.js";import{N}from"/$bunfs/root/chunk-8nz62976.js";import{Ir}from"/$bunfs/root/chunk-mxz6ht5b.js";import{mf,rt}from"/$bunfs/root/chunk-nwpc1c89.js";import{mkdir as i}from"fs/promises";import{join as a}from"path";async function xqt(e,r){if(N()&&r!==void 0&&jn(e)){await n(r,{namespace:"job",jobId:e});return}await i(Ir(e),{recursive:!0})}async function OPe(e,r){if(N()&&r!==void 0&&jn(e)){await n(r,c(e));return}await i(a(Ir(e),"tmp"),{recursive:!0})}function c(e){return{namespace:"job",jobId:e,relPath:["tmp"]}}async function n(e,r){let o=await e.ensureScope(r);if(!o.ok){let t=mf(o.error);throw Object.assign(new I(`job folder not made (${rt(o.error)})`,"job folder not made"),t!==void 0?{code:t}:{})}}
export{xqt,OPe};
