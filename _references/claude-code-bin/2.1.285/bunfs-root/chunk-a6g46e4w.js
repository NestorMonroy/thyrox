// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{LR,fS,Gm,Tg}from"/$bunfs/root/chunk-bgchm1w8.js";import{He}from"/$bunfs/root/chunk-1m79ycfm.js";import{tm,z9n}from"/$bunfs/root/chunk-a1fdkwrj.js";import{Pw}from"/$bunfs/root/chunk-scpg8qp6.js";import{dirname as f,join as s}from"path";function c(e){return/^[A-Za-z0-9_-]{1,128}$/.test(e)?e:LR(e)}async function dso(e,r,n){return s(Gm(await Tg(e,Pw(n))),vxn(r))}async function uso(e,r,n){let t=await Tg(e,Pw(n)),d=s(Gm(t),vxn(r)),i=fS(t),o=n===void 0?void 0:ydr(i,r);return{path:d,projectKey:i,v5:n===void 0||o===void 0?void 0:{backend:n,key:o}}}function ydr(e,r){let n=He.dirSyncRecord(e,c(r));return tm(n)===void 0?n:void 0}function vxn(e){return`${c(e)}${z9n}`}
export{dso,uso,ydr,vxn};
