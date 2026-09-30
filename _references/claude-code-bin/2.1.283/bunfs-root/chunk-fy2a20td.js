// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Rse,igr,agr,lgr}from"/$bunfs/root/chunk-t6d8w8jb.js";import{$or}from"/$bunfs/root/chunk-nqxgmt1m.js";import{Gcr}from"/$bunfs/root/chunk-xqsty0aj.js";import{zZr}from"/$bunfs/root/chunk-yw0n4y34.js";function lTn(t){t((e)=>e.ultrareviewOverageConfirmed?e:{...e,ultrareviewOverageConfirmed:!0})}function s(t){return(e)=>t((o)=>({...o,pendingMemoryUpdates:[...o.pendingMemoryUpdates,e]}))}function n(t){t((e)=>e.prResolvedThisSession?e:{...e,prResolvedThisSession:!0})}function cTn(t){let e=(o)=>t((r)=>{let i=typeof o==="function"?o(r.toolPermissionContext):o;return r.toolPermissionContext===i?r:{...r,toolPermissionContext:i}});return{setToolPermissionContext:e,setSessionToolPermissionContext:e}}function kWe(t,e){return{markPrResolvedThisSession:()=>n(e),isUltrareviewOverageConfirmed:()=>t().ultrareviewOverageConfirmed,markUltrareviewOverageConfirmed:()=>lTn(e),getAdvisorSetting:()=>t().advisorModel,getMcp:()=>t().mcp,getProactivityLevel:()=>t().proactivityLevel,getWebBrowser:()=>t().webBrowser,...cTn(e),setWebBrowserSlice:Gcr(e),setArtifactReadVersion:igr(e),getArtifactReadObservation:Rse(t),artifactRegistries:$or(t,e),setArtifactContractTarget:agr(e),getArtifactContractTarget:lgr(t),enqueuePendingMemoryUpdate:s(e),agentLifecycle:zZr(t,e)}}
export{lTn,cTn,kWe};
