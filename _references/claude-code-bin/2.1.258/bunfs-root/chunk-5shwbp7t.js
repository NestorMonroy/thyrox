// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{yoe,ZC}from"/$bunfs/root/chunk-8seefhsx.js";import{a}from"/$bunfs/root/chunk-sr28hb79.js";import{sc}from"/$bunfs/root/chunk-64kpb0yv.js";import{r$}from"/$bunfs/root/chunk-bdjm18ys.js";import{ly}from"/$bunfs/root/chunk-g9d7r5bw.js";import{Qw}from"/$bunfs/root/chunk-39bh7dex.js";import{Bc,Wh,nm,P2t}from"/$bunfs/root/chunk-vw215j9f.js";import{Xbt}from"/$bunfs/root/chunk-bv5c0whc.js";import{Yer}from"/$bunfs/root/chunk-mva5kqqk.js";import{LVt}from"/$bunfs/root/chunk-2djs7wt7.js";var p=new Set([ly,Qw]),T=["subscribe_pr_activity","unsubscribe_pr_activity"];function c(o){return T.some((t)=>o.endsWith(t))}function PJt(o,t){if(t.length===0)return o;let e=t.map((n)=>[n,sc(n)]),r=o.filter((n)=>!e.some(([l,i])=>nm(n,l,i)));return r.length===o.length?o:r}function f(o){return!1}var s=import.meta.require("/$bunfs/root/chunk-kffvrdvd.js");function zfr(o){let t=a.CLAUDE_CODE_BRIEF,e=new Set((process.env.CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS??"").split(",").map((r)=>r.trim()).filter(Boolean));return o.filter((r)=>Xbt.has(r.name)||c(r.name)||f(r)||LVt(r)||t&&p.has(r.name)||ZC(r,e))}function w2e(o,t,e,r){let[n,l]=r$(P2t(Bc([...o,...t],"name"),r),Wh),i=[...l.sort(yoe),...n.sort(yoe)];if(s){if(s.isCoordinatorMode())return zfr(i)}return i}function E2e(o,t){let e=o.length===1?o[0]:void 0;if(e&&Yer(t,e))return[];return o}
export{PJt,zfr,w2e,E2e};
