// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{ECa as R,FCa as U,I7 as u,J7 as P,Kma as v,Xka as d,Zka as w,bba as E,cba as F,m6 as O,n6 as L,s6 as x,sma as M,t6 as B}from"/$bunfs/root/_441.js";import{eob as s,mob as h}from"/$bunfs/root/_527.js";import{qHb as _,yHb as g}from"/$bunfs/root/_573.js";import{Cic as f,Jic as N,Yic as a,ajc as b}from"/$bunfs/root/_668.js";import{Wwc as y}from"/$bunfs/root/_673.js";import{Byc as c,Cyc as I}from"/$bunfs/root/_678.js";import{GKc as T,RKc as S}from"/$bunfs/root/_708.js";import{Tbd as D}from"/$bunfs/root/_811.js";import{ncd as p}from"/$bunfs/root/_812.js";import{uxd as C}from"/$bunfs/root/_837.js";U();I();F();L();y();S();v();P();h();N();b();w();D();g();var V=new Set([f,a]),j=["subscribe_pr_activity","unsubscribe_pr_activity"];function q(o){return j.some((t)=>o.endsWith(t))}function lo(o,t){if(t.length===0)return o;let e=t.map((n)=>[n,T(n)]),r=o.filter((n)=>!e.some(([l,i])=>M(n,l,i)));return r.length===o.length?o:r}function W(o){return!1}var m=(B(),C(x));function X(o){let t=p.CLAUDE_CODE_BRIEF,e=new Set((process.env.CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS??"").split(",").map((r)=>r.trim()).filter(Boolean));return o.filter((r)=>O.has(r.name)||q(r.name)||W(r)||d(r)||t&&V.has(r.name)||e.has(r.name))}function so(o,t,e,r){let[n,l]=c(R(E([...o,...t],"name"),r),u),i=[...l.sort(s),...n.sort(s)];if(m){if(m.isCoordinatorMode())return X(i)}return i}function mo(o,t){let e=o.length===1?o[0]:void 0;if(e&&_(t,e))return[];return o}
export{lo as Ye,X as Ze,so as _e,mo as $e};
