// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{J}from"/$bunfs/root/chunk-t8q7n4ta.js";import{ra}from"/$bunfs/root/chunk-eqagbzpy.js";import{sP,yK}from"/$bunfs/root/chunk-g6vxxsed.js";import{ta}from"/$bunfs/root/chunk-89ya6r59.js";import{Eu,ZXe}from"/$bunfs/root/chunk-7tfkwhcm.js";import{_f,Ese}from"/$bunfs/root/chunk-p1w3e187.js";import{vl}from"/$bunfs/root/chunk-mrpx4hqy.js";import{_Xe}from"/$bunfs/root/chunk-yw4jc948.js";import{Tue}from"/$bunfs/root/chunk-jxgjtxan.js";var g=["default","reset","none","gray","grey"];async function YSr(n,e,t){return n(await V$t(t,e),{display:"system"}),null}async function V$t(n,e){if(ra())return"Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";let t=n?.trim()??"",o=t===""?_f[Math.floor(Math.random()*_f.length)]:t.toLowerCase(),r=g.includes(o);if(!r&&!_f.includes(o)){let s=_f.join(", ");return`Invalid color "${o}". Available colors: ${s}, default`}let m=J(),d=vl(),i=r?"default":o,l=r?void 0:o;await _Xe(m,i,d,e.storageV5),e.setAppState((s)=>Tue(s,{color:l}));let a=e.getAppState(),c=a.agent?a.agentDefinitions.activeAgents.find((s)=>s.agentType===a.agent):void 0;return ZXe(Eu(),Ese({userOverride:l,agentDefinitionColor:c?.color}),e.storageV5),f(i,e.credentials),r?"Session color reset to default":`Session color set to: ${o}`}function f(n,e){let t=ta()?.bridgeSessionId;if(!t)return;let o=sP();import("/$bunfs/root/chunk-bvjm33zx.js").then(({updateBridgeSessionColorTag:r})=>r(t,n,_f,{baseUrl:yK(),getAccessToken:o?()=>o:void 0,credentials:e}).catch(()=>{}))}
export{YSr,V$t};
