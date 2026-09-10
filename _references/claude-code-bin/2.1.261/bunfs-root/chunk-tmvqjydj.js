// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Y}from"/$bunfs/root/chunk-annedm50.js";import{Zi}from"/$bunfs/root/chunk-zzcvbc0w.js";import{yI,qV}from"/$bunfs/root/chunk-7ppvj8ac.js";import{Xi}from"/$bunfs/root/chunk-nrghh92z.js";import{mu,E6e}from"/$bunfs/root/chunk-26vw39tf.js";import{ep,Jre}from"/$bunfs/root/chunk-78e0pwfv.js";import{_l}from"/$bunfs/root/chunk-3czrxfaq.js";import{j3e}from"/$bunfs/root/chunk-vd630rs0.js";import{Wle}from"/$bunfs/root/chunk-7mhtr96q.js";var g=["default","reset","none","gray","grey"];async function cgr(n,e,t){return n(await WDt(t,e),{display:"system"}),null}async function WDt(n,e){if(Zi())return"Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";let t=n?.trim()??"",o=t===""?ep[Math.floor(Math.random()*ep.length)]:t.toLowerCase(),r=g.includes(o);if(!r&&!ep.includes(o)){let s=ep.join(", ");return`Invalid color "${o}". Available colors: ${s}, default`}let m=Y(),d=_l(),i=r?"default":o,l=r?void 0:o;await j3e(m,i,d,e.storageV5),e.setAppState((s)=>Wle(s,{color:l}));let a=e.getAppState(),c=a.agent?a.agentDefinitions.activeAgents.find((s)=>s.agentType===a.agent):void 0;return E6e(mu(),Jre({userOverride:l,agentDefinitionColor:c?.color}),e.storageV5),f(i,e.credentials),r?"Session color reset to default":`Session color set to: ${o}`}function f(n,e){let t=Xi()?.bridgeSessionId;if(!t)return;let o=yI();import("/$bunfs/root/chunk-6yp90n1q.js").then(({updateBridgeSessionColorTag:r})=>r(t,n,ep,{baseUrl:qV(),getAccessToken:o?()=>o:void 0,credentials:e}).catch(()=>{}))}
export{cgr,WDt};
