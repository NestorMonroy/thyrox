// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{XC,M_,hf,kp}from"/$bunfs/root/chunk-hk70qp2z.js";import{Re}from"/$bunfs/root/chunk-z0202m3z.js";import{jp,evn}from"/$bunfs/root/chunk-pc40tvt4.js";import{yg}from"/$bunfs/root/chunk-yn609ntm.js";import{join as a}from"path";function EJ(e){return/^[A-Za-z0-9_-]{1,128}$/.test(e)?e:XC(e)}async function sIt(e,t,n){return a(hf(await kp(e,yg(n))),GJt(t))}async function zbe(e,t,n){let r=await kp(e,yg(n)),c=a(hf(r),GJt(t)),o=M_(r),i=n===void 0?void 0:jOn(o,t);return{path:c,projectKey:o,v5:n===void 0||i===void 0?void 0:{backend:n,key:i}}}function jOn(e,t){let n=Re.dirSyncRecord(e,EJ(t));return jp(n)===void 0?n:void 0}function GJt(e){return`${EJ(e)}${evn}`}
export{EJ,sIt,zbe,jOn,GJt};
