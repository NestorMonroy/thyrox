// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{JR,OS,ng,Ug}from"/$bunfs/root/chunk-ky4en5r8.js";import{Me}from"/$bunfs/root/chunk-hd8cteey.js";import{hm,J7n}from"/$bunfs/root/chunk-dsxed40r.js";import{qw}from"/$bunfs/root/chunk-bvpvzebz.js";import{dirname as f,join as s}from"path";function c(e){return/^[A-Za-z0-9_-]{1,128}$/.test(e)?e:JR(e)}async function mco(e,r,n){return s(ng(await Ug(e,qw(n))),rOn(r))}async function gco(e,r,n){let t=await Ug(e,qw(n)),d=s(ng(t),rOn(r)),i=OS(t),o=n===void 0?void 0:Tfr(i,r);return{path:d,projectKey:i,v5:n===void 0||o===void 0?void 0:{backend:n,key:o}}}function Tfr(e,r){let n=Me.dirSyncRecord(e,c(r));return hm(n)===void 0?n:void 0}function rOn(e){return`${c(e)}${J7n}`}
export{mco,gco,Tfr,rOn};
