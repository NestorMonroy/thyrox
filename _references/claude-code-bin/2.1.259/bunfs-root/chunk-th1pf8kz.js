// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{yie,fI}from"/$bunfs/root/chunk-r8hc3n2z.js";import{a}from"/$bunfs/root/chunk-m92n5xra.js";import{jl}from"/$bunfs/root/chunk-mzmfq60a.js";import{h$}from"/$bunfs/root/chunk-5t2g7ar8.js";import{py}from"/$bunfs/root/chunk-trntcdrz.js";import{dE}from"/$bunfs/root/chunk-nmde69vm.js";import{gor}from"/$bunfs/root/chunk-qyqph83r.js";import{hc,Yh,om,YWt}from"/$bunfs/root/chunk-qpwbvc04.js";import{ewt}from"/$bunfs/root/chunk-40xnyyhy.js";import{e4t}from"/$bunfs/root/chunk-7b08b87y.js";var p=new Set([py,dE]),T=["subscribe_pr_activity","unsubscribe_pr_activity"];function c(o){return T.some((t)=>o.endsWith(t))}function XQt(o,t){if(t.length===0)return o;let e=t.map((n)=>[n,jl(n)]),r=o.filter((n)=>!e.some(([l,i])=>om(n,l,i)));return r.length===o.length?o:r}function f(o){return!1}var s=import.meta.require("/$bunfs/root/chunk-r81vynvq.js");function bhr(o){let t=a.CLAUDE_CODE_BRIEF,e=new Set((process.env.CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS??"").split(",").map((r)=>r.trim()).filter(Boolean));return o.filter((r)=>ewt.has(r.name)||c(r.name)||f(r)||e4t(r)||t&&p.has(r.name)||fI(r,e))}function rWe(o,t,e,r){let[n,l]=h$(YWt(hc([...o,...t],"name"),r),Yh),i=[...l.sort(yie),...n.sort(yie)];if(s){if(s.isCoordinatorMode())return bhr(i)}return i}function oWe(o,t){let e=o.length===1?o[0]:void 0;if(e&&gor(t,e))return[];return o}
export{XQt,bhr,rWe,oWe};
