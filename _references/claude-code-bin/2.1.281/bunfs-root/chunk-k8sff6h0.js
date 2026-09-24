// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Y}from"/$bunfs/root/chunk-cqc88nqm.js";import{$a}from"/$bunfs/root/chunk-byb3fx4c.js";import{qL,eQ}from"/$bunfs/root/chunk-pgssq2zn.js";import{xl}from"/$bunfs/root/chunk-s2y6e27p.js";import{Qu,rkt}from"/$bunfs/root/chunk-ew6qt9wg.js";import{Yg,Nwe}from"/$bunfs/root/chunk-tb73cqmq.js";import{pd}from"/$bunfs/root/chunk-brvrqzf2.js";import{gwt}from"/$bunfs/root/chunk-4n4g22z6.js";import{vRe}from"/$bunfs/root/chunk-fvyxm2d1.js";var c=["default","reset","none","gray","grey"];async function VMo(n,e,o){return n(await Uyn(o,e),{display:"system"}),null}async function Uyn(n,e){if($a())return"Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";let o=n?.trim()??"",t=o===""?Yg[Math.floor(Math.random()*Yg.length)]:o.toLowerCase(),r=c.includes(t);if(!r&&!Yg.includes(t)){let s=Yg.join(", ");return`Invalid color "${t}". Available colors: ${s}, default`}let d=Y(),m=pd(),i=r?"default":t,l=r?void 0:t;await gwt(d,i,m,e.storageV5),e.setAppState((s)=>vRe(s,{color:l}));let a=e.getAppState(),g=a.agent?a.agentDefinitions.activeAgents.find((s)=>s.agentType===a.agent):void 0;return rkt(Qu(),Nwe({userOverride:l,agentDefinitionColor:g?.color}),e.storageV5),p(i,e.credentials),r?"Session color reset to default":`Session color set to: ${t}`}function p(n,e){let o=xl()?.bridgeSessionId;if(!o)return;let t=qL();import("/$bunfs/root/chunk-eq4mpkp7.js").then(({updateBridgeSessionColorTag:r})=>r(o,n,Yg,{baseUrl:eQ(),getAccessToken:t?()=>t:void 0,credentials:e}).catch(()=>{}))}
export{VMo,Uyn};
