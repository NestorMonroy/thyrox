// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{tae,Awr,Cwr,Rwr}from"/$bunfs/root/chunk-xhmfynt7.js";import{_ur}from"/$bunfs/root/chunk-scb3pd3r.js";import{Ygr}from"/$bunfs/root/chunk-1pj61t3g.js";import{eco}from"/$bunfs/root/chunk-9p4xe3ac.js";function FIn(t){t((e)=>e.ultrareviewOverageConfirmed?e:{...e,ultrareviewOverageConfirmed:!0})}function s(t){return(e)=>t((o)=>({...o,pendingMemoryUpdates:[...o.pendingMemoryUpdates,e]}))}function n(t){t((e)=>e.prResolvedThisSession?e:{...e,prResolvedThisSession:!0})}function UIn(t){let e=(o)=>t((r)=>{let i=typeof o==="function"?o(r.toolPermissionContext):o;return r.toolPermissionContext===i?r:{...r,toolPermissionContext:i}});return{setToolPermissionContext:e,setSessionToolPermissionContext:e}}function u2e(t,e){return{markPrResolvedThisSession:()=>n(e),isUltrareviewOverageConfirmed:()=>t().ultrareviewOverageConfirmed,markUltrareviewOverageConfirmed:()=>FIn(e),getAdvisorSetting:()=>t().advisorModel,getMcp:()=>t().mcp,getProactivityLevel:()=>t().proactivityLevel,getWebBrowser:()=>t().webBrowser,...UIn(e),setWebBrowserSlice:Ygr(e),setArtifactReadVersion:Awr(e),getArtifactReadObservation:tae(t),artifactRegistries:_ur(t,e),setArtifactContractTarget:Cwr(e),getArtifactContractTarget:Rwr(t),enqueuePendingMemoryUpdate:s(e),agentLifecycle:eco(t,e)}}
export{FIn,UIn,u2e};
