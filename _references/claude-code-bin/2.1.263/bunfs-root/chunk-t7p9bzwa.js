// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{$n}from"/$bunfs/root/chunk-1m0n2kwr.js";import{yn}from"/$bunfs/root/chunk-ctrs6tfh.js";import{T}from"/$bunfs/root/chunk-06whp1c5.js";import{O}from"/$bunfs/root/chunk-m3vzz9tz.js";import{nu,Ge}from"/$bunfs/root/chunk-mh9y4c2z.js";import{rr}from"/$bunfs/root/chunk-82qrhb9b.js";var a=new Set(["starting","running","resuming","adopted","crashed","working","blocked","done","stopped","failed","busy","shell","idle","waiting"]);function rL(e){if(e===void 0)return;return $n(a.has(e)?e:"other")}var d=new Set(["cold","spare","adopted"]);function k4e(e){return typeof e==="string"&&d.has(e)?e:void 0}import{mkdir as o}from"fs/promises";import{join as c}from"path";async function Yft(e,r){if(O()&&r!==void 0&&yn(e)){await i(r,{namespace:"job",jobId:e});return}await o(rr(e),{recursive:!0})}async function Yce(e,r){if(O()&&r!==void 0&&yn(e)){await i(r,s(e));return}await o(c(rr(e),"tmp"),{recursive:!0})}function s(e){return{namespace:"job",jobId:e,relPath:["tmp"]}}async function i(e,r){let t=await e.ensureScope(r);if(!t.ok){let n=nu(t.error);throw Object.assign(new T(`job folder not made (${Ge(t.error)})`,"job folder not made"),n!==void 0?{code:n}:{})}}
export{rL,k4e,Yft,Yce};
