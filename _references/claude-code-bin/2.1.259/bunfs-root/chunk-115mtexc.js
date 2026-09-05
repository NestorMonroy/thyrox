// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Q}from"/$bunfs/root/chunk-x1rrg5j2.js";import{sa}from"/$bunfs/root/chunk-9pd12rac.js";import{tx,Dq}from"/$bunfs/root/chunk-13k2svs7.js";import{Da}from"/$bunfs/root/chunk-xxq66zap.js";import{Eu,$Ye}from"/$bunfs/root/chunk-m1g84jsb.js";import{dp,Loe}from"/$bunfs/root/chunk-11mcqc6q.js";import{kl}from"/$bunfs/root/chunk-zwtg7j89.js";import{q6e}from"/$bunfs/root/chunk-qpwbvc04.js";import{yce}from"/$bunfs/root/chunk-t3az3whm.js";var g=["default","reset","none","gray","grey"];async function KIr(n,e,t){return n(await h$t(t,e),{display:"system"}),null}async function h$t(n,e){if(sa())return"Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";let t=n?.trim()??"",o=t===""?dp[Math.floor(Math.random()*dp.length)]:t.toLowerCase(),r=g.includes(o);if(!r&&!dp.includes(o)){let s=dp.join(", ");return`Invalid color "${o}". Available colors: ${s}, default`}let m=Q(),d=kl(),i=r?"default":o,l=r?void 0:o;await q6e(m,i,d,e.storageV5),e.setAppState((s)=>yce(s,{color:l}));let a=e.getAppState(),c=a.agent?a.agentDefinitions.activeAgents.find((s)=>s.agentType===a.agent):void 0;return $Ye(Eu(),Loe({userOverride:l,agentDefinitionColor:c?.color}),e.storageV5),f(i,e.credentials),r?"Session color reset to default":`Session color set to: ${o}`}function f(n,e){let t=Da()?.bridgeSessionId;if(!t)return;let o=tx();import("/$bunfs/root/chunk-szy941qj.js").then(({updateBridgeSessionColorTag:r})=>r(t,n,dp,{baseUrl:Dq(),getAccessToken:o?()=>o:void 0,credentials:e}).catch(()=>{}))}
export{KIr,h$t};
