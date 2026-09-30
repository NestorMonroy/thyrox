// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{uC,Sb,af,hp}from"/$bunfs/root/chunk-cqpd6xa9.js";import{Re}from"/$bunfs/root/chunk-99avamm5.js";import{Df,g2n}from"/$bunfs/root/chunk-xe0dn6dd.js";import{ng}from"/$bunfs/root/chunk-kwr4cna1.js";import{dirname as c,join as r}from"path";function LX(t){return/^[A-Za-z0-9_-]{1,128}$/.test(t)?t:uC(t)}async function k2t(t,e,n){return r(af(await hp(t,ng(n))),__n(e))}async function zte(t,e,n){let o=await hp(t,ng(n)),s=r(af(o),__n(e)),i=Sb(o),a=n===void 0?void 0:kJn(i,e);return{path:s,projectKey:i,v5:n===void 0||a===void 0?void 0:{backend:n,key:a}}}function kJn(t,e){let n=Re.dirSyncRecord(t,LX(e));return Df(n)===void 0?n:void 0}function __n(t){return`${LX(t)}${g2n}`}var p=".dir-sync-empty.json";function d(t){return`${LX(t)}${p}`}function T2t(t,e){return r(c(t),d(e))}
export{LX,k2t,zte,kJn,__n,T2t};
