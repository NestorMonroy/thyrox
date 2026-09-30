// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{cx,Pb,mf,vp}from"/$bunfs/root/chunk-g59nc6ra.js";import{Re}from"/$bunfs/root/chunk-z3ns4mz4.js";import{Nf,eqn}from"/$bunfs/root/chunk-36kx407g.js";import{cg}from"/$bunfs/root/chunk-ngtv9mee.js";import{dirname as c,join as r}from"path";function a6(t){return/^[A-Za-z0-9_-]{1,128}$/.test(t)?t:cx(t)}async function P_t(t,e,n){return r(mf(await vp(t,cg(n))),dVt(e))}async function PJ(t,e,n){let o=await vp(t,cg(n)),s=r(mf(o),dVt(e)),i=Pb(o),a=n===void 0?void 0:Nwn(i,e);return{path:s,projectKey:i,v5:n===void 0||a===void 0?void 0:{backend:n,key:a}}}function Nwn(t,e){let n=Re.dirSyncRecord(t,a6(e));return Nf(n)===void 0?n:void 0}function dVt(t){return`${a6(t)}${eqn}`}var p=".dir-sync-empty.json";function d(t){return`${a6(t)}${p}`}function H_t(t,e){return r(c(t),d(e))}
export{a6,P_t,PJ,Nwn,dVt,H_t};
