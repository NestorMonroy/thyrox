// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{qx,tS,hu,Ru}from"/$bunfs/root/chunk-wf6ne59j.js";import{Re}from"/$bunfs/root/chunk-qbkceaaj.js";import{em,x6n}from"/$bunfs/root/chunk-m8ebe51k.js";import{Ag}from"/$bunfs/root/chunk-d1sb60gh.js";import{dirname as c,join as r}from"path";function s4(t){return/^[A-Za-z0-9_-]{1,128}$/.test(t)?t:qx(t)}async function Uwt(t,e,n){return r(hu(await Ru(t,Ag(n))),u3t(e))}async function iQ(t,e,n){let o=await Ru(t,Ag(n)),s=r(hu(o),u3t(e)),i=tS(o),a=n===void 0?void 0:WAn(i,e);return{path:s,projectKey:i,v5:n===void 0||a===void 0?void 0:{backend:n,key:a}}}function WAn(t,e){let n=Re.dirSyncRecord(t,s4(e));return em(n)===void 0?n:void 0}function u3t(t){return`${s4(t)}${x6n}`}var p=".dir-sync-empty.json";function d(t){return`${s4(t)}${p}`}function Bwt(t,e){return r(c(t),d(e))}
export{s4,Uwt,iQ,WAn,u3t,Bwt};
