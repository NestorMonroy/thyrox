// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{a}from"/$bunfs/root/chunk-9fmxymtw.js";import{ya}from"/$bunfs/root/chunk-hfjb09vk.js";import{yy}from"/$bunfs/root/chunk-f4p6rc3t.js";import{yE}from"/$bunfs/root/chunk-9ea4hj0w.js";import{pie,WC}from"/$bunfs/root/chunk-ha3c8j0p.js";import{Lir}from"/$bunfs/root/chunk-dnemf2n9.js";import{CU,Hl,wh,mf,aVt}from"/$bunfs/root/chunk-yw4jc948.js";import{fEt}from"/$bunfs/root/chunk-w0h9f7yb.js";import{yUe}from"/$bunfs/root/chunk-2raqg1ea.js";var p=new Set([yy,yE]),T=["subscribe_pr_activity","unsubscribe_pr_activity"];function c(o){return T.some((t)=>o.endsWith(t))}function ktn(o,t){if(t.length===0)return o;let e=t.map((n)=>[n,ya(n)]),r=o.filter((n)=>!e.some(([l,i])=>mf(n,l,i)));return r.length===o.length?o:r}function f(o){return!1}var s=import.meta.require("/$bunfs/root/chunk-ratjhn08.js");function khr(o){let t=a.CLAUDE_CODE_BRIEF,e=new Set((process.env.CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS??"").split(",").map((r)=>r.trim()).filter(Boolean));return o.filter((r)=>fEt.has(r.name)||c(r.name)||f(r)||yUe(r)||t&&p.has(r.name)||WC(r,e))}function UGe(o,t,e,r){let[n,l]=CU(aVt(Hl([...o,...t],"name"),r),wh),i=[...l.sort(pie),...n.sort(pie)];if(s){if(s.isCoordinatorMode())return khr(i)}return i}function BGe(o,t){let e=o.length===1?o[0]:void 0;if(e&&Lir(t,e))return[];return o}
export{ktn,khr,UGe,BGe};
