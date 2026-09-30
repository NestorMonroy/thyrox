// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Zk,Fh,Jp,nd}from"/$bunfs/root/chunk-dm1d67j0.js";import{ke}from"/$bunfs/root/chunk-4te7e7q8.js";import{Ld,s7t}from"/$bunfs/root/chunk-zw6xpj0e.js";import{Kf}from"/$bunfs/root/chunk-chkkfcyd.js";import{join as a}from"path";function Q6(e){return/^[A-Za-z0-9_-]{1,128}$/.test(e)?e:Zk(e)}async function Mmt(e,t,n){return a(Jp(await nd(e,Kf(n))),OBt(t))}async function gde(e,t,n){let r=await nd(e,Kf(n)),c=a(Jp(r),OBt(t)),o=Fh(r),i=n===void 0?void 0:bun(o,t);return{path:c,projectKey:o,v5:n===void 0||i===void 0?void 0:{backend:n,key:i}}}function bun(e,t){let n=ke.dirSyncRecord(e,Q6(t));return Ld(n)===void 0?n:void 0}function OBt(e){return`${Q6(e)}${s7t}`}
export{Q6,Mmt,gde,bun,OBt};
