// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{In}from"/$bunfs/root/chunk-z0202m3z.js";import{x}from"/$bunfs/root/chunk-3btyksgt.js";import{un}from"/$bunfs/root/chunk-64dkx51v.js";import{F}from"/$bunfs/root/chunk-p7hrkaq4.js";import{Id,Xe}from"/$bunfs/root/chunk-r2c9k9kh.js";import{br}from"/$bunfs/root/chunk-wae9xe9x.js";import{mkdir as o}from"fs/promises";import{join as a}from"path";async function CCt(e,r){if(F()&&r!==void 0&&In(e)){await i(r,{namespace:"job",jobId:e});return}await o(br(e),{recursive:!0})}async function sbe(e,r){if(F()&&r!==void 0&&In(e)){await i(r,d(e));return}await o(a(br(e),"tmp"),{recursive:!0})}function d(e){return{namespace:"job",jobId:e,relPath:["tmp"]}}async function i(e,r){let t=await e.ensureScope(r);if(!t.ok){let n=Id(t.error);throw Object.assign(new x(`job folder not made (${Xe(t.error)})`,"job folder not made"),n!==void 0?{code:n}:{})}}var c=new Set(["starting","running","resuming","adopted","crashed","working","blocked","done","stopped","failed","busy","shell","idle","waiting"]);function yD(e){if(e===void 0)return;return un(c.has(e)?e:"other")}var s=new Set(["cold","spare","adopted"]);function ftt(e){return typeof e==="string"&&s.has(e)?e:void 0}
export{CCt,sbe,yD,ftt};
