// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{IP as A,JP as R}from"/$bunfs/root/_397.js";import{$Va as v,aXa as j}from"/$bunfs/root/_441.js";import{A5a as u,f6a as U,k5a as p}from"/$bunfs/root/_468.js";import{l6a as n,n6a as f,q6a as J}from"/$bunfs/root/_470.js";import{Axb as g,Hxb as E}from"/$bunfs/root/_544.js";import{LPb as w,vPb as S}from"/$bunfs/root/_582.js";import{VZb as C,WZb as y,a0b as B}from"/$bunfs/root/_619.js";import{Jxc as c,Uxc as D}from"/$bunfs/root/_676.js";import{Ckd as d,atd as b}from"/$bunfs/root/_826.js";import{Axd as O,xxd as L}from"/$bunfs/root/_837.js";async function K(s,e,t){return s(await H(t,e),{display:"system"}),null}async function H(s,e){if(c())return"Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";let t=s?.trim()??"",o=t===""?n[Math.floor(Math.random()*n.length)]:t.toLowerCase(),r=X.includes(o);if(!r&&!n.includes(o)){let a=n.join(", ");return`Invalid color "${o}". Available colors: ${a}, default`}let T=d(),h=g(),l=r?"default":o,m=r?void 0:o;await v(T,l,h,e.storageV5),e.setAppState((a)=>A(a,{color:m}));let i=e.getAppState(),I=i.agent?i.agentDefinitions.activeAgents.find((a)=>a.agentType===i.agent):void 0;return u(p(),f({userOverride:m,agentDefinitionColor:I?.color}),e.storageV5),N(l,e.credentials),r?"Session color reset to default":`Session color set to: ${o}`}function N(s,e){let t=S()?.bridgeSessionId;if(!t)return;let o=C();import("/$bunfs/root/chunk-2fq1wdrs.js").then(({updateBridgeSessionColorTag:r})=>r(t,s,n,{baseUrl:y(),getAccessToken:o?()=>o:void 0,credentials:e}).catch(()=>{}))}var X;var P=L(()=>{b();B();w();U();J();E();j();R();D();X=["default","reset","none","gray","grey"]});
export{K as EP,H as FP,P as GP};
