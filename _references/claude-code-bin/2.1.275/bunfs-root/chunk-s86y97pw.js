// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Dn}from"/$bunfs/root/chunk-vtbas3eg.js";import{x}from"/$bunfs/root/chunk-d5d0zdsy.js";import{cn}from"/$bunfs/root/chunk-gytndg57.js";import{F}from"/$bunfs/root/chunk-h401nbms.js";import{Vd,Xe}from"/$bunfs/root/chunk-4bbpt7sc.js";import{Sr}from"/$bunfs/root/chunk-f3t284zj.js";import{mkdir as o}from"fs/promises";import{join as a}from"path";async function _It(e,r){if(F()&&r!==void 0&&Dn(e)){await i(r,{namespace:"job",jobId:e});return}await o(Sr(e),{recursive:!0})}async function RSe(e,r){if(F()&&r!==void 0&&Dn(e)){await i(r,d(e));return}await o(a(Sr(e),"tmp"),{recursive:!0})}function d(e){return{namespace:"job",jobId:e,relPath:["tmp"]}}async function i(e,r){let t=await e.ensureScope(r);if(!t.ok){let n=Vd(t.error);throw Object.assign(new x(`job folder not made (${Xe(t.error)})`,"job folder not made"),n!==void 0?{code:n}:{})}}var c=new Set(["starting","running","resuming","adopted","crashed","working","blocked","done","stopped","failed","busy","shell","idle","waiting"]);function LD(e){if(e===void 0)return;return cn(c.has(e)?e:"other")}var s=new Set(["cold","spare","adopted"]);function krt(e){return typeof e==="string"&&s.has(e)?e:void 0}
export{_It,RSe,LD,krt};
