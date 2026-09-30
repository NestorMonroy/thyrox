// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{vR,U_,vf,xp}from"/$bunfs/root/chunk-g8rhxhbp.js";import{Re}from"/$bunfs/root/chunk-vtbas3eg.js";import{Qp,iTn}from"/$bunfs/root/chunk-4m9qp5rm.js";import{xg}from"/$bunfs/root/chunk-0vekvpfq.js";import{join as a}from"path";function s7(e){return/^[A-Za-z0-9_-]{1,128}$/.test(e)?e:vR(e)}async function BHt(e,t,n){return a(vf(await xp(e,xg(n))),ken(t))}async function lwe(e,t,n){let r=await xp(e,xg(n)),c=a(vf(r),ken(t)),o=U_(r),i=n===void 0?void 0:n$n(o,t);return{path:c,projectKey:o,v5:n===void 0||i===void 0?void 0:{backend:n,key:i}}}function n$n(e,t){let n=Re.dirSyncRecord(e,s7(t));return Qp(n)===void 0?n:void 0}function ken(e){return`${s7(e)}${iTn}`}
export{s7,BHt,lwe,n$n,ken};
