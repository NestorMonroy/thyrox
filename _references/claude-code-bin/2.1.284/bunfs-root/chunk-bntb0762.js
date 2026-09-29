// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{zn}from"/$bunfs/root/chunk-h4npc7kp.js";import{P}from"/$bunfs/root/chunk-31aa9k3a.js";import{N}from"/$bunfs/root/chunk-0pd7kjzx.js";import{Or}from"/$bunfs/root/chunk-e06pb89d.js";import{wf,ot}from"/$bunfs/root/chunk-b2as3tbn.js";import{mkdir as i}from"fs/promises";import{join as a}from"path";async function r5t(e,r){if(N()&&r!==void 0&&zn(e)){await n(r,{namespace:"job",jobId:e});return}await i(Or(e),{recursive:!0})}async function GOe(e,r){if(N()&&r!==void 0&&zn(e)){await n(r,c(e));return}await i(a(Or(e),"tmp"),{recursive:!0})}function c(e){return{namespace:"job",jobId:e,relPath:["tmp"]}}async function n(e,r){let o=await e.ensureScope(r);if(!o.ok){let t=wf(o.error);throw Object.assign(new P(`job folder not made (${ot(o.error)})`,"job folder not made"),t!==void 0?{code:t}:{})}}
export{r5t,GOe};
