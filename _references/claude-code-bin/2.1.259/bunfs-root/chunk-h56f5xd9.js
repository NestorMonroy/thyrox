// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{nv,Em,Qu,_l}from"/$bunfs/root/chunk-vdqz95a3.js";import{ve}from"/$bunfs/root/chunk-ptdm1fhw.js";import{zn,RIt}from"/$bunfs/root/chunk-nwzn6gxv.js";import{Uu}from"/$bunfs/root/chunk-gt0sz7qx.js";import{join as a}from"path";function i8(e){return/^[A-Za-z0-9_-]{1,128}$/.test(e)?e:nv(e)}async function Rft(e,t,n){return a(Qu(await _l(e,Uu(n))),QFt(t))}async function due(e,t,n){let r=await _l(e,Uu(n)),c=a(Qu(r),QFt(t)),o=Em(r),i=n===void 0?void 0:qln(o,t);return{path:c,projectKey:o,v5:n===void 0||i===void 0?void 0:{backend:n,key:i}}}function qln(e,t){let n=ve.dirSyncRecord(e,i8(t));return zn(n)===void 0?n:void 0}function QFt(e){return`${i8(e)}${RIt}`}
export{i8,Rft,due,qln,QFt};
