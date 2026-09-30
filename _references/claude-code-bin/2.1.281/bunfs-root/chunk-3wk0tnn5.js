// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Mn}from"/$bunfs/root/chunk-99avamm5.js";import{hn}from"/$bunfs/root/chunk-rnxz8hs2.js";import{I}from"/$bunfs/root/chunk-2bj5eqbj.js";import{F}from"/$bunfs/root/chunk-7yckkh1m.js";import{Rr}from"/$bunfs/root/chunk-ew6qt9wg.js";import{zp,Ze}from"/$bunfs/root/chunk-byt2n49y.js";import{mkdir as o}from"fs/promises";import{join as a}from"path";async function njt(e,r){if(F()&&r!==void 0&&Mn(e)){await i(r,{namespace:"job",jobId:e});return}await o(Rr(e),{recursive:!0})}async function BCe(e,r){if(F()&&r!==void 0&&Mn(e)){await i(r,d(e));return}await o(a(Rr(e),"tmp"),{recursive:!0})}function d(e){return{namespace:"job",jobId:e,relPath:["tmp"]}}async function i(e,r){let t=await e.ensureScope(r);if(!t.ok){let n=zp(t.error);throw Object.assign(new I(`job folder not made (${Ze(t.error)})`,"job folder not made"),n!==void 0?{code:n}:{})}}var c=new Set(["starting","running","resuming","adopted","crashed","working","blocked","done","stopped","failed","busy","shell","idle","waiting"]);function M$(e){if(e===void 0)return;return hn(c.has(e)?e:"other")}var s=new Set(["cold","spare","adopted"]);function Gmt(e){return typeof e==="string"&&s.has(e)?e:void 0}
export{njt,BCe,M$,Gmt};
