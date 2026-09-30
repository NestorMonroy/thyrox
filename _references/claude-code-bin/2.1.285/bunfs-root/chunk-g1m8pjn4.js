// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Gn}from"/$bunfs/root/chunk-1m79ycfm.js";import{I}from"/$bunfs/root/chunk-vqpmen5t.js";import{L}from"/$bunfs/root/chunk-k3gp1qmc.js";import{Ir}from"/$bunfs/root/chunk-61992r1j.js";import{yf,nt}from"/$bunfs/root/chunk-h2ft6tqx.js";import{mkdir as i}from"fs/promises";import{join as a}from"path";async function z4t(e,r){if(L()&&r!==void 0&&Gn(e)){await n(r,{namespace:"job",jobId:e});return}await i(Ir(e),{recursive:!0})}async function $Oe(e,r){if(L()&&r!==void 0&&Gn(e)){await n(r,c(e));return}await i(a(Ir(e),"tmp"),{recursive:!0})}function c(e){return{namespace:"job",jobId:e,relPath:["tmp"]}}async function n(e,r){let o=await e.ensureScope(r);if(!o.ok){let t=yf(o.error);throw Object.assign(new I(`job folder not made (${nt(o.error)})`,"job folder not made"),t!==void 0?{code:t}:{})}}
export{z4t,$Oe};
