// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{AR,fS,_u,Du}from"/$bunfs/root/chunk-6hfhp7ca.js";import{xe}from"/$bunfs/root/chunk-h4npc7kp.js";import{rm,mXn}from"/$bunfs/root/chunk-hqy3a2gr.js";import{Ng}from"/$bunfs/root/chunk-gpkqb0rx.js";import{dirname as c,join as r}from"path";function L4(t){return/^[A-Za-z0-9_-]{1,128}$/.test(t)?t:AR(t)}async function VEt(t,e,n){return r(_u(await Du(t,Ng(n))),B6t(e))}async function zQ(t,e,n){let o=await Du(t,Ng(n)),s=r(_u(o),B6t(e)),i=fS(o),a=n===void 0?void 0:Yxn(i,e);return{path:s,projectKey:i,v5:n===void 0||a===void 0?void 0:{backend:n,key:a}}}function Yxn(t,e){let n=xe.dirSyncRecord(t,L4(e));return rm(n)===void 0?n:void 0}function B6t(t){return`${L4(t)}${mXn}`}var p=".dir-sync-empty.json";function d(t){return`${L4(t)}${p}`}function qEt(t,e){return r(c(t),d(e))}
export{L4,VEt,zQ,Yxn,B6t,qEt};
