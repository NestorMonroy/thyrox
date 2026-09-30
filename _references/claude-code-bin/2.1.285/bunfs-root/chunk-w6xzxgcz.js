// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{V}from"/$bunfs/root/chunk-bxhyh54r.js";import{Wa}from"/$bunfs/root/chunk-dyk026rw.js";import{yH,dte}from"/$bunfs/root/chunk-37np2p76.js";import{zl}from"/$bunfs/root/chunk-z2wqszg9.js";import{Pp,MOt}from"/$bunfs/root/chunk-61992r1j.js";import{Nh,uTe}from"/$bunfs/root/chunk-q8zgw8kw.js";import{Od}from"/$bunfs/root/chunk-wzht8hyn.js";import{tPt}from"/$bunfs/root/chunk-qazw855w.js";import{fHe}from"/$bunfs/root/chunk-36xg3wha.js";var c=["default","reset","none","gray","grey"];async function MYo(n,e,o){return n(await cxn(o,e),{display:"system"}),null}async function cxn(n,e){if(Wa())return"Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";let o=n?.trim()??"",t=o===""?Nh[Math.floor(Math.random()*Nh.length)]:o.toLowerCase(),r=c.includes(t);if(!r&&!Nh.includes(t)){let s=Nh.join(", ");return`Invalid color "${t}". Available colors: ${s}, default`}let d=V(),m=Od(),i=r?"default":t,l=r?void 0:t;await tPt(d,i,m,e.storageV5),e.setAppState((s)=>fHe(s,{color:l}));let a=e.getAppState(),g=a.agent?a.agentDefinitions.activeAgents.find((s)=>s.agentType===a.agent):void 0;return MOt(Pp(),uTe({userOverride:l,agentDefinitionColor:g?.color}),e.storageV5),p(i,e.credentials),r?"Session color reset to default":`Session color set to: ${t}`}function p(n,e){let o=zl()?.bridgeSessionId;if(!o)return;let t=yH();import("/$bunfs/root/chunk-1kcc1cz2.js").then(({updateBridgeSessionColorTag:r})=>r(o,n,Nh,{baseUrl:dte(),getAccessToken:t?()=>t:void 0,credentials:e}).catch(()=>{}))}
export{MYo,cxn};
