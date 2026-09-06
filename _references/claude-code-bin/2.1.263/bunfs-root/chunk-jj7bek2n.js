// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{vA,yh,Of,Vu}from"/$bunfs/root/chunk-55s6k4f0.js";import{Ae}from"/$bunfs/root/chunk-ctrs6tfh.js";import{Cd,nYt}from"/$bunfs/root/chunk-8bd42nrb.js";import{Ip}from"/$bunfs/root/chunk-vve60n6d.js";import{join as a}from"path";function G9(e){return/^[A-Za-z0-9_-]{1,128}$/.test(e)?e:vA(e)}async function Fft(e,t,n){return a(Of(await Vu(e,Ip(n))),dFt(t))}async function zce(e,t,n){let r=await Vu(e,Ip(n)),c=a(Of(r),dFt(t)),o=yh(r),i=n===void 0?void 0:Lan(o,t);return{path:c,projectKey:o,v5:n===void 0||i===void 0?void 0:{backend:n,key:i}}}function Lan(e,t){let n=Ae.dirSyncRecord(e,G9(t));return Cd(n)===void 0?n:void 0}function dFt(e){return`${G9(e)}${nYt}`}
export{G9,Fft,zce,Lan,dFt};
