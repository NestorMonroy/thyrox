// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{vA,yh,Of,Wu}from"/$bunfs/root/chunk-1a7p190e.js";import{Ae}from"/$bunfs/root/chunk-y87vtd8k.js";import{Cd,tYt}from"/$bunfs/root/chunk-hsewrfs2.js";import{Ip}from"/$bunfs/root/chunk-kv18xnn1.js";import{join as a}from"path";function U9(e){return/^[A-Za-z0-9_-]{1,128}$/.test(e)?e:vA(e)}async function Nft(e,t,n){return a(Of(await Wu(e,Ip(n))),uFt(t))}async function Gce(e,t,n){let r=await Wu(e,Ip(n)),c=a(Of(r),uFt(t)),o=yh(r),i=n===void 0?void 0:xan(o,t);return{path:c,projectKey:o,v5:n===void 0||i===void 0?void 0:{backend:n,key:i}}}function xan(e,t){let n=Ae.dirSyncRecord(e,U9(t));return Cd(n)===void 0?n:void 0}function uFt(e){return`${U9(e)}${tYt}`}
export{U9,Nft,Gce,xan,uFt};
