// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Y}from"/$bunfs/root/chunk-d37h8mav.js";import{cl}from"/$bunfs/root/chunk-cap10ns2.js";import{TH,Tte}from"/$bunfs/root/chunk-88vaehes.js";import{Yl}from"/$bunfs/root/chunk-kmt21ysj.js";import{Np,aOt}from"/$bunfs/root/chunk-e06pb89d.js";import{Fh,rAe}from"/$bunfs/root/chunk-g3rb05aw.js";import{$d}from"/$bunfs/root/chunk-xn16exs1.js";import{nIt}from"/$bunfs/root/chunk-77kn462z.js";import{SHe}from"/$bunfs/root/chunk-3y1d30pf.js";var c=["default","reset","none","gray","grey"];async function AYo(n,e,o){return n(await lxn(o,e),{display:"system"}),null}async function lxn(n,e){if(cl())return"Cannot set color: This session is a teammate. Teammate colors are assigned by the team leader.";let o=n?.trim()??"",t=o===""?Fh[Math.floor(Math.random()*Fh.length)]:o.toLowerCase(),r=c.includes(t);if(!r&&!Fh.includes(t)){let s=Fh.join(", ");return`Invalid color "${t}". Available colors: ${s}, default`}let d=Y(),m=$d(),i=r?"default":t,l=r?void 0:t;await nIt(d,i,m,e.storageV5),e.setAppState((s)=>SHe(s,{color:l}));let a=e.getAppState(),g=a.agent?a.agentDefinitions.activeAgents.find((s)=>s.agentType===a.agent):void 0;return aOt(Np(),rAe({userOverride:l,agentDefinitionColor:g?.color}),e.storageV5),p(i,e.credentials),r?"Session color reset to default":`Session color set to: ${t}`}function p(n,e){let o=Yl()?.bridgeSessionId;if(!o)return;let t=TH();import("/$bunfs/root/chunk-bdvw1tsh.js").then(({updateBridgeSessionColorTag:r})=>r(o,n,Fh,{baseUrl:Tte(),getAccessToken:t?()=>t:void 0,credentials:e}).catch(()=>{}))}
export{AYo,lxn};
