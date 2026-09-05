// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{WA,Hm,Bu,hl}from"/$bunfs/root/chunk-zmhk2tm0.js";import{Ae}from"/$bunfs/root/chunk-fkh93x1w.js";import{Vn,PTt}from"/$bunfs/root/chunk-478fqyzs.js";import{Ru}from"/$bunfs/root/chunk-bp7rt04v.js";import{join as a}from"path";function S9(e){return/^[A-Za-z0-9_-]{1,128}$/.test(e)?e:WA(e)}async function Fut(e,t,n){return a(Bu(await hl(e,Ru(n))),LOt(t))}async function mce(e,t,n){let r=await hl(e,Ru(n)),c=a(Bu(r),LOt(t)),o=Hm(r),i=n===void 0?void 0:Zin(o,t);return{path:c,projectKey:o,v5:n===void 0||i===void 0?void 0:{backend:n,key:i}}}function Zin(e,t){let n=Ae.dirSyncRecord(e,S9(t));return Vn(n)===void 0?n:void 0}function LOt(e){return`${S9(e)}${PTt}`}
export{S9,Fut,mce,Zin,LOt};
