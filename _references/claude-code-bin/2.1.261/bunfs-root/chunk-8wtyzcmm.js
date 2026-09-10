// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{a}from"/$bunfs/root/chunk-a207t0vs.js";import{Pa}from"/$bunfs/root/chunk-tcap6yb8.js";import{Qh}from"/$bunfs/root/chunk-31tjt5p8.js";import{Bw}from"/$bunfs/root/chunk-2d61yeh9.js";import{Boe,_T}from"/$bunfs/root/chunk-10nvcevy.js";import{otr}from"/$bunfs/root/chunk-qsaz58sb.js";import{_F,fc,eh,Yf,zGt}from"/$bunfs/root/chunk-vd630rs0.js";import{TSt}from"/$bunfs/root/chunk-71tvqbzt.js";import{YVt}from"/$bunfs/root/chunk-ttp3st4f.js";var p=new Set([Qh,Bw]),T=["subscribe_pr_activity","unsubscribe_pr_activity"];function c(o){return T.some((t)=>o.endsWith(t))}function G7t(o,t){if(t.length===0)return o;let e=t.map((n)=>[n,Pa(n)]),r=o.filter((n)=>!e.some(([l,i])=>Yf(n,l,i)));return r.length===o.length?o:r}function f(o){return!1}var s=import.meta.require("/$bunfs/root/chunk-mq39fqef.js");function jur(o){let t=a.CLAUDE_CODE_BRIEF,e=new Set((process.env.CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS??"").split(",").map((r)=>r.trim()).filter(Boolean));return o.filter((r)=>TSt.has(r.name)||c(r.name)||f(r)||YVt(r)||t&&p.has(r.name)||_T(r,e))}function EGe(o,t,e,r){let[n,l]=_F(zGt(fc([...o,...t],"name"),r),eh),i=[...l.sort(Boe),...n.sort(Boe)];if(s){if(s.isCoordinatorMode())return jur(i)}return i}function AGe(o,t){let e=o.length===1?o[0]:void 0;if(e&&otr(t,e))return[];return o}
export{G7t,jur,EGe,AGe};
