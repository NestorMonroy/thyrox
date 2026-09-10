// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{a}from"/$bunfs/root/chunk-bxegdt3f.js";import{Pa}from"/$bunfs/root/chunk-v7vff0yy.js";import{Zh}from"/$bunfs/root/chunk-8as7yv62.js";import{Bw}from"/$bunfs/root/chunk-9fs3bhky.js";import{joe,_T}from"/$bunfs/root/chunk-gp8z5n9k.js";import{atr}from"/$bunfs/root/chunk-5kvz6kq2.js";import{bF,fc,th,Yf,WGt}from"/$bunfs/root/chunk-9wa0ka8p.js";import{CSt}from"/$bunfs/root/chunk-q7xzm1tc.js";import{XVt}from"/$bunfs/root/chunk-jyehkxan.js";var p=new Set([Zh,Bw]),T=["subscribe_pr_activity","unsubscribe_pr_activity"];function c(o){return T.some((t)=>o.endsWith(t))}function z7t(o,t){if(t.length===0)return o;let e=t.map((n)=>[n,Pa(n)]),r=o.filter((n)=>!e.some(([l,i])=>Yf(n,l,i)));return r.length===o.length?o:r}function f(o){return!1}var s=import.meta.require("/$bunfs/root/chunk-mdwvv21p.js");function Wur(o){let t=a.CLAUDE_CODE_BRIEF,e=new Set((process.env.CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS??"").split(",").map((r)=>r.trim()).filter(Boolean));return o.filter((r)=>CSt.has(r.name)||c(r.name)||f(r)||XVt(r)||t&&p.has(r.name)||_T(r,e))}function vGe(o,t,e,r){let[n,l]=bF(WGt(fc([...o,...t],"name"),r),th),i=[...l.sort(joe),...n.sort(joe)];if(s){if(s.isCoordinatorMode())return Wur(i)}return i}function kGe(o,t){let e=o.length===1?o[0]:void 0;if(e&&atr(t,e))return[];return o}
export{z7t,Wur,vGe,kGe};
