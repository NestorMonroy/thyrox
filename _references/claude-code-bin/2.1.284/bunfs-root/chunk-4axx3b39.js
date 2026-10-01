// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Gt}from"/$bunfs/root/chunk-45j14f09.js";import{Yi}from"/$bunfs/root/chunk-77kn462z.js";import{Ar}from"/$bunfs/root/chunk-v59g5a86.js";function s(){return import.meta.require("/$bunfs/root/chunk-43sph2xd.js").mcpClientModule()}async function Mpe(e,c,d){let i=Ar(e.name,e.config),{captureDiscoveryGrantLeg:h,ensureDiscoveryCacheAccount:l,getMcpIdentityEpoch:f,persistRefreshedToolsIfPresent:m}=s();l();let n=Yi()?h(e.name,e.config):void 0,a=Gt().toolRefreshSequences,r=a.get(e)??{started:0,applied:0};a.set(e,r),r.started+=1;let u=r.started,{fetchToolsForClient:o}=s(),v=o.cache.get(i),g=f();o.cache.delete(i);let t=await o(e,d),p=s().getToolsListErrorForResult(t);if(p)return{status:"kept-previous",error:p};if(e.discoveryAuthFailure&&t.length===0)return{status:"kept-previous",error:"the server rejected tool discovery as unauthorized \u2014 the user needs to authorize this connector (e.g. via /mcp) before its tools are available"};if(r.applied>u)return{status:"kept-previous",error:"superseded by a newer concurrent refresh of this server \u2014 the newer refresh result is the one applied"};if(r.applied=u,c(e.name,t),n)n.then((y)=>m(e,t,{identityEpoch:g,grantLeg:y}));return{status:"refreshed",newTools:t,previousToolsPromise:v}}
export{Mpe};
